import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { CoilEngine } from "@/game/coil-engine";

const config: GameConfig = {
  gameId: "coil",
  name: "Cirql Coil",
  eyebrow: "Zuma · wound inward",
  title: "Hold back the coil",
  body: "A chain of coloured marbles snakes inward toward the core. Aim from the centre and fire marbles into the line — land three or more of a colour together and they burst. Let the chain reach the core and it's over.",
  overEyebrow: "The coil reached the core",
  overTitle: "Swallowed",
  accent: "#38bdf8", accent2: "#f472b6",
  bg: "radial-gradient(120% 90% at 50% 8%, #081226 0%, #05040f 60%, #030208 100%)",
  lsKey: "ccoil_best",
  makeEngine: (canvas, hooks) => new CoilEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Score", value: h.score, color: "#67e8f9" }],
  endChips: (r) => [{ label: "Score", value: r.score, color: "#38bdf8" }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.score, bestCombo: r.score }),
  dial: (eng) => (a) => eng.aimTo(a),
  controls: (eng) => [{ testid: "button-shoot", label: "SHOOT", node: "◎", color: "#38bdf8", onPress: () => eng.shoot() }],
};
export default function Coil() { return <ArcadeGameShell config={config} />; }
