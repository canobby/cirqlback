// Idempotent apply of migration 0005 (admin broadcasts). `db:migrate` is broken
// on the shared Neon DB — apply this migration's additive DDL directly with
// IF NOT EXISTS guards. The generated SQL is CREATE TABLE + ADD CONSTRAINT only.
//
//   npx tsx scripts/apply-0005-broadcasts.ts
import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set (see .env / .env.example).");
}

function addFk(table: string, name: string, sql: string): string {
  return `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${name}') THEN
      ALTER TABLE "${table}" ADD CONSTRAINT "${name}" ${sql};
    END IF;
  END $$;`;
}

const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "broadcasts" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "sender_user_id" varchar,
    "audience" varchar NOT NULL,
    "subject" varchar NOT NULL,
    "body" text NOT NULL,
    "created_at" timestamp DEFAULT now()
  );`,
  `CREATE TABLE IF NOT EXISTS "user_broadcast_state" (
    "user_id" varchar PRIMARY KEY NOT NULL,
    "last_seen_at" timestamp DEFAULT now()
  );`,
  addFk("broadcasts", "broadcasts_sender_user_id_users_id_fk",
    `FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action`),
  addFk("user_broadcast_state", "user_broadcast_state_user_id_users_id_fk",
    `FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action`),
  `CREATE INDEX IF NOT EXISTS "idx_broadcasts_created" ON "broadcasts" ("created_at");`,
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    for (const stmt of STATEMENTS) await pool.query(stmt);
    const { rows } = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_name IN ('broadcasts','user_broadcast_state') ORDER BY table_name;`,
    );
    console.log("Applied. Present tables:", rows.map((r: any) => r.table_name).join(", "));
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Apply 0005 failed:", err);
  process.exit(1);
});
