import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { SliceEngine } from "@/game/slice-engine";

const config: GameConfig = {
  gameId: "slice",
  name: "Cirql Slice",
  eyebrow: "Fruit Ninja · across the disc",
  title: "Slash the orbs",
  body: "Orbs are flung on arcs through the ring. Swipe to slash them for points and combos — but a spark gets tossed in now and then, and slicing one ends the run. Sixty seconds.",
  overEyebrow: "You hit a spark",
  overTitle: "Sliced out",
  accent: "#f472b6", accent2: "#fbbf24",
  bg: "radial-gradient(120% 90% at 50% 8%, #260a1e 0%, #05040f 60%, #030208 100%)",
  lsKey: "cslice_best",
  makeEngine: (canvas, hooks) => new SliceEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Time", value: h.time, color: h.time <= 10 ? "#fb7185" : "#f9a8d4" }, { label: "Score", value: h.score }],
  endChips: (r) => [{ label: "Score", value: r.score, color: "#f472b6" }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.score, bestCombo: r.score }),
};
export default function Slice() { return <ArcadeGameShell config={config} />; }
