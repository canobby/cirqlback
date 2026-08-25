// Idempotent apply of migration 0009 (reward_contributions + reward_settlements
// for shared-campaign cost splitting). `db:migrate` is broken on the shared Neon
// DB; apply this additive DDL directly with guards.
//
//   npx tsx scripts/apply-0009-reward-settlements.ts
import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set.");

function addFk(table: string, name: string, sql: string): string {
  return `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${name}') THEN
      ALTER TABLE "${table}" ADD CONSTRAINT "${name}" ${sql};
    END IF;
  END $$;`;
}

const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "reward_settlements" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "host_business_id" varchar NOT NULL,
    "period_month" varchar NOT NULL,
    "total_cents" integer DEFAULT 0 NOT NULL,
    "contribution_count" integer DEFAULT 0 NOT NULL,
    "status" varchar DEFAULT 'pending' NOT NULL,
    "method" varchar DEFAULT 'manual',
    "reference" varchar,
    "notes" text,
    "created_by" varchar,
    "created_at" timestamp DEFAULT now(),
    "paid_at" timestamp
  );`,
  `CREATE TABLE IF NOT EXISTS "reward_contributions" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "group_campaign_id" varchar NOT NULL,
    "reward_id" varchar NOT NULL,
    "host_business_id" varchar NOT NULL,
    "business_id" varchar NOT NULL,
    "customer_email" varchar,
    "weight_taps" integer DEFAULT 0,
    "total_reward_cents" integer DEFAULT 0 NOT NULL,
    "share_cents" integer DEFAULT 0 NOT NULL,
    "basis" varchar DEFAULT 'weighted' NOT NULL,
    "period_month" varchar NOT NULL,
    "settlement_id" varchar,
    "created_at" timestamp DEFAULT now(),
    CONSTRAINT "reward_contributions_reward_business_unique" UNIQUE("reward_id","business_id")
  );`,
  addFk("reward_contributions", "reward_contributions_group_campaign_id_group_campaigns_id_fk",
    `FOREIGN KEY ("group_campaign_id") REFERENCES "public"."group_campaigns"("id") ON DELETE no action ON UPDATE no action`),
  addFk("reward_contributions", "reward_contributions_reward_id_rewards_id_fk",
    `FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE no action ON UPDATE no action`),
  addFk("reward_contributions", "reward_contributions_host_business_id_businesses_id_fk",
    `FOREIGN KEY ("host_business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action`),
  addFk("reward_contributions", "reward_contributions_business_id_businesses_id_fk",
    `FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action`),
  addFk("reward_contributions", "reward_contributions_settlement_id_reward_settlements_id_fk",
    `FOREIGN KEY ("settlement_id") REFERENCES "public"."reward_settlements"("id") ON DELETE no action ON UPDATE no action`),
  addFk("reward_settlements", "reward_settlements_host_business_id_businesses_id_fk",
    `FOREIGN KEY ("host_business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action`),
  addFk("reward_settlements", "reward_settlements_created_by_users_id_fk",
    `FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action`),
  `CREATE INDEX IF NOT EXISTS "idx_reward_contributions_host" ON "reward_contributions" ("host_business_id");`,
  `CREATE INDEX IF NOT EXISTS "idx_reward_contributions_business" ON "reward_contributions" ("business_id");`,
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    for (const stmt of STATEMENTS) await pool.query(stmt);
    const { rows } = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_name IN ('reward_contributions','reward_settlements') ORDER BY table_name;`,
    );
    console.log("Applied. Present tables:", rows.map((r: any) => r.table_name).join(", "));
  } finally {
    await pool.end();
  }
}

main().catch((err) => { console.error("Apply 0009 failed:", err); process.exit(1); });
