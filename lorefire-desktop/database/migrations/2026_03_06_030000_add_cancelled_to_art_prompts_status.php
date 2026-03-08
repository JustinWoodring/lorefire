<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Add 'cancelled' to the art_prompts_status CHECK constraint on game_sessions.
 *
 * SQLite does not support ALTER COLUMN, so we rebuild game_sessions.
 * As per the established pattern, ALL child tables that FK-reference game_sessions
 * must also be rebuilt in the same transaction to avoid _old FK baking.
 *
 * Child tables rebuilt here: encounters, scene_art_prompts, session_events,
 * inventory_snapshots, speaker_profiles, encounter_turns (via encounters).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('PRAGMA foreign_keys = OFF');

        DB::transaction(function () {

            // ── game_sessions ─────────────────────────────────────────────
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
                    "art_prompts_status" varchar check ("art_prompts_status" in ('idle', 'generating', 'done', 'failed', 'cancelled')) not null default 'idle',
                    foreign key("campaign_id") references "campaigns"("id") on delete cascade
                )
            SQL);
            DB::statement('INSERT INTO "game_sessions" SELECT * FROM "game_sessions_old"');
            DB::statement('DROP TABLE "game_sessions_old"');

            // ── encounters ────────────────────────────────────────────────
            DB::statement('ALTER TABLE "encounters" RENAME TO "encounters_old"');
            DB::statement(<<<'SQL'
                CREATE TABLE "encounters" (
                    "id" integer primary key autoincrement not null,
                    "game_session_id" integer not null,
                    "name" varchar,
                    "round_count" integer not null default '0',
                    "status" varchar check ("status" in ('auto_detected', 'confirmed', 'dismissed')) not null default 'auto_detected',
                    "transcript_start_second" integer,
                    "transcript_end_second" integer,
                    "summary" text,
                    "created_at" datetime,
                    "updated_at" datetime,
                    foreign key("game_session_id") references "game_sessions"("id") on delete cascade
                )
            SQL);
            DB::statement('INSERT INTO "encounters" SELECT * FROM "encounters_old"');
            DB::statement('DROP TABLE "encounters_old"');

            // ── encounter_turns ───────────────────────────────────────────
            DB::statement('ALTER TABLE "encounter_turns" RENAME TO "encounter_turns_old"');
            DB::statement(<<<'SQL'
                CREATE TABLE "encounter_turns" (
                    "id" integer primary key autoincrement not null,
                    "encounter_id" integer not null,
                    "round_number" integer not null,
                    "turn_order" integer not null,
                    "actor_name" varchar not null,
                    "actor_type" varchar not null default 'character',
                    "action_description" text,
                    "action_type" varchar,
                    "damage_dealt" integer,
                    "healing_done" integer,
                    "target_name" varchar,
                    "is_critical" tinyint(1) not null default '0',
                    "transcript_second" integer,
                    "created_at" datetime,
                    "updated_at" datetime,
                    foreign key("encounter_id") references "encounters"("id") on delete cascade
                )
            SQL);
            DB::statement('INSERT INTO "encounter_turns" SELECT * FROM "encounter_turns_old"');
            DB::statement('DROP TABLE "encounter_turns_old"');

            // ── scene_art_prompts ─────────────────────────────────────────
            DB::statement('ALTER TABLE "scene_art_prompts" RENAME TO "scene_art_prompts_old"');
            DB::statement(<<<'SQL'
                CREATE TABLE "scene_art_prompts" (
                    "id" integer primary key autoincrement not null,
                    "game_session_id" integer not null,
                    "scene_title" varchar,
                    "scene_description" text,
                    "prompt" text,
                    "negative_prompt" text,
                    "art_style" varchar check ("art_style" in ('comic', 'lifelike')) not null default 'lifelike',
                    "character_refs" text,
                    "transcript_second" integer,
                    "status" varchar check ("status" in ('pending', 'generating', 'generated', 'image_ready')) not null default 'pending',
                    "image_path" varchar,
                    "created_at" datetime,
                    "updated_at" datetime,
                    foreign key("game_session_id") references "game_sessions"("id") on delete cascade
                )
            SQL);
            DB::statement('INSERT INTO "scene_art_prompts" SELECT * FROM "scene_art_prompts_old"');
            DB::statement('DROP TABLE "scene_art_prompts_old"');

            // ── session_events ────────────────────────────────────────────
            DB::statement('ALTER TABLE "session_events" RENAME TO "session_events_old"');
            DB::statement(<<<'SQL'
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
            SQL);
            DB::statement('INSERT INTO "session_events" SELECT * FROM "session_events_old"');
            DB::statement('DROP TABLE "session_events_old"');

            // ── inventory_snapshots ───────────────────────────────────────
            DB::statement('ALTER TABLE "inventory_snapshots" RENAME TO "inventory_snapshots_old"');
            DB::statement(<<<'SQL'
                CREATE TABLE "inventory_snapshots" (
                    "id" integer primary key autoincrement not null,
                    "character_id" integer not null,
                    "game_session_id" integer,
                    "label" varchar not null,
                    "snapshot_type" varchar check ("snapshot_type" in ('manual', 'session')) not null default 'manual',
                    "items" text not null,
                    "created_at" datetime,
                    "updated_at" datetime,
                    foreign key("character_id") references "characters"("id") on delete cascade,
                    foreign key("game_session_id") references "game_sessions"("id") on delete set null
                )
            SQL);
            DB::statement('INSERT INTO "inventory_snapshots" SELECT * FROM "inventory_snapshots_old"');
            DB::statement('DROP TABLE "inventory_snapshots_old"');

            // ── speaker_profiles ──────────────────────────────────────────
            DB::statement('ALTER TABLE "speaker_profiles" RENAME TO "speaker_profiles_old"');
            DB::statement(<<<'SQL'
                CREATE TABLE "speaker_profiles" (
                    "id" integer primary key autoincrement not null,
                    "campaign_id" integer not null,
                    "speaker_label" varchar not null,
                    "display_name" varchar not null,
                    "character_id" integer,
                    "is_dm" tinyint(1) not null default ('0'),
                    "created_at" datetime,
                    "updated_at" datetime,
                    "game_session_id" integer,
                    foreign key("character_id") references "characters"("id") on delete set null on update no action,
                    foreign key("campaign_id") references "campaigns"("id") on delete cascade on update no action,
                    foreign key("game_session_id") references "game_sessions"("id") on delete cascade
                )
            SQL);
            DB::statement('INSERT INTO "speaker_profiles" SELECT * FROM "speaker_profiles_old"');
            DB::statement('DROP TABLE "speaker_profiles_old"');

        });

        DB::statement('PRAGMA foreign_keys = ON');
    }

    public function down(): void
    {
        // No meaningful rollback — data is preserved, only CHECK constraint changes
    }
};
