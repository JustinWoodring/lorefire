<?php

namespace App\Http\Controllers;

use App\Models\Character;
use App\Models\CharacterSpell;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class CharacterSpellController extends Controller
{
    public function store(Request $request, Character $character): RedirectResponse
    {
        $data = $request->validate([
            'name'         => 'required|string|max:255',
            'level'        => 'required|integer|min:0|max:9',
            'school'       => 'nullable|string|max:100',
            'casting_time' => 'nullable|string|max:100',
            'range'        => 'nullable|string|max:100',
            'components'   => 'nullable|string|max:255',
            'duration'     => 'nullable|string|max:100',
            'concentration'=> 'boolean',
            'ritual'       => 'boolean',
            'description'  => 'nullable|string',
            'is_prepared'  => 'boolean',
        ]);

        $character->spells()->create($data);

        return back()->with('success', 'Spell added.');
    }

    public function update(Request $request, Character $character, CharacterSpell $spell): RedirectResponse
    {
        abort_if($spell->character_id !== $character->id, 403);

        $data = $request->validate([
            'name'         => 'required|string|max:255',
            'level'        => 'required|integer|min:0|max:9',
            'school'       => 'nullable|string|max:100',
            'casting_time' => 'nullable|string|max:100',
            'range'        => 'nullable|string|max:100',
            'components'   => 'nullable|string|max:255',
            'duration'     => 'nullable|string|max:100',
            'concentration'=> 'boolean',
            'ritual'       => 'boolean',
            'description'  => 'nullable|string',
            'is_prepared'  => 'boolean',
        ]);

        $spell->update($data);

        return back()->with('success', 'Spell updated.');
    }

    public function togglePrepared(Character $character, CharacterSpell $spell): RedirectResponse
    {
        abort_if($spell->character_id !== $character->id, 403);

        // Cantrips (level 0) are always prepared — ignore toggle
        if ($spell->level === 0) {
            return back();
        }

        $spell->update(['is_prepared' => ! $spell->is_prepared]);

        return back();
    }

    public function destroy(Character $character, CharacterSpell $spell): RedirectResponse
    {
        abort_if($spell->character_id !== $character->id, 403);

        $spell->delete();

        return back()->with('success', 'Spell removed.');
    }
}
