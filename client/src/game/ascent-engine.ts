// Cirql Ascent — engine (CirqlCade). Doodle Jump, climbing outward. The orb bounces
// by itself; steer it around the ring to land on the next platform and keep rising.
// The field scrolls inward as you climb — miss every platform and fall back to the
// centre and it's over.

import { ArcadeEngine, type ArcadeOpts, TAU, angDiff, LS } from "./arcade-core";

export interface AscentHud { score: number; best: number; }
export interface AscentResult { score: number; best: number; }
export interface AscentOpts extends ArcadeOpts { accent?: string; onHud?: (s: AscentHud) => void; onRunEnd?: (r: AscentResult) => void; }

type Flow = "menu" | "playing" | "over";
interface Plat { r: number; a: number; span: number; }

export class AscentEngine extends ArcadeEngine {
  private opts: AscentOpts;
  private accent = "#34d399";
  private flow: Flow = "menu";
  private score = 0; private best = +(LS.get("cascent_best") || 0);
  private a = -Math.PI / 2; private r = 0; private vr = 0; private prevR = 0;
  private plats: Plat[] = []; private dragging = false; private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: AscentOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }
  private floorR() { return this.rimR * 0.18; }
  private topR() { return this.rimR * 0.82; }
  private bounceV() { return this.rimR * 1.55; }

  start() { this.flow = "playing"; this.score = 0; this.a = -Math.PI / 2; this.r = this.rimR * 0.35; this.vr = this.bounceV(); this.prevR = this.r; this.plats = []; for (let i = 0; i < 7; i++) this.plats.push({ r: this.floorR() + i * (this.rimR * 0.11), a: Math.random() * TAU, span: 0.5 }); this.plats[0].a = this.a; this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.plats = []; this.clearFx(); }
  steer(a: number) { this.a = a; }
  setCosmetic(c: string) { this.accent = c || "#34d399"; }
  peekBest() { return this.best; }

  protected onPointerDown(e: PointerEvent) { this.dragging = true; this.a = this.pointerAngle(e); try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { /* ignore */ } }
  protected onPointerMove(e: PointerEvent) { if (this.dragging) this.a = this.pointerAngle(e); }
  protected onPointerUp() { this.dragging = false; }
  protected onKeyDown(e: KeyboardEvent) { if (e.key === "ArrowLeft") this.a -= 0.15; else if (e.key === "ArrowRight") this.a += 0.15; }

  protected step(dt: number, _now: number) {
    if (this.flow !== "playing") return;
    this.prevR = this.r; this.vr -= this.rimR * 2.6 * dt; this.r += this.vr * dt;
    // land on a platform when descending across it, within its arc
    if (this.vr < 0) { for (const p of this.plats) { if (this.prevR >= p.r && this.r <= p.r && angDiff(this.a, p.a) <= p.span / 2) { this.vr = this.bounceV(); this.r = p.r; this.burst(this.cx + Math.cos(this.a) * p.r, this.cy + Math.sin(this.a) * p.r, this.accent, 5, this.rimR * 0.4); this.tone(520, 0.05, "sine", 0.04); this.buzz(4); break; } } }
    // scroll inward when we climb past the top band
    if (this.r > this.topR()) { const delta = this.r - this.topR(); this.r -= delta; this.vr = this.vr; this.plats.forEach((p) => (p.r -= delta)); this.score += Math.round(delta); this.tone(700 + (this.score % 200), 0.02, "sine", 0.02); }
    this.plats = this.plats.filter((p) => p.r > this.floorR() * 0.4);
    while (this.plats.length < 7) { const maxR = this.plats.reduce((m, p) => Math.max(m, p.r), this.floorR()); this.plats.push({ r: maxR + this.rimR * 0.11, a: Math.random() * TAU, span: 0.5 }); }
    // fell out the bottom
    if (this.r < this.floorR() && this.vr < 0) this.gameOver();
    this.emitHud();
  }
  private gameOver() { this.flow = "over"; this.shake = 12; this.burst(this.cx + Math.cos(this.a) * this.r, this.cy + Math.sin(this.a) * this.r, "#fb7185", 20, this.rimR); [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sawtooth", 0.05), i * 120)); this.buzz([30, 50]); this.best = Math.max(this.best, this.score); LS.set("cascent_best", String(this.best)); this.opts.onRunEnd?.({ score: this.score, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const sig = String(this.score); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ score: this.score, best: this.best }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(52,211,153,.05)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    // floor
    ctx.beginPath(); ctx.arc(cx, cy, this.floorR(), 0, TAU); ctx.strokeStyle = "rgba(251,113,133,.25)"; ctx.lineWidth = 1.5; ctx.setLineDash([3, 6]); ctx.stroke(); ctx.setLineDash([]);
    for (const p of this.plats) { ctx.save(); ctx.shadowBlur = 8; ctx.shadowColor = this.accent; ctx.strokeStyle = this.accent; ctx.lineWidth = rimR * 0.03; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(cx, cy, p.r, p.a - p.span / 2, p.a + p.span / 2); ctx.stroke(); ctx.restore(); }
    // orb
    const x = cx + Math.cos(this.a) * this.r, y = cy + Math.sin(this.a) * this.r;
    ctx.save(); ctx.shadowBlur = 16; ctx.shadowColor = "#fff"; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, rimR * 0.03, 0, TAU); ctx.fill(); ctx.restore();
    if (this.flow === "playing") { ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = "600 12px system-ui"; ctx.textAlign = "center"; ctx.fillText("drag to steer onto the platforms", cx, cy + rimR * 1.0); }
    this.drawFx(now); void now;
  }
}
