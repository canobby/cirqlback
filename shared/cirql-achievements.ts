// CIRQL — game achievement catalog (CHR-103, the game→platform half of the
// reward bridge). Each achievement maps to a badge_definition (stable `key`)
// and is awarded to the player's user with awarderRole "game" — so the SAME
// badge ledger shows it in the game AND on the Cirqlback profile ("earned on
// both, shown on both"). Thresholds read game_progress (worlds restored + the
// daily play streak).

export interface GameAchievement {
  key: string; // stable badge_definitions.key
  name: string;
  emoji: string;
  color: string;
  desc: string;
  metric: "worlds" | "streak";
  threshold: number;
}

export const GAME_ACHIEVEMENTS: GameAchievement[] = [
  { key: "game_first_light", name: "First Light", emoji: "✨", color: "#c4b5fd", desc: "Restore your first world", metric: "worlds", threshold: 1 },
  { key: "game_constellation", name: "Constellation", emoji: "🌌", color: "#818cf8", desc: "Restore 10 worlds", metric: "worlds", threshold: 10 },
  { key: "game_galaxy", name: "Galaxy Warden", emoji: "🌠", color: "#7c3aed", desc: "Restore 25 worlds", metric: "worlds", threshold: 25 },
  { key: "game_universe", name: "Universe Keeper", emoji: "🌟", color: "#f59e0b", desc: "Restore 50 worlds", metric: "worlds", threshold: 50 },
  { key: "game_devoted", name: "Devoted", emoji: "🔥", color: "#fb923c", desc: "Reach a 3-day play streak", metric: "streak", threshold: 3 },
  { key: "game_faithful", name: "Faithful", emoji: "💫", color: "#ec4899", desc: "Reach a 7-day play streak", metric: "streak", threshold: 7 },
];

// Which achievements the player's progress has earned.
export function achievementsEarned(p: { worlds: number; streak: number }): GameAchievement[] {
  return GAME_ACHIEVEMENTS.filter((a) => (a.metric === "worlds" ? p.worlds : p.streak) >= a.threshold);
}
