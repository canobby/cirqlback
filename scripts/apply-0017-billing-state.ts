// Idempotent apply of migration 0017 (billing-state columns on users).
// `db:migrate` is broken on the shared Neon DB — apply additive DDL directly
// with guards (ADD COLUMN IF NOT EXISTS).
//
//   npx tsx scripts/apply-0017-billing-state.ts
import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set.");

const STATEMENTS: string[] = [
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "paid_through_date" timestamp;`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "past_due_since" timestamp;`,
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    for (const stmt of STATEMENTS) await pool.query(stmt);
    const { rows } = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name='users' AND column_name IN ('paid_through_date','past_due_since');`,
    );
    console.log("Applied. billing columns present:", rows.map((r) => r.column_name).sort());
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Apply 0017 failed:", err);
  process.exit(1);
});
