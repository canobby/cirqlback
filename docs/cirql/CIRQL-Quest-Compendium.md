# CIRQLVERSE — Quest & Content Compendium

A complete catalogue of everything the flagship world runs on today: every quest type, every campaign, every goal track, and a ring-by-ring map of rings 0–13. This is the reference we plan the next 12 rings against.

*Generated from the live game code — authored quests, the procedural quest generator, co-op campaigns, journeys, and the daily/seasonal loops.*

## At a glance

| System | What it is | How many | Where it lives |
|---|---|---|---|
| Authored quests | Hand-written onboarding + a puzzle + a cross-ring errand | 6 | `cirql-quests.ts` |
| Procedural ring quests | 6 reusable *shapes* generate 1 main + N side quests per ring | ~74 through ring 13 (caps at 9/ring) | `cirql-quest-gen.ts` |
| Co-op campaigns | Multi-step party adventures with a shared waypoint | 5 | `cirql-campaigns.ts` |
| Flagship journeys | Personal epics tracking a cumulative metric | 4 | `cirql-journeys.ts` |
| Renown ladder | Earned-not-spent rank track that gates elite content | 8 ranks | `cirql-renown.ts` |
| Daily / seasonal / holidays | One rotating daily + weekend + real-world holiday boosts | 3 tasks · 10 holidays | `cirql-daily.ts` |

**Two currencies / tracks.** **SPARQS** = the spend currency (quests + dailies pay it). **Renown** = personal standing, *earned and never spent*; it climbs a rank ladder and gates the hardest content.

---

# The Anatomy of a Ring

Every procedural ring (2 and outward) is composed the same way, then dressed by its biome. This is the skeleton the next 12 rings will fill:

- **Two docks** — inward (toward home) and onward (into the fog).
- **A winding spine** from the inward shore to a central **beacon hub**, lined with thicket hedges that guide without trapping (Mana-World-style soft-guidance).
- **A keeper** at the hub (offers the ring's main quest) + a **wanderer** down the trail (errand/delivery target) + **sider NPCs** spread along the spine (one per side quest).
- **A focal landmark** (the biome's signature set-piece) that doubles as a quest beat.
- **1–3 sub-realms** reached by portals — a *cave*, a *hollow tree*, or a *cloud stair* (winter gets a *storm* you brave instead).
- **A two-ended tunnel** shortcut across the island.
- **A gathering spot** — ring 2 has the **Cirql Drive-In**; every other ring has **The Commons** (bonfire).
- **Biome dressing** — signature flora, geography, water, groundcover, ambient critter, and a **stateful hero creature** that reacts to you.
- **Collectibles** — lanterns, crystals/shards, and wisps that the quest generator targets.

**Rings grow as you sail out** (radius 430 → 1160+ by ring 13), so outer rings hold more of everything — more quests, more sub-realms, more landmarks.

---

# Currencies & Progression

## The Renown ladder (8 ranks)

Renown rises as you finish quests and campaigns — more the farther out you sail — and gates elite content.

| Rank | Renown needed | Title feel |
|---|---|---|
| 1 | 0 | Newcomer |
| 2 | 20 | Wayfarer |
| 3 | 55 | Pathfinder |
| 4 | 120 | Voyager |
| 5 | 240 | Trailblazer |
| 6 | 430 | Cartographer |
| 7 | 700 | Circle-Keeper |
| 8 | 1,100 | Luminary |

*A quest awards `2 + tier` Renown (tier = ring index − 1); the main quest pays full, side quests ~60%.*

## Flagship journeys (personal epics)

Long-horizon tracks that read cumulative progress and pay Renown at each milestone (8 / 15 / 25 / 40 / 60 / 80 Renown per step).

| Journey | Tracks | Milestones |
|---|---|---|
| 🌊 The Widening Sea | rings reached | 3 · 6 · 10 · 16 · 24 |
| ◎ Cartographer's Circles | circles graduated | 1 · 3 · 6 · 12 |
| 🏡 Founding a Homestead | CIRQLSPACE land tier | 1 · 3 · 5 · 6 |
| ✦ The Keeper's Ledger | quests completed | 5 · 15 · 40 · 100 |

*Note: The Widening Sea already targets **24 rings** — the horizon the next 12 rings extend toward.*

---

# Authored Quests (hand-written)

These six are bespoke — the onboarding chain, a discovery puzzle, and a cross-ring errand.

### 1. Find Your Feet — *Find Your Feet → The Lantern Path → The CirqlCade Door* (chain)
- **Giver:** the keeper · **Reward:** 3 sparqs
- Walk to the western glimmer and back. Teaches the *walk* verb. Auto-chains into…

### 2. The Lantern Path
- **Auto-chained** · **Reward:** 4 sparqs
- Light 3 path lanterns (press E by each). Teaches *interact*. Auto-chains into…

### 3. The CirqlCade Door
- **Auto-chained** · **Reward:** 5 sparqs
- Step inside CirqlCade. Teaches *enter*.

### 4. The Sunken Runes *(puzzle — the one true set-piece)*
- **Granted by:** a runestone tablet in a hidden grove (discovery-driven, no giver) · **Reward:** 15 sparqs
- *"Four runes ring the shrine. Wake them all — save the second, which must sleep."* Match the runes to the tablet's clue, then enter the shrine that opens. This is the model for what we want **more** of.

### 5. A Word to the Neighbours *(cross-ring errand)*
- **Giver:** the keeper · **Reward:** 14 sparqs
- Gather word at the Town Commons (ring 1) → carry it home to Cirqla (ring 0). Demonstrates multi-ring objectives with a moving waypoint.

---

# Procedural Ring Quests (the engine that scales)

Each ring from 2 outward gets **one main quest** (keeper, at the hub, the onward through-line) plus a **scaling number of side quests** (from sider NPCs). The generator picks from **six shapes**, parameterised by the ring's props, then scales difficulty + reward by how far out you are.

## The six quest shapes

| Shape | Objective | Notes |
|---|---|---|
| **Kindle** | Light N lanterns of the ring | N grows with tier (2 → up to all) |
| **Gather** | Walk over N scattered wisps | N grows with tier (3+) |
| **Errand** | Hear the wanderer's news → report back | 2-step |
| **Delivery** | Carry a parcel out to the wanderer | 1-step |
| **Discover** | Seek the ring's singing shard (a crystal) | follow-the-glimmer |
| **Wayfind** | Scout the onward shore (main-quest through-line) | main quests only |

**Objective verbs the engine understands:** reach · interact · enterWonders · lightLanterns · solvePuzzle · gather · deliver.

## Escalation & reward scaling

- **Main quests escalate** on deeper rings: tier ≥ 2 adds *"pay respects at the landmark"*; tier ≥ 4 adds *"chart the onward shore"* — so an outer main quest is a 3-step expedition, not a fetch.
- **Reward:** main sparqs = `min(60, 6 + tier·3)`; side ≈ 70% of that. Renown scales with tier.

## Side-quest scaling per ring

`side quests = min(8, floor(ring / 1.5))` — so rings ramp from 2 quests up to a 9-quest destination:

| Ring | Main + side = total |
|---|---|
| 2 | 1 + 1 = **2** |
| 3–4 | 1 + 2 = **3** |
| 5 | 1 + 3 = **4** |
| 6–7 | 1 + 4 = **5** |
| 8 | 1 + 5 = **6** |
| 9–10 | 1 + 6 = **7** |
| 11 | 1 + 7 = **8** |
| 12–13 | 1 + 8 = **9** |

**~74 quests exist through ring 13**, reaching ~100 by ring 15.

> **Honest note for planning:** the procedural quests are powerful for *coverage* but they are six shapes wearing different names — "Kindle Cinderstrand," "Gather the Emberfall Wisps," etc. This is exactly the "same stuff over and over" to break up. The authored *Sunken Runes* puzzle is the only true set-piece. The next 12 rings should add **new shapes + hand-authored landmark quests** on top of the generator.

---

# Co-op Campaigns (party adventures)

Five multi-step campaigns a party runs together with one shared, moving waypoint. Difficulty tiers: **Chill · Quick · Epic**. Every current campaign plays out on the Town / ring 1–2.

| Campaign | Difficulty | Party | Reward (each) | Gate | Steps |
|---|---|---|---|---|---|
| The Lantern Vigil | Chill · newbie | 2–4 | 12 | — | Gather → light lanterns → attune at CirqlCade → regroup (4) |
| The Wonders Circuit | Quick | 2–4 | 10 | — | Meet → each play a Wonder → regroup (3) |
| Shoreline Wander | Chill · newbie | 2–5 | 8 | — | Western shore → coast to dock → back (3) |
| The Outer Passage | **Epic** | 2–5 | 22 | Rank 2 | Town Commons → next shore's Commons → Drive-In show → sail home (4) |
| Wonders Marathon | **Epic** | 3–5 | 20 | Rank 3 | Rally → shore → dock → lantern path → CirqlCade (5) |

*Matchmaking is PII-free: posters pick from fixed tags (Chill pace · Quick run · New players welcome · Thorough · No mic needed · Friendly).*

> **Planning note:** all five campaigns live on the Town. There are **zero campaigns set on the outer biome rings** — a wide-open lane for the next 12 rings (multi-stage, difficult, Renown-gated expeditions across the new shores).

---

# Daily, Seasonal & Holiday Loops

## The rotating daily (one per UTC day, same for everyone)

| Task | Do this | Base reward |
|---|---|---|
| Attune to a Wonder | Play any CirqlCade game | 8 sparqs |
| Answer the Sea | Sail to a shore you've never reached | 8 sparqs |
| A Keeper's Task | Complete any shore keeper's quest | 8 sparqs |

## Events (multiply the daily reward)

- **Weekend Lantern Festival** 🏮 — Sat/Sun, ×2 sparqs.
- **Real-world holidays** (local calendar, take precedence): New Year ×3 · Valentine's ×2 · Fourth of July ×2 · Halloween ×2 · Thanksgiving ×2 · Christmas Eve ×2 · **Christmas ×3** · Easter ×2 · Memorial Day ×2 · Labor Day ×2.

---

# Ring-by-Ring Map (rings 0–13)

The world today. Ring 0–1 are hand-authored; 2+ are generated. **Hero fauna** is the stateful creature that reacts to you on that shore.

| Ring | Name | Biome | Landmark | Sub-realms | Quests | Hero fauna |
|---|---|---|---|---|---|---|
| 0 | **CIRQLSPACE** | home (authored) | your homestead | cave (to Town) | onboarding chain | — |
| 1 | **Town** | authored | Town Hall / CirqlCade | cave | authored + campaigns | — |
| 2 | Mistcrest | 🌌 aurora | The Great Crystal | cloud stair | 2 · +Drive-In | caribou · snow-hare |
| 3 | Lumenhaven | 🍁 autumn | The Stone Circle | hollow tree | 3 | squirrel · deer |
| 4 | Cinderstrand | 💎 canyon | The Old Ruin | cave | 3 | crystal-moth |
| 5 | Cinderwood | ❄ winter | The Great Crystal | the storm | 4 | snow-fox · snow-hare |
| 6 | Verdantcrest | 🔥 ember | The Old Ruin | cave · cave | 5 | salamander |
| 7 | Frostreach | 🌼 meadow | The Great Tree | hollow tree · cave | 5 | deer · hare |
| 8 | Cindervale | 🌲 woodland | The Great Tree | hollow tree · cave | 6 | deer · rabbit · fox |
| 9 | Whispermarsh | 🌾 savanna | The Great Tree | hollow tree · cave | 7 | gazelle |
| 10 | Cinderreach | 🏜 desert | The Old Ruin | cave · cave | 7 | fennec |
| 11 | Emberfall | 🍄 marsh | The Great Tree | hollow tree · cave | 8 | newt |
| 12 | Coralreach | 🏝 tropical | The Falls | cave · hollow tree | 9 | tree-frog |
| 13 | Hollowwilds | 🌊 coast | The Lighthouse | cloud stair · cave · hollow tree | 9 | crab |

> **Naming quirk to fix:** procedural names are drawn from a word-pool independent of biome, so "Cinderwood" lands on the **winter** ring and "Frostreach" on the **meadow** ring. The next 12 rings (and ideally a retro-fit of these) should use **biome-aware naming**.

---

# Observations → what the next 12 rings should add

What we have is a strong *skeleton* and *coverage engine*. What it lacks is **memorable, unique, hand-authored moments**. Going into the ring 13–24 brainstorm, the opportunities are:

1. **New quest shapes** beyond the six (escort, defend, build/restore, multi-part mystery, timed, choice-driven).
2. **Authored landmark set-pieces** per ring — a Sunken-Runes-caliber puzzle or story beat that's *this ring's thing*.
3. **Outer-ring co-op campaigns** — multi-stage, difficult, Renown-gated expeditions across the new biomes (today all 5 campaigns are on the Town).
4. **Sub-realm payoffs** — caves/hollow-trees/cloud-stairs currently exist as spaces; give a few of them a reason (a boss, a vault, a vista).
5. **A long/short rhythm** — pair each big multi-stage arc with quick 1–2 step palate-cleansers so it never feels grindy.
6. **Biome-aware naming + a signature NPC cast** so each shore is a *place*, not a template.
7. **Build-reward ties** — quests that drop biome-flavoured décor/materials for your CIRQLSPACE (the already-planned economy).

*This compendium is the baseline. The 12 new rings get planned against it next.*
