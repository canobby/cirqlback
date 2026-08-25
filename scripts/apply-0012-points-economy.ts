// Idempotent apply of migration 0012 (points economy: point_rewards +
// point_redemptions). `db:migrate` is broken on the shared Neon DB — apply
// additive DDL directly with guards.
//
//   npx tsx scripts/apply-0012-points-economy.ts
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

const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS "point_rewards" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "title" varchar NOT NULL,
    "description" text,
    "emoji" varchar,
    "points_cost" integer NOT NULL,
    "type" varchar DEFAULT 'business_perk' NOT NULL,
    "business_id" varchar,
    "created_by_user_id" varchar,
    "created_by_role" varchar DEFAULT 'business' NOT NULL,
    "quantity" integer,
    "redeemed_count" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "ends_at" timestamp,
    "draw_at" timestamp,
    "winner_redemption_id" varchar,
    "created_at" timestamp DEFAULT now()
  );`,
  `CREATE TABLE IF NOT EXISTS "point_redemptions" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "point_reward_id" varchar NOT NULL,
    "user_id" varchar NOT NULL,
    "points_spent" integer NOT NULL,
    "reward_id" varchar,
    "code" varchar,
    "status" varchar DEFAULT 'active' NOT NULL,
    "created_at" timestamp DEFAULT now()
  );`,
  addFk("point_redemptions", "point_redemptions_point_reward_id_point_rewards_id_fk",
    `FOREIGN KEY ("point_reward_id") REFERENCES "public"."point_rewards"("id") ON DELETE no action ON UPDATE no action`),
  addFk("point_redemptions", "point_redemptions_user_id_users_id_fk",
    `FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action`),
  addFk("point_redemptions", "point_redemptions_reward_id_rewards_id_fk",
    `FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE no action ON UPDATE no action`),
  addFk("point_rewards", "point_rewards_business_id_businesses_id_fk",
    `FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action`),
  addFk("point_rewards", "point_rewards_created_by_user_id_users_id_fk",
    `FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action`),
  `CREATE INDEX IF NOT EXISTS "idx_point_redemptions_user" ON "point_redemptions" ("user_id");`,
  `CREATE INDEX IF NOT EXISTS "idx_point_rewards_business" ON "point_rewards" ("business_id");`,
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    for (const stmt of DDL) await pool.query(stmt);
    const { rows } = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_name IN ('point_rewards','point_redemptions') ORDER BY table_name;`,
    );
    console.log("Applied. Present:", rows.map((r: any) => r.table_name).join(", "));
  } finally {
    await pool.end();
  }
}

main().catch((err) => { console.error("Apply 0012 failed:", err); process.exit(1); });
