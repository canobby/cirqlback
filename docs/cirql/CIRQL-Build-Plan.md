# CIRQL — Build Plan

**"An ocean of circles that never ends — you light it with real taps, glowing Wonders, and the friends in your Cirql."**

CIRQL is the flagship: a persistent, magical, social world of concentric island-rings. You start at **The Hearth** and sail outward forever. This plan is the working guide — checkoff lists mirror the Linear project **"CIRQL — Flagship World"** (team CHR). **Status (2026-07-07, rev 2): M0–M10 COMPLETE & LIVE; M8 social now COMPLETE; M11 in progress (51/55 issues done).** The playable slice grew into a real multiplayer world — live presence + full chat channels (Global/Party/**DM**, server-moderated), co-op campaigns/party-finder, endless procedural rings + generated quests + daily/seasonal loops + a Myst puzzle, themed seasonal islands with purposeful landscape, interactive voyages into caves/treetops/clouds, **chat-free emotes**, and **reusable cutscenes**. The reward economies are now de-mixed: the **arcade is free and earns sparqs**; platform points stay the real-world loyalty economy. Everything is live at **`/cirql`** on `chr-5-7-phase0-run-locally` (auto-deploys to Render). Currency shows as **SPARQ/SPARQS**.

## Progress log
- **M1 · The World & Movement — DONE & LIVE** (commit `b664883`). Walkable Hearth island: cottage, Wonders monolith, Ferra (NPC), Cirql lantern ring, movement, minimap, glow, interact → dialog/toast.
- **M2 · Identity & Persistence — DONE & LIVE** (commit `b09c79c`). Save/resume via the `cirql` game_progress key; first-run character creator (avatar moved into CIRQL) + "Look" re-edit; expanded avatar (hat styles, aura glow, companions, bigger palettes).
- **M3 · Quest System (backbone) — DONE & LIVE** (commit `32e4d9e`). Reusable registry (defs in code, progress in the `cirql` blob — no migration), objective model + chain, reward→sparks hook, objective tracker HUD, waypoint chevron + minimap dot, NPC give-via-dialog, quest-log panel.
- **Feel/UX polish — DONE & LIVE:** smooth-text overlay (readable UI on phones, `e3905ee`), full-bleed responsive viewport + 4-direction facing (`d9e2b27`), full-screen immersive layout + tap-absorbing control tray (`a2e69e4`), and the **full-screen sea chart** (tap the minimap; `3dd6f46`, CHR-250).
- **M4 · First Quest Chain (onboarding) — DONE & LIVE** (commit `677bf40`). Find Your Feet → The Lantern Path → The CirqlCade Door, auto-chaining; first-run auto-accepts quest 1.
- **Brand:** flagship wordmark **CIRQLVERSE** (CIRQL white + VERSE half-size violet); the in-world arcade building renamed **CirqlCade** with a cosmic mystery-dome roof.
- **M5 · CirqlCade (in-world arcade) — DONE & LIVE** (commit `26eead2`). Enter CirqlCade → a hall of all ~57 live cabinets (from the registry); tap one → it plays **embedded in an iframe over `/cirql`** (never leaves CIRQLVERSE); "← CirqlCade" exits to the hall and the game's own /arcade back-link is caught + routed back; **a spark a play** on exit. Verified end-to-end (0 errors, tsc clean).
- **M6 · Sparks Economy & Your Cirql — DONE & LIVE** (commits `9f4c0e4`, `df76f4a`, `8e3d166`). World Energy meter, your-Cirql lanterns + Cirql panel (Invite + "share a light"), capped spark-a-play, and **spend-sparks cosmetics** (buy-in-place in the creator; owned persists). **CHR-245 currency de-mix DONE:** owner chose to make the **arcade free** (perk costs→0) and have **arcade Dailies earn sparqs** (3/game/day, cap 15/day) via a server-authoritative `sparqbank` wallet that CIRQL claims on load / cabinet-exit — so the arcade touches platform points *neither way*. Platform points stay the real-world loyalty/redemption economy.
- **M7 · Playable Slice Hardening — DONE & LIVE** (commit `6b52ba9`). Full-loop smoke (arcade banner → world → create → quests → CirqlCade → play → sparks → spend → resume) verified; tsc clean + mobile pass; **CIRQLVERSE surfaced via a flagship banner on `/arcade`**; beta-test checklist doc created.
- **🎉 THE PLAYABLE SLICE (M0–M7) COMPLETE & LIVE.** Then the deeper roadmap shipped:
- **M8 · Social — presence + chat channels — DONE & LIVE** (commits `d23d975` → `cca07e8` → `c982bba`). `server/cirql-presence.ts` = a ring-scoped live room at **`/ws/cirql`**: travellers walk the Hearth together (avatars, name tags, chat bubbles, interpolation), live online count, and **"share a light"** (walk up + E → both Hearths light a lantern). **Full chat channels now shipped:** a **Global · Party · DM** switcher with per-channel unread markers; **CHR-249** safety/moderation — a **server-side profanity mask** (`server/chat-filter.ts`, leet/separator-aware) + 700ms rate limit + block/report (decision: freeform + server moderation, not preset); **CHR-248 Direct Messages** — 1:1 chat with a **request/accept** gate (no cold stranger DMs), session-scoped, a DM directory (requests / conversations / travellers-here → Message) + threads.
- **M9 · Campaigns & Party Finder — DONE & LIVE** (commit `a5ee3b3`, CHR-251/252/253/254). Co-op **campaigns** (`cirql-campaigns.ts`), a **Campaign Board** with **structured, PII-free** matchmaking posts (pick a campaign + preset tags + new-player-friendly — no freeform, kid-safe), host/seeker directions, ask→accept + invite→accept handshakes, **parties** with a shared teal waypoint + synced step progress + a members-only **party chat channel** + rewards; leave/disband/late-join; rate limits + minimal block/report.
- **M10 · Endless content engines — DONE & LIVE** (commits `bff0024`→`89cfbcb`, CHR-255/256/257/258). **Procedural rings** (`cirql-ring-gen.ts`: sail outward forever — seeded biomes/props/docks, growing radius, arrival cinematic, resume); **quest-template generator** (each ring's keeper offers a deterministic kindle/discover/wayfind quest via a dynamic registry); **daily + weekend loops** (`cirql-daily.ts`: rotating daily task, streak, a weekend Lantern-Festival ×2); a **Myst rune puzzle** on the Hearth (read the runestone clue → light the runes → the sealed shrine opens).
- **World polish (owner feedback):** themed **seasonal islands** (meadow/tropical/winter/desert/autumn/woodland/coast/ember — biome stride so every shore differs), **world-space ambient critters** with per-creature motion (butterflies/bees/dragonflies/grasshopper-hops/fireflies/gulls/snow/embers), **purposeful landscape** (fence corrals + rows, flower beds, tree groves, rock cairns, paths), **solid collision** (walk around trees/rocks/ponds/fences), **cross-ring quests + campaigns** (objectives/steps span rings; off-ring the waypoint points to the dock), **repeatable quests/campaigns** (redo for ~¼ reward), and a robust **lantern-quest fix** (per-quest `litForQuest`).
- **M11 · Depth & Delight — IN PROGRESS (3/7):** **CHR-265 Interactive voyages** (`be24ce3`) — a `portal` prop (cave/hollow-tree/cloud-stair) travels to a **sub-map** (The Undervault / The High Canopy / The Cloud Reach) and back. **CHR-260 Emotes** (`4749427`) — a 12-emote wheel → a timed glyph over local + remote avatars (+ light avatar motion) broadcast over `/ws/cirql`; module `cirql-emotes.ts`. **CHR-264 Cutscenes** (`ff50176`) — a reusable, data-authored, **skippable letterboxed cutscene player** (`cirql-cutscenes.ts`: timed beats over fog/bloom/sparks/aurora/celebrate/dawn fx), wired to **arrival** (new shore), **onboarding** (waking at the Hearth), **campaign-complete**, and **world-energy milestone**. Remaining: CHR-259 (Hearth décor + visiting), CHR-261 (tapped businesses → landmarks), CHR-262 (sailing-as-journey), CHR-263 (jump/hop).
- **Currency rename:** flagship display is now **SPARQ/SPARQS** (code identifiers stay `sparks`).

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

## M6 · Sparks Economy & Your Cirql — DONE
- [x] Sparks currency + World Energy meter *(CHR-236)*
- [x] Your Cirql: friends as lanterns around the Hearth *(CHR-237)*
- [x] Invite-a-friend hook + "share a light" beacon stub *(CHR-238)*
- [x] Earn sparks from play (spark-a-play + daily-capped) *(CHR-244)*
- [x] Spend sparks: in-CIRQL cosmetics (buy-in-place in the creator) *(CHR-246)*
- [x] De-mix currencies *(CHR-245)* — arcade made **free** (perk costs→0) + arcade **Dailies earn sparqs** (server `sparqbank` wallet → CIRQL claims); platform points stay the real-world loyalty economy

## M7 · Playable Slice Hardening — DONE
- [x] Full-loop smoke test *(CHR-239)*
- [x] tsc clean + mobile pass + perf *(CHR-240)*
- [x] Beta-test checklist + deploy + surface `/cirql` in nav *(CHR-241)*

## M8 · Social — presence & chat channels — DONE
- [x] Live presence in-world (`/ws/cirql`, room per ring) *(CHR-247)*
- [x] Chat channel model: Global / Party / DM *(CHR-248)* — 1:1 DMs, **request/accept**-gated + session-scoped, DM directory + threads
- [x] Channel switcher UI + safety/moderation *(CHR-249)* — Global/Party/DM switcher + per-channel unread; **server-side profanity mask** + 700ms rate limit + block/report (freeform + server moderation)

## M9 · Campaigns & Party Finder (co-op) — DONE
- [x] Campaign model: co-op multi-step quests (party-scoped) *(CHR-251)*
- [x] Campaign Board: post / browse / join (+ new-player-friendly) *(CHR-252)*
- [x] Party formation + shared waypoint + shared progress *(CHR-253)*
- [x] Matchmaking requests + safety (tags, report/block) *(CHR-254)*

## M10 · Endless content engines — DONE
- [x] Procedural rings (infinite outward biomes) *(CHR-255)*
- [x] Quest-template generator (infinite authored-feeling quests) *(CHR-256)*
- [x] Daily + seasonal loops (rotating dailies, events, drops) *(CHR-257)*
- [x] Myst-style puzzle quests / campaigns *(CHR-258)*

## M11 · Depth & Delight (wishlist — owner-approved) — IN PROGRESS (3/7)
Positioning decision: **Balanced** (family-friendly / chat-free-first defaults + cosmetic-only + kindness mechanics, with fuller chat + competitive edges for older players).
- [x] **Interactive voyages: tunnels/underground, treetops & clouds** *(CHR-265)* — DONE & LIVE
- [x] **Emotes + chat-free expression** *(CHR-260)* — 12-emote wheel → timed glyph over local/remote avatars + `/ws/cirql` relay
- [x] **More mini-journeys & cutscenes** *(CHR-264)* — reusable skippable cutscene player; wired to arrival / onboarding / campaign-complete / world-energy
- [ ] Hearth décor + visiting friends' Hearths *(CHR-259)*
- [ ] Tapped businesses become in-world landmarks (loyalty ↔ world) *(CHR-261)*
- [ ] Sailing as a mini-journey (interactive voyages) *(CHR-262)*
- [ ] Jump / hop movement (traversal + expression) *(CHR-263)*

## Architecture notes (as built through M11)
- `client/src/game/cirql-world.ts` — declarative rings/props + PropTypes. **The authored Hearth (ring 0) + every prop type live here.** Prop types now include hearth/wonders/npc/tree/lantern/crystal/dock/marker/tablet/rune/shrine/gathering/theater/rock/pond/flower/fence/path/**portal**.
- `client/src/game/cirql-ring-gen.ts` — **procedural rings + sub-maps** (CHR-255/265). `generateRing(index)` seeds biome/palette/props/docks; radius grows with index; landscape uses **formations** (`placeGrove/placeFlowerBed/placeRockCairn/placeCorral/placeFenceRow`). **Sub-maps:** `getRing(i)` returns the Hearth for 0, a surface ring below `SUB_BASE`, or a **sub-map** (`generateSubMap` cave/tree/cloud) for big indices; `isSubMap/parentOf/subKindOf/subIndex` encode `kind*offset + parentIndex`. A **portal is a dock** to an off-index ring.
- `client/src/game/cirql-quests.ts` + `cirql-quest-gen.ts` — quest registry (authored chain + `registerQuest`/`allQuests` **dynamic** ring quests). Objectives carry an optional **`ring`** (cross-ring) + kinds reach/interact/enterWonders/lightLanterns/solvePuzzle. Repeatable via `doneOnce`; lightLanterns uses a **per-quest `litForQuest`** set (never blocked by stale global lit).
- `client/src/game/cirql-campaigns.ts` — co-op campaigns; steps carry `ring`+`at` (a prop id resolved on that ring) for **cross-ring** party voyages.
- `client/src/game/cirql-daily.ts` — daily task + seasonal/weekend event (deterministic per UTC day).
- `client/src/game/cirql-theater.ts` — the Cirql Drive-In's fake movie posters.
- `client/src/game/cirql-world-engine.ts` — `CirqlWorldEngine extends RetroEngine`. Hooks: `onInteract`, `onLocalMove` (autosave), `onSail(ring,maxRing)`, `onQuestComplete(q,firstTime)`, `onQuestChange`, `onPresence`/`onShareLight` (multiplayer), `onPartyArrive`; `setStats`/`setPartyTarget`/`setPartyMembers`/`addRemote…`/`toast`. Interact key = **E**. In DEV the engine is on `window.__cirql` (TS `private` fields are runtime-readable — used for smoke tests).
- `server/cirql-presence.ts` — the `/ws/cirql` room: ring-scoped presence + move + chat (global/party channels) + share-a-light + the M9 **party/campaign-board state machine** (in-memory, no DB). Wired into the `noServer` upgrade router in `server/routes.ts` beside `/ws/town` + `/ws/mp`.

## Gotchas to respect
- **DB migrations:** `db:migrate` is broken on the shared Neon DB; `db:push` truncates. All CIRQL state rides in the `game_progress` `cirql` blob — **no new tables**; the whole multiplayer/party layer is in-memory.
- **Persist everything through the blob:** `buildState`/`applyState` in `cirql.tsx` must list each field (ring/maxRing/x/y/quests/lit/litForQuest/doneOnce/doneCampaigns/…) — a field left out silently isn't saved.
- **Lantern quests:** never gate quest-lantern lighting on the shared persistent `lit` set — use the per-quest `litForQuest` (reset on accept). (This was the "3 lights on, can't light another" bug.)
- **Dev server:** `tsx` does not hot-reload server code — restart after server edits (kill the port-5000 PID). Client hot-reloads via Vite. **Rapid full page reloads trip the express rate-limiter** (`max 1000/15min`, `server/index.ts`) → 429s/blank page → restart the dev server to reset; prefer HMR while testing.
- **`apiRequest` returns a raw `Response`** — the cirql page uses raw `fetch`.
- **Don't shadow RetroEngine base methods/fields** (`px`, `ring`, `last`) — world fields are `posX/posY/curRing`.
- **Test-account state:** a saved `seenIntro:false` shows the first-run creator (gates presence join) — set it true in the `cirql` save to smoke multiplayer.
- **Deploy:** push to `chr-5-7-phase0-run-locally` → Render auto-deploys (~2–4 min) at `cirqlback.onrender.com/cirql`; confirm the new `/assets/*.js` bundle hash.

## Phase 2 — deferred / next
- **M11 wishlist (remaining):** Hearth décor + visiting (CHR-259), tapped-shops→landmarks (CHR-261), sailing-as-a-journey (CHR-262 — can reuse the new cutscene player), jump/hop (CHR-263).
- **Full currency de-mix (optional follow-up):** CirqlBreak's in-game daily + the Daily Circle still grant platform points; ~48 legacy per-game pages no longer show a reward line (graceful — arcade-shell games do). Sweep if desired.
- **Real-world tap → sparqs bridge** (the moat: a café tap widens the shared sea) — the natural next big step now that the arcade already earns sparqs via the `sparqbank` wallet.
