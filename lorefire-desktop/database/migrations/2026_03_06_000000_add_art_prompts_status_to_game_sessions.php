<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
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
                    "transcription_status" varchar check ("transcription_status" in ('none', 'pending', 'processing', 'done', 'failed', 'cancelled')) not null default 'none',
                    "duration_seconds" integer,
                    "created_at" datetime,
                    "updated_at" datetime,
                    "key_events" text,
                    "next_session_notes" text,
                    "participant_character_ids" text,
                    "session_notes" text,
                    "summary_status" varchar check ("summary_status" in ('idle', 'generating', 'done', 'failed')) not null default 'idle',
                    "art_prompts_status" varchar check ("art_prompts_status" in ('idle', 'generating', 'done', 'failed')) not null default 'idle',
                    foreign key("campaign_id") references "campaigns"("id") on delete cascade
                )
            SQL);

            DB::statement('INSERT INTO "game_sessions" SELECT *, \'idle\' FROM "game_sessions_old"');
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

            DB::statement('INSERT INTO "game_sessions" SELECT "id","campaign_id","title","session_number","played_at","summary","dm_notes","audio_path","transcript_path","transcription_status","duration_seconds","created_at","updated_at","key_events","next_session_notes","participant_character_ids","session_notes","summary_status" FROM "game_sessions_old"');
            DB::statement('DROP TABLE "game_sessions_old"');
        });

        DB::statement('PRAGMA foreign_keys = ON');
    }
};
