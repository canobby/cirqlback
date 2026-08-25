import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { Flag, Shovel } from "lucide-react";
import { SweepEngine } from "@/game/sweep-engine";

const config: GameConfig = {
  gameId: "sweep",
  name: "Cirql Sweep",
  eyebrow: "Minesweeper · wedges",
  title: "Read the numbers",
  body: "Dig cells to reveal how many sparks border them; empty cells open their neighbours. Toggle FLAG to mark the sparks. Clear the disc to advance — hit a spark and you lose a life.",
  overEyebrow: "One spark too many",
  overTitle: "Detonated",
  accent: "#38bdf8", accent2: "#a78bfa",
  bg: "radial-gradient(120% 90% at 50% 8%, #081226 0%, #05040f 60%, #030208 100%)",
  lsKey: "csweep_best",
  makeEngine: (canvas, hooks) => new SweepEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Lives", value: "♥".repeat(Math.max(0, h.lives)), color: "#fb7185" }, { label: "Level", value: h.level, color: "#38bdf8" }, { label: "Sparks", value: h.mines }],
  endChips: (r) => [{ label: "Score", value: r.score, color: "#38bdf8" }, { label: "Level", value: r.level }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.score, bestCombo: r.level }),
  controls: (eng) => [{ testid: "button-flag", label: "FLAG", node: <Flag className="h-5 w-5" />, color: "#fbbf24", onPress: () => eng.toggleFlagMode() }, { testid: "button-dig", label: "DIG", node: <Shovel className="h-5 w-5" />, color: "#38bdf8", onPress: () => eng.setFlagMode(false) }],
};
export default function Sweep() { return <ArcadeGameShell config={config} />; }
