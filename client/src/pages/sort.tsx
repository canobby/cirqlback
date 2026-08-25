import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { SortEngine } from "@/game/sort-engine";

const config: GameConfig = {
  gameId: "sort",
  name: "Cirql Sort",
  eyebrow: "Ball sort · puzzle",
  title: "One colour per tube",
  body: "Tap a tube to lift its top ball, tap another to pour it — onto an empty tube or a matching colour on top. Sort every tube to a single colour, then a harder board appears.",
  overEyebrow: "Time's up",
  overTitle: "Unsorted",
  accent: "#38bdf8", accent2: "#34d399",
  bg: "radial-gradient(120% 90% at 50% 8%, #081226 0%, #05040f 60%, #030208 100%)",
  lsKey: "csort_best",
  makeEngine: (canvas, hooks) => new SortEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Time", value: h.time, color: h.time <= 15 ? "#fb7185" : "#67e8f9" }, { label: "Sorted", value: h.solved }],
  endChips: (r) => [{ label: "Sorted", value: r.solved, color: "#38bdf8" }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.solved, bestCombo: r.solved }),
};
export default function Sort() { return <ArcadeGameShell config={config} />; }
