<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EncounterTurn extends Model
{
    protected $fillable = [
        'encounter_id',
        'round_number',
        'turn_order',
        'actor_name',
        'actor_type',
        'action_description',
        'action_type',
        'damage_dealt',
        'healing_done',
        'target_name',
        'is_critical',
        'transcript_second',
    ];

    protected $casts = [
        'is_critical' => 'boolean',
    ];

    public function encounter(): BelongsTo
    {
        return $this->belongsTo(Encounter::class);
    }
}
