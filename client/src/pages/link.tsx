import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { LinkEngine } from "@/game/link-engine";

const config: GameConfig = {
  gameId: "link",
  name: "Cirql Link",
  eyebrow: "Flow · on a circle",
  title: "Connect the pairs",
  body: "Drag from each node to its match, laying a path along the grid. Paths can't cross. Link every pair to solve the board — then a fresh one appears. Race the clock.",
  overEyebrow: "Time's up",
  overTitle: "Clock ran out",
  accent: "#38bdf8", accent2: "#f472b6",
  bg: "radial-gradient(120% 90% at 50% 8%, #081226 0%, #05040f 60%, #030208 100%)",
  lsKey: "clink_best",
  makeEngine: (canvas, hooks) => new LinkEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Time", value: h.time, color: h.time <= 10 ? "#fb7185" : "#a5f3fc" }, { label: "Linked", value: `${h.linked}/${h.pairs}` }, { label: "Solved", value: h.solved, color: "#34d399" }],
  endChips: (r) => [{ label: "Solved", value: r.solved, color: "#38bdf8" }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.solved, bestCombo: r.solved }),
};
export default function Link() { return <ArcadeGameShell config={config} />; }
