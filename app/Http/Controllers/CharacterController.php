<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Models\Character;
use App\Models\AppSetting;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class CharacterController extends Controller
{
     public function index(Campaign $campaign): Response
    {
        return Inertia::render('Characters/Index', [
            'campaign'   => $campaign,
            'characters' => $campaign->characters()->with('inventoryItems')->orderBy('name')->get(),
        ]);
    }

    public function create(Campaign $campaign): Response
    {
        return Inertia::render('Characters/Create', [
            'campaign' => $campaign,
        ]);
    }

    public function store(Request $request, Campaign $campaign): RedirectResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'player_name' => 'nullable|string|max:255',
            'race'        => 'required|string|max:255',
            'class'       => 'required|string|max:255',
            'level'       => 'required|integer|min:1|max:20',
            'background'  => 'nullable|string|max:255',
            'alignment'   => 'nullable|string|max:50',
            'strength'    => 'integer|min:1|max:30',
            'dexterity'   => 'integer|min:1|max:30',
            'constitution' => 'integer|min:1|max:30',
            'intelligence' => 'integer|min:1|max:30',
            'wisdom'      => 'integer|min:1|max:30',
            'charisma'    => 'integer|min:1|max:30',
            'max_hp'      => 'integer|min:0',
            'current_hp'  => 'integer',
            'armor_class' => 'integer|min:0',
            'portrait'    => 'nullable|file|image|max:10240',
        ]);

        if ($request->hasFile('portrait')) {
            $data['portrait_path'] = $request->file('portrait')->store('characters/portraits', 'local');
        }
        unset($data['portrait']);

        $character = $campaign->characters()->create($data);

        return redirect()->route('campaigns.characters.show', [$campaign, $character]);
    }

    public function show(Campaign $campaign, Character $character): Response
    {
        $character->load(['spells', 'inventoryItems', 'features', 'conditions', 'inventorySnapshots.gameSession']);

        return Inertia::render('Characters/Show', [
            'campaign'         => $campaign,
            'character'        => $character,
            'imageGenProvider' => AppSetting::get('image_gen_provider', 'none'),
        ]);
    }

    public function edit(Campaign $campaign, Character $character): Response
    {
        return Inertia::render('Characters/Edit', [
            'campaign'         => $campaign,
            'character'        => $character,
            'imageGenProvider' => AppSetting::get('image_gen_provider', 'none'),
        ]);
    }

    public function update(Request $request, Campaign $campaign, Character $character): RedirectResponse
    {
        $data = $request->validate([
            'name'         => 'required|string|max:255',
            'player_name'  => 'nullable|string|max:255',
            'race'         => 'required|string|max:255',
            'subrace'      => 'nullable|string|max:255',
            'class'        => 'required|string|max:255',
            'subclass'     => 'nullable|string|max:255',
            'level'        => 'required|integer|min:1|max:20',
            'background'   => 'nullable|string|max:255',
            'alignment'    => 'nullable|string|max:50',
            'experience_points'  => 'integer|min:0',
            'strength'     => 'integer|min:1|max:30',
            'dexterity'    => 'integer|min:1|max:30',
            'constitution' => 'integer|min:1|max:30',
            'intelligence' => 'integer|min:1|max:30',
            'wisdom'       => 'integer|min:1|max:30',
            'charisma'     => 'integer|min:1|max:30',
            'max_hp'       => 'integer|min:0',
            'current_hp'   => 'integer',
            'temp_hp'      => 'integer|min:0',
            'armor_class'  => 'integer|min:0',
            'initiative_bonus'   => 'integer',
            'speed'        => 'integer|min:0',
            'proficiency_bonus'  => 'integer|min:2|max:6',
            'death_save_successes' => 'integer|min:0|max:3',
            'death_save_failures'  => 'integer|min:0|max:3',
            'saving_throw_proficiencies' => 'nullable|array',
            'skill_proficiencies'        => 'nullable|array',
            'skill_expertises'           => 'nullable|array',
            'spellcasting_ability' => 'nullable|string|max:50',
            'dnd_beyond_url'     => 'nullable|string|max:500',
            'personality_traits' => 'nullable|string',
            'ideals'       => 'nullable|string',
            'bonds'        => 'nullable|string',
            'flaws'        => 'nullable|string',
            'backstory'    => 'nullable|string',
            'appearance_description' => 'nullable|string',
            'copper'       => 'integer|min:0',
            'silver'       => 'integer|min:0',
            'electrum'     => 'integer|min:0',
            'gold'         => 'integer|min:0',
            'platinum'     => 'integer|min:0',
            'class_features' => 'nullable|array',
            'portrait'     => 'nullable|file|image|max:10240',
            'portrait_style' => 'nullable|in:lifelike,renaissance,comic',
        ]);

        if ($request->hasFile('portrait')) {
            if ($character->portrait_path) {
                Storage::disk('local')->delete($character->portrait_path);
            }
            $data['portrait_path'] = $request->file('portrait')->store('characters/portraits', 'local');
        }
        unset($data['portrait']);

        $character->update($data);

        return redirect()->route('campaigns.characters.show', [$campaign, $character]);
    }

    public function destroy(Campaign $campaign, Character $character): RedirectResponse
    {
        if ($character->portrait_path) {
            Storage::disk('local')->delete($character->portrait_path);
        }
        $character->delete();

        return redirect()->route('campaigns.show', $campaign);
    }
}
