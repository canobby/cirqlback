// arcade-perks — per-game power-ups you ARM before a run. The arcade is FREE: perks
// cost nothing (owner decision, 2026-07-07) so the arcade never touches a currency —
// platform points stay purely for the real-world loyalty/redemption economy and CIRQL
// sparks stay in the flagship, with no mixed-currency spending anywhere. Armed perks
// bank in that game's game_progress.state.armed and apply at the start of the run.
//
// Enhance-not-gate: every game is fully playable with zero perks, and a perked run is
// kept OFF the cross-player Daily board (your personal best still counts) so the
// leaderboard stays fair. (`cost` is retained as a field, always 0, so the server
// arm/consume plumbing is unchanged.)
//
// Add a game by adding its catalog here + a `perks.apply` in its GameConfig that maps
// the armed ids onto engine fields.

export interface ArcadePerk {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  cost: number; // always 0 — the arcade is free (kept so server arm/consume is unchanged)
}

export const ARCADE_PERKS: Record<string, ArcadePerk[]> = {
  gunner: [
    { id: "rapid", name: "Overdrive", emoji: "⚡", desc: "Fire almost twice as fast.", cost: 0 },
    { id: "twin", name: "Twin Cannon", emoji: "⛒", desc: "Loose two streams at once.", cost: 0 },
    { id: "fortify", name: "Fortify", emoji: "♥", desc: "Start with two extra shields.", cost: 0 },
  ],
  invaders: [
    { id: "rapid", name: "Overdrive", emoji: "⚡", desc: "Fire almost twice as fast.", cost: 0 },
    { id: "spread", name: "Triple Shot", emoji: "⋔", desc: "Loose three bolts at once.", cost: 0 },
    { id: "slow", name: "Time Dilation", emoji: "◷", desc: "The swarm advances slower.", cost: 0 },
  ],
};

export const perksForGame = (gameId: string): ArcadePerk[] => ARCADE_PERKS[gameId] || [];
export const findArcadePerk = (gameId: string, perkId: string): ArcadePerk | undefined =>
  perksForGame(gameId).find((p) => p.id === perkId);
