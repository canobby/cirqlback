import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { Check } from "lucide-react";
import { EmberEngine } from "@/game/ember-engine";

const config: GameConfig = {
  gameId: "ember",
  name: "Cirql Ember",
  eyebrow: "Tend the fire",
  title: "Keep the warmth",
  body: "Press and hold to feed a little fire; glowing embers drift up and fade. Sweep to fan them. Nothing to lose — just tend the flame. Finish when you're warm.",
  overEyebrow: "The fire settles",
  overTitle: "Embers",
  accent: "#fb7185", accent2: "#fbbf24",
  bg: "radial-gradient(120% 90% at 50% 10%, #200a08 0%, #05040f 60%, #030208 100%)",
  lsKey: "cember_best",
  startLabel: "Begin",
  makeEngine: (canvas, hooks) => new EmberEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Warmth", value: h.warmth, color: "#fbbf24" }],
  endChips: (r) => [{ label: "Warmth", value: r.warmth, color: "#fbbf24" }, { label: "Best", value: r.best, color: "#fb7185" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.warmth, bestCombo: r.warmth }),
  controls: (eng) => [{ testid: "button-finish", label: "FINISH", node: <Check className="h-5 w-5" />, color: "#fb7185", onPress: () => eng.finish() }],
};
export default function Ember() { return <ArcadeGameShell config={config} />; }
