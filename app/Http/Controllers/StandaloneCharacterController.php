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

/**
 * Manages characters outside the context of a specific campaign.
 * Characters can still belong to a campaign, but are browsed/created globally.
 */
class StandaloneCharacterController extends Controller
{
    public function index(): Response
    {
        $characters = Character::with(['campaign', 'inventoryItems'])
            ->orderBy('name')
            ->get();

        $campaigns = Campaign::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Characters/Index', [
            'campaign'   => null,
            'characters' => $characters,
            'campaigns'  => $campaigns,
        ]);
    }

    public function create(): Response
    {
        $campaigns = Campaign::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Characters/Create', [
            'campaign'  => null,
            'campaigns' => $campaigns,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'campaign_id' => 'nullable|exists:campaigns,id',
            'name'        => 'required|string|max:255',
            'player_name' => 'nullable|string|max:255',
            'race'        => 'required|string|max:255',
            'subrace'     => 'nullable|string|max:255',
            'class'       => 'required|string|max:255',
            'subclass'    => 'nullable|string|max:255',
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
            'speed'       => 'integer|min:0',
            'portrait'    => 'nullable|file|image|max:10240',
        ]);

        if ($request->hasFile('portrait')) {
            $data['portrait_path'] = $request->file('portrait')->store('characters/portraits', 'local');
        }
        unset($data['portrait']);

        $character = Character::create($data);

        return redirect("/characters/{$character->id}")
            ->with('success', "{$character->name} created.");
    }

    public function show(Character $character): Response
    {
        $character->load(['spells', 'inventoryItems', 'features', 'conditions', 'campaign', 'inventorySnapshots.gameSession']);

        return Inertia::render('Characters/Show', [
            'campaign'         => $character->campaign,
            'character'        => $character,
            'imageGenProvider' => AppSetting::get('image_gen_provider', 'none'),
        ]);
    }

    public function edit(Character $character): Response
    {
        $campaigns = Campaign::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Characters/Edit', [
            'campaign'         => $character->campaign,
            'character'        => $character,
            'campaigns'        => $campaigns,
            'imageGenProvider' => AppSetting::get('image_gen_provider', 'none'),
        ]);
    }

    public function update(Request $request, Character $character): RedirectResponse
    {
        $data = $request->validate([
            'campaign_id'  => 'nullable|exists:campaigns,id',
            'name'         => 'required|string|max:255',
            'player_name'  => 'nullable|string|max:255',
            'race'         => 'required|string|max:255',
            'subrace'      => 'nullable|string|max:255',
            'class'        => 'required|string|max:255',
            'subclass'     => 'nullable|string|max:255',
            'level'        => 'required|integer|min:1|max:20',
            'background'   => 'nullable|string|max:255',
            'alignment'    => 'nullable|string|max:50',
            'experience_points' => 'integer|min:0',
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
            'speed'        => 'integer|min:0',
            'initiative_bonus'   => 'integer',
            'proficiency_bonus'  => 'integer|min:2|max:6',
            'death_save_successes' => 'integer|min:0|max:3',
            'death_save_failures'  => 'integer|min:0|max:3',
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
            'spellcasting_ability' => 'nullable|string|max:50',
            'saving_throw_proficiencies' => 'nullable|array',
            'skill_proficiencies'        => 'nullable|array',
            'skill_expertises'           => 'nullable|array',
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

        return redirect("/characters/{$character->id}")
            ->with('success', 'Character updated.');
    }

    public function destroy(Character $character): RedirectResponse
    {
        if ($character->portrait_path) {
            Storage::disk('local')->delete($character->portrait_path);
        }
        $character->delete();

        return redirect('/characters')
            ->with('success', 'Character deleted.');
    }
}
