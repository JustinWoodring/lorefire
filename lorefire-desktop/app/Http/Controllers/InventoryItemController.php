<?php

namespace App\Http\Controllers;

use App\Models\Character;
use App\Models\InventoryItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class InventoryItemController extends Controller
{
    public function store(Request $request, Character $character): RedirectResponse
    {
        $data = $request->validate([
            'name'                => 'required|string|max:255',
            'category'            => 'nullable|string|max:100',
            'quantity'            => 'integer|min:0',
            'weight'              => 'numeric|min:0',
            'value_cp'            => 'integer|min:0',
            'equipped'            => 'boolean',
            'attuned'             => 'boolean',
            'is_magical'          => 'boolean',
            'requires_attunement' => 'boolean',
            'description'         => 'nullable|string',
            'properties'          => 'nullable|array',
            'properties.*'        => 'string',
        ]);

        $character->inventoryItems()->create($data);

        return back()->with('success', 'Item added.');
    }

    public function update(Request $request, Character $character, InventoryItem $item): RedirectResponse
    {
        abort_if($item->character_id !== $character->id, 403);

        $data = $request->validate([
            'name'                => 'required|string|max:255',
            'category'            => 'nullable|string|max:100',
            'quantity'            => 'integer|min:0',
            'weight'              => 'numeric|min:0',
            'value_cp'            => 'integer|min:0',
            'equipped'            => 'boolean',
            'attuned'             => 'boolean',
            'is_magical'          => 'boolean',
            'requires_attunement' => 'boolean',
            'description'         => 'nullable|string',
            'properties'          => 'nullable|array',
            'properties.*'        => 'string',
        ]);

        $item->update($data);

        return back()->with('success', 'Item updated.');
    }

    public function destroy(Character $character, InventoryItem $item): RedirectResponse
    {
        abort_if($item->character_id !== $character->id, 403);

        $item->delete();

        return back()->with('success', 'Item removed.');
    }

    public function toggleEquipped(Character $character, InventoryItem $item): RedirectResponse
    {
        abort_if($item->character_id !== $character->id, 403);

        $item->update(['equipped' => ! $item->equipped]);

        return back()->with('success', $item->equipped ? 'Item equipped.' : 'Item unequipped.');
    }

    public function toggleAttuned(Character $character, InventoryItem $item): RedirectResponse
    {
        abort_if($item->character_id !== $character->id, 403);

        $item->update(['attuned' => ! $item->attuned]);

        return back()->with('success', $item->attuned ? 'Item attuned.' : 'Attunement removed.');
    }
}
