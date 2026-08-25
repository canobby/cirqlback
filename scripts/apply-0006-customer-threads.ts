// Idempotent apply of migration 0006 (message_threads.customer_user_id for
// Slice 4 customer↔business threads). `db:migrate` is broken on the shared DB —
// apply this additive DDL directly with guards. Generated SQL is ADD COLUMN +
// ADD CONSTRAINT only.
//
//   npx tsx scripts/apply-0006-customer-threads.ts
import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set.");

const STATEMENTS: string[] = [
  `ALTER TABLE "message_threads" ADD COLUMN IF NOT EXISTS "customer_user_id" varchar;`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'message_threads_customer_user_id_users_id_fk') THEN
      ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_customer_user_id_users_id_fk"
        FOREIGN KEY ("customer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
    END IF;
  END $$;`,
  `CREATE INDEX IF NOT EXISTS "idx_message_threads_customer" ON "message_threads" ("customer_user_id");`,
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    for (const stmt of STATEMENTS) await pool.query(stmt);
    const { rows } = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name='message_threads' AND column_name='customer_user_id';`,
    );
    console.log("Applied. customer_user_id present:", rows.length === 1);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Apply 0006 failed:", err);
  process.exit(1);
});
