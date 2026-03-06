<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Character extends Model
{
    protected $fillable = [
        'campaign_id',
        'name',
        'player_name',
        'race',
        'subrace',
        'class',
        'subclass',
        'level',
        'background',
        'alignment',
        'experience_points',
        'strength',
        'dexterity',
        'constitution',
        'intelligence',
        'wisdom',
        'charisma',
        'max_hp',
        'current_hp',
        'temp_hp',
        'armor_class',
        'initiative_bonus',
        'speed',
        'proficiency_bonus',
        'death_save_successes',
        'death_save_failures',
        'saving_throw_proficiencies',
        'skill_proficiencies',
        'skill_expertises',
        'copper',
        'silver',
        'electrum',
        'gold',
        'platinum',
        'spellcasting_ability',
        'spell_slots',
        'spell_slots_used',
        'personality_traits',
        'ideals',
        'bonds',
        'flaws',
        'backstory',
        'appearance_description',
        'portrait_path',
        'portrait_generation_status',
        'portrait_style',
        'dnd_beyond_url',
        'imported_data',
        'class_features',
    ];

    protected $casts = [
        'saving_throw_proficiencies' => 'array',
        'skill_proficiencies' => 'array',
        'skill_expertises' => 'array',
        'spell_slots' => 'array',
        'spell_slots_used' => 'array',
        'imported_data'    => 'array',
        'class_features'   => 'array',
    ];

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function spells(): HasMany
    {
        return $this->hasMany(CharacterSpell::class);
    }

    public function inventoryItems(): HasMany
    {
        return $this->hasMany(InventoryItem::class);
    }

    public function inventorySnapshots(): HasMany
    {
        return $this->hasMany(InventorySnapshot::class);
    }

    public function features(): HasMany
    {
        return $this->hasMany(CharacterFeature::class);
    }

    public function conditions(): HasMany
    {
        return $this->hasMany(CharacterCondition::class);
    }

    public function speakerProfiles(): HasMany
    {
        return $this->hasMany(SpeakerProfile::class);
    }

    public function getModifier(string $ability): int
    {
        return (int) floor(($this->{$ability} - 10) / 2);
    }

    public function getPassivePerception(): int
    {
        $wisdomMod = $this->getModifier('wisdom');
        $prof = in_array('perception', $this->skill_proficiencies ?? []) ? $this->proficiency_bonus : 0;
        $expert = in_array('perception', $this->skill_expertises ?? []) ? $this->proficiency_bonus : 0;
        return 10 + $wisdomMod + $prof + $expert;
    }
}
