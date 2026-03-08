<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Campaign extends Model
{
    protected $fillable = [
        'name',
        'dm_name',
        'description',
        'setting',
        'notes',
        'art_style',
        'party_image_path',
        'party_image_generation_status',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function characters(): HasMany
    {
        return $this->hasMany(Character::class);
    }

    public function npcs(): HasMany
    {
        return $this->hasMany(Npc::class);
    }

    public function gameSessions(): HasMany
    {
        return $this->hasMany(GameSession::class);
    }

    public function speakerProfiles(): HasMany
    {
        return $this->hasMany(SpeakerProfile::class);
    }
}
