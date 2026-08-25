// Cirql Coil — engine (CirqlCade). Zuma, wound into a spiral. A chain of coloured
// marbles snakes inward toward the core; you sit at the centre, aim, and fire
// marbles into the line. Land three-plus of a colour together and they burst. Let
// the chain reach the core and it's over.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface CoilHud { score: number; danger: number; current: string; next: string; }
export interface CoilResult { score: number; best: number; }
export interface CoilOpts extends ArcadeOpts { accent?: string; onHud?: (s: CoilHud) => void; onRunEnd?: (r: CoilResult) => void; }

type Flow = "menu" | "playing" | "over";
const COLORS = ["#f472b6", "#38bdf8", "#34d399", "#fbbf24"];
const DTHETA = 0.42;      // angular spacing between marbles
interface Ball { x: number; y: number; vx: number; vy: number; color: number; }

export class CoilEngine extends ArcadeEngine {
  private opts: CoilOpts;
  private accent = "#38bdf8";
  private flow: Flow = "menu";
  private score = 0; private best = +(LS.get("ccoil_best") || 0);
  private chain: number[] = []; private leadTheta = 0; private speed = 0.5;
  private aim = -Math.PI / 2; private current = 0; private next = 1; private ball: Ball | null = null;
  private maxTheta = 1; private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: CoilOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.computeGeom(); this.emitHud(); }
  private computeGeom() { this.maxTheta = (this.rimR * 0.86 - this.rimR * 0.12) / (this.rimR * 0.86 / 7); } // ~7 inward turns
  protected onResize() { this.computeGeom(); }
  private shrink() { return (this.rimR * 0.74) / this.maxTheta; }
  private point(theta: number) { const r = Math.max(this.rimR * 0.12, this.rimR * 0.86 - theta * this.shrink()); return { x: this.cx + Math.cos(theta) * r, y: this.cy + Math.sin(theta) * r, r }; }
  private thetaOf(i: number) { return this.leadTheta - i * DTHETA; }

  start() { this.flow = "playing"; this.score = 0; this.leadTheta = 0; this.speed = 0.5; this.chain = []; this.ball = null; this.aim = -Math.PI / 2; this.current = this.rand(); this.next = this.rand(); for (let i = 0; i < 10; i++) this.chain.push(this.rand()); this.leadTheta = 10 * DTHETA; this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.chain = []; this.ball = null; this.clearFx(); }
  private rand() { return Math.floor(Math.random() * COLORS.length); }
  aimTo(a: number) { this.aim = a; }
  shoot() { if (this.flow !== "playing" || this.ball) return; const sp = this.rimR * 2.0; this.ball = { x: this.cx + Math.cos(this.aim) * this.rimR * 0.12, y: this.cy + Math.sin(this.aim) * this.rimR * 0.12, vx: Math.cos(this.aim) * sp, vy: Math.sin(this.aim) * sp, color: this.current }; this.current = this.next; this.next = this.rand(); this.tone(430, 0.05, "sawtooth", 0.03); this.emitHud(); }
  setCosmetic(c: string) { this.accent = c || "#38bdf8"; }
  peekBest() { return this.best; }

  protected onPointerDown(e: PointerEvent) { this.aim = this.pointerAngle(e); this.shoot(); }
  protected onKeyDown(e: KeyboardEvent) { if (e.key === " ") { e.preventDefault(); this.shoot(); } else if (e.key === "s") { const t = this.current; this.current = this.next; this.next = t; this.emitHud(); } }

  protected step(dt: number, _now: number) {
    if (this.flow !== "playing") return;
    // advance chain inward
    this.leadTheta += this.speed * dt; this.speed = Math.min(1.4, this.speed + dt * 0.01);
    // feed the tail so the chain keeps coming
    const tailTheta = this.thetaOf(this.chain.length - 1); if (tailTheta > DTHETA) this.chain.push(this.rand());
    // front reached the core?
    if (this.point(this.leadTheta).r <= this.rimR * 0.13) { this.gameOver(); return; }
    // ball flight + insertion
    if (this.ball) {
      const b = this.ball; b.x += b.vx * dt; b.y += b.vy * dt;
      let hit = -1, bd = this.rimR * 0.05;
      for (let i = 0; i < this.chain.length; i++) { const p = this.point(this.thetaOf(i)); const d = Math.hypot(p.x - b.x, p.y - b.y); if (d < bd) { bd = d; hit = i; } }
      if (hit >= 0) { this.insert(hit, b.color); this.ball = null; }
      else if (Math.hypot(b.x - this.cx, b.y - this.cy) > this.rimR * 0.95) this.ball = null;
    }
    this.emitHud();
  }
  private insert(after: number, color: number) {
    this.chain.splice(after + 1, 0, color); this.leadTheta += DTHETA; // the line lengthens outward
    // match run around the inserted index
    const at = after + 1; let lo = at, hi = at;
    while (lo - 1 >= 0 && this.chain[lo - 1] === color) lo--;
    while (hi + 1 < this.chain.length && this.chain[hi + 1] === color) hi++;
    const run = hi - lo + 1;
    if (run >= 3) { for (let i = lo; i <= hi; i++) { const p = this.point(this.thetaOf(i)); this.burst(p.x, p.y, COLORS[color], 8, this.rimR * 0.6); } this.chain.splice(lo, run); this.leadTheta -= run * DTHETA; this.score += run * 10; const f = 500 + Math.min(600, this.score); this.tone(f, 0.1, "triangle", 0.05); this.buzz(8); this.pop(this.cx, this.cy - this.rimR * 0.4, "+" + run * 10, "#34d399"); }
    else { this.tone(240, 0.05, "sine", 0.03); }
  }
  private gameOver() { this.flow = "over"; this.shake = 12; this.best = Math.max(this.best, this.score); LS.set("ccoil_best", String(this.best)); [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sine", 0.05), i * 120)); this.opts.onRunEnd?.({ score: this.score, best: this.best }); this.emitHud(); }

  private dangerFrac() { return Math.min(1, this.point(this.leadTheta).r <= this.rimR * 0.13 ? 1 : (this.rimR * 0.86 - this.point(this.leadTheta).r) / (this.rimR * 0.73)); }
  private emitHud() { if (!this.opts.onHud) return; const sig = [this.score, this.current, this.next, Math.round(this.dangerFrac() * 20)].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ score: this.score, danger: this.dangerFrac(), current: COLORS[this.current], next: COLORS[this.next] }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, `rgba(251,113,133,${0.04 + 0.1 * this.dangerFrac()})`); g.addColorStop(0.6, "rgba(56,189,248,.04)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    // spiral guide
    ctx.strokeStyle = "rgba(150,130,255,.08)"; ctx.lineWidth = 1; ctx.beginPath(); for (let th = 0; th < this.maxTheta; th += 0.1) { const p = this.point(th); if (th === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); } ctx.stroke();
    // core / sink
    ctx.save(); ctx.shadowBlur = 14; ctx.shadowColor = "#fb7185"; ctx.fillStyle = "rgba(251,113,133,.5)"; ctx.beginPath(); ctx.arc(cx, cy, rimR * 0.11, 0, TAU); ctx.fill(); ctx.restore();
    // marbles
    for (let i = 0; i < this.chain.length; i++) { const th = this.thetaOf(i); if (th < 0) continue; const p = this.point(th); const col = COLORS[this.chain[i]]; ctx.save(); ctx.shadowBlur = 8; ctx.shadowColor = col; const gg = ctx.createRadialGradient(p.x - 3, p.y - 3, 0, p.x, p.y, rimR * 0.035); gg.addColorStop(0, "#fff"); gg.addColorStop(0.5, col); gg.addColorStop(1, col); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(p.x, p.y, rimR * 0.032, 0, TAU); ctx.fill(); ctx.restore(); }
    // ball
    if (this.ball) { ctx.save(); ctx.shadowBlur = 12; ctx.shadowColor = COLORS[this.ball.color]; ctx.fillStyle = COLORS[this.ball.color]; ctx.beginPath(); ctx.arc(this.ball.x, this.ball.y, rimR * 0.03, 0, TAU); ctx.fill(); ctx.restore(); }
    // shooter
    const sr = rimR * 0.09; ctx.save(); ctx.shadowBlur = 12; ctx.shadowColor = COLORS[this.current]; ctx.fillStyle = COLORS[this.current]; ctx.beginPath(); ctx.arc(cx, cy, sr, 0, TAU); ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(this.aim) * sr * 1.8, cy + Math.sin(this.aim) * sr * 1.8); ctx.stroke(); ctx.restore();
    this.drawFx(now); void now;
  }
}
