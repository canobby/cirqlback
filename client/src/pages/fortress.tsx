import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { FortressEngine } from "@/game/fortress-engine";

const config: GameConfig = {
  gameId: "fortress",
  name: "Cirql Fortress",
  eyebrow: "Maze defense",
  title: "Hold the core",
  body: "A horde marches from the rim to your core. Tap cells to raise walls and snake the invaders through the longest maze while your core-gun mows them down. You can't wall them out completely — a path always remains. Survive every wave.",
  overEyebrow: "The siege ends",
  overTitle: "Siege over",
  accent: "#a78bfa", accent2: "#67e8f9",
  bg: "radial-gradient(120% 90% at 50% 8%, #120a24 0%, #05040f 60%, #030208 100%)",
  lsKey: "cfortress_best",
  startLabel: "Build",
  makeEngine: (canvas, hooks) => new FortressEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Core", value: h.hp, color: "#fb7185" }, { label: "Wave", value: `${h.wave}/${h.waves}`, color: "#a78bfa" }, { label: "Kills", value: h.kills }],
  endChips: (r) => [{ label: "Result", value: r.won ? "HELD" : "Breached", color: r.won ? "#34d399" : "#fb7185" }, { label: "Waves", value: r.waves }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.kills, bestCombo: r.waves }),
};
export default function Fortress() { return <ArcadeGameShell config={config} />; }
