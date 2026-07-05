// Cirql Slice — engine (CirqlCade). Fruit Ninja, across the disc. Orbs are flung on
// arcs through the ring; swipe to slash them for points and combos. But every so
// often a spark is thrown in with them — slice that and it's over. Sixty seconds.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface SliceHud { score: number; time: number; best: number; }
export interface SliceResult { score: number; best: number; }
export interface SliceOpts extends ArcadeOpts { accent?: string; onHud?: (s: SliceHud) => void; onRunEnd?: (r: SliceResult) => void; }

type Flow = "menu" | "playing" | "over";
const RUN_TIME = 60;
const HUES = ["#f472b6", "#38bdf8", "#34d399", "#fbbf24", "#a78bfa"];
interface Orb { x: number; y: number; vx: number; vy: number; r: number; bomb: boolean; hue: string; sliced: boolean; }

export class SliceEngine extends ArcadeEngine {
  private opts: SliceOpts;
  private accent = "#f472b6";
  private flow: Flow = "menu";
  private score = 0; private combo = 0; private timeLeft = RUN_TIME; private best = +(LS.get("cslice_best") || 0);
  private orbs: Orb[] = []; private spawnAt = 0; private trail: { x: number; y: number }[] = []; private slicing = false; private prev: { x: number; y: number } | null = null;
  private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: SliceOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }

  start() { this.flow = "playing"; this.score = 0; this.combo = 0; this.timeLeft = RUN_TIME; this.orbs = []; this.trail = []; this.spawnAt = 0; this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.orbs = []; this.clearFx(); }
  peekBest() { return this.best; }

  private spawn() {
    const edge = Math.random() * TAU; const x = this.cx + Math.cos(edge) * this.rimR * 1.05, y = this.cy + Math.sin(edge) * this.rimR * 1.05;
    // aim across the disc with some spread
    const target = edge + Math.PI + (Math.random() - 0.5) * 1.0; const sp = this.rimR * (1.0 + Math.random() * 0.5);
    const bomb = Math.random() < 0.16;
    this.orbs.push({ x, y, vx: Math.cos(target) * sp, vy: Math.sin(target) * sp, r: this.rimR * (bomb ? 0.035 : 0.045), bomb, hue: bomb ? "#fb7185" : HUES[Math.floor(Math.random() * HUES.length)], sliced: false });
  }

  protected onPointerDown(e: PointerEvent) { this.slicing = true; this.prev = this.pointerPos(e); this.trail = [this.prev]; }
  protected onPointerMove(e: PointerEvent) { if (!this.slicing) return; const p = this.pointerPos(e); if (this.prev) this.sliceSegment(this.prev, p); this.prev = p; this.trail.push(p); if (this.trail.length > 10) this.trail.shift(); }
  protected onPointerUp() { this.slicing = false; this.prev = null; }
  private sliceSegment(a: { x: number; y: number }, b: { x: number; y: number }) {
    for (const o of this.orbs) { if (o.sliced) continue; if (this.segNearPoint(a, b, o.x, o.y) < o.r + 6) this.slice(o); }
  }
  private segNearPoint(a: { x: number; y: number }, b: { x: number; y: number }, px: number, py: number) {
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1; let t = ((px - a.x) * dx + (py - a.y) * dy) / l2; t = Math.max(0, Math.min(1, t)); return Math.hypot(a.x + t * dx - px, a.y + t * dy - py);
  }
  private slice(o: Orb) {
    o.sliced = true;
    if (o.bomb) { this.shake = 16; this.burst(o.x, o.y, "#fb7185", 26, this.rimR); this.tone(90, 0.4, "sawtooth", 0.06); this.buzz([40, 60, 40]); this.gameOver(); return; }
    this.combo++; this.score += 10 * Math.min(6, this.combo); this.burst(o.x, o.y, o.hue, 14, this.rimR * 0.9); this.tone(500 + Math.min(600, this.combo * 40), 0.08, "triangle", 0.045); this.buzz(6); if (this.combo >= 3) this.pop(o.x, o.y, "×" + this.combo, o.hue);
  }

  protected step(dt: number, _now: number) {
    if (this.flow !== "playing") return;
    this.timeLeft -= dt; if (this.timeLeft <= 0) { this.timeLeft = 0; this.gameOver(); return; }
    this.spawnAt -= dt; if (this.spawnAt <= 0) { const n = 1 + (Math.random() < 0.3 ? 1 : 0); for (let i = 0; i < n; i++) this.spawn(); this.spawnAt = 0.7 + Math.random() * 0.7; }
    for (const o of this.orbs) { o.vx += (this.cx - o.x) * 0.4 * dt; o.vy += (this.cy - o.y) * 0.4 * dt; o.x += o.vx * dt; o.y += o.vy * dt; }
    // reset combo if all cleared
    this.orbs = this.orbs.filter((o) => !o.sliced && Math.hypot(o.x - this.cx, o.y - this.cy) < this.rimR * 1.2);
    this.emitHud();
  }
  private gameOver() { this.flow = "over"; this.best = Math.max(this.best, this.score); LS.set("cslice_best", String(this.best)); [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sine", 0.05), i * 120)); this.opts.onRunEnd?.({ score: this.score, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const sig = [this.score, Math.ceil(this.timeLeft)].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ score: this.score, time: Math.ceil(this.timeLeft), best: this.best }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.2); g.addColorStop(0, "rgba(236,72,153,.05)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, rimR, 0, TAU); ctx.strokeStyle = "rgba(150,130,255,.1)"; ctx.lineWidth = 1; ctx.stroke();
    for (const o of this.orbs) { if (o.sliced) continue; ctx.save(); ctx.shadowBlur = 14; ctx.shadowColor = o.hue; if (o.bomb) { ctx.fillStyle = o.hue; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, TAU); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = `${o.r * 1.3}px system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("✦", o.x, o.y); } else { const gg = ctx.createRadialGradient(o.x - o.r * 0.3, o.y - o.r * 0.3, 0, o.x, o.y, o.r); gg.addColorStop(0, "#fff"); gg.addColorStop(0.4, o.hue); gg.addColorStop(1, o.hue); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, TAU); ctx.fill(); } ctx.restore(); }
    // slice trail
    if (this.trail.length > 1) { ctx.save(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.shadowBlur = 12; ctx.shadowColor = this.accent; ctx.beginPath(); ctx.moveTo(this.trail[0].x, this.trail[0].y); for (let i = 1; i < this.trail.length; i++) { ctx.globalAlpha = i / this.trail.length; ctx.lineTo(this.trail[i].x, this.trail[i].y); } ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1; }
    if (this.flow === "playing") { ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = "600 12px system-ui"; ctx.textAlign = "center"; ctx.fillText("swipe to slice · avoid ✦ sparks", cx, cy); }
    this.drawFx(now); void now;
    // trail fades when idle
    if (!this.slicing && this.trail.length) this.trail.shift();
  }
}
