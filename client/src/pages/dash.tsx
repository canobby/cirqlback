import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { DashEngine } from "@/game/dash-engine";

const config: GameConfig = {
  gameId: "dash",
  name: "Cirql Dash",
  eyebrow: "Frogger · across the rings",
  title: "Hop to the centre",
  body: "The rings spin at different speeds, each carrying hazards. Tap to hop inward — land in a gap. Reach the centre to score, then you're flung back out, faster.",
  overEyebrow: "Caught by a hazard",
  overTitle: "Splat",
  accent: "#38bdf8", accent2: "#34d399",
  bg: "radial-gradient(120% 90% at 50% 8%, #081226 0%, #05040f 60%, #030208 100%)",
  lsKey: "cdash_best",
  makeEngine: (canvas, hooks) => new DashEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Crossings", value: h.score, color: "#38bdf8" }],
  endChips: (r) => [{ label: "Crossings", value: r.score, color: "#38bdf8" }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.score, bestCombo: r.score }),
};
export default function Dash() { return <ArcadeGameShell config={config} />; }
