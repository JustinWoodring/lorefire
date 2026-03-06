<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Models\GameSession;
use App\Models\AppSetting;
use Inertia\Inertia;
use Inertia\Response;

class LiveSessionController extends Controller
{
    public function show(Campaign $campaign, GameSession $session): Response
    {
        // Load all campaign characters with their full live data
        $characters = $campaign->characters()
            ->with(['inventoryItems', 'spells', 'conditions'])
            ->orderBy('name')
            ->get();

        // Filter to session participants if set; otherwise show all
        if (!empty($session->participant_character_ids)) {
            $characters = $characters->filter(
                fn ($c) => in_array($c->id, $session->participant_character_ids)
            )->values();
        }

        $hasLlm = AppSetting::get('llm_provider', 'none') !== 'none';

        // Include campaign context for Oracle
        $campaignContext = $campaign->load(['characters', 'gameSessions' => fn ($q) => $q->latest()->limit(5)]);

        return Inertia::render('Sessions/Live', [
            'campaign'   => $campaign,
            'session'    => $session,
            'characters' => $characters,
            'hasLlm'     => $hasLlm,
            'campaignContext' => $campaignContext,
        ]);
    }
}
