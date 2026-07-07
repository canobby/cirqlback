# CIRQLSPACE — Your Sandbox · Linear Register

Project **CIRQLSPACE — Your Sandbox** · team Chris Nobbs (CHR). Live board: linear.app → CIRQLSPACE — Your Sandbox. Generated 2026-07-07 (rev 5). **Status: BUILDING — ✅ Phase A + ✅ B + ✅ C COMPLETE; next up Phase D (land growth).**

**Legend:** ☑ Done · ◐ In progress · ☐ Todo · ⧗ *not yet a Linear issue (free-tier issue cap) — tracked in the plan.*

## Summary
| Milestone | Issues | Status |
|---|---|---|
| A · Restructure — blank CIRQLSPACE + Town | 6 | ✅ **DONE (6/6)** |
| B · Building v1 (objects) | 4 | ✅ **DONE (4/4)** |
| C · Terrain paint | 3 ⧗ | ✅ **DONE (3/3)** |
| D · Land growth (cozy → estate) | 3 ⧗ | Todo |
| E · Live parties | 4 ⧗ | Todo |
| F · Town stores (NPC shops) | 4 ⧗ | Todo |
| G · Music & SFX | 3 ⧗ | Todo |

**Note:** Linear's free-tier **issue limit** was reached while seeding — milestones **A & B** have real issues (**CHR-266–275**); **C–G** exist as **milestones** in Linear with their scope, but their granular issues (⧗) live in the plan doc until the workspace is upgraded.

## A · Restructure — blank CIRQLSPACE + Town
- [x] **CHR-266** — Strip CIRQLSPACE to a blank buildable canvas *(commit 4c08acf)*
- [x] **CHR-267** — Author the Town hub at ring 1 (CirqlCade = one shared entrance) *(4c08acf)*
- [x] **CHR-268** — Shift procedural generation to start at ring 2 *(4c08acf)*
- [x] **CHR-269** — Rework onboarding: guide NPC teaches building; tutorials move to Town *(77ed7cf)*
- [x] **CHR-270** — Inventory panel — owned stock + SPARQS balance + how-to *(commit 45cfcf4)*
- [x] **CHR-271** — Remove tapped-business landmarks + enforce CIRQLSPACE-only placement *(963abbf)*

## B · Building v1 (objects)
- [x] **CHR-272** — Big placeable object catalog (~35 items, 6 categories; nature/structures/lights render as real pixel props) *(commit eb7b392)*
- [x] **CHR-273** — Placement: free-form + optional grid snap (# Grid) + Remove; category tabs *(eb7b392)*
- [x] **CHR-274** — SPARQS buy→place economy + Inventory stock *(eb7b392)*
- [x] **CHR-275** — Object cap 120 + compact {item,x,y} save encoding *(eb7b392)*
  - *(deferred within B: move/rotate placed objects — remove+re-place works for now)*

## C · Terrain paint  *(⧗ tracked here — Linear cap; ✅ built commit fcc8ac2)*
- [x] **C1** — Ground tilemap (sparse, TILE=30, grass default) + save encoding
- [x] **C2** — Paint brush UI: Place▸Paint toggle + tile swatches (grass/sand/stone/water/path) + brush sizes 1–3
- [x] **C3** — Water tiles non-walkable (per-axis slide-out) + terrain render layer (culled, shimmer)

## D · Land growth (cozy → estate)  *(⧗ issues pending — Linear cap)*
- [ ] **D1** — Cozy start + SPARQS-priced expansion tiers (escalating)
- [ ] **D2** — Milestone unlocks (tutorial / first party / N visitors) + estate cap
- [ ] **D3** — Expansion UX + new-land-as-blank

## E · Live parties  *(⧗ issues pending — Linear cap)*
- [ ] **E1** — Space rooms on presence (keyed by host id) + join/leave
- [ ] **E2** — Stream the host build (terrain + objects) to visitors
- [ ] **E3** — Open/invite toggle + cap 8 + host-only edit
- [ ] **E4** — Live presence in a space (movement/chat/emote) + return home

## F · Town stores (NPC shops)  *(⧗ issues pending — Linear cap)*
- [ ] **F1** — Shop buildings → interiors + shopkeeper NPCs
- [ ] **F2** — Store inventory model (common + exclusives + special SPARQS items)
- [ ] **F3** — Store panel + buy flow (replaces menu-buying)
- [ ] **F4** — Quest-gated / hidden stores

## G · Music & SFX  *(⧗ issues pending — Linear cap)*
- [ ] **G1** — CIRQLSPACE MusicKit — adaptive hybrid music (area-varied)
- [ ] **G2** — Action + movement SFX
- [ ] **G3** — Mix/mute controls + integration
