<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Encounter extends Model
{
    protected $fillable = [
        'game_session_id',
        'name',
        'round_count',
        'status',
        'transcript_start_second',
        'transcript_end_second',
        'summary',
    ];

    public function gameSession(): BelongsTo
    {
        return $this->belongsTo(GameSession::class);
    }

    public function turns(): HasMany
    {
        return $this->hasMany(EncounterTurn::class);
    }
}
