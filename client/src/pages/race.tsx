import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { ChevronsLeft, ChevronsRight, Zap } from "lucide-react";
import { RaceEngine } from "@/game/race-engine";

const config: GameConfig = {
  gameId: "race",
  name: "Cirql Race",
  eyebrow: "Slot-car racing",
  title: "Take the flag",
  body: "Four racers, concentric lanes — inner lanes are shorter and faster. Shift lanes and spend your boost to nose ahead. First across three laps wins.",
  overEyebrow: "Chequered flag",
  overTitle: "Finish!",
  accent: "#fbbf24", accent2: "#f472b6",
  bg: "radial-gradient(120% 90% at 50% 8%, #241a06 0%, #05040f 60%, #030208 100%)",
  lsKey: "crace_best",
  makeEngine: (canvas, hooks) => new RaceEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Place", value: `${h.place}${["st", "nd", "rd", "th"][Math.min(h.place - 1, 3)]}`, color: h.place === 1 ? "#fbbf24" : "#e6e9ff" }, { label: "Lap", value: `${h.lap}/${h.laps}` }],
  endChips: (r) => [{ label: "Place", value: `${r.place}${["st", "nd", "rd", "th"][Math.min(r.place - 1, 3)]}`, color: r.place === 1 ? "#fbbf24" : "#e6e9ff" }, { label: "Best", value: r.best, color: "#f472b6" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.score, bestCombo: 5 - r.place }),
  controls: (eng) => [
    { testid: "button-in", label: "IN", node: <ChevronsLeft className="h-5 w-5" />, color: "#fbbf24", onPress: () => eng.nudge(-1) },
    { testid: "button-boost", label: "BOOST", node: <Zap className="h-5 w-5" />, color: "#f472b6", onPress: () => eng.useBoost(), big: true, active: (h) => (h?.boost ?? 0) >= 0.25 },
    { testid: "button-out", label: "OUT", node: <ChevronsRight className="h-5 w-5" />, color: "#fbbf24", onPress: () => eng.nudge(1) },
  ],
  online: { href: "/play/race/online", label: "Race online" },
};
export default function Race() { return <ArcadeGameShell config={config} />; }
