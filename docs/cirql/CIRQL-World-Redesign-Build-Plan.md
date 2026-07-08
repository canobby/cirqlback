# CIRQL — World Redesign · Hybrid Build Plan

*The step-by-step guide to rebuilding CIRQL's look as a **hybrid**: real Cute-Fantasy **tiles + sprites for the solid world & actors**, our **procedural engine for the light/magic/FX layer**. Ordered so we always have a working game and see each piece before committing the next. Structured as an epic + phased issues (Linear-ready). Story: `CIRQLSPHERE-The-Rekindling.pdf`.*

> **Golden rules:** (1) build a **vertical slice on ONE island first**, react, *then* roll out. (2) Systems (quests, movement, economy, pets, Renown, lore) survive — only the **art layer** changes. (3) Tiles = crafted world; **procedural = light & magic on top.** (4) Assets live at `Desktop\Cute Fantasy Asset Pack\` (1,243 PNGs, 16×16). Ignore `*_Old` folders.

---

# ⭐ EPIC — CIRQL Hybrid World Redesign

Rebuild the flagship world to a cohesive SNES/cozy-fantasy look using Cute Fantasy tiles+sprites for everything solid, keeping procedural for light/effects — and reframe the world as **relightable ring-islands** (*The Rekindling*). Deletes the old code-drawn ring/creature/building art; keeps all systems.

**Children:** P0 Foundation · P1 Tile-slice · P2 Actors · P3 Light layer · P4 Tile-painting ring-gen · P5 Rollout · P6 Light-combat · P7 Systems · P8 Story · P9 Cohesion & polish.

---

# P0 — Foundation: assets + the hybrid renderer *(the keystone)*
*The one-time engine build everything else stands on.*

- [ ] **Import assets** — copy the needed Cute Fantasy sheets into `client/public/assets/cute-fantasy/` (served statically). Keep a manifest of which sheet = what.
- [ ] **Tileset loader** — load spritesheets, slice into a 16×16 tile atlas (id → sub-rect), preload before a ring renders.
- [ ] **Tilemap data model** — per-ring multi-layer grid: `ground / decor / objects / overhead`, each a 2D array of tile ids. Depth: overhead draws over the player.
- [ ] **Tilemap renderer** — blit visible tiles per layer through the existing supersample pipeline; cull offscreen; keep the 16px look crisp on upscale.
- [ ] **Autotiling** — pick edge/corner tiles from neighbours (grass↔water↔path↔cliff) so terrain blends (the pack ships transition tiles).
- [ ] **Sprite/animation system** — animated sprites (player/NPCs/animals/enemies): frame sheets, 4-direction walk, per-entity animation state; depth-sort with objects.
- [ ] **Tile collision** — walkability from tile data (water/cliffs/walls solid); replace the circular-clamp path for tiled rings.
- [ ] **Keep the light layer hook** — a post-pass where procedural glow/particles draw *over* the tilemap (P3 fills it).

---

# P1 — The tile-slice: rebuild ONE island (meadow / Cloverfield)
*Prove the hybrid before touching anything else.*

- [ ] Hand-author one meadow island as **tile maps** (ground/decor/objects) using the pack: grass, cliffs (the plateau rim), a village of houses, a road, a dungeon entrance, trees/flowers for density.
- [ ] Place the **wellspring + river + waterfall** as water/waterfall tiles; add the **procedural light** on top (P3 preview: glow, rising motes, cascade shimmer).
- [ ] Drop in the **player sprite** walking, a few **animals**, a couple **villager NPCs**.
- [ ] **Review checkpoint with owner.** Tune density, palette, tilt. Only proceed if the slice sings.

---

# P2 — Actors (customization kept)
- [ ] **Modular player** — assemble the paper-doll from `Player_Modular` (base + hair + clothes + hands + tools); wire the existing avatar choices to swap layers → *build-your-own survives*.
- [ ] **Player animations** — idle / walk (4-dir) / the light-strike / roll; from the pack sheets.
- [ ] **Animals** — the 16 pack animals as roaming sprites (reuse our creature AI: graze/wander/flee/pet). Map our pet system to pack sprites.
- [ ] **NPCs / villagers** — pack NPC sprites for keepers, villagers, shopkeepers.
- [ ] **Custom-creature toolkit** — a script to recolor/recombine/flip/scale pack sprites → in-style variants + Grey-corrupted versions.

---

# P3 — The procedural light & magic layer *(our creativity lane)*
*Drawn over the tiles — where procedural shines and the theme lives.*

- [ ] **Wellspring glow** + rising light-motes at the village heart.
- [ ] **River-of-light** shimmer along the water tiles; **waterfall** glow/mist over the rim.
- [ ] **Grey-corruption overlay** — a desaturating/darkening pass to render an island "in the grey," and its retreat when relit.
- [ ] **Ambient particles / weather / day-night light** re-plumbed over the tilemap.
- [ ] **The "relight" bloom** — the set-piece FX when a wellspring/island is restored (colour floods back).

---

# P4 — Procedural tile-painting ring-gen + placement grammar
*Turn our procedural generator from "scatter code-props" into "paint tile maps."*

- [ ] **Tile-painting generator** — per island, paint ground/water/cliff/path tiles + autotile, deterministically from the index.
- [ ] **Placement grammar (logical, spread-out)** — each landmark has a "wants-to-be-near" rule: **lighthouse→headland/bay, windmill→river, fisherman's house→cove, shrine→hilltop, ruins→high ground, farm→open field.** A village hub + logically-placed outliers + pockets, connected by the road; NPCs/quest-starts spread, not bunched.
- [ ] **Varied rim** — bays/coves, cliffs, beaches, and the tablecloth cascades placed as anchors (bay = lighthouse+dock; cascade = waterfall overlook).
- [ ] **Density** — pack decoration tiles thickly (your "stuff everywhere"), calm between pockets. Quest prop **ids preserved** so nothing breaks.

---

# P5 — Rollout: the rest of the world
- [ ] **All wild islands** — run the tile-painting gen across rings; **palette-recolor** the base sets for biomes without a bespoke tileset (snow/desert/canyon/savanna/aurora); use Volcano (ember), ShroomLands (marsh), Autumn as-is.
- [ ] **Interiors** — rebuild shop/home interiors with `Houses_Interiors` tiles (retire the code-drawn rooms).
- [ ] **Mazes/sub-realms** — rebuild caves/dungeons with `Dungeon_1/2/3` + `Walls` tiles (retire the code-drawn maze render).
- [ ] **CIRQLSPACE + Town** — retrofit ring 0 (personal wellspring) and ring 1 (the friendly hub) to tiles.

---

# P6 — Light-cleansing combat *(non-lethal)*
- [ ] **The light weapon** — aim (crosshair UI) + strike + a light projectile/arc; dodge/roll.
- [ ] **Grey-touched enemies** — pack enemies with a "corruption meter" (not HP); simple AI (wander/approach/telegraph).
- [ ] **Relight, don't kill** — a cleansed enemy floods with colour and wanders off free (never a death). Reward = light/sparqs.
- [ ] **Encounter design** — gentle, optional-ish, all-ages; woven into dungeon/island sagas.

---

# P7 — Systems on the new foundation
- [ ] **Camera / 2.5D tilt** — subtle oblique + parallax + elevation, with a **Settings slider (incl. flat)**.
- [ ] **Cinematic camera rig** — tilt/orbit/dolly/zoom/letterbox for cutscenes (arrivals over the falls, relight reveals).
- [ ] **Codex / journal** — use `Book_UI` for the lore journal (grouped by thread, near-complete indicators). Persist codex (already fixed).
- [ ] **Oracle NPC** — one NPC: how-to helper + in-character lore, reads your codex, gives the next clue. (Server LLM endpoint, rate-limited, kids-safe/constrained.)
- [ ] **Living villages** — remember/grow on return (new stalls/faces/repairs) → the CIRQLBACK "circling back" feel.
- [ ] **Shore-growth world-event** — finishing an island's saga visibly grows/relights it on the chart.

---

# P8 — Story authoring (*The Rekindling*)
- [ ] **Island sagas** — author the mini-arc per island (arrive → village → the grey's wound → dungeon → relight → bloom); reuse ALL quest verbs as beats.
- [ ] **Through-line mystery** — the Makers' Scattering, the shards, the **Ashling** (sympathetic villain); seed clues → codex → thread rewards.
- [ ] **Endgame** — Cirql City / the grey heart: **relight (remember) the Ashling**, not destroy.
- [ ] **CUT the rides** — remove ferris/mine-cart/Drive-In; keep the **Fair** as a seasonal event.

---

# P9 — Platform cohesion & polish
- [ ] **Umbrella lore touches** — 1–2 lines placing CirqlCade (Mirth's Hall of Games), Cirql City (the grey city), CirqlBreak (origin myth), CIRQLBACK (the Bridge).
- [ ] **CIRQLBACK bridge** — surface "real-world light → SPHERE light" thematically (reward bridge exists).
- [ ] **Audio** — river/waterfall/ambient; per-island themes.
- [ ] **Deferred polish** — wordmark restyle; avatar inclusivity; retire the old avatar customizer UI in favor of the modular one.

---

## Suggested order

**P0 → P1 (review!) → P2 ∥ P3 → P4 → P1-review-informed tuning → P5 ∥ P6 → P7 → P8 ∥ P9.**

P0 + P1 are the make-or-break; everything after is repetition + content once the hybrid pipeline and one island look right.
