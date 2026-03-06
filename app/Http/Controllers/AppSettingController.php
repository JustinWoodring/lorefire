<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class AppSettingController extends Controller
{
    protected array $allowedKeys = [
        'llm_provider',      // openai | anthropic | ollama | zai | none
        'openai_api_key',
        'anthropic_api_key',
        'ollama_base_url',
        'ollama_model',
        'zai_api_key',
        'zai_model',         // e.g. glm-4-flash, glm-4.7, etc.
        'zai_base_url',      // API base URL, default https://open.bigmodel.cn/api/paas/v4
        'whisperx_model',    // tiny | base | small | medium | large-v2
        'whisperx_language', // en | auto
        'huggingface_token', // required for speaker diarization
        'default_art_style',   // comic | lifelike
        'image_gen_provider',  // none | zai | openai | comfyui
        'image_gen_model',     // e.g. dall-e-3 (not used for comfyui)
        'comfyui_base_url',    // e.g. http://localhost:8188
    ];

    public function index(): Response
    {
        $settings = [];
        foreach ($this->allowedKeys as $key) {
            $settings[$key] = AppSetting::get($key);
        }

        return Inertia::render('Settings/Index', [
            'settings' => $settings,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'llm_provider'      => 'nullable|in:openai,anthropic,ollama,zai,none',
            'openai_api_key'    => 'nullable|string|max:255',
            'anthropic_api_key' => 'nullable|string|max:255',
            'ollama_base_url'   => 'nullable|url|max:255',
            'ollama_model'      => 'nullable|string|max:100',
            'zai_api_key'       => 'nullable|string|max:255',
            'zai_model'         => 'nullable|string|max:100',
            'zai_base_url'      => 'nullable|url|max:255',
            'whisperx_model'    => 'nullable|in:tiny,base,small,medium,large-v2',
            'whisperx_language' => 'nullable|string|max:10',
            'huggingface_token' => 'nullable|string|max:255',
            'default_art_style'  => 'nullable|in:comic,lifelike',
            'image_gen_provider' => 'nullable|in:none,zai,openai,comfyui',
            'image_gen_model'    => 'nullable|string|max:100',
            'comfyui_base_url'   => 'nullable|url|max:255',
        ]);

        foreach ($data as $key => $value) {
            if (in_array($key, $this->allowedKeys)) {
                AppSetting::set($key, $value ?? '');
            }
        }

        return back()->with('success', 'Settings saved.');
    }
}
