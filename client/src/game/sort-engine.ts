// Cirql Sort — engine (CirqlCade). The ball-sort puzzle, tubes ringed around the
// disc. Tap a tube to lift its top ball, tap another to pour it — onto an empty tube
// or a matching colour. Sort every tube to a single colour to solve, then a harder
// board appears. Puzzles are scrambled from solved, so they're always solvable.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface SortHud { solved: number; time: number; best: number; }
export interface SortResult { solved: number; best: number; }
export interface SortOpts extends ArcadeOpts { accent?: string; onHud?: (s: SortHud) => void; onRunEnd?: (r: SortResult) => void; }

type Flow = "menu" | "playing" | "over";
const CAP = 4, RUN_TIME = 90;
const COLORS = ["#f472b6", "#38bdf8", "#34d399", "#fbbf24", "#a78bfa", "#fb7185"];

export class SortEngine extends ArcadeEngine {
  private opts: SortOpts;
  private accent = "#38bdf8";
  private flow: Flow = "menu";
  private tubes: number[][] = []; private sel = -1; private solved = 0; private level = 1; private timeLeft = RUN_TIME;
  private best = +(LS.get("csort_best") || 0); private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: SortOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }
  private get T() { return this.tubes.length; }
  private tubeAngle(i: number) { return (i / this.T) * TAU - Math.PI / 2; }
  private tubeR() { return this.rimR * 0.62; }

  start() { this.flow = "playing"; this.solved = 0; this.level = 1; this.timeLeft = RUN_TIME; this.sel = -1; this.build(); this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.clearFx(); }
  private build() {
    const k = Math.min(COLORS.length, 3 + this.level); // colours = tubes-2
    // shuffle a flat pool of k colours × CAP, deal into k tubes, keep 2 empty as
    // workspace (the standard casual ball-sort setup — reliably solvable).
    const pool: number[] = []; for (let c = 0; c < k; c++) for (let n = 0; n < CAP; n++) pool.push(c);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    this.tubes = []; for (let c = 0; c < k; c++) this.tubes.push(pool.slice(c * CAP, c * CAP + CAP)); this.tubes.push([], []);
    this.sel = -1;
  }
  private isDone(t: number[]) { return t.length === 0 || (t.length === CAP && t.every((c) => c === t[0])); }
  private allSolved() { return this.tubes.every((t) => this.isDone(t)); }
  peekBest() { return this.best; }

  protected onPointerDown(e: PointerEvent) {
    if (this.flow !== "playing") return; const p = this.pointerPos(e);
    let best = -1, bd = this.rimR * 0.16; for (let i = 0; i < this.T; i++) { const a = this.tubeAngle(i); const x = this.cx + Math.cos(a) * this.tubeR(), y = this.cy + Math.sin(a) * this.tubeR(); const d = Math.hypot(x - p.x, y - p.y); if (d < bd) { bd = d; best = i; } }
    if (best < 0) return;
    if (this.sel < 0) { if (this.tubes[best].length) { this.sel = best; this.tone(340, 0.04, "sine", 0.03); } return; }
    if (this.sel === best) { this.sel = -1; return; }
    const from = this.tubes[this.sel], to = this.tubes[best];
    if (from.length && to.length < CAP && (to.length === 0 || to[to.length - 1] === from[from.length - 1])) {
      to.push(from.pop()!); this.tone(440, 0.06, "triangle", 0.04); this.buzz(4);
      const a = this.tubeAngle(best); this.burst(this.cx + Math.cos(a) * this.tubeR(), this.cy + Math.sin(a) * this.tubeR(), COLORS[to[to.length - 1]], 5, this.rimR * 0.4);
      if (this.allSolved()) { this.solved++; this.level++; this.tone(920, 0.2, "sine", 0.05); this.buzz([8, 16]); this.pop(this.cx, this.cy, "SORTED", "#34d399"); this.build(); }
      this.sel = -1;
    } else { this.sel = this.tubes[best].length ? best : -1; }
    this.emitHud();
  }

  protected step(dt: number, _now: number) { if (this.flow !== "playing") return; this.timeLeft -= dt; if (this.timeLeft <= 0) { this.timeLeft = 0; this.gameOver(); } this.emitHud(); }
  private gameOver() { this.flow = "over"; this.best = Math.max(this.best, this.solved); LS.set("csort_best", String(this.best)); [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sine", 0.05), i * 120)); this.opts.onRunEnd?.({ solved: this.solved, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const sig = [this.solved, Math.ceil(this.timeLeft)].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ solved: this.solved, time: Math.ceil(this.timeLeft), best: this.best }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(56,189,248,.05)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    const br = rimR * 0.035, gap = br * 2.1;
    for (let i = 0; i < this.T; i++) {
      const a = this.tubeAngle(i); const baseR = this.tubeR() - (CAP / 2) * gap; const sel = this.sel === i;
      // tube outline
      const ux = Math.cos(a), uy = Math.sin(a);
      ctx.save(); ctx.strokeStyle = sel ? this.accent : "rgba(150,130,255,.25)"; ctx.lineWidth = sel ? 2.5 : 1.5; ctx.beginPath();
      const x0 = cx + ux * (baseR - br), y0 = cy + uy * (baseR - br), x1 = cx + ux * (baseR + CAP * gap - br), y1 = cy + uy * (baseR + CAP * gap - br);
      ctx.moveTo(x0 - uy * br * 1.3, y0 + ux * br * 1.3); ctx.lineTo(x0 + uy * br * 1.3, y0 - ux * br * 1.3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0 - uy * br * 1.3, y0 + ux * br * 1.3); ctx.lineTo(x1 - uy * br * 1.3, y1 + ux * br * 1.3); ctx.moveTo(x0 + uy * br * 1.3, y0 - ux * br * 1.3); ctx.lineTo(x1 + uy * br * 1.3, y1 - ux * br * 1.3); ctx.stroke(); ctx.restore();
      for (let b = 0; b < this.tubes[i].length; b++) { const rr = baseR + b * gap; const x = cx + ux * rr, y = cy + uy * rr; const col = COLORS[this.tubes[i][b]]; ctx.save(); ctx.shadowBlur = 8; ctx.shadowColor = col; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, br, 0, TAU); ctx.fill(); ctx.restore(); }
    }
    this.drawFx(now); void now;
  }
}
