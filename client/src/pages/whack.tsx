import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { WhackEngine } from "@/game/whack-engine";

const config: GameConfig = {
  gameId: "whack",
  name: "Cirql Whack",
  eyebrow: "Whack-a-mole · on a ring",
  title: "Whack fast",
  body: "Critters pop from the holes around the ring — tap them before they duck back. Steer clear of the ✦ bombs. Thirty seconds on the clock.",
  overEyebrow: "Time's up",
  overTitle: "Hands off",
  accent: "#34d399", accent2: "#fbbf24",
  bg: "radial-gradient(120% 90% at 50% 8%, #0a2118 0%, #05040f 60%, #030208 100%)",
  lsKey: "cwhack_best",
  makeEngine: (canvas, hooks) => new WhackEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Time", value: h.time, color: h.time <= 5 ? "#fb7185" : "#6ee7b7" }, { label: "Whacks", value: h.score }],
  endChips: (r) => [{ label: "Whacks", value: r.score, color: "#34d399" }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.score, bestCombo: r.score }),
};
export default function Whack() { return <ArcadeGameShell config={config} />; }
