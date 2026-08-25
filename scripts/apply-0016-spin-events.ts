import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set.");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_spin_date" varchar;`);
await pool.query(`CREATE TABLE IF NOT EXISTS "events" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar NOT NULL, "description" text, "emoji" varchar,
  "point_multiplier" integer DEFAULT 2 NOT NULL,
  "starts_at" timestamp NOT NULL, "ends_at" timestamp NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_by_user_id" varchar, "created_at" timestamp DEFAULT now());`);
await pool.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='events_created_by_user_id_users_id_fk') THEN
  ALTER TABLE "events" ADD CONSTRAINT "events_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id"); END IF; END $$;`);
const { rows } = await pool.query(`SELECT (SELECT count(*) FROM information_schema.columns WHERE table_name='users' AND column_name='last_spin_date') c, (SELECT count(*) FROM information_schema.tables WHERE table_name='events') e`);
console.log("Applied. last_spin_date:", rows[0].c, "events table:", rows[0].e);
await pool.end();
