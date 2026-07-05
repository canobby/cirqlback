// Cirql Claim — engine (CirqlArcade). Qix, in wedges. Aim the cursor around the rim
// and claim wedges of the disc — but a spark bounces through the open interior, and
// claiming the wedge it's in costs you. Lock down enough of the disc to advance.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface ClaimHud { pct: number; level: number; lives: number; }
export interface ClaimResult { score: number; level: number; best: number; }
export interface ClaimOpts extends ArcadeOpts { accent?: string; onHud?: (s: ClaimHud) => void; onRunEnd?: (r: ClaimResult) => void; }

type Flow = "menu" | "playing" | "over";
const SEG = 24, SEG_A = TAU / 24, TARGET = 0.8;

export class ClaimEngine extends ArcadeEngine {
  private opts: ClaimOpts;
  private accent = "#38bdf8";
  private flow: Flow = "menu";
  private claimed: boolean[] = []; private score = 0; private level = 1; private lives = 3;
  private best = +(LS.get("cclaim_best") || 0);
  private cursor = -Math.PI / 2;
  private ex = 0; private ey = 0; private evx = 0; private evy = 0; private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: ClaimOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }
  private discR() { return this.rimR * 0.9; }

  start() { this.flow = "playing"; this.score = 0; this.level = 1; this.lives = 3; this.newLevel(); this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.clearFx(); }
  private newLevel() { this.claimed = new Array(SEG).fill(false); const a = Math.random() * TAU, sp = this.rimR * (0.7 + this.level * 0.08); this.ex = this.cx + Math.cos(a) * this.discR() * 0.3; this.ey = this.cy + Math.sin(a) * this.discR() * 0.3; this.evx = Math.cos(a + 1) * sp; this.evy = Math.sin(a + 1) * sp; }
  aim(a: number) { this.cursor = a; }
  claim() {
    if (this.flow !== "playing") return;
    const seg = (Math.round(this.cursor / SEG_A) % SEG + SEG) % SEG;
    if (this.claimed[seg]) return;
    const ea = Math.atan2(this.ey - this.cy, this.ex - this.cx); const eseg = (Math.round(ea / SEG_A) % SEG + SEG) % SEG;
    if (eseg === seg) { this.hitByEnemy(seg); return; } // the spark is right there
    this.claimed[seg] = true; this.score += 10;
    const a = seg * SEG_A; this.burst(this.cx + Math.cos(a) * this.discR() * 0.7, this.cy + Math.sin(a) * this.discR() * 0.7, this.accent, 8, this.rimR * 0.6); this.tone(440 + this.score, 0.07, "triangle", 0.04); this.buzz(5);
    if (this.frac() >= TARGET) { this.level++; this.score += 50; this.tone(880, 0.25, "sine", 0.05); this.shock(this.cx, this.cy, this.accent, this.discR()); this.pop(this.cx, this.cy, "SECURED", "#34d399"); this.newLevel(); }
    this.emitHud();
  }
  private frac() { return this.claimed.filter(Boolean).length / SEG; }
  private hitByEnemy(seg: number) { this.lives--; this.shake = 12; this.tone(120, 0.3, "sawtooth", 0.05); this.buzz([30, 50]); const a = seg * SEG_A; this.burst(this.cx + Math.cos(a) * this.discR() * 0.6, this.cy + Math.sin(a) * this.discR() * 0.6, "#fb7185", 16, this.rimR * 0.8); if (this.lives <= 0) this.gameOver(); this.emitHud(); }
  peekBest() { return this.best; }

  protected onPointerDown(e: PointerEvent) { this.cursor = this.pointerAngle(e); this.claim(); }
  protected onKeyDown(e: KeyboardEvent) { if (e.key === "ArrowLeft") this.cursor -= 0.2; else if (e.key === "ArrowRight") this.cursor += 0.2; else if (e.key === " ") { e.preventDefault(); this.claim(); } }

  protected step(dt: number, _now: number) {
    if (this.flow !== "playing") return;
    this.ex += this.evx * dt; this.ey += this.evy * dt;
    const dx = this.ex - this.cx, dy = this.ey - this.cy, d = Math.hypot(dx, dy) || 1;
    // bounce off the disc edge, and off claimed wedges (kept out of locked territory)
    const seg = (Math.round(Math.atan2(dy, dx) / SEG_A) % SEG + SEG) % SEG;
    if (d > this.discR() - 6 || this.claimed[seg]) { const ux = dx / d, uy = dy / d; const dot = this.evx * ux + this.evy * uy; this.evx -= 2 * dot * ux; this.evy -= 2 * dot * uy; const pull = this.claimed[seg] ? this.discR() * 0.6 : this.discR() - 8; this.ex = this.cx + ux * Math.min(d, pull); this.ey = this.cy + uy * Math.min(d, pull); }
    this.emitHud();
  }
  private gameOver() { this.flow = "over"; this.best = Math.max(this.best, this.score); LS.set("cclaim_best", String(this.best)); [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sine", 0.05), i * 120)); this.opts.onRunEnd?.({ score: this.score, level: this.level, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const pct = Math.round(this.frac() * 100); const sig = [pct, this.level, this.lives].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ pct, level: this.level, lives: this.lives }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this; const R = this.discR();
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(56,189,248,.05)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    // claimed wedges
    for (let s = 0; s < SEG; s++) { if (!this.claimed[s]) continue; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, s * SEG_A - SEG_A / 2, s * SEG_A + SEG_A / 2); ctx.closePath(); ctx.fillStyle = "rgba(56,189,248,.28)"; ctx.fill(); ctx.strokeStyle = "rgba(56,189,248,.5)"; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.strokeStyle = "rgba(150,130,255,.25)"; ctx.lineWidth = 2; ctx.stroke();
    // enemy spark
    ctx.save(); ctx.shadowBlur = 16; ctx.shadowColor = "#fb7185"; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(this.ex, this.ey, rimR * 0.028, 0, TAU); ctx.fill(); ctx.strokeStyle = "#fb7185"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(this.ex, this.ey, rimR * 0.042, 0, TAU); ctx.stroke(); ctx.restore();
    // cursor on the rim
    const cxp = cx + Math.cos(this.cursor) * R, cyp = cy + Math.sin(this.cursor) * R;
    ctx.save(); ctx.shadowBlur = 14; ctx.shadowColor = this.accent; ctx.strokeStyle = this.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R, this.cursor - SEG_A / 2, this.cursor + SEG_A / 2); ctx.stroke(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cxp, cyp, rimR * 0.02, 0, TAU); ctx.fill(); ctx.restore();
    this.drawFx(now); void now;
  }
}
