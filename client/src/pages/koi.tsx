import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { Check } from "lucide-react";
import { KoiEngine } from "@/game/koi-engine";

const config: GameConfig = {
  gameId: "koi",
  name: "Cirql Koi",
  eyebrow: "Koi pond",
  title: "Lead the koi",
  body: "A pond of koi drifts inside the ring. Trail your finger and they follow it in slow, curving schools; touch the water for ripples. No aim, no clock. Finish whenever you're ready.",
  overEyebrow: "The pond stills",
  overTitle: "Still water",
  accent: "#fb923c", accent2: "#67e8f9",
  bg: "radial-gradient(120% 90% at 50% 12%, #06181f 0%, #05040f 60%, #030208 100%)",
  lsKey: "ckoi_best",
  startLabel: "Begin",
  makeEngine: (canvas, hooks) => new KoiEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Ripples", value: h.ripples, color: "#fb923c" }],
  endChips: (r) => [{ label: "Ripples", value: r.ripples, color: "#fb923c" }, { label: "Best", value: r.best, color: "#67e8f9" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.ripples, bestCombo: r.ripples }),
  controls: (eng) => [{ testid: "button-finish", label: "FINISH", node: <Check className="h-5 w-5" />, color: "#fb923c", onPress: () => eng.finish() }],
};
export default function Koi() { return <ArcadeGameShell config={config} />; }
