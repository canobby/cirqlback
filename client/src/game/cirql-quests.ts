// CIRQL — quest system (M3, CHR-224/225). The reusable backbone so we can add
// quests forever. Definitions live here in code; per-player PROGRESS rides in the
// `cirql` game_progress state blob (no new tables — dodges the broken db:migrate).
//
// An objective is satisfied by a world event the engine already knows about
// (reaching a marker, interacting with a target, entering the Wonders, lighting
// lanterns). Quests are chained via `next`, so completing one can auto-offer the
// following one — the M4 onboarding chain is just data in QUESTS below.

export type ObjectiveKind = "reach" | "interact" | "enterWonders" | "lightLanterns" | "solvePuzzle";

export interface Objective {
  kind: ObjectiveKind;
  target?: string;   // prop id (reach/interact) — resolved against the ring's props
  count?: number;    // for lightLanterns (default 1)
  label: string;     // shown in the tracker / log
  ring?: number;     // if set, this objective is on that ring — advances only there; off-ring the waypoint points to the dock (cross-ring quests)
}

export interface QuestDef {
  id: string;
  name: string;
  giver: string;         // NPC prop id that offers it
  intro: string[];       // giver dialog when offering
  objectives: Objective[];
  reward: { sparks: number; renown?: number };
  next?: string;         // quest auto-offered on completion (the chain)
  tier?: number;         // difficulty tier — grows the farther out you sail (Phase K); undefined = authored/onboarding
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
      "Would you carry a kind word to the next shore for me?",
      "Sail south from the dock, find their Commons, then come home.",
      "The map will point the way — follow the glimmer to the dock.",
    ],
    objectives: [
      { kind: "reach", ring: 1, target: "commons", label: "Visit the next shore's Commons" },
      { kind: "reach", ring: 0, target: "marker-shore", label: "Bring word home to CIRQLSPACE" },
    ],
    reward: { sparks: 14 },
  },
];

export type QuestProgress = Record<string, { status: "active" | "done"; obj: number[] }>;

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
