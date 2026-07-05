import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BalanceEngine } from "@/game/balance-engine";

const config: GameConfig = {
  gameId: "balance",
  name: "Cirql Balance",
  eyebrow: "Keep it at the top",
  title: "Hold the balance",
  body: "The marble wants to roll off the top of the ring. Tap left or right to nudge it back to centre. The wobbles keep coming, and they grow — how long can you hold steady?",
  overEyebrow: "It rolled away",
  overTitle: "Toppled",
  accent: "#fbbf24", accent2: "#34d399",
  bg: "radial-gradient(120% 90% at 50% 8%, #1c1406 0%, #05040f 60%, #030208 100%)",
  lsKey: "cbalance_best",
  makeEngine: (canvas, hooks) => new BalanceEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Time", value: (h.time / 10).toFixed(1) + "s", color: "#fde68a" }],
  endChips: (r) => [{ label: "Time", value: (r.time / 10).toFixed(1) + "s", color: "#fbbf24" }, { label: "Best", value: (r.best / 10).toFixed(1) + "s", color: "#fde68a" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.time, bestCombo: r.time }),
  controls: (eng) => [
    { testid: "button-left", label: "LEFT", node: <ChevronLeft className="h-6 w-6" />, color: "#fbbf24", onPress: () => eng.nudge(-1) },
    { testid: "button-right", label: "RIGHT", node: <ChevronRight className="h-6 w-6" />, color: "#fbbf24", onPress: () => eng.nudge(1) },
  ],
};
export default function Balance() { return <ArcadeGameShell config={config} />; }
