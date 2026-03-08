<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Models\GameSession;
use App\Models\SpeakerProfile;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;

class SpeakerProfileController extends Controller
{
    /**
     * Store/update a speaker profile scoped to a specific session.
     * WhisperX assigns SPEAKER_00 per-session, so the same label means
     * different people across sessions — mappings must be session-scoped.
     */
    public function storeForSession(Request $request, GameSession $session): RedirectResponse
    {
        $data = $request->validate([
            'speaker_label' => 'required|string|max:100',
            'display_name'  => 'required|string|max:255',
            'character_id'  => 'nullable|exists:characters,id',
            'is_dm'         => 'boolean',
        ]);

        $session->speakerProfiles()->updateOrCreate(
            ['speaker_label' => $data['speaker_label']],
            array_merge($data, ['campaign_id' => $session->campaign_id]),
        );

        return back()->with('success', 'Speaker profile saved.');
    }

    public function update(Request $request, GameSession $session, SpeakerProfile $speaker): RedirectResponse
    {
        $data = $request->validate([
            'display_name' => 'required|string|max:255',
            'character_id' => 'nullable|exists:characters,id',
            'is_dm'        => 'boolean',
        ]);

        $speaker->update($data);

        return back()->with('success', 'Speaker updated.');
    }

    public function destroy(GameSession $session, SpeakerProfile $speaker): RedirectResponse
    {
        $speaker->delete();

        return back()->with('success', 'Speaker removed.');
    }

    /**
     * Delete ALL speaker profiles for a session so the user can re-assign from scratch.
     */
    public function reset(GameSession $session): RedirectResponse
    {
        $session->speakerProfiles()->delete();

        return back()->with('success', 'Speaker assignments cleared.');
    }

    // ── Legacy campaign-scoped store (kept for backwards compat) ──────────────

    public function store(Request $request, Campaign $campaign): RedirectResponse
    {
        $data = $request->validate([
            'speaker_label' => 'required|string|max:100',
            'display_name'  => 'required|string|max:255',
            'character_id'  => 'nullable|exists:characters,id',
            'is_dm'         => 'boolean',
        ]);

        $campaign->speakerProfiles()->updateOrCreate(
            ['speaker_label' => $data['speaker_label']],
            $data,
        );

        return back()->with('success', 'Speaker profile saved.');
    }
}
