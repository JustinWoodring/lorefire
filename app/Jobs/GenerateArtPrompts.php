<?php

namespace App\Jobs;

use App\Models\AppSetting;
use App\Models\Character;
use App\Models\GameSession;
use App\Models\SceneArtPrompt;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class GenerateArtPrompts implements ShouldQueue
{
    use Queueable;

    public int $timeout = 300;

    public function __construct(public GameSession $session) {}

    public function handle(): void
    {
        $artStyle   = $this->session->campaign->art_style ?? 'lifelike';
        $provider   = AppSetting::get('llm_provider', 'none');
        $characters = $this->session->campaign->characters()->get();

        // Delete existing prompts + any generated images for this session
        SceneArtPrompt::where('game_session_id', $this->session->id)
            ->get()
            ->each(function (SceneArtPrompt $p) {
                if ($p->image_path) {
                    Storage::disk('local')->delete($p->image_path);
                }
                $p->delete();
            });

        try {
            $scenes = $this->extractScenes($provider);

            // Check if cancelled after the (potentially long) LLM HTTP call returns.
            $this->session->refresh();
            if ($this->session->art_prompts_status === 'cancelled') {
                return; // bail out cooperatively — status already set to 'cancelled'
            }

            foreach ($scenes as $scene) {
                // Check between each scene save so a cancel mid-batch takes effect quickly.
                $this->session->refresh();
                if ($this->session->art_prompts_status === 'cancelled') {
                    return;
                }

                $prompt = $this->buildArtPrompt($scene, $artStyle, $characters);

                SceneArtPrompt::create([
                    'game_session_id'   => $this->session->id,
                    'scene_title'       => $scene['title'],
                    'scene_description' => $scene['description'],
                    'prompt'            => $prompt,
                    'negative_prompt'   => $this->negativePrompt($artStyle),
                    'art_style'         => $artStyle,
                    'character_refs'    => $characters->map(fn (Character $c) => [
                        'character_id' => $c->id,
                        'name'         => $c->name,
                        'image_path'   => $c->portrait_path,
                    ])->values()->toArray(),
                    'status'            => 'generated',
                ]);
            }

            $this->session->update(['art_prompts_status' => 'done']);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('GenerateArtPrompts failed', ['error' => $e->getMessage()]);
            $this->session->update(['art_prompts_status' => 'failed']);
            throw $e;
        }
    }

    protected function extractScenes(string $provider): array
    {
        $source = $this->session->summary ?? $this->loadTranscriptText();
        if (! $source) {
            return [];
        }

        if ($provider !== 'none') {
            $scenes = $this->extractScenesViaLlm($source, $provider);
            if ($scenes) {
                return $scenes;
            }
        }

        // Fallback: split summary into paragraphs as scenes
        return collect(explode("\n\n", $source))
            ->filter()
            ->take(5)
            ->map(fn ($paragraph, $i) => [
                'title'       => 'Scene ' . ($i + 1),
                'description' => trim($paragraph),
                'characters'  => [],
            ])
            ->values()
            ->toArray();
    }

    protected function extractScenesViaLlm(string $source, string $provider): array
    {
        $characters  = $this->session->campaign->characters()->get();
        $artStyle    = $this->session->campaign->art_style ?? 'lifelike';
        $styleGuide  = $this->styleGuide($artStyle);
        $charContext = $this->buildCharacterContext($characters);

        // Extract ## headings from the source so the LLM can use them verbatim as titles
        $headings = [];
        foreach (explode("\n", $source) as $line) {
            $t = trim($line);
            if (str_starts_with($t, '## ')) {
                $headings[] = substr($t, 3);
            } elseif (str_starts_with($t, '# ')) {
                $headings[] = substr($t, 2);
            }
        }
        $headingList = $headings
            ? "The session has these section headings (use them verbatim as scene titles, one scene per heading):\n" .
              implode("\n", array_map(fn ($h) => "  - {$h}", $headings)) . "\n"
            : '';

        $prompt = <<<PROMPT
You are an art director for a D&D campaign chronicle. Your job is to identify key visual scenes from a session and write detailed image-generation prompts for each one.

{$charContext}

STYLE GUIDE (apply to every prompt):
{$styleGuide}

TASK:
From the session text below, produce one scene entry per section heading — in the same order as the headings.

{$headingList}
For each scene return:
- "title": the exact section heading text, copied verbatim
- "description": 1-2 sentences describing the setting, action, and mood of the scene itself — focus on environment, objects, creatures, and events, not just who is present
- "characters": array of character names visibly present in this scene
- "prompt": a single flowing image-generation prompt (3-6 sentences) structured as follows:
    1. SCENE FIRST: Open with the environment, key objects, creatures, weather, and lighting that define this specific scene (e.g. rotting horse carcasses, a cave mouth screened by briars, a burning bush on a forest trail). Make this vivid and specific to what actually happened.
    2. CHARACTERS: For every character present, you MUST describe them with exhaustive physical specificity so an artist could reconstruct them exactly with no other reference. Include every single one of the following — omitting any is an error:
       - Sex and gender presentation (e.g. "a woman", "a man") — this is mandatory, never omit it
       - Exact species/race with any distinguishing racial features (e.g. "a female Firbolg — a towering humanoid standing 7 feet tall with large pointed ears and pale blue-grey skin")
       - Precise skin tone (e.g. "deep brown", "pale blue-grey", "warm olive") — never use vague terms like "dark" or "light"
       - Height and build (e.g. "towering at 7 feet", "petite at under 5 feet", "lean and athletic")
       - Hair: exact colour, length, texture, and style (e.g. "long straight olive-brown hair", "short sandy-blonde hair", "messy voluminous curly brunette hair with a gold streak in the bangs")
       - Eyes: colour and shape
       - Every piece of clothing and armour, named specifically (e.g. "a silver chainmail hauberk, steel greaves and vambraces, and a bright blue travel cloak")
       - Weapons and carried items, described visually (e.g. "a lance with a blue swallowtail banner bearing a white eye-and-arrows sigil")
       - Any distinguishing features: scars, tattoos, markings, accessories
       Draw all of these details directly from the PARTY MEMBERS block above. Do not invent details not listed there.
    3. STYLE: End with the style guide keywords.

Return ONLY a valid JSON array, no other text:
[{"title": "...", "description": "...", "characters": ["Name1"], "prompt": "..."}]

SESSION:
{$source}

JSON:
PROMPT;

        $text = match ($provider) {
            'openai'    => $this->callOpenAI($prompt),
            'anthropic' => $this->callAnthropic($prompt),
            'ollama'    => $this->callOllama($prompt),
            'zai'       => $this->callZai($prompt),
            default     => null,
        };

        if (! $text) {
            return [];
        }

        preg_match('/\[.*\]/s', $text, $matches);
        if (! $matches) {
            return [];
        }

        return json_decode($matches[0], true) ?? [];
    }

    /**
     * Build a character reference block for the LLM prompt.
     * Includes only fields useful for visual description.
     */
    protected function buildCharacterContext($characters): string
    {
        if ($characters->isEmpty()) {
            return '';
        }

        $lines = ["PARTY MEMBERS (use these descriptions when characters appear in a scene):"];
        foreach ($characters as $c) {
            $attrs = array_filter([
                $c->race && $c->subrace ? "{$c->race} ({$c->subrace})" : $c->race,
                $c->class && $c->subclass ? "{$c->class} ({$c->subclass})" : $c->class,
                $c->level ? "level {$c->level}" : null,
            ]);
            $summary = implode(', ', $attrs);
            $lines[] = "- {$c->name}" . ($summary ? " — {$summary}" : '');
            if ($c->appearance_description) {
                $lines[] = "  Appearance: " . trim($c->appearance_description);
            }
            if ($c->personality_traits) {
                $lines[] = "  Personality: " . trim($c->personality_traits);
            }
        }

        return implode("\n", $lines);
    }

    /**
     * Style keywords passed to the LLM so it can end each prompt with them.
     */
    protected function styleGuide(string $artStyle): string
    {
        return $artStyle === 'comic'
            ? 'TTRPG sourcebook illustration. Semi-realistic characters with clean ink outlines and smooth cel shading. Muted earthy palette — desaturated greens, warm browns, dusty taupes, cool grays. Soft dual lighting: warm fill from below, cool diffuse from above. Hazy atmospheric background. No photorealism, no painterly texture, no anime, no oversaturation.'
            : 'Realistic fantasy art. Detailed oil painting. Cinematic lighting. Highly detailed. 8k resolution. Rich atmospheric depth.';
    }

    /**
     * Fallback prompt builder used when the LLM did not return a usable "prompt" field.
     * Prioritises the scene description; only appends character appearances if the
     * description itself contains enough actual scene content (> 80 chars after
     * stripping markdown headers).
     */
    protected function buildArtPrompt(array $scene, string $artStyle, $allCharacters): string
    {
        // If the LLM already wrote a prompt, just return it (style already embedded)
        if (!empty($scene['prompt'])) {
            return trim($scene['prompt']);
        }

        $styleKeywords = $this->styleGuide($artStyle);

        // Strip leading markdown heading syntax from the description
        $description = trim(preg_replace('/^#{1,6}\s+/', '', $scene['description'] ?? ''));

        // Only weave in character appearances when the description is substantive enough
        // to indicate the LLM actually described the scene (not just a heading fallback).
        $characterSection = '';
        if (strlen($description) > 80) {
            $sceneCharacterNames = collect($scene['characters'] ?? [])
                ->map(fn ($n) => strtolower(trim($n)));

            $sceneCharacters = $allCharacters->filter(function (Character $c) use ($sceneCharacterNames) {
                return $sceneCharacterNames->contains(strtolower(trim($c->name)));
            })->values();

            if ($sceneCharacters->isNotEmpty()) {
                $blocks = $sceneCharacters->map(function (Character $c) {
                    $parts = [trim($c->name)];
                    if ($c->race)  $parts[] = $c->race;
                    if ($c->class) $parts[] = $c->class;
                    if ($c->appearance_description) $parts[] = trim($c->appearance_description);
                    return implode(', ', $parts);
                })->implode('. ');
                $characterSection = $blocks;
            }
        }

        $parts = array_filter([$description, $characterSection, $styleKeywords]);

        return implode(' ', $parts);
    }

    protected function negativePrompt(string $artStyle): string
    {
        return 'blurry, low quality, bad anatomy, extra limbs, modern elements, text, watermark, signature';
    }

    protected function loadTranscriptText(): string
    {
        if (! $this->session->transcript_path) {
            return '';
        }
        $raw  = Storage::get($this->session->transcript_path);
        $data = json_decode($raw ?? '{}', true);
        return collect($data['segments'] ?? [])
            ->map(fn ($s) => $s['text'] ?? '')
            ->implode(' ');
    }

    protected function callOpenAI(string $prompt): ?string
    {
        $key = AppSetting::get('openai_api_key');
        if (! $key) {
            return null;
        }
        $r = Http::withToken($key)->timeout(60)->post('https://api.openai.com/v1/chat/completions', [
            'model'      => 'gpt-4o-mini',
            'messages'   => [['role' => 'user', 'content' => $prompt]],
            'max_tokens' => 1600,
        ]);
        return $r->json('choices.0.message.content');
    }

    protected function callAnthropic(string $prompt): ?string
    {
        $key = AppSetting::get('anthropic_api_key');
        if (! $key) {
            return null;
        }
        $r = Http::withHeaders(['x-api-key' => $key, 'anthropic-version' => '2023-06-01'])->timeout(60)
            ->post('https://api.anthropic.com/v1/messages', [
                'model'      => 'claude-3-haiku-20240307',
                'max_tokens' => 1600,
                'messages'   => [['role' => 'user', 'content' => $prompt]],
            ]);
        return $r->json('content.0.text');
    }

    protected function callOllama(string $prompt): ?string
    {
        $baseUrl = AppSetting::get('ollama_base_url', 'http://localhost:11434');
        $model   = AppSetting::get('ollama_model', 'llama3');
        $r = Http::timeout(120)->post("{$baseUrl}/api/generate", [
            'model'  => $model,
            'prompt' => $prompt,
            'stream' => false,
        ]);
        return $r->json('response');
    }

    protected function callZai(string $prompt): ?string
    {
        $key     = AppSetting::get('zai_api_key');
        $model   = AppSetting::get('zai_model', 'glm-4.7');
        $baseUrl = AppSetting::get('zai_base_url', 'https://api.z.ai/api/coding/paas/v4');
        if (! $key) {
            return null;
        }
        $r = Http::withToken($key)->timeout(120)
            ->post(rtrim($baseUrl, '/') . '/chat/completions', [
                'model'      => $model,
                'messages'   => [['role' => 'user', 'content' => $prompt]],
                'max_tokens' => 8000,
                'thinking'   => ['type' => 'enabled'],
            ]);

        if (! $r->successful()) {
            \Illuminate\Support\Facades\Log::warning('GenerateArtPrompts: z.ai error', [
                'status' => $r->status(),
                'body'   => $r->body(),
            ]);
            return null;
        }

        $content = $r->json('choices.0.message.content') ?? '';
        return $content !== '' ? $content : null;
    }
}
