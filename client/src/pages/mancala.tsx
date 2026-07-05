import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { MancalaEngine } from "@/game/mancala-engine";

const config: GameConfig = {
  gameId: "mancala",
  name: "Cirql Mancala",
  eyebrow: "Sow & capture",
  title: "Sow the ring",
  body: "The ancient sowing game, wrapped onto a ring. Tap one of your pits to scatter its stones counter-clockwise; land your last stone in your store for a free turn, or in one of your empty pits to capture the stones opposite. Gather the most and win.",
  overEyebrow: "The stones are counted",
  overTitle: "Harvest",
  accent: "#fbbf24", accent2: "#fb7185",
  bg: "radial-gradient(120% 90% at 50% 8%, #241a06 0%, #05040f 60%, #030208 100%)",
  lsKey: "cmancala_best",
  startLabel: "Play",
  makeEngine: (canvas, hooks) => new MancalaEngine(canvas, hooks),
  hudChips: (h) => [{ label: "You", value: h.you, color: "#fbbf24" }, { label: "Rival", value: h.them, color: "#fb7185" }],
  endChips: (r) => [{ label: "Result", value: r.won ? "WON" : "Lost", color: r.won ? "#34d399" : "#fb7185" }, { label: "You", value: r.you }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.you, bestCombo: r.you }),
};
export default function Mancala() { return <ArcadeGameShell config={config} />; }
