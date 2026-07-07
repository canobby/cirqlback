# CIRQL — Build Plan

**"An ocean of circles that never ends — you light it with real taps, glowing Wonders, and the friends in your Cirql."**

CIRQL is the flagship: a persistent, magical, social world of concentric island-rings. You start at **The Hearth** and sail outward forever. This plan is the working guide — checkoff lists mirror the Linear project **"CIRQL — Flagship World"** (team CHR). **Scope of this pass: "through the arcade beat"** — a shippable playable slice; deeper social depth is Phase 2 at the bottom.

## Progress log
- **M1 · The World & Movement — DONE & LIVE** (commit `b664883`, deployed). `/cirql` is a walkable island on the RetroEngine: The Hearth cottage, the Wonders monolith, the Hearth-keeper NPC (Ferra), the Cirql lantern ring, movement (keys/run/click/joystick), edge-clamp + collision, minimap, glow/motes/aurora, and the interact → dialog/toast pipeline. Verified in-browser (0 console errors, tsc clean).
- **Next up: M2 · Identity & Persistence** — save/resume + character creation (avatar moves into CIRQL).

## Locked decisions (owner, 2026-07-06 — "ALL IN")
- **The Wonders** = the 50 arcade cabinets folded IN-WORLD as enchanted monoliths you *attune* to (press E → the cabinet opens as an in-world overlay; you never leave CIRQL). Found on the first quest, which is the movement tutorial.
- **One currency: SPARKS.** All rewards come out of the arcade's own system and unify under sparks. **Earn** ~a spark a play + a small capped performance bonus (and, Phase 2, real-world taps). **Spend** in an in-CIRQL reward catalog (avatar cosmetics, Hearth décor, perks). Sparks are the games *and* in-platform reward.
- **Avatar lives in CIRQL.** The chooser moves out of the arcade into a **first-run character-creation** step (sign-up / first play), with **lots more fun choices** — auras/glows, patterns, hats/crowns, companions — despite the circular art. Free at creation + spark-unlockable extras.
- **Your Cirql** = your friends, shown as **lanterns lighting your Hearth** (dim → beacon). Grown by **meeting people in-world** ("share a light", a chat-free beacon) **and inviting real friends** (rewarded-referral, reskinned as light).
- **Chat is channelled** so the feed never jams: **Global** (ambient) · **Party/Group** (campaigns & friends) · **Direct Messages**. Needs the live presence layer, so it becomes milestone **M8**.
- **Look:** supersampled 16-bit RetroEngine + the neon glow-up kit — "modern-but-16-bit". Approved 5-frame lookbook + playable in-game mockup.

## Completed — reusable foundations (M0)
- [x] `/town` websocket prototype — presence + move + chat proven *(CHR-211)*
- [x] RetroEngine, supersampled (SS=1.5) *(CHR-212)*
- [x] 50 arcade cabinets + registry + arcade-shell — become the Wonders *(CHR-213)*
- [x] Avatars + shared joystick + `game_progress` save table *(CHR-214)*

## M1 · The World & Movement — DONE
- [x] `/cirql` route + lazy page scaffold *(CHR-215)*
- [x] World engine: canvas render loop + camera *(CHR-216)*
- [x] Concentric-ring data model + ring configs *(CHR-217)*
- [x] The Hearth (ring 0) authored map + props *(CHR-218)*
- [x] Player movement: WASD + click + joystick + edge collision *(CHR-219)*
- [x] Minimap: concentric rings + fog + player dot *(CHR-220)*
- [x] Ambient neon polish (glow-up kit) *(CHR-221)*

## M2 · Identity & Persistence
- [ ] Cirql state model + save/load endpoints (`cirql` key) *(CHR-222)*
- [ ] Load-on-enter + autosave + resume *(CHR-223)*
- [ ] Character creation on first entry — move avatar chooser into CIRQL *(CHR-242)*
- [ ] Expand avatar customization — more choices, fun, circle-friendly *(CHR-243)*

## M3 · Quest System (reusable backbone)
- [ ] Schema/migration: quests, objectives, player progress *(CHR-224)*
- [ ] Server: quest registry + progress API *(CHR-225)*
- [ ] Client: quest log + objective tracker HUD *(CHR-226)*
- [ ] Client: NPC quest-givers + waypoint markers *(CHR-227)*

## M4 · First Quest Chain (onboarding = movement tutorial)
- [ ] Quest 1 — "Find Your Feet" (teaches movement) *(CHR-228)*
- [ ] Quest 2 — "The Lantern Path" (teaches interact) *(CHR-229)*
- [ ] Quest 3 — "The Wonders Door" (find + enter the arcade) *(CHR-230)*
- [ ] First-run onboarding scripting hook *(CHR-231)*

## M5 · The Wonders (in-world arcade)
- [ ] Wonders interior + cabinet props from registry (all 50) *(CHR-232)*
- [ ] Press-E launches cabinet as in-world overlay (embed) *(CHR-233)*
- [ ] Return-to-world flow (no hardcoded `/arcade` back) *(CHR-234)*
- [ ] Score → sparks reward bridge *(CHR-235)*

## M6 · Sparks Economy & Your Cirql
- [ ] Sparks currency + World Energy meter *(CHR-236)*
- [ ] Your Cirql: friends as lanterns around the Hearth *(CHR-237)*
- [ ] Invite-a-friend hook + "share a light" beacon stub *(CHR-238)*
- [ ] Earn sparks from play (spark-a-play + capped performance bonus) *(CHR-244)*
- [ ] Unify rewards → sparks (retire the arcade's separate reward system) *(CHR-245)*
- [ ] Spend sparks: in-CIRQL reward catalog (cosmetics / décor / perks) *(CHR-246)*

## M7 · Playable Slice Hardening
- [ ] Full-loop smoke test *(CHR-239)*
- [ ] tsc clean + mobile pass + perf *(CHR-240)*
- [ ] Beta-test checklist entry + deploy *(CHR-241)*

## M8 · Social — presence & chat channels
- [ ] Live presence in-world (`/ws/cirql`, room per ring) *(CHR-247)*
- [ ] Chat channel model: Global / Party / DM *(CHR-248)*
- [ ] Channel switcher UI + safety/moderation *(CHR-249)*

## Architecture notes (as built in M1)
- `client/src/game/cirql-world.ts` — declarative rings/props. **Add a ring = add a config here.** Ring 0 = The Hearth; outer rings stubbed (minimap fog) until Phase 2.
- `client/src/game/cirql-world-engine.ts` — `CirqlWorldEngine extends RetroEngine`. Host hooks for later milestones: `onInteract(kind,prop)`, `onLocalMove(ring,x,y)` (autosave), `getState()/applyState()` (persistence), `setStats()` (sparks / your-Cirql HUD), `toast()`. Interact key = **E** (and Space).
- `client/src/pages/cirql.tsx` — host page + joystick + E/run controls. In DEV the engine is on `window.__cirql`.

## Gotchas to respect
- **DB migrations:** `db:migrate` is broken on the shared Neon DB; `db:push` truncates. Apply additive DDL via a guarded script (quest tables, M3).
- **Dev server:** `tsx` does not hot-reload server code — restart after server edits (kill the port-5000 PID if stuck). Client hot-reloads via Vite.
- **`apiRequest` returns a raw `Response`** — always `.json()` it.
- **Cabinet back-buttons hardcode `/arcade`** — override when a Wonder launches inside CIRQL (M5).
- **Don't shadow RetroEngine base methods/fields** (`px`, `ring`, `last`) — world fields are `posX/posY/curRing`.
- **Deploy:** push to `chr-5-7-phase0-run-locally` → Render auto-deploys (~2–4 min); confirm the new `/assets/*.js` bundle hash.

## Phase 2 — deferred (after the arcade beat)
- Real-world tap → sparks bridge (the moat: a café tap widens the shared sea).
- Friends/parties depth — party up, sail together, co-op ring unlocks.
- Trading + inventories (both-confirm, anti-scam).
- More rings/biomes (Whisperwood, Glimmer Bazaar, outward forever) + docks/portals.
- Depth — quests beyond onboarding, light combat/monsters, seasonal drops.
