import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { Check } from "lucide-react";
import { WeaveEngine } from "@/game/weave-engine";

const config: GameConfig = {
  gameId: "weave",
  name: "Cirql Weave",
  eyebrow: "Harmonograph · woven light",
  title: "Tune the pendulums",
  body: "Two swinging pendulums trace looping figures that slowly settle as they decay. Drag to tune their rhythm and each new setting draws a fresh figure. Nothing to chase — just woven light. Finish whenever you like.",
  overEyebrow: "A quiet gallery",
  overTitle: "Woven",
  accent: "#67e8f9", accent2: "#a78bfa",
  bg: "radial-gradient(120% 90% at 50% 12%, #06141f 0%, #0a0714 55%, #05040f 100%)",
  lsKey: "cweave_best",
  startLabel: "Begin",
  makeEngine: (canvas, hooks) => new WeaveEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Figures", value: h.figures, color: "#a5f3fc" }],
  endChips: (r) => [{ label: "Figures", value: r.figures, color: "#67e8f9" }, { label: "Best", value: r.best, color: "#a78bfa" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.figures, bestCombo: r.figures }),
  controls: (eng) => [{ testid: "button-finish", label: "FINISH", node: <Check className="h-5 w-5" />, color: "#67e8f9", onPress: () => eng.finish() }],
};
export default function Weave() { return <ArcadeGameShell config={config} />; }
