import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { StackEngine } from "@/game/stack-engine";

const config: GameConfig = {
  gameId: "stack",
  name: "Cirql Stack",
  eyebrow: "Tower stacker · spun inward",
  title: "Stack to the centre",
  body: "An arc sweeps the ring — tap to lock it. Only the part overlapping the arc below carries up, so each ring gets narrower. Reach the centre for a bonus, then go again, faster.",
  overEyebrow: "Missed the overlap",
  overTitle: "Toppled",
  accent: "#38bdf8", accent2: "#f472b6",
  bg: "radial-gradient(120% 90% at 50% 8%, #081226 0%, #05040f 60%, #030208 100%)",
  lsKey: "cstack_best",
  makeEngine: (canvas, hooks) => new StackEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Height", value: h.height, color: "#38bdf8" }, { label: "Score", value: h.score }],
  endChips: (r) => [{ label: "Stacked", value: r.score, color: "#38bdf8" }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.score, bestCombo: r.score }),
};
export default function Stack() { return <ArcadeGameShell config={config} />; }
