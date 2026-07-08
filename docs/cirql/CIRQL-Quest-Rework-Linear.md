# CIRQL — Quest Palette & Rework · Linear Plan

The executable issue plan for the quest work, structured as a Linear **epic + 6 issues** (each with a task checklist). Ready to create in the **CIRQL — Flagship World** project (team CHR) once the workspace issue limit is lifted.

> **Blueprint:** `CIRQL-Quest-Palette-Build-Plan.pdf` · **baseline:** `CIRQL-Quest-Compendium.pdf` · **exotic rings:** `CIRQL-Rings-14-25-Design.pdf`.
>
> **Foundation already shipped:** ✅ Mystery/Choice quest engine (`QuestDef.choice` + `choiceDialog()` + persisted `pick`) with the "False Light" pilot · ✅ 12 biome rings, per-ring tint, biome-aware naming.

---

# ⭐ EPIC — CIRQL Quest Palette & Rework
*Priority: High*

Make CIRQL's quests as varied and fun as possible: **~30 quest types** across **5 delivery modes**, built on **4 reusable engine primitives**, plus a full **rework of every quest + campaign from ring 0 out**. Procedural teaches the verbs on rings 0–3, then fades to seasoning from ring 4 — authored palette becomes the spine.

**The 4 primitives (build once, reuse everywhere):** objective verbs · delivery/triggers · reward grants · persistent state.

**Children:** Phase 1 (delivery framework) · Phase 2 (objective verbs) · Phase 3 (deeper mechanics) · Phase 4 (live/social) · Rework quests · Rework campaigns.

---

# Issue 1 — Phase 1: Quest delivery framework
*Priority: High · the highest-leverage start; unlocks all 5 delivery modes + ~7 quest types*

Build the trigger + reward-grant primitives so quests can *arrive* in varied ways, not only from a keeper.

- [ ] **Discoverable trigger** — inspect a tablet/scene/oddity → grant a quest (generalize the Sunken Runes model into reusable data)
- [ ] **Condition triggers** — gate a quest on time-of-day / weather (storm, aurora) / Renown rank / holiday / a choice `pick` flag
- [ ] **Bounty board** — a rotating "pick your next task" hub (a placeable prop + a small selection UI)
- [ ] **Emergent offers** — the world flags a fixable state (blight, lost traveller, fraying anchor) → offers a quest with no giver
- [ ] **Reward-grant wiring** — wire `QuestChoiceOption.grants` / a quest `grants` to unlock décor/cosmetics; add a **codex** entry grant
- [ ] Verify each delivery mode end-to-end in-browser; author 1 example quest per mode

**Unlocks:** discovery · hidden/secret · treasure hunt · weather/time-gated · consequence follow-ups · bounty board · homestead-reward.

---

# Issue 2 — Phase 2: New objective verbs
*Priority: Medium · cheap; each verb reuses systems we already have*

Add the atomic verbs that most authored quests are built from.

- [ ] **escort** — follow a moving creature/NPC to a place (reuses the fauna trust/AI)
- [ ] **timed / race** — finish before a timer (beat a tide/sunset/comet, or an NPC ghost)
- [ ] **trade / barter chain** — bring X → get Y (that someone else wants) → …
- [ ] **riddle / cipher** — answer a riddle/decode a glyph via dialog to reveal a place
- [ ] **environmental puzzle (generalized)** — light/mirror/prism/pattern puzzle, one signature per biome (generalize Sunken Runes)
- [ ] **photograph / postcard** — capture a subject/vista under a condition (reuses the diorama/360 shot)
- [ ] **naturalist census** — find & log every creature variant into a collection/passport
- [ ] Author 1–2 example quests per verb

---

# Issue 3 — Phase 3: Deeper quest mechanics
*Priority: Low · bigger new systems; do after Phases 1–2 land*

- [ ] **tame → pet / mount** — earn a creature's trust in stages until it follows you home / you can ride it (persistent companion state)
- [ ] **ecology / restoration** — heal a blight, replant, relocate creatures; the ring *visibly changes* (per-ring world mutation)
- [ ] **stealth** — slip past a sleeping guardian or skittish herd without spooking it (invert the flee AI + a detection meter)
- [ ] **rhythm / music** — tune the world's instruments / match a melody (uses the soundtrack engine)
- [ ] **traversal / parkour** — reach a hidden vista via updrafts / stepping-stones / tide windows
- [ ] **serialized saga** — a multi-chapter story across visits/rings, chapter state + hooks
- [ ] **NPC bond / companion** — befriend a named NPC over small favors; relationship state, gifts, they remember you
- [ ] **restore / build (staged)** + **commission / craft** — repair a landmark in stages / build-and-deliver an item (ties to CIRQLSPACE décor)

---

# Issue 4 — Phase 4: Live / social / scale quests
*Priority: Low*

- [ ] **Outer co-op campaigns** — author multi-stage party expeditions on the outer shores (system exists; just never left the Town)
- [ ] **Random world events** — a wandering merchant / shooting star / stranded traveller appears for a limited window
- [ ] **Community world-goal** — a ring-wide meter everyone fills together; seasonal, server-side aggregate
- [ ] **Trial / boss** — the sub-realm payoff: a guardian you out-position or out-puzzle

---

# Issue 5 — Rework: all quests (ring 0 → 25 spine)
*Priority: Medium · rides on the Phase 1 framework; rework outward from ring 0*

- [ ] **Rings 0–1 (onboarding)** — keep the teach-the-verbs chain but make it charming + tighter; add one early **discovery** and one early **choice** so the player meets those immediately
- [ ] **Rings 2–3 (procedural teaching)** — curate which procedural shapes appear so these two rings deliberately showcase the verbs before authored takes over
- [ ] **Rings 4–13 (existing biomes)** — retire procedural as the headline; author a **marquee + rotating palette mix** per ring so each questlog's *shape* is unique (procedural → occasional seasoning)
- [ ] **Rings 14–25 (exotic)** — author from the palette out of the gate (per the exotic-rings design)
- [ ] Confirmed no two rings play alike; procedural share ≤ ~20% from ring 4 out

---

# Issue 6 — Rework: campaigns into a cross-ring ladder
*Priority: Medium · today all 5 campaigns sit on the Town*

- [ ] **Tier 1 (Town, newbie)** — keep/polish 2–3 gentle Town campaigns as the on-ramp (Lantern Vigil etc.)
- [ ] **Tier 2 (rings 2–6, Rank 2–3)** — co-op versions of new types: **co-op escort** (guide a herd), **co-op puzzle** (align prisms), **co-op timed run** (beat the tide as a party)
- [ ] **Tier 3 (rings 7–13, Rank 4–6)** — multi-ring expeditions + **restore/build** campaigns, Renown-gated
- [ ] **Tier 4 (rings 14–25, Rank 6–7)** — hard **trial/boss** campaigns + the **community world-goal** events
- [ ] Every campaign gets a real destination + set-piece finish (no Commons laps); reward + difficulty scale with the ring

---

## Suggested order

**Phase 1 → (Phase 2 ∥ start Rework rings 0–3) → Phase 3 ∥ Rework rings 4–13 ∥ Campaign rework tiers 1–2 → Phase 4 ∥ exotic rings 14–25 ∥ Campaign tiers 3–4.**

The rework and the palette build are the same effort done ring by ring — build a primitive, then rework/author the rings that use it.
