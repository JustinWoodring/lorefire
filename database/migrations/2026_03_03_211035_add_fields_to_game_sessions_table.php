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
        Schema::table('game_sessions', function (Blueprint $table) {
            $table->text('key_events')->nullable()->after('dm_notes');            // bullet-point key events
            $table->text('next_session_notes')->nullable()->after('key_events');  // DM prep for next session
            $table->json('participant_character_ids')->nullable()->after('next_session_notes'); // [1,2,3]
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('game_sessions', function (Blueprint $table) {
            $table->dropColumn(['key_events', 'next_session_notes', 'participant_character_ids']);
        });
    }
};
