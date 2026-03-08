<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('speaker_profiles', function (Blueprint $table) {
            $table->foreignId('game_session_id')
                ->nullable()
                ->after('campaign_id')
                ->constrained('game_sessions')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('speaker_profiles', function (Blueprint $table) {
            $table->dropForeign(['game_session_id']);
            $table->dropColumn('game_session_id');
        });
    }
};
