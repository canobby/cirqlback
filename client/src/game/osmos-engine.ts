// Cirql Osmos — engine (CirqlCade). Agar, in the ring. You're a soft mote drifting
// among others; steer over the smaller ones to absorb them and grow, and keep well
// clear of anything bigger — brush it and it swallows you. Grow as large as you can.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface OsmosHud { size: number; best: number; }
export interface OsmosResult { size: number; best: number; }
export interface OsmosOpts extends ArcadeOpts { accent?: string; onHud?: (s: OsmosHud) => void; onRunEnd?: (r: OsmosResult) => void; }

type Flow = "menu" | "playing" | "over";
interface Blob { x: number; y: number; vx: number; vy: number; r: number; hue: string; }
const HUES = ["#38bdf8", "#34d399", "#a78bfa", "#f472b6", "#fbbf24"];

export class OsmosEngine extends ArcadeEngine {
  private opts: OsmosOpts;
  private accent = "#67e8f9";
  private flow: Flow = "menu";
  private me: Blob = { x: 0, y: 0, vx: 0, vy: 0, r: 16, hue: "#67e8f9" };
  private blobs: Blob[] = []; private target: { x: number; y: number } | null = null;
  private best = +(LS.get("cosmos_best") || 0); private spawnAt = 0; private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: OsmosOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }
  private area(r: number) { return r * r; }
  private rFromArea(a: number) { return Math.sqrt(a); }

  start() { this.flow = "playing"; this.me = { x: this.cx, y: this.cy, vx: 0, vy: 0, r: this.rimR * 0.05, hue: this.accent }; this.blobs = []; this.target = null; this.spawnAt = 0; for (let i = 0; i < 14; i++) this.spawnBlob(); this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.blobs = []; this.clearFx(); }
  private spawnBlob() { const a = Math.random() * TAU, d = this.rimR * (0.4 + Math.random() * 0.55); const r = this.me.r * (0.4 + Math.random() * 1.6); this.blobs.push({ x: this.cx + Math.cos(a) * d, y: this.cy + Math.sin(a) * d, vx: (Math.random() - 0.5) * this.rimR * 0.15, vy: (Math.random() - 0.5) * this.rimR * 0.15, r, hue: HUES[Math.floor(Math.random() * HUES.length)] }); }
  setCosmetic(c: string) { this.accent = c || "#67e8f9"; this.me.hue = this.accent; }
  peekBest() { return this.best; }

  protected onPointerDown(e: PointerEvent) { this.target = this.pointerPos(e); }
  protected onPointerMove(e: PointerEvent) { if (this.target) this.target = this.pointerPos(e); }
  protected onPointerUp() { this.target = null; }

  protected step(dt: number, _now: number) {
    if (this.flow !== "playing") return;
    // steer toward the target; bigger = slower
    if (this.target) { const dx = this.target.x - this.me.x, dy = this.target.y - this.me.y, d = Math.hypot(dx, dy) || 1; const acc = this.rimR * 3 / (this.me.r * 0.15 + 4); this.me.vx += (dx / d) * acc * dt; this.me.vy += (dy / d) * acc * dt; }
    this.me.vx *= 0.94; this.me.vy *= 0.94; this.me.x += this.me.vx * dt; this.me.y += this.me.vy * dt;
    // keep inside arena
    const md = Math.hypot(this.me.x - this.cx, this.me.y - this.cy); if (md > this.rimR - this.me.r) { const ux = (this.me.x - this.cx) / md, uy = (this.me.y - this.cy) / md; this.me.x = this.cx + ux * (this.rimR - this.me.r); this.me.y = this.cy + uy * (this.rimR - this.me.r); this.me.vx *= -0.3; this.me.vy *= -0.3; }
    for (const b of this.blobs) { b.x += b.vx * dt; b.y += b.vy * dt; const bd = Math.hypot(b.x - this.cx, b.y - this.cy); if (bd > this.rimR - b.r) { const ux = (b.x - this.cx) / bd, uy = (b.y - this.cy) / bd; b.x = this.cx + ux * (this.rimR - b.r); b.y = this.cy + uy * (this.rimR - b.r); b.vx *= -1; b.vy *= -1; } }
    for (const b of this.blobs) { const d = Math.hypot(b.x - this.me.x, b.y - this.me.y); if (d < this.me.r + b.r - Math.min(this.me.r, b.r) * 0.4) { if (b.r < this.me.r) { this.me.r = this.rFromArea(this.area(this.me.r) + this.area(b.r)); (b as any).eaten = true; this.burst(b.x, b.y, b.hue, 8, this.rimR * 0.5); this.tone(300 + this.me.r, 0.07, "sine", 0.04); this.buzz(4); } else { this.gameOver(); return; } } }
    this.blobs = this.blobs.filter((b) => !(b as any).eaten);
    this.spawnAt -= dt; if (this.spawnAt <= 0 && this.blobs.length < 16) { this.spawnBlob(); this.spawnAt = 1.2; }
    this.emitHud();
  }
  private gameOver() { this.flow = "over"; this.shake = 12; this.burst(this.me.x, this.me.y, "#fb7185", 20, this.rimR); [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sawtooth", 0.05), i * 120)); this.buzz([30, 50]); const size = Math.round(this.me.r); this.best = Math.max(this.best, size); LS.set("cosmos_best", String(this.best)); this.opts.onRunEnd?.({ size, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const size = Math.round(this.me.r); const sig = String(size); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ size, best: this.best }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(103,232,249,.04)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, rimR, 0, TAU); ctx.strokeStyle = "rgba(150,130,255,.12)"; ctx.lineWidth = 2; ctx.stroke();
    const blob = (b: Blob, me: boolean) => { ctx.save(); ctx.shadowBlur = 12; ctx.shadowColor = b.hue; const gg = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, 0, b.x, b.y, b.r); gg.addColorStop(0, "rgba(255,255,255,.9)"); gg.addColorStop(0.5, b.hue + (me ? "" : "cc")); gg.addColorStop(1, b.hue + "44"); ctx.fillStyle = gg; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); if (me) { ctx.globalAlpha = 1; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke(); } ctx.restore(); ctx.globalAlpha = 1; };
    for (const b of this.blobs) { if (b.r > this.me.r) { ctx.save(); ctx.strokeStyle = "rgba(251,113,133,.5)"; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 3, 0, TAU); ctx.stroke(); ctx.restore(); ctx.setLineDash([]); } blob(b, false); }
    blob(this.me, true);
    if (this.flow === "playing") { ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.font = "600 12px system-ui"; ctx.textAlign = "center"; ctx.fillText("drag to drift · eat smaller · flee bigger", cx, cy + rimR * 1.02); }
    this.drawFx(now); void now;
  }
}
