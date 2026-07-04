// CIRQL — the "Great Ring" (CHR-97): one shared community counter. Every world
// restored by anyone fills the same ring, framed as cooperation (not a
// competition). Since worlds are infinite, milestones are celebrations of
// collective light rather than gates. The total is SUM(worldsRestored) across
// all players; CHR-107's personal "Universe Restored" is the individual view.

export interface GreatRingTier { at: number; name: string }

export const GREAT_RING_TIERS: GreatRingTier[] = [
  { at: 10, name: "Spark" },
  { at: 50, name: "Ember" },
  { at: 250, name: "Beacon" },
  { at: 1000, name: "Dawn" },
  { at: 5000, name: "Aurora" },
  { at: 25000, name: "Galaxy" },
  { at: 100000, name: "Cosmos" },
  { at: 500000, name: "Infinity" },
];

// Progress toward the next community milestone. Beyond the top tier we keep
// scaling by rounding up to the next whole multiple of the top tier, so the
// ring never "finishes" (the universe keeps growing).
export function nextCommunityMilestone(total: number): { name: string; from: number; to: number; pct: number } {
  const t = Math.max(0, total || 0);
  const tier = GREAT_RING_TIERS.find((x) => t < x.at);
  if (tier) {
    const idx = GREAT_RING_TIERS.indexOf(tier);
    const from = idx > 0 ? GREAT_RING_TIERS[idx - 1].at : 0;
    return { name: tier.name, from, to: tier.at, pct: (t - from) / (tier.at - from) };
  }
  const top = GREAT_RING_TIERS[GREAT_RING_TIERS.length - 1].at;
  const from = Math.floor(t / top) * top;
  const to = from + top;
  return { name: "Infinity", from, to, pct: (t - from) / top };
}
