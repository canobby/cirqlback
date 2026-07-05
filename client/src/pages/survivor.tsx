import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { SurvivorEngine } from "@/game/survivor-engine";

const config: GameConfig = {
  gameId: "survivor",
  name: "Cirql Survivor",
  eyebrow: "Vampire Survivors · in the ring",
  title: "Outlast the tide",
  body: "Drag to drift; your spark auto-fires at whatever's nearest. Swarms pour in and grow — hoover up the light they drop to level up: faster fire, more shots, more damage. See how long you last.",
  overEyebrow: "The swarm won",
  overTitle: "Overrun",
  accent: "#67e8f9", accent2: "#a78bfa",
  bg: "radial-gradient(120% 90% at 50% 8%, #081226 0%, #05040f 60%, #030208 100%)",
  lsKey: "csurvivor_best",
  makeEngine: (canvas, hooks) => new SurvivorEngine(canvas, hooks),
  hudChips: (h) => [{ label: "HP", value: "♥".repeat(Math.max(0, h.hp)), color: "#fb7185" }, { label: "Lv", value: h.level, color: "#a78bfa" }, { label: "Time", value: `${h.time}s` }],
  endChips: (r) => [{ label: "Time", value: `${r.time}s`, color: "#67e8f9" }, { label: "Level", value: r.level, color: "#a78bfa" }, { label: "Best", value: `${r.best}s`, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.time, bestCombo: r.level }),
};
export default function Survivor() { return <ArcadeGameShell config={config} />; }
