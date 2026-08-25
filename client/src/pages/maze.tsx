import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { MazeEngine } from "@/game/maze-engine";

const config: GameConfig = {
  gameId: "maze",
  name: "Cirql Maze",
  eyebrow: "Rotating rings · brain game",
  title: "Line up the gaps",
  body: "Spin the active ring so its gap meets the orb at the top — it falls inward to the next ring. Reach the centre to solve. Crack as many as you can before time's up.",
  overEyebrow: "Time's up",
  overTitle: "Clock ran out",
  accent: "#a78bfa", accent2: "#38bdf8",
  bg: "radial-gradient(120% 90% at 50% 8%, #140a26 0%, #05040f 60%, #030208 100%)",
  lsKey: "cmaze_best",
  makeEngine: (canvas, hooks) => new MazeEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Time", value: h.time, color: h.time <= 10 ? "#fb7185" : "#c4b5fd" }, { label: "Solved", value: h.solved }],
  endChips: (r) => [{ label: "Solved", value: r.solved, color: "#a78bfa" }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.solved, bestCombo: r.solved }),
  dial: (eng) => (a) => eng.rotateActive(a),
};
export default function Maze() { return <ArcadeGameShell config={config} />; }
