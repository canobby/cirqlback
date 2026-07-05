import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { CommandEngine } from "@/game/command-engine";

const config: GameConfig = {
  gameId: "command",
  name: "Cirql Command",
  eyebrow: "Galcon · a quick war",
  title: "Take every node",
  body: "Nodes of light ring the disc, each swelling with troops. Tap one of yours, then a target, to fling half its force there — reinforce your own or storm a rival's. Take the whole board to win; lose it all and it's over.",
  overEyebrow: "The war's decided",
  overTitle: "Stand down",
  accent: "#34d399", accent2: "#fb7185",
  bg: "radial-gradient(120% 90% at 50% 8%, #06231a 0%, #05040f 60%, #030208 100%)",
  lsKey: "ccommand_best",
  makeEngine: (canvas, hooks) => new CommandEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Yours", value: h.yours, color: "#34d399" }, { label: "Enemy", value: h.enemy, color: "#fb7185" }],
  endChips: (r) => [{ label: "Result", value: r.won ? "WON" : "Lost", color: r.won ? "#34d399" : "#fb7185" }, { label: "Battles", value: r.nodes }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.best, bestCombo: r.nodes }),
};
export default function Command() { return <ArcadeGameShell config={config} />; }
