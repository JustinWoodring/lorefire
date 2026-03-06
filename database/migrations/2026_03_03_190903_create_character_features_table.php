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
        Schema::create('character_features', function (Blueprint $table) {
            $table->id();
            $table->foreignId('character_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('source')->nullable(); // class, race, background, feat
            $table->unsignedTinyInteger('level_gained')->nullable();
            $table->text('description')->nullable();
            $table->boolean('has_uses')->default(false);
            $table->unsignedTinyInteger('max_uses')->nullable();
            $table->unsignedTinyInteger('uses_remaining')->nullable();
            $table->string('recharge_on')->nullable(); // short rest, long rest, dawn
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('character_features');
    }
};
