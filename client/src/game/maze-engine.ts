// Cirql Maze — engine (CirqlArcade). Rotate concentric rings to line their gaps up
// with the orb and let it fall inward, ring by ring, to the centre. Solve a maze
// and a bigger one takes its place. Beat the clock — how many can you crack?

import { ArcadeEngine, type ArcadeOpts, TAU, angDiff, LS } from "./arcade-core";

export interface MazeHud { solved: number; best: number; time: number; }
export interface MazeResult { solved: number; best: number; }
export interface MazeOpts extends ArcadeOpts { accent?: string; onHud?: (s: MazeHud) => void; onRunEnd?: (r: MazeResult) => void; }

type Flow = "menu" | "playing" | "over";
const TOP = -Math.PI / 2;
const GAP = 0.5; // gap half-width (rad)
const RUN_TIME = 45;

export class MazeEngine extends ArcadeEngine {
  private opts: MazeOpts;
  private accent = "#a78bfa";
  private flow: Flow = "menu";
  private solved = 0; private best = +(LS.get("cmaze_best") || 0);
  private gaps: number[] = []; private current = 0; private timeLeft = RUN_TIME;
  private dropAt = 0; private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: MazeOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }
  private rings() { return 3 + this.solved; }
  private ringR(i: number) { const R = this.rings(); return this.rimR * (0.28 + 0.62 * (i / Math.max(1, R - 1))); }

  start() { this.flow = "playing"; this.solved = 0; this.timeLeft = RUN_TIME; this.newMaze(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.gaps = []; this.clearFx(); }
  private newMaze() { const R = this.rings(); this.gaps = Array.from({ length: R }, () => Math.random() * TAU); this.current = R - 1; this.dropAt = 0; }
  rotateActive(a: number) { if (this.flow === "playing" && this.current >= 0) this.gaps[this.current] = a; }
  peekBest() { return this.best; }

  protected step(dt: number, now: number) {
    if (this.flow !== "playing") return;
    this.timeLeft -= dt; if (this.timeLeft <= 0) { this.timeLeft = 0; this.gameOver(); return; }
    if (this.current >= 0 && angDiff(this.gaps[this.current], TOP) < GAP * 0.6) {
      if (!this.dropAt) this.dropAt = now + 160;
      else if (now >= this.dropAt) { this.drop(); }
    } else this.dropAt = 0;
    this.emitHud();
  }
  private drop() {
    this.dropAt = 0; const R = this.ringR(this.current);
    this.tone(300 + (this.rings() - this.current) * 40, 0.09, "sine", 0.045); this.buzz(6);
    this.shock(this.cx + Math.cos(TOP) * R, this.cy + Math.sin(TOP) * R, this.accent, this.rimR * 0.14);
    this.current--;
    if (this.current < 0) { this.solved++; this.tone(880, 0.25, "sine", 0.05); this.buzz([10, 20, 10]); this.shock(this.cx, this.cy, "#34d399", this.rimR * 0.5); this.pop(this.cx, this.cy, "SOLVED", "#34d399"); this.newMaze(); }
  }
  private gameOver() { this.flow = "over"; this.best = Math.max(this.best, this.solved); LS.set("cmaze_best", String(this.best)); [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sine", 0.05), i * 120)); this.opts.onRunEnd?.({ solved: this.solved, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const sig = [this.solved, Math.ceil(this.timeLeft)].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ solved: this.solved, best: this.best, time: Math.ceil(this.timeLeft) }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(167,139,250,.08)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    // centre goal
    ctx.save(); ctx.shadowBlur = 18; ctx.shadowColor = "#34d399"; ctx.fillStyle = "rgba(52,211,153,.8)"; ctx.beginPath(); ctx.arc(cx, cy, rimR * 0.1, 0, TAU); ctx.fill(); ctx.restore();
    const R = this.rings();
    for (let i = 0; i < R; i++) {
      const rr = this.ringR(i), gap = this.gaps[i], active = i === this.current;
      ctx.save(); ctx.shadowBlur = active ? 16 : 4; ctx.shadowColor = active ? this.accent : "#6d6a9c";
      ctx.strokeStyle = active ? this.accent : (i < this.current ? "rgba(120,110,170,.5)" : "rgba(120,110,170,.22)"); ctx.lineWidth = rimR * 0.035; ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(cx, cy, rr, gap + GAP, gap - GAP + TAU); ctx.stroke(); ctx.restore();
    }
    // orb at top, on the current ring's outer edge (or centre when solving)
    const orbR = this.current >= 0 ? this.ringR(this.current) + rimR * 0.05 : rimR * 0.1;
    ctx.save(); ctx.shadowBlur = 16; ctx.shadowColor = "#fff"; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx + Math.cos(TOP) * orbR, cy + Math.sin(TOP) * orbR, rimR * 0.03, 0, TAU); ctx.fill(); ctx.restore();
    this.drawFx(now); void now;
  }
}
