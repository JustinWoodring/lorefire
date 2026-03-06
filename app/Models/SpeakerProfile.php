<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SpeakerProfile extends Model
{
    protected $fillable = [
        'campaign_id',
        'game_session_id',
        'speaker_label',
        'display_name',
        'character_id',
        'is_dm',
    ];

    protected $casts = [
        'is_dm' => 'boolean',
    ];

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function gameSession(): BelongsTo
    {
        return $this->belongsTo(GameSession::class);
    }

    public function character(): BelongsTo
    {
        return $this->belongsTo(Character::class);
    }
}
