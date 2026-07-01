# Cirqlback

Cirqlback is a local-business **tap-to-earn** loyalty and discovery platform. Customers tap an NFC "Cirql tag" at a participating business to earn points and rewards — no app install, no account required to tap. Businesses run campaigns and see real engagement analytics; a discovery map helps customers find nearby participating shops.

It's a single TypeScript codebase: a React SPA frontend and an Express + PostgreSQL backend sharing one Drizzle schema.

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | React 18 + TypeScript, Vite, Wouter (routing), TanStack Query, Tailwind CSS + shadcn/ui |
| Backend | Express, WebSockets (`ws`), session auth (Passport local + `express-session` + `connect-pg-simple`) |
| Data | PostgreSQL (Neon serverless driver) via Drizzle ORM; schema in `shared/schema.ts` |
| Integrations | Stripe (subscriptions/payments), OpenAI (AI insights + translation), Google Maps |

## Prerequisites

- **Node.js 20+** and npm.
- A **Neon** PostgreSQL database. The app uses the Neon serverless (WebSocket) driver, so a plain local Postgres will **not** work without swapping the driver — create a free dev branch at [neon.tech](https://neon.tech).

## Local setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env          # PowerShell: Copy-Item .env.example .env
#   → set DATABASE_URL (required). Everything else is optional; features that
#     need a key return a clear error until you provide one. See .env.example
#     for the full annotated list.

# 3. Create the database schema (syncs shared/schema.ts to your DB)
npm run db:push

# 4. Run the dev server (client + API on one port)
npm run dev
# → http://127.0.0.1:5000
```

Only `DATABASE_URL` is strictly required to boot. `OPENAI_API_KEY`, the Stripe keys, `GOOGLE_MAPS_API_KEY`/`VITE_GOOGLE_MAPS_API_KEY`, and `SESSION_SECRET` unlock their respective features but the server boots without them — each `.env.example` entry documents exactly what it gates.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Express server with Vite middleware (API + SPA) on `HOST:PORT` (default `127.0.0.1:5000`). |
| `npm run build` | Build the client (Vite) and bundle the server (esbuild) into `dist/`. |
| `npm start` | Run the production build from `dist/`. |
| `npm run check` | TypeScript typecheck (`tsc`, no emit). |
| `npm run db:push` | Sync `shared/schema.ts` to the database with `drizzle-kit push`. |

## Project structure

```
client/            React SPA
  src/pages/         Route-level pages (Wouter routes live in src/App.tsx)
  src/components/    Shared UI + feature components (shadcn/ui in components/ui)
  src/hooks/         React hooks (e.g. useAuth)
  src/lib/           Query client + helpers
server/            Express backend
  index.ts           App entry: dotenv, middleware, helmet/CORS/rate-limit, listen
  routes.ts          Composition root — mounts the domain routers below
  routes/            Domain routers (auth, businesses, taps/rewards, admin, …)
  auth.ts            Session auth + isAuthenticated / isAdminAuthenticated
  storage.ts         Drizzle data-access layer (the DatabaseStorage class)
  gamification.ts    Tier/level maths
  pricing.ts         Server-side subscription price catalog
  db.ts              Neon pool + Drizzle client
shared/
  schema.ts          Drizzle table definitions + Zod insert schemas (single source of truth)
docs/              Curated references (feature lists, user guide)
  history/           Archived Replit-era status/validation docs (historical, may overstate completeness)
```

### Architecture notes

- **Auth & authorization.** Identity comes from the session (`req.user`), never from client-supplied ids. User-private route groups are gated by `isAuthenticated`; `/api/admin/*` requires an active admin record (`isAdminAuthenticated`). Resource-mutating routes additionally check ownership.
- **Routing.** `server/routes.ts` is a thin composition root that registers per-domain routers in a fixed order (a few paths are intentionally duplicated and Express uses the first registered).
- **Payments.** Prices are resolved server-side from `server/pricing.ts` — the client never sends an amount. A signed Stripe webhook activates subscriptions.
- **Real vs. mock.** Core loops are real (auth, NFC tap → points/rewards, discovery map, analytics aggregation, points/levels/leaderboard/daily-challenges). Some secondary endpoints still return placeholder data and are being made real incrementally.

## Notes

- This project began on Replit; the original platform notes and a large set of AI-generated status/validation reports live under `docs/history/` for reference and generally **overstate** completeness — trust the code and this README over those.
- `.env` is git-ignored; never commit real secrets. `VITE_*` variables are baked into the client bundle at build time, so only ever use **publishable** keys there.
