<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Models\Character;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;

class DndBeyondImportController extends Controller
{
    /**
     * Import a character from a D&D Beyond shareable JSON URL.
     * The URL pattern is: https://www.dndbeyond.com/profile/{username}/characters/{id}
     * We use the unofficial character JSON endpoint: /character/{id}/json
     */
    public function import(Request $request, Campaign $campaign, Character $character): RedirectResponse
    {
        return $this->doImport($request, $character);
    }

    /**
     * Standalone import — no campaign route binding required.
     */
    public function importStandalone(Request $request, Character $character): RedirectResponse
    {
        return $this->doImport($request, $character);
    }

    protected function doImport(Request $request, Character $character): RedirectResponse
    {
        $request->validate([
            'dnd_beyond_url' => 'required|url',
        ]);

        $url = $request->input('dnd_beyond_url');

        // Extract character ID from URL
        if (! preg_match('/\/characters\/(\d+)/', $url, $matches)) {
            return back()->withErrors(['dnd_beyond_url' => 'Could not extract character ID from URL.']);
        }

        $characterId = $matches[1];
        $jsonUrl = "https://www.dndbeyond.com/character/{$characterId}/json";

        try {
            $response = \Illuminate\Support\Facades\Http::timeout(10)
                ->withHeaders(['User-Agent' => 'Lorefire/1.0'])
                ->get($jsonUrl);

            if (! $response->successful()) {
                return back()->withErrors(['dnd_beyond_url' => 'Failed to fetch character data. The character may be private.']);
            }

            $data = $response->json();
            $this->applyImportedData($character, $data, $url);

            return back()->with('success', 'Character imported from D&D Beyond.');
        } catch (\Exception $e) {
            return back()->withErrors(['dnd_beyond_url' => 'Import failed: ' . $e->getMessage()]);
        }
    }

    protected function applyImportedData(Character $character, array $data, string $url): void
    {
        // D&D Beyond JSON structure (unofficial, best-effort)
        $stats = collect($data['stats'] ?? [])->keyBy('id');
        // Ability score IDs: 1=STR, 2=DEX, 3=CON, 4=INT, 5=WIS, 6=CHA
        $abilityMap = [1 => 'strength', 2 => 'dexterity', 3 => 'constitution', 4 => 'intelligence', 5 => 'wisdom', 6 => 'charisma'];

        $updates = [
            'dnd_beyond_url' => $url,
            'imported_data'  => $data,
            'name'           => $data['name'] ?? $character->name,
        ];

        foreach ($abilityMap as $id => $field) {
            if (isset($stats[$id])) {
                $updates[$field] = ($stats[$id]['value'] ?? 10) + ($data['bonusStats'][$id - 1]['value'] ?? 0);
            }
        }

        // Classes
        $classes = $data['classes'] ?? [];
        if (! empty($classes)) {
            $primary = $classes[0];
            $updates['class'] = $primary['definition']['name'] ?? $character->class;
            $updates['subclass'] = $primary['subclassDefinition']['name'] ?? null;
            $updates['level'] = array_sum(array_column($classes, 'level'));
        }

        // Race
        $updates['race'] = $data['race']['fullName'] ?? $data['race']['baseName'] ?? $character->race;

        // HP
        $updates['max_hp'] = ($data['baseHitPoints'] ?? 0) + ($data['bonusHitPoints'] ?? 0);
        $updates['current_hp'] = $updates['max_hp'] - ($data['removedHitPoints'] ?? 0);
        $updates['temp_hp'] = $data['temporaryHitPoints'] ?? 0;

        $character->update($updates);
    }
}
