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
        Schema::create('encounter_turns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('encounter_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('round_number');
            $table->unsignedTinyInteger('turn_order');
            $table->string('actor_name'); // character or NPC name
            $table->string('actor_type')->default('character'); // character, npc, monster
            $table->text('action_description')->nullable();
            $table->string('action_type')->nullable(); // attack, spell, dash, help, etc.
            $table->unsignedSmallInteger('damage_dealt')->nullable();
            $table->unsignedSmallInteger('healing_done')->nullable();
            $table->string('target_name')->nullable();
            $table->boolean('is_critical')->default(false);
            $table->unsignedInteger('transcript_second')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('encounter_turns');
    }
};
