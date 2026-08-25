// Cirql Dodge — engine (CirqlCade). Bullet-hell, blooming from the core. Patterns of
// light spiral and burst outward; drag your spark through the gaps. One touch ends
// it. Survive as long as you can — the patterns tighten the longer you last.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface DodgeHud { time: number; best: number; }
export interface DodgeResult { time: number; best: number; }
export interface DodgeOpts extends ArcadeOpts { accent?: string; onHud?: (s: DodgeHud) => void; onRunEnd?: (r: DodgeResult) => void; }

type Flow = "menu" | "playing" | "over";
interface Bullet { x: number; y: number; vx: number; vy: number; hue: string; }

export class DodgeEngine extends ArcadeEngine {
  private opts: DodgeOpts;
  private accent = "#f472b6";
  private flow: Flow = "menu";
  private t = 0; private best = +(LS.get("cdodge_best") || 0);
  private px = 0; private py = 0; private target: { x: number; y: number } | null = null;
  private bullets: Bullet[] = []; private spiralA = 0; private burstAt = 0; private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: DodgeOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }
  private pr() { return this.rimR * 0.02; }

  start() { this.flow = "playing"; this.t = 0; this.px = this.cx; this.py = this.cy + this.rimR * 0.5; this.target = null; this.bullets = []; this.spiralA = 0; this.burstAt = 1.5; this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.bullets = []; this.clearFx(); }
  setCosmetic(c: string) { this.accent = c || "#f472b6"; }
  peekBest() { return this.best; }

  protected onPointerDown(e: PointerEvent) { this.target = this.pointerPos(e); }
  protected onPointerMove(e: PointerEvent) { if (this.target) this.target = this.pointerPos(e); }
  protected onPointerUp() { this.target = null; }

  private emit(a: number, sp: number, hue: string) { this.bullets.push({ x: this.cx, y: this.cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, hue }); }

  protected step(dt: number, _now: number) {
    if (this.flow !== "playing") return;
    this.t += dt;
    // follow finger
    if (this.target) { const dx = this.target.x - this.px, dy = this.target.y - this.py; this.px += dx * Math.min(1, dt * 14); this.py += dy * Math.min(1, dt * 14); }
    const md = Math.hypot(this.px - this.cx, this.py - this.cy); if (md > this.rimR - this.pr()) { const ux = (this.px - this.cx) / md, uy = (this.py - this.cy) / md; this.px = this.cx + ux * (this.rimR - this.pr()); this.py = this.cy + uy * (this.rimR - this.pr()); }
    // spiral stream (speeds up with time)
    const sp = this.rimR * (0.7 + Math.min(0.7, this.t * 0.02));
    const arms = 2 + Math.floor(Math.min(4, this.t / 12));
    this.spiralA += dt * (2.2 + this.t * 0.03);
    for (let k = 0; k < arms; k++) this.emit(this.spiralA + (k / arms) * TAU, sp, this.accent);
    // periodic ring burst
    this.burstAt -= dt; if (this.burstAt <= 0) { this.burstAt = Math.max(1.4, 3 - this.t * 0.03); const n = 18 + Math.floor(this.t); const off = Math.random() * TAU; for (let i = 0; i < n; i++) this.emit(off + (i / n) * TAU, sp * 0.8, "#38bdf8"); this.tone(200, 0.1, "sine", 0.03); }
    // move bullets, cull, collide
    for (const b of this.bullets) { b.x += b.vx * dt; b.y += b.vy * dt; if (Math.hypot(b.x - this.px, b.y - this.py) < this.pr() + this.rimR * 0.014) { this.gameOver(); return; } }
    this.bullets = this.bullets.filter((b) => Math.hypot(b.x - this.cx, b.y - this.cy) < this.rimR * 1.05);
    this.emitHud();
  }
  private gameOver() { this.flow = "over"; this.shake = 14; this.burst(this.px, this.py, "#fb7185", 24, this.rimR); [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sawtooth", 0.05), i * 120)); this.buzz([30, 50, 30]); const time = Math.round(this.t * 10); this.best = Math.max(this.best, time); LS.set("cdodge_best", String(this.best)); this.opts.onRunEnd?.({ time, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const time = Math.round(this.t * 10); const sig = String(time); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ time, best: this.best }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(236,72,153,.08)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, rimR, 0, TAU); ctx.strokeStyle = "rgba(150,130,255,.1)"; ctx.lineWidth = 1; ctx.stroke();
    // core emitter
    ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.beginPath(); ctx.arc(cx, cy, rimR * 0.03, 0, TAU); ctx.fill();
    for (const b of this.bullets) { ctx.save(); ctx.shadowBlur = 6; ctx.shadowColor = b.hue; ctx.fillStyle = b.hue; ctx.beginPath(); ctx.arc(b.x, b.y, rimR * 0.012, 0, TAU); ctx.fill(); ctx.restore(); }
    // player
    if (this.flow !== "menu") { ctx.save(); ctx.shadowBlur = 16; ctx.shadowColor = "#fff"; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(this.px, this.py, this.pr() + 2, 0, TAU); ctx.fill(); ctx.strokeStyle = this.accent; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(this.px, this.py, this.pr() + 6, 0, TAU); ctx.stroke(); ctx.restore(); }
    if (this.flow === "playing" && this.t < 3) { ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = "600 12px system-ui"; ctx.textAlign = "center"; ctx.fillText("drag to weave through the gaps", cx, cy + rimR * 1.05); }
    this.drawFx(now); void now;
  }
}
