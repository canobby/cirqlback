import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { GunnerEngine } from "@/game/gunner-engine";

const config: GameConfig = {
  gameId: "gunner",
  name: "Cirql Gunner",
  eyebrow: "Twin-stick · from the middle",
  title: "Hold the centre",
  body: "You hold the centre and rotate a rapid-fire cannon while swarms pour in from every side. Sweep the aim to mow them down before they reach you. Five hits and you're done.",
  overEyebrow: "The swarm reached you",
  overTitle: "Overwhelmed",
  accent: "#67e8f9", accent2: "#a78bfa",
  bg: "radial-gradient(120% 90% at 50% 8%, #081226 0%, #05040f 60%, #030208 100%)",
  lsKey: "cgunner_best",
  makeEngine: (canvas, hooks) => new GunnerEngine(canvas, hooks),
  hudChips: (h) => [{ label: "HP", value: "♥".repeat(Math.max(0, h.hp)), color: "#fb7185" }, { label: "Score", value: h.score }],
  endChips: (r) => [{ label: "Score", value: r.score, color: "#67e8f9" }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.score, bestCombo: r.score }),
  dial: (eng) => (a) => eng.aimTo(a),
  freestyle: {
    knobs: [{ key: "density", label: "Enemy density", min: 0.5, max: 1.6, step: 0.1, def: 1, fmt: (v) => (v < 0.85 ? "Calm" : v > 1.15 ? "Intense" : "Normal") }],
    apply: (eng, v) => { eng.spawnMul = 1 / (v.density || 1); },
  },
};
export default function Gunner() { return <ArcadeGameShell config={config} />; }
