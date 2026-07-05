import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { Check } from "lucide-react";
import { KaleidoEngine } from "@/game/kaleido-engine";

const config: GameConfig = {
  gameId: "kaleido",
  name: "Cirql Kaleido",
  eyebrow: "Kaleidoscope",
  title: "Bloom the mirror",
  body: "Draw anywhere and your marks are mirrored into six-fold symmetry — a living kaleidoscope that never repeats. No aim, no clock. Finish when it's beautiful.",
  overEyebrow: "The mirror stills",
  overTitle: "Symmetry",
  accent: "#f472b6", accent2: "#a78bfa",
  bg: "radial-gradient(120% 90% at 50% 12%, #23082a 0%, #05040f 60%, #030208 100%)",
  lsKey: "ckaleido_best",
  startLabel: "Begin",
  makeEngine: (canvas, hooks) => new KaleidoEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Strokes", value: h.strokes, color: "#f472b6" }],
  endChips: (r) => [{ label: "Strokes", value: r.strokes, color: "#f472b6" }, { label: "Best", value: r.best, color: "#a78bfa" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.strokes, bestCombo: r.strokes }),
  controls: (eng) => [{ testid: "button-finish", label: "FINISH", node: <Check className="h-5 w-5" />, color: "#f472b6", onPress: () => eng.finish() }],
};
export default function Kaleido() { return <ArcadeGameShell config={config} />; }
