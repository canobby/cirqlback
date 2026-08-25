# CIRQLVERSE — Quest Palette & Build Plan

A blueprint for making CIRQL's quests as varied and fun as they can be: **~30 quest types**, all **5 delivery mechanisms**, sequenced into build phases so shared plumbing gets built once and every quest type after it comes cheap.

> **Owner direction:** build lots of variety · mix in *all* the discovery/delivery types · procedural is fine early but **fades out after ring 3** — from ring 4 on, authored types are the spine and procedural is just light seasoning.

## The mix ratio (by ring)

| Rings | Quest feel |
|---|---|
| 0–1 | Authored onboarding chain (walk / light / enter) |
| 2–3 | Procedural teaches the verbs (kindle / gather / errand / discover / wayfind) |
| **4+** | **Authored palette is the spine; procedural is seasoning only.** Each ring pulls 3–4 *different* types + 1 marquee, rotating categories so no two rings play alike. |

**Per-ring recipe (ring 4+):** 1 marquee (mystery / choice / saga) · 1 world-interaction (escort / ecology / tame) · 1 puzzle-or-skill · 1–2 quick shorts (a discovery, a bounty, a light procedural) · occasionally an outer co-op campaign. Rotate which categories each ring draws from.

---

# The engine primitives (build once, reuse everywhere)

Almost every quest type is a **combination of four primitives**. Build these well and each new quest type is mostly authoring.

## 1. Objective verbs (the atoms)
**Have today:** reach · interact · enterWonders · lightLanterns · solvePuzzle · gather · deliver.
**To add:** escort (follow a moving target to a place) · timed (finish before T) · tame (raise a creature's trust to a threshold) · photograph (capture a subject under a condition) · collect-variant (log a species/set) · stealth (reach without detection) · rhythm (match a sequence) · place/build (set a décor or part) · decode (answer a riddle/cipher) · survey (visit N hidden spots).

## 2. Delivery / triggers (how a quest ARRIVES — build all five)
1. **Giver-offered** — an NPC hands it to you. *(have)*
2. **Discovered** — inspect a tablet / scene / oddity → the quest is granted. *(Sunken Runes model — generalize it)*
3. **Triggered** — a condition makes it appear: night, a storm, the aurora, a Renown rank, a holiday.
4. **Chosen** — pick from a rotating **bounty board** hub.
5. **Emergent** — the world state offers it: you *notice* a blighted grove, a lost traveller, a fraying anchor — no giver.
6. **Chained / consequence** — a prior choice's `pick` flag spawns a follow-up. *(the pick flag exists)*

> Varying *how a quest arrives* does as much for freshness as varying its content. This is the highest-leverage thing to build.

## 3. Reward grants (what you get)
**Have:** sparqs · Renown. **To add:** décor / cosmetic unlock (`grants` field — stubbed) · codex entry · companion/pet unlock · a visible world-state change (a grove reblooms).

## 4. Persistent state (what the world remembers)
**Have:** quest progress · choice `pick` flags · lit set. **To add:** per-NPC relationship/trust · a codex · collections/passport · per-ring world mutations · tamed-companion roster.

---

# The quest-type palette (~30 types)

Tags: ✅ built · 🟢 reuses systems we have · 🟡 modest new mechanic · 🔴 bigger new system · **[S/M/L]** build size.

## Narrative
- **Mystery / investigation** ✅ — clue-trail + deduction *(False Light)*.
- **Branching choice / dilemma** ✅ — a fork that changes reward + standing.
- **Serialized saga** 🟢 [M] — a multi-chapter story across visits/rings; each chapter ends on a hook.
- **NPC bond / companion** 🟡 [M] — befriend a named NPC over small favors; they remember you, send gifts, eventually travel with you.
- **Recurring rival** 🟢 [S] — a trickster who reappears ring after ring; you out-think them each time.
- **Lore / archaeology + codex** 🟡 [M] — reassemble history from murals/tablets/songs; a fillable codex rewards the curious.

## Creature & world (uses the fauna trust system)
- **Escort** 🟢 [S] — lead a shy creature/NPC past hazards.
- **Tame → pet / mount** 🔴 [L] — earn trust in stages until a creature follows you home or you can ride it.
- **Ecology / restoration** 🟡 [M] — heal a blight, replant, relocate creatures — the ring *visibly changes*.
- **Naturalist census / passport** 🟢 [M] — find & log every creature variant into a collection.
- **Photograph / postcard** 🟢 [S] — capture a vista/creature at the right time of day *(ties to the diorama/360 shots)*.

## Skill & timing
- **Timed / race** 🟢 [S] — beat a tide/sunset/comet, or race an NPC's ghost.
- **Traversal / parkour** 🟡 [M] — reach a hidden vista via updrafts, stepping-stones, tide windows.
- **Stealth** 🟡 [M] — slip past a sleeping guardian or skittish herd without spooking it (inverts the flee AI).
- **Rhythm / music** 🟡 [M] — tune the world's instruments or match a melody *(uses the soundtrack engine)*.
- **Trial / boss (puzzle-boss)** 🔴 [L] — the sub-realm payoff; out-position or out-puzzle a guardian.

## Puzzle & mind
- **Environmental puzzle (per-biome)** 🟢 [S] — light/mirror/prism/pattern puzzles *(generalize Sunken Runes, biome-flavored)*.
- **Riddle / cipher** 🟢 [S] — decode a glyph to reveal a hidden place.
- **Trade / barter chain** 🟢 [S] — "bring me X → get Y (that someone else wants) →…" walks you around the ring.

## Build & homestead (ties CIRQLSPACE in)
- **Restore / build** 🟡 [M] — repair a landmark in stages; drops biome décor *(the `grants` field is stubbed)*.
- **Commission / craft** 🟡 [M] — an NPC wants a *built* thing; you make & deliver it.
- **Homestead-reward quest** 🟢 [S] — a quest whose whole point is furnishing your space.

## Live & dynamic
- **Outer co-op campaign** 🟢 [S authoring] — multi-stage party expeditions on the new shores *(system exists, never left the Town)*.
- **Random world event** 🟡 [M] — a wandering merchant / shooting star / stranded traveller appears for a window.
- **Weather / time-gated** 🟢 [S] — a quest that only exists at night, in a storm, or under the aurora.
- **Bounty board** 🟡 [M] — a rotating hub where you *choose* your next target.
- **Consequence follow-up** 🟢 [S] — an earlier `pick` spawns a later quest (the sprite you spared returns).
- **Community world-goal** 🔴 [L] — a ring-wide meter everyone fills together; seasonal, server-side.

## Exploration
- **Treasure hunt** 🟢 [S] — a map fragment → X-marks-the-spot → dig.
- **Hidden / secret quest** 🟢 [S] — no giver; you *stumble* onto it *(the best moments)*.
- **Cartography / survey** 🟢 [S] — chart an unmapped stretch; feeds "The Widening Sea."

---

# The phased build plan

Grouped so each phase builds shared plumbing that unlocks several quest types at once. Rough sizes assume authoring a handful of instances per type.

## Phase 1 — Delivery framework *(highest leverage — unlocks all 5 delivery types)*
Build the **triggers + reward-grants** primitives:
- **Discoverable trigger** — inspect a prop → grant a quest *(generalizes Sunken Runes)*.
- **Condition trigger** — time / weather / Renown / holiday / choice-flag gating.
- **Bounty board** — a rotating "pick your next task" hub.
- **Emergent offers** — the world flags a fixable state (blight, lost traveller).
- **Reward grants** — wire décor/cosmetic unlock + a **codex**.

**Unlocks immediately:** discovery quests · hidden/secret · treasure hunt · weather/time-gated · consequence follow-ups · bounty board · homestead-reward. *(~7 types from plumbing alone.)*

## Phase 2 — New objective verbs *(cheap, reuse existing systems)*
- **escort** (fauna follow) · **timed/race** · **trade/barter chain** · **riddle/cipher** · **environmental puzzle** (generalized) · **photograph/postcard** · **naturalist census**.

**Unlocks:** ~7 more types, each a small verb + advance hook.

## Phase 3 — Deeper mechanics
- **tame → pet/companion** · **ecology/restoration** (ring mutation) · **stealth** · **rhythm/music** · **traversal/parkour** · **serialized saga** (chapter state) · **NPC bond** · **restore/build** (staged) · **commission**.

## Phase 4 — Live / social / scale
- **outer co-op campaigns** (author off-Town) · **random world events** · **community world-goal** · **trial/boss**.

## Recommended start
**Phase 1**, because varied *delivery* is what makes a questlog feel alive, and it's mostly data + small hooks on top of what we have. Once the framework is in, Phases 2–3 become a fast cadence of "add a verb, author a few quests."

---

# The rework — rebuild ALL quests + campaigns from the beginning

Owner's call: this isn't only *adding* types — we **rework the whole quest + campaign spine from ring 0 out**, so the entire arc is intentional and varied, not procedural-by-default.

## Quests — from the beginning
- **Rings 0–1 (onboarding):** keep the teach-the-verbs chain but make it charming and tighter — each step introduces a *world*, not just a control. Add one early **discovery** and one early **choice** so the player learns those exist immediately.
- **Rings 2–3 (procedural teaching):** keep procedural, but curate it — hand-pick which shapes appear so these two rings deliberately showcase kindle / gather / errand / discover before authored takes over.
- **Rings 4–13 (existing biomes):** **retire procedural as the headline.** Author a marquee + a rotating palette mix per ring (procedural drops to occasional seasoning). Each ring gets biome-appropriate quests drawn from the palette so its questlog *shape* is unique.
- **Rings 14–25 (exotic):** authored from the palette out of the gate.

## Campaigns — reworked into a cross-ring ladder
Today all 5 campaigns sit on the Town (Chill/Quick/Epic). Rework into a **progression ladder that climbs the rings**, using the palette's co-op-able types:
- **Tier 1 (Town, newbie):** keep 2–3 gentle Town campaigns (the Lantern Vigil etc.) as the on-ramp.
- **Tier 2 (rings 2–6, Rank 2–3):** co-op versions of the new types — a **co-op escort** (guide a herd together), a **co-op puzzle** (align prisms), a **co-op timed run** (beat the tide as a party).
- **Tier 3 (rings 7–13, Rank 4–6):** multi-ring expeditions + **restore/build** campaigns (a party rebuilds a landmark), each Renown-gated.
- **Tier 4 (rings 14–25, Rank 6–7):** the hard **trial/boss** campaigns and the **community world-goal** events.
- Reward + difficulty scale with the ring; every campaign gets a real **destination + a set-piece finish**, not a lap of the Commons.

## Workstream ordering
The rework rides on the same phases: build the **Phase 1 framework**, then rework rings **outward from 0** while authoring new palette quests, and rework campaigns tier-by-tier alongside. So "rework from the beginning" and "build the palette" are the same effort, done ring by ring.

---

# How this plugs into the rings (summary)

- Rings 0–3: curated onboarding + teaching (procedural, tightened).
- Rings 4–13 (existing biomes): reworked — authored marquee + rotating palette mix; procedural becomes seasoning.
- Rings 14–25 (exotic): authored from the palette out of the gate.
- Campaigns: reworked from Town-only into a cross-ring, Renown-gated ladder.
- The mystery/choice engine (built) + this palette + the delivery framework together retire the "same stuff over and over" problem for good.
