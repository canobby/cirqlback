import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { CheckCircle } from "lucide-react";
import { ClaimEngine } from "@/game/claim-engine";

const config: GameConfig = {
  gameId: "claim",
  name: "Cirql Claim",
  eyebrow: "Qix · territory",
  title: "Lock down the disc",
  body: "Aim the cursor and claim wedges of the disc — but a spark bounces the open interior, and claiming its wedge costs a life. Secure 80% to advance.",
  overEyebrow: "The spark got you",
  overTitle: "Overrun",
  accent: "#38bdf8", accent2: "#34d399",
  bg: "radial-gradient(120% 90% at 50% 8%, #06202a 0%, #05040f 60%, #030208 100%)",
  lsKey: "cclaim_best",
  makeEngine: (canvas, hooks) => new ClaimEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Lives", value: "♥".repeat(Math.max(0, h.lives)), color: "#fb7185" }, { label: "Claimed", value: `${h.pct}%`, color: "#38bdf8" }],
  endChips: (r) => [{ label: "Score", value: r.score, color: "#38bdf8" }, { label: "Level", value: r.level, color: "#34d399" }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.score, bestCombo: r.level }),
  dial: (eng) => (a) => eng.aim(a),
  controls: (eng) => [{ testid: "button-claim", label: "CLAIM", node: <CheckCircle className="h-5 w-5" />, color: "#38bdf8", onPress: () => eng.claim() }],
};
export default function Claim() { return <ArcadeGameShell config={config} />; }
