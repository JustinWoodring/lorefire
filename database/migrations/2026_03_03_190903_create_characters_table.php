<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('characters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('player_name')->nullable();
            $table->string('race');
            $table->string('subrace')->nullable();
            $table->string('class');
            $table->string('subclass')->nullable();
            $table->unsignedTinyInteger('level')->default(1);
            $table->string('background')->nullable();
            $table->string('alignment')->nullable();
            $table->unsignedSmallInteger('experience_points')->default(0);
            // Ability scores
            $table->unsignedTinyInteger('strength')->default(10);
            $table->unsignedTinyInteger('dexterity')->default(10);
            $table->unsignedTinyInteger('constitution')->default(10);
            $table->unsignedTinyInteger('intelligence')->default(10);
            $table->unsignedTinyInteger('wisdom')->default(10);
            $table->unsignedTinyInteger('charisma')->default(10);
            // HP
            $table->unsignedSmallInteger('max_hp')->default(0);
            $table->unsignedSmallInteger('current_hp')->default(0);
            $table->unsignedSmallInteger('temp_hp')->default(0);
            // Combat
            $table->unsignedTinyInteger('armor_class')->default(10);
            $table->unsignedTinyInteger('initiative_bonus')->default(0);
            $table->unsignedTinyInteger('speed')->default(30);
            $table->unsignedTinyInteger('proficiency_bonus')->default(2);
            // Death saves
            $table->unsignedTinyInteger('death_save_successes')->default(0);
            $table->unsignedTinyInteger('death_save_failures')->default(0);
            // Saving throw proficiencies (JSON array of ability names)
            $table->json('saving_throw_proficiencies')->nullable();
            // Skill proficiencies (JSON array of skill names)
            $table->json('skill_proficiencies')->nullable();
            $table->json('skill_expertises')->nullable();
            // Currency
            $table->unsignedInteger('copper')->default(0);
            $table->unsignedInteger('silver')->default(0);
            $table->unsignedInteger('electrum')->default(0);
            $table->unsignedInteger('gold')->default(0);
            $table->unsignedInteger('platinum')->default(0);
            // Spell casting
            $table->string('spellcasting_ability')->nullable();
            $table->json('spell_slots')->nullable(); // {"1":4,"2":3,...}
            $table->json('spell_slots_used')->nullable();
            // Misc
            $table->text('personality_traits')->nullable();
            $table->text('ideals')->nullable();
            $table->text('bonds')->nullable();
            $table->text('flaws')->nullable();
            $table->text('backstory')->nullable();
            $table->string('portrait_path')->nullable();
            $table->string('dnd_beyond_url')->nullable();
            $table->json('imported_data')->nullable(); // raw import blob
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('characters');
    }
};
