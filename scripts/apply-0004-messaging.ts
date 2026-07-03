// One-off, idempotent apply of migration 0004 (cross-role messaging tables).
//
// `npm run db:migrate` is BROKEN on the shared Neon DB (journal out of sync — it
// re-runs from 0000 and hits "already exists"). Per the project's migration
// gotcha, we apply this migration's additive DDL directly with IF NOT EXISTS
// guards so it is safe and re-runnable. The generated SQL (0004_*.sql) contains
// only CREATE TABLE + ADD CONSTRAINT — no DROP/TRUNCATE.
//
//   npx tsx scripts/apply-0004-messaging.ts
import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set (see .env / .env.example).");
}

// FK guard helper: ADD CONSTRAINT is not idempotent, so only add it when absent.
function addFk(table: string, name: string, sql: string): string {
  return `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${name}') THEN
      ALTER TABLE "${table}" ADD CONSTRAINT "${name}" ${sql};
    END IF;
  END $$;`;
}

const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "message_threads" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "subject" varchar NOT NULL,
    "context_type" varchar DEFAULT 'coordinator_business' NOT NULL,
    "coordinator_id" varchar,
    "business_id" varchar,
    "status" varchar DEFAULT 'open' NOT NULL,
    "last_message_at" timestamp DEFAULT now(),
    "created_by" varchar,
    "created_at" timestamp DEFAULT now()
  );`,
  `CREATE TABLE IF NOT EXISTS "messages" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "thread_id" varchar NOT NULL,
    "sender_id" varchar,
    "sender_role" varchar NOT NULL,
    "body" text NOT NULL,
    "read_at" timestamp,
    "created_at" timestamp DEFAULT now()
  );`,
  addFk("message_threads", "message_threads_coordinator_id_coordinators_id_fk",
    `FOREIGN KEY ("coordinator_id") REFERENCES "public"."coordinators"("id") ON DELETE no action ON UPDATE no action`),
  addFk("message_threads", "message_threads_business_id_businesses_id_fk",
    `FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action`),
  addFk("message_threads", "message_threads_created_by_users_id_fk",
    `FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action`),
  addFk("messages", "messages_thread_id_message_threads_id_fk",
    `FOREIGN KEY ("thread_id") REFERENCES "public"."message_threads"("id") ON DELETE no action ON UPDATE no action`),
  addFk("messages", "messages_sender_id_users_id_fk",
    `FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action`),
  // Helpful lookup indexes (thread list by party, messages by thread).
  `CREATE INDEX IF NOT EXISTS "idx_message_threads_coordinator" ON "message_threads" ("coordinator_id");`,
  `CREATE INDEX IF NOT EXISTS "idx_message_threads_business" ON "message_threads" ("business_id");`,
  `CREATE INDEX IF NOT EXISTS "idx_messages_thread" ON "messages" ("thread_id");`,
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    for (const stmt of STATEMENTS) {
      await pool.query(stmt);
    }
    // Verify.
    const { rows } = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_name IN ('message_threads','messages') ORDER BY table_name;`,
    );
    console.log("Applied. Present tables:", rows.map((r: any) => r.table_name).join(", "));
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Apply 0004 failed:", err);
  process.exit(1);
});
