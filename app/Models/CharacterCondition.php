<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CharacterCondition extends Model
{
    protected $fillable = [
        'character_id',
        'condition',
        'exhaustion_level',
        'notes',
    ];

    public function character(): BelongsTo
    {
        return $this->belongsTo(Character::class);
    }
}
