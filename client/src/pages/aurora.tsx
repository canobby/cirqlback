import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { Check } from "lucide-react";
import { AuroraEngine } from "@/game/aurora-engine";

const config: GameConfig = {
  gameId: "aurora",
  name: "Cirql Aurora",
  eyebrow: "Northern lights",
  title: "Paint the sky",
  body: "Sweep your finger and shimmering ribbons of aurora rise and drift across the sky. No aim, no clock — just paint the light. Finish whenever you're ready.",
  overEyebrow: "The lights fade",
  overTitle: "Skyfall",
  accent: "#a78bfa", accent2: "#67e8f9",
  bg: "radial-gradient(120% 90% at 50% 12%, #0a0a24 0%, #05040f 60%, #030208 100%)",
  lsKey: "caurora_best",
  startLabel: "Begin",
  makeEngine: (canvas, hooks) => new AuroraEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Ribbons", value: h.strokes, color: "#a78bfa" }],
  endChips: (r) => [{ label: "Ribbons", value: r.strokes, color: "#a78bfa" }, { label: "Best", value: r.best, color: "#67e8f9" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.strokes, bestCombo: r.strokes }),
  controls: (eng) => [{ testid: "button-finish", label: "FINISH", node: <Check className="h-5 w-5" />, color: "#a78bfa", onPress: () => eng.finish() }],
};
export default function Aurora() { return <ArcadeGameShell config={config} />; }
