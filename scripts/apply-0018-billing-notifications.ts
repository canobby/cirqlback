// Idempotent apply of migration 0018 (dunning-email idempotency columns).
//   npx tsx scripts/apply-0018-billing-notifications.ts
import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set.");

const STATEMENTS: string[] = [
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "billing_lock_notified_at" timestamp;`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "billing_suspend_notified_at" timestamp;`,
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    for (const stmt of STATEMENTS) await pool.query(stmt);
    const { rows } = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name='users' AND column_name IN ('billing_lock_notified_at','billing_suspend_notified_at');`,
    );
    console.log("Applied. notify columns present:", rows.map((r) => r.column_name).sort());
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Apply 0018 failed:", err);
  process.exit(1);
});
