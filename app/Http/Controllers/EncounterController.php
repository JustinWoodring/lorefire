<?php

namespace App\Http\Controllers;

use App\Models\Encounter;
use App\Models\GameSession;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class EncounterController extends Controller
{
    public function index(Request $request): Response
    {
        // Optionally filter by session via query param ?session_id=X
        $query = Encounter::with(['turns', 'gameSession.campaign']);

        if ($request->filled('session_id')) {
            $query->where('game_session_id', $request->integer('session_id'));
        }

        $encounters = $query->latest()->get();

        return Inertia::render('Encounters/Index', [
            'encounters' => $encounters,
        ]);
    }

    public function show(Encounter $encounter): Response
    {
        $encounter->load('turns');
        $session = $encounter->gameSession()->with('campaign')->first();

        return Inertia::render('Encounters/Show', [
            'campaign'  => $session->campaign,
            'session'   => $session,
            'encounter' => $encounter,
        ]);
    }

    public function update(Request $request, Encounter $encounter): RedirectResponse
    {
        $data = $request->validate([
            'name'    => 'nullable|string|max:255',
            'status'  => 'in:auto_detected,confirmed,dismissed',
            'summary' => 'nullable|string',
        ]);

        $encounter->update($data);

        return back();
    }

    public function destroy(Encounter $encounter): RedirectResponse
    {
        $session_id = $encounter->game_session_id;
        $encounter->delete();

        return back();
    }
}
