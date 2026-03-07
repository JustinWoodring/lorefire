<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Models\Character;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Handles partial updates to a character's class_features JSON column.
 * Used by the Live Session page and Character sheet for interactive
 * trackers (Lay on Hands, Ki Points, Bardic Inspiration, etc.)
 *
 * Accepts a flat key-value map of only the fields to merge —
 * existing keys not present in the request are left untouched.
 */
class CharacterClassFeaturesController extends Controller
{
    /**
     * PATCH /characters/{character}/class-features
     *
     * Body: { [key: string]: scalar }  — e.g. { lay_on_hands_current: 15 }
     * Returns the full updated class_features as JSON.
     */
    public function update(Request $request, Character $character): JsonResponse
    {
        $incoming = $request->validate([
            'updates'   => ['required', 'array'],
            'updates.*' => ['nullable', 'scalar'],
        ]);

        $cf = $character->class_features ?? [];

        foreach ($incoming['updates'] as $key => $value) {
            // Only allow known safe keys — no arbitrary PHP/SQL injection vector
            if (preg_match('/^[a-z][a-z0-9_]{0,63}$/', $key)) {
                $cf[$key] = $value;
            }
        }

        $character->update(['class_features' => $cf]);

        return response()->json(['class_features' => $character->class_features]);
    }

    /**
     * Campaign-scoped variant — same logic, accept the campaign route binding.
     * PATCH /campaigns/{campaign}/characters/{character}/class-features
     */
    public function updateForCampaign(Request $request, Campaign $campaign, Character $character): JsonResponse
    {
        return $this->update($request, $character);
    }
}
