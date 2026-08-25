// Applies the committed SQL migrations in ./migrations to DATABASE_URL.
// Use this (not db:push) to bring a fresh database up to the current schema —
// it is deterministic and reproducible. See README "Database migrations".
//
//   npm run db:migrate
//
// Schema changes: edit shared/schema.ts, then `npm run db:generate` to emit a
// new migration, then `npm run db:migrate` to apply it.
import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set (see .env / .env.example).");
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool });
  console.log("Applying migrations from ./migrations ...");
  await migrate(db, { migrationsFolder: "./migrations" });
  await pool.end();
  console.log("Migrations applied.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
