import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { TunnelEngine } from "@/game/tunnel-engine";

const config: GameConfig = {
  gameId: "tunnel",
  name: "Cirql Tunnel",
  eyebrow: "Tempest · down the well",
  title: "Shoot down the lanes",
  body: "Enemies climb the lanes toward the rim where your ship sits. Slide around and fire inward to shoot them down before they surface. Three lives.",
  overEyebrow: "They surfaced",
  overTitle: "Breached",
  accent: "#38bdf8", accent2: "#a78bfa",
  bg: "radial-gradient(120% 90% at 50% 8%, #081226 0%, #05040f 60%, #030208 100%)",
  lsKey: "ctunnel_best",
  makeEngine: (canvas, hooks) => new TunnelEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Lives", value: "♥".repeat(Math.max(0, h.lives)), color: "#fb7185" }, { label: "Score", value: h.score }],
  endChips: (r) => [{ label: "Score", value: r.score, color: "#38bdf8" }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.score, bestCombo: r.score }),
  dial: (eng) => (a) => eng.laneFromAngle(a),
  controls: (eng) => [{ testid: "button-fire", label: "FIRE", node: "▾", color: "#38bdf8", onPress: () => eng.fire(), hold: true }],
};
export default function Tunnel() { return <ArcadeGameShell config={config} />; }
