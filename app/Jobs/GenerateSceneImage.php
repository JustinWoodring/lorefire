<?php

namespace App\Jobs;

use App\Jobs\Concerns\GeneratesViaComfyUI;
use App\Models\AppSetting;
use App\Models\SceneArtPrompt;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class GenerateSceneImage implements ShouldQueue
{
    use Queueable, GeneratesViaComfyUI;

    public int $timeout = 660;

    public function __construct(public SceneArtPrompt $scene) {}

    public function handle(): void
    {
        $this->scene->update(['status' => 'generating']);

        try {
            $provider = AppSetting::get('image_gen_provider', 'none');
            $model    = AppSetting::get('image_gen_model', '');

            if ($provider === 'none') {
                $this->scene->update(['status' => 'generated']);
                return;
            }

            $prompt     = $this->scene->prompt;
            $imageBytes = null;

            if ($provider === 'comfyui') {
                $baseUrl    = AppSetting::get('comfyui_base_url', 'http://localhost:8188');
                $imageBytes = $this->callComfyUI($baseUrl, $prompt, 1280, 896);
            } else {
                $imageUrl = match ($provider) {
                    'zai'    => $this->callZai($prompt, $model ?: 'glm-image'),
                    'openai' => $this->callOpenAI($prompt, $model ?: 'dall-e-3'),
                    default  => null,
                };

                if ($imageUrl) {
                    $r          = Http::timeout(60)->get($imageUrl);
                    $imageBytes = $r->successful() ? $r->body() : null;
                }
            }

            if (! $imageBytes) {
                $this->scene->update(['status' => 'generated']);
                return;
            }

            $sessionId = $this->scene->game_session_id;
            $path      = "sessions/{$sessionId}/scenes/{$this->scene->id}/image.png";
            Storage::disk('local')->put($path, $imageBytes);

            $this->scene->update([
                'image_path' => $path,
                'status'     => 'image_ready',
            ]);
        } catch (\Throwable $e) {
            Log::error('GenerateSceneImage failed', ['scene_id' => $this->scene->id, 'error' => $e->getMessage()]);
            $this->scene->update(['status' => 'generated']);
        }
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
            Log::error('z.ai scene image generation error', ['status' => $r->status(), 'body' => $r->body()]);
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
            Log::error('OpenAI scene image generation error', ['status' => $r->status(), 'body' => $r->body()]);
            return null;
        }

        return $r->json('data.0.url');
    }
}
