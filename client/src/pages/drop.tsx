import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { DropEngine } from "@/game/drop-engine";

const config: GameConfig = {
  gameId: "drop",
  name: "Cirql Drop",
  eyebrow: "Plinko · toward the centre",
  title: "Drop for the middle",
  body: "Aim the drop point on the rim and release. The ball tumbles inward off the pegs and settles in a scoring wedge — the closer to the middle, the bigger the payout. Eight balls.",
  overEyebrow: "Out of balls",
  overTitle: "Final tally",
  accent: "#a78bfa", accent2: "#67e8f9",
  bg: "radial-gradient(120% 90% at 50% 8%, #140a26 0%, #05040f 60%, #030208 100%)",
  lsKey: "cdrop_best",
  makeEngine: (canvas, hooks) => new DropEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Balls", value: "●".repeat(Math.max(0, h.balls)), color: "#a78bfa" }, { label: "Score", value: h.score }],
  endChips: (r) => [{ label: "Score", value: r.score, color: "#a78bfa" }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.score, bestCombo: r.score }),
  dial: (eng) => (a) => eng.aim(a),
  controls: (eng) => [{ testid: "button-drop", label: "DROP", node: "▾", color: "#a78bfa", onPress: () => eng.drop() }],
};
export default function Drop() { return <ArcadeGameShell config={config} />; }
