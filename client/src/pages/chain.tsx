import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { ChainEngine } from "@/game/chain-engine";

const config: GameConfig = {
  gameId: "chain",
  name: "Cirql Chain",
  eyebrow: "Chain reaction",
  title: "One tap, then watch",
  body: "Tap once to detonate. The blast ignites nearby orbs, they ignite theirs, and the whole field cascades. Set off a big enough chain to clear each round.",
  overEyebrow: "The chain fizzled",
  overTitle: "Chain broken",
  accent: "#fbbf24", accent2: "#fb7185",
  bg: "radial-gradient(120% 90% at 50% 8%, #241706 0%, #05040f 60%, #030208 100%)",
  lsKey: "cchain_best",
  startLabel: "Arm",
  makeEngine: (canvas, hooks) => new ChainEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Need", value: `${h.ignited}/${h.needed}`, color: "#fbbf24" }, { label: "Round", value: h.round }],
  endChips: (r) => [{ label: "Rounds", value: r.round, color: "#fbbf24" }, { label: "Best", value: r.best, color: "#fde68a" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.round, bestCombo: r.round }),
};
export default function Chain() { return <ArcadeGameShell config={config} />; }
