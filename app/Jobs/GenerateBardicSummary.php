<?php

namespace App\Jobs;

use App\Models\AppSetting;
use App\Models\Character;
use App\Models\GameSession;
use App\Models\SpeakerProfile;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class GenerateBardicSummary implements ShouldQueue
{
    use Queueable;

    public int $timeout = 300;

    public function __construct(public GameSession $session) {}

    public function handle(): void
    {
        $transcript = $this->loadTranscript();
        $context    = $this->buildContext();
        $provider   = AppSetting::get('llm_provider', 'none');

        [$summary, $notes] = match ($provider) {
            'openai'    => $this->generateViaOpenAI($transcript, $context),
            'anthropic' => $this->generateViaAnthropic($transcript, $context),
            'ollama'    => $this->generateViaOllama($transcript, $context),
            'zai'       => $this->generateViaZai($transcript, $context),
            default     => $this->generateTemplateSummary(),
        };

        $this->session->update([
            'summary'        => $summary,
            'session_notes'  => $notes,
            'summary_status' => 'done',
        ]);
    }

    public function failed(\Throwable $e): void
    {
        $this->session->update(['summary_status' => 'failed']);
        Log::error('GenerateBardicSummary failed', ['error' => $e->getMessage()]);
    }

    // ── Context ────────────────────────────────────────────────────────────

    /**
     * Build a structured context block describing the party and speaker mappings.
     */
    protected function buildContext(): string
    {
        $session  = $this->session;
        $campaign = $session->campaign;

        $lines = ["Campaign: {$campaign->name}"];

        if ($session->title) {
            $lines[] = "Session Title: {$session->title}";
        }
        if ($session->played_at) {
            $lines[] = "Session Date: " . $session->played_at->format('F j, Y');
        }

        // Party characters
        $participantIds = $session->participant_character_ids ?? [];
        if (! empty($participantIds)) {
            $characters = Character::whereIn('id', $participantIds)->get();
            if ($characters->isNotEmpty()) {
                $lines[] = '';
                $lines[] = 'PARTY MEMBERS:';
                foreach ($characters as $c) {
                    $desc = "- {$c->name}";
                    if ($c->race)  $desc .= ", {$c->race}";
                    if ($c->class) $desc .= " {$c->class}";
                    if ($c->level) $desc .= " (Level {$c->level})";
                    if ($c->player_name) $desc .= " — played by {$c->player_name}";
                    if ($c->background) $desc .= ". Background: {$c->background}";
                    if ($c->personality_traits) $desc .= ". Personality: {$c->personality_traits}";
                    $lines[] = $desc;
                }
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

    /**
     * Build a map of SPEAKER_XX → character name (or "DM") for this session.
     * Prefers session-scoped profiles; falls back to campaign-wide profiles.
     */
    protected function buildSpeakerMap(): array
    {
        $campaignId = $this->session->campaign_id;
        $sessionId  = $this->session->id;

        $profiles = SpeakerProfile::where('campaign_id', $campaignId)
            ->with('character')
            ->get();

        // Index by speaker_label, preferring session-scoped rows over campaign-wide ones
        $map = [];

        // First pass: campaign-wide (no game_session_id)
        foreach ($profiles->whereNull('game_session_id') as $sp) {
            $map[$sp->speaker_label] = $this->resolveSpeakerName($sp);
        }

        // Second pass: session-scoped (overrides campaign-wide)
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
        return 'You are a roguish bard chronicling a D&D session — part Terry Pratchett, part Homer, all drama. You produce two outputs from session transcripts: a comedic-epic bardic narrative and a dry factual DM record. Your gift is finding the absurdity threaded through genuine heroism and retelling both with equal grandeur. A missed roll is a tragedy. A lucky save is a miracle. A petty argument between party members is a clash of titanic egos. You do not sanitise or skip the embarrassing bits — those are often the best bits. Speaker labels in the transcript have already been resolved to character names — use them directly.';
    }

    protected function userPrompt(string $context, string $transcript): string
    {
        return <<<PROMPT
Here is the context for this D&D session:

{$context}

Here is the session transcript (with timestamps and speaker names where available):

{$transcript}

---

Please produce TWO outputs:

**1. BARDIC SUMMARY** — A comedic-epic third-person retelling that balances genuine dramatic events with the funny, chaotic, and embarrassing ones. Format as named scenes using `##` headings. 3–5 scenes.

Before you write, read through the full transcript and make a mental note of:
- The legitimate plot beats and heroic moments (these form the spine of the narrative)
- The funny or chaotic moments: failed attempts, lucky breaks, inter-party bickering, unexpected decisions, anyone falling into something, anyone dancing over something, lies told badly, spells that went wrong, etc.
Both categories must appear in the final retelling — neither should crowd out the other.

Writing style:
- Prose should be florid and over-the-top, as though future generations will sing of these events
- Treat comedic moments with the same epic gravitas as heroic ones — a character falling into a pit trap deserves as much dramatic weight as a killing blow
- Use dramatic irony freely — the narrator can see the foolishness the characters cannot
- Capture actual quotes or paraphrased dialogue from the transcript where they're funny or revealing — real words land better than paraphrase
- **Bold** character names and key locations on first mention. Italics for emphasis and flavour
- No bullet points — flowing prose only

**2. SESSION NOTES** — A concise, factual record for the DM. Use this exact markdown structure:
- A `### Overview` section: 2–4 sentence plain-language summary of what happened
- A `### Key Events` section: bullet list of significant plot/story events in chronological order
- A `### Character Moments` section: bullet list of notable individual character actions, decisions, or roleplay beats
- A `### Loose Threads` section: bullet list of unresolved questions, hooks, or things the party left hanging
- A `### DM Notes` section: any observations about pacing, player engagement, or things to follow up on

Any unrecognised speaker labels that remain in the transcript should be used as-is.

Wrap your outputs in XML tags exactly like this:

<bardic_summary>
[bardic narrative here]
</bardic_summary>

<session_notes>
[session notes here]
</session_notes>
PROMPT;
    }

    // ── Parsing ────────────────────────────────────────────────────────────

    /**
     * Parse <bardic_summary> and <session_notes> tags from LLM output.
     * Returns [summary, notes].
     */
    protected function parseOutput(string $raw): array
    {
        $summary = '';
        $notes   = '';

        if (preg_match('/<bardic_summary>(.*?)<\/bardic_summary>/s', $raw, $m)) {
            $summary = trim($m[1]);
        }
        if (preg_match('/<session_notes>(.*?)<\/session_notes>/s', $raw, $m)) {
            $notes = trim($m[1]);
        }

        // Fallback: if tags not found, treat the whole thing as the summary
        if (! $summary && ! $notes) {
            $summary = trim($raw);
        }

        return [$summary, $notes];
    }

    // ── Providers ──────────────────────────────────────────────────────────

    protected function generateViaZai(string $transcript, string $context): array
    {
        $key     = AppSetting::get('zai_api_key');
        $model   = AppSetting::get('zai_model', 'glm-4.6');
        $baseUrl = AppSetting::get('zai_base_url', AppSetting::ZAI_CODING_URL);

        if (! $key) {
            return $this->generateTemplateSummary();
        }

        $response = Http::withToken($key)
            ->timeout(240)
            ->post(rtrim($baseUrl, '/') . '/chat/completions', [
                'model'    => $model,
                'messages' => [
                    ['role' => 'system', 'content' => $this->systemPrompt()],
                    ['role' => 'user',   'content' => $this->userPrompt($context, $transcript)],
                ],
                'max_tokens' => 16000,
                'thinking'   => ['type' => 'enabled'],
            ]);

        if (! $response->successful()) {
            Log::warning('GenerateBardicSummary: z.ai API error', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            return $this->generateTemplateSummary();
        }

        // With thinking enabled, the final answer is in `content`.
        // `reasoning_content` is the internal chain-of-thought — do not use it as output.
        $raw = $response->json('choices.0.message.content') ?? '';

        if (empty(trim($raw))) {
            Log::warning('GenerateBardicSummary: z.ai returned empty content', [
                'finish_reason'    => $response->json('choices.0.finish_reason'),
                'completion_tokens' => $response->json('usage.completion_tokens'),
            ]);
            return $this->generateTemplateSummary();
        }

        return $this->parseOutput($raw);
    }

    protected function generateViaOpenAI(string $transcript, string $context): array
    {
        $key = AppSetting::get('openai_api_key');
        if (! $key) {
            return $this->generateTemplateSummary();
        }

        $response = Http::withToken($key)
            ->timeout(120)
            ->post('https://api.openai.com/v1/chat/completions', [
                'model'      => 'gpt-4o-mini',
                'messages'   => [
                    ['role' => 'system', 'content' => $this->systemPrompt()],
                    ['role' => 'user',   'content' => $this->userPrompt($context, $transcript)],
                ],
                'max_tokens' => 4000,
            ]);

        if (! $response->successful()) {
            Log::warning('GenerateBardicSummary: OpenAI error', ['status' => $response->status()]);
            return $this->generateTemplateSummary();
        }

        return $this->parseOutput($response->json('choices.0.message.content') ?? '');
    }

    protected function generateViaAnthropic(string $transcript, string $context): array
    {
        $key = AppSetting::get('anthropic_api_key');
        if (! $key) {
            return $this->generateTemplateSummary();
        }

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
            Log::warning('GenerateBardicSummary: Anthropic error', ['status' => $response->status()]);
            return $this->generateTemplateSummary();
        }

        return $this->parseOutput($response->json('content.0.text') ?? '');
    }

    protected function generateViaOllama(string $transcript, string $context): array
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
            Log::warning('GenerateBardicSummary: Ollama error', ['status' => $response->status()]);
            return $this->generateTemplateSummary();
        }

        return $this->parseOutput($response->json('message.content') ?? '');
    }

    // ── Fallback ───────────────────────────────────────────────────────────

    /** @return array{0: string, 1: string} */
    protected function generateTemplateSummary(): array
    {
        $campaign = $this->session->campaign;
        $date     = $this->session->played_at?->format('F j, Y') ?? 'an unknown date';
        $title    = $this->session->title;

        $summary = "On {$date}, the brave adventurers of **{$campaign->name}** gathered once more to continue their epic journey. " .
                   "The session titled \"{$title}\" brought new challenges and triumphs as the party pressed onward. " .
                   "Tales of their deeds would be told for generations to come.\n\n" .
                   "*(No LLM is configured. Set an API key in Settings to generate a full bardic summary.)*";

        $notes = "### Overview\nSession \"{$title}\" was played on {$date}.\n\n" .
                 "*(No LLM is configured. Set an API key in Settings to generate session notes.)*";

        return [$summary, $notes];
    }
}
