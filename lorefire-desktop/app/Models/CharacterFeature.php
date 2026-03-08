<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CharacterFeature extends Model
{
    protected $fillable = [
        'character_id',
        'name',
        'source',
        'level_gained',
        'description',
        'has_uses',
        'max_uses',
        'uses_remaining',
        'recharge_on',
    ];

    protected $casts = [
        'has_uses' => 'boolean',
    ];

    public function character(): BelongsTo
    {
        return $this->belongsTo(Character::class);
    }
}
