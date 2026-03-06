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
        Schema::create('scene_art_prompts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_session_id')->constrained('game_sessions')->cascadeOnDelete();
            $table->string('scene_title')->nullable();
            $table->text('scene_description')->nullable(); // extracted from transcript/summary
            $table->text('prompt')->nullable(); // generated FLUX/SD prompt
            $table->text('negative_prompt')->nullable();
            $table->enum('art_style', ['comic', 'lifelike'])->default('lifelike');
            $table->json('character_refs')->nullable(); // [{character_id, image_path}]
            $table->unsignedInteger('transcript_second')->nullable();
            $table->enum('status', ['pending', 'generated', 'image_ready'])->default('pending');
            $table->string('image_path')->nullable(); // deferred — populated when image gen lands
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('scene_art_prompts');
    }
};
