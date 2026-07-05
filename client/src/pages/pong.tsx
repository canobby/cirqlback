import ArcadeGameShell, { type GameConfig } from "./arcade-shell";
import { PongEngine } from "@/game/pong-engine";

const config: GameConfig = {
  gameId: "pong",
  name: "Cirql Pong",
  eyebrow: "Pong · round the ring",
  title: "Return the volley",
  body: "Guard the bottom half with your paddle; the AI holds the top. Bat the ball back and slip it past the AI to score. Miss on your side and you lose a life. It speeds up.",
  overEyebrow: "You whiffed it",
  overTitle: "Game, AI",
  accent: "#67e8f9", accent2: "#a78bfa",
  bg: "radial-gradient(120% 90% at 50% 8%, #06202a 0%, #05040f 60%, #030208 100%)",
  lsKey: "cpong_best",
  makeEngine: (canvas, hooks) => new PongEngine(canvas, hooks),
  hudChips: (h) => [{ label: "Lives", value: "♥".repeat(Math.max(0, h.lives)), color: "#fb7185" }, { label: "Points", value: h.score }],
  endChips: (r) => [{ label: "Points", value: r.score, color: "#67e8f9" }, { label: "Best", value: r.best, color: "#fbbf24" }],
  bestFrom: (r) => r.best,
  toDaily: (r) => ({ score: r.score, bestCombo: r.score }),
  dial: (eng) => (a) => eng.aimYou(a),
  online: { href: "/play/pong/online" },
};
export default function Pong() { return <ArcadeGameShell config={config} />; }
