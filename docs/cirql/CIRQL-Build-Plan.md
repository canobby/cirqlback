# CIRQL — Build Plan

**"An ocean of circles that never ends — you light it with real taps, glowing Wonders, and the friends in your Cirql."**

CIRQL is the flagship: a persistent, magical, social world of concentric island-rings. You start at **The Hearth** and sail outward forever. This plan is the working guide — checkoff lists mirror the Linear project **"CIRQL — Flagship World"** (team CHR). **Scope of this pass: "through the arcade beat"** — a shippable playable slice; deeper social depth is Phase 2 at the bottom.

## Progress log
- **M1 · The World & Movement — DONE & LIVE** (commit `b664883`). Walkable Hearth island: cottage, Wonders monolith, Ferra (NPC), Cirql lantern ring, movement, minimap, glow, interact → dialog/toast.
- **M2 · Identity & Persistence — DONE & LIVE** (commit `b09c79c`). Save/resume via the `cirql` game_progress key; first-run character creator (avatar moved into CIRQL) + "Look" re-edit; expanded avatar (hat styles, aura glow, companions, bigger palettes).
- **M3 · Quest System (backbone) — DONE & LIVE** (commit `32e4d9e`). Reusable registry (defs in code, progress in the `cirql` blob — no migration), objective model + chain, reward→sparks hook, objective tracker HUD, waypoint chevron + minimap dot, NPC give-via-dialog, quest-log panel.
- **Feel/UX polish — DONE & LIVE:** smooth-text overlay (readable UI on phones, `e3905ee`), full-bleed responsive viewport + 4-direction facing (`d9e2b27`), full-screen immersive layout + tap-absorbing control tray (`a2e69e4`), and the **full-screen sea chart** (tap the minimap; `3dd6f46`, CHR-250).
- **M4 · First Quest Chain (onboarding) — DONE & LIVE** (commit `677bf40`). Find Your Feet → The Lantern Path → The CirqlCade Door, auto-chaining; first-run auto-accepts quest 1.
- **Brand:** flagship wordmark **CIRQLVERSE** (CIRQL white + VERSE half-size violet); the in-world arcade building renamed **CirqlCade** with a cosmic mystery-dome roof.
- **M5 · CirqlCade (in-world arcade) — DONE & LIVE** (commit `26eead2`). Enter CirqlCade → a hall of all ~57 live cabinets (from the registry); tap one → it plays **embedded in an iframe over `/cirql`** (never leaves CIRQLVERSE); "← CirqlCade" exits to the hall and the game's own /arcade back-link is caught + routed back; **a spark a play** on exit. Verified end-to-end (0 errors, tsc clean).
- **M6 · Sparks Economy & Your Cirql — CORE DONE & LIVE** (commit `9f4c0e4`). World Energy meter, your-Cirql lanterns bound to a real count + a Cirql panel with Invite + "share a light", and capped spark-a-play (daily taper). **CHR-245 (retire the platform-wide arcade reward system) deferred** — large blast radius, wants its own careful pass. **CHR-246 (spend-sparks catalog) next.**
- **Next up: finish M6 (CHR-246 spend catalog), then M7 · Hardening.**
- **Roadmap grew (owner brainstorm):** added **M8 Social/chat**, **M9 Campaigns & Party Finder**, **M10 Endless content engines** (procedural rings, quest templates, daily/seasonal, Myst-style puzzles), **M11 Depth & Delight wishlist** (Hearth décor+visiting, emotes, tapped-shops→landmarks, sailing-as-journey, jump). Positioning: **Balanced**.

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
- [x] Full-screen sea chart (tap minimap to expand) *(CHR-250)*

## M2 · Identity & Persistence — DONE
- [x] Cirql state model + save/load endpoints (`cirql` key) *(CHR-222)*
- [x] Load-on-enter + autosave + resume *(CHR-223)*
- [x] Character creation on first entry — move avatar chooser into CIRQL *(CHR-242)*
- [x] Expand avatar customization — more choices, fun, circle-friendly *(CHR-243)*

## M3 · Quest System (reusable backbone) — DONE
- [x] Schema/persistence: quest progress in the `cirql` state blob (no migration) *(CHR-224)*
- [x] Quest registry + progress engine + reward→sparks hook *(CHR-225)*
- [x] Client: quest log + objective tracker HUD *(CHR-226)*
- [x] Client: NPC quest-givers + waypoint markers *(CHR-227)*

## M4 · First Quest Chain (onboarding = movement tutorial) — DONE
- [x] Quest 1 — "Find Your Feet" (teaches movement) *(CHR-228)*
- [x] Quest 2 — "The Lantern Path" (teaches interact) *(CHR-229)*
- [x] Quest 3 — "The Wonders Door" (find + enter the arcade) *(CHR-230)*
- [x] First-run onboarding scripting hook *(CHR-231)*

## M5 · CirqlCade (in-world arcade) — DONE
- [x] CirqlCade hall — all live cabinets from the registry *(CHR-232)*
- [x] Press-E launches a cabinet embedded over `/cirql` (iframe) *(CHR-233)*
- [x] Return-to-world flow (catches the game's `/arcade` back) *(CHR-234)*
- [x] Score → sparks (spark-a-play MVP; full normalization in M6) *(CHR-235)*

## M6 · Sparks Economy & Your Cirql — CORE DONE
- [x] Sparks currency + World Energy meter *(CHR-236)*
- [x] Your Cirql: friends as lanterns around the Hearth *(CHR-237)*
- [x] Invite-a-friend hook + "share a light" beacon stub *(CHR-238)*
- [x] Earn sparks from play (spark-a-play + daily-capped) *(CHR-244)*
- [ ] Spend sparks: in-CIRQL reward catalog (cosmetics / décor / perks) *(CHR-246)* — next
- [ ] Unify rewards → sparks (retire the arcade's separate reward system) *(CHR-245)* — deferred (platform-wide; own pass)

## M7 · Playable Slice Hardening
- [ ] Full-loop smoke test *(CHR-239)*
- [ ] tsc clean + mobile pass + perf *(CHR-240)*
- [ ] Beta-test checklist entry + deploy *(CHR-241)*

## M8 · Social — presence & chat channels
- [ ] Live presence in-world (`/ws/cirql`, room per ring) *(CHR-247)*
- [ ] Chat channel model: Global / Party / DM *(CHR-248)*
- [ ] Channel switcher UI + safety/moderation *(CHR-249)*

## M9 · Campaigns & Party Finder (co-op)
- [ ] Campaign model: co-op multi-step quests (party-scoped) *(CHR-251)*
- [ ] Campaign Board: post / browse / join (+ new-player-friendly) *(CHR-252)*
- [ ] Party formation + shared waypoint + shared progress *(CHR-253)*
- [ ] Matchmaking requests + safety (tags, report/block) *(CHR-254)*

## M10 · Endless content engines
- [ ] Procedural rings (infinite outward biomes) *(CHR-255)*
- [ ] Quest-template generator (infinite authored-feeling quests) *(CHR-256)*
- [ ] Daily + seasonal loops (rotating dailies, events, drops) *(CHR-257)*
- [ ] Myst-style puzzle quests / campaigns *(CHR-258)*

## M11 · Depth & Delight (wishlist — owner-approved, unscheduled)
Positioning decision: **Balanced** (family-friendly / chat-free-first defaults + cosmetic-only + kindness mechanics, with fuller chat + competitive edges for older players).
- [ ] Hearth décor + visiting friends' Hearths *(CHR-259)*
- [ ] Emotes + chat-free expression *(CHR-260)*
- [ ] Tapped businesses become in-world landmarks (loyalty ↔ world) *(CHR-261)*
- [ ] Sailing as a mini-journey (interactive voyages) *(CHR-262)*
- [ ] Jump / hop movement (traversal + expression) *(CHR-263)*

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
