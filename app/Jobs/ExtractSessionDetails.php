<?php

namespace App\Jobs;

use App\Models\AppSetting;
use App\Models\Character;
use App\Models\GameSession;
use App\Models\Npc;
use App\Models\SpeakerProfile;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ExtractSessionDetails implements ShouldQueue
{
    use Queueable;

    public int $timeout = 300;

    public function __construct(public GameSession $session) {}

    public function handle(): void
    {
        $transcript = $this->loadTranscript();

        if (empty($transcript)) {
            $this->session->update(['extraction_status' => 'failed']);
            return;
        }

        $context  = $this->buildContext();
        $provider = AppSetting::get('llm_provider', 'none');

        $raw = match ($provider) {
            'openai'    => $this->callOpenAI($transcript, $context),
            'anthropic' => $this->callAnthropic($transcript, $context),
            'ollama'    => $this->callOllama($transcript, $context),
            'zai'       => $this->callZai($transcript, $context),
            default     => null,
        };

        if (! $raw) {
            $this->session->update(['extraction_status' => 'failed']);
            return;
        }

        $data = $this->parseOutput($raw);

        if (! $data) {
            Log::warning('ExtractSessionDetails: failed to parse JSON from LLM output', ['raw' => substr($raw, 0, 500)]);
            $this->session->update(['extraction_status' => 'failed']);
            return;
        }

        $this->applyCharacterUpdates($data['character_updates'] ?? []);
        $this->applyNpcUpdates($data['npcs'] ?? []);

        $this->session->update(['extraction_status' => 'done']);
    }

    public function failed(\Throwable $e): void
    {
        $this->session->update(['extraction_status' => 'failed']);
        Log::error('ExtractSessionDetails failed', ['error' => $e->getMessage()]);
    }

    // ── Context ────────────────────────────────────────────────────────────

    protected function buildContext(): string
    {
        $session  = $this->session;
        $campaign = $session->campaign;

        $lines = ["Campaign: {$campaign->name}"];

        if ($session->title) {
            $lines[] = "Session Title: {$session->title}";
        }

        // Party characters with current stats
        $participantIds = $session->participant_character_ids ?? [];
        $characters = $participantIds
            ? Character::whereIn('id', $participantIds)->get()
            : Character::where('campaign_id', $campaign->id)->get();

        if ($characters->isNotEmpty()) {
            $lines[] = '';
            $lines[] = 'PARTY MEMBERS (current stats before this session):';
            foreach ($characters as $c) {
                $desc = "- {$c->name}";
                if ($c->race)  $desc .= ", {$c->race}";
                if ($c->class) $desc .= " {$c->class}";
                if ($c->level) $desc .= " (Level {$c->level})";
                $desc .= " | HP: {$c->current_hp}/{$c->max_hp}";
                if ($c->gold) $desc .= " | Gold: {$c->gold}";
                if ($c->experience_points) $desc .= " | XP: {$c->experience_points}";
                $lines[] = $desc;
            }
        }

        // Known NPCs in the campaign
        $npcs = Npc::where('campaign_id', $campaign->id)->get();
        if ($npcs->isNotEmpty()) {
            $lines[] = '';
            $lines[] = 'KNOWN NPCs:';
            foreach ($npcs as $npc) {
                $desc = "- {$npc->name}";
                if ($npc->race)     $desc .= " ({$npc->race})";
                if ($npc->role)     $desc .= ", {$npc->role}";
                if ($npc->location) $desc .= " @ {$npc->location}";
                if ($npc->attitude) $desc .= " [{$npc->attitude}]";
                $lines[] = $desc;
            }
        }

        return implode("\n", $lines);
    }

    // ── Transcript ─────────────────────────────────────────────────────────

    protected function loadTranscript(): string
    {
        if (! $this->session->transcript_path) {
            return '';
        }
        $raw  = Storage::get($this->session->transcript_path);
        $data = json_decode($raw ?? '{}', true);

        $speakerMap = $this->buildSpeakerMap();

        return collect($data['segments'] ?? [])
            ->map(function ($s) use ($speakerMap) {
                $start   = $this->formatTime((float) ($s['start'] ?? 0));
                $speaker = $s['speaker'] ?? null;
                $text    = trim($s['text'] ?? '');

                if ($speaker) {
                    $resolved = $speakerMap[$speaker] ?? $speaker;
                    return "[{$start}] {$resolved}: {$text}";
                }

                return "[{$start}] {$text}";
            })
            ->implode("\n");
    }

    protected function buildSpeakerMap(): array
    {
        $campaignId = $this->session->campaign_id;
        $sessionId  = $this->session->id;

        $profiles = SpeakerProfile::where('campaign_id', $campaignId)
            ->with('character')
            ->get();

        $map = [];

        foreach ($profiles->whereNull('game_session_id') as $sp) {
            $map[$sp->speaker_label] = $this->resolveSpeakerName($sp);
        }

        foreach ($profiles->where('game_session_id', $sessionId) as $sp) {
            $map[$sp->speaker_label] = $this->resolveSpeakerName($sp);
        }

        return $map;
    }

    protected function resolveSpeakerName(SpeakerProfile $sp): string
    {
        if ($sp->is_dm) {
            return 'DM';
        }
        return $sp->character?->name ?? $sp->display_name;
    }

    protected function formatTime(float $seconds): string
    {
        $m = (int) floor($seconds / 60);
        $s = (int) ($seconds % 60);
        return sprintf('%d:%02d', $m, $s);
    }

    // ── Prompts ────────────────────────────────────────────────────────────

    protected function systemPrompt(): string
    {
        return 'You are an expert D&D session analyst. Your job is to extract structured game-state changes from a session transcript: changes to player character stats (HP, gold, XP, spell slots, death saves) and any NPCs who appeared or were mentioned. Be conservative — only update values when the transcript clearly confirms a change. Do not guess or infer from context alone.';
    }

    protected function userPrompt(string $context, string $transcript): string
    {
        return <<<PROMPT
Here is the context for this D&D session:

{$context}

Here is the session transcript:

{$transcript}

---

Analyze the transcript and extract:

1. **character_updates**: Changes to player character stats that clearly happened during this session.
   - Only include characters that had actual changes (HP damage/healing, gold gained/spent, XP awarded, spell slots used/recovered, death save changes).
   - Use the character names exactly as listed in the context.

2. **npcs**: NPCs who appeared, were mentioned, or whose status changed.
   - Include NPCs from the known list if their status/location/attitude changed.
   - Include new NPCs encountered for the first time.
   - Mark `is_new: true` only for NPCs not in the known list.

Respond ONLY with a JSON object wrapped in <extraction> tags, no other text:

<extraction>
{
  "character_updates": [
    {
      "name": "Character Name",
      "current_hp": 14,
      "max_hp": null,
      "temp_hp": null,
      "gold": null,
      "experience_points": null,
      "spell_slots_used": null,
      "death_save_successes": null,
      "death_save_failures": null,
      "notes": "optional short note about what happened"
    }
  ],
  "npcs": [
    {
      "name": "NPC Name",
      "race": null,
      "role": null,
      "location": null,
      "attitude": null,
      "description": null,
      "notes": null,
      "is_new": false
    }
  ]
}
</extraction>

Rules:
- Use null for any field you are not confident about — do not guess.
- For character HP: set current_hp to the value AFTER the session ends (or the last known value if unclear).
- For gold/XP: set to the new total, not the delta — unless you cannot determine the total, in which case use null.
- Keep notes to one short sentence max.
- Only include npcs array entries for NPCs who actually appeared or were referenced in the transcript.
PROMPT;
    }

    // ── Parsing ────────────────────────────────────────────────────────────

    protected function parseOutput(string $raw): ?array
    {
        Log::info('ExtractSessionDetails: raw LLM output', ['preview' => substr($raw, 0, 1000)]);

        // 1. Try <extraction>…</extraction> tags
        if (preg_match('/<extraction>(.*?)<\/extraction>/s', $raw, $m)) {
            $json = trim($m[1]);
            // Strip markdown code fences if the model wrapped JSON in ```
            $json = preg_replace('/^```(?:json)?\s*/i', '', $json);
            $json = preg_replace('/\s*```$/', '', $json);
            $decoded = json_decode(trim($json), true);
            if (json_last_error() === JSON_ERROR_NONE) {
                return $decoded;
            }
        }

        // 2. Try a markdown JSON code block: ```json … ```
        if (preg_match('/```(?:json)?\s*(\{.*?\})\s*```/s', $raw, $m)) {
            $decoded = json_decode(trim($m[1]), true);
            if (json_last_error() === JSON_ERROR_NONE) {
                return $decoded;
            }
        }

        // 3. Find the first { … } that contains both expected keys
        if (preg_match('/(\{(?:[^{}]|(?:\{[^{}]*\}))*\})/s', $raw, $m)) {
            $decoded = json_decode($m[1], true);
            if (json_last_error() === JSON_ERROR_NONE && isset($decoded['character_updates'])) {
                return $decoded;
            }
        }

        // 4. Last resort: find any valid JSON object in the string
        $start = strpos($raw, '{');
        $end   = strrpos($raw, '}');
        if ($start !== false && $end !== false && $end > $start) {
            $decoded = json_decode(substr($raw, $start, $end - $start + 1), true);
            if (json_last_error() === JSON_ERROR_NONE) {
                return $decoded;
            }
        }

        Log::warning('ExtractSessionDetails: failed to parse JSON from LLM output', ['raw' => substr($raw, 0, 2000)]);
        return null;
    }

    // ── Applying updates ───────────────────────────────────────────────────

    protected function applyCharacterUpdates(array $updates): void
    {
        $campaignId     = $this->session->campaign_id;
        $participantIds = $this->session->participant_character_ids ?? [];

        $characters = $participantIds
            ? Character::whereIn('id', $participantIds)->where('campaign_id', $campaignId)->get()
            : Character::where('campaign_id', $campaignId)->get();

        foreach ($updates as $update) {
            $name = $update['name'] ?? null;
            if (! $name) continue;

            $character = $characters->firstWhere('name', $name);
            if (! $character) continue;

            $fields = [];
            foreach (['current_hp', 'max_hp', 'temp_hp', 'gold', 'experience_points',
                      'spell_slots_used', 'death_save_successes', 'death_save_failures'] as $field) {
                if (isset($update[$field]) && $update[$field] !== null) {
                    $fields[$field] = $update[$field];
                }
            }

            if (! empty($fields)) {
                $character->update($fields);
                Log::info("ExtractSessionDetails: updated character {$name}", $fields);
            }
        }
    }

    protected function applyNpcUpdates(array $npcs): void
    {
        $campaignId = $this->session->campaign_id;

        foreach ($npcs as $npcData) {
            $name = $npcData['name'] ?? null;
            if (! $name) continue;

            $fields = ['campaign_id' => $campaignId];
            foreach (['race', 'role', 'location', 'attitude', 'description', 'notes'] as $field) {
                if (isset($npcData[$field]) && $npcData[$field] !== null) {
                    $fields[$field] = $npcData[$field];
                }
            }

            Npc::updateOrCreate(
                ['campaign_id' => $campaignId, 'name' => $name],
                $fields
            );

            Log::info("ExtractSessionDetails: upserted NPC {$name}");
        }
    }

    // ── Providers ──────────────────────────────────────────────────────────

    protected function callZai(string $transcript, string $context): ?string
    {
        $key     = AppSetting::get('zai_api_key');
        $model   = AppSetting::get('zai_model', 'glm-4.6');
        $baseUrl = AppSetting::get('zai_base_url', 'https://api.z.ai/api/coding/paas/v4');

        if (! $key) return null;

        $response = Http::withToken($key)
            ->timeout(240)
            ->post(rtrim($baseUrl, '/') . '/chat/completions', [
                'model'      => $model,
                'messages'   => [
                    ['role' => 'system', 'content' => $this->systemPrompt()],
                    ['role' => 'user',   'content' => $this->userPrompt($context, $transcript)],
                ],
                'max_tokens' => 16000,
                'thinking'   => ['type' => 'enabled'],
            ]);

        if (! $response->successful()) {
            Log::warning('ExtractSessionDetails: z.ai error', ['status' => $response->status(), 'body' => $response->body()]);
            return null;
        }

        $content = $response->json('choices.0.message.content') ?? '';

        // glm-4.7 with thinking may return an array of content blocks
        if (is_array($content)) {
            $content = collect($content)
                ->where('type', 'text')
                ->pluck('text')
                ->implode("\n");
        }

        if (empty(trim((string) $content))) {
            Log::warning('ExtractSessionDetails: z.ai returned empty content', [
                'finish_reason' => $response->json('choices.0.finish_reason'),
                'full_response' => $response->json(),
            ]);
            return null;
        }

        return $content;
    }

    protected function callOpenAI(string $transcript, string $context): ?string
    {
        $key = AppSetting::get('openai_api_key');
        if (! $key) return null;

        $response = Http::withToken($key)
            ->timeout(120)
            ->post('https://api.openai.com/v1/chat/completions', [
                'model'    => 'gpt-4o-mini',
                'messages' => [
                    ['role' => 'system', 'content' => $this->systemPrompt()],
                    ['role' => 'user',   'content' => $this->userPrompt($context, $transcript)],
                ],
                'max_tokens' => 4000,
            ]);

        if (! $response->successful()) {
            Log::warning('ExtractSessionDetails: OpenAI error', ['status' => $response->status()]);
            return null;
        }

        return $response->json('choices.0.message.content') ?? null;
    }

    protected function callAnthropic(string $transcript, string $context): ?string
    {
        $key = AppSetting::get('anthropic_api_key');
        if (! $key) return null;

        $response = Http::withHeaders([
            'x-api-key'         => $key,
            'anthropic-version' => '2023-06-01',
        ])
            ->timeout(120)
            ->post('https://api.anthropic.com/v1/messages', [
                'model'      => 'claude-3-haiku-20240307',
                'max_tokens' => 4000,
                'system'     => $this->systemPrompt(),
                'messages'   => [
                    ['role' => 'user', 'content' => $this->userPrompt($context, $transcript)],
                ],
            ]);

        if (! $response->successful()) {
            Log::warning('ExtractSessionDetails: Anthropic error', ['status' => $response->status()]);
            return null;
        }

        return $response->json('content.0.text') ?? null;
    }

    protected function callOllama(string $transcript, string $context): ?string
    {
        $baseUrl = AppSetting::get('ollama_base_url', 'http://localhost:11434');
        $model   = AppSetting::get('ollama_model', 'llama3');

        $response = Http::timeout(300)
            ->post("{$baseUrl}/api/chat", [
                'model'  => $model,
                'stream' => false,
                'messages' => [
                    ['role' => 'system', 'content' => $this->systemPrompt()],
                    ['role' => 'user',   'content' => $this->userPrompt($context, $transcript)],
                ],
            ]);

        if (! $response->successful()) {
            Log::warning('ExtractSessionDetails: Ollama error', ['status' => $response->status()]);
            return null;
        }

        return $response->json('message.content') ?? null;
    }
}
