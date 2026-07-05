import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { PairsEngine } from "@/game/pairs-engine";

const config: GameConfig = {
  gameId: "pairs",
  name: "Cirql Pairs",
  eyebrow: "Memory match",
  title: "Find the pairs",
  body: "Flip two cards on the ring; a match stays lit, a miss flips back. Clear the ring and a bigger one takes its place. Sixty seconds to remember as many as you can.",
  overEyebrow: "Time's up",
  overTitle: "Memory's full",
  accent: "#a78bfa", accent2: "#f472b6",
  bg: "radial-gradient(120% 90% at 50% 8%, #140a26 0%, #05040f 60%, #030208 100%)",
  lsKey: "cpairs_best",
  makeEngine: (canvas, hooks) => new PairsEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Time", value: h.time, color: h.time <= 10 ? "#fb7185" : "#c4b5fd" }, { label: "Pairs", value: h.pairs }],
  endChips: (r) => [{ label: "Pairs", value: r.pairs, color: "#a78bfa" }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.pairs, bestCombo: r.pairs }),
};
export default function Pairs() { return <ArcadeGameShell config={config} />; }
