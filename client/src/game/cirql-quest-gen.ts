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
import { questRenown } from "./cirql-renown";
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
  // DIFFICULTY + REWARD scale with how far out you've sailed (Phase K, owner-locked): the
  // ring index is the tier. Deeper rings = harder quests (more objectives / bigger counts /
  // longer chains) AND richer rewards. Sub-maps borrow their parent surface ring's tier.
  const tier = Math.max(1, (index >= 100000 ? index % 100000 : index) - 1);
  const reward = { sparks: Math.min(60, Math.round(6 + tier * 3)), renown: questRenown(tier) };

  const lanterns = ring.props.filter((p) => p.t === "lantern" && p.id);
  const crystals = ring.props.filter((p) => p.t === "crystal" && p.id);
  const landmark = ring.props.find((p) => p.t === "landmark");

  // which templates can this ring support?
  const options: string[] = [];
  if (lanterns.length >= 2) options.push("kindle");
  if (crystals.length >= 1) options.push("discover");
  options.push("wayfind");                            // always possible (every ring has an onward dock)
  const shape = options[Math.floor(rng() * options.length)];

  const objectives: Objective[] = []; let title: string; let intro: string[];
  if (shape === "kindle") {
    const n = Math.max(2, Math.min(lanterns.length, 2 + Math.floor(tier / 1.5)));   // more lanterns the deeper you go
    title = `Kindle ${name}`;
    intro = [`Welcome to ${name}, traveller.`, `Our lanterns have gone dark on the long night.`, `Would you kindle ${n} of them? Press E beside each one.`];
    objectives.push({ kind: "lightLanterns", count: n, label: `Kindle ${n} lanterns of ${name}` });
  } else if (shape === "discover") {
    const c = crystals[Math.floor(rng() * crystals.length)];
    title = `The ${name} Shard`;
    intro = [`You've reached ${name}.`, `A singing shard hums somewhere on this shore.`, `Seek it out — follow the glimmer on your map.`];
    objectives.push({ kind: "reach", target: c.id, label: `Find the shard of ${name}` });
  } else {
    title = `Chart ${name}`;
    intro = [`${name} greets you, wayfarer.`, `Scout ${name} for me, then the onward shore.`, `Sail on whenever you're ready.`];
    objectives.push({ kind: "reach", target: "dock-out", label: `Scout ${name}'s onward shore` });
  }

  // ESCALATION: deeper rings stack extra objectives → longer, tougher expeditions.
  if (tier >= 2 && landmark) objectives.push({ kind: "reach", target: `landmark-${index}`, label: `Pay respects at ${landmark.label}` });
  if (tier >= 4 && shape !== "wayfind") objectives.push({ kind: "reach", target: "dock-out", label: `Chart ${name}'s onward shore` });
  if (objectives.length > 1) intro = [...intro.slice(0, -1), `It's a fair task — ${objectives.length} steps in all. The far rings ask more, but give more.`];

  return { id: ringQuestId(index), name: title, giver, intro, objectives, reward, tier };
}
