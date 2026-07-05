import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { SumoEngine } from "@/game/sumo-engine";

const config: GameConfig = {
  gameId: "sumo",
  name: "Cirql Sumo",
  eyebrow: "Ring-out · sumo",
  title: "Shove them off",
  body: "You share a wall-less disc with a pack of rivals. Tap to dash and barge them over the edge while keeping your own footing. Clear the ring to advance; get shoved off yourself and it's over.",
  overEyebrow: "You went over",
  overTitle: "Ring-out",
  accent: "#fbbf24", accent2: "#fb7185",
  bg: "radial-gradient(120% 90% at 50% 8%, #241a06 0%, #05040f 60%, #030208 100%)",
  lsKey: "csumo_best",
  makeEngine: (canvas, hooks) => new SumoEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Round", value: h.round, color: "#fbbf24" }, { label: "Knockouts", value: h.score }],
  endChips: (r) => [{ label: "Knockouts", value: r.score, color: "#fbbf24" }, { label: "Best", value: r.best, color: "#fde68a" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.score, bestCombo: r.score }),
};
export default function Sumo() { return <ArcadeGameShell config={config} />; }
