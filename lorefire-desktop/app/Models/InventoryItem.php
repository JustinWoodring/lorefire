<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryItem extends Model
{
    protected $fillable = [
        'character_id',
        'name',
        'category',
        'quantity',
        'weight',
        'value_cp',
        'equipped',
        'attuned',
        'is_magical',
        'requires_attunement',
        'description',
        'properties',
    ];

    protected $casts = [
        'equipped' => 'boolean',
        'attuned' => 'boolean',
        'is_magical' => 'boolean',
        'requires_attunement' => 'boolean',
        'properties' => 'array',
        'weight' => 'decimal:2',
    ];

    public function character(): BelongsTo
    {
        return $this->belongsTo(Character::class);
    }
}
