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
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('character_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('category')->nullable(); // weapon, armor, adventuring gear, etc.
            $table->unsignedSmallInteger('quantity')->default(1);
            $table->decimal('weight', 6, 2)->default(0);
            $table->unsignedInteger('value_cp')->default(0); // value in copper pieces
            $table->boolean('equipped')->default(false);
            $table->boolean('attuned')->default(false);
            $table->boolean('is_magical')->default(false);
            $table->boolean('requires_attunement')->default(false);
            $table->text('description')->nullable();
            $table->json('properties')->nullable(); // weapon properties: finesse, thrown, etc.
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_items');
    }
};
