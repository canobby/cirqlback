import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { LanderEngine } from "@/game/lander-engine";

const config: GameConfig = {
  gameId: "lander",
  name: "Cirql Lander",
  eyebrow: "Lunar Lander · to the planet",
  title: "Set it down gently",
  body: "Gravity pulls you toward the planet at the centre. Hold to fire the thruster and slow your fall, drag to line up with the green pad, and touch down soft. Land clean to bank your leftover fuel; come in hot and you crash.",
  overEyebrow: "Out of landers",
  overTitle: "Grounded",
  accent: "#67e8f9", accent2: "#34d399",
  bg: "radial-gradient(120% 90% at 50% 8%, #06202a 0%, #05040f 60%, #030208 100%)",
  lsKey: "clander_best",
  makeEngine: (canvas, hooks) => new LanderEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Landers", value: "▲".repeat(Math.max(0, h.lives)), color: "#67e8f9" }, { label: "Fuel", value: `${Math.round(h.fuel * 100)}%`, color: h.fuel < 0.25 ? "#fb7185" : "#fbbf24" }, { label: "Score", value: h.score }],
  endChips: (r) => [{ label: "Score", value: r.score, color: "#67e8f9" }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.score, bestCombo: r.score }),
};
export default function Lander() { return <ArcadeGameShell config={config} />; }
