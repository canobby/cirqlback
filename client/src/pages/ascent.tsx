import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { AscentEngine } from "@/game/ascent-engine";

const config: GameConfig = {
  gameId: "ascent",
  name: "Cirql Ascent",
  eyebrow: "Doodle Jump · climbing out",
  title: "Bounce ever outward",
  body: "The orb bounces on its own — steer it around the ring to land on the next platform and keep rising. The field scrolls inward as you climb. Fall back to the centre and it's over.",
  overEyebrow: "You fell",
  overTitle: "Back to the centre",
  accent: "#34d399", accent2: "#38bdf8",
  bg: "radial-gradient(120% 90% at 50% 8%, #06231a 0%, #05040f 60%, #030208 100%)",
  lsKey: "cascent_best",
  makeEngine: (canvas, hooks) => new AscentEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Height", value: h.score, color: "#6ee7b7" }],
  endChips: (r) => [{ label: "Height", value: r.score, color: "#34d399" }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.score, bestCombo: r.score }),
  dial: (eng) => (a) => eng.steer(a),
};
export default function Ascent() { return <ArcadeGameShell config={config} />; }
