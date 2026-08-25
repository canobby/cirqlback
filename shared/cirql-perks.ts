// Cirqlbreak — in-game reward catalog + earn rules (the platform→game half of the
// reward bridge, CHR-115).
//
// Rewards are EARNED from Cirqlback participation (partner taps) and BANKED in
// game_progress.state.perks, then spent at the start of a run. Purely
// enhance-not-gate: the game is fully playable with zero perks, and competitive
// modes (the Daily) are perk-free. Anti-abuse comes free — rewards ride on taps,
// so the existing tap cooldown / device / GPS protections guard them.
//
// The headline is the **Partner Power** (`nova`): tapping real shops banks a
// Supernova you unleash on your next run — the "tap a coffee shop → screen-clear"
// hook nobody else has. Taps also drop the game's power-ups.

export type PerkId = "nova" | "multi" | "wide" | "slow" | "catch" | "life";

export interface Perk {
  id: PerkId;
  name: string;
  emoji: string;
  desc: string;
}

export const PERKS: Perk[] = [
  { id: "nova", name: "Partner Power", emoji: "★", desc: "A banked Supernova — starts your next run charged." },
  { id: "multi", name: "Multiball", emoji: "✦", desc: "Splits your spark into more." },
  { id: "wide", name: "Wide Guard", emoji: "▬", desc: "A wider paddle." },
  { id: "slow", name: "Slow-Mo", emoji: "◷", desc: "Eases the ball for a moment." },
  { id: "catch", name: "Catch", emoji: "◎", desc: "Sticky paddle — aim your shot." },
  { id: "life", name: "Extra Spark", emoji: "♥", desc: "One more life." },
];

export const PERK_IDS: PerkId[] = PERKS.map((p) => p.id);
export function getPerk(id: string): Perk | undefined { return PERKS.find((p) => p.id === id); }
export function isPerkId(id: string): id is PerkId { return PERK_IDS.includes(id as PerkId); }

export type PerkBank = Partial<Record<PerkId, number>>;

// The power-up tokens a tap can drop (everything but the Partner Power), rotated
// deterministically so the reward feels varied without server-side randomness.
const POWERUP_CYCLE: PerkId[] = ["multi", "catch", "wide", "slow", "life"];

// What a single partner tap banks. `seq` is the player's running tap-perk count,
// so every tap drops a power-up and every 4th tap also banks a Partner Power.
export function perksForTap(seq: number): PerkBank {
  const grant: PerkBank = { [POWERUP_CYCLE[(seq - 1) % POWERUP_CYCLE.length]]: 1 };
  if (seq % 4 === 0) grant.nova = 1;
  return grant;
}
