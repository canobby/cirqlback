import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { FlipEngine } from "@/game/flip-engine";

const config: GameConfig = {
  gameId: "flip",
  name: "Cirql Flip",
  eyebrow: "Lights-Out · on a ring",
  title: "Light them all",
  body: "Tapping a segment flips it and both neighbours. Turn the whole ring on to solve it — then a fresh scramble appears. How many can you crack before the clock runs out?",
  overEyebrow: "Time's up",
  overTitle: "Lights out",
  accent: "#34d399", accent2: "#38bdf8",
  bg: "radial-gradient(120% 90% at 50% 8%, #06231a 0%, #05040f 60%, #030208 100%)",
  lsKey: "cflip_best",
  makeEngine: (canvas, hooks) => new FlipEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Time", value: h.time, color: h.time <= 10 ? "#fb7185" : "#6ee7b7" }, { label: "Solved", value: h.solved }],
  endChips: (r) => [{ label: "Solved", value: r.solved, color: "#34d399" }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.solved, bestCombo: r.solved }),
};
export default function Flip() { return <ArcadeGameShell config={config} />; }
