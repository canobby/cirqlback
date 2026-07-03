// Idempotent apply of migration 0007 (reward_adjustments audit table).
// `db:migrate` is broken on the shared Neon DB — apply additive DDL directly
// with guards. Generated SQL is CREATE TABLE + ADD CONSTRAINT only.
//
//   npx tsx scripts/apply-0007-reward-adjustments.ts
import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set.");

function addFk(name: string, sql: string): string {
  return `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${name}') THEN
      ALTER TABLE "reward_adjustments" ADD CONSTRAINT "${name}" ${sql};
    END IF;
  END $$;`;
}

const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "reward_adjustments" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "actor_user_id" varchar,
    "actor_role" varchar NOT NULL,
    "target_user_id" varchar,
    "target_email" varchar,
    "business_id" varchar,
    "kind" varchar NOT NULL,
    "points_delta" integer,
    "reward_id" varchar,
    "reason" text,
    "created_at" timestamp DEFAULT now()
  );`,
  addFk("reward_adjustments_actor_user_id_users_id_fk",
    `FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action`),
  addFk("reward_adjustments_target_user_id_users_id_fk",
    `FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action`),
  addFk("reward_adjustments_business_id_businesses_id_fk",
    `FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action`),
  addFk("reward_adjustments_reward_id_rewards_id_fk",
    `FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE no action ON UPDATE no action`),
  `CREATE INDEX IF NOT EXISTS "idx_reward_adjustments_target" ON "reward_adjustments" ("target_user_id");`,
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    for (const stmt of STATEMENTS) await pool.query(stmt);
    const { rows } = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_name='reward_adjustments';`,
    );
    console.log("Applied. reward_adjustments present:", rows.length === 1);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Apply 0007 failed:", err);
  process.exit(1);
});
