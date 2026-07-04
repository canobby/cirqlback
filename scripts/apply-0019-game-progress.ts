// Idempotent apply of migration 0019 (game_progress table for CIRQL).
//   npx tsx scripts/apply-0019-game-progress.ts
import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set.");

const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "game_progress" (
    "user_id" varchar PRIMARY KEY,
    "world_index" integer NOT NULL DEFAULT 0,
    "worlds_restored" integer NOT NULL DEFAULT 0,
    "player_seed" integer NOT NULL DEFAULT 0,
    "state" jsonb,
    "updated_at" timestamp DEFAULT now()
  );`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'game_progress_user_id_users_id_fk') THEN
      ALTER TABLE "game_progress" ADD CONSTRAINT "game_progress_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
  END $$;`,
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    for (const stmt of STATEMENTS) await pool.query(stmt);
    const { rows } = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_name='game_progress';`,
    );
    console.log("Applied. game_progress present:", rows.length === 1);
  } finally {
    await pool.end();
  }
}

main().catch((err) => { console.error("Apply 0019 failed:", err); process.exit(1); });
