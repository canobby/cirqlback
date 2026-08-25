import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { ReflexEngine } from "@/game/reflex-engine";

const config: GameConfig = {
  gameId: "reflex",
  name: "Cirql Reflex",
  eyebrow: "Reaction · quickdraw",
  title: "Tap on the flare",
  body: "The ring waits, then flares green — tap the instant it does. Jump the gun and it's a false start. Five rounds; the faster your average, the higher your score.",
  overEyebrow: "Five rounds done",
  overTitle: "Reaction time",
  accent: "#67e8f9", accent2: "#34d399",
  bg: "radial-gradient(120% 90% at 50% 8%, #06202a 0%, #05040f 60%, #030208 100%)",
  lsKey: "creflex_best",
  makeEngine: (canvas, hooks) => new ReflexEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Round", value: `${h.round}/5`, color: "#a5f3fc" }, ...(h.last ? [{ label: "Last", value: h.last === 999 ? "—" : `${h.last}ms` }] : [])],
  endChips: (r) => [{ label: "Avg", value: `${r.avg}ms`, color: "#67e8f9" }, { label: "Score", value: r.score }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.score, bestCombo: Math.max(0, 600 - r.avg) }),
  online: { href: "/play/reflex/online", label: "Duel online" },
};
export default function Reflex() { return <ArcadeGameShell config={config} />; }
