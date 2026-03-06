<?php

namespace App\Jobs;

use App\Models\AppSetting;
use App\Models\Encounter;
use App\Models\EncounterTurn;
use App\Models\GameSession;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Storage;

class AnalyzeCombat implements ShouldQueue
{
    use Queueable;

    // Keywords that signal combat start in transcripts
    protected array $combatStartKeywords = [
        'roll initiative', 'roll for initiative', 'initiative order',
        'combat begins', 'battle starts', 'initiative',
        'you enter combat', 'roll perception', 'surprised',
    ];

    // Keywords that signal combat actions
    protected array $actionKeywords = [
        'attacks', 'casts', 'uses', 'misses', 'hits', 'crits', 'critical hit',
        'deals', 'damage', 'heals', 'healing', 'bonus action', 'action',
        'saves', 'fails', 'succeeds', 'rolls', 'advantage', 'disadvantage',
    ];

    public function __construct(public GameSession $session) {}

    public function handle(): void
    {
        if (! $this->session->transcript_path) {
            return;
        }

        $raw = Storage::get($this->session->transcript_path);
        if (! $raw) {
            return;
        }

        $transcript = json_decode($raw, true);
        $segments = $transcript['segments'] ?? [];

        $encounters = $this->detectEncounters($segments);

        foreach ($encounters as $encounterData) {
            $encounter = Encounter::create([
                'game_session_id'        => $this->session->id,
                'name'                   => $encounterData['name'],
                'round_count'            => $encounterData['round_count'],
                'status'                 => 'auto_detected',
                'transcript_start_second' => $encounterData['start_second'],
                'transcript_end_second'   => $encounterData['end_second'],
            ]);

            foreach ($encounterData['turns'] as $turnData) {
                EncounterTurn::create([
                    'encounter_id'       => $encounter->id,
                    'round_number'       => $turnData['round'],
                    'turn_order'         => $turnData['order'],
                    'actor_name'         => $turnData['actor'],
                    'actor_type'         => 'character',
                    'action_description' => $turnData['text'],
                    'transcript_second'  => $turnData['second'],
                ]);
            }
        }
    }

    protected function detectEncounters(array $segments): array
    {
        $encounters = [];
        $inCombat = false;
        $currentEncounter = null;
        $round = 1;
        $order = 1;

        foreach ($segments as $segment) {
            $text = strtolower($segment['text'] ?? '');
            $second = (int) ($segment['start'] ?? 0);
            $speaker = $segment['speaker'] ?? 'Unknown';

            // Detect combat start
            foreach ($this->combatStartKeywords as $keyword) {
                if (str_contains($text, $keyword) && ! $inCombat) {
                    $inCombat = true;
                    $currentEncounter = [
                        'name'         => 'Encounter ' . (count($encounters) + 1),
                        'start_second' => $second,
                        'end_second'   => $second,
                        'round_count'  => 1,
                        'turns'        => [],
                    ];
                    $round = 1;
                    $order = 1;
                    break;
                }
            }

            // Track rounds
            if ($inCombat && (str_contains($text, 'round') || str_contains($text, 'next round'))) {
                $round++;
                $order = 1;
                if ($currentEncounter) {
                    $currentEncounter['round_count'] = max($currentEncounter['round_count'], $round);
                }
            }

            // Detect combat actions
            if ($inCombat && $currentEncounter) {
                foreach ($this->actionKeywords as $keyword) {
                    if (str_contains($text, $keyword)) {
                        $currentEncounter['turns'][] = [
                            'round'  => $round,
                            'order'  => $order++,
                            'actor'  => $speaker,
                            'text'   => trim($segment['text'] ?? ''),
                            'second' => $second,
                        ];
                        $currentEncounter['end_second'] = $second;
                        break;
                    }
                }

                // Detect combat end
                if (str_contains($text, 'combat ends') || str_contains($text, 'battle is over')
                    || str_contains($text, 'enemies are dead') || str_contains($text, 'you win')) {
                    $encounters[] = $currentEncounter;
                    $inCombat = false;
                    $currentEncounter = null;
                }
            }
        }

        // Close any open encounter
        if ($inCombat && $currentEncounter) {
            $encounters[] = $currentEncounter;
        }

        return $encounters;
    }
}
