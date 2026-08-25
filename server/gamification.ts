// CHR-28: single source of truth for the streamlined gamification maths.
// Tier + level are derived deterministically from lifetime points earned, so
// they are always consistent with the points the tap loop persists — no
// separate state to keep in sync.

export const LEVEL_STEP = 500; // points per level

// Ordered low -> high so the last matching threshold wins.
const TIERS: { name: string; min: number }[] = [
  { name: "Bronze", min: 0 },
  { name: "Silver", min: 1000 },
  { name: "Gold", min: 5000 },
  { name: "Platinum", min: 15000 },
];

export function tierForPoints(points: number): string {
  const p = points || 0;
  let tier = TIERS[0].name;
  for (const t of TIERS) if (p >= t.min) tier = t.name;
  return tier;
}

export function levelForPoints(points: number): number {
  return Math.floor((points || 0) / LEVEL_STEP) + 1;
}

// Points still needed to reach the next level (0 only at exact boundaries).
export function pointsToNextLevel(points: number): number {
  const p = points || 0;
  return LEVEL_STEP - (p % LEVEL_STEP);
}
