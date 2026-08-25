// Idempotent apply of migration 0010 (Stripe Connect fields on businesses +
// stripe_transfer_id on reward_settlements). `db:migrate` is broken on the shared
// Neon DB; apply this additive DDL directly with ADD COLUMN IF NOT EXISTS.
//
//   npx tsx scripts/apply-0010-connect.ts
import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set.");

const STATEMENTS: string[] = [
  `ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "stripe_connect_account_id" varchar;`,
  `ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "connect_payouts_enabled" boolean DEFAULT false;`,
  `ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "connect_details_submitted" boolean DEFAULT false;`,
  `ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "connect_onboarded_at" timestamp;`,
  `ALTER TABLE "reward_settlements" ADD COLUMN IF NOT EXISTS "stripe_transfer_id" varchar;`,
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    for (const stmt of STATEMENTS) await pool.query(stmt);
    const { rows } = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE (table_name='businesses' AND column_name='stripe_connect_account_id')
          OR (table_name='reward_settlements' AND column_name='stripe_transfer_id');`,
    );
    console.log("Applied. New columns present:", rows.length);
  } finally {
    await pool.end();
  }
}

main().catch((err) => { console.error("Apply 0010 failed:", err); process.exit(1); });
