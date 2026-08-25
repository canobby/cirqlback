// CIRQL — flagship journeys (Phase K5).
//
// Long-running, world-spanning "campaigns" distinct from single-ring quests and co-op
// party campaigns: personal epics that track a CUMULATIVE metric across the whole game
// (rings reached, circles graduated, your homestead's growth, quests completed) and pay
// out Renown at tiered milestones. They give the endless world long-term direction — a
// horizon to sail toward. Progress is read from state the game already tracks; claimed
// milestones persist so a reward fires once.

export type JourneyMetric = "maxRing" | "circles" | "landTier" | "questsDone";

export interface Journey {
  id: string;
  title: string;
  blurb: string;
  icon: string;              // an emoji shown on the journey card
  metric: JourneyMetric;
  unit: string;              // e.g. "rings reached"
  milestones: number[];      // ascending target values
}

// Renown paid for reaching the Nth milestone of a journey (index into this table).
export const JOURNEY_MILESTONE_RENOWN = [8, 15, 25, 40, 60, 80];

export const JOURNEYS: Journey[] = [
  { id: "widening-sea", title: "The Widening Sea", blurb: "Sail ever outward into the unknown.", icon: "🌊", metric: "maxRing", unit: "rings reached", milestones: [3, 6, 10, 16, 24] },
  { id: "cartographers-circles", title: "Cartographer's Circles", blurb: "Graduate the circles of the world.", icon: "◎", metric: "circles", unit: "circles graduated", milestones: [1, 3, 6, 12] },
  { id: "founding-homestead", title: "Founding a Homestead", blurb: "Grow your CIRQLSPACE from garden to grand estate.", icon: "🏡", metric: "landTier", unit: "land tier", milestones: [1, 3, 5, 6] },
  { id: "keepers-ledger", title: "The Keeper's Ledger", blurb: "Answer the world's quests, one by one.", icon: "✦", metric: "questsDone", unit: "quests done", milestones: [5, 15, 40, 100] },
];

export interface JourneyStanding {
  done: number;              // milestones reached
  value: number;             // the metric's current value
  next: number | null;       // the next milestone target (null if all done)
  prev: number;              // the last milestone reached (0 if none)
  progress: number;          // 0..1 toward the next milestone
}

export function journeyStanding(j: Journey, value: number): JourneyStanding {
  let done = 0;
  for (const m of j.milestones) if (value >= m) done++;
  const next = done < j.milestones.length ? j.milestones[done] : null;
  const prev = done > 0 ? j.milestones[done - 1] : 0;
  const progress = next ? Math.max(0, Math.min(1, (value - prev) / (next - prev))) : 1;
  return { done, value, next, prev, progress };
}

/** All milestones a set of metrics currently satisfies, as "journeyId:index" claim keys. */
export function reachedClaims(metrics: Record<JourneyMetric, number>): string[] {
  const out: string[] = [];
  for (const j of JOURNEYS) { const v = metrics[j.metric] ?? 0; j.milestones.forEach((m, i) => { if (v >= m) out.push(`${j.id}:${i}`); }); }
  return out;
}
