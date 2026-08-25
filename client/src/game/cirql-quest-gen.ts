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
/** How many SIDE quests a ring offers (beyond the main one) — scales with ring size so the
 *  big outer rings become full destinations, not one-quest fly-bys. Ramps ~2→9 quests/ring,
 *  so the first ~15 rings hold ~100 quests total. */
export function ringSideQuestCount(index: number): number { return index <= 1 ? 0 : Math.min(8, Math.floor(index / 1.5)); }

// Build one quest for a ring. variant 0 = the MAIN quest (keeper at the hub, the onward
// through-line + escalation); variant >=1 = a shorter, focused SIDE quest from a 'sider' NPC.
function buildRingQuest(index: number, variant: number): QuestDef | null {
  if (index <= 1) return null;                       // ring 0 (CIRQLSPACE) + ring 1 (authored Town) use authored quests
  const ring = getRing(index);
  const rng = rngFrom(Math.imul(index, 0x9e3779b1) ^ Math.imul(variant + 1, 0x27d4eb2f) ^ 0xC0FFEE);
  const isMain = variant === 0;
  const giver = isMain ? `keeper-${index}` : `sider-${index}-${variant}`;
  const id = isMain ? ringQuestId(index) : `ring-${index}-q${variant}`;
  const name = ring.name;
  // DIFFICULTY + REWARD scale with how far out you've sailed (Phase K). Ring index = tier.
  const tier = Math.max(1, (index >= 100000 ? index % 100000 : index) - 1);
  const baseSp = Math.min(60, Math.round(6 + tier * 3));
  const reward = { sparks: isMain ? baseSp : Math.max(4, Math.round(baseSp * 0.7)), renown: isMain ? questRenown(tier) : Math.max(1, Math.round(questRenown(tier) * 0.6)) };

  const lanterns = ring.props.filter((p) => p.t === "lantern" && p.id);
  const crystals = ring.props.filter((p) => p.t === "crystal" && p.id);
  const wisps = ring.props.filter((p) => p.t === "wisp" && p.id);
  const landmark = ring.props.find((p) => p.t === "landmark");
  const wanderer = ring.props.find((p) => p.t === "npc" && p.id === `wanderer-${index}`);
  const wandererName = wanderer?.label ?? "the wanderer";

  // which templates can this ring support?
  const options: string[] = [];
  if (lanterns.length >= 2) options.push("kindle");
  if (crystals.length >= 1) options.push("discover");
  if (wisps.length >= 3) options.push("gather");
  if (wanderer) { options.push("errand"); options.push("delivery"); }
  if (isMain || options.length === 0) options.push("wayfind");   // only the MAIN quest is the onward through-line
  const shape = options[Math.floor(rng() * options.length)];

  const objectives: Objective[] = []; let title: string; let intro: string[];
  if (shape === "kindle") {
    const n = Math.max(2, Math.min(lanterns.length, 2 + Math.floor(tier / 1.5)));   // more lanterns the deeper you go
    title = `Kindle ${name}`;
    intro = [`Welcome to ${name}, traveller.`, `Our lanterns have gone dark on the long night.`, `Would you kindle ${n} of them? Press E beside each one.`];
    objectives.push({ kind: "lightLanterns", count: n, label: `Kindle ${n} lanterns of ${name}` });
  } else if (shape === "gather") {
    const n = Math.max(3, Math.min(wisps.length, 3 + Math.floor(tier / 1.2)));   // gather more the deeper you go
    title = `Gather the ${name} Wisps`;
    intro = [`Well met on ${name}.`, `Wisps of light have scattered across the shore.`, `Walk over ${n} of them to gather them back — follow the glimmer.`];
    objectives.push({ kind: "gather", count: n, label: `Gather ${n} wisps of ${name}` });
  } else if (shape === "errand") {
    title = `Word for ${wandererName}`;
    intro = [`A moment, traveller?`, `${wandererName} wanders the far side of ${name} and hasn't checked in.`, `Hear what news they carry, then bring it back to me.`];
    objectives.push({ kind: "interact", target: `wanderer-${index}`, label: `Hear ${wandererName}'s news` });
    objectives.push({ kind: "interact", target: giver, label: `Bring word back` });
  } else if (shape === "delivery") {
    title = `A Parcel for ${wandererName}`;
    intro = [`Well timed — I've a parcel to send.`, `Carry it to ${wandererName}, out across ${name}.`, `Mind you don't dawdle; follow the glimmer to them.`];
    objectives.push({ kind: "deliver", target: `wanderer-${index}`, label: `Deliver the parcel to ${wandererName}` });
  } else if (shape === "discover") {
    const c = crystals[Math.floor(rng() * crystals.length)];
    title = `The ${name} Shard`;
    intro = [`You've reached ${name}.`, `A singing shard hums somewhere on this shore.`, `Seek it out — follow the glimmer on your map.`];
    objectives.push({ kind: "reach", target: c.id!, label: `Find the shard of ${name}` });
  } else {
    title = `Chart ${name}`;
    intro = [`${name} greets you, wayfarer.`, `Scout ${name} for me, then the onward shore.`, `Sail on whenever you're ready.`];
    objectives.push({ kind: "reach", target: "dock-out", label: `Scout ${name}'s onward shore` });
  }

  // ESCALATION (main quest only): deeper rings stack extra objectives → longer expeditions.
  if (isMain) {
    if (tier >= 2 && landmark) objectives.push({ kind: "reach", target: `landmark-${index}`, label: `Pay respects at ${landmark.label}` });
    if (tier >= 4 && shape !== "wayfind") objectives.push({ kind: "reach", target: "dock-out", label: `Chart ${name}'s onward shore` });
  }
  if (objectives.length > 1) intro = [...intro.slice(0, -1), `It's a fair task — ${objectives.length} steps in all.`];

  return { id, name: title, giver, intro, objectives, reward, tier };
}

/**
 * The MAIN quest for procedural ring `index` (>= 2), or null for the authored rings.
 * Offered by the ring's keeper at the beacon hub; carries the onward through-line.
 */
export function generateRingQuest(index: number): QuestDef | null { return buildRingQuest(index, 0); }

/** Every quest offered on a ring — the main + a scaling number of side quests (from extra
 *  'sider' NPCs spread along the trail). This is what the engine registers per ring. */
export function generateRingQuests(index: number): QuestDef[] {
  const out: QuestDef[] = [];
  const main = buildRingQuest(index, 0); if (main) out.push(main);
  const extra = ringSideQuestCount(index);
  for (let v = 1; v <= extra; v++) { const q = buildRingQuest(index, v); if (q) out.push(q); }
  return out;
}
