// arcade-perks — the per-game reward bridge (the moat). Each game has its own
// catalog of power-ups you ARM before a run by spending your Cirqlback points
// (earned mostly from real partner taps). Armed perks bank in that game's
// game_progress.state.armed and are consumed + applied at the start of the run.
//
// Enhance-not-gate: every game is fully playable with zero perks, and a perked
// run is kept OFF the cross-player Daily board (your personal best still counts),
// so the leaderboard stays fair. Anti-abuse comes free — points ride on taps,
// which already have cooldown / device / GPS protection.
//
// This is CirqlBreak's tap→Supernova hook (shared/cirql-perks.ts) generalised to
// every game. Add a game by adding its catalog here + a `perks.apply` in its
// GameConfig that maps the armed ids onto engine fields.

export interface ArcadePerk {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  cost: number; // in Cirqlback points (available balance)
}

export const ARCADE_PERKS: Record<string, ArcadePerk[]> = {
  gunner: [
    { id: "rapid", name: "Overdrive", emoji: "⚡", desc: "Fire almost twice as fast.", cost: 30 },
    { id: "twin", name: "Twin Cannon", emoji: "⛒", desc: "Loose two streams at once.", cost: 45 },
    { id: "fortify", name: "Fortify", emoji: "♥", desc: "Start with two extra shields.", cost: 25 },
  ],
  invaders: [
    { id: "rapid", name: "Overdrive", emoji: "⚡", desc: "Fire almost twice as fast.", cost: 30 },
    { id: "spread", name: "Triple Shot", emoji: "⋔", desc: "Loose three bolts at once.", cost: 45 },
    { id: "slow", name: "Time Dilation", emoji: "◷", desc: "The swarm advances slower.", cost: 30 },
  ],
};

export const perksForGame = (gameId: string): ArcadePerk[] => ARCADE_PERKS[gameId] || [];
export const findArcadePerk = (gameId: string, perkId: string): ArcadePerk | undefined =>
  perksForGame(gameId).find((p) => p.id === perkId);
