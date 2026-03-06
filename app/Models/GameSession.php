<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GameSession extends Model
{
    protected $table = 'game_sessions';

    protected $fillable = [
        'campaign_id',
        'title',
        'session_number',
        'played_at',
        'summary',
        'session_notes',
        'summary_status',
        'dm_notes',
        'key_events',
        'next_session_notes',
        'participant_character_ids',
        'audio_path',
        'transcript_path',
        'transcription_status',
        'duration_seconds',
        'art_prompts_status',
        'extraction_status',
    ];

    protected $casts = [
        'played_at'                 => 'date',
        'participant_character_ids' => 'array',
    ];

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function encounters(): HasMany
    {
        return $this->hasMany(Encounter::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(SessionEvent::class);
    }

    public function sceneArtPrompts(): HasMany
    {
        return $this->hasMany(SceneArtPrompt::class);
    }

    public function speakerProfiles(): HasMany
    {
        return $this->hasMany(SpeakerProfile::class);
    }
}
