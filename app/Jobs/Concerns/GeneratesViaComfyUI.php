<?php

namespace App\Jobs\Concerns;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * ComfyUI image generation via the /prompt + /history + /view API.
 *
 * Targets the Lumina2 setup detected on this machine:
 *   UNET:  z_image_turbo_bf16.safetensors  (Lumina2 model)
 *   CLIP:  qwen_3_4b.safetensors           (CLIPLoader, type=lumina2)
 *   VAE:   ae.safetensors
 *
 * Flow:
 *   1. POST /prompt  → { prompt_id }
 *   2. Poll GET /history/{prompt_id} until outputs appear (or timeout)
 *   3. Fetch image bytes via GET /view?filename=...&subfolder=...&type=output
 */
trait GeneratesViaComfyUI
{
    /**
     * Submit a text-to-image prompt to a local ComfyUI instance.
     * Returns the raw image bytes on success, null on failure.
     */
    protected function callComfyUI(
        string $baseUrl,
        string $prompt,
        int    $width    = 512,
        int    $height   = 768,
        int    $steps    = 20,    // Lumina2: 20 steps typical
        float  $cfg      = 4.0,  // Lumina2: CFG 4-5 typical
    ): ?string {
        $baseUrl  = rtrim($baseUrl, '/');
        $clientId = (string) Str::uuid();

        // Detect available models dynamically from the live ComfyUI instance
        $models = $this->detectModels($baseUrl);

        // Lumina2 workflow:
        //   UNETLoader + CLIPLoader(lumina2) + VAELoader
        //   + CLIPTextEncodeLumina2 (pos) + CLIPTextEncodeLumina2 (neg)
        //   + EmptySD3LatentImage + KSampler + VAEDecode + SaveImage
        $workflow = [
            // Load UNET
            'unet' => [
                'class_type' => 'UNETLoader',
                'inputs'     => [
                    'unet_name'    => $models['unet'],
                    'weight_dtype' => 'default',
                ],
            ],
            // Load CLIP (single loader, lumina2 type — DualCLIPLoader has no lumina2 type)
            'clip' => [
                'class_type' => 'CLIPLoader',
                'inputs'     => [
                    'clip_name' => $models['clip'],
                    'type'      => 'lumina2',
                ],
            ],
            // Load VAE
            'vae' => [
                'class_type' => 'VAELoader',
                'inputs'     => [
                    'vae_name' => $models['vae'],
                ],
            ],
            // Encode positive prompt via Lumina2-specific encoder
            'pos' => [
                'class_type' => 'CLIPTextEncodeLumina2',
                'inputs'     => [
                    'clip'          => ['clip', 0],
                    'system_prompt' => 'superior',
                    'user_prompt'   => $prompt,
                ],
            ],
            // Empty negative (Lumina2 is a flow model; minimal/empty neg is fine)
            'neg' => [
                'class_type' => 'CLIPTextEncodeLumina2',
                'inputs'     => [
                    'clip'          => ['clip', 0],
                    'system_prompt' => 'alignment',
                    'user_prompt'   => '',
                ],
            ],
            // Empty latent (SD3/Lumina2 compatible)
            'latent' => [
                'class_type' => 'EmptySD3LatentImage',
                'inputs'     => [
                    'width'      => $width,
                    'height'     => $height,
                    'batch_size' => 1,
                ],
            ],
            // Sample
            'sampler' => [
                'class_type' => 'KSampler',
                'inputs'     => [
                    'seed'         => rand(1, 999999999),
                    'steps'        => $steps,
                    'cfg'          => $cfg,
                    'sampler_name' => 'euler',
                    'scheduler'    => 'simple',
                    'denoise'      => 1.0,
                    'model'        => ['unet', 0],
                    'positive'     => ['pos', 0],
                    'negative'     => ['neg', 0],
                    'latent_image' => ['latent', 0],
                ],
            ],
            // Decode
            'decode' => [
                'class_type' => 'VAEDecode',
                'inputs'     => [
                    'samples' => ['sampler', 0],
                    'vae'     => ['vae', 0],
                ],
            ],
            // Save
            'save' => [
                'class_type' => 'SaveImage',
                'inputs'     => [
                    'filename_prefix' => 'lorefire',
                    'images'          => ['decode', 0],
                ],
            ],
        ];

        // Submit the prompt
        $submitResponse = Http::timeout(30)->post("{$baseUrl}/prompt", [
            'client_id' => $clientId,
            'prompt'    => $workflow,
        ]);

        if (! $submitResponse->successful()) {
            Log::error('ComfyUI prompt submission failed', [
                'status' => $submitResponse->status(),
                'body'   => $submitResponse->body(),
            ]);
            return null;
        }

        $promptId = $submitResponse->json('prompt_id');
        if (! $promptId) {
            Log::error('ComfyUI: no prompt_id in response', ['body' => $submitResponse->body()]);
            return null;
        }

        // Poll /history/{prompt_id} until outputs appear (max ~10 minutes)
        $maxAttempts = 120;
        $imageInfo   = null;

        for ($i = 0; $i < $maxAttempts; $i++) {
            sleep(5);

            $historyResponse = Http::timeout(10)->get("{$baseUrl}/history/{$promptId}");
            if (! $historyResponse->successful()) {
                continue;
            }

            $history = $historyResponse->json();
            $entry   = $history[$promptId] ?? null;
            if (! $entry) continue;

            // Bail early on execution error
            $statusStr = $entry['status']['status_str'] ?? null;
            if ($statusStr === 'error') {
                $msgs = $entry['status']['messages'] ?? [];
                foreach ($msgs as $msg) {
                    if (($msg[0] ?? '') === 'execution_error') {
                        Log::error('ComfyUI execution error', [
                            'prompt_id' => $promptId,
                            'message'   => $msg[1]['exception_message'] ?? 'unknown',
                            'node'      => $msg[1]['node_type'] ?? 'unknown',
                        ]);
                    }
                }
                return null;
            }

            $outputs = $entry['outputs'] ?? null;

            if ($outputs) {
                foreach ($outputs as $nodeOutputs) {
                    if (isset($nodeOutputs['images'][0])) {
                        $imageInfo = $nodeOutputs['images'][0];
                        break 2;
                    }
                }
            }
        }

        if (! $imageInfo) {
            Log::error('ComfyUI: timed out waiting for image output', ['prompt_id' => $promptId]);
            return null;
        }

        // Fetch image bytes
        $viewResponse = Http::timeout(60)->get("{$baseUrl}/view", [
            'filename'  => $imageInfo['filename'],
            'subfolder' => $imageInfo['subfolder'] ?? '',
            'type'      => $imageInfo['type'] ?? 'output',
        ]);

        if (! $viewResponse->successful()) {
            Log::error('ComfyUI: failed to fetch image', ['image_info' => $imageInfo]);
            return null;
        }

        return $viewResponse->body();
    }

    /**
     * Upload a local image file to ComfyUI's /upload/image endpoint.
     * Returns the uploaded filename (as ComfyUI knows it), or null on failure.
     */
    protected function uploadImageToComfyUI(string $baseUrl, string $localPath): ?string
    {
        if (! file_exists($localPath)) {
            Log::warning('ComfyUI upload: local file not found', ['path' => $localPath]);
            return null;
        }

        try {
            $response = Http::timeout(30)
                ->attach('image', fopen($localPath, 'r'), basename($localPath))
                ->post("{$baseUrl}/upload/image");

            if (! $response->successful()) {
                Log::error('ComfyUI upload/image failed', [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);
                return null;
            }

            return $response->json('name');
        } catch (\Throwable $e) {
            Log::error('ComfyUI upload/image exception', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Submit a text-to-image prompt to ComfyUI with optional character portrait references.
     * Each reference image is injected via: LoadImage → VAEEncode → ReferenceLatent (chained).
     *
     * @param  string   $baseUrl
     * @param  string   $prompt               Text prompt
     * @param  int      $width
     * @param  int      $height
     * @param  string[] $referenceFilenames    Filenames already uploaded to ComfyUI via uploadImageToComfyUI()
     */
    protected function callComfyUIWithReferences(
        string $baseUrl,
        string $prompt,
        int    $width               = 768,
        int    $height              = 512,
        array  $referenceFilenames  = [],
        int    $steps               = 20,
        float  $cfg                 = 4.0,
    ): ?string {
        $baseUrl  = rtrim($baseUrl, '/');
        $clientId = (string) Str::uuid();
        $models   = $this->detectModels($baseUrl);

        $workflow = [
            'unet' => [
                'class_type' => 'UNETLoader',
                'inputs'     => [
                    'unet_name'    => $models['unet'],
                    'weight_dtype' => 'default',
                ],
            ],
            'clip' => [
                'class_type' => 'CLIPLoader',
                'inputs'     => [
                    'clip_name' => $models['clip'],
                    'type'      => 'lumina2',
                ],
            ],
            'vae' => [
                'class_type' => 'VAELoader',
                'inputs'     => [
                    'vae_name' => $models['vae'],
                ],
            ],
            'pos' => [
                'class_type' => 'CLIPTextEncodeLumina2',
                'inputs'     => [
                    'clip'          => ['clip', 0],
                    'system_prompt' => 'superior',
                    'user_prompt'   => $prompt,
                ],
            ],
            'neg' => [
                'class_type' => 'CLIPTextEncodeLumina2',
                'inputs'     => [
                    'clip'          => ['clip', 0],
                    'system_prompt' => 'alignment',
                    'user_prompt'   => '',
                ],
            ],
            'latent' => [
                'class_type' => 'EmptySD3LatentImage',
                'inputs'     => [
                    'width'      => $width,
                    'height'     => $height,
                    'batch_size' => 1,
                ],
            ],
        ];

        // Chain ReferenceLatent nodes for each uploaded portrait.
        // ref0_load → ref0_encode → ref0_reflatent
        // ref1_load → ref1_encode → ref1_reflatent (feeds ref0_reflatent output as conditioning)
        // ...
        // KSampler.positive = last reflatent output (or 'pos' if no references)
        $lastConditioningRef = ['pos', 0];
        foreach ($referenceFilenames as $i => $filename) {
            $loadKey   = "ref{$i}_load";
            $encKey    = "ref{$i}_encode";
            $reflatKey = "ref{$i}_reflatent";

            $workflow[$loadKey] = [
                'class_type' => 'LoadImage',
                'inputs'     => [
                    'image'  => $filename,
                    'upload' => 'image',
                ],
            ];

            $workflow[$encKey] = [
                'class_type' => 'VAEEncode',
                'inputs'     => [
                    'pixels' => [$loadKey, 0],
                    'vae'    => ['vae', 0],
                ],
            ];

            $workflow[$reflatKey] = [
                'class_type' => 'ReferenceLatent',
                'inputs'     => [
                    'conditioning' => $lastConditioningRef,
                    'latent'       => [$encKey, 0],
                ],
            ];

            $lastConditioningRef = [$reflatKey, 0];
        }

        $workflow['sampler'] = [
            'class_type' => 'KSampler',
            'inputs'     => [
                'seed'         => rand(1, 999999999),
                'steps'        => $steps,
                'cfg'          => $cfg,
                'sampler_name' => 'euler',
                'scheduler'    => 'simple',
                'denoise'      => 1.0,
                'model'        => ['unet', 0],
                'positive'     => $lastConditioningRef,
                'negative'     => ['neg', 0],
                'latent_image' => ['latent', 0],
            ],
        ];

        $workflow['decode'] = [
            'class_type' => 'VAEDecode',
            'inputs'     => [
                'samples' => ['sampler', 0],
                'vae'     => ['vae', 0],
            ],
        ];

        $workflow['save'] = [
            'class_type' => 'SaveImage',
            'inputs'     => [
                'filename_prefix' => 'lorefire',
                'images'          => ['decode', 0],
            ],
        ];

        // Submit the prompt
        $submitResponse = Http::timeout(30)->post("{$baseUrl}/prompt", [
            'client_id' => $clientId,
            'prompt'    => $workflow,
        ]);

        if (! $submitResponse->successful()) {
            Log::error('ComfyUI (with refs) prompt submission failed', [
                'status' => $submitResponse->status(),
                'body'   => $submitResponse->body(),
            ]);
            return null;
        }

        $promptId = $submitResponse->json('prompt_id');
        if (! $promptId) {
            Log::error('ComfyUI (with refs): no prompt_id in response', ['body' => $submitResponse->body()]);
            return null;
        }

        // Poll for completion (max ~10 minutes)
        $maxAttempts = 120;
        $imageInfo   = null;

        for ($i = 0; $i < $maxAttempts; $i++) {
            sleep(5);

            $historyResponse = Http::timeout(10)->get("{$baseUrl}/history/{$promptId}");
            if (! $historyResponse->successful()) continue;

            $history = $historyResponse->json();
            $entry   = $history[$promptId] ?? null;
            if (! $entry) continue;

            $statusStr = $entry['status']['status_str'] ?? null;
            if ($statusStr === 'error') {
                $msgs = $entry['status']['messages'] ?? [];
                foreach ($msgs as $msg) {
                    if (($msg[0] ?? '') === 'execution_error') {
                        Log::error('ComfyUI (with refs) execution error', [
                            'prompt_id' => $promptId,
                            'message'   => $msg[1]['exception_message'] ?? 'unknown',
                            'node'      => $msg[1]['node_type'] ?? 'unknown',
                        ]);
                    }
                }
                return null;
            }

            $outputs = $entry['outputs'] ?? null;
            if ($outputs) {
                foreach ($outputs as $nodeOutputs) {
                    if (isset($nodeOutputs['images'][0])) {
                        $imageInfo = $nodeOutputs['images'][0];
                        break 2;
                    }
                }
            }
        }

        if (! $imageInfo) {
            Log::error('ComfyUI (with refs): timed out waiting for image output', ['prompt_id' => $promptId]);
            return null;
        }

        $viewResponse = Http::timeout(60)->get("{$baseUrl}/view", [
            'filename'  => $imageInfo['filename'],
            'subfolder' => $imageInfo['subfolder'] ?? '',
            'type'      => $imageInfo['type'] ?? 'output',
        ]);

        if (! $viewResponse->successful()) {
            Log::error('ComfyUI (with refs): failed to fetch image', ['image_info' => $imageInfo]);
            return null;
        }

        return $viewResponse->body();
    }

    /**
     * Query /object_info to find the first available model for each loader type.
     */
    protected function detectModels(string $baseUrl): array
    {
        $defaults = [
            'unet' => 'z_image_turbo_bf16.safetensors',
            'clip' => 'qwen_3_4b.safetensors',
            'vae'  => 'ae.safetensors',
        ];

        try {
            $r = Http::timeout(10)->get("{$baseUrl}/object_info/UNETLoader");
            if ($r->successful()) {
                $list = $r->json('UNETLoader.input.required.unet_name.0') ?? [];
                if (! empty($list)) $defaults['unet'] = $list[0];
            }

            // Use CLIPLoader (single) — DualCLIPLoader does not have a lumina2 type
            $r = Http::timeout(10)->get("{$baseUrl}/object_info/CLIPLoader");
            if ($r->successful()) {
                $list = $r->json('CLIPLoader.input.required.clip_name.0') ?? [];
                if (! empty($list)) $defaults['clip'] = $list[0];
            }

            $r = Http::timeout(10)->get("{$baseUrl}/object_info/VAELoader");
            if ($r->successful()) {
                $list = $r->json('VAELoader.input.required.vae_name.0') ?? [];
                if (! empty($list)) $defaults['vae'] = $list[0];
            }
        } catch (\Throwable) {
            // fall through to defaults
        }

        return $defaults;
    }
}
