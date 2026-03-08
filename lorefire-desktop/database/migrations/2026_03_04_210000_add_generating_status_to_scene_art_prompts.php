<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // SQLite does not support ALTER COLUMN or dropping CHECK constraints.
        // Recreate the table with the updated constraint.
        DB::statement('PRAGMA foreign_keys = OFF');

        DB::statement('
            CREATE TABLE "scene_art_prompts_new" (
                "id" integer primary key autoincrement not null,
                "game_session_id" integer not null,
                "scene_title" varchar,
                "scene_description" text,
                "prompt" text,
                "negative_prompt" text,
                "art_style" varchar check ("art_style" in (\'comic\', \'lifelike\')) not null default \'lifelike\',
                "character_refs" text,
                "transcript_second" integer,
                "status" varchar check ("status" in (\'pending\', \'generating\', \'generated\', \'image_ready\')) not null default \'pending\',
                "image_path" varchar,
                "created_at" datetime,
                "updated_at" datetime,
                foreign key("game_session_id") references "game_sessions"("id") on delete cascade
            )
        ');

        DB::statement('INSERT INTO "scene_art_prompts_new" SELECT * FROM "scene_art_prompts"');
        DB::statement('DROP TABLE "scene_art_prompts"');
        DB::statement('ALTER TABLE "scene_art_prompts_new" RENAME TO "scene_art_prompts"');

        DB::statement('PRAGMA foreign_keys = ON');
    }

    public function down(): void
    {
        DB::statement('PRAGMA foreign_keys = OFF');

        DB::statement('
            CREATE TABLE "scene_art_prompts_new" (
                "id" integer primary key autoincrement not null,
                "game_session_id" integer not null,
                "scene_title" varchar,
                "scene_description" text,
                "prompt" text,
                "negative_prompt" text,
                "art_style" varchar check ("art_style" in (\'comic\', \'lifelike\')) not null default \'lifelike\',
                "character_refs" text,
                "transcript_second" integer,
                "status" varchar check ("status" in (\'pending\', \'generated\', \'image_ready\')) not null default \'pending\',
                "image_path" varchar,
                "created_at" datetime,
                "updated_at" datetime,
                foreign key("game_session_id") references "game_sessions"("id") on delete cascade
            )
        ');

        DB::statement('INSERT INTO "scene_art_prompts_new" SELECT * FROM "scene_art_prompts"');
        DB::statement('DROP TABLE "scene_art_prompts"');
        DB::statement('ALTER TABLE "scene_art_prompts_new" RENAME TO "scene_art_prompts"');

        DB::statement('PRAGMA foreign_keys = ON');
    }
};
