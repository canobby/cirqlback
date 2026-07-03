// Idempotent apply of migration 0015 (collections/passports). db:migrate is
// broken on the shared Neon DB — apply the additive DDL directly.
import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set.");

const fk = (t: string, n: string, s: string) => `DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='${n}') THEN
    ALTER TABLE "${t}" ADD CONSTRAINT "${n}" ${s}; END IF; END $$;`;

const DDL = [
  `CREATE TABLE IF NOT EXISTS "collections" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" varchar NOT NULL, "description" text, "emoji" varchar,
    "color" varchar DEFAULT '#7c3aed', "reward_points" integer DEFAULT 100 NOT NULL,
    "created_by_user_id" varchar, "created_by_role" varchar DEFAULT 'admin' NOT NULL,
    "territory_id" varchar, "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now());`,
  `CREATE TABLE IF NOT EXISTS "collection_items" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "collection_id" varchar NOT NULL, "business_id" varchar NOT NULL,
    CONSTRAINT "collection_items_unique" UNIQUE("collection_id","business_id"));`,
  `CREATE TABLE IF NOT EXISTS "collection_progress" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "collection_id" varchar NOT NULL, "user_id" varchar, "customer_email" varchar,
    "device_fingerprint" varchar, "visited_business_ids" jsonb DEFAULT '[]',
    "completed_at" timestamp, "reward_granted" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp DEFAULT now());`,
  fk("collection_items", "collection_items_collection_id_collections_id_fk", `FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id")`),
  fk("collection_items", "collection_items_business_id_businesses_id_fk", `FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id")`),
  fk("collection_progress", "collection_progress_collection_id_collections_id_fk", `FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id")`),
  fk("collection_progress", "collection_progress_user_id_users_id_fk", `FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")`),
  fk("collections", "collections_created_by_user_id_users_id_fk", `FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id")`),
  fk("collections", "collections_territory_id_territories_id_fk", `FOREIGN KEY ("territory_id") REFERENCES "public"."territories"("id")`),
  `CREATE INDEX IF NOT EXISTS "idx_collection_items_business" ON "collection_items" ("business_id");`,
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    for (const s of DDL) await pool.query(s);
    const { rows } = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'collection%' ORDER BY table_name`);
    console.log("Applied. Present:", rows.map((r: any) => r.table_name).join(", "));
  } finally { await pool.end(); }
}
main().catch((e) => { console.error(e); process.exit(1); });
