import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { ShiftEngine } from "@/game/shift-engine";

const config: GameConfig = {
  gameId: "shift",
  name: "Cirql Shift",
  eyebrow: "Color Switch · on an orbit",
  title: "Match the gate",
  body: "The ball circles forever. Tap to cycle its colour so it matches the next gate before it arrives. Miss a colour and it's over. It gets fast.",
  overEyebrow: "Wrong colour",
  overTitle: "Mismatched",
  accent: "#34d399", accent2: "#38bdf8",
  bg: "radial-gradient(120% 90% at 50% 8%, #06231a 0%, #05040f 60%, #030208 100%)",
  lsKey: "cshift_best",
  makeEngine: (canvas, hooks) => new ShiftEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Passed", value: h.score, color: h.color }],
  endChips: (r) => [{ label: "Passed", value: r.score, color: "#34d399" }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.score, bestCombo: r.score }),
};
export default function Shift() { return <ArcadeGameShell config={config} />; }
