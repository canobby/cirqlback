import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { PinballEngine } from "@/game/pinball-engine";

const config: GameConfig = {
  gameId: "pinball",
  name: "Cirql Pinball",
  eyebrow: "One flipper · round table",
  title: "Keep it in play",
  body: "The ball falls; bumpers fling it around. Tap to flip it back up before it drains through the gap at the bottom. Rack up points across three balls.",
  overEyebrow: "Last ball drained",
  overTitle: "Tilt",
  accent: "#fb7185", accent2: "#a78bfa",
  bg: "radial-gradient(120% 90% at 50% 8%, #240a18 0%, #05040f 60%, #030208 100%)",
  lsKey: "cpinball_best",
  makeEngine: (canvas, hooks) => new PinballEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Balls", value: "●".repeat(Math.max(0, h.balls)), color: "#fb7185" }, { label: "Score", value: h.score }],
  endChips: (r) => [{ label: "Score", value: r.score, color: "#fb7185" }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.score, bestCombo: r.score }),
};
export default function Pinball() { return <ArcadeGameShell config={config} />; }
