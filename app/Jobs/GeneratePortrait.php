<?php

namespace App\Jobs;

use App\Jobs\Concerns\GeneratesViaComfyUI;
use App\Models\AppSetting;
use App\Models\Character;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class GeneratePortrait implements ShouldQueue
{
    use Queueable, GeneratesViaComfyUI;

    public int $timeout = 660;

    public function __construct(public Character $character) {}

    public function handle(): void
    {
        $this->character->update(['portrait_generation_status' => 'generating']);

        try {
            $provider = AppSetting::get('image_gen_provider', 'none');
            $model    = AppSetting::get('image_gen_model', '');

            if ($provider === 'none') {
                $this->character->update(['portrait_generation_status' => 'failed']);
                return;
            }

            $prompt = $this->buildPrompt();

            $imageBytes = null;

            if ($provider === 'comfyui') {
                $baseUrl = AppSetting::get('comfyui_base_url', 'http://localhost:8188');
                $imageBytes = $this->callComfyUI($baseUrl, $prompt, 512, 768);
            } else {
                $imageUrl = match ($provider) {
                    'zai'    => $this->callZai($prompt, $model ?: 'glm-image'),
                    'openai' => $this->callOpenAI($prompt, $model ?: 'dall-e-3'),
                    default  => null,
                };

                if ($imageUrl) {
                    $r = Http::timeout(60)->get($imageUrl);
                    $imageBytes = $r->successful() ? $r->body() : null;
                }
            }

            if (! $imageBytes) {
                $this->character->update(['portrait_generation_status' => 'failed']);
                return;
            }

            $path = "characters/portraits/{$this->character->id}/portrait.png";

            // Delete old portrait if different
            if ($this->character->portrait_path && $this->character->portrait_path !== $path) {
                Storage::disk('local')->delete($this->character->portrait_path);
            }

            Storage::disk('local')->put($path, $imageBytes);

            $this->character->update([
                'portrait_path'              => $path,
                'portrait_generation_status' => 'done',
            ]);
        } catch (\Throwable $e) {
            Log::error('GeneratePortrait failed', ['character_id' => $this->character->id, 'error' => $e->getMessage()]);
            $this->character->update(['portrait_generation_status' => 'failed']);
        }
    }

    protected function buildPrompt(): string
    {
        $name       = $this->character->name;
        $race       = $this->character->race ?? 'human';
        $class      = $this->character->class ?? 'adventurer';
        $appearance = $this->character->appearance_description ?? '';
        $style      = $this->character->portrait_style ?? 'lifelike';

        $styleKeywords = match ($style) {
            'renaissance' => 'renaissance oil painting style, old masters technique, chiaroscuro lighting, sfumato, Rembrandt lighting, classical portrait',
            'comic'       => 'TTRPG sourcebook illustration. Characters rendered semi-realistically with clean ink outlines and smooth cel shading that gives them strong volume and 3D form. Muted earthy palette — desaturated greens, warm browns, dusty taupes, cool grays, one or two sparse accent colors. Soft dual lighting on characters: warm fill from below, cool diffuse from above, smooth shading transitions, no harsh shadows. Hazy softened background with atmospheric depth. No photorealism, no painterly texture, no anime, no oversaturation.',
            default       => 'realistic fantasy art, detailed oil painting, cinematic lighting, highly detailed, 8k, photorealistic',
        };

        $base = "A detailed fantasy portrait of {$name}, a {$race} {$class}.";
        if ($appearance) {
            $base .= " {$appearance}";
        }
        $base .= " Upper body shot, dramatic lighting, detailed face. {$styleKeywords}.";
        return $base;
    }

    protected function callZai(string $prompt, string $model): ?string
    {
        $key = AppSetting::get('zai_api_key');
        if (! $key) return null;

        $r = Http::withToken($key)->timeout(90)->post('https://api.z.ai/api/coding/paas/v4/images/generations', [
            'model'  => $model,
            'prompt' => $prompt,
            'size'   => '1280x1280',
        ]);

        if (! $r->successful()) {
            Log::error('z.ai image generation error', ['status' => $r->status(), 'body' => $r->body()]);
            return null;
        }

        return $r->json('data.0.url');
    }

    protected function callOpenAI(string $prompt, string $model): ?string
    {
        $key = AppSetting::get('openai_api_key');
        if (! $key) return null;

        $r = Http::withToken($key)->timeout(90)->post('https://api.openai.com/v1/images/generations', [
            'model'  => $model,
            'prompt' => $prompt,
            'n'      => 1,
            'size'   => '1024x1024',
        ]);

        if (! $r->successful()) {
            Log::error('OpenAI image generation error', ['status' => $r->status(), 'body' => $r->body()]);
            return null;
        }

        return $r->json('data.0.url');
    }
}
