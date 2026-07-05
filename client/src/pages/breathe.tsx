import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { Check } from "lucide-react";
import { BreatheEngine } from "@/game/breathe-engine";

const config: GameConfig = {
  gameId: "breathe",
  name: "Cirql Breathe",
  eyebrow: "A calm minute",
  title: "Breathe with the ring",
  body: "The ring breathes in and out on a slow, even count. Follow it — tap as it turns at the top of each breath in and the bottom of each breath out. Nothing to lose. Finish whenever you're ready.",
  overEyebrow: "A little calmer",
  overTitle: "Well breathed",
  accent: "#f9a8d4", accent2: "#c4b5fd",
  bg: "radial-gradient(120% 90% at 50% 12%, #1a0f22 0%, #0a0714 55%, #05040f 100%)",
  lsKey: "cbreathe_best",
  startLabel: "Begin",
  makeEngine: (canvas, hooks) => new BreatheEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Breaths", value: h.breaths, color: "#f9a8d4" }],
  endChips: (r) => [{ label: "Breaths", value: r.breaths, color: "#f9a8d4" }, { label: "Best", value: r.best, color: "#c4b5fd" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.breaths, bestCombo: r.breaths }),
  controls: (eng) => [{ testid: "button-finish", label: "FINISH", node: <Check className="h-5 w-5" />, color: "#f9a8d4", onPress: () => eng.finish() }],
};
export default function Breathe() { return <ArcadeGameShell config={config} />; }
