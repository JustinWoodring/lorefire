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
        Schema::create('npcs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('race')->nullable();
            $table->string('role')->nullable(); // merchant, villain, quest giver, etc.
            $table->string('location')->nullable();
            $table->string('attitude')->nullable(); // friendly, neutral, hostile
            $table->text('description')->nullable();
            $table->text('notes')->nullable();
            $table->string('portrait_path')->nullable();
            $table->boolean('is_alive')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('npcs');
    }
};
