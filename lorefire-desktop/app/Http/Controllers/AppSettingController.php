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
        'zai_plan',          // coding | standard — determines the base URL automatically
        'zai_base_url',      // derived and stored on save; never shown as a raw input
        'whisperx_model',    // tiny | base | small | medium | large-v2
        'whisperx_language', // en | auto
        'huggingface_token', // required for speaker diarization
        'default_art_style',      // comic | lifelike
        'image_gen_provider',     // none | zai | openai | comfyui
        'image_gen_model',        // e.g. cogview-4-flash, dall-e-3 (not used for comfyui)
        'image_gen_zai_api_key',  // separate standard-plan key for z.ai image generation
        'comfyui_base_url',       // e.g. http://localhost:8188
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
            'llm_provider'        => 'nullable|in:openai,anthropic,ollama,zai,none',
            'openai_api_key'      => 'nullable|string|max:255',
            'anthropic_api_key'   => 'nullable|string|max:255',
            'ollama_base_url'     => 'nullable|url|max:255',
            'ollama_model'        => 'nullable|string|max:100',
            'zai_api_key'         => 'nullable|string|max:255',
            'zai_model'           => 'nullable|string|max:100',
            'zai_plan'            => 'nullable|in:coding,standard',
            'whisperx_model'      => 'nullable|in:tiny,base,small,medium,large-v2',
            'whisperx_language'   => 'nullable|string|max:10',
            'huggingface_token'   => 'nullable|string|max:255',
            'default_art_style'   => 'nullable|in:comic,lifelike',
            'image_gen_provider'  => 'nullable|in:none,zai,openai,comfyui',
            'image_gen_model'     => 'nullable|string|max:100',
            'image_gen_zai_api_key' => 'nullable|string|max:255',
            'comfyui_base_url'    => 'nullable|url|max:255',
        ]);

        // Derive zai_base_url from the plan selection — never store a user-supplied raw URL.
        $plan = $data['zai_plan'] ?? AppSetting::get('zai_plan', 'coding');
        $data['zai_base_url'] = $plan === 'standard'
            ? AppSetting::ZAI_STANDARD_URL
            : AppSetting::ZAI_CODING_URL;

        foreach ($data as $key => $value) {
            if (in_array($key, $this->allowedKeys)) {
                AppSetting::set($key, $value ?? '');
            }
        }

        return back()->with('success', 'Settings saved.');
    }
}
