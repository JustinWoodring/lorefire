<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // SQLite does not support ALTER COLUMN to change a CHECK constraint.
        // We recreate game_sessions with the updated constraint using a
        // rename → create → copy → drop pattern inside a transaction.
        DB::statement('PRAGMA foreign_keys = OFF');

        DB::transaction(function () {
            // 1. Rename existing table
            DB::statement('ALTER TABLE "game_sessions" RENAME TO "game_sessions_old"');

            // 2. Create new table with updated CHECK (added 'cancelled')
            DB::statement(<<<'SQL'
                CREATE TABLE "game_sessions" (
                    "id" integer primary key autoincrement not null,
                    "campaign_id" integer not null,
                    "title" varchar not null,
                    "session_number" integer,
                    "played_at" date,
                    "summary" text,
                    "dm_notes" text,
                    "audio_path" varchar,
                    "transcript_path" varchar,
                    "transcription_status" varchar check ("transcription_status" in ('none', 'pending', 'processing', 'done', 'failed', 'cancelled')) not null default 'none',
                    "duration_seconds" integer,
                    "created_at" datetime,
                    "updated_at" datetime,
                    "key_events" text,
                    "next_session_notes" text,
                    "participant_character_ids" text,
                    "session_notes" text,
                    "summary_status" varchar check ("summary_status" in ('idle', 'generating', 'done', 'failed')) not null default 'idle',
                    foreign key("campaign_id") references "campaigns"("id") on delete cascade
                )
            SQL);

            // 3. Copy all rows
            DB::statement('INSERT INTO "game_sessions" SELECT * FROM "game_sessions_old"');

            // 4. Drop old table
            DB::statement('DROP TABLE "game_sessions_old"');
        });

        DB::statement('PRAGMA foreign_keys = ON');
    }

    public function down(): void
    {
        DB::statement('PRAGMA foreign_keys = OFF');

        DB::transaction(function () {
            DB::statement('ALTER TABLE "game_sessions" RENAME TO "game_sessions_old"');

            DB::statement(<<<'SQL'
                CREATE TABLE "game_sessions" (
                    "id" integer primary key autoincrement not null,
                    "campaign_id" integer not null,
                    "title" varchar not null,
                    "session_number" integer,
                    "played_at" date,
                    "summary" text,
                    "dm_notes" text,
                    "audio_path" varchar,
                    "transcript_path" varchar,
                    "transcription_status" varchar check ("transcription_status" in ('none', 'pending', 'processing', 'done', 'failed')) not null default 'none',
                    "duration_seconds" integer,
                    "created_at" datetime,
                    "updated_at" datetime,
                    "key_events" text,
                    "next_session_notes" text,
                    "participant_character_ids" text,
                    "session_notes" text,
                    "summary_status" varchar check ("summary_status" in ('idle', 'generating', 'done', 'failed')) not null default 'idle',
                    foreign key("campaign_id") references "campaigns"("id") on delete cascade
                )
            SQL);

            DB::statement('INSERT INTO "game_sessions" SELECT * FROM "game_sessions_old"');
            DB::statement('DROP TABLE "game_sessions_old"');
        });

        DB::statement('PRAGMA foreign_keys = ON');
    }
};
