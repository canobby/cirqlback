import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { ReactorEngine } from "@/game/reactor-engine";

const config: GameConfig = {
  gameId: "reactor",
  name: "Cirql Reactor",
  eyebrow: "Simon · on a ring",
  title: "Repeat the pattern",
  body: "The reactor lights a growing sequence around the ring. Watch, then tap the segments back in order. One more each round — how far can your memory carry you?",
  overEyebrow: "The pattern broke",
  overTitle: "Short-circuit",
  accent: "#a78bfa", accent2: "#38bdf8",
  bg: "radial-gradient(120% 90% at 50% 8%, #140a26 0%, #05040f 60%, #030208 100%)",
  lsKey: "creactor_best",
  startLabel: "Watch",
  makeEngine: (canvas, hooks) => new ReactorEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Round", value: h.round, color: "#c4b5fd" }],
  endChips: (r) => [{ label: "Rounds", value: r.round, color: "#c4b5fd" }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.round, bestCombo: r.round }),
};

export default function Reactor() { return <ArcadeGameShell config={config} />; }
