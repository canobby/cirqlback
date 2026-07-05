// Cirql Drop — engine (CirqlCade). Plinko, falling toward the centre. Aim the drop
// point on the rim and release; the ball tumbles inward off the pegs and settles in
// one of the scoring wedges — the tighter to the middle, the more it's worth. You
// get a handful of balls; make them count.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface DropHud { score: number; balls: number; best: number; }
export interface DropResult { score: number; best: number; }
export interface DropOpts extends ArcadeOpts { accent?: string; onHud?: (s: DropHud) => void; onRunEnd?: (r: DropResult) => void; }

type Flow = "menu" | "playing" | "over";
const BALLS = 8, WEDGES = 8;
const WEDGE_VAL = [50, 10, 20, 5, 100, 5, 20, 10]; // by wedge index (100 opposite the 50 for variety)

export class DropEngine extends ArcadeEngine {
  private opts: DropOpts;
  private accent = "#a78bfa";
  private flow: Flow = "menu";
  private score = 0; private ballsLeft = BALLS; private best = +(LS.get("cdrop_best") || 0);
  private cursor = -Math.PI / 2; private pegs: { x: number; y: number }[] = [];
  private ball: { x: number; y: number; vx: number; vy: number } | null = null; private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: DropOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.build(); this.emitHud(); }
  private slotR() { return this.rimR * 0.2; }
  private build() { this.pegs = []; const rings = 4; for (let ri = 0; ri < rings; ri++) { const rad = this.rimR * (0.34 + ri * 0.16); const n = 6 + ri * 2; const off = (ri % 2) * (Math.PI / n); for (let i = 0; i < n; i++) { const a = (i / n) * TAU + off; this.pegs.push({ x: this.cx + Math.cos(a) * rad, y: this.cy + Math.sin(a) * rad }); } } }
  protected onResize() { this.build(); }

  start() { this.flow = "playing"; this.score = 0; this.ballsLeft = BALLS; this.ball = null; this.build(); this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.ball = null; this.clearFx(); }
  aim(a: number) { this.cursor = a; }
  drop() { if (this.flow !== "playing" || this.ball || this.ballsLeft <= 0) return; const r = this.rimR * 0.94; this.ball = { x: this.cx + Math.cos(this.cursor) * r, y: this.cy + Math.sin(this.cursor) * r, vx: 0, vy: 0 }; this.tone(400, 0.05, "sine", 0.04); }
  setCosmetic(c: string) { this.accent = c || "#a78bfa"; }
  peekBest() { return this.best; }

  protected onPointerDown(e: PointerEvent) { this.cursor = this.pointerAngle(e); this.drop(); }

  protected step(dt: number, _now: number) {
    if (this.flow !== "playing" || !this.ball) return;
    const b = this.ball; const dx = this.cx - b.x, dy = this.cy - b.y, d = Math.hypot(dx, dy) || 1;
    // gravity toward centre
    b.vx += (dx / d) * this.rimR * 2.2 * dt; b.vy += (dy / d) * this.rimR * 2.2 * dt;
    b.vx *= 0.995; b.vy *= 0.995; b.x += b.vx * dt; b.y += b.vy * dt;
    for (const p of this.pegs) { const pdx = b.x - p.x, pdy = b.y - p.y, pd = Math.hypot(pdx, pdy) || 1; const min = this.rimR * 0.02 + 6; if (pd < min) { const ux = pdx / pd, uy = pdy / pd; const sp = Math.max(Math.hypot(b.vx, b.vy), this.rimR * 0.5); b.vx = ux * sp * 0.8 + (Math.random() - 0.5) * sp * 0.3; b.vy = uy * sp * 0.8 + (Math.random() - 0.5) * sp * 0.3; b.x = p.x + ux * (min + 1); b.y = p.y + uy * (min + 1); this.tone(500 + Math.random() * 200, 0.03, "sine", 0.025); } }
    if (Math.hypot(this.cx - b.x, this.cy - b.y) < this.slotR()) { this.land(); }
    if (Math.hypot(b.x - this.cx, b.y - this.cy) > this.rimR * 1.05) { this.ball = null; this.ballsLeft--; if (this.ballsLeft <= 0) this.gameOver(); } // escaped (rare)
    this.emitHud();
  }
  private land() {
    const b = this.ball!; const a = Math.atan2(b.y - this.cy, b.x - this.cx); const w = (Math.round((a + Math.PI / 2) / (TAU / WEDGES)) % WEDGES + WEDGES) % WEDGES;
    const val = WEDGE_VAL[w]; this.score += val; this.burst(b.x, b.y, this.accent, 12, this.rimR * 0.7); this.shock(this.cx, this.cy, this.accent, this.slotR()); this.pop(this.cx, this.cy, "+" + val, val >= 50 ? "#fbbf24" : "#67e8f9"); this.tone(660, 0.12, "triangle", 0.05); this.buzz(8);
    this.ball = null; this.ballsLeft--; if (this.ballsLeft <= 0) this.gameOver();
  }
  private gameOver() { this.flow = "over"; this.best = Math.max(this.best, this.score); LS.set("cdrop_best", String(this.best)); [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, "sine", 0.05), i * 100)); this.opts.onRunEnd?.({ score: this.score, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const sig = [this.score, this.ballsLeft].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ score: this.score, balls: this.ballsLeft, best: this.best }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(124,58,237,.06)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    // scoring wedges (centre)
    for (let w = 0; w < WEDGES; w++) { const a0 = w * (TAU / WEDGES) - Math.PI / 2 - (TAU / WEDGES) / 2, a1 = a0 + TAU / WEDGES; const val = WEDGE_VAL[w]; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, this.slotR(), a0, a1); ctx.closePath(); ctx.fillStyle = val >= 100 ? "rgba(251,191,36,.3)" : val >= 50 ? "rgba(167,139,250,.28)" : val >= 20 ? "rgba(56,189,248,.2)" : "rgba(120,110,170,.14)"; ctx.fill(); const ma = (a0 + a1) / 2; ctx.fillStyle = "#fff"; ctx.font = "bold 10px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(val), cx + Math.cos(ma) * this.slotR() * 0.6, cy + Math.sin(ma) * this.slotR() * 0.6); }
    // pegs
    for (const p of this.pegs) { ctx.fillStyle = "rgba(196,181,253,.5)"; ctx.beginPath(); ctx.arc(p.x, p.y, rimR * 0.012, 0, TAU); ctx.fill(); }
    // cursor
    if (!this.ball && this.flow === "playing") { const r = rimR * 0.94; const x = cx + Math.cos(this.cursor) * r, y = cy + Math.sin(this.cursor) * r; ctx.save(); ctx.shadowBlur = 12; ctx.shadowColor = this.accent; ctx.fillStyle = this.accent; ctx.beginPath(); ctx.arc(x, y, rimR * 0.024, 0, TAU); ctx.fill(); ctx.restore(); ctx.strokeStyle = "rgba(167,139,250,.25)"; ctx.setLineDash([3, 6]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(cx, cy); ctx.stroke(); ctx.setLineDash([]); }
    if (this.ball) { ctx.save(); ctx.shadowBlur = 14; ctx.shadowColor = "#fff"; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(this.ball.x, this.ball.y, rimR * 0.022, 0, TAU); ctx.fill(); ctx.restore(); }
    this.drawFx(now); void now;
  }
}
