# CIRQL — Flagship World · Linear Register

Project **CIRQL — Flagship World** · team Chris Nobbs (CHR). Snapshot of every milestone + issue with its status. Live board: linear.app → CIRQL — Flagship World. Generated 2026-07-06.

**Legend:** ☑ = Done · ☐ = Todo.

## Summary
| Milestone | Issues | Done |
|---|---|---|
| M0 · Foundations (reused) | 4 | 4 |
| M1 · The World & Movement | 7 | 7 |
| M2 · Identity & Persistence | 4 | 0 |
| M3 · Quest System (backbone) | 4 | 0 |
| M4 · First Quest Chain (onboarding) | 4 | 0 |
| M5 · The Wonders (in-world arcade) | 4 | 0 |
| M6 · Sparks Economy & Your Cirql | 6 | 0 |
| M7 · Playable Slice Hardening | 3 | 0 |
| M8 · Social — presence & chat channels | 3 | 0 |

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

## M2 · Identity & Persistence
- [ ] **CHR-222** — Cirql state model + save/load endpoints (game_progress 'cirql')
- [ ] **CHR-223** — Load-on-enter + autosave + resume
- [ ] **CHR-242** — Character creation on first entry (move avatar chooser into CIRQL)
- [ ] **CHR-243** — Expand avatar customization (more choices, fun, circle-friendly)

## M3 · Quest System (backbone)
- [ ] **CHR-224** — Schema/migration: quests, objectives, player progress
- [ ] **CHR-225** — Server: quest registry + progress API
- [ ] **CHR-226** — Client: quest log + objective tracker HUD
- [ ] **CHR-227** — Client: NPC quest-givers + waypoint markers

## M4 · First Quest Chain (onboarding)
- [ ] **CHR-228** — Quest 1 — "Find Your Feet" (teaches movement)
- [ ] **CHR-229** — Quest 2 — "The Lantern Path" (teaches interact)
- [ ] **CHR-230** — Quest 3 — "The Wonders Door" (find + enter the arcade)
- [ ] **CHR-231** — First-run onboarding scripting hook

## M5 · The Wonders (in-world arcade)
- [ ] **CHR-232** — Wonders arcade interior + cabinet props from registry
- [ ] **CHR-233** — Press-E launches cabinet as in-world overlay (embed)
- [ ] **CHR-234** — Return-to-world flow (no hardcoded /arcade back)
- [ ] **CHR-235** — Score → sparks reward bridge

## M6 · Sparks Economy & Your Cirql
- [ ] **CHR-236** — Sparks currency + World Energy meter
- [ ] **CHR-237** — Your Cirql: friends as lanterns around the Hearth
- [ ] **CHR-238** — Invite-a-friend hook + "share a light" beacon stub
- [ ] **CHR-244** — Earn sparks from play (spark-a-play + capped performance bonus)
- [ ] **CHR-245** — Unify rewards → sparks (retire the arcade's separate reward system)
- [ ] **CHR-246** — Spend sparks: in-CIRQL reward catalog (cosmetics / décor / perks)

## M7 · Playable Slice Hardening
- [ ] **CHR-239** — Full-loop smoke test (enter → quests → Wonders → play → sparks → resume)
- [ ] **CHR-240** — tsc clean + mobile pass + perf
- [ ] **CHR-241** — Beta-test checklist entry + deploy

## M8 · Social — presence & chat channels
- [ ] **CHR-247** — Live presence in-world (/ws/cirql, room per ring)
- [ ] **CHR-248** — Chat channel model: Global / Party / DM
- [ ] **CHR-249** — Channel switcher UI + safety/moderation
