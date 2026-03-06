<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('characters', function (Blueprint $table) {
            $table->text('appearance_description')->nullable()->after('backstory');
            $table->string('portrait_generation_status')->default('idle')->after('portrait_path');
        });
    }

    public function down(): void
    {
        Schema::table('characters', function (Blueprint $table) {
            $table->dropColumn(['appearance_description', 'portrait_generation_status']);
        });
    }
};
