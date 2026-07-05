import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { ChevronsLeft, ChevronsRight, RefreshCw } from "lucide-react";
import { MinerEngine } from "@/game/miner-engine";

const config: GameConfig = {
  gameId: "miner",
  name: "Cirql Miner",
  eyebrow: "Dig Dug · circular tunnels",
  title: "Gobble the gems",
  body: "Ride the rings collecting gems and hop in or out to shake the cave monsters. Clear every gem to open the next level. Three lives.",
  overEyebrow: "The cave took you",
  overTitle: "Caved in",
  accent: "#fbbf24", accent2: "#34d399",
  bg: "radial-gradient(120% 90% at 50% 8%, #1c1406 0%, #05040f 60%, #030208 100%)",
  lsKey: "cminer_best",
  makeEngine: (canvas, hooks) => new MinerEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Lives", value: "♥".repeat(Math.max(0, h.lives)), color: "#fb7185" }, { label: "Gems", value: h.gems, color: "#fbbf24" }, { label: "Score", value: h.score }],
  endChips: (r) => [{ label: "Score", value: r.score, color: "#fbbf24" }, { label: "Level", value: r.level, color: "#34d399" }, { label: "Best", value: r.best, color: "#fde68a" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.score, bestCombo: r.level }),
  controls: (eng) => [
    { testid: "button-in", label: "IN", node: <ChevronsLeft className="h-5 w-5" />, color: "#fbbf24", onPress: () => eng.nudge(-1) },
    { testid: "button-rev", label: "TURN", node: <RefreshCw className="h-5 w-5" />, color: "#34d399", onPress: () => eng.reverse(), big: true },
    { testid: "button-out", label: "OUT", node: <ChevronsRight className="h-5 w-5" />, color: "#fbbf24", onPress: () => eng.nudge(1) },
  ],
};
export default function Miner() { return <ArcadeGameShell config={config} />; }
