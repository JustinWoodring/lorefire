<?php

namespace App\Http\Controllers;

use App\Models\Character;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Handles direct HP patching during live play.
 * Called via fetch() from the Live Session page CharacterCard component.
 */
class CharacterHpController extends Controller
{
    /**
     * PATCH /characters/{character}/hp
     *
     * Accepts { current_hp, temp_hp } and persists them.
     * Returns JSON so the client can confirm the saved values.
     */
    public function update(Request $request, Character $character): JsonResponse
    {
        $validated = $request->validate([
            'current_hp' => ['required', 'integer', 'min:0'],
            'temp_hp'    => ['nullable', 'integer', 'min:0'],
        ]);

        $character->update([
            'current_hp' => $validated['current_hp'],
            'temp_hp'    => $validated['temp_hp'] ?? 0,
        ]);

        return response()->json([
            'current_hp' => $character->current_hp,
            'temp_hp'    => $character->temp_hp,
        ]);
    }
}
