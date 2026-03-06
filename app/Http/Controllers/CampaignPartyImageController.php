<?php

namespace App\Http\Controllers;

use App\Jobs\GeneratePartyPortrait;
use App\Models\AppSetting;
use App\Models\Campaign;
use Illuminate\Http\JsonResponse;

class CampaignPartyImageController extends Controller
{
    public function generate(Campaign $campaign): JsonResponse
    {
        $provider = AppSetting::get('image_gen_provider', 'none');

        if ($provider !== 'comfyui') {
            return response()->json(['error' => 'Party portrait generation requires ComfyUI.'], 422);
        }

        $campaign->update(['party_image_generation_status' => 'idle']);
        GeneratePartyPortrait::dispatch($campaign);

        return response()->json(['queued' => true]);
    }

    public function cancel(Campaign $campaign): JsonResponse
    {
        $campaign->update(['party_image_generation_status' => 'failed']);

        return response()->json(['cancelled' => true]);
    }

    public function status(Campaign $campaign): JsonResponse
    {
        $campaign->refresh();

        return response()->json([
            'status'           => $campaign->party_image_generation_status,
            'party_image_path' => $campaign->party_image_path,
        ]);
    }
}
