// Cirql Ember — engine (CirqlCade, Zen). Tend a little fire: press and hold to
// feed it, and glowing embers drift up and fade. Sweep to fan them. No fail —
// just keep the warmth. Tap Finish when you're ready.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface EmberHud { warmth: number; best: number; }
export interface EmberResult { warmth: number; best: number; }
export interface EmberOpts extends ArcadeOpts { accent?: string; onHud?: (s: EmberHud) => void; onRunEnd?: (r: EmberResult) => void; }

type Flow = "menu" | "playing" | "over";
interface Spark { x: number; y: number; vx: number; vy: number; life: number; hue: number; }

export class EmberEngine extends ArcadeEngine {
  private opts: EmberOpts;
  private accent = "#fb7185";
  private flow: Flow = "menu";
  private warmth = 0; private best = +(LS.get("cember_best") || 0);
  private sparks: Spark[] = []; private fuel = 0.35; private holding = false; private ptr: { x: number; y: number } | null = null; private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: EmberOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }
  private baseY() { return this.cy + this.rimR * 0.42; }

  start() { this.flow = "playing"; this.warmth = 0; this.fuel = 0.35; this.sparks = []; this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.sparks = []; }
  finish() { if (this.flow !== "playing") return; this.flow = "over"; this.best = Math.max(this.best, this.warmth); LS.set("cember_best", String(this.best)); this.opts.onRunEnd?.({ warmth: this.warmth, best: this.best }); this.emitHud(); }
  peekBest() { return this.best; }

  protected onPointerDown(e: PointerEvent) { this.holding = true; this.ptr = this.pointerPos(e); this.tone(120, 0.4, "sawtooth", 0.02); }
  protected onPointerMove(e: PointerEvent) { this.ptr = this.pointerPos(e); if (this.holding) this.fan(this.ptr); }
  protected onPointerUp() { this.holding = false; this.ptr = null; }
  private fan(p: { x: number; y: number }) { const R = this.rimR * 0.24; for (const s of this.sparks) { const d = Math.hypot(s.x - p.x, s.y - p.y); if (d < R) { const f = (1 - d / R) * 40; s.vx += (s.x - p.x) / (d || 1) * f * 0.02; s.vy -= f * 0.01; } } }

  protected step(dt: number, _now: number) {
    if (this.flow !== "playing") return;
    this.fuel = Math.max(0, this.fuel - dt * 0.05);
    if (this.holding) { this.fuel = Math.min(1, this.fuel + dt * 0.6); this.warmth += Math.round(dt * 30); this.emitHud(); }
    // spawn embers from the base, more with fuel
    const rate = 20 + this.fuel * 90;
    if (Math.random() < rate * dt) {
      const bx = this.cx + (Math.random() - 0.5) * this.rimR * 0.18 * (0.5 + this.fuel);
      this.sparks.push({ x: bx, y: this.baseY(), vx: (Math.random() - 0.5) * 20, vy: -(30 + Math.random() * 60) * (0.6 + this.fuel), life: 1, hue: 15 + Math.random() * 35 });
    }
    for (const s of this.sparks) { s.x += s.vx * dt + Math.sin((s.y + _now * 0.1) * 0.05) * 10 * dt; s.y += s.vy * dt; s.vy += 6 * dt; s.life -= dt * 0.55; }
    this.sparks = this.sparks.filter((s) => s.life > 0);
  }

  private emitHud() { if (!this.opts.onHud) return; const sig = String(this.warmth); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ warmth: this.warmth, best: this.best }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this; const by = this.baseY();
    ctx.beginPath(); ctx.arc(cx, cy, rimR * 0.98, 0, TAU); ctx.strokeStyle = "rgba(150,130,255,.08)"; ctx.lineWidth = 2; ctx.stroke();
    // fire glow at the base
    const fr = rimR * (0.14 + this.fuel * 0.22) * (0.92 + Math.sin(now * 0.02) * 0.08);
    const g = ctx.createRadialGradient(cx, by, 0, cx, by, fr);
    g.addColorStop(0, `rgba(255,240,180,${0.5 + this.fuel * 0.4})`); g.addColorStop(0.4, `rgba(251,146,60,${0.4 + this.fuel * 0.3})`); g.addColorStop(1, "rgba(251,113,133,0)");
    ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, by, fr, 0, TAU); ctx.fill();
    for (const s of this.sparks) { const a = Math.max(0, s.life); ctx.fillStyle = `hsla(${s.hue}, 95%, ${55 + a * 20}%, ${a})`; ctx.beginPath(); ctx.arc(s.x, s.y, rimR * 0.008 + a * rimR * 0.006, 0, TAU); ctx.fill(); }
    ctx.globalCompositeOperation = "source-over";
    // logs
    ctx.strokeStyle = "rgba(120,85,60,.7)"; ctx.lineWidth = rimR * 0.03; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx - rimR * 0.14, by + rimR * 0.04); ctx.lineTo(cx + rimR * 0.14, by - rimR * 0.02); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - rimR * 0.14, by - rimR * 0.02); ctx.lineTo(cx + rimR * 0.14, by + rimR * 0.04); ctx.stroke();
    if (this.flow === "playing" && this.warmth === 0) { ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.font = "500 12px system-ui"; ctx.textAlign = "center"; ctx.fillText("press & hold to feed the fire", cx, cy - rimR * 0.4); }
  }
}
