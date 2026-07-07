# CIRQLSPACE — Your Sandbox · Build Plan

**"Your CIRQLSPACE is yours — a blank world you paint, build, grow, and throw parties in. The rest of the game lives out in the Town and the endless wilds."**

A major new chapter for the CIRQL flagship. **CIRQLSPACE (ring 0) is reinvented as the player's blank, personal, fully-buildable Minecraft-like sandbox.** All *game* content moves out to an authored **Town** (ring 1); procedural exploration begins at **ring 2**. The concentric ocean finally *means* something:

> **ring 0 = you · ring 1 = the community (Town) · ring 2+ = the endless wilds.**

Status (2026-07-07): **BUILDING — ✅ A + ✅ B + ✅ C + ✅ D + ✅ E + ✅ H complete.** Phase H shipped free-sit, live zoom, the tilted-3/4 diorama + postcard (commits 8e8d5ce, 5ea4896, 716a434). **The project grew past the personal sandbox into the whole world → Chapter 2 added (I · Character Movement & Life · J · Living Circles/World Population · K · Quests, NPCs & Campaigns), informed by a fresh Mana World re-read.** Still queued: F (Town stores), G (Music), + the new I/J/K. **Recommended order: I → J → K → F → G** (see Sequence). *3 decisions pending owner: sequence, progression currency, real-tap moat.* Owner approved the vision + the phase plan below; build proceeds phase by phase. Phase E shipped CIRQLSPACE live parties (personal space rooms, host-build streaming to visitors, open↔invite toggle + cap 8 + host-only edit; commit 395dc6a). This plan mirrors the Linear project **"CIRQLSPACE — Your Sandbox"** (team CHR). Regenerate the PDF whenever this plan or the Linear register changes (owner standing request).

---

## Why this pivot
The old ring-0 "home with stuff on it" (cottage, arcade door, quests, trees, the business landmarks) cluttered the personal space and mixed *your* place with *the game*. Splitting them:
- **CIRQLSPACE = pure self-expression** — customize it, show it off, host parties. A status symbol + a creative outlet.
- **The Town = where the game lives** — quests, stores, the arcade door, NPCs, the how-to.
- **The real-world tie becomes the economy, not scenery.** Retire the in-world business landmarks (off-concept, cluttered). Instead: real rewards + games + quests + campaigns earn **SPARQS**, and SPARQS build your space (décor + land). A cleaner, more monetizable moat.

## Locked decisions (owner, 2026-07-07)
- **Full sandbox:** paint the **ground** (terrain tiles) *and* place **objects**.
- **Placement:** free-form + an **optional grid snap**.
- **Live parties:** your CIRQLSPACE is a **shared instance** friends gather in; host toggles **open (anyone online) ↔ invite-only**; **cap 8**; **host-only editing** (visitors hang out / chat / emote).
- **Catalog launches BIG** — nature + structures + furniture, lots of items.
- **Growth:** start **cozy**, expand outward in **~6–8 SPARQS-priced tiers** (escalating) + a few **free milestone unlocks** (finish the build tutorial / host first party / N visitors); a hard **estate cap** (save + party-stream perf). **First 2–3 tiers reachable through play alone**; the big estate tiers are the long SPARQS haul.
- **Décor/objects are CIRQLSPACE-only** — cannot be placed on the Town or the wilds (would interfere with gameplay).
- **Onboarding:** spawn on your blank space → a **guide NPC** teaches *building* → the how-to then lives in your **Inventory** (owned stock + SPARQS balance + guide pages). Movement/interact tutorials move to the **Town**.
- **Monetize** décor + land via SPARQS earned through rewards programs, other games, quests, campaigns.

## The economy loop (the moat)
```
play games · finish quests/campaigns · earn real-world rewards (taps)
        └──▶ SPARQS  (banked server-side in the `sparqbank` wallet)
                 └──▶ buy décor + expand land at the Town store
                          └──▶ build your unique CIRQLSPACE
                                   └──▶ friends visit + party  ──▶  (they want one too)
```
Foundations already shipped in "CIRQL — Flagship World": the `sparqbank` wallet (arcade already earns SPARQS), the décor place/persist system, single-visitor visiting, presence/chat/emotes.

---

## Phases (milestones) & issues

### A · Restructure — blank CIRQLSPACE + Town  *(the foundation)*
- **CHR-266 — Strip CIRQLSPACE to a blank buildable canvas.** Remove ring-0 pre-placed content (cottage, CirqlCade door, trees/ponds/flowers/rocks/paths/lanterns, Sunken Runes, markers, Commons). Keep only a **guide NPC** + a **dock**.
- **CHR-267 — Author the Town hub at ring 1.** Move CirqlCade, quest-givers (Ferra), the Commons, the Sunken Runes, onboarding here. Shops land here later (F).
- **CHR-268 — Shift procedural generation to start at ring 2.** Ring-gen indexing, docks (Town↔ring 2), minimap/sea-chart counting, cross-ring quests/campaigns.
- **CHR-269 — Rework onboarding.** Guide NPC teaches *building*; movement/interact tutorials move to the Town.
- **CHR-270 — Inventory panel.** Owned/placeable stock + **SPARQS balance** + **how-to/guide pages**.
- **CHR-271 — Remove business landmarks + enforce CIRQLSPACE-only placement.** Retire CHR-261; harden the ring-0-only rule.

### B · Building v1 (objects)
- **CHR-272 — Big placeable catalog.** Nature (trees/ponds/flowers/bushes/rocks/grass), structures (paths/fences/walls/arches/bridges/gates), furniture (benches/lamps/fountains/statues/banners), themed sets. Data-driven (expand `cirql-decor.ts`); SPARQS-priced.
- **CHR-273 — Placement: free-form + optional grid snap; move/rotate/remove.** A proper build-mode UX.
- **CHR-274 — SPARQS buy→place economy + Inventory stock.** Buy with SPARQS (from the `sparqbank` wallet); owned → placeable stock. Balance the earn↔price curve.
- **CHR-275 — Object caps + compact save encoding.** Per-space cap; compact `{id,x,y,rot}` serialization; small enough to stream to party visitors.

### C · Terrain paint  *(Linear issues pending — free-tier cap; tracked here)*
- **C1 — Ground tilemap model + compact save encoding.** A tile-grid over the buildable area; run-length/packed encoding; default grass; grows with the land.
- **C2 — Paint brush UI.** Pick a tile (grass/sand/stone/water/path) + brush size; a build-mode with **paint + place** tabs; mobile-clean.
- **C3 — Water = non-walkable (collision) + render layer.** Water tiles block walking; terrain renders under objects, tinted per tile with soft blended edges.

### D · Land growth (cozy → estate)  *(Linear issues pending — cap)*
- **D1 — Cozy start + expansion tiers.** ~6–8 tiers widening the buildable land; **SPARQS-priced, escalating**.
- **D2 — Milestone unlocks + estate cap.** Free tiers via *tutorial done / first party / N visitors*; first 2–3 reachable by play; hard cap for perf.
- **D3 — Expansion UX + new-land-as-blank.** Buy/unlock flow; new land arrives blank grass, ready to paint/build; growth is visible (status symbol).

### E · Live parties  *(Linear issues pending — cap)*
- **E1 — Space rooms on presence.** A room per CIRQLSPACE keyed by host id (extend `server/cirql-presence.ts`); join/leave.
- **E2 — Stream the host build to visitors.** Send terrain + objects on join so everyone sees the same space live.
- **E3 — Open/invite toggle + cap 8 + host-only edit.** Host sets open↔invite-only; visitors move/chat/emote but can't edit.
- **E4 — Live presence in a space + return home.** Remote avatars/movement/chat/emote scoped to the space; a way back to your own.

### F · Town stores (NPC shops)  *(Linear issues pending — cap)*
- **F1 — Shop buildings → interiors + shopkeeper NPCs.** Walk into a Town shop (reuse the sub-map primitive) → an NPC.
- **F2 — Store inventory model.** Common pool + per-store **exclusives** + super-special SPARQS items (wings, witch hats, staffs).
- **F3 — Store panel + buy flow (replaces menu-buying).** Buying always means visiting a shopkeeper.
- **F4 — Quest-gated / hidden stores.** Some shops open only after a quest/clue.

### G · Music & SFX  *(Linear issues pending — cap)*
- **G1 — CIRQLSPACE MusicKit.** Adaptive, area-varied, **hybrid** (chiptune melody over ambient pads). Attach to the existing retro-engine `MusicKit` framework.
- **G2 — Action + movement SFX.** place / paint / buy / sail / jump / emote / quest / party. Procedural, no audio files.
- **G3 — Mix/mute controls + integration.**

### H · Sit, Zoom & Diorama — gather + show off your CIRQLSPACE  *(owner-added 2026-07-07; pulled ahead of F/G · Linear issues pending — cap)*
A distinct theme from F/G — it touches the engine camera, presence (a new `pose` field), and the UI. Turns CIRQLSPACE from a place you *walk across* into a place you *linger in and show off*. All four locked with the owner (see below).
- **H1 — Sit (free-sit pose).** A toggle button drops your avatar into a seated pose **anywhere**; any movement input stands you back up. Add a room-scoped **`pose`** field to `/ws/cirql` presence (rides on the Phase E rooms) so everyone in the space sees you seated; remote avatars render the seated pose. **Purely social** — the "gather round the campfire" fantasy, best friends with live parties (E).
- **H2 — Live zoom (continuous).** Pinch (mobile) / scroll + buttons (desktop) smoothly scale the world camera from character-level all the way out to the whole island. A clamped **`zoom`** factor on the `CirqlWorldEngine` world→screen transform; the existing view-cull handles the wider frame. **Doubles as tap-to-travel** when zoomed out (reuse `moveTarget`).
- **H3 — Diorama beauty shot (tilted 3/4).** One tap **sweeps** the camera up and back into a framed **tilted 3/4 "physical model"** view of your whole CIRQLSPACE. Technique = *tilt only the ground, keep everything on it standing up*: **vertical-squash the ground plane** (island disc + terrain tiles + shadows, ~0.6× Y), **billboard** props + avatars upright from their projected base (no skew — flatters the flat art, Don't-Starve-style), a **dark thickness band** under the disc rim (a floating *chunk* of land, not a decal), a **slow auto-orbit** around center (the wow — thickness catches light from changing angles), plus **vignette + float-shadow + drifting clouds + golden-hour light**. Painter's-order draw by projected depth. A **postcard label** ("<name>'s CIRQLSPACE · Tier N · P pieces").
- **H4 — Postcard share.** Capture a diorama frame → a shareable **postcard** image with the label baked in; **SPARQS-bought frames/filters** as cosmetic sinks. Folds into the party loop (host zooms out to "give the tour"; the postcard is the thing friends want to make too).

**Locked decisions (owner, 2026-07-07):** free-sit anywhere (social only, no perk) · **both** zooms (continuous *and* the one-tap beauty shot) · beauty shot = **tilted 3/4 diorama** (not top-down glam) · **shareable postcard** designed in from the start.

---

# Chapter 2 — The Living World  *(owner-approved 2026-07-07; the project grew past the personal sandbox into the whole CIRQLVERSE)*

The sandbox (A–H) made *your* island great. Chapter 2 makes the **whole world around it** feel alive, authored, and endless — informed by a fresh re-read of The Mana World (quests, world-population/mapping, character animation). Guiding idea: **population, quests, and movement are one system** — a landmark is simultaneously a quest anchor, a diorama/postcard subject, and a place to gather; biome flavor makes the world *and* the character come alive together. **Design pillar: fully cozy — no combat/monster-grinding; "boss" beats are cooperative set-pieces (relight a beacon, rebuild after a storm), not fights.**

### I · Character Movement & Life  *(cheap, engine-side, elevates everything — recommended FIRST of Chapter 2)*
TMW's own move set is thin (stand/walk/sit/dead/attack) — its useful gift is the **pattern**: one-shot action → auto-return-to-stand, directional with a "default" fallback. We're already ahead (walk/run/hop/sit/emotes/sail); this layers on the flourishes that make movement *feel* amazing.
- **I1 — Idle life.** Breathing sway + blink + occasional random idle fidgets (look around / stretch / foot-tap / yawn) when standing still; an **AFK doze** (auto-sit + "Zzz") after a long idle. *The single biggest "alive" upgrade.*
- **I2 — Movement juice.** Turn-in-place (re-face without stepping); footstep FX (dust on run, ripples/splash in water, footprints in sand/snow); squash-on-land after a hop; a small recoil-bump on solid collision.
- **I3 — Body-gesture emotes.** Extend the emote wheel from head-icons to **the body doing it**: wave, bow, clap, cheer, point, shrug, nod, twirl, dance, blow-a-kiss (heart particle), facepalm. Reuses the emote motion system.
- **I4 — Paired social gestures.** Two nearby players → synced **high-five / hug / dance-together** (reuse the "share a light" pairing handshake); **sit-together** facing each other at a bench/campfire.
- **I5 — Biome movement flavor.** Movement that reacts to the world: wade + splash in shallow water, slide on tundra ice, footprints in snow/sand, shiver + breath-puff in cold, brow-wipe in desert, aura/cape flutter in wind. *(Double-win with J.)*
- **I6 — World interactions.** Crouch to **pet a critter** (heart pops); hold/present an item (carry a lantern, hold up a caught fish); a knock/wave entering a shop or sub-map.
  - *(Deferred/bigger: dodge-roll, real swim in deep water, glide/float-down in cloud sub-maps, rideable companion.)*

### J · Living Circles — World Population  *(the substrate + landmarks that quests hang on)*
Encode TMW's hand-authored "taste" as **generator rules** so every ring 2→∞ comes out lush. All client-side (generator + art); no server. TMW mapping rules adopted: never leave the base bald · break monotony with scatter · organic never-grid clusters · design focal points · frame the edges · depth via fore/over layers.
- **J1 — Biome Kit.** A reusable per-biome palette — **signature plant + critter + structure + ground/light** — with placement rules (cluster/jitter/frame/focal). Biomes: Meadow · Woodland · Dunes · Tundra · Marsh · Coast · Highland · Starfall (magical). The engine of everything below.
- **J2 — Liveliness checklist in the generator.** Every ring must pass: full ground treatment (no bald patches) · 1–2 focal landmarks · its signature trio present · organic clusters + a winding path · a framed shoreline · one open gathering clearing · depth (foreground overlap + horizon silhouettes) · ambient motion · day/night variation.
- **J3 — Richer prop + groundcover palette.** Groundcover (tufts/clover/pebbles/moss/leaves/ripples/drifts) so nothing is one flat colour; expanded flora/water/rock/structure sets; fore/over depth layers; day↔night dressing.
- **J4 — Focal landmarks (hand-authored set-pieces).** Great Tree, stone circle, waterfall grotto, sunken ruin, lighthouse, festival ground, giant crystal — memorable anchors that **double as quest homes + postcard subjects + meeting spots**.
- **J5 — Ambient-life expansion.** More critters + little behaviours (graze/flit/scurry/perch/splash) + night swaps (glowmoths/fireflies); interactive with I6.
- *(Pairs with the pending [Cirql City glow-up](cirql-city) lighting/particle/post kit: population + light = "modern but 16-bit, and alive.")*

### K · Quests, NPCs & Campaigns  *(the endless heart — depends on J's landmarks; shares NPC work with F)*
Layer authored content on the procedural base, using TMW's proven taxonomy + endless-by-structure loops (daily + seasonal refresh, prerequisite ladders, geographic gating). Our differentiator: the gating currency ties to the **real-world tap moat**.
- **K1 — NPC + dialog framework.** Reusable NPC actor + branching dialog + quest-state; **F (Town stores) consumes this** (a shopkeeper is an NPC + a shop panel).
- **K2 — NPC cast + onboarding-as-quest-chain.** A recurring, characterful cast (Cirqla, Ferra, a Cartographer, a Lighthouse Keeper, a Festival-Master, Town artisans, a wandering Bard, a far-ring Hermit). Onboarding = a Candor-style chain where each NPC teaches one system (build → sail → arcade → sit/emote → party), ending in a "First Circle" graduation.
- **K3 — Quest taxonomy engine.** Enrich `generateRingQuest` + author Town quests across all types: gather · deliver · talk-chain/mystery · puzzle (reuse Myst runes) · build/craft · explore · **photo (diorama camera as a quest verb)** · social/co-op.
- **K4 — Daily board + Renown ladder.** A Town daily board (3 rotating dailies, character-bound, resets daily → sparqs + streak); a **Renown** progression currency (TMW Boss-Points analogue) that gates advanced campaigns + exclusive stores + rare décor. *Renown/World-Energy also fed by real taps — the moat.*
- **K5 — Flagship multi-day / endless campaigns.** 5–10-stage, prerequisite-gated, cross-ring: **The Widening Sea** (spine; opens rings for everyone, advanced by real taps — endless), **The Lantern Line** (relight beacons ring by ring → co-op beacon finale), **The Cartographer's Circles** (chart + photograph every biome — endless), **Founding a Homestead** (builder ladder cozy→estate), **The Storm Season** (repeatable party rebuild). Co-op ones ride the existing party board.
- **K6 — Seasonal festivals.** Four time-boxed, yearly-recurring events with exclusive cosmetics: **Lantern Festival** (winter) · **Bloom** (spring seed-hunt) · **Starfall** (summer) · **Hollow Night** (autumn hidden-object).

**Open decisions for Chapter 2 (to lock with owner):** (1) build **sequence** across I/J/K/F/G; (2) **progression currency** — a new "Renown" vs reuse existing Cirql-lanterns / World Energy; (3) **real-tap moat** — wire "The Widening Sea" to real taps *now* vs stub/defer it (the tap→sparqs bridge was previously deferred).

---

## Sequence & shippability
**A** is the foundation everything sits on and ships first. Then **B** (objects) → **C** (terrain) → **D** (growth) → **E** (parties) → ✨**H** (sit/zoom/diorama) — **all DONE.** **Recommended Chapter-2 order: I (movement — cheap, independent, elevates everything) → J (population — builds the landmarks) → K (NPCs + quests; K1 builds the NPC framework) → F (Town stores — cheap once K1's NPCs exist, so it moves after K) → G (music — LAST, so it scores all the new content).** Each phase ships on its own and is verified in-browser. Build begins per phase on the owner's "go".

## Open threads (to settle as we reach each phase)
- Terrain **grid resolution** vs save/stream size; **object cap** number.
- **Catalog contents + pricing** (tie to SPARQS earn rates).
- **Starting plot size** + **estate cap** size; exact **expansion tier prices**.
- **Party** discovery/invite flow + moderation (minor-safe; reuses existing chat moderation).
- Fate of existing **onboarding quests** when moved to the Town.

## Notes / constraints
- Client-authoritative save (the `cirql` `game_progress` blob) holds terrain + objects + owned + land tier; multiplayer/party state is in-memory on `/ws/cirql`.
- **Linear free-tier issue cap** was hit while seeding issues — only milestones A & B have granular issues (CHR-266–275); C–G are captured at the milestone level in Linear + fully here. Upgrade Linear to add the rest as issues.
