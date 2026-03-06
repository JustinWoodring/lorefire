<?php

namespace App\Http\Controllers;

use App\Models\Character;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Handles Short Rest and Long Rest actions on a character.
 * Resets the appropriate class resource pools stored in `class_features`
 * and also resets spell slots used (long rest only).
 */
class CharacterRestController extends Controller
{
    /**
     * Short Rest — resets per-short-rest resources:
     *   Barbarian: nothing (rages are long rest)
     *   Bard: Bardic Inspiration (if level < 5, otherwise short rest at 5+)
     *   Cleric: Channel Divinity
     *   Druid: Wild Shape
     *   Fighter: Action Surge, Second Wind
     *   Monk: Ki Points
     *   Paladin: Channel Divinity
     *   Warlock: Pact Magic Slots
     *   Wizard: (nothing short-rest specific here)
     */
    public function shortRest(Request $request, Character $character): RedirectResponse
    {
        $cf = $character->class_features ?? [];
        $class = $character->class;

        switch ($class) {
            case 'Bard':
                // Bardic Inspiration: recovers on short rest at level 5+ (Font of Inspiration)
                if ($character->level >= 5) {
                    $max = $cf['bardic_inspiration_max'] ?? max(1, (int) floor(($character->charisma - 10) / 2));
                    $cf['bardic_inspiration_current'] = $max;
                }
                break;

            case 'Cleric':
                $max = $cf['channel_divinity_max'] ?? ($character->level >= 18 ? 3 : ($character->level >= 6 ? 2 : 1));
                $cf['channel_divinity_used'] = 0;
                break;

            case 'Druid':
                $max = $cf['wild_shape_max'] ?? 2;
                $cf['wild_shape_current'] = $max;
                break;

            case 'Fighter':
                $cf['action_surge_used'] = 0;
                $cf['second_wind_used'] = 0;
                break;

            case 'Monk':
                $max = $cf['ki_points_max'] ?? $character->level;
                $cf['ki_points_current'] = $max;
                break;

            case 'Paladin':
                $cdMax = $character->level >= 6 ? 2 : 1;
                $cf['channel_divinity_used'] = 0;
                $cf['channel_divinity_max'] = $cf['channel_divinity_max'] ?? $cdMax;
                break;

            case 'Warlock':
                $slotCount = $character->level >= 11 ? 3 : ($character->level >= 2 ? 2 : 1);
                $max = $cf['pact_slots_max'] ?? $slotCount;
                $cf['pact_slots_current'] = $max;
                break;
        }

        $character->update(['class_features' => $cf]);

        return back()->with('success', 'Short rest taken.');
    }

    /**
     * Long Rest — resets everything a short rest does, plus:
     *   - Spell slots used (all classes)
     *   - Rage charges (Barbarian)
     *   - Bardic Inspiration (all levels)
     *   - Lay on Hands (Paladin)
     *   - Sorcery Points (Sorcerer)
     *   - Action Surge + Second Wind + Indomitable (Fighter)
     *   - Arcane Recovery (Wizard)
     *   - Wild Shape (Druid)
     *   - Ki Points (Monk)
     *   - HP fully restored
     *   - Death saves reset
     */
    public function longRest(Request $request, Character $character): RedirectResponse
    {
        $cf = $character->class_features ?? [];
        $class = $character->class;

        // Reset spell slots used for all spell-casters
        $character->spell_slots_used = null;

        // Per-class long rest resets
        switch ($class) {
            case 'Barbarian':
                $ragesMax = $character->level >= 20 ? 99
                    : ($character->level >= 17 ? 6
                    : ($character->level >= 12 ? 5
                    : ($character->level >= 6 ? 4
                    : ($character->level >= 3 ? 3 : 2))));
                $cf['rage_charges_max'] = $cf['rage_charges_max'] ?? $ragesMax;
                $cf['rage_charges_current'] = $cf['rage_charges_max'];
                $cf['is_raging'] = false;
                break;

            case 'Bard':
                $max = $cf['bardic_inspiration_max'] ?? max(1, (int) floor(($character->charisma - 10) / 2));
                $cf['bardic_inspiration_current'] = $max;
                $cf['song_of_rest_used'] = false;
                break;

            case 'Cleric':
                $cf['channel_divinity_used'] = 0;
                $cf['divine_intervention_used'] = false;
                break;

            case 'Druid':
                $cf['wild_shape_current'] = $cf['wild_shape_max'] ?? 2;
                $cf['is_wild_shaped'] = false;
                break;

            case 'Fighter':
                $cf['action_surge_used'] = 0;
                $cf['second_wind_used'] = 0;
                $indMax = $character->level >= 17 ? 3 : ($character->level >= 13 ? 2 : 1);
                if ($character->level >= 9) {
                    $cf['indomitable_remaining'] = $indMax;
                }
                break;

            case 'Monk':
                $max = $cf['ki_points_max'] ?? $character->level;
                $cf['ki_points_current'] = $max;
                $cf['empty_body_active'] = false;
                break;

            case 'Paladin':
                $layMax = $character->level * 5;
                $cf['lay_on_hands_max'] = $cf['lay_on_hands_max'] ?? $layMax;
                $cf['lay_on_hands_current'] = $cf['lay_on_hands_max'];
                $cf['channel_divinity_used'] = 0;
                $cf['cleansing_touch_used'] = false;
                break;

            case 'Sorcerer':
                $spMax = $character->level >= 20 ? 20 : $character->level * 2;
                $cf['sorcery_points_max'] = $cf['sorcery_points_max'] ?? $spMax;
                $cf['sorcery_points_current'] = $cf['sorcery_points_max'];
                break;

            case 'Warlock':
                $slotCount = $character->level >= 11 ? 3 : ($character->level >= 2 ? 2 : 1);
                $cf['pact_slots_current'] = $cf['pact_slots_max'] ?? $slotCount;
                // Mystic Arcanum resets on long rest
                $cf['mystic_arcanum_used'] = 0;
                break;

            case 'Wizard':
                $cf['arcane_recovery_used'] = false;
                break;

            case 'Artificer':
                $cf['flash_of_genius_ready'] = true;
                break;
        }

        // Restore HP and reset death saves
        $character->update([
            'current_hp'           => $character->max_hp,
            'death_save_successes' => 0,
            'death_save_failures'  => 0,
            'spell_slots_used'     => null,
            'class_features'       => $cf,
        ]);

        return back()->with('success', 'Long rest taken. HP and resources restored.');
    }
}
