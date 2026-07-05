import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { KeepEngine } from "@/game/keep-engine";

const config: GameConfig = {
  gameId: "keep",
  name: "Cirql Keep",
  eyebrow: "Tower defense · on a spiral",
  title: "Hold the core",
  body: "Waves march the winding path from the rim to your core. Tap open ground to raise turrets that auto-fire on anything in range — kills pay for more. Hold the core through as many waves as you can.",
  overEyebrow: "The core fell",
  overTitle: "Overrun",
  accent: "#a78bfa", accent2: "#34d399",
  bg: "radial-gradient(120% 90% at 50% 8%, #140a26 0%, #05040f 60%, #030208 100%)",
  lsKey: "ckeep_best",
  makeEngine: (canvas, hooks) => new KeepEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Core", value: h.core, color: h.core <= 4 ? "#fb7185" : "#34d399" }, { label: "Gold", value: h.gold, color: "#fbbf24" }, { label: "Wave", value: h.wave, color: "#a78bfa" }],
  endChips: (r) => [{ label: "Waves", value: r.wave, color: "#a78bfa" }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.wave, bestCombo: r.wave }),
};
export default function Keep() { return <ArcadeGameShell config={config} />; }
