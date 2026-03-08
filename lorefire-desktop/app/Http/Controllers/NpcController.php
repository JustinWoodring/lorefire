<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Models\Npc;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class NpcController extends Controller
{
    public function index(Campaign $campaign): Response
    {
        return Inertia::render('Npcs/Index', [
            'campaign' => $campaign,
            'npcs'     => $campaign->npcs()->orderBy('name')->get(),
        ]);
    }

    public function create(Campaign $campaign): Response
    {
        return Inertia::render('Npcs/Create', [
            'campaign' => $campaign,
        ]);
    }

    public function store(Request $request, Campaign $campaign): RedirectResponse
    {
        $data = $request->validate([
            'name'              => 'required|string|max:255',
            'race'              => 'nullable|string|max:255',
            'role'              => 'nullable|string|max:255',
            'location'          => 'nullable|string|max:255',
            'last_seen'         => 'nullable|string|max:255',
            'tags'              => 'nullable|array',
            'tags.*'            => 'string|max:50',
            'voice_description' => 'nullable|string|max:500',
            'stat_block'        => 'nullable|array',
            'attitude'          => 'nullable|string|max:50',
            'description'       => 'nullable|string',
            'notes'             => 'nullable|string',
            'is_alive'          => 'boolean',
        ]);

        $npc = $campaign->npcs()->create($data);

        return redirect()->route('campaigns.npcs.show', [$campaign, $npc]);
    }

    public function show(Campaign $campaign, Npc $npc): Response
    {
        return Inertia::render('Npcs/Show', [
            'campaign' => $campaign,
            'npc'      => $npc,
        ]);
    }

    public function edit(Campaign $campaign, Npc $npc): Response
    {
        return Inertia::render('Npcs/Edit', [
            'campaign' => $campaign,
            'npc'      => $npc,
        ]);
    }

    public function update(Request $request, Campaign $campaign, Npc $npc): RedirectResponse
    {
        $data = $request->validate([
            'name'              => 'required|string|max:255',
            'race'              => 'nullable|string|max:255',
            'role'              => 'nullable|string|max:255',
            'location'          => 'nullable|string|max:255',
            'last_seen'         => 'nullable|string|max:255',
            'tags'              => 'nullable|array',
            'tags.*'            => 'string|max:50',
            'voice_description' => 'nullable|string|max:500',
            'stat_block'        => 'nullable|array',
            'attitude'          => 'nullable|string|max:50',
            'description'       => 'nullable|string',
            'notes'             => 'nullable|string',
            'is_alive'          => 'boolean',
        ]);

        $npc->update($data);

        return redirect()->route('campaigns.npcs.show', [$campaign, $npc]);
    }

    public function destroy(Campaign $campaign, Npc $npc): RedirectResponse
    {
        $npc->delete();

        return redirect()->route('campaigns.show', $campaign);
    }
}
