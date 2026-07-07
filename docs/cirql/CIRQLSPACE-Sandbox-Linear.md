# CIRQLSPACE — Your Sandbox · Linear Register

Project **CIRQLSPACE — Your Sandbox** · team Chris Nobbs (CHR). Live board: linear.app → CIRQLSPACE — Your Sandbox. Generated 2026-07-07 (rev 2). **Status: BUILDING — Phase A nearly done (5/6; only the Inventory panel remains).**

**Legend:** ☑ Done · ◐ In progress · ☐ Todo · ⧗ *not yet a Linear issue (free-tier issue cap) — tracked in the plan.*

## Summary
| Milestone | Issues | Status |
|---|---|---|
| A · Restructure — blank CIRQLSPACE + Town | 6 | **5/6 done** (CHR-270 left) |
| B · Building v1 (objects) | 4 | Todo |
| C · Terrain paint | 3 ⧗ | Todo |
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
- [ ] **CHR-270** — Inventory panel — owned stock + SPARQS balance + how-to  *(← next)*
- [x] **CHR-271** — Remove tapped-business landmarks + enforce CIRQLSPACE-only placement *(963abbf)*

## B · Building v1 (objects)
- [ ] **CHR-272** — Big placeable object catalog (nature / structures / furniture)
- [ ] **CHR-273** — Placement: free-form + optional grid snap; move / rotate / remove
- [ ] **CHR-274** — SPARQS buy→place economy + Inventory stock
- [ ] **CHR-275** — Object caps + compact save encoding

## C · Terrain paint  *(⧗ issues pending — Linear cap)*
- [ ] **C1** — Ground tilemap model + compact save encoding
- [ ] **C2** — Paint brush UI (tiles + brush sizes)
- [ ] **C3** — Water tiles = non-walkable (collision) + render layer

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
