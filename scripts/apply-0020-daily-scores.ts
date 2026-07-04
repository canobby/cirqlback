// Idempotent apply of migration 0020 (daily_scores — Cirqlbreak Daily leaderboard).
//   npx tsx scripts/apply-0020-daily-scores.ts
import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set.");

const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "daily_scores" (
    "user_id" varchar NOT NULL,
    "day" varchar NOT NULL,
    "daily_num" integer NOT NULL DEFAULT 0,
    "score" integer NOT NULL DEFAULT 0,
    "best_combo" integer NOT NULL DEFAULT 0,
    "restored" boolean NOT NULL DEFAULT false,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    CONSTRAINT "daily_scores_user_id_day_pk" PRIMARY KEY ("user_id","day")
  );`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daily_scores_user_id_users_id_fk') THEN
      ALTER TABLE "daily_scores" ADD CONSTRAINT "daily_scores_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
  END $$;`,
  // rank queries scan by day + score
  `CREATE INDEX IF NOT EXISTS "daily_scores_day_score_idx" ON "daily_scores" ("day", "score" DESC);`,
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    for (const stmt of STATEMENTS) await pool.query(stmt);
    const { rows } = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_name='daily_scores';`,
    );
    console.log("Applied. daily_scores present:", rows.length === 1);
  } finally {
    await pool.end();
  }
}

main().catch((err) => { console.error("Apply 0020 failed:", err); process.exit(1); });
