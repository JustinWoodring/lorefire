<?php

namespace App\Http\Controllers;

use App\Models\Character;
use App\Models\InventorySnapshot;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class InventorySnapshotController extends Controller
{
    public function store(Request $request, Character $character): RedirectResponse
    {
        $data = $request->validate([
            'label'           => 'required|string|max:255',
            'snapshot_type'   => 'in:manual,session',
            'game_session_id' => 'nullable|integer|exists:game_sessions,id',
        ]);

        // Capture current inventory as a plain array
        $items = $character->inventoryItems()
            ->get()
            ->map(fn ($item) => $item->toArray())
            ->values()
            ->all();

        $character->inventorySnapshots()->create([
            'label'           => $data['label'],
            'snapshot_type'   => $data['snapshot_type'] ?? 'manual',
            'game_session_id' => $data['game_session_id'] ?? null,
            'items'           => $items,
        ]);

        return back()->with('success', 'Snapshot saved.');
    }

    public function destroy(Character $character, InventorySnapshot $snapshot): RedirectResponse
    {
        abort_if($snapshot->character_id !== $character->id, 403);

        $snapshot->delete();

        return back()->with('success', 'Snapshot deleted.');
    }
}
