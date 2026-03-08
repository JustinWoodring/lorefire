<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Models\GameSession;
use App\Models\AppSetting;
use App\Jobs\TranscribeAudio;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class GameSessionController extends Controller
{
    public function index(Campaign $campaign): Response
    {
        return Inertia::render('Sessions/Index', [
            'campaign' => $campaign,
            'sessions' => $campaign->gameSessions()->orderByDesc('played_at')->get(),
        ]);
    }

    public function create(Campaign $campaign): Response
    {
        $characters = $campaign->characters()->orderBy('name')->get(['id', 'name', 'class', 'level']);

        return Inertia::render('Sessions/Create', [
            'campaign'   => $campaign,
            'characters' => $characters,
        ]);
    }

    public function store(Request $request, Campaign $campaign): RedirectResponse
    {
        $data = $request->validate([
            'title'                    => 'required|string|max:255',
            'session_number'           => 'nullable|integer|min:1',
            'played_at'                => 'nullable|date',
            'dm_notes'                 => 'nullable|string',
            'key_events'               => 'nullable|string',
            'next_session_notes'       => 'nullable|string',
            'participant_character_ids' => 'nullable|array',
            'participant_character_ids.*' => 'integer|exists:characters,id',
        ]);

        $session = $campaign->gameSessions()->create($data);

        return redirect()->route('campaigns.sessions.show', [$campaign, $session]);
    }

    public function show(Campaign $campaign, GameSession $session): Response
    {
        $session->load(['encounters.turns', 'events', 'sceneArtPrompts']);

        $characters = $campaign->characters()->orderBy('name')->get(['id', 'name', 'class', 'level']);

        // Build speaker label → display name map from this session's speaker profiles
        $speakerProfiles = $session->speakerProfiles()->with('character')->get();
        $speakerMap = $speakerProfiles->keyBy('speaker_label')->map(fn ($p) => [
            'display_name' => $p->display_name,
            'is_dm'        => $p->is_dm,
        ]);

        // Load transcript segments if available, resolving raw speaker labels to display names
        $transcriptSegments = null;
        if ($session->transcript_path) {
            $raw = Storage::get($session->transcript_path);
            if ($raw) {
                $decoded = json_decode($raw, true);
                $segments = $decoded['segments'] ?? null;
                if ($segments) {
                    $transcriptSegments = array_map(function ($seg) use ($speakerMap) {
                        if (isset($seg['speaker'])) {
                            $profile = $speakerMap->get($seg['speaker']);
                            $seg['speaker_label'] = $seg['speaker']; // keep raw label
                            $seg['speaker']       = $profile ? $profile['display_name'] : $seg['speaker'];
                            $seg['speaker_is_dm'] = $profile ? $profile['is_dm'] : false;
                        }
                        return $seg;
                    }, $segments);
                }
            }
        }

        return Inertia::render('Sessions/Show', [
            'campaign'            => $campaign,
            'session'             => $session,
            'characters'          => $characters,
            'transcriptSegments'  => $transcriptSegments,
            'speakerProfiles'     => $speakerProfiles,
            'imageGenProvider'    => AppSetting::get('image_gen_provider', 'none'),
        ]);
    }

    public function edit(Campaign $campaign, GameSession $session): Response
    {
        $characters = $campaign->characters()->orderBy('name')->get(['id', 'name', 'class', 'level']);

        return Inertia::render('Sessions/Edit', [
            'campaign'   => $campaign,
            'session'    => $session,
            'characters' => $characters,
        ]);
    }

    public function update(Request $request, Campaign $campaign, GameSession $session): RedirectResponse
    {
        $data = $request->validate([
            'title'                    => 'required|string|max:255',
            'session_number'           => 'nullable|integer|min:1',
            'played_at'                => 'nullable|date',
            'dm_notes'                 => 'nullable|string',
            'key_events'               => 'nullable|string',
            'next_session_notes'       => 'nullable|string',
            'participant_character_ids' => 'nullable|array',
            'participant_character_ids.*' => 'integer|exists:characters,id',
            'summary'                  => 'nullable|string',
        ]);

        $session->update($data);

        return redirect()->route('campaigns.sessions.show', [$campaign, $session]);
    }

    public function destroy(Campaign $campaign, GameSession $session): RedirectResponse
    {
        if ($session->audio_path) {
            Storage::disk('local')->delete($session->audio_path);
        }
        if ($session->transcript_path) {
            Storage::disk('local')->delete($session->transcript_path);
        }
        $session->delete();

        return redirect()->route('campaigns.show', $campaign);
    }
}
