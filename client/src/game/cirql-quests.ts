// CIRQL — quest system (M3, CHR-224/225). The reusable backbone so we can add
// quests forever. Definitions live here in code; per-player PROGRESS rides in the
// `cirql` game_progress state blob (no new tables — dodges the broken db:migrate).
//
// An objective is satisfied by a world event the engine already knows about
// (reaching a marker, interacting with a target, entering the Wonders, lighting
// lanterns). Quests are chained via `next`, so completing one can auto-offer the
// following one — the M4 onboarding chain is just data in QUESTS below.

export type ObjectiveKind = "reach" | "interact" | "enterWonders" | "lightLanterns";

export interface Objective {
  kind: ObjectiveKind;
  target?: string;   // prop id (reach/interact) — resolved against the ring's props
  count?: number;    // for lightLanterns (default 1)
  label: string;     // shown in the tracker / log
}

export interface QuestDef {
  id: string;
  name: string;
  giver: string;         // NPC prop id that offers it
  intro: string[];       // giver dialog when offering
  objectives: Objective[];
  reward: { sparks: number };
  next?: string;         // quest auto-offered on completion (the chain)
}

// M3 ships ONE reference quest that proves the backbone end-to-end; M4 adds the
// rest of the onboarding chain (lantern path → the Wonders door).
export const QUESTS: QuestDef[] = [
  {
    id: "find-your-feet",
    name: "Find Your Feet",
    giver: "keeper",
    intro: [
      "Ah — a new face at The Hearth!",
      "Best way to learn these shores is to walk them.",
      "See that glimmer to the west? Wander over and back.",
    ],
    objectives: [{ kind: "reach", target: "marker-shore", count: 1, label: "Walk to the glimmer" }],
    reward: { sparks: 3 },
    // next: "lantern-path"  // wired in M4
  },
];

export type QuestProgress = Record<string, { status: "active" | "done"; obj: number[] }>;

export const questById = (id: string): QuestDef | undefined => QUESTS.find((q) => q.id === id);
export const questsFromGiver = (giver: string): QuestDef[] => QUESTS.filter((q) => q.giver === giver);

export type QuestStatus = "locked" | "available" | "active" | "done";

/** Compute display status for every quest given the player's progress. */
export function questStatusList(progress: QuestProgress): { quest: QuestDef; status: QuestStatus }[] {
  return QUESTS.map((q) => {
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
