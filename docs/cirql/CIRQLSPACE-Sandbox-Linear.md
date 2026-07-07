# CIRQLSPACE — Your Sandbox · Linear Register

Project **CIRQLSPACE — Your Sandbox** · team Chris Nobbs (CHR). Live board: linear.app → CIRQLSPACE — Your Sandbox. Generated 2026-07-07 (rev 17). **Status: BUILDING — ✅ A + ✅ B + ✅ C + ✅ D + ✅ E + ✅ H COMPLETE · 🎉 PHASE I COMPLETE (I1–I6) · PHASE J substantially DONE (J3 groundcover + day/night, J4 landmarks, J5 night life; J1/J2 mostly, a few polish bits deferred).** Chapter 2 (I/J/K — the living world) locked; order I → J → K → F → G. Decisions: new Renown + World Energy · tap-ready/wire-later · fully cozy. **▶ Next: Phase K — Quests, NPCs & Campaigns (K1 the NPC/dialog framework first; F/interiors consumes it — owner wants to design F together first).**

**Polish pass (owner-requested, 2026-07-07):** ① **prop contrast** — trees + bushes no longer blend into same-colour ground: foliage is a deepened biome-grass with a **dark rim silhouette** + a lit top highlight, so they always read; ② **zoom range widened** — 40%→**25%** min (whole island in view) and 130%→**150%** max; ③ **name tags cleaned** — removed the dark box behind character/NPC names; names now draw as **crisp outlined text** lifted clear of the head + emotes; ④ **NPCs got character** — new `cirql-npc-looks.ts` gives every townsperson a real look: coloured outfit + trim/sash, hair + headwear (hood/wide-brim/band/cap), and a signature accessory (staff/lantern/book/satchel/orb/flower). The named cast is hand-authored (Cirqla = hooded teal robe + glowing staff + aura; Ferra = terracotta coat + gold band + book); other keepers derive a **stable hashed look** so a ring's keeper always dresses the same. `drawNpc` rebuilt to paint it (rim silhouette + lit edges + idle breathing); ⑤ **startup location picker** — returning players get a **"Where to?"** panel (CIRQLSPACE home · Last spot · CirqlCade), the arcade card gated on Town-reached + a prior arcade visit (`arcadeVisited` flag), a **"start here every time"** remembered default (`startPref`), and a header **📍** button that reopens it as quick-travel. Engine `startAt()`.

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
| — *Chapter 2 · The Living World* — | | |
| I · Character Movement & Life | 6 ⧗ | ◐ **In progress (2/6)** |
| J · Living Circles — World Population | 5 ⧗ | Todo |
| K · Quests, NPCs & Campaigns | 6 ⧗ | Todo |
| F · Town stores (NPC shops) | 4 ⧗ | Todo *(after K1)* |
| G · Music & SFX | 3 ⧗ | Todo *(last)* |

**Note:** Linear's free-tier **issue limit** was reached while seeding — milestones **A & B** have real issues (**CHR-266–275**); the rest exist as **milestones** in Linear with their scope, but their granular issues (⧗) live in the plan doc until the workspace is upgraded.

**Confirmed sequence (owner, 2026-07-07):** **I → J → K → F → G.** I (movement) is cheap, engine-side, independent, and elevates everything → first. J (population) builds the landmarks that K's quests anchor to. K1 builds the NPC framework that **F consumes** → F after K. G (music/SFX) last so it scores all the new content. **Locked:** new **Renown** currency (personal, earned-not-spent) + keep shared **World Energy**; **tap-ready but wire real taps later**; **fully cozy — no combat.**

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

# Chapter 2 — The Living World  *(owner-approved 2026-07-07; from a fresh Mana World re-read of quests + world-population + character animation)*
Guiding idea: **population, quests, and movement are one system.** Fully cozy — no combat; "boss" beats are cooperative set-pieces.

## I · Character Movement & Life  *(recommended FIRST of Chapter 2 · cheap, engine-side · ⧗ issues pending — cap)*
- [x] **I1** — Idle life: breathing sway + blink + idle fidgets (look-around/stretch) + AFK doze (auto-sit + Zzz); remotes get local breath+blink *(commit eacdbe0)*
- [x] **I2** — Movement juice: footstep FX (dust/splash/footprints, world-space) · land squash · collision bump *(turn-in-place folded into I1's look fidget)* *(commit 1a34b1b)*
- [x] **I3** — Body-gesture emotes: grew the wheel to 16 (4×4) with real body motions — wave (waving hand), bow (tip+squash), clap (meeting hands + spark), cheer (both arms up), twirl (spin via scaleX), blow-a-kiss (hand + drifting heart), dance (side-to-side sway); shared by hero + remotes, reduced-motion aware *(commit pending)*
- [x] **I4** — Paired social gestures: a contextual **"Together with {name}"** panel when you stand by a traveller → High-Five / Hug / Dance / Sit. One request relays to BOTH (same room-scoped handshake as share-a-light, new `pair`→`paired`), each side turns to face the other + plays the synced I3 motion + a shared flourish blooms between them (spark / hearts / notes). Raw two-socket + in-browser verified *(commit pending)*
- [x] **I5** — Biome movement flavor: footsteps now read the ring's biome — pale lingering **snow** prints (winter), tan **sand** prints (desert/coast), dark **ash** puffs (ember), soft dust elsewhere; coast/tropical **shore-wading splash** near the edge; **ice-slide** (winter = slippery low-friction glide); **breath-puff + shiver** in the cold; **aura flutters on a per-biome wind**. All client-side, reduced-motion aware. Verified across winter/desert/coast/ember rings *(commit pending; literal cape flutter deferred — no cape asset; remotes stay simple like I1/I2)*
- [x] **I6** — World interactions: **pet a critter** (stand/sit still near an ambient critter → a ♥ floats over it), **present pose** (item-get: raise the item overhead with sparkles — fires on quest reward + cosmetic unlock; public `present(glyph,color)`), **wave/knock entering** a shop/sub-map (a wave gesture + a beat before CirqlCade / a portal opens). All client-side, reduced-motion aware. Verified in-browser *(commit pending)*
  - *(Deferred/bigger: dodge-roll · real swim · glide in cloud sub-maps · rideable companion.)*

**🎉 PHASE I COMPLETE (I1–I6).** Next in the locked order: **Phase J — Living Circles (world population)**.

## J · Living Circles — World Population  *(the substrate + landmarks quests hang on · client-side generator/art · ⧗ issues pending — cap)*
TMW mapping rules encoded as generator rules: never bald · break monotony · organic never-grid · design focal points · frame the edges · depth via layers.
- [~] **J1** — Biome Kit: each biome now carries a signature **palette + critter + landmark** (per-biome `landmark` field) + groundKind. *(Deferred: a distinct signature PLANT per biome — trees/flowers are shared today.)*
- [~] **J2** — Liveliness: every generated ring now passes most of the checklist — full ground (groundcover) · a focal landmark · a gathering clearing · docks · organic clusters + a path · ambient motion · day/night. *(A hard validator pass is deferred.)*
- [x] **J3** — **Groundcover** (per-biome tufts/clover/pebbles · snow · sand · ash, so no floor is bald) + **day↔night cycle** (cool-night grade capped so never pitch-black + warm dusk/dawn + night stars). *(fore/over depth layers deferred.)* *(commits aaeae3c, f791f7e)*
- [x] **J4** — **Focal landmarks**: per-biome set-pieces (Great Tree · Stone Circle · Lighthouse w/ sweeping beam · Great Crystal · Waterfall · Old Ruin) that double as meeting spots + quest homes; new `landmark` prop + `Visit` interact. Also unified place labels to clean no-box text. *(commit 7abeb2d)*
- [x] **J5** — **Night ambient**: drifting glowmoth/firefly life comes out after dusk on every biome (pairs with day/night). *(More per-critter behaviours graze/perch deferred.)* *(commit f791f7e)*

**Phase J substantially DONE** (groundcover + landmarks + day/night + night life). Deferred J bits (signature plants, fore/over depth, a validator, richer critter behaviours) can be a later polish pass. Next in the locked order: **Phase K — Quests, NPCs & Campaigns** (K1 the NPC/dialog framework first; F consumes it).

## K · Quests, NPCs & Campaigns  *(the endless heart · depends on J's landmarks · shares NPC work with F · ⧗ issues pending — cap)*
**▶ OWNER-LOCKED for K (2026-07-07): quests + campaigns scale with DISTANCE OUT (ring index = difficulty tier, like any RPG "levels").** Outward = **harder** (more objectives / longer chains / tougher puzzle configs / bigger co-op campaigns w/ more steps + larger parties) AND **higher reward** (sparqs + Renown scale up with ring). **Renown gates** the hardest outer content (elite campaigns, rare collectibles). Stays COZY — "harder" = longer/more intricate/more coordination, NOT combat-punishing (bosses = co-op set-pieces). Loop: sail further → tougher richer quests → more sparqs+Renown → unlock next outer tier. `generateRingQuest` already keys off ring index — extend it to ramp objective count/complexity + reward by index.
- [x] **K1** — **NPC + branching dialog framework DONE** (`29d3b97`): new `cirql-dialog.ts` — `DialogTree` (node graph: lines + player choices that goto/accept-quest/close); `simpleDialog()` (linear = 1 node) + `npcConversation()` (greeting hub + "About here" lore + optional quest offer + farewell). Engine dialog is node-based; `pickChoice()` branches, `drawDialog` renders tappable choice buttons w/ hit-rects. All NPCs/theater/runestone flow through it. Verified full branch (greeting→work→accept). **F/interiors + talk-chain quests consume this.**
- [~] **K2** — **Named NPC cast DONE** (`e71b440`): `cirql-npc-cast.ts` per-NPC profiles (voice + lore + teaching topics) via the K1 dialog framework. Cirqla + Ferra authored voices; NEW Town NPCs **Marin the Cartographer** (chart/exploration/fast-travel/zoom) + **Lio the Bard** (emotes/paired gestures/social), each with a distinct look. **+ CIRCLE GRADUATION** (`ba036b8`, owner-locked): sailing stays FREE, but finishing a ring's quest **graduates that circle** → milestone toast + ★ present pose + Renown bonus + tracked "◎ N circles" in the Renown card (deduped, persisted). *(Deferred: more cast[Lighthouse Keeper/Festival-Master/Hermit/artisans]; passport/cosmetic/gating rewards for graduation.)*
- [~] **K3** — Quest taxonomy + **DIFFICULTY/REWARD SCALING DONE** (`cd4ff85`): `generateRingQuest` now ramps by ring tier — sparqs `6+tier*3` (cap 60, was 16), kindle counts grow, and escalation objectives stack (tier≥2 → visit the J4 landmark; tier≥4 → chart the onward shore) so far quests are multi-step. `QuestDef.tier`; quest log shows Tier badge + steps + ✦reward. Verified ring 2=T1/1-step/✦9 → ring 18=T17/3-step/✦57. **+ "GATHER" quest type** (`35450dc`): rings scatter collectible **wisps** (new `wisp` prop, `drawWisp` bobbing orb, ids `r{n}w{i}`); gather quest = walk over N wisps (N=3+tier/1.2), tracked in `gatheredWisps` (persisted), waypoint→nearest wisp. Verified 9/9 on ring 9. **+ ERRAND (talk-chain) & DELIVERY types + a 2nd "wanderer" NPC per ring** (`7650db7`): errand = hear the wanderer's news → report to keeper (2 interact objectives, 2 NPCs); delivery = new `deliver` ObjectiveKind, carry a visible parcel (drawn on the hero) → hand to the wanderer. Quest shapes now **kindle/gather/errand/delivery/discover/wayfind + escalation**. **K3 taxonomy substantially done.** *(Deferred: photo-via-diorama [diorama is ring-0 only], build/craft, social/co-op.)*
- [~] **K4** — **Renown ladder DONE** (`7736f35`): new `cirql-renown.ts` — 8 ranks (Newcomer→Wayfarer→…→Luminary) + `renownStanding()`. Ring quests award Renown scaling with tier (`2+tier`), campaigns a chunk (~reward/4); repeats pay ¼. Persisted (`CirqlState.renown`), granted via `grantRenown()` with a rank-up toast, shown in the Quests panel as a rank card (title + progress bar + "N to next") + a ★ reward on each quest row. **Renown GATING DONE** (`830f874`): epic co-op campaigns now carry `minRenownRank` (Outer Passage→Pathfinder, Wonders Marathon→Voyager) — locked on the board's host picker ("🔒 Requires ★ <Rank>") + post blocked until earned; chill/quick stay open. *(Deferred: server-side rank check for JOINING a gated post [needs account-linked identity]; Renown-gated stores/décor come with F/K5. Daily board already exists.)* **K4 essentially complete.**
  - **✅ Fast travel** (`3312449`, owner-requested accomplishment reward): after reaching **ring 5** the **sea chart becomes a fast-travel map** — tap a charted ring to leap there (so Renown/veteran players skip re-sailing). One-time unlock toast; tappable-ring dots + hint; `fastTravelReady()`/`chartGeom`/tap-hit-test in the mapOpen handler.
- [ ] **K5** — Flagship multi-day/endless campaigns: Widening Sea · Lantern Line · Cartographer's Circles · Founding a Homestead · Storm Season (co-op ones ride the party board)
- [ ] **K6** — Seasonal festivals: Lantern (winter) · Bloom (spring) · Starfall (summer) · Hollow Night (autumn) — time-boxed, yearly, exclusive cosmetics

## F · Town stores (NPC shops)  *(⧗ issues pending — Linear cap)*
- [ ] **F1** — Shop buildings → interiors + shopkeeper NPCs
- [ ] **F2** — Store inventory model (common + exclusives + special SPARQS items)
- [ ] **F3** — Store panel + buy flow (replaces menu-buying)
- [ ] **F4** — Quest-gated / hidden stores

## G · Music & SFX  *(⧗ issues pending — Linear cap)*
- [ ] **G1** — CIRQLSPACE MusicKit — adaptive hybrid music (area-varied)
- [ ] **G2** — Action + movement SFX
- [ ] **G3** — Mix/mute controls + integration
