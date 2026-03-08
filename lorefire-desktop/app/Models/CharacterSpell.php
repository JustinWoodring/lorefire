<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CharacterSpell extends Model
{
    protected $fillable = [
        'character_id',
        'name',
        'level',
        'school',
        'casting_time',
        'range',
        'components',
        'duration',
        'concentration',
        'ritual',
        'description',
        'is_prepared',
    ];

    protected $casts = [
        'concentration' => 'boolean',
        'ritual' => 'boolean',
        'is_prepared' => 'boolean',
    ];

    public function character(): BelongsTo
    {
        return $this->belongsTo(Character::class);
    }
}
