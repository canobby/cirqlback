# Cirqlback Arcade — Linear Plan (v2)

The restructured **Main Street Arcade** Linear project, issue by issue. Mirrors the v2 Master Plan &amp; Guide. Grouped by phase; each issue lists its Definition of Done. Freestyle is retired for this line; Daily, avatar-hero, music, and "update plan + push to Render" are baked into every cabinet.

---

# Project overview

**Project:** Main Street Arcade (Cirqlback Arcade v2) · Team CHR
**Goal:** one unified pixel/CRT arcade housing the 57 circular games + 10 new 16-bit shop-themed cabinets, sharing one avatar, one Daily/leaderboard/reward spine.
**Locked decisions:** 16-bit tier · unified front door · avatar stars in every cabinet · free-play quarter · all cabinets open · circular line pixel-reskinned.

---

# Phase 0 · Foundation (epic: CHR-180)

The platform layer, built once. The avatar rig gates the cabinets, so it lands first.

## Foundation issues

- [ ] **RetroEngine — 16-bit tier** · pixel buffer + nearest-neighbor upscale, `shade()`/`mix()`/`vgrad()`/`shelf()`/`ball()` draw kit, bundled 3×5 font, toggleable CRT, fixed-timestep, d-pad/tap/two-thumb input, `gameId` backend reuse.
- [ ] **MusicKit** · layered chiptune (square lead+harmony, triangle bass, noise drums), theme + boss variant + game-over jingle, dynamic layering, shared Main Street leitmotif, respects mute.
- [ ] **Avatar system + customizer** · "little people &amp; toys" figure; body/skin/eyes/expression/hair/hat/outfit/accessory/sidekick; per-shop outfit rig + play-to-unlock hooks; renders in lobby, cutscene, leaderboards, and as the in-game hero.
- [ ] **Insert-Coin cutscene** · reusable 16-bit hand-drops-quarter → boot → marquee → PRESS START; skippable after first view; attract/demo mode on the lobby.
- [ ] **Unified pixel lobby** · category rail (Action/Puzzle/Arcade/Classic/Reflex/Strategy/Zen), player-profile card, game cards, bottom nav; light pixel reskin of the circular line.
- [ ] **Leaderboards &amp; rewards wiring** · Daily + all-time per game, reward events (first play, streak, clears, boss kills, PBs), cosmetics/perks payout, server-side score validation.
- [ ] **Mobile &amp; a11y baseline** · portrait handling + on-screen two-thumb controls, colorblind-safe palettes, reduced-motion, CRT toggle, assist difficulty.

---

# Phase 1 · The 10 cabinets

Each cabinet is one issue and must meet the full Definition of Done before it ships. **After each: update the plan + Linear and push to Render.**

## Definition of Done (applies to every cabinet issue)

- [ ] Extends RetroEngine (16-bit); round hero with `ball()` shading
- [ ] 3 worlds · ~20–40 progressive levels · boss cadence · new mechanic per world
- [ ] Signature twist implemented and fun
- [ ] Juice pass (shake, particles, hitstop, combo popups, transitions)
- [ ] Avatar is the playable hero + shop outfit unlock wired
- [ ] Original music (theme + boss variant + game-over jingle, dynamic layering)
- [ ] Insert-Coin cutscene wired (skippable)
- [ ] Daily challenge (fixed seed) + leaderboard submit + reward events
- [ ] Two-thumb mobile controls + portrait + reduced-motion
- [ ] tsc clean, verified in-browser, lazy-routed in lobby
- [ ] Plan + Linear updated and pushed to Render

## Cabinet issues

- [ ] **CHR-181 · Cuppa Rush** (Coffee · Tapper) — POC. Physics mugs + bank-shots; boss "regulars" order combos. Worlds: Morning Rush → Lunch Crowd → Late Night.
- [ ] **CHR-182 · Slice Route** (Pizza · Paperboy) — Branching streets (route forks = risk/reward); weather worlds. Suburbs → Downtown → Boardwalk.
- [ ] **CHR-190 · Spin Cycle** (Laundromat · Puzzle Bobble) — Rotating-drum bubble grid; suds hazards; bleach color-bomb. Wash → Spin → Dry.
- [ ] **CHR-184 · Rummage** (Thrift · Pac-Man) — Reshuffling rack-maze; outfit power-ups (speed/disguise/magnet). Racks → Fitting Rooms → Storeroom.
- [ ] **CHR-185 · Dozen** (Donut · Q*bert) — Color-mix glazes (multi-hop targets); conveyor crates. Counter → Kitchen → Loading Dock.
- [ ] **CHR-187 · Sundae Stack** (Ice-cream · Tetris) — Flavor-match combos + line-clears; per-level sundae goals; brain-freeze rows.
- [ ] **CHR-186 · Fresh Batch** (Bakery · Donkey Kong) — Grab-and-throw rolling pins; destructible obstacles; top-shelf bonuses. Ovens → Cooling Racks → Rooftop.
- [ ] **CHR-189 · Taco Stack** (Taqueria · BurgerTime) — Lime = weapon + combo; spicy meter; order-ticket priority. Truck → Cantina → Fiesta.
- [ ] **CHR-188 · Spin City** (Record · Marble Madness) — The record plays the track; tempo = time pressure; groove rails. 45s → LPs → Live Set.
- [ ] **CHR-183 · Fix-It** (Hardware · Fix-It Felix Jr.) — Adaptive wrecker; power-tool upgrades; renovation bonus rounds. Apartments → Offices → Penthouse.

*(Recommended build order: Cuppa Rush → Slice Route → Spin Cycle first, to prove the range early.)*

---

# Phase 2 · Meta &amp; polish

- [ ] **Achievements/badges** — auto thresholds per cabinet (Badge Phase 2).
- [ ] **Avatar cosmetic-unlock catalog** + reward **skin packs** a business can hand out.
- [ ] **Sponsorship/skin hooks** — a shop adopts its matching cabinet + attaches a perk.
- [ ] **Social** — share score/avatar card; race the Daily #1 ghost.
- [ ] **Seasonal** — limited-time skins; rotating cabinet-of-the-week.
- [ ] **A11y &amp; performance pass** across all cabinets.

---

# Milestones

- [ ] **M0** — Foundation + Cuppa Rush end-to-end.
- [ ] **M1** — First 3 cabinets live + lobby unified.
- [ ] **M2** — All 10 cabinets live.
- [ ] **M3** — Meta &amp; polish complete.
