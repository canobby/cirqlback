# CIRQLSPACE — Your Sandbox · Build Plan

**"Your CIRQLSPACE is yours — a blank world you paint, build, grow, and throw parties in. The rest of the game lives out in the Town and the endless wilds."**

A major new chapter for the CIRQL flagship. **CIRQLSPACE (ring 0) is reinvented as the player's blank, personal, fully-buildable Minecraft-like sandbox.** All *game* content moves out to an authored **Town** (ring 1); procedural exploration begins at **ring 2**. The concentric ocean finally *means* something:

> **ring 0 = you · ring 1 = the community (Town) · ring 2+ = the endless wilds.**

Status (2026-07-07): **BUILDING — ✅ A + ✅ B + ✅ C + ✅ D + ✅ E complete; owner pulled ✨ Phase H (Sit, Zoom & Diorama) ahead as the next build; F (Town stores) + G (Music) still queued.** Owner approved the vision + the phase plan below; build proceeds phase by phase. Phase E shipped CIRQLSPACE live parties (personal space rooms, host-build streaming to visitors, open↔invite toggle + cap 8 + host-only edit; commit 395dc6a). This plan mirrors the Linear project **"CIRQLSPACE — Your Sandbox"** (team CHR). Regenerate the PDF whenever this plan or the Linear register changes (owner standing request).

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

## Sequence & shippability
**A** is the foundation everything sits on and ships first. Then **B** (objects) → **C** (terrain) → **D** (growth) → **E** (parties) → ✨**H** (sit/zoom/diorama — owner pulled ahead) → **F** (stores) → **G** (music). Each phase ships on its own and is verified in-browser. Build begins per phase on the owner's "go".

## Open threads (to settle as we reach each phase)
- Terrain **grid resolution** vs save/stream size; **object cap** number.
- **Catalog contents + pricing** (tie to SPARQS earn rates).
- **Starting plot size** + **estate cap** size; exact **expansion tier prices**.
- **Party** discovery/invite flow + moderation (minor-safe; reuses existing chat moderation).
- Fate of existing **onboarding quests** when moved to the Town.

## Notes / constraints
- Client-authoritative save (the `cirql` `game_progress` blob) holds terrain + objects + owned + land tier; multiplayer/party state is in-memory on `/ws/cirql`.
- **Linear free-tier issue cap** was hit while seeding issues — only milestones A & B have granular issues (CHR-266–275); C–G are captured at the milestone level in Linear + fully here. Upgrade Linear to add the rest as issues.
