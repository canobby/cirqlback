// Cirql Spiro — engine (CirqlCade). A spirograph that draws itself. A pen rolls a
// circle inside the ring and traces glowing hypotrochoids; drag to reshape the
// gears and watch the figure change. Nothing to lose — just loops of light. Tap
// Finish when you're ready.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface SpiroHud { loops: number; best: number; }
export interface SpiroResult { loops: number; best: number; }
export interface SpiroOpts extends ArcadeOpts { accent?: string; onHud?: (s: SpiroHud) => void; onRunEnd?: (r: SpiroResult) => void; }

type Flow = "menu" | "playing" | "over";

export class SpiroEngine extends ArcadeEngine {
  private opts: SpiroOpts;
  private accent = "#a78bfa";
  private flow: Flow = "menu";
  private loops = 0; private best = +(LS.get("cspiro_best") || 0);
  private t = 0; private ratio = 0.34; private dInner = 0.55; private hue = 0;
  private pts: { x: number; y: number; h: number }[] = []; private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: SpiroOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }
  private bigR() { return this.rimR * 0.72; }

  start() { this.flow = "playing"; this.loops = 0; this.t = 0; this.pts = []; this.hue = 0; this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.pts = []; this.clearFx(); }
  finish() { if (this.flow !== "playing") return; this.flow = "over"; this.best = Math.max(this.best, this.loops); LS.set("cspiro_best", String(this.best)); this.opts.onRunEnd?.({ loops: this.loops, best: this.best }); this.emitHud(); }
  peekBest() { return this.best; }

  // drag: horizontal → ratio (gear size), vertical → pen offset
  protected onPointerDown(e: PointerEvent) { this.applyDrag(e); }
  protected onPointerMove(e: PointerEvent) { this.applyDrag(e); }
  private applyDrag(e: PointerEvent) { if (this.flow !== "playing") return; const p = this.pointerPos(e); this.ratio = 0.12 + 0.72 * Math.max(0, Math.min(1, p.x / this.W)); this.dInner = 0.15 + 0.8 * Math.max(0, Math.min(1, p.y / this.H)); this.pts = []; }

  private pen(t: number) { const R = this.bigR(), r = R * this.ratio, d = r * this.dInner * 2; const k = (R - r); const x = this.cx + k * Math.cos(t) + d * Math.cos((k / r) * t); const y = this.cy + k * Math.sin(t) - d * Math.sin((k / r) * t); return { x, y }; }

  protected step(dt: number, _now: number) {
    if (this.flow !== "playing") return;
    const prev = Math.floor(this.t / TAU);
    this.t += dt * 2.2; this.hue = (this.hue + dt * 20) % 360;
    if (Math.floor(this.t / TAU) > prev) { this.loops++; this.tone(330 + (this.loops % 8) * 40, 0.15, "sine", 0.02); }
    const p = this.pen(this.t); this.pts.push({ x: p.x, y: p.y, h: this.hue }); if (this.pts.length > 900) this.pts.shift();
    this.emitHud();
  }

  private emitHud() { if (!this.opts.onHud) return; const sig = String(this.loops); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ loops: this.loops, best: this.best }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.1); g.addColorStop(0, "rgba(167,139,250,.08)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.1, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, this.bigR(), 0, TAU); ctx.strokeStyle = "rgba(150,130,255,.14)"; ctx.lineWidth = 1; ctx.stroke();
    // trace
    ctx.lineWidth = 2; ctx.lineCap = "round";
    for (let i = 1; i < this.pts.length; i++) { const a = this.pts[i]; const alpha = i / this.pts.length; ctx.strokeStyle = `hsla(${a.h}, 80%, 68%, ${0.15 + alpha * 0.7})`; ctx.beginPath(); ctx.moveTo(this.pts[i - 1].x, this.pts[i - 1].y); ctx.lineTo(a.x, a.y); ctx.stroke(); }
    // pen tip
    if (this.pts.length) { const p = this.pts[this.pts.length - 1]; ctx.save(); ctx.shadowBlur = 14; ctx.shadowColor = `hsl(${this.hue},80%,68%)`; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, TAU); ctx.fill(); ctx.restore(); }
    if (this.flow === "playing") { ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.font = "500 11px system-ui"; ctx.textAlign = "center"; ctx.fillText("drag to reshape the gears", cx, cy + rimR); }
    this.drawFx(now); void now;
  }
}
