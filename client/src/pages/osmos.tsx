import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { OsmosEngine } from "@/game/osmos-engine";

const config: GameConfig = {
  gameId: "osmos",
  name: "Cirql Osmos",
  eyebrow: "Agar · absorb & grow",
  title: "Eat small, flee big",
  body: "You're a soft mote among others. Drift over the ones smaller than you to absorb them and grow — and keep clear of anything bigger, because it'll swallow you. See how large you can get.",
  overEyebrow: "Swallowed",
  overTitle: "Absorbed",
  accent: "#67e8f9", accent2: "#a78bfa",
  bg: "radial-gradient(120% 90% at 50% 8%, #081226 0%, #05040f 60%, #030208 100%)",
  lsKey: "cosmos_best",
  makeEngine: (canvas, hooks) => new OsmosEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Size", value: h.size, color: "#67e8f9" }],
  endChips: (r) => [{ label: "Size", value: r.size, color: "#67e8f9" }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.size, bestCombo: r.size }),
};
export default function Osmos() { return <ArcadeGameShell config={config} />; }
