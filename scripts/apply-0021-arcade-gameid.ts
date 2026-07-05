// Idempotent apply of migration 0021 (CirqlArcade — key game_progress + daily_scores by game_id).
//
// Turns the single-game tables into per-game tables so several circular games can
// share one backend. Fully ADDITIVE: `game_id` defaults to 'cirqlbreak', so all
// existing rows backfill to the flagship and every current endpoint keeps working.
// The primary keys gain `game_id`; the old PKs are discovered dynamically (by
// contype) and dropped, then the composite PK is added — safe to run repeatedly.
//
//   npx tsx scripts/apply-0021-arcade-gameid.ts
import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set.");

const STATEMENTS: string[] = [
  // --- game_progress: add game_id, move PK to (user_id, game_id) ---
  `ALTER TABLE "game_progress" ADD COLUMN IF NOT EXISTS "game_id" varchar NOT NULL DEFAULT 'cirqlbreak';`,
  `DO $$
   DECLARE pk text;
   BEGIN
     -- drop whatever the current primary key is (single-column user_id)
     SELECT conname INTO pk FROM pg_constraint
       WHERE conrelid = '"game_progress"'::regclass AND contype = 'p';
     IF pk IS NOT NULL AND pk <> 'game_progress_user_id_game_id_pk' THEN
       EXECUTE format('ALTER TABLE "game_progress" DROP CONSTRAINT %I', pk);
     END IF;
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'game_progress_user_id_game_id_pk') THEN
       ALTER TABLE "game_progress" ADD CONSTRAINT "game_progress_user_id_game_id_pk"
         PRIMARY KEY ("user_id","game_id");
     END IF;
   END $$;`,

  // --- daily_scores: add game_id, move PK to (user_id, day, game_id) ---
  `ALTER TABLE "daily_scores" ADD COLUMN IF NOT EXISTS "game_id" varchar NOT NULL DEFAULT 'cirqlbreak';`,
  `DO $$
   DECLARE pk text;
   BEGIN
     SELECT conname INTO pk FROM pg_constraint
       WHERE conrelid = '"daily_scores"'::regclass AND contype = 'p';
     IF pk IS NOT NULL AND pk <> 'daily_scores_user_id_day_game_id_pk' THEN
       EXECUTE format('ALTER TABLE "daily_scores" DROP CONSTRAINT %I', pk);
     END IF;
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daily_scores_user_id_day_game_id_pk') THEN
       ALTER TABLE "daily_scores" ADD CONSTRAINT "daily_scores_user_id_day_game_id_pk"
         PRIMARY KEY ("user_id","day","game_id");
     END IF;
   END $$;`,
  // per-game daily leaderboard scan
  `CREATE INDEX IF NOT EXISTS "daily_scores_game_day_score_idx" ON "daily_scores" ("game_id","day","score" DESC);`,
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    for (const stmt of STATEMENTS) await pool.query(stmt);
    const gp = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name='game_progress' AND column_name='game_id';`,
    );
    const ds = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name='daily_scores' AND column_name='game_id';`,
    );
    const gpPk = await pool.query(
      `SELECT conname FROM pg_constraint WHERE conrelid='"game_progress"'::regclass AND contype='p';`,
    );
    const dsPk = await pool.query(
      `SELECT conname FROM pg_constraint WHERE conrelid='"daily_scores"'::regclass AND contype='p';`,
    );
    console.log("Applied 0021.");
    console.log("  game_progress.game_id present:", gp.rows.length === 1, "| PK:", gpPk.rows[0]?.conname);
    console.log("  daily_scores.game_id present: ", ds.rows.length === 1, "| PK:", dsPk.rows[0]?.conname);
  } finally {
    await pool.end();
  }
}

main().catch((err) => { console.error("Apply 0021 failed:", err); process.exit(1); });
