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
        Schema::create('game_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->unsignedSmallInteger('session_number')->nullable();
            $table->date('played_at')->nullable();
            $table->text('summary')->nullable(); // AI-generated bardic prose
            $table->text('dm_notes')->nullable();
            $table->string('audio_path')->nullable(); // recorded audio file
            $table->string('transcript_path')->nullable(); // raw WhisperX JSON
            $table->enum('transcription_status', ['none', 'pending', 'processing', 'done', 'failed'])->default('none');
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('game_sessions');
    }
};
