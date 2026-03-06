<?php

namespace App\Http\Controllers;

use App\Models\Character;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Quick spell-slot toggle — increment/decrement `spell_slots_used`
 * for a given slot level without going into full edit mode.
 */
class CharacterSpellSlotsController extends Controller
{
    /**
     * PATCH /characters/{character}/spell-slots
     * or
     * PATCH /campaigns/{campaign}/characters/{character}/spell-slots
     *
     * Body: { level: int, action: 'use'|'recover' }
     */
    public function update(Request $request, Character $character): RedirectResponse
    {
        $data = $request->validate([
            'level'  => 'required|integer|min:1|max:9',
            'action' => 'required|in:use,recover',
        ]);

        $level = (string) $data['level'];
        $slots = $character->spell_slots ?? [];
        $used  = $character->spell_slots_used ?? [];

        $max  = (int) ($slots[$level] ?? 0);
        $curr = (int) ($used[$level] ?? 0);

        if ($data['action'] === 'use') {
            $curr = min($curr + 1, $max);
        } else {
            $curr = max($curr - 1, 0);
        }

        $used[$level] = $curr;

        $character->update(['spell_slots_used' => $used]);

        return back()->with('success', "Spell slot updated.");
    }
}
