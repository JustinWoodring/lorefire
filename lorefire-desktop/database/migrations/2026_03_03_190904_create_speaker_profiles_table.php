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
        Schema::create('speaker_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained()->cascadeOnDelete();
            $table->string('speaker_label'); // WhisperX speaker tag e.g. "SPEAKER_00"
            $table->string('display_name'); // "Justin", "DM", etc.
            $table->foreignId('character_id')->nullable()->constrained()->nullOnDelete();
            $table->boolean('is_dm')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('speaker_profiles');
    }
};
