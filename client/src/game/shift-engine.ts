// Cirql Shift — engine (CirqlArcade). Color Switch, on an orbit. A ball circles
// the ring; coloured gates block its path. Tap to cycle your colour so it matches
// the next gate before you reach it. Pass to score; a mismatch ends the run. Ramps
// up fast.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface ShiftHud { score: number; best: number; color: string; }
export interface ShiftResult { score: number; best: number; }
export interface ShiftOpts extends ArcadeOpts { accent?: string; onHud?: (s: ShiftHud) => void; onRunEnd?: (r: ShiftResult) => void; }

type Flow = "menu" | "playing" | "over";
const COLORS = ["#f472b6", "#38bdf8", "#34d399", "#fbbf24"];
interface Gate { angle: number; color: number; passed: boolean; }

export class ShiftEngine extends ArcadeEngine {
  private opts: ShiftOpts;
  private accent = "#34d399";
  private flow: Flow = "menu";
  private score = 0; private best = +(LS.get("cshift_best") || 0);
  private ballA = -Math.PI / 2; private speed = 1.2; private colorIdx = 0;
  private gates: Gate[] = []; private nextGateAt = 0; private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: ShiftOpts = {}) { super(canvas, opts); this.opts = opts; if (opts.accent) this.accent = opts.accent; this.emitHud(); }

  private ballR() { return this.rimR * 0.7; }
  start() {
    this.flow = "playing"; this.score = 0; this.speed = 1.2; this.ballA = -Math.PI / 2; this.colorIdx = 0;
    this.gates = []; this.clearFx();
    // seed a few gates ahead (clockwise, at increasing angles)
    for (let i = 0; i < 4; i++) this.gates.push({ angle: this.ballA + 1.2 + i * 1.4, color: Math.floor(Math.random() * COLORS.length), passed: false });
    this.emitHud();
  }
  toMenu() { this.flow = "menu"; this.gates = []; this.clearFx(); }
  cycleColor() { if (this.flow !== "playing") return; this.colorIdx = (this.colorIdx + 1) % COLORS.length; this.tone(300 + this.colorIdx * 60, 0.05, "sine", 0.04); this.buzz(6); this.emitHud(); }
  peekBest() { return this.best; }

  protected onPointerDown() { this.cycleColor(); }
  protected onKeyDown(e: KeyboardEvent) { if (e.key === " ") { e.preventDefault(); this.cycleColor(); } }

  protected step(dt: number, _now: number) {
    if (this.flow !== "playing") return;
    this.ballA += this.speed * dt;
    // ballA and gate angles grow monotonically in the same frame → a plain compare
    // detects crossings; no wrap math needed.
    for (const g of this.gates) {
      if (g.passed || this.ballA < g.angle) continue;
      g.passed = true;
      if (g.color === this.colorIdx) {
        this.score++; this.speed = Math.min(3.6, this.speed + 0.04);
        const bx = this.cx + Math.cos(g.angle) * this.ballR(), by = this.cy + Math.sin(g.angle) * this.ballR();
        this.burst(bx, by, COLORS[g.color], 10, this.rimR * 0.8); this.tone(440 + this.score * 6, 0.09, "triangle", 0.045); this.buzz(6);
      } else { this.gameOver(); return; }
    }
    this.gates = this.gates.filter((g) => !(g.passed && this.ballA - g.angle > 1.2));
    const lastAhead = this.gates.reduce((m, g) => Math.max(m, g.angle), this.ballA);
    if (this.gates.filter((g) => !g.passed).length < 4) this.gates.push({ angle: lastAhead + 1.2 + Math.random() * 0.6, color: Math.floor(Math.random() * COLORS.length), passed: false });
    this.emitHud();
  }

  private gameOver() {
    this.flow = "over"; this.shake = 12; this.best = Math.max(this.best, this.score); LS.set("cshift_best", String(this.best));
    const bx = this.cx + Math.cos(this.ballA) * this.ballR(), by = this.cy + Math.sin(this.ballA) * this.ballR();
    this.burst(bx, by, "#fb7185", 22, this.rimR); [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.5, "sawtooth", 0.05), i * 120)); this.buzz([40, 60, 40]);
    this.opts.onRunEnd?.({ score: this.score, best: this.best }); this.emitHud();
  }

  private emitHud() { if (!this.opts.onHud) return; const sig = [this.score, this.colorIdx].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ score: this.score, best: this.best, color: COLORS[this.colorIdx] }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this; const R = this.ballR();
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(124,58,237,.08)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    // orbit track
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.strokeStyle = "rgba(150,130,255,.12)"; ctx.lineWidth = 2; ctx.stroke();
    // gates
    for (const g2 of this.gates) { if (g2.passed) continue; ctx.save(); ctx.shadowBlur = 14; ctx.shadowColor = COLORS[g2.color]; ctx.strokeStyle = COLORS[g2.color]; ctx.lineWidth = rimR * 0.06; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(cx, cy, R, g2.angle - 0.16, g2.angle + 0.16); ctx.stroke(); ctx.restore(); }
    // ball
    const bx = cx + Math.cos(this.ballA) * R, by = cy + Math.sin(this.ballA) * R;
    ctx.save(); ctx.shadowBlur = 18; ctx.shadowColor = COLORS[this.colorIdx]; const bg = ctx.createRadialGradient(bx, by, 0, bx, by, rimR * 0.05); bg.addColorStop(0, "#fff"); bg.addColorStop(0.5, COLORS[this.colorIdx]); bg.addColorStop(1, COLORS[this.colorIdx]); ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(bx, by, rimR * 0.045, 0, TAU); ctx.fill(); ctx.restore();
    // core
    ctx.fillStyle = "rgba(196,181,253,.5)"; ctx.beginPath(); ctx.arc(cx, cy, rimR * 0.05, 0, TAU); ctx.fill();
    if (this.flow === "playing") { ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = "600 12px system-ui"; ctx.textAlign = "center"; ctx.fillText("tap to change colour", cx, cy + rimR * 0.98); }
    this.drawFx(now); void now;
  }
}
