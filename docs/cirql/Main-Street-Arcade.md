# Cirqlback Arcade — v2 Master Plan &amp; Guide

The plan for **one unified pixel arcade** that houses everything Cirqlback plays: the 57 quick *circular* games and a new premium line of **ten truly-retro 16-bit cabinets** themed to local shops. One front door, one player identity, one look. This document is both the **vision/guide** and the **project plan**; a companion *Linear Plan* mirrors it as issues.

> **Decisions locked (2026-07-06).** 16-bit is the house art tier · one unified "Cirqlback Arcade" front door · your custom avatar **stars as the playable hero in every cabinet** · the quarter is **free-play cinema** (never a paywall) · **all 10 cabinets open from day one** · the circular line gets a **light pixel reskin** so it sits natively in the pixel lobby.

---

# Part 1 — The Vision

## What we're building
A single **Cirqlback Arcade**: a pixel/CRT lobby (the look from the reference mockup) with a category rail, a player-profile card, and cards for every game. Inside live **two complementary lines**:

- **Circles** — the 57 existing one-thumb snacks (30–60s loops), lightly pixel-reskinned to match the lobby.
- **Main Street** — 10 new 16-bit cabinets: original homages to arcade classics, themed to local shops, using the **whole screen** so they go long (many levels, bosses, a high-score chase).

Both share one backend, one Daily system, one leaderboard/rewards spine, and **one customizable avatar**.

## Two principles that never bend
- **Round is the mascot, not the cage.** Full rectangular arcade playfields — but every cabinet has a signature round hero tied to its shop (a mug, a pizza, a vinyl, a donut, a bubble), shaded like a lit sphere. The circle is the star, not the boundary.
- **Original always — homage, not clone.** Our own names, art, audio and themes throughout. We homage the *genre and mechanics* of the classics (fair game); we never reproduce trademarked names, characters, art, or sound.

## Every cabinet must clear this bar
- [ ] **Visually exciting** — 16-bit shading, gradient skies, parallax, palette flashes.
- [ ] **Many progressive, interesting levels** — themed worlds, a new mechanic per world, a boss cadence, a real difficulty ramp.
- [ ] **Lots of juice & action** — screen shake, particles, hitstop, combo popups, satisfying SFX.
- [ ] **Very playable** — tight controls, two-thumb where two actions overlap, instant restart.
- [ ] **Funner / more interesting than the original** — one signature twist the classic never had.
- [ ] **Great original music** — a unique 16-bit theme (+ boss variant + game-over jingle).
- [ ] **A daily challenge** — a fixed daily seed everyone competes on (Freestyle is retired for this line).
- [ ] **Your avatar stars** — the playable hero is your customized toy-person, re-skinned for the shop.

---

# Part 2 — The Foundation (the platform layer)

Built once in Phase 0, shared by all 10 cabinets and the lobby.

## RetroEngine (16-bit tier)
The shared engine every cabinet extends: an internal **pixel buffer + nearest-neighbor upscale**, a **full-color draw kit** with `shade()` / `mix()` / `vgrad()` gradients, `shelf()` 3-tone surfaces, and `ball()` spherically-lit round heroes (all prototyped in the lookbooks). Bundled **3×5 pixel font** (CSP-safe, no external font). A toggleable, cheap **CRT** post-process (scanlines + vignette). Fixed-timestep update, **d-pad + tap + two-thumb** input, pause/menu/game-over chrome. Reuses the existing `gameId`-keyed backend for best score + Daily.

## MusicKit
A layered chiptune/16-bit kit extending the current synth: square lead + harmony, triangle bass, a noise-drum channel. Each cabinet gets a **theme + boss/intense variant + game-over jingle**, with **dynamic layering** (music thickens as combo/level rises). A shared **Main Street leitmotif** each cabinet riffs on for sonic cohesion. Respects the existing mute toggle.

## Insert-Coin cutscene
On launch, a reusable 16-bit sequence: your toy hand drops a quarter → the coin-slot lights → the CRT boots → the cabinet marquee → **PRESS START**. **Skippable after first view.** Pure flavor — always free. Bonus: **attract/demo mode** on the lobby (cabinets auto-play a short demo like a real arcade).

## Avatar system + customizer
A **"little people &amp; toys"** avatar — chunky, rounded, collectible. Customization axes: body/base color, head (skin, eyes, expression), hair/hat, outfit, accessory, and an optional sidekick toy. The avatar appears in the **lobby**, the **cutscene** (your hand, your figure climbing in), **leaderboards**, and — the key move — as the **playable hero in every cabinet**, re-skinned per shop (barista apron, delivery helmet, tool belt). **Shop outfits unlock by playing that cabinet**, pulling players across the arcade. Unlocks flow from the platform reward economy (points/streaks/badges) — **cosmetic only, never power**.

## Unified pixel lobby
Rebuild the front door as the pixel chooser: a **category rail** (Action / Puzzle / Arcade / Classic / Reflex / Strategy / Zen) spanning **both** lines, a **player-profile card** (avatar · level · ★ · badges), game cards with cover art + difficulty + Daily flag, and a **bottom nav** (Home / Leaderboard / Achievements / Favorites). Circular games get a light pixel reskin to sit natively.

## Leaderboards &amp; rewards spine
- **Leaderboards:** Daily + all-time per game, keyed to avatar + name; friends/territory later.
- **Reward events:** first play, daily streak, level/world clears, boss kills, personal bests → **platform points** buying **avatar cosmetics + real-shop perks** (the moat). Assisted/perked runs stay **off** the ranked board (consistent with what's already live).
- **Achievements/badges** per cabinet (this is the long-deferred Badge Phase 2 finally landing).
- **Anti-cheat:** the client engine is untrusted; the server validates submitted scores.

## Mobile &amp; accessibility
16-bit is landscape; phones are portrait — so a **rotate prompt / portrait-fit + on-screen controls** per cabinet, honoring the **two-thumb** rule (move *and* act at once). Colorblind-safe palettes, **reduced-motion** (CRT/shake off — engine already reads the setting), assist difficulty, and a CRT toggle for low-end devices.

---

# Part 3 — The 10 Cabinets

| # | Cabinet | Shop | Homage | Round hero | Signature twist |
|---|---|---|---|---|---|
| 1 | **Cuppa Rush** | Coffee | Tapper | Mugs / beans | Mugs are physics objects — bank-shots off the bumper; boss "regulars" order combos |
| 2 | **Slice Route** | Pizza | Paperboy | Pizzas / wheels | Branching streets — pick your route at forks for risk/reward; weather worlds |
| 3 | **Rummage** | Thrift | Pac-Man | A vintage button | The rack-maze reshuffles as you clear it; outfit power-ups (speed, disguise, magnet) |
| 4 | **Dozen** | Donut | Q*bert | The donut | Color-mix glazes — multi-hop to a target flavor; moving/conveyor crates |
| 5 | **Fresh Batch** | Bakery | Donkey Kong | Pie-tins / bagels | Grab-and-throw rolling pins; destructible obstacles; risky top-shelf bonuses |
| 6 | **Sundae Stack** | Ice-cream | Tetris | The scoops | Flavor-match combos on top of line-clears; per-level "build this sundae" goals |
| 7 | **Spin City** | Record | Marble Madness | The vinyl | The record *plays the level's track* — tempo is your time pressure; groove rails |
| 8 | **Taco Stack** | Taqueria | BurgerTime | Tomatoes / lime | Lime is weapon **and** combo builder; a spicy meter; order tickets set build priority |
| 9 | **Fix-It** | Hardware | Fix-It Felix Jr. | Bolts / wrecking ball | The wrecker adapts to your patterns; power-tool upgrades; renovation bonus rounds |
| 10 | **Spin Cycle** | Laundromat | Puzzle Bobble | Soap bubbles | The drum **rotates** the bubble grid; suds hazards; a bleach color-bomb |

Each cabinet targets **~20–40 stages across 3 themed worlds**, a **boss every ~6–8 levels**, and a **new mechanic introduced per world**. Endless not required; the **Daily** is a fixed daily seed.

---

# Part 4 — Definition of Done (per cabinet)

Every cabinet ships only when all of this is true:

- [ ] Engine extends **RetroEngine (16-bit)**; round hero rendered with `ball()` shading.
- [ ] **3 worlds, ~20–40 progressive levels**, a boss cadence, new-mechanic-per-world.
- [ ] The **signature twist** is in and fun.
- [ ] **Juice pass** — shake, particles, hitstop, combo popups, transitions.
- [ ] **Your avatar** is the playable hero, with the shop outfit + its unlock wired.
- [ ] **Original music** — theme + boss variant + game-over jingle, dynamic layering.
- [ ] **Insert-Coin cutscene** wired on launch (skippable after first view).
- [ ] **Daily** challenge live (fixed seed) + leaderboard submit + reward events.
- [ ] **Two-thumb mobile controls** + portrait handling + reduced-motion respected.
- [ ] `tsc` clean, verified in-browser (0 console errors), lazy-routed in the lobby.
- [ ] **Plan + Linear updated, and pushed to Render** (auto-deploy) — done every cabinet.

---

# Part 5 — Project Plan

## Phase 0 · Foundation
Build once; everything depends on it. The avatar rig is a hard dependency for cabinets (the hero *is* your avatar), so it lands before cabinet #1.

- [ ] **RetroEngine (16-bit kit + CRT)** — pixel buffer, shaded draw kit, pixel font, fixed-timestep, input.
- [ ] **MusicKit** — layered chiptune, dynamic layering, Main Street leitmotif.
- [ ] **Avatar system + customizer** — toy figure, customization axes, per-shop outfit rig + unlock hooks.
- [ ] **Insert-Coin cutscene** — reusable, skippable, attract/demo mode.
- [ ] **Unified pixel lobby** — category rail, player-profile card, game cards, bottom nav; circular-line pixel reskin.
- [ ] **Leaderboards &amp; rewards wiring** — Daily/all-time, reward events, server-side score validation.
- [ ] **Cuppa Rush POC** — the first cabinet, proving the entire stack end-to-end (**M0**).

## Phase 1 · The 10 cabinets
Built in batches, each meeting the full Definition of Done. **After every cabinet: update the plan + Linear and push to Render.** Suggested order (recommended-first three prove the range early):

1. **Cuppa Rush** (POC) · 2. **Slice Route** · 3. **Spin Cycle** · 4. **Rummage** · 5. **Dozen** · 6. **Sundae Stack** · 7. **Fresh Batch** · 8. **Taco Stack** · 9. **Spin City** · 10. **Fix-It**.

## Phase 2 · Meta &amp; polish
- [ ] Achievements/badges catalog (auto thresholds) per cabinet.
- [ ] Avatar cosmetic-unlock catalog + **reward "skin packs"** a business can hand out.
- [ ] Sponsorship/skin hooks — a real shop adopts its matching cabinet + attaches a perk.
- [ ] Social — share your score/avatar card; race the Daily #1 "ghost."
- [ ] Seasonal / limited-time skins + a rotating "cabinet of the week."
- [ ] Full accessibility &amp; performance pass across all cabinets.

## Milestones
- [ ] **M0** — Foundation done + Cuppa Rush playable end-to-end (engine, music, cutscene, avatar-hero, Daily, lobby entry).
- [ ] **M1** — First 3 cabinets live (Cuppa Rush, Slice Route, Spin Cycle) + lobby unified.
- [ ] **M2** — All 10 cabinets live.
- [ ] **M3** — Meta &amp; polish complete (achievements, sponsorship, social, seasonal, a11y).

---

# Part 6 — Risks &amp; Notes

- **Scope is real** — each cabinet is a full level-based arcade game with music and avatar art; batches of a few, not a sweep. Procedural generation + hand-tuned seeds keep level content scalable.
- **Foundation-heavy Phase 0** — the avatar rig, MusicKit, cutscene, and unified lobby all precede cabinet #1. This is deliberate: it makes every later cabinet cheap and consistent.
- **CRT + juice on mobile** — keep the post-process cheap; everything toggleable.
- **Fairness** — rewards are cosmetic/perk only; assisted runs stay off ranked boards; the server validates scores.
- **Stay original** — original names/art/audio/themes throughout; homage the mechanics, never the trademarked assets.

---

*Ready to build: Phase 0 (RetroEngine 16-bit + MusicKit + Avatar system + Insert-Coin cutscene + unified lobby + Cuppa Rush POC) is milestone M0.*
