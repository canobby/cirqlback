// Cirql Aurora — engine (CirqlCade, Zen). Sweep your finger and shimmering
// northern-lights ribbons rise and drift across the sky. No aim, no clock — just
// paint. Tap Finish whenever you like.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface AuroraHud { strokes: number; best: number; }
export interface AuroraResult { strokes: number; best: number; }
export interface AuroraOpts extends ArcadeOpts { accent?: string; onHud?: (s: AuroraHud) => void; onRunEnd?: (r: AuroraResult) => void; }

type Flow = "menu" | "playing" | "over";
interface Curtain { x: number; y: number; vx: number; vy: number; life: number; hue: number; h: number; }

export class AuroraEngine extends ArcadeEngine {
  private opts: AuroraOpts;
  private accent = "#a78bfa";
  private flow: Flow = "menu";
  private strokes = 0; private best = +(LS.get("caurora_best") || 0);
  private pts: Curtain[] = []; private prev: { x: number; y: number } | null = null; private lastHud = ""; private hueBase = 140;

  constructor(canvas: HTMLCanvasElement, opts: AuroraOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }

  start() { this.flow = "playing"; this.strokes = 0; this.pts = []; this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.pts = []; }
  finish() { if (this.flow !== "playing") return; this.flow = "over"; this.best = Math.max(this.best, this.strokes); LS.set("caurora_best", String(this.best)); this.opts.onRunEnd?.({ strokes: this.strokes, best: this.best }); this.emitHud(); }
  peekBest() { return this.best; }

  protected onPointerDown(e: PointerEvent) { this.prev = this.pointerPos(e); this.strokes++; this.hueBase = (this.hueBase + 40) % 360; this.tone(240 + Math.random() * 140, 0.5, "sine", 0.02); this.emitHud(); this.add(this.prev); }
  protected onPointerMove(e: PointerEvent) { if (!this.prev) return; const p = this.pointerPos(e); this.add(p); this.prev = p; }
  protected onPointerUp() { this.prev = null; }
  private add(p: { x: number; y: number }) { if (this.pts.length > 900) return; const hue = this.hueBase + (p.x / this.W) * 40; this.pts.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 4, vy: -5 - Math.random() * 6, life: 1, hue, h: this.rimR * (0.16 + Math.random() * 0.16) }); }

  protected step(dt: number, now: number) {
    if (this.flow === "menu") return;
    for (const p of this.pts) { p.x += p.vx * dt + Math.sin((p.y + now * 0.05) * 0.02) * 8 * dt; p.y += p.vy * dt; p.vx *= 0.98; p.life -= dt * 0.08; p.hue = (p.hue + dt * 10) % 360; }
    this.pts = this.pts.filter((p) => p.life > 0 && p.y > -this.rimR);
    this.emitHud();
  }

  private emitHud() { if (!this.opts.onHud) return; const sig = String(this.strokes); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ strokes: this.strokes, best: this.best }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    ctx.fillStyle = "rgba(5,4,15,0.14)"; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, rimR * 0.98, 0, TAU); ctx.strokeStyle = "rgba(150,130,255,.1)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.globalCompositeOperation = "lighter";
    for (const p of this.pts) {
      const a = Math.max(0, p.life) * 0.7;
      const g = ctx.createLinearGradient(p.x, p.y - p.h, p.x, p.y + p.h);
      g.addColorStop(0, `hsla(${p.hue}, 92%, 68%, 0)`);
      g.addColorStop(0.5, `hsla(${p.hue}, 92%, 64%, ${a})`);
      g.addColorStop(1, `hsla(${(p.hue + 40) % 360}, 92%, 58%, 0)`);
      ctx.strokeStyle = g; ctx.lineWidth = rimR * 0.03; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(p.x, p.y - p.h); ctx.lineTo(p.x, p.y + p.h); ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
    if (this.flow === "playing" && this.strokes === 0) { ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.font = "500 12px system-ui"; ctx.textAlign = "center"; ctx.fillText("sweep to paint the sky", cx, cy); }
    void now;
  }
}
