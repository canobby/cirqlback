// Cirql Weave — engine (CirqlCade). A harmonograph in the ring. Two swinging
// pendulums trace looping figures that slowly settle as they decay; drag to tune
// their rhythm and each new setting draws a fresh figure. No score to chase — just
// woven light. Finish whenever you like.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface WeaveHud { figures: number; best: number; }
export interface WeaveResult { figures: number; best: number; }
export interface WeaveOpts extends ArcadeOpts { accent?: string; onHud?: (s: WeaveHud) => void; onRunEnd?: (r: WeaveResult) => void; }

type Flow = "menu" | "playing" | "over";

export class WeaveEngine extends ArcadeEngine {
  private opts: WeaveOpts;
  private accent = "#67e8f9";
  private flow: Flow = "menu";
  private figures = 0; private best = +(LS.get("cweave_best") || 0);
  private t = 0; private fx = 2; private fy = 3; private phase = 0; private hue = 190;
  private pts: { x: number; y: number; a: number }[] = []; private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: WeaveOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }
  private amp() { return this.rimR * 0.78; }

  start() { this.flow = "playing"; this.figures = 0; this.t = 0; this.pts = []; this.newFigure(false); this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.pts = []; this.clearFx(); }
  finish() { if (this.flow !== "playing") return; this.flow = "over"; this.best = Math.max(this.best, this.figures); LS.set("cweave_best", String(this.best)); this.opts.onRunEnd?.({ figures: this.figures, best: this.best }); this.emitHud(); }
  private newFigure(count = true) { this.t = 0; this.pts = []; this.phase = Math.random() * TAU; this.hue = (this.hue + 47) % 360; if (count) { this.figures++; this.tone(330 + (this.figures % 8) * 40, 0.2, "sine", 0.03); } }
  peekBest() { return this.best; }

  // drag: horizontal → fx, vertical → fy (the two rhythms)
  protected onPointerDown(e: PointerEvent) { this.tune(e); }
  protected onPointerMove(e: PointerEvent) { this.tune(e); }
  private tune(e: PointerEvent) { if (this.flow !== "playing") return; const p = this.pointerPos(e); this.fx = 1 + Math.round(4 * Math.max(0, Math.min(1, p.x / this.W))); this.fy = 1 + Math.round(4 * Math.max(0, Math.min(1, p.y / this.H))); this.newFigure(false); }

  protected step(dt: number, _now: number) {
    if (this.flow !== "playing") return;
    const decay = Math.exp(-this.t * 0.28);
    if (decay < 0.04) { this.newFigure(true); return; }
    this.t += dt * 1.6;
    const a = this.amp() * decay;
    const x = this.cx + Math.sin(this.fx * this.t) * a;
    const y = this.cy + Math.sin(this.fy * this.t + this.phase) * a;
    this.pts.push({ x, y, a: decay }); if (this.pts.length > 1200) this.pts.shift();
    this.emitHud();
  }

  private emitHud() { if (!this.opts.onHud) return; const sig = String(this.figures); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ figures: this.figures, best: this.best }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.1); g.addColorStop(0, "rgba(103,232,249,.06)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.1, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, rimR * 0.92, 0, TAU); ctx.strokeStyle = "rgba(150,130,255,.1)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.lineWidth = 2; ctx.lineCap = "round";
    for (let i = 1; i < this.pts.length; i++) { const p = this.pts[i]; ctx.strokeStyle = `hsla(${this.hue}, 82%, 66%, ${0.15 + p.a * 0.75})`; ctx.beginPath(); ctx.moveTo(this.pts[i - 1].x, this.pts[i - 1].y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
    if (this.pts.length) { const p = this.pts[this.pts.length - 1]; ctx.save(); ctx.shadowBlur = 14; ctx.shadowColor = `hsl(${this.hue},82%,66%)`; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, TAU); ctx.fill(); ctx.restore(); }
    if (this.flow === "playing") { ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.font = "500 11px system-ui"; ctx.textAlign = "center"; ctx.fillText(`drag to tune the rhythm · ${this.fx}:${this.fy}`, cx, cy + rimR); }
    this.drawFx(now); void now;
  }
}
