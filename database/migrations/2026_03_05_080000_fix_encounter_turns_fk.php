<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('PRAGMA foreign_keys = OFF');

        DB::transaction(function () {
            DB::statement('ALTER TABLE "encounter_turns" RENAME TO "encounter_turns_old"');
            DB::statement('
                CREATE TABLE "encounter_turns" (
                    "id" integer primary key autoincrement not null,
                    "encounter_id" integer not null,
                    "round_number" integer not null,
                    "turn_order" integer not null,
                    "actor_name" varchar not null,
                    "actor_type" varchar not null default \'character\',
                    "action_description" text,
                    "action_type" varchar,
                    "damage_dealt" integer,
                    "healing_done" integer,
                    "target_name" varchar,
                    "is_critical" tinyint(1) not null default \'0\',
                    "transcript_second" integer,
                    "created_at" datetime,
                    "updated_at" datetime,
                    foreign key("encounter_id") references "encounters"("id") on delete cascade
                )
            ');
            DB::statement('INSERT INTO "encounter_turns" SELECT * FROM "encounter_turns_old"');
            DB::statement('DROP TABLE "encounter_turns_old"');
        });

        DB::statement('PRAGMA foreign_keys = ON');
    }

    public function down(): void
    {
        throw new \RuntimeException('This migration cannot be reversed.');
    }
};
