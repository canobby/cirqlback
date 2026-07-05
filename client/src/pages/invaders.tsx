import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { InvadersEngine } from "@/game/invaders-engine";

const config: GameConfig = {
  gameId: "invaders",
  name: "Cirql Invaders",
  eyebrow: "Space Invaders · radial",
  title: "Hold the centre",
  body: "The formation spirals inward. Rotate your cannon and fire outward to clear each wave before they reach you. They come faster every time.",
  overEyebrow: "The centre fell",
  overTitle: "Overrun",
  accent: "#34d399", accent2: "#a78bfa",
  bg: "radial-gradient(120% 90% at 50% 8%, #0a2118 0%, #05040f 60%, #030208 100%)",
  lsKey: "cinvaders_best",
  makeEngine: (canvas, hooks) => new InvadersEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Wave", value: h.wave, color: "#a78bfa" }, { label: "Score", value: h.score }],
  endChips: (r) => [{ label: "Score", value: r.score }, { label: "Wave", value: r.wave, color: "#a78bfa" }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.score, bestCombo: r.wave }),
  dial: (eng) => (a) => eng.aimTo(a),
  controls: (eng) => [{ testid: "button-fire", label: "FIRE", node: "◎", color: "#34d399", onPress: () => eng.fire(), hold: true }],
  perks: { apply: (eng, ids) => eng.setPerks(ids) },
};
export default function Invaders() { return <ArcadeGameShell config={config} />; }
