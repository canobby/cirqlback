import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { ChevronsDownUp, ChevronsUpDown, RotateCcw, RotateCw } from "lucide-react";
import { MergeEngine } from "@/game/merge-engine";

const config: GameConfig = {
  gameId: "merge",
  name: "Cirql Merge",
  eyebrow: "2048 · on a ring",
  title: "Merge to the top",
  body: "Slide the tiles IN or OUT to merge equal numbers along the spokes. Spin the whole field to line them up first — rotation moves tiles but never merges them. Fill up with no merge left and it's over.",
  overEyebrow: "No moves left",
  overTitle: "Gridlocked",
  accent: "#fbbf24", accent2: "#fb7185",
  bg: "radial-gradient(120% 90% at 50% 8%, #241a06 0%, #05040f 60%, #030208 100%)",
  lsKey: "cmerge_best",
  makeEngine: (canvas, hooks) => new MergeEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Top", value: h.top, color: "#fbbf24" }, { label: "Score", value: h.score }],
  endChips: (r) => [{ label: "Score", value: r.score, color: "#fbbf24" }, { label: "Top tile", value: r.top, color: "#fb7185" }, { label: "Best", value: r.best, color: "#fde68a" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.score, bestCombo: r.top }),
  controls: (eng) => [
    { testid: "button-ccw", label: "SPIN", node: <RotateCcw className="h-5 w-5" />, color: "#a78bfa", onPress: () => eng.rotate(-1) },
    { testid: "button-in", label: "IN", node: <ChevronsDownUp className="h-5 w-5" />, color: "#fbbf24", onPress: () => eng.moveIn() },
    { testid: "button-out", label: "OUT", node: <ChevronsUpDown className="h-5 w-5" />, color: "#fbbf24", onPress: () => eng.moveOut() },
    { testid: "button-cw", label: "SPIN", node: <RotateCw className="h-5 w-5" />, color: "#a78bfa", onPress: () => eng.rotate(1) },
  ],
};
export default function Merge() { return <ArcadeGameShell config={config} />; }
