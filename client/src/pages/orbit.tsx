import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { OrbitEngine } from "@/game/orbit-engine";

const config: GameConfig = {
  gameId: "orbit",
  name: "Cirql Orbit",
  eyebrow: "Asteroids · by gravity",
  title: "Ride the orbits",
  body: "Your satellite circles the planet; tap to thrust outward, gravity pulls you back. Scoop the energy, thread past the black holes, and don't crash.",
  overEyebrow: "Lost to gravity",
  overTitle: "Crashed",
  accent: "#a78bfa", accent2: "#38bdf8",
  bg: "radial-gradient(120% 90% at 50% 8%, #100a26 0%, #05040f 60%, #030208 100%)",
  lsKey: "corbit_best",
  makeEngine: (canvas, hooks) => new OrbitEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Energy", value: h.score, color: "#fbbf24" }],
  endChips: (r) => [{ label: "Energy", value: r.score, color: "#fbbf24" }, { label: "Best", value: r.best, color: "#a78bfa" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.score, bestCombo: r.score }),
};
export default function Orbit() { return <ArcadeGameShell config={config} />; }
