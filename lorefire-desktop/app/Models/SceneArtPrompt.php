<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SceneArtPrompt extends Model
{
    protected $fillable = [
        'game_session_id',
        'scene_title',
        'scene_description',
        'prompt',
        'negative_prompt',
        'art_style',
        'character_refs',
        'transcript_second',
        'status',
        'image_path',
    ];

    protected $casts = [
        'character_refs' => 'array',
    ];

    public function gameSession(): BelongsTo
    {
        return $this->belongsTo(GameSession::class);
    }
}
