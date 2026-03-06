<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use App\Models\Campaign;
use App\Services\PythonSetupService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class OnboardingController extends Controller
{
    public function __construct(private PythonSetupService $pythonSetup) {}

    /**
     * Show the onboarding wizard.
     */
    public function index(): \Inertia\Response
    {
        return Inertia::render('Onboarding/Index', [
            'python_status' => $this->pythonSetup->getStatus(),
            'python_error'  => $this->pythonSetup->getLastError(),
        ]);
    }

    /**
     * Save LLM + WhisperX settings from the wizard.
     */
    public function saveSettings(Request $request): \Illuminate\Http\RedirectResponse
    {
        $validated = $request->validate([
            'llm_provider'      => 'nullable|string',
            'openai_api_key'    => 'nullable|string',
            'anthropic_api_key' => 'nullable|string',
            'ollama_base_url'   => 'nullable|url',
            'ollama_model'      => 'nullable|string',
            'zai_api_key'       => 'nullable|string',
            'zai_model'         => 'nullable|string',
            'whisperx_model'    => 'nullable|string',
        ]);

        foreach ($validated as $key => $value) {
            if ($value !== null) {
                AppSetting::set($key, $value);
            }
        }

        return back();
    }

    /**
     * Complete onboarding, optionally creating a first campaign.
     */
    public function complete(Request $request): \Illuminate\Http\RedirectResponse
    {
        $validated = $request->validate([
            'campaign_name' => 'nullable|string|max:255',
            'dm_name'       => 'nullable|string|max:255',
        ]);

        AppSetting::set('onboarding_complete', '1', 'boolean');

        $campaign = null;
        if (! empty($validated['campaign_name'])) {
            $campaign = Campaign::create([
                'name'    => $validated['campaign_name'],
                'dm_name' => $validated['dm_name'] ?? null,
                'art_style' => AppSetting::get('default_art_style', 'lifelike'),
                'is_active' => true,
            ]);
        }

        if ($campaign) {
            return redirect("/campaigns/{$campaign->id}")
                ->with('success', "Campaign \"{$campaign->name}\" created. Welcome to the archive!");
        }

        return redirect('/campaigns')
            ->with('success', 'Welcome to D&D Companion. Your archive is ready.');
    }

    /**
     * Retry the Python venv setup.
     */
    public function retryPython(): \Illuminate\Http\RedirectResponse
    {
        $this->pythonSetup->runSetupAsync();
        return back()->with('info', 'Python setup restarted in the background.');
    }
}
