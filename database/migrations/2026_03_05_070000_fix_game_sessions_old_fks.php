<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('PRAGMA foreign_keys = OFF');

        DB::transaction(function () {
            // ---------------------------------------------------------------
            // encounters
            // ---------------------------------------------------------------
            DB::statement('ALTER TABLE "encounters" RENAME TO "encounters_old"');
            DB::statement('
                CREATE TABLE "encounters" (
                    "id" integer primary key autoincrement not null,
                    "game_session_id" integer not null,
                    "name" varchar,
                    "round_count" integer not null default \'0\',
                    "status" varchar check ("status" in (\'auto_detected\', \'confirmed\', \'dismissed\')) not null default \'auto_detected\',
                    "transcript_start_second" integer,
                    "transcript_end_second" integer,
                    "summary" text,
                    "created_at" datetime,
                    "updated_at" datetime,
                    foreign key("game_session_id") references "game_sessions"("id") on delete cascade
                )
            ');
            DB::statement('INSERT INTO "encounters" SELECT * FROM "encounters_old"');
            DB::statement('DROP TABLE "encounters_old"');

            // ---------------------------------------------------------------
            // session_events
            // ---------------------------------------------------------------
            DB::statement('ALTER TABLE "session_events" RENAME TO "session_events_old"');
            DB::statement('
                CREATE TABLE "session_events" (
                    "id" integer primary key autoincrement not null,
                    "game_session_id" integer not null,
                    "type" varchar not null,
                    "title" varchar,
                    "body" text,
                    "transcript_second" integer,
                    "created_at" datetime,
                    "updated_at" datetime,
                    foreign key("game_session_id") references "game_sessions"("id") on delete cascade
                )
            ');
            DB::statement('INSERT INTO "session_events" SELECT * FROM "session_events_old"');
            DB::statement('DROP TABLE "session_events_old"');

            // ---------------------------------------------------------------
            // inventory_snapshots
            // ---------------------------------------------------------------
            DB::statement('ALTER TABLE "inventory_snapshots" RENAME TO "inventory_snapshots_old"');
            DB::statement('
                CREATE TABLE "inventory_snapshots" (
                    "id" integer primary key autoincrement not null,
                    "character_id" integer not null,
                    "game_session_id" integer,
                    "label" varchar not null,
                    "snapshot_type" varchar check ("snapshot_type" in (\'manual\', \'session\')) not null default \'manual\',
                    "items" text not null,
                    "created_at" datetime,
                    "updated_at" datetime,
                    foreign key("character_id") references "characters"("id") on delete cascade,
                    foreign key("game_session_id") references "game_sessions"("id") on delete set null
                )
            ');
            DB::statement('INSERT INTO "inventory_snapshots" SELECT * FROM "inventory_snapshots_old"');
            DB::statement('DROP TABLE "inventory_snapshots_old"');

            // ---------------------------------------------------------------
            // speaker_profiles
            // ---------------------------------------------------------------
            DB::statement('ALTER TABLE "speaker_profiles" RENAME TO "speaker_profiles_old"');
            DB::statement('
                CREATE TABLE "speaker_profiles" (
                    "id" integer primary key autoincrement not null,
                    "campaign_id" integer not null,
                    "speaker_label" varchar not null,
                    "display_name" varchar not null,
                    "character_id" integer,
                    "is_dm" tinyint(1) not null default (\'0\'),
                    "created_at" datetime,
                    "updated_at" datetime,
                    "game_session_id" integer,
                    foreign key("character_id") references "characters"("id") on delete set null on update no action,
                    foreign key("campaign_id") references "campaigns"("id") on delete cascade on update no action,
                    foreign key("game_session_id") references "game_sessions"("id") on delete cascade
                )
            ');
            DB::statement('INSERT INTO "speaker_profiles" SELECT * FROM "speaker_profiles_old"');
            DB::statement('DROP TABLE "speaker_profiles_old"');

            // ---------------------------------------------------------------
            // scene_art_prompts
            // ---------------------------------------------------------------
            DB::statement('ALTER TABLE "scene_art_prompts" RENAME TO "scene_art_prompts_old"');
            DB::statement('
                CREATE TABLE "scene_art_prompts" (
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
            DB::statement('INSERT INTO "scene_art_prompts" SELECT * FROM "scene_art_prompts_old"');
            DB::statement('DROP TABLE "scene_art_prompts_old"');
        });

        DB::statement('PRAGMA foreign_keys = ON');
    }

    public function down(): void
    {
        // Reversing this migration is not practical; it would require
        // re-introducing the broken game_sessions_old references.
        throw new \RuntimeException('This migration cannot be reversed.');
    }
};
