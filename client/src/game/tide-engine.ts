// Cirql Tide — engine (CirqlCade). A little sea of light inside the ring. Sweep your
// finger and the motes flow with you, swirling and settling in slow currents. No
// aim, no score to chase — just stir the tide. Tap Finish whenever you like.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface TideHud { ripples: number; best: number; }
export interface TideResult { ripples: number; best: number; }
export interface TideOpts extends ArcadeOpts { accent?: string; onHud?: (s: TideHud) => void; onRunEnd?: (r: TideResult) => void; }

type Flow = "menu" | "playing" | "over";
interface Mote { x: number; y: number; vx: number; vy: number; hue: number; }

export class TideEngine extends ArcadeEngine {
  private opts: TideOpts;
  private accent = "#38bdf8";
  private flow: Flow = "menu";
  private ripples = 0; private best = +(LS.get("ctide_best") || 0);
  private motes: Mote[] = []; private prev: { x: number; y: number } | null = null; private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: TideOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.build(); this.emitHud(); }
  private build() { this.motes = []; const n = 260; for (let i = 0; i < n; i++) { const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * this.rimR * 0.92; this.motes.push({ x: this.cx + Math.cos(a) * d, y: this.cy + Math.sin(a) * d, vx: 0, vy: 0, hue: 190 + Math.random() * 90 }); } }
  protected onResize() { this.build(); }

  start() { this.flow = "playing"; this.ripples = 0; this.build(); this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.clearFx(); }
  finish() { if (this.flow !== "playing") return; this.flow = "over"; this.best = Math.max(this.best, this.ripples); LS.set("ctide_best", String(this.best)); this.opts.onRunEnd?.({ ripples: this.ripples, best: this.best }); this.emitHud(); }
  peekBest() { return this.best; }

  protected onPointerDown(e: PointerEvent) { this.prev = this.pointerPos(e); this.ripples++; this.tone(300 + Math.random() * 100, 0.3, "sine", 0.02); this.emitHud(); }
  protected onPointerMove(e: PointerEvent) { if (!this.prev) return; const p = this.pointerPos(e); const dx = p.x - this.prev.x, dy = p.y - this.prev.y; this.push(p.x, p.y, dx, dy); this.prev = p; }
  protected onPointerUp() { this.prev = null; }
  private push(px: number, py: number, dx: number, dy: number) {
    const R = this.rimR * 0.22; for (const m of this.motes) { const d = Math.hypot(m.x - px, m.y - py); if (d < R) { const f = (1 - d / R) * 1.5; m.vx += dx * f; m.vy += dy * f; } }
  }

  protected step(dt: number, _now: number) {
    if (this.flow === "menu") return;
    for (const m of this.motes) { m.x += m.vx; m.y += m.vy; m.vx *= 0.92; m.vy *= 0.92; const d = Math.hypot(m.x - this.cx, m.y - this.cy); if (d > this.rimR * 0.95) { const ux = (m.x - this.cx) / d, uy = (m.y - this.cy) / d; m.x = this.cx + ux * this.rimR * 0.95; m.y = this.cy + uy * this.rimR * 0.95; m.vx *= -0.5; m.vy *= -0.5; } m.hue = (m.hue + dt * 6) % 360; }
    this.emitHud();
  }

  private emitHud() { if (!this.opts.onHud) return; const sig = String(this.ripples); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ ripples: this.ripples, best: this.best }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    ctx.fillStyle = "rgba(5,4,15,0.18)"; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.1, 0, TAU); ctx.fill(); // soft trails
    ctx.beginPath(); ctx.arc(cx, cy, rimR * 0.96, 0, TAU); ctx.strokeStyle = "rgba(150,130,255,.12)"; ctx.lineWidth = 2; ctx.stroke();
    for (const m of this.motes) { const sp = Math.hypot(m.vx, m.vy); const lum = 55 + Math.min(30, sp * 4); ctx.fillStyle = `hsla(${m.hue}, 85%, ${lum}%, 0.85)`; ctx.beginPath(); ctx.arc(m.x, m.y, rimR * 0.008 + Math.min(rimR * 0.01, sp * 0.4), 0, TAU); ctx.fill(); }
    if (this.flow === "playing" && this.ripples === 0) { ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.font = "500 12px system-ui"; ctx.textAlign = "center"; ctx.fillText("sweep to stir the tide", cx, cy); }
    void now;
  }
}
