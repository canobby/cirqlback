// Idempotent apply of migration 0011 (badges) + seed the starter catalog.
// `db:migrate` is broken on the shared Neon DB; apply additive DDL directly.
//
//   npx tsx scripts/apply-0011-badges.ts
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
  `CREATE TABLE IF NOT EXISTS "badge_definitions" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "key" varchar NOT NULL,
    "name" varchar NOT NULL,
    "description" text,
    "emoji" varchar,
    "image_data_uri" text,
    "color" varchar DEFAULT '#7c3aed',
    "audience" varchar DEFAULT 'any' NOT NULL,
    "awardable_by" varchar DEFAULT 'admin' NOT NULL,
    "tier" varchar,
    "is_custom" boolean DEFAULT false,
    "created_by_user_id" varchar,
    "created_at" timestamp DEFAULT now(),
    CONSTRAINT "badge_definitions_key_unique" UNIQUE("key")
  );`,
  `CREATE TABLE IF NOT EXISTS "badge_awards" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "badge_definition_id" varchar NOT NULL,
    "recipient_user_id" varchar,
    "recipient_business_id" varchar,
    "note" text,
    "awarder_role" varchar NOT NULL,
    "awarder_user_id" varchar,
    "awarder_business_id" varchar,
    "awarded_at" timestamp DEFAULT now(),
    "revoked_at" timestamp
  );`,
  addFk("badge_awards", "badge_awards_badge_definition_id_badge_definitions_id_fk",
    `FOREIGN KEY ("badge_definition_id") REFERENCES "public"."badge_definitions"("id") ON DELETE no action ON UPDATE no action`),
  addFk("badge_awards", "badge_awards_recipient_user_id_users_id_fk",
    `FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action`),
  addFk("badge_awards", "badge_awards_recipient_business_id_businesses_id_fk",
    `FOREIGN KEY ("recipient_business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action`),
  addFk("badge_awards", "badge_awards_awarder_user_id_users_id_fk",
    `FOREIGN KEY ("awarder_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action`),
  addFk("badge_awards", "badge_awards_awarder_business_id_businesses_id_fk",
    `FOREIGN KEY ("awarder_business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action`),
  addFk("badge_definitions", "badge_definitions_created_by_user_id_users_id_fk",
    `FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action`),
  `CREATE INDEX IF NOT EXISTS "idx_badge_awards_recipient_user" ON "badge_awards" ("recipient_user_id");`,
  `CREATE INDEX IF NOT EXISTS "idx_badge_awards_recipient_business" ON "badge_awards" ("recipient_business_id");`,
];

// Starter catalog (isCustom=false). audience = who receives; awardable_by = who grants.
const CATALOG: [string, string, string, string, string, string, string][] = [
  // key, name, emoji, color, audience, awardableBy, description
  // Customers award businesses (curated list — prepopulated only):
  ["great_service", "Great Service", "🌟", "#f59e0b", "business", "customer", "Went above and beyond"],
  ["friendly_staff", "Friendly Staff", "😊", "#10b981", "business", "customer", "Warm, welcoming people"],
  ["best_coffee", "Best Coffee", "☕", "#92400e", "business", "customer", "Seriously good coffee"],
  ["hidden_gem", "Hidden Gem", "💎", "#06b6d4", "business", "customer", "A local secret worth sharing"],
  ["fast_service", "Fast Service", "⚡", "#eab308", "business", "customer", "Quick and efficient"],
  ["clean_cozy", "Clean & Cozy", "🧼", "#3b82f6", "business", "customer", "Spotless and comfortable"],
  ["community_supporter", "Community Supporter", "🤝", "#8b5cf6", "business", "customer", "Gives back locally"],
  ["pet_friendly", "Pet-Friendly", "🐾", "#f97316", "business", "customer", "Pets welcome"],
  ["kid_friendly", "Kid-Friendly", "🧒", "#ec4899", "business", "customer", "Great for families"],
  ["sustainable", "Sustainable", "🌱", "#22c55e", "business", "customer", "Eco-conscious"],
  // Businesses award customers:
  ["vip", "VIP", "👑", "#eab308", "customer", "business", "A valued regular"],
  ["regular", "Regular", "🔁", "#3b82f6", "customer", "business", "Keeps coming back"],
  ["top_fan", "Top Fan", "🏆", "#f59e0b", "customer", "business", "One of our biggest fans"],
  ["first_visit", "First Visit", "🎉", "#a855f7", "customer", "business", "Thanks for stopping by"],
  ["big_spender", "Big Spender", "💸", "#16a34a", "customer", "business", "Generous supporter"],
  ["birthday", "Birthday", "🎂", "#ec4899", "customer", "business", "Happy birthday!"],
  // Coordinators award businesses:
  ["rising_star", "Rising Star", "🌟", "#f59e0b", "business", "coordinator", "Fast-growing local business"],
  ["community_pillar", "Community Pillar", "🏛️", "#0ea5e9", "business", "coordinator", "Anchor of the community"],
  ["early_adopter", "Early Adopter", "🚀", "#8b5cf6", "business", "coordinator", "Among the first to join"],
  ["top_performer", "Top Performer", "📈", "#22c55e", "business", "coordinator", "Standout engagement"],
  // Admin awards anyone:
  ["founding_member", "Founding Member", "🏅", "#eab308", "any", "admin", "Here from the start"],
  ["beta_tester", "Beta Tester", "🧪", "#06b6d4", "any", "admin", "Helped shape the platform"],
  ["mvp", "MVP", "🥇", "#f59e0b", "any", "admin", "Most valuable player"],
  ["platform_partner", "Partner", "🤝", "#8b5cf6", "any", "admin", "A trusted partner"],
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    for (const stmt of DDL) await pool.query(stmt);
    let seeded = 0;
    for (const [key, name, emoji, color, audience, awardableBy, description] of CATALOG) {
      const r = await pool.query(
        `INSERT INTO badge_definitions (key, name, emoji, color, audience, awardable_by, description, is_custom)
         VALUES ($1,$2,$3,$4,$5,$6,$7,false) ON CONFLICT (key) DO NOTHING`,
        [key, name, emoji, color, audience, awardableBy, description],
      );
      seeded += r.rowCount ?? 0;
    }
    const { rows } = await pool.query(`SELECT count(*)::int n FROM badge_definitions`);
    console.log(`Applied. Seeded ${seeded} new catalog badges; total definitions: ${rows[0].n}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => { console.error("Apply 0011 failed:", err); process.exit(1); });
