<?php

namespace App\Jobs;

use App\Jobs\Concerns\GeneratesViaComfyUI;
use App\Models\AppSetting;
use App\Models\Campaign;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
class GeneratePartyPortrait implements ShouldQueue
{
    use Queueable, GeneratesViaComfyUI;

    public int $timeout = 660;

    public function __construct(public Campaign $campaign) {}

    public function handle(): void
    {
        $this->campaign->update(['party_image_generation_status' => 'generating']);

        try {
            $provider = AppSetting::get('image_gen_provider', 'none');

            if ($provider !== 'comfyui') {
                Log::warning('GeneratePartyPortrait: only comfyui provider is supported', ['provider' => $provider]);
                $this->campaign->update(['party_image_generation_status' => 'failed']);
                return;
            }

            $baseUrl = AppSetting::get('comfyui_base_url', 'http://localhost:8188');

            // Load characters with portraits
            $characters = $this->campaign->characters()->get();

            if ($characters->isEmpty()) {
                Log::warning('GeneratePartyPortrait: no characters found', ['campaign_id' => $this->campaign->id]);
                $this->campaign->update(['party_image_generation_status' => 'failed']);
                return;
            }

            $prompt = $this->buildPrompt($characters);

            Log::info('GeneratePartyPortrait: prompt', [
                'campaign_id'      => $this->campaign->id,
                'character_count'  => $characters->count(),
                'character_names'  => $characters->pluck('name')->toArray(),
                'prompt'           => $prompt,
            ]);

            // Use plain text-to-image — no reference images.
            // Character appearance descriptions in the prompt are sufficient to infer
            // each character's look; feeding portrait images via ReferenceLatent causes
            // pixel-level compositing artifacts with multiple references.
            $imageBytes = $this->callComfyUI(
                baseUrl: $baseUrl,
                prompt: $prompt,
                width: 1024,
                height: 576,
            );

            if (! $imageBytes) {
                $this->campaign->update(['party_image_generation_status' => 'failed']);
                return;
            }

            $path = "campaigns/party/{$this->campaign->id}/portrait.png";

            // Delete old generated portrait if it exists and differs from manually uploaded one
            if ($this->campaign->party_image_path && $this->campaign->party_image_path !== $path) {
                Storage::disk('local')->delete($this->campaign->party_image_path);
            }

            Storage::disk('local')->put($path, $imageBytes);

            $this->campaign->update([
                'party_image_path'              => $path,
                'party_image_generation_status' => 'done',
            ]);
        } catch (\Throwable $e) {
            Log::error('GeneratePartyPortrait failed', [
                'campaign_id' => $this->campaign->id,
                'error'       => $e->getMessage(),
            ]);
            $this->campaign->update(['party_image_generation_status' => 'failed']);
        }
    }

    protected function buildPrompt(\Illuminate\Support\Collection $characters): string
    {
        $artStyle = $this->campaign->art_style ?? 'lifelike';

        $styleKeywords = match ($artStyle) {
            'comic' => 'TTRPG sourcebook illustration. Characters rendered semi-realistically with clean ink outlines and smooth cel shading that gives them strong volume and 3D form. Muted earthy palette — desaturated greens, warm browns, dusty taupes, cool grays, one or two sparse accent colors. Soft dual lighting on characters: warm fill from below, cool diffuse from above, smooth shading transitions, no harsh shadows. Hazy softened background with atmospheric depth. No photorealism, no painterly texture, no anime, no oversaturation.',
            default => 'realistic fantasy art, detailed oil painting, cinematic lighting, highly detailed, 8k, photorealistic',
        };

        $campaignName   = $this->campaign->name;
        $characterCount = $characters->count();
        $nameList       = $characters->pluck('name')->implode(', ');

        // One self-contained block per character — explicit separator so the model
        // treats each block as an independent subject rather than blending attributes.
        $characterBlocks = $characters->values()->map(function ($c, $i) use ($characterCount) {
            $pos  = $i + 1;
            $desc = $c->appearance_description ? trim($c->appearance_description) : '';

            $lines = ["[CHARACTER {$pos} OF {$characterCount}]"];
            $lines[] = "Name: {$c->name}";
            $lines[] = "Race: {$c->race}";
            $lines[] = "Class: {$c->class}";
            if ($desc !== '') {
                $lines[] = "Appearance: {$desc}";
            }
            $lines[] = "[END CHARACTER {$pos}]";

            return implode("\n", $lines);
        })->implode("\n\n");

        return <<<PROMPT
        Group portrait of exactly {$characterCount} distinct adventurers for the campaign "{$campaignName}".
        Every character listed below must be fully visible and individually recognisable.
        Characters: {$nameList}.

        {$characterBlocks}

        Composition: all {$characterCount} characters — {$nameList} — shown together, side by side, each given equal horizontal space. Wide panoramic shot, full-body or three-quarter view, no character obscured or cropped. Each character's race, class, and appearance must be clearly distinct from the others.

        {$styleKeywords}
        PROMPT;
    }
}
