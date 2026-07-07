# CIRQL / CIRQLVERSE — Game Design & Systems Reference

*An in-depth explanation of the flagship game as it stands today (2026-07-07): every system, how it works, and how it's built.* The game is **complete through milestones M0–M11** plus a "world-feel" polish pass, all live at **`/cirql`** on `cirqlback.onrender.com`. A major next chapter — the **CIRQLSPACE Sandbox** — is planned but **not yet built** (see the separate `CIRQLSPACE-Sandbox-Plan`); this document describes the *current* game.

---

## 1. What it is

**CIRQL** (brand wordmark **CIRQLVERSE**) is a persistent, magical, social online world — a **top-down, walkable, 16-bit world of concentric island-rings** floating in an endless ocean. You start on a home island at the centre and **sail outward forever**, new lands opening as you go. It is its own immersive experience (not a menu of mini-games), with real people, co-op, chat, and an in-world arcade.

It lives **inside Cirqlback**, an NFC "tap-to-reward" local-marketing platform. The tie between the two is the economy: real-world activity and in-game play both feed one currency, **SPARQS**, that grows your world. The featured currency displays as **SPARQ/SPARQS** (code identifiers stay `sparks`).

- **Route/code:** `/cirql`; engine + data under `client/src/game/cirql-*`, page `client/src/pages/cirql.tsx`.
- **Positioning:** *Balanced* — family-friendly, chat-free-first defaults, cosmetic-only, kindness mechanics, with fuller chat + competitive edges available for older players.
- **Look:** a supersampled 16-bit **RetroEngine** with a neon glow-up (lantern light, motes, aurora, vignette) — "modern-but-16-bit," full-bleed to the screen with crisp vector UI text over the pixel scene.

---

## 2. The world model — concentric rings

The world is a set of **concentric island-rings** in an ocean. You sail between them via **docks**; the map is literally circles ("CIRQL" = circle).

- **Ring 0 — CIRQLSPACE** (renamed from "The Hearth"): your home island. Authored map (`cirql-world.ts`): a cottage, the **CirqlCade** building (the in-world arcade door), the quest-giver NPC **Ferra**, the Cirql lantern ring, a hidden **Sunken Runes** puzzle grove, the **Commons** (a social bonfire), scenery, and a south **dock**. Its name renders under the minimap styled like the logo (**CIRQL** big/white + **SPACE** small/accent).
- **Rings 1+ — the procedural wilds:** generated deterministically (`cirql-ring-gen.ts`) so the same land exists for everyone, forever. Each has a biome, name, scenery, a keeper NPC, a generated quest, a social gathering spot, and two docks (inward/onward). You can sail out endlessly.
- **Sub-maps (interactive voyages):** some rings have **portals** (a cave, a hollow tree, a cloud-stair) that travel to their own generated **sub-map** (The Undervault / The High Canopy / The Cloud Reach) and back. A portal is just a dock whose destination is an off-index ring id.
- **The minimap & sea chart:** a corner minimap shows the concentric rings fading into fog; tapping it opens the full-screen **"Endless Ocean"** chart (rings, your position, waypoint, fog).

> *Planned next (not built):* CIRQLSPACE becomes a blank buildable sandbox, all game content moves to an authored **Town at ring 1**, and procedural wilds shift to **ring 2+**.

---

## 3. Movement & controls

A responsive top-down character controller on the `CirqlWorldEngine` (`cirql-world-engine.ts`).

- **Move:** on-screen joystick (mobile), tap-to-move, or WASD/arrows. Smooth velocity easing; **4-direction facing** (front/back/profile) driven by the dominant movement axis.
- **Run:** hold the RUN button (or B) for a speed boost.
- **Jump/hop (CHR-263):** a "fake-Z" hop — the sprite rises on a parabolic arc while its shadow + "you" ring stay grounded. Its own **HOP** button (+ desktop C/H key).
- **Interact:** the **E / TALK-ENTER** button (or E/Space) — advances dialog, enters buildings/docks/portals, lights quest lanterns, shares a light with a nearby traveller, etc.
- **Collision:** solid props (trees, rocks, ponds, fences, shrines, buildings) push you out; the island edge keeps you on land.
- **Full-bleed viewport:** the world fills the screen (no letterbox); the HUD stays clear of the floating header + control tray via safe-area insets.

---

## 4. Identity & the avatar

- **Character creator** (`components/cirql/character-creator.tsx`): shown on first entry (moved out of the arcade into CIRQL). Choose **skin, eyes, hat colour, hat shape, outfit, aura glow, companion** (moth/sprite/pet, etc.). "Look" is re-editable anytime.
- **Cosmetics:** skin/eyes/hat-colour/outfit are free; premium **auras, hats, companions** are **SPARQS-priced** and bought in-place in the creator (`COSMETIC_PRICES` in `avatar.ts`). Owned cosmetics persist.
- Your avatar renders in the world with its aura glow + companion, and is shown to other travellers over the multiplayer socket.

---

## 5. Save & persistence

- All game state lives in a single **`game_progress` row** keyed `gameId='cirql'` — a JSON **blob** that is **client-authoritative** (the client writes it; the server stores it).
- **Logged-in players** save to the server (`/api/game/progress?gameId=cirql`); **guests** fall back to `localStorage`.
- The blob holds: ring + furthest ring reached (`maxRing`), position, quests + progress, lit lanterns, per-quest lantern state, completed-once quests, done campaigns, avatar, name, seen-intro flag, **sparks**, Cirql member count, World Energy, daily-play counters, owned cosmetics, **placed décor**, and the daily/streak record. `buildState`/`applyState` in `cirql.tsx` must list every persisted field.
- Multiplayer/social state (who's online, parties, chat) is **in-memory** on the server — presence, not an authoritative sim.

---

## 6. Quests

A reusable quest system (`cirql-quests.ts`), progress stored in the save blob (no DB migration).

- **Objective kinds:** `reach` (walk to a target), `interact` (talk to an NPC), `enterWonders` (enter CirqlCade), `lightLanterns` (light path lanterns via E), `solvePuzzle` (the rune puzzle). Objectives **chain** via `next`.
- **Rewards** pay **SPARQS** (`onQuestComplete`); **repeatable** quests re-offer for ~¼ the reward.
- **HUD:** an objective tracker, a bouncing **waypoint chevron** over the current target, a minimap dot, and a **quest-log** panel. NPCs give quests via dialog.
- **Onboarding chain (M4):** *Find Your Feet* (movement) → *The Lantern Path* (interact/light lanterns) → *The Wonders Door* (find + enter CirqlCade), auto-accepted on first run so a waypoint always guides new players.
- **Generated ring quests (M10):** every procedural ring's keeper offers one deterministic quest (`cirql-quest-gen.ts`) — **kindle** (light its lanterns) / **discover** (reach a shard crystal) / **wayfind** (reach the onward dock) — scaling reward with depth.
- The lantern-lighting is decoupled via a per-quest `litForQuest` set so re-lighting quests can never get stuck.

---

## 7. CirqlCade — the in-world arcade

The cosmic domed **CirqlCade** building (code id `wonders`) on CIRQLSPACE is a doorway to the wider Cirqlback arcade.

- Press **E** at the door → a **hall overlay** listing every live registry game (~57 cabinets).
- Tap one → it plays **embedded in an `<iframe>` over `/cirql`** — you never leave CIRQLVERSE. "← CirqlCade" returns to the hall; the game's own `/arcade` back-link is caught and routed home.
- **The arcade is FREE (CHR-245):** per-game power-up "perks" now cost **0** — the arcade never charges a currency. (Perks stay as free power-ups you arm before a run.)
- **Arcade Dailies earn SPARQS:** playing a game's Daily (first time each day) banks **3 SPARQS** (capped **15/UTC-day** across the arcade) into a **server-authoritative "sparqbank" wallet**, which CIRQL **claims** on load / when you step out of a cabinet (`/api/game/sparqs/claim`). This is why sparqs are banked server-side: the arcade can't write CIRQL's client-authoritative save directly (it would clobber, especially embedded).

---

## 8. The SPARQS economy, World Energy & Your Cirql

**SPARQS is the one game currency.** Platform *points* remain separate (the real-world loyalty/redemption economy) — the two were deliberately **de-mixed** (CHR-245).

- **Earn:** spark-a-play on leaving a cabinet (+2, tapering after 12/day → 0, anti-farm); quests (3–15+); co-op campaigns (8–22 each); the daily task (base 8, ×2 on weekend festivals); **arcade Dailies** (via the sparqbank wallet). Phase-2 vision: real-world taps also credit sparqs.
- **Spend:** premium avatar cosmetics + placed **décor** (buy-in-place).
- **World Energy meter:** fills from earned sparqs; when full it "flourishes" and resets (a shared-world flourish hook).
- **Your Cirql:** your friends shown as **lanterns lighting your CIRQLSPACE** (dim → beacon), starting at 0. Grown two ways: **"share a light"** (meet a traveller in-world) and **inviting real friends** (reuses the platform referral, `?ref=` link). Capped at 12, with per-session dedupe (anti-farm).

---

## 9. Social — presence, chat, moderation, emotes

Live multiplayer over a ring-scoped WebSocket room at **`/ws/cirql`** (`server/cirql-presence.ts`), grown from a `/ws/town` prototype. You only see + hear people on your ring.

- **Presence:** remote travellers render as real avatars (facing, aura, name tags, chat bubbles, smooth interpolation, depth-sorted). Live online count.
- **Chat channels (M8, CHR-249):** a **Global · Party · DM** switcher with per-channel **unread** markers; the composer + feed scope to the active channel.
- **Direct Messages (CHR-248):** 1:1 chat with a **request/accept gate** (no cold stranger DMs — minor-safe), **session-scoped** (both online; no persistent private inbox). A DM directory lists incoming requests, open conversations, and travellers-here → "Message."
- **Moderation (CHR-249):** a **server-side profanity mask** (`server/chat-filter.ts` — leet/separator-aware, masks rather than rejects, dodges the Scunthorpe problem), a **700 ms per-sender rate limit**, and **block/report**. Decision: freeform chat + server moderation (not preset-only). The chat-free path for the youngest players is emotes.
- **Emotes (CHR-260):** a **12-emote wheel** (wave/love/laugh/celebrate/dance/sing/rest/wow/hmm/mad/flip/lantern) → a **timed glyph over your avatar** (with a light motion — dance bounce, sit settle, hop) broadcast to the ring.
- **Share a light:** walk up to a traveller, press E → **both** CIRQLSPACEs light a lantern (the locked social payoff; grows Your Cirql).

---

## 10. Co-op — campaigns, board & parties (M9)

The co-op layer on the same socket, all authoritative **in-memory** (no DB).

- **Campaigns (`cirql-campaigns.ts`):** multi-step co-op quests (5 seed: Lantern Vigil, Wonders Circuit, Shoreline Wander, The Outer Passage, Wonders Marathon), each step carrying a ring-aware waypoint; can span rings.
- **Campaign Board:** structured, **PII-free** matchmaking posts (pick a campaign + preset tags + "new-player-friendly" — **no freeform text**, safe for minors). Two directions: host "join my run" / seeker "take me along."
- **Handshakes:** ask→accept and invite→accept, with rate limits + one-open-post-per-player.
- **Parties:** a shared **teal waypoint** the whole crew moves toward, **synced step progress** (idempotent per step), a members-only **party chat channel**, completion rewards, host-leave disband, late-join sync. Minimal block/report as the safety floor.

---

## 11. Endless content engines (M10)

Makes the world feel infinite and always fresh.

- **Procedural rings (`cirql-ring-gen.ts`):** a `mulberry32`-seeded `generateRing(index)` — biome palette, name from word-lists, radius (rings grow outward), scattered scenery, a keeper NPC, docks, and portals. Deterministic → the same land for everyone forever.
- **Themed seasonal biomes:** meadow · tropical · winter · desert · autumn · woodland · coast · ember — each a distinct scene (palette + landscape + a signature ambient critter). A biome stride guarantees consecutive rings differ.
- **Per-ring generated quests** (§6) and **daily + seasonal loops (`cirql-daily.ts`):** one deterministic rotating **daily task** (attune-a-Wonder / voyage-to-a-new-shore / a-keeper's-task), a **streak** counter, and weekend **Lantern Festival** events (×2 sparqs).
- **A Myst-style puzzle:** the hidden **Sunken Runes** grove on CIRQLSPACE — inspect the runestone for the clue, toggle the runes to match, and the sealed shrine opens for a reward.

---

## 12. World feel & delight

- **World-space ambient critters:** butterflies, bees, dragonflies, arc-hopping grasshoppers, blinking fireflies, gliding gulls, falling snow, rising embers, drifting dust — each with its own motion, anchored to the ground (they stay with the world, not the camera); count scales with island size.
- **Purposeful landscape:** intentional formations — tree groves, flower beds, rock cairns, dirt paths, ponds. Water's edge is fringed with **reeds, grass & flowers**; flowers are rounded 5-petal blooms; trees come in **round + pine** variants; **bushes** scatter (a solid maze/labyrinth primitive). *(Note: the sandbox pivot will strip ring-0 nature and make these placeable objects.)*
- **Cutscenes (CHR-264):** a reusable, data-authored, **skippable letterboxed** cutscene player (`cirql-cutscenes.ts`) — timed "beats" over soft fx (fog/bloom/sparks/aurora/celebrate/dawn). Wired to: **arrival** at a new shore, **onboarding** ("waking at CIRQLSPACE"), **campaign-complete** stings, and **world-energy** milestones.
- **Sailing voyage (CHR-262):** crossing the open sea between surface rings is a short **steerable mini-journey** — pilot the boat, gather drifting light (→ sparqs), the destination island grows through parting fog, then you land into the arrival cutscene. Portals into sub-maps still swap instantly.
- **Interactive voyages (CHR-265):** the portal → sub-map system (§2).

---

## 13. Décor & visiting (CHR-259) — the seed of the sandbox

- **Décor (`cirql-decor.ts`):** buy decorations with SPARQS and **place them on your CIRQLSPACE** (a scrollable palette → tap to place, tap to remove, with a ghost preview). Placements persist in the save. Items are emoji-glyph or **pixel-prop** (Path Bricks = walkable ground, Stones + Fences = solid building blocks — the "2D-Minecraft" start). Décor is **CIRQLSPACE-only**.
- **Visiting:** presence broadcasts your placements; a **Visit** button on any online traveller renders **their** CIRQLSPACE décor read-only with a "Visiting X's CIRQLSPACE / Go home" banner. This is the direct precursor to the planned **build-your-world sandbox + live parties**.

---

## 14. The real-world tie (how it fits Cirqlback)

CIRQL sits inside the Cirqlback platform (customers, businesses, coordinators; NFC taps; rewards; billing; admin). The connection:

- **Economy, not scenery:** real-world engagement (rewards programs, taps) and in-game play both earn **SPARQS**, which build your world. (An in-world "businesses become landmarks" experiment, CHR-261, was built and is now **being retired** as off-concept clutter — the loyalty↔world tie moves fully to the SPARQS economy.)
- **Platform points** (the loyalty/redemption currency for real perks) stay **separate** from SPARQS — deliberately de-mixed so a client-editable game balance never touches real rewards.

---

## 15. Architecture & tech

- **Client:** React + a canvas **RetroEngine** (supersampled 16-bit; `retro-engine.ts`). `CirqlWorldEngine extends RetroEngine` with hooks the page wires (interact, move, sail, quest, presence, emote, voyage, décor, landmark). Crisp UI text via an `onOverlay` pass after the pixel-buffer upscale.
- **Server:** Node/Express (run via `tsx`; no server hot-reload — restart after server edits). WebSockets: a `noServer` upgrade router routes `/ws/cirql` to `server/cirql-presence.ts`. Postgres (Neon) via Drizzle; the `game_progress` table holds saves + the sparqbank wallet (`gameId='sparqbank'`).
- **Key game files:** `cirql-world-engine.ts` (renderer/controller), `cirql-world.ts` (ring-0 data + prop model), `cirql-ring-gen.ts` (procedural rings/sub-maps), `cirql-quests.ts` + `cirql-quest-gen.ts` (quests), `cirql-daily.ts` (daily/events), `cirql-campaigns.ts` (co-op), `cirql-cutscenes.ts`, `cirql-emotes.ts`, `cirql-decor.ts`, `cirql-theater.ts` (the Drive-In); page `pages/cirql.tsx`; creator `components/cirql/character-creator.tsx`; server `server/cirql-presence.ts`, `server/chat-filter.ts`.
- **Deploy:** branch `chr-5-7-phase0-run-locally`, auto-deploys to Render (`cirqlback.onrender.com/cirql`). Dev: `npm run dev` → port 5000.

---

## 16. Status & what's next

- **Done & live:** milestones **M0–M11** (world, identity, quests, CirqlCade, sparqs economy, hardening, social/chat/DMs/moderation, co-op campaigns/parties, endless engines, depth & delight — emotes, cutscenes, voyages, jump, décor + visiting), plus a **world-feel polish** pass (CIRQLSPACE rename, living landscape, building-block décor). The old "CIRQL — Flagship World" Linear project is **55/55 done**.
- **Planned next (not built):** the **CIRQLSPACE Sandbox** pivot — CIRQLSPACE becomes a blank, fully-buildable world (terrain paint + placeable objects, cozy→estate land growth, live parties), game content moves to a **Town** at ring 1, procedural wilds shift to ring 2, and the business landmarks are retired. Tracked in the Linear project **"CIRQLSPACE — Your Sandbox"** and detailed in `CIRQLSPACE-Sandbox-Plan`.
