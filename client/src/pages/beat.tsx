import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { BeatEngine } from "@/game/beat-engine";

const config: GameConfig = {
  gameId: "beat",
  name: "Cirql Beat",
  eyebrow: "Rhythm · on a ring",
  title: "Tap the pulse",
  body: "Notes ride inward from the rim. Tap the instant one lands on the hit-ring. Chain perfect hits for combo and keep the groove meter up — the tempo climbs the longer you last.",
  overEyebrow: "Lost the groove",
  overTitle: "Off-beat",
  accent: "#ec4899", accent2: "#a78bfa",
  bg: "radial-gradient(120% 90% at 50% 8%, #26082a 0%, #05040f 60%, #030208 100%)",
  lsKey: "cbeat_best",
  makeEngine: (canvas, hooks) => new BeatEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Combo", value: `×${h.combo}`, color: "#f9a8d4" }, { label: "Score", value: h.score }],
  endChips: (r) => [{ label: "Score", value: r.score, color: "#f9a8d4" }, { label: "Combo", value: `×${r.comboMax}`, color: "#a78bfa" }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.score, bestCombo: r.comboMax }),
  progress: (h) => (h ? { label: "Groove", right: `${Math.round(h.health * 100)}%`, pct: h.health } : null),
};
export default function Beat() { return <ArcadeGameShell config={config} />; }
