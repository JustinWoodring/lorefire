<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use App\Models\Campaign;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class CampaignController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Campaigns/Index', [
            'campaigns' => Campaign::withCount(['characters', 'gameSessions', 'npcs'])
                ->orderByDesc('updated_at')
                ->get(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Campaigns/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name'             => 'required|string|max:255',
            'dm_name'          => 'nullable|string|max:255',
            'description'      => 'nullable|string',
            'setting'          => 'nullable|string|max:255',
            'notes'            => 'nullable|string',
            'art_style'        => 'in:comic,lifelike',
            'party_image'      => 'nullable|file|image|max:10240',
        ]);

        if ($request->hasFile('party_image')) {
            $data['party_image_path'] = $request->file('party_image')->store('campaigns/party', 'local');
        }
        unset($data['party_image']);

        $campaign = Campaign::create($data);

        return redirect()->route('campaigns.show', $campaign);
    }

    public function show(Campaign $campaign): Response
    {
        $campaign->load([
            'characters.inventoryItems',
            'npcs',
            'gameSessions' => fn ($q) => $q->orderByDesc('played_at'),
        ]);

        return Inertia::render('Campaigns/Show', [
            'campaign'        => $campaign,
            'imageGenProvider' => AppSetting::get('image_gen_provider', 'none'),
        ]);
    }

    public function edit(Campaign $campaign): Response
    {
        return Inertia::render('Campaigns/Edit', [
            'campaign' => $campaign,
        ]);
    }

    public function update(Request $request, Campaign $campaign): RedirectResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'dm_name'     => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'setting'     => 'nullable|string|max:255',
            'notes'       => 'nullable|string',
            'art_style'   => 'in:comic,lifelike',
            'is_active'   => 'boolean',
            'party_image' => 'nullable|file|image|max:10240',
        ]);

        if ($request->hasFile('party_image')) {
            // Delete the old image if one existed
            if ($campaign->party_image_path) {
                Storage::disk('local')->delete($campaign->party_image_path);
            }
            $data['party_image_path'] = $request->file('party_image')->store('campaigns/party', 'local');
        }
        unset($data['party_image']);

        $campaign->update($data);

        return redirect()->route('campaigns.show', $campaign);
    }

    public function destroy(Campaign $campaign): RedirectResponse
    {
        if ($campaign->party_image_path) {
            Storage::disk('local')->delete($campaign->party_image_path);
        }
        $campaign->delete();

        return redirect()->route('campaigns.index');
    }
}

