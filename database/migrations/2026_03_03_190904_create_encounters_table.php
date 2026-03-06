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
        Schema::create('encounters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_session_id')->constrained('game_sessions')->cascadeOnDelete();
            $table->string('name')->nullable(); // e.g. "Battle of the Rotting Bridge"
            $table->unsignedSmallInteger('round_count')->default(0);
            $table->enum('status', ['auto_detected', 'confirmed', 'dismissed'])->default('auto_detected');
            $table->unsignedInteger('transcript_start_second')->nullable();
            $table->unsignedInteger('transcript_end_second')->nullable();
            $table->text('summary')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('encounters');
    }
};
