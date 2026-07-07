# CIRQL / CIRQLVERSE — Snapshot

*A tight, everything-at-a-glance snapshot of the flagship game as of 2026-07-07. For the deep dive see `CIRQL-Game-Reference`; for the next chapter see `CIRQLSPACE-Sandbox-Plan`.*

## In one line
A persistent, magical, **social 16-bit world of concentric island-rings** you sail outward forever — with quests, an in-world arcade, co-op, chat, and one currency (**SPARQS**) that ties in-game play + real-world Cirqlback activity. Live at **`/cirql`**. **M0–M11 complete (55/55).**

## Key facts
| | |
|---|---|
| **Name / route** | CIRQLVERSE (brand) · `/cirql` (code = `cirql`) |
| **Currency** | **SPARQ / SPARQS** (code `sparks`) — separate from platform loyalty *points* |
| **Home ring** | **CIRQLSPACE** (ring 0; renamed from "The Hearth") |
| **World** | concentric island-rings in an ocean; ring 0 authored, rings 1+ procedural (endless); sub-maps via portals |
| **Engine** | supersampled 16-bit RetroEngine, full-bleed, neon glow-up |
| **Multiplayer** | ring-scoped presence over `/ws/cirql` (in-memory) |
| **Save** | client-authoritative `game_progress` blob (`gameId='cirql'`); guests → localStorage |
| **Deploy** | branch `chr-5-7-phase0-run-locally` → Render, auto-deploy |

## Systems at a glance
- **World** — concentric rings; sail via docks; portals → cave/treetop/cloud sub-maps; minimap + full-screen sea chart; rings grow outward.
- **Movement** — joystick / tap / WASD, 4-dir facing, run, **jump/hop** (HOP button + C/H); solid-prop collision.
- **Identity** — first-run character creator (skin/eyes/hat/shape/outfit/aura/companion); free + SPARQS-priced cosmetics; re-editable look.
- **Quests** — reach/interact/enter/light-lanterns/solve-puzzle objectives, chains, SPARQS rewards, repeatable; onboarding chain; per-ring generated quests; quest log + waypoints.
- **CirqlCade (arcade)** — enter the building → hall of ~57 cabinets → play embedded over `/cirql`; **arcade is FREE** (perks cost 0); **arcade Dailies earn SPARQS** via a server `sparqbank` wallet CIRQL claims.
- **Economy** — earn SPARQS (spark-a-play, quests, campaigns, daily, arcade dailies); spend on cosmetics + décor; **World Energy** meter; **Your Cirql** = friend-lanterns (share-a-light + invite).
- **Social** — live avatars/chat bubbles; **Global · Party · DM** channels + unread; **DMs** (request/accept, session-scoped); **server profanity mask + rate limit + block/report**; **emotes** (12-wheel glyphs); **share-a-light**.
- **Co-op** — campaigns (5 seed), **Campaign Board** (structured PII-free matchmaking), **parties** (shared waypoint, synced progress, party chat), ask/invite handshakes.
- **Endless engines** — procedural rings (deterministic biomes/names/docks/keepers), 8 themed seasonal biomes, generated quests, **daily + weekend-festival** loops + streaks, a **Myst rune puzzle**.
- **World feel** — world-space ambient critters, purposeful landscape (groves/beds/cairns/paths/ponds), reed/grass/flower pond fringes, round+pine trees, bushes; **cutscenes** (skippable, data-authored) for arrival/onboarding/campaign/world-energy; **sailing voyage** (steer + gather light).
- **Décor & visiting** — buy + place décor on your CIRQLSPACE (glyph + pixel-prop building blocks), persisted, **CIRQLSPACE-only**; **visit** friends' spaces (read-only). → the seed of the sandbox.
- **Real-world tie** — SPARQS economy (not scenery); platform *points* stay separate for real rewards; the in-world business-landmarks experiment (CHR-261) is **being retired**.

## Tech snapshot
- **Client:** React + canvas RetroEngine; `CirqlWorldEngine`; key files `cirql-world-engine.ts`, `cirql-world.ts`, `cirql-ring-gen.ts`, `cirql-quests.ts`, `cirql-quest-gen.ts`, `cirql-daily.ts`, `cirql-campaigns.ts`, `cirql-cutscenes.ts`, `cirql-emotes.ts`, `cirql-decor.ts`; page `pages/cirql.tsx`.
- **Server:** Node/Express (tsx, no hot-reload), `/ws/cirql` → `server/cirql-presence.ts`, chat `server/chat-filter.ts`; Postgres/Neon via Drizzle; `game_progress` (saves + `sparqbank` wallet).
- **Dev:** `npm run dev` → port 5000; restart after server edits.

## Status
- **✅ Live:** M0–M11 + world-feel polish (CIRQLSPACE rename, landscape, building-block décor). Linear "CIRQL — Flagship World" = **55/55 done**.
- **🚧 Planned next:** the **CIRQLSPACE Sandbox** — blank buildable ring 0 (terrain paint + objects + land growth + live parties), a **Town** at ring 1, procedural from ring 2, landmarks retired. Linear project **"CIRQLSPACE — Your Sandbox"** (A–G).
