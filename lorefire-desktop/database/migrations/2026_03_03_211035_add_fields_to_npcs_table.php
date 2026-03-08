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
        Schema::table('npcs', function (Blueprint $table) {
            $table->string('last_seen')->nullable()->after('location');           // e.g. "Session 4 - Waterdeep"
            $table->json('tags')->nullable()->after('last_seen');                 // ["villain","merchant","ally"]
            $table->string('voice_description')->nullable()->after('tags');       // quick DM reference
            $table->json('stat_block')->nullable()->after('voice_description');   // optional combat stats JSON
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('npcs', function (Blueprint $table) {
            $table->dropColumn(['last_seen', 'tags', 'voice_description', 'stat_block']);
        });
    }
};
