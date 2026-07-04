// CIRQL — in-game perk catalog + earn rules (CHR-102, the platform→game half of
// the reward bridge CHR-96).
//
// Perks are EARNED from Cirqlback participation (partner taps) and BANKED as
// claimable boons in game_progress.state.perks, then spent in the game. Purely
// enhance-not-gate: the game is fully playable with zero perks, and competitive
// modes (the Daily Circle) are perk-free. Anti-abuse comes free — perks ride on
// taps, so the existing tap cooldown / device / GPS protections guard them.

export type PerkId = "echo" | "guiding";

export interface Perk {
  id: PerkId;
  name: string;
  emoji: string;
  desc: string;
}

export const PERKS: Perk[] = [
  { id: "echo", name: "Echo Assist", emoji: "🎯", desc: "Instantly aligns one ring." },
  { id: "guiding", name: "Guiding Light", emoji: "🕯️", desc: "Wider snap for this world." },
];

export const PERK_IDS: PerkId[] = PERKS.map((p) => p.id);
export function getPerk(id: string): Perk | undefined { return PERKS.find((p) => p.id === id); }
export function isPerkId(id: string): id is PerkId { return PERK_IDS.includes(id as PerkId); }

export type PerkBank = Partial<Record<PerkId, number>>;

// What a single partner tap banks. `seq` is the player's running tap-perk count
// so we can grant a rarer perk on a cadence (every 3rd tap → Guiding Light).
export function perksForTap(seq: number): PerkBank {
  const grant: PerkBank = { echo: 1 };
  if (seq % 3 === 0) grant.guiding = 1;
  return grant;
}
