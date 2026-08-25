import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { DodgeEngine } from "@/game/dodge-engine";

const config: GameConfig = {
  gameId: "dodge",
  name: "Cirql Dodge",
  eyebrow: "Bullet-hell · from the core",
  title: "Weave the storm",
  body: "Patterns of light spiral and burst outward from the core. Drag your spark through the gaps — one touch ends it. The longer you last, the tighter it gets.",
  overEyebrow: "Clipped",
  overTitle: "Caught in it",
  accent: "#f472b6", accent2: "#38bdf8",
  bg: "radial-gradient(120% 90% at 50% 8%, #260a1e 0%, #05040f 60%, #030208 100%)",
  lsKey: "cdodge_best",
  makeEngine: (canvas, hooks) => new DodgeEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Time", value: (h.time / 10).toFixed(1) + "s", color: "#f9a8d4" }],
  endChips: (r) => [{ label: "Time", value: (r.time / 10).toFixed(1) + "s", color: "#f472b6" }, { label: "Best", value: (r.best / 10).toFixed(1) + "s", color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.time, bestCombo: r.time }),
};
export default function Dodge() { return <ArcadeGameShell config={config} />; }
