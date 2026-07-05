import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { GemsEngine } from "@/game/gems-engine";

const config: GameConfig = {
  gameId: "gems",
  name: "Cirql Gems",
  eyebrow: "Match-3 · swap",
  title: "Line up three",
  body: "Tap two neighbouring gems to swap them. Three or more of a colour along a ring or spoke clear, fresh gems drop from the rim, and chains cascade for bonus. Sixty seconds.",
  overEyebrow: "Time's up",
  overTitle: "Board's cold",
  accent: "#f472b6", accent2: "#a78bfa",
  bg: "radial-gradient(120% 90% at 50% 8%, #260a1e 0%, #05040f 60%, #030208 100%)",
  lsKey: "cgems_best",
  makeEngine: (canvas, hooks) => new GemsEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Time", value: h.time, color: h.time <= 10 ? "#fb7185" : "#f9a8d4" }, { label: "Score", value: h.score }],
  endChips: (r) => [{ label: "Score", value: r.score, color: "#f472b6" }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.score, bestCombo: r.score }),
};
export default function Gems() { return <ArcadeGameShell config={config} />; }
