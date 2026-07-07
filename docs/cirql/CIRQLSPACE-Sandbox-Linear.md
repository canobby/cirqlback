# CIRQLSPACE — Your Sandbox · Linear Register

Project **CIRQLSPACE — Your Sandbox** · team Chris Nobbs (CHR). Live board: linear.app → CIRQLSPACE — Your Sandbox. Generated 2026-07-07 (rev 9). **Status: BUILDING — ✅ A + ✅ B + ✅ C + ✅ D + ✅ E + ✅ H COMPLETE; F (Town stores) + G (Music) still queued.**

**Legend:** ☑ Done · ◐ In progress · ☐ Todo · ⧗ *not yet a Linear issue (free-tier issue cap) — tracked in the plan.*

## Summary
| Milestone | Issues | Status |
|---|---|---|
| A · Restructure — blank CIRQLSPACE + Town | 6 | ✅ **DONE (6/6)** |
| B · Building v1 (objects) | 4 | ✅ **DONE (4/4)** |
| C · Terrain paint | 3 ⧗ | ✅ **DONE (3/3)** |
| D · Land growth (cozy → estate) | 3 ⧗ | ✅ **DONE (3/3)** |
| E · Live parties | 4 ⧗ | ✅ **DONE (4/4)** |
| ✨ H · Sit, Zoom & Diorama | 4 ⧗ | ✅ **DONE (4/4)** |
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

## D · Land growth (cozy → estate)  *(⧗ tracked here — Linear cap; ✅ built commit 95fc3b6)*
- [x] **D1** — Cozy start + 7 tiers (buildable radius 170→430); effR() drives island render + edge-clamp + placement + paint
- [x] **D2** — Milestone unlocks (tier 1 free gift · tier 2 free after placing 10) + SPARQS tiers 3–6 (30/70/140/260) + estate cap
- [x] **D3** — "Your Land" Inventory section: current tier + progress bar + Expand (shows cost/milestone); new land blank
  - *(deferred: party/visitor milestones — arrive with Phase E)*

## E · Live parties  *(⧗ tracked here — Linear cap; ✅ built commit 395dc6a)*
- [x] **E1** — Space rooms on presence: ring 0 is personal (`s:`+id), visiting joins the host's room; one `roomKey()` scopes every broadcast; join/leave via `enterRoom()`
- [x] **E2** — `build` message caches + streams the host's décor + terrain + land tier to visitors (live `visit:build` while they watch)
- [x] **E3** — Open↔invite-only toggle (`space:mode`) + invites (`space:invite`/`space:invited`) + cap 8 + host-only edit (guarded by the `visiting` flag)
- [x] **E4** — Live presence in a space (room-scoped move/chat/emote/light) + `space:home` return; host disconnect evicts visitors
  - *(deferred: visitor land-milestones / party rewards — a later economy pass)*

## ✨ H · Sit, Zoom & Diorama  *(owner-added 2026-07-07, pulled ahead of F/G · ⧗ issues pending — Linear cap)*
Gather + show off your CIRQLSPACE. Locked: **free-sit** (social only) · **both** zooms · **tilted 3/4 diorama** · **shareable postcard**.
- [x] **H1** — Sit: free-sit toggle pose (anywhere; movement cancels); room-scoped `pose` on presence → seated render for self + remotes *(commit 8e8d5ce)*
- [x] **H2** — Live zoom: continuous pinch/scroll+buttons `zoom` on the world camera (0.42–1.3, clamped), doubles as tap-to-travel when zoomed out; builds snap to 1:1 *(commit 5ea4896)*
- [x] **H3** — Diorama beauty shot: one-tap sweep to **tilted 3/4** — ground-plane squash + billboarded props/avatars + island thickness band + slow orbit + vignette/float-shadow/clouds/golden light + postcard label *(commit 716a434)*
- [x] **H4** — Postcard share: capture the diorama frame → PNG; Web Share sheet on mobile, download on desktop (label baked in) *(commit 716a434)*
  - *(deferred: SPARQS-bought postcard frames/filters — a later cosmetic sink)*

## F · Town stores (NPC shops)  *(⧗ issues pending — Linear cap)*
- [ ] **F1** — Shop buildings → interiors + shopkeeper NPCs
- [ ] **F2** — Store inventory model (common + exclusives + special SPARQS items)
- [ ] **F3** — Store panel + buy flow (replaces menu-buying)
- [ ] **F4** — Quest-gated / hidden stores

## G · Music & SFX  *(⧗ issues pending — Linear cap)*
- [ ] **G1** — CIRQLSPACE MusicKit — adaptive hybrid music (area-varied)
- [ ] **G2** — Action + movement SFX
- [ ] **G3** — Mix/mute controls + integration
