import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { Check } from "lucide-react";
import { SpiroEngine } from "@/game/spiro-engine";

const config: GameConfig = {
  gameId: "spiro",
  name: "Cirql Spiro",
  eyebrow: "A spirograph · that draws itself",
  title: "Loops of light",
  body: "A pen rolls inside the ring and traces glowing figures. Drag to reshape the gears and watch the pattern change. Nothing to lose — just let it draw. Finish whenever you like.",
  overEyebrow: "A lovely figure",
  overTitle: "Traced",
  accent: "#a78bfa", accent2: "#f472b6",
  bg: "radial-gradient(120% 90% at 50% 12%, #140a26 0%, #0a0714 55%, #05040f 100%)",
  lsKey: "cspiro_best",
  startLabel: "Begin",
  makeEngine: (canvas, hooks) => new SpiroEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Loops", value: h.loops, color: "#c4b5fd" }],
  endChips: (r) => [{ label: "Loops", value: r.loops, color: "#a78bfa" }, { label: "Best", value: r.best, color: "#f472b6" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.loops, bestCombo: r.loops }),
  controls: (eng) => [{ testid: "button-finish", label: "FINISH", node: <Check className="h-5 w-5" />, color: "#a78bfa", onPress: () => eng.finish() }],
};
export default function Spiro() { return <ArcadeGameShell config={config} />; }
