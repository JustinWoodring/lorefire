<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('game_sessions', function (Blueprint $table) {
            // Concise factual record-keeping summary (bullet-point style, searchable)
            $table->text('session_notes')->nullable()->after('summary');
            // Track whether AI generation is in progress so the frontend can poll
            $table->enum('summary_status', ['idle', 'generating', 'done', 'failed'])->default('idle')->after('session_notes');
        });
    }

    public function down(): void
    {
        Schema::table('game_sessions', function (Blueprint $table) {
            $table->dropColumn(['session_notes', 'summary_status']);
        });
    }
};
