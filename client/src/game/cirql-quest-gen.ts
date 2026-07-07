// CIRQLVERSE — M10 quest-template generator (CHR-256).
//
// A handful of quest *shapes* — parameterized by the ring, its keeper NPC and its own
// props — generate an endless supply of quests that still feel handmade. Each procedural
// ring (cirql-ring-gen.ts) gets exactly ONE deterministic quest, offered by its keeper,
// so exploring outward always has a purpose + a spark reward. Reuses the M3 quest model
// (cirql-quests.ts) verbatim, so generated quests flow through the same tracker/log/UI.
//
// Deterministic: same ring index → same quest, forever (progress rides in the cirql
// state blob keyed by the quest id, like every other quest — no new tables).

import { getRing } from "./cirql-ring-gen";
import type { QuestDef, Objective } from "./cirql-quests";

function rngFrom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable quest id for a ring (matches what the engine registers/looks up). */
export const ringQuestId = (index: number) => `ring-${index}-q`;

/**
 * The quest for procedural ring `index` (>= 1), or null for the authored Hearth.
 * Picks a template valid for the ring's props (kindle its lanterns / seek a shard /
 * scout the onward shore) and scales the reward by how far out you've sailed.
 */
export function generateRingQuest(index: number): QuestDef | null {
  if (index <= 1) return null;                       // ring 0 (CIRQLSPACE) + ring 1 (authored Town) use authored quests
  const ring = getRing(index);
  const rng = rngFrom(Math.imul(index, 0x9e3779b1) ^ 0xC0FFEE);
  const giver = `keeper-${index}`;
  const name = ring.name;
  const reward = { sparks: Math.min(16, 5 + index) };  // deeper rings pay more

  const lanterns = ring.props.filter((p) => p.t === "lantern" && p.id);
  const crystals = ring.props.filter((p) => p.t === "crystal" && p.id);

  // which templates can this ring support?
  const options: string[] = [];
  if (lanterns.length >= 2) options.push("kindle");
  if (crystals.length >= 1) options.push("discover");
  options.push("wayfind");                            // always possible (every ring has an onward dock)
  const shape = options[Math.floor(rng() * options.length)];

  let objectives: Objective[]; let title: string; let intro: string[];
  if (shape === "kindle") {
    const n = Math.min(lanterns.length, 2 + Math.floor(rng() * 2));   // 2–3
    title = `Kindle ${name}`;
    intro = [`Welcome to ${name}, traveller.`, `Our lanterns have gone dark on the long night.`, `Would you kindle ${n} of them? Press E beside each one.`];
    objectives = [{ kind: "lightLanterns", count: n, label: `Kindle ${n} lanterns of ${name}` }];
  } else if (shape === "discover") {
    const c = crystals[Math.floor(rng() * crystals.length)];
    title = `The ${name} Shard`;
    intro = [`You've reached ${name}.`, `A singing shard hums somewhere on this shore.`, `Seek it out — follow the glimmer on your map.`];
    objectives = [{ kind: "reach", target: c.id, label: `Find the shard of ${name}` }];
  } else {
    title = `Chart ${name}`;
    intro = [`${name} greets you, wayfarer.`, `Scout the onward shore for me — reach the far dock.`, `Then sail on whenever you're ready.`];
    objectives = [{ kind: "reach", target: "dock-out", label: `Scout ${name}'s onward shore` }];
  }

  return { id: ringQuestId(index), name: title, giver, intro, objectives, reward };
}
