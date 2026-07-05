import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { RunnerEngine } from "@/game/runner-engine";

const config: GameConfig = {
  gameId: "runner",
  name: "Cirql Runner",
  eyebrow: "Temple Run · on a loop",
  title: "Keep running",
  body: "Your orb races around the track. Tap to hop over spikes and gaps. Every lap it gets faster. One missed jump ends the run.",
  overEyebrow: "You hit something",
  overTitle: "Wiped out",
  accent: "#fb7185", accent2: "#f472b6",
  bg: "radial-gradient(120% 90% at 50% 8%, #240a14 0%, #05040f 60%, #030208 100%)",
  lsKey: "crunner_best",
  makeEngine: (canvas, hooks) => new RunnerEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Passed", value: h.score, color: "#fb7185" }],
  endChips: (r) => [{ label: "Passed", value: r.score, color: "#fb7185" }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.score, bestCombo: r.score }),
};
export default function Runner() { return <ArcadeGameShell config={config} />; }
