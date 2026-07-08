// CIRQL — quest system (M3, CHR-224/225). The reusable backbone so we can add
// quests forever. Definitions live here in code; per-player PROGRESS rides in the
// `cirql` game_progress state blob (no new tables — dodges the broken db:migrate).
//
// An objective is satisfied by a world event the engine already knows about
// (reaching a marker, interacting with a target, entering the Wonders, lighting
// lanterns). Quests are chained via `next`, so completing one can auto-offer the
// following one — the M4 onboarding chain is just data in QUESTS below.

export type ObjectiveKind = "reach" | "interact" | "enterWonders" | "lightLanterns" | "solvePuzzle" | "gather" | "deliver"
  | "escort"    // lead a follower to a destination prop (Phase K7 Phase 2)
  | "riddle"    // answer a riddle correctly (via a dialog choice)
  | "census"    // spot N distinct creature variants on the ring (naturalist)
  | "act";      // perform an avatar ACTION — hop / run / sit / an emote id (dance/wave/cheer/…), optionally near a prop

export interface Objective {
  kind: ObjectiveKind;
  target?: string;   // prop id (reach/interact/escort-destination) — resolved against the ring's props
  count?: number;    // for lightLanterns/gather/census (default 1)
  label: string;     // shown in the tracker / log
  ring?: number;     // if set, this objective is on that ring — advances only there; off-ring the waypoint points to the dock (cross-ring quests)
  from?: string;     // escort: the prop id the follower starts at (defaults to the giver / player)
  act?: string;      // "act" objective: which action to perform — "hop"/"run"/"sit" or an emote id; `target` (if set) = the prop you must be near
}

// A branching MYSTERY/CHOICE quest (the ring 14-25 marquee model): after the clue-trail
// objectives are done, the player is offered a FORK. Each option grants its own reward +
// sets a persisted standing flag, so both paths feel good (flavour vs Renown).
export interface QuestChoiceOption {
  id: string;                              // stable option key (persisted as the "pick")
  label: string;                           // the button text
  blurb?: string;                          // a short consequence line under the button
  reward: { sparks: number; renown?: number };
  grants?: string;                         // optional décor/cosmetic id to unlock (build-reward tie; wired later)
  toast?: string;                          // confirmation line shown when chosen
}
export interface QuestChoice {
  prompt: string[];                        // the fork question, shown once the clues are gathered
  options: QuestChoiceOption[];
}

// ---- DELIVERY & REWARD framework (Phase K7 — how a quest ARRIVES + what it grants) ----
// A quest's availability condition. Evaluated by the engine (which knows time/rank/holiday/flags).
export interface QuestRequire {
  timeOfDay?: "day" | "night";   // only available in daylight / at night
  minRenownRank?: number;        // Renown rank index required (0 = Newcomer)
  holiday?: boolean;             // only during a real-world holiday / weekend festival
  flag?: string;                 // requires a set flag — "<questId>" done, or "<questId>:<pick>"
  notFlag?: string;              // hidden once this flag is set (one-shot / mutually-exclusive)
}
// A codex entry recorded on completion (the world's fillable lore/collection log).
export interface CodexEntry { id: string; title: string; text: string; }

export interface QuestDef {
  id: string;
  name: string;
  giver: string;         // NPC prop id that offers it ("" = not giver-delivered)
  intro: string[];       // giver dialog when offering
  objectives: Objective[];
  reward: { sparks: number; renown?: number };
  next?: string;         // quest auto-offered on completion (the chain)
  tier?: number;         // difficulty tier — grows the farther out you sail (Phase K); undefined = authored/onboarding
  choice?: QuestChoice;  // if set, the quest ends on a branching fork instead of auto-completing
  // delivery (Phase K7): how this quest ARRIVES, beyond a keeper offering it
  discover?: { at: string; ring?: number };   // granted by INSPECTING curio prop `at` (on `ring`) — discovered/emergent
  bounty?: boolean;      // appears in the rotating bounty-board pool (chosen delivery)
  require?: QuestRequire;   // availability condition (triggered delivery: time/rank/holiday/flag)
  // rewards (Phase K7): beyond sparqs/Renown
  grants?: string;       // décor/cosmetic id unlocked FREE on completion (build-reward tie)
  codex?: CodexEntry;    // a lore/collection entry recorded on completion
  heals?: string;        // a curio id this quest "heals" on completion (emergent → the world visibly mends)
  // Phase 2 verbs
  timeLimit?: number;    // a RACE: seconds to finish before it fails + resets
  riddle?: { options: { id: string; label: string }[]; answer: string };   // posed by the discover curio; correct option completes it
}

// The onboarding chain (M4): Find Your Feet → The Lantern Path → The Wonders Door.
// Quest 1 is offered by Ferra (or auto-accepted on first run); the rest auto-chain
// via `next` as each completes. Each teaches one verb: walk → interact → enter.
export const QUESTS: QuestDef[] = [
  {
    id: "find-your-feet",
    name: "Find Your Feet",
    giver: "keeper",
    intro: [
      "Ah — a new face at CIRQLSPACE!",
      "Best way to learn these shores is to walk them.",
      "See that glimmer to the west? Wander over and back.",
    ],
    objectives: [{ kind: "reach", target: "marker-shore", count: 1, label: "Walk to the glimmer" }],
    reward: { sparks: 3 },
    next: "lantern-path",
  },
  {
    id: "lantern-path",
    name: "The Lantern Path",
    giver: "",   // auto-chained from Find Your Feet
    intro: ["The path east is dark. Light the lanterns as you go — press E by each."],
    objectives: [{ kind: "lightLanterns", count: 3, label: "Light the path lanterns" }],
    reward: { sparks: 4 },
    next: "wonders-door",
  },
  {
    id: "wonders-door",
    name: "The CirqlCade Door",
    giver: "",   // auto-chained from The Lantern Path
    intro: ["The lit path leads to CirqlCade. Step inside — press E at the door."],
    objectives: [{ kind: "enterWonders", count: 1, label: "Enter CirqlCade" }],
    reward: { sparks: 5 },
  },
  // The Sunken Runes — a Myst-style puzzle (CHR-258). NOT given by an NPC; the rune
  // tablet in the hidden grove grants it on inspection (discovery-driven). Completed by
  // matching the runes to the tablet's clue, then entering the shrine that opens.
  {
    id: "sunken-runes",
    name: "The Sunken Runes",
    giver: "",   // granted by the tablet, not a keeper
    intro: [
      "The runestone is worn, but the carving is clear:",
      "\"Four runes ring the shrine.\"",
      "\"Wake them all — save the second, which must sleep.\"",
    ],
    objectives: [{ kind: "solvePuzzle", count: 1, label: "Match the runes, then enter the shrine" }],
    reward: { sparks: 15 },
  },
  // A cross-ring errand for Ferra — sail out to the next shore and back (CHR: cross-ring
  // quests). Objectives carry a `ring`, so they advance only on that ring; off-ring the
  // waypoint points you to the dock that sails you the right way.
  {
    id: "neighborly-word",
    name: "A Word to the Neighbours",
    giver: "keeper",
    intro: [
      "Would you gather word from the Town for me?",
      "Meet the neighbours at the Commons, then carry it home to CIRQLSPACE.",
      "The map will point the way — follow the glimmer.",
    ],
    objectives: [
      { kind: "reach", ring: 1, target: "commons", label: "Gather word at the Town Commons" },
      { kind: "interact", ring: 0, target: "guide", label: "Bring word home to Cirqla" },
    ],
    reward: { sparks: 14 },
  },
  // ── EARLY DISCOVERY (rings 0-1 rework) — the first discovery a new player meets, right on the
  // Town shore (no night-gate, unlike Starfall). Inspect the tide-buried cache → a short keepsake
  // hunt to the old pond, paying a décor + a codex line about who lived here before you. ──
  {
    id: "tide-keepsake", name: "What the Tide Kept", giver: "", tier: 0,
    discover: { at: "curio-town", ring: 1 },
    intro: [
      "The tide's uncovered an old cache, its lid worn smooth.",
      "Inside: a child's paper boat, and a chart drawn in a careful hand.",
      "It marks the town pond — where someone, long ago, used to play. Go and see what they left.",
    ],
    objectives: [{ kind: "reach", ring: 1, target: "town-pond", label: "Follow the chart to the town pond" }],
    reward: { sparks: 10, renown: 2 }, grants: "fairylights",
    codex: { id: "codex-tide", title: "Who Was Here Before", text: "Someone loved this shore enough to bury a keepsake for the tide to keep. Now it keeps you." },
  },
  // ── EARLY CHOICE (rings 0-1 rework) — the first branching fork, given by Lio the bard in Town,
  // so a new player meets a real choice within the first ring instead of waiting for ring 11. ──
  {
    id: "lio-song", name: "Lio's Half-Remembered Song", giver: "bard", tier: 1,
    intro: [
      "Oh — good, a fresh pair of ears!",
      "There's a welcome-song this town has sung for ages, but I've lost the second verse.",
      "Marin the cartographer has a memory like a map — ask her. Then the old words are cut into the Town Hall stone.",
      "Bring it back and we'll sing it right. Four steps and a small choice at the end.",
    ],
    objectives: [
      { kind: "interact", ring: 1, target: "cartographer", label: "Ask Marin for the lost verse" },
      { kind: "reach", ring: 1, target: "townhall", label: "Read the founding words on the Town Hall stone" },
    ],
    reward: { sparks: 12, renown: 3 },   // fallback (unused once a choice is picked)
    choice: {
      prompt: [
        "You have the verse whole again. Lio hands you the first note.",
        "How will you give the song back?",
      ],
      options: [
        { id: "faithful", label: "Sing it as the founders wrote it", blurb: "the town beams — a tradition kept", reward: { sparks: 20, renown: 3 }, toast: "The old verse rings out true. Elders mouth the words along with you — a tradition kept alive." },
        { id: "yourverse", label: "Weave in a verse of your own", blurb: "your name joins the song", reward: { sparks: 12, renown: 9 }, grants: "birdhouse", toast: "You add a line of your own. Lio grins — from now the welcome-song carries your verse too." },
      ],
    },
  },

  // ── ACTION-VERB showcase (the new `act` objective). Follows Lio's song: once the words are
  // back, he wants to rehearse the welcome-dance at the Commons — teaching the emote wheel as a
  // quest input. Each step is an avatar action performed near the Commons. ──
  {
    id: "festival-rehearsal", name: "The Welcome Dance", giver: "bard", tier: 1,
    require: { flag: "lio-song" },   // only after you've brought the song back
    intro: [
      "The song's whole again — now we rehearse the welcome-dance to go with it!",
      "Meet me at the Commons. Open your feelings wheel (the 🙂 button) and follow along:",
      "a wave to say hello, twirl twice to warm up, then a big cheer to finish.",
    ],
    objectives: [
      { kind: "act", act: "wave", target: "commons", ring: 1, label: "Wave hello at the Commons (🙂 → Wave)" },
      { kind: "act", act: "twirl", target: "commons", ring: 1, count: 2, label: "Twirl twice to warm up (🙂 → Twirl)" },
      { kind: "act", act: "cheer", target: "commons", ring: 1, label: "Finish with a cheer (🙂 → Cheer)" },
    ],
    reward: { sparks: 16, renown: 4 }, grants: "fairylights",
    codex: { id: "codex-welcome", title: "The Welcome Dance", text: "A wave, a turn, a cheer — the whole town learns it as children. Now you know it too." },
  },

  // ── The FIRST mystery/choice quest (pilot for the ring 14-25 marquee model). Given by the
  // marsh ring's keeper; a clue-trail of NPCs + the landmark, then a branching fork. ──
  {
    id: "false-light",
    name: "The False Light",
    giver: "keeper-11",
    tier: 10,
    intro: [
      "Traveller — something's wrong on our fen.",
      "The guide-lanterns have been moving in the night. Wanderers wash up lost.",
      "Walk the shore, ask who's seen what, and find who's meddling with the lights.",
      "It's a fair task — four steps, and a choice at the end.",
    ],
    objectives: [
      { kind: "interact", ring: 11, target: "wanderer-11", label: "Ask the wanderer what they saw" },
      { kind: "interact", ring: 11, target: "sider-11-1", label: "Question the lamplighter" },
      { kind: "interact", ring: 11, target: "sider-11-2", label: "Question the fen-tender" },
      { kind: "reach", ring: 11, target: "landmark-11", label: "Examine the moved lights at the landmark" },
    ],
    reward: { sparks: 20, renown: 8 },   // fallback (unused once a choice is picked)
    choice: {
      prompt: [
        "The trail leads to a lonely marsh-sprite, moving the lights to keep travellers near — it was only afraid to be alone.",
        "What will you do?",
      ],
      options: [
        { id: "report", label: "Report the sprite", blurb: "the shore is made safe", reward: { sparks: 26, renown: 8 }, toast: "You bring word to the keeper. The lanterns are righted; the fen is safe once more." },
        { id: "teach", label: "Teach it to guide", blurb: "it stays as a lantern-keeper", reward: { sparks: 16, renown: 16 }, toast: "You teach the sprite to light the true path. It takes up the lantern-watch, no longer alone." },
      ],
    },
  },

  // ── Phase K7 delivery examples (one per mode) ──
  // DISCOVERED — inspect the buried cache on ring 4 (canyon) → a short hunt + a décor + codex.
  {
    id: "flint-cache", name: "The Flintstrand Cache", giver: "", tier: 3,
    discover: { at: "curio-4", ring: 4 },
    intro: ["Half-buried here: a traveller's cache, its owner long gone.", "A scrap of map inside points to the old ruin on the strand.", "Follow the glimmer — what's found is yours to keep."],
    objectives: [{ kind: "reach", ring: 4, target: "landmark-4", label: "Follow the map to the landmark" }],
    reward: { sparks: 18, renown: 4 }, grants: "statue",
    codex: { id: "codex-flint", title: "The Lost Cartographer", text: "Someone charted these shards before you — and never sailed home." },
  },
  // DISCOVERED + TRIGGERED (night-only) — the fallen star on ring 2 only reveals its quest after dark.
  {
    id: "starfall", name: "Starfall", giver: "", tier: 1,
    discover: { at: "curio-2", ring: 2 }, require: { timeOfDay: "night" },
    intro: ["A fallen star, still warm to the touch.", "It hums when its light is carried toward something greater.", "Bear it to the Great Crystal at the heart of the shore."],
    objectives: [{ kind: "reach", ring: 2, target: "landmark-2", label: "Carry the star's light to the Great Crystal" }],
    reward: { sparks: 14, renown: 3 }, grants: "fairylights",
    codex: { id: "codex-star", title: "Why Stars Fall", text: "They fall to be carried. Light passed hand to hand is how the dark is answered." },
  },
  // EMERGENT — the blighted ground on ring 7 (meadow) is a world-problem with no giver; healing it mends the world.
  {
    id: "wilting-meadow", name: "The Wilting Meadow", giver: "", tier: 6,
    discover: { at: "curio-7", ring: 7 },
    intro: ["The ground here is sick — the bloom has gone grey.", "Old roots whisper that warmth and light can wake the soil.", "Kindle the nearby lanterns, then bring that warmth back to the blight."],
    objectives: [
      { kind: "lightLanterns", ring: 7, count: 2, label: "Kindle 2 lanterns to warm the air" },
      { kind: "reach", ring: 7, target: "curio-7", label: "Return the warmth to the blighted ground" },
    ],
    reward: { sparks: 22, renown: 6 }, grants: "flower", heals: "curio-7",
    codex: { id: "codex-blight", title: "What Greys the Ground", text: "Blight is only forgotten light. Return it, and the meadow remembers how to bloom." },
  },
  // CHOSEN — the bounty-board pool (repeatable, biome-agnostic objectives; refreshes daily).
  { id: "bounty-kindle", name: "Kindle the Dark", giver: "", bounty: true, tier: 2, intro: ["A warden's bounty: light our lanterns."], objectives: [{ kind: "lightLanterns", count: 3, label: "Kindle any 3 lanterns" }], reward: { sparks: 10, renown: 2 } },
  { id: "bounty-gather", name: "Scattered Light", giver: "", bounty: true, tier: 2, intro: ["A warden's bounty: gather the loose wisps."], objectives: [{ kind: "gather", count: 4, label: "Gather any 4 wisps" }], reward: { sparks: 10, renown: 2 } },
  { id: "bounty-scout", name: "Scout Ahead", giver: "", bounty: true, tier: 1, intro: ["A warden's bounty: chart the onward shore."], objectives: [{ kind: "reach", target: "dock-out", label: "Reach the onward dock" }], reward: { sparks: 8, renown: 1 } },
  { id: "bounty-nightwatch", name: "Nightwatch", giver: "", bounty: true, tier: 3, require: { timeOfDay: "night" }, intro: ["A warden's bounty, posted by night: gather the night-wisps."], objectives: [{ kind: "gather", count: 3, label: "Gather 3 wisps under the night sky" }], reward: { sparks: 14, renown: 3 } },

  // ── Phase 2 verb examples (one per new mechanic) ──
  // ESCORT — lead a dazed traveller from the shore to the Commons (ring 3, autumn).
  {
    id: "escort-3", name: "The Long Way Home", giver: "keeper-3", tier: 3,
    intro: ["A traveller washed in on the tide, dazed and turned-around.", "Walk them to the Commons where it's warm — they'll follow your light.", "Don't rush too far ahead, mind."],
    objectives: [{ kind: "escort", ring: 3, from: "dock-in", target: "commons", label: "Walk the traveller to the Commons" }],
    reward: { sparks: 18, renown: 4 }, grants: "lantern",
    codex: { id: "codex-escort", title: "The Kindness of Light", text: "A stranger led home is a friend made. The shore remembers who carried the lantern." },
  },
  // TIMED RACE — reach the Great Crystal before the frost-tide seals the path (ring 5, winter).
  {
    id: "race-5", name: "Beat the Frost", giver: "keeper-5", tier: 5, timeLimit: 50,
    intro: ["The frost-tide's coming in fast — it'll seal the path to the Great Crystal.", "Run for it — reach the crystal before the cold does!", "Go — you've moments, not minutes."],
    objectives: [{ kind: "reach", ring: 5, target: "landmark-5", label: "Reach the Great Crystal before the frost" }],
    reward: { sparks: 22, renown: 6 }, grants: "campfire",
    codex: { id: "codex-race", title: "Ahead of the Cold", text: "Winter always comes. The trick is to be somewhere warm when it does." },
  },
  // RIDDLE — answer the ash-stone (discovered on ring 6, ember).
  {
    id: "riddle-ash", name: "The Riddle of the Ash", giver: "", tier: 5,
    discover: { at: "curio-6", ring: 6 },
    intro: ["An old stone, warm as a banked fire. Words surface as you touch it:", "\"Born in fire, yet I am not flame; I settle soft and grey, and feed the ground I claim. What am I?\""],
    riddle: { options: [{ id: "smoke", label: "Smoke" }, { id: "ash", label: "Ash" }, { id: "ember", label: "Ember" }], answer: "ash" },
    objectives: [{ kind: "riddle", label: "Answer the ash-stone's riddle" }],
    reward: { sparks: 20, renown: 5 }, grants: "torch",
    codex: { id: "codex-ash", title: "The Ash-Speaker", text: "Fire's last word is ash — and ash is where the next green begins." },
  },
  // CENSUS — get close to three kinds of woodland fauna (ring 8, woodland).
  {
    id: "naturalist-8", name: "The Naturalist", giver: "keeper-8", tier: 7,
    intro: ["You've a keen eye, traveller?", "Our wood teems with shy life. Get near three different kinds and note them for me.", "Move gently — they spook."],
    objectives: [{ kind: "census", ring: 8, count: 3, label: "Catalogue kinds of woodland fauna" }],
    reward: { sparks: 24, renown: 6 }, grants: "birdhouse",
    codex: { id: "codex-fauna", title: "A Field Guide Begun", text: "Deer, hare, fox — the wood keeps its own company, if you're quiet enough to be let in." },
  },
  // TRADE CHAIN — a three-cornered barter (ring 10, desert) — reuses interact + deliver.
  {
    id: "trade-10", name: "The Merchant's Errand", giver: "keeper-10", tier: 9,
    intro: ["A three-cornered trade, if you're willing.", "The wanderer holds saffron; the strand-keeper wants it and has water to spare.", "Carry the saffron out, bring the water back — everyone wins."],
    objectives: [
      { kind: "interact", ring: 10, target: "wanderer-10", label: "Barter with the wanderer for saffron" },
      { kind: "deliver", ring: 10, target: "sider-10-1", label: "Trade the saffron for spring-water" },
      { kind: "interact", ring: 10, target: "keeper-10", label: "Bring the water back to the keeper" },
    ],
    reward: { sparks: 28, renown: 7 },
    codex: { id: "codex-trade", title: "The Three-Cornered Trade", text: "No coin changed hands — only need met need. The oldest kind of market." },
  },
];

export type QuestProgress = Record<string, { status: "active" | "done"; obj: number[]; pick?: string }>;

// Dynamic quests (the M10 quest-template generator, CHR-256) register here so they flow
// through the same lookup/offer/log machinery as the authored ones. Keyed by id; the
// engine registers the current ring's generated quest as you sail in.
const dynamicQuests = new Map<string, QuestDef>();
export function registerQuest(q: QuestDef): void { if (!QUESTS.some((x) => x.id === q.id)) dynamicQuests.set(q.id, q); }
export function allQuests(): QuestDef[] { return dynamicQuests.size ? QUESTS.concat(Array.from(dynamicQuests.values())) : QUESTS; }

export const questById = (id: string): QuestDef | undefined => allQuests().find((q) => q.id === id);
export const questsFromGiver = (giver: string): QuestDef[] => allQuests().filter((q) => q.giver === giver);

export type QuestStatus = "locked" | "available" | "active" | "done";

/** Compute display status for every quest given the player's progress. */
export function questStatusList(progress: QuestProgress): { quest: QuestDef; status: QuestStatus }[] {
  return allQuests().map((q) => {
    const pred = QUESTS.find((x) => x.next === q.id);
    const done = progress[q.id]?.status === "done";
    const active = progress[q.id]?.status === "active";
    const unlocked = !pred || progress[pred.id]?.status === "done";
    const status: QuestStatus = done ? "done" : active ? "active" : unlocked ? "available" : "locked";
    return { quest: q, status };
  });
}

/** The first quest a giver can offer right now (available + not active/done). */
export function offerableQuest(giver: string, progress: QuestProgress): QuestDef | undefined {
  return questStatusList(progress).find((s) => s.status === "available" && s.quest.giver === giver)?.quest;
}

/** A finished quest this giver can offer again (for a reduced reward). */
export function repeatableQuest(giver: string, progress: QuestProgress): QuestDef | undefined {
  return allQuests().find((q) => q.giver === giver && progress[q.id]?.status === "done");
}
