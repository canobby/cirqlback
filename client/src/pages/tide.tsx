import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { Check } from "lucide-react";
import { TideEngine } from "@/game/tide-engine";

const config: GameConfig = {
  gameId: "tide",
  name: "Cirql Tide",
  eyebrow: "A sea of light",
  title: "Stir the tide",
  body: "A sea of motes drifts inside the ring. Sweep your finger and they flow with you, swirling and settling in slow currents. No aim, no clock — just stir the light. Finish whenever you're ready.",
  overEyebrow: "The tide settles",
  overTitle: "Still waters",
  accent: "#38bdf8", accent2: "#67e8f9",
  bg: "radial-gradient(120% 90% at 50% 12%, #06141f 0%, #05040f 60%, #030208 100%)",
  lsKey: "ctide_best",
  startLabel: "Begin",
  makeEngine: (canvas, hooks) => new TideEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Ripples", value: h.ripples, color: "#67e8f9" }],
  endChips: (r) => [{ label: "Ripples", value: r.ripples, color: "#38bdf8" }, { label: "Best", value: r.best, color: "#67e8f9" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.ripples, bestCombo: r.ripples }),
  controls: (eng) => [{ testid: "button-finish", label: "FINISH", node: <Check className="h-5 w-5" />, color: "#38bdf8", onPress: () => eng.finish() }],
};
export default function Tide() { return <ArcadeGameShell config={config} />; }
