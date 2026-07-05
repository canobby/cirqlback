import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { TapEngine } from "@/game/tap-engine";

const config: GameConfig = {
  gameId: "tap",
  name: "Cirql Tap",
  eyebrow: "osu! · on the ring",
  title: "Hit the beat-dots",
  body: "Targets bloom around the disc, each with a ring closing in. Tap right as the ring meets the dot for a perfect. Chain them for combo and keep the meter up — it speeds up the longer you last.",
  overEyebrow: "Lost the rhythm",
  overTitle: "Missed",
  accent: "#ec4899", accent2: "#38bdf8",
  bg: "radial-gradient(120% 90% at 50% 8%, #26082a 0%, #05040f 60%, #030208 100%)",
  lsKey: "ctap_best",
  makeEngine: (canvas, hooks) => new TapEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Combo", value: `×${h.combo}`, color: "#f9a8d4" }, { label: "Score", value: h.score }],
  endChips: (r) => [{ label: "Score", value: r.score, color: "#f9a8d4" }, { label: "Combo", value: `×${r.comboMax}`, color: "#a78bfa" }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.score, bestCombo: r.comboMax }),
  progress: (h) => (h ? { label: "Meter", right: `${Math.round(h.health * 100)}%`, pct: h.health } : null),
};
export default function CirqlTap() { return <ArcadeGameShell config={config} />; }
