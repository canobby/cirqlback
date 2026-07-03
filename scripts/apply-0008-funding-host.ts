// Idempotent apply of migration 0008 (group_campaigns.funding_business_id — the
// host that funds/redeems a tangible multi-store reward). `db:migrate` is broken
// on the shared Neon DB; apply this additive DDL directly with guards.
//
//   npx tsx scripts/apply-0008-funding-host.ts
import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set.");

const STATEMENTS: string[] = [
  `ALTER TABLE "group_campaigns" ADD COLUMN IF NOT EXISTS "funding_business_id" varchar;`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'group_campaigns_funding_business_id_businesses_id_fk') THEN
      ALTER TABLE "group_campaigns" ADD CONSTRAINT "group_campaigns_funding_business_id_businesses_id_fk"
        FOREIGN KEY ("funding_business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;
    END IF;
  END $$;`,
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    for (const stmt of STATEMENTS) await pool.query(stmt);
    const { rows } = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name='group_campaigns' AND column_name='funding_business_id';`,
    );
    console.log("Applied. funding_business_id present:", rows.length === 1);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Apply 0008 failed:", err);
  process.exit(1);
});
