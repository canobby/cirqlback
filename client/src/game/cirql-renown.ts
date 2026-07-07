// CIRQL — Renown (Phase K4).
//
// Renown is your PERSONAL standing in the world — earned, never spent. It rises as you
// finish quests and campaigns (more the farther out you sail), and it climbs a ladder of
// ranks/titles. Unlike sparqs (a spend currency), Renown is a progression track — it's the
// RPG "level" of the flagship, and it GATES the hardest outer content (elite campaigns,
// rare collectibles/stores — wired as that content ships). Owner-locked: earned-not-spent,
// personal, gates advanced content; also fed by real taps later (the moat).

export interface RenownRank { title: string; min: number; }

// The ladder — titles + the Renown needed to reach each. Cozy, aspirational names.
export const RENOWN_RANKS: RenownRank[] = [
  { title: "Newcomer",      min: 0 },
  { title: "Wayfarer",      min: 20 },
  { title: "Pathfinder",    min: 55 },
  { title: "Voyager",       min: 120 },
  { title: "Trailblazer",   min: 240 },
  { title: "Cartographer",  min: 430 },
  { title: "Circle-Keeper", min: 700 },
  { title: "Luminary",      min: 1100 },
];

export interface RenownStanding {
  rank: RenownRank; index: number; next: RenownRank | null;
  toNext: number;      // Renown remaining until the next rank (0 at the top)
  progress: number;    // 0..1 through the current rank band
}

/** Resolve a Renown total into its rank + progress toward the next. */
export function renownStanding(renown: number): RenownStanding {
  let i = 0;
  for (let k = 0; k < RENOWN_RANKS.length; k++) if (renown >= RENOWN_RANKS[k].min) i = k;
  const rank = RENOWN_RANKS[i], next = RENOWN_RANKS[i + 1] ?? null;
  const toNext = next ? Math.max(0, next.min - renown) : 0;
  const progress = next ? Math.max(0, Math.min(1, (renown - rank.min) / (next.min - rank.min))) : 1;
  return { rank, index: i, next, toNext, progress };
}

/** Renown a quest awards — scales with its difficulty tier (0 for untiered onboarding). */
export const questRenown = (tier?: number) => (tier && tier > 0 ? 2 + tier : 0);

/** The title of a rank by its index (for "Requires <rank>" gates). */
export const rankTitle = (index: number) => (RENOWN_RANKS[Math.max(0, Math.min(RENOWN_RANKS.length - 1, index))]?.title ?? "Wayfarer");
