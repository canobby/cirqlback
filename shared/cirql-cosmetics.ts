// CIRQL — "Your Cirql" identity + cosmetics catalog (CHR-92).
//
// One shared source of truth so the client renders the collection and the
// server validates equips against the SAME unlock rules. Cosmetics are purely
// visual (no pay-to-win): an equipped item tints the in-game core/bloom accent.
//
// XP is the player's game progress: worldsRestored. Level grows on a gentle
// escalating curve. Unlocks read worldsRestored, the daily play streak, and the
// derived level — all already persisted (game_progress + its state blob).

export type CosmeticKind = "aura" | "skin" | "trail";

export interface Cosmetic {
  id: string;
  name: string;
  kind: CosmeticKind;
  accent: string; // hex — tints the spark + its trail when equipped (Cirqlbreak)
  unlock: { worlds?: number; streak?: number; level?: number }; // all provided thresholds must be met
  unlockLabel: string; // human hint shown while locked
}

// Ordered roughly by how far in you unlock them. The first is free (default).
export const COSMETICS: Cosmetic[] = [
  { id: "dawn", name: "Dawn Glow", kind: "aura", accent: "#c4b5fd", unlock: {}, unlockLabel: "Your starting light" },
  { id: "verdant", name: "Verdant", kind: "skin", accent: "#34d399", unlock: { worlds: 3 }, unlockLabel: "Restore 3 worlds" },
  { id: "tidewalker", name: "Tidewalker", kind: "aura", accent: "#3bc9ff", unlock: { worlds: 6 }, unlockLabel: "Restore 6 worlds" },
  { id: "aurora", name: "Aurora", kind: "aura", accent: "#22d3ee", unlock: { streak: 3 }, unlockLabel: "Reach a 3-day streak" },
  { id: "cinder", name: "Cinder Trail", kind: "trail", accent: "#f97316", unlock: { worlds: 12 }, unlockLabel: "Restore 12 worlds" },
  { id: "rose", name: "Rose Quartz", kind: "skin", accent: "#f472b6", unlock: { worlds: 20 }, unlockLabel: "Restore 20 worlds" },
  { id: "halo", name: "Golden Halo", kind: "aura", accent: "#f59e0b", unlock: { level: 5 }, unlockLabel: "Reach level 5" },
  { id: "stardust", name: "Stardust", kind: "trail", accent: "#a78bfa", unlock: { streak: 7 }, unlockLabel: "Reach a 7-day streak" },
  { id: "obsidian", name: "Obsidian", kind: "skin", accent: "#94a3b8", unlock: { worlds: 30 }, unlockLabel: "Restore 30 worlds" },
  { id: "prismatic", name: "Prismatic", kind: "aura", accent: "#e879f9", unlock: { level: 7 }, unlockLabel: "Reach level 7" },
];

export const DEFAULT_COSMETIC = COSMETICS[0].id;

export function getCosmetic(id: string | null | undefined): Cosmetic {
  return COSMETICS.find((c) => c.id === id) || COSMETICS[0];
}

// Level from worlds restored. Cumulative worlds needed for level n is n*(n-1)
// (0, 2, 6, 12, 20, 30, …) — an escalating gap so leveling stays meaningful.
export function cirqlLevel(worldsRestored: number): number {
  const w = Math.max(0, worldsRestored || 0);
  return Math.floor((1 + Math.sqrt(1 + 4 * w)) / 2);
}

// Level + progress toward the next level (for the XP bar).
export function levelInfo(worldsRestored: number): { level: number; into: number; need: number; pct: number } {
  const w = Math.max(0, worldsRestored || 0);
  const level = cirqlLevel(w);
  const floor = level * (level - 1); // worlds at the start of this level
  const need = 2 * level; // worlds from this level to the next
  const into = w - floor;
  return { level, into, need, pct: Math.max(0, Math.min(1, into / need)) };
}

export interface Progress { worlds: number; streak: number }

export function isUnlocked(c: Cosmetic, p: Progress): boolean {
  const level = cirqlLevel(p.worlds);
  if (c.unlock.worlds !== undefined && p.worlds < c.unlock.worlds) return false;
  if (c.unlock.streak !== undefined && p.streak < c.unlock.streak) return false;
  if (c.unlock.level !== undefined && level < c.unlock.level) return false;
  return true;
}
