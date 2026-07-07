# CIRQL — Flagship World · Linear Register

Project **CIRQL — Flagship World** · team Chris Nobbs (CHR). Snapshot of every milestone + issue with its status. Live board: linear.app → CIRQL — Flagship World. Generated 2026-07-07. **M0–M10 complete + M11 started.**

**Legend:** ☑ = Done · ◑ = Partial · ☐ = Todo.

## Summary
| Milestone | Issues | Done |
|---|---|---|
| M0 · Foundations (reused) | 4 | 4 |
| M1 · The World & Movement | 8 | 8 |
| M2 · Identity & Persistence | 4 | 4 |
| M3 · Quest System (backbone) | 4 | 4 |
| M4 · First Quest Chain (onboarding) | 4 | 4 |
| M5 · CirqlCade (in-world arcade) | 4 | 4 |
| M6 · Sparks Economy & Your Cirql | 6 | 5 |
| M7 · Playable Slice Hardening | 3 | 3 |
| M8 · Social — presence & chat channels | 3 | 1 (+ core of 2 more) |
| M9 · Campaigns & Party Finder | 4 | 4 |
| M10 · Endless content engines | 4 | 4 |
| M11 · Depth & Delight (wishlist) | 7 | 1 |

**Overall:** 46 of the 55 issues done. Remaining: **CHR-245** (retire platform-wide arcade rewards, deferred), the **M8 chat remainder** (CHR-248 DM / CHR-249 switcher+moderation — cores shipped), and the **M11 wishlist** (CHR-259/260/261/262/263/264).

## M0 · Foundations (reused) — DONE
- [x] **CHR-211** — Reuse: /town websocket presence prototype
- [x] **CHR-212** — Reuse: RetroEngine (supersampled SS=1.5) + glow-up kit start
- [x] **CHR-213** — Reuse: 50 arcade cabinets + registry + arcade-shell
- [x] **CHR-214** — Reuse: avatars, shared joystick, game_progress save table

## M1 · The World & Movement — DONE (commit b664883, live)
- [x] **CHR-215** — /cirql route + lazy page scaffold
- [x] **CHR-216** — World engine: canvas render loop + camera
- [x] **CHR-217** — Concentric-ring data model + ring configs
- [x] **CHR-218** — The Hearth (ring 0) authored map + props
- [x] **CHR-219** — Player movement: WASD + click-to-move + joystick + edge collision
- [x] **CHR-220** — Minimap: concentric rings + fog + player dot
- [x] **CHR-221** — Ambient neon polish (glow-up kit: lighting + motes)
- [x] **CHR-250** — Full-screen sea chart (tap minimap to expand)

## M2 · Identity & Persistence — DONE (commit b09c79c, live)
- [x] **CHR-222** — Cirql state model + save/load endpoints (game_progress 'cirql')
- [x] **CHR-223** — Load-on-enter + autosave + resume
- [x] **CHR-242** — Character creation on first entry (move avatar chooser into CIRQL)
- [x] **CHR-243** — Expand avatar customization (more choices, fun, circle-friendly)

## M3 · Quest System (backbone) — DONE (commit 32e4d9e, live)
- [x] **CHR-224** — Quest progress persisted in the `cirql` state blob (no migration)
- [x] **CHR-225** — Quest registry + progress engine + reward→sparks hook
- [x] **CHR-226** — Client: quest log + objective tracker HUD
- [x] **CHR-227** — Client: NPC quest-givers + waypoint markers

## M4 · First Quest Chain (onboarding) — DONE (commit 677bf40, live)
- [x] **CHR-228** — Quest 1 — "Find Your Feet" (teaches movement)
- [x] **CHR-229** — Quest 2 — "The Lantern Path" (teaches interact)
- [x] **CHR-230** — Quest 3 — "The Wonders Door" (find + enter the arcade)
- [x] **CHR-231** — First-run onboarding scripting hook

## M5 · CirqlCade (in-world arcade) — DONE (commit 26eead2, live)
- [x] **CHR-232** — CirqlCade hall: all live cabinets from the registry
- [x] **CHR-233** — Press-E launches a cabinet embedded over /cirql (iframe)
- [x] **CHR-234** — Return-to-world flow (catches the game's /arcade back-link)
- [x] **CHR-235** — Score → sparks (spark-a-play MVP; full normalization M6)

## M6 · Sparks Economy & Your Cirql — CORE DONE (commit 9f4c0e4, live)
- [x] **CHR-236** — Sparks currency + World Energy meter
- [x] **CHR-237** — Your Cirql: friends as lanterns around the Hearth
- [x] **CHR-238** — Invite-a-friend hook + "share a light" beacon stub
- [x] **CHR-244** — Earn sparks from play (spark-a-play + daily-capped)
- [x] **CHR-246** — Spend sparks: in-CIRQL cosmetics (buy-in-place in the creator)
- [ ] **CHR-245** — Unify rewards → sparks (retire arcade reward system) — deferred (platform-wide; own pass)

## M7 · Playable Slice Hardening — DONE (commit 6b52ba9, live)
- [x] **CHR-239** — Full-loop smoke test (enter → quests → CirqlCade → play → sparks → resume)
- [x] **CHR-240** — tsc clean + mobile pass + perf
- [x] **CHR-241** — Beta-test checklist + deploy + `/cirql` surfaced on the arcade lobby

## M8 · Social — presence & chat channels — CORE DONE (commit d23d975, live)
- [x] **CHR-247** — Live presence in-world (/ws/cirql, room per ring)
- [ ] **CHR-248** — Chat channel model: Global / Party / DM — **◑ global + party done; DM deferred**
- [ ] **CHR-249** — Channel switcher UI + safety/moderation — **◑ Global/Party toggle + structured tags + rate limits + minimal block shipped; full switcher/DM/profanity-filter/persistent report-block deferred**

## M9 · Campaigns & Party Finder — DONE (commit a5ee3b3, live)
- [x] **CHR-251** — Campaign model: co-op multi-step quests (party-scoped)
- [x] **CHR-252** — Campaign Board: post / browse / join (+ new-player-friendly)
- [x] **CHR-253** — Party formation + shared waypoint + shared progress
- [x] **CHR-254** — Matchmaking requests + safety (tags, report/block)

## M10 · Endless content engines — DONE (commits bff0024→89cfbcb, live)
- [x] **CHR-255** — Procedural rings (infinite outward biomes)
- [x] **CHR-256** — Quest-template generator (infinite authored-feeling quests)
- [x] **CHR-257** — Daily + seasonal loops (rotating dailies, events, drops)
- [x] **CHR-258** — Myst-style puzzle quests / campaigns

## M11 · Depth & Delight (wishlist — owner-approved) — STARTED
Positioning: **Balanced** (family-friendly / chat-free-first defaults + cosmetic-only + kindness mechanics, with fuller chat + competitive edges for older players).
- [x] **CHR-265** — Interactive voyages: tunnels/underground, treetops & clouds (commit be24ce3, live)
- [ ] **CHR-259** — Hearth décor + visiting friends' Hearths
- [ ] **CHR-260** — Emotes + chat-free expression *(full roster drafted)*
- [ ] **CHR-261** — Tapped businesses become in-world landmarks (loyalty ↔ world)
- [ ] **CHR-262** — Sailing as a mini-journey (interactive voyages)
- [ ] **CHR-263** — Jump / hop movement (traversal + expression)
- [ ] **CHR-264** — More mini-journeys & cutscenes (expand) *(brainstorm captured)*
