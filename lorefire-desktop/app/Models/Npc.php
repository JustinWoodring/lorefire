<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Npc extends Model
{
    protected $fillable = [
        'campaign_id',
        'name',
        'race',
        'role',
        'location',
        'last_seen',
        'tags',
        'voice_description',
        'stat_block',
        'attitude',
        'description',
        'notes',
        'portrait_path',
        'is_alive',
    ];

    protected $casts = [
        'is_alive'   => 'boolean',
        'tags'       => 'array',
        'stat_block' => 'array',
    ];

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }
}
