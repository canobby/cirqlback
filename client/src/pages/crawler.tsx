import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { CrawlerEngine } from "@/game/crawler-engine";

const config: GameConfig = {
  gameId: "crawler",
  name: "Cirql Crawler",
  eyebrow: "Centipede · down the rings",
  title: "Split the crawler",
  body: "A segmented crawler winds around the rings and steps inward each lap. Rotate your cannon and fire outward — hit a middle segment and it splits in two. Clear them before they reach the centre.",
  overEyebrow: "It reached you",
  overTitle: "Swarmed",
  accent: "#34d399", accent2: "#38bdf8",
  bg: "radial-gradient(120% 90% at 50% 8%, #06231a 0%, #05040f 60%, #030208 100%)",
  lsKey: "ccrawler_best",
  makeEngine: (canvas, hooks) => new CrawlerEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Lives", value: "♥".repeat(Math.max(0, h.lives)), color: "#fb7185" }, { label: "Wave", value: h.wave, color: "#6ee7b7" }, { label: "Score", value: h.score }],
  endChips: (r) => [{ label: "Score", value: r.score, color: "#34d399" }, { label: "Wave", value: r.wave }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.score, bestCombo: r.wave }),
  dial: (eng) => (a) => eng.aimTo(a),
  controls: (eng) => [{ testid: "button-fire", label: "FIRE", node: "◎", color: "#34d399", onPress: () => eng.fire() }],
};
export default function Crawler() { return <ArcadeGameShell config={config} />; }
