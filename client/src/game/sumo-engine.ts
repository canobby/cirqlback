// Cirql Sumo — engine (CirqlCade). Ring-out. You and a pack of rival motes share a
// disc with no walls; tap to dash and barge them over the edge while keeping your own
// footing. Clear the ring to advance; get shoved off yourself and it's over.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface SumoHud { score: number; round: number; rivals: number; }
export interface SumoResult { score: number; best: number; }
export interface SumoOpts extends ArcadeOpts { accent?: string; onHud?: (s: SumoHud) => void; onRunEnd?: (r: SumoResult) => void; }

type Flow = "menu" | "playing" | "over";
interface Blob { x: number; y: number; vx: number; vy: number; r: number; hue: string; you?: boolean; dashAt?: number; }

export class SumoEngine extends ArcadeEngine {
  private opts: SumoOpts;
  private accent = "#fbbf24";
  private flow: Flow = "menu";
  private score = 0; private round = 0; private best = +(LS.get("csumo_best") || 0);
  private me: Blob = { x: 0, y: 0, vx: 0, vy: 0, r: 20, hue: "#fbbf24", you: true };
  private rivals: Blob[] = []; private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: SumoOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }
  private ringR() { return this.rimR * 0.94; }

  start() { this.flow = "playing"; this.score = 0; this.round = 0; this.me = { x: this.cx, y: this.cy, vx: 0, vy: 0, r: this.rimR * 0.05, hue: this.accent, you: true }; this.nextRound(); this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.rivals = []; this.clearFx(); }
  private nextRound() { this.round++; this.rivals = []; const n = 2 + this.round; for (let i = 0; i < n; i++) { const a = (i / n) * TAU; const d = this.ringR() * 0.6; this.rivals.push({ x: this.cx + Math.cos(a) * d, y: this.cy + Math.sin(a) * d, vx: 0, vy: 0, r: this.rimR * 0.05, hue: ["#fb7185", "#f472b6", "#a78bfa", "#38bdf8", "#34d399"][i % 5], dashAt: 0 }); } this.me.x = this.cx; this.me.y = this.cy; this.me.vx = this.me.vy = 0; }
  private dash(b: Blob, tx: number, ty: number) { const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy) || 1; b.vx += dx / d * this.rimR * 1.6; b.vy += dy / d * this.rimR * 1.6; }
  setCosmetic(c: string) { this.accent = c || "#fbbf24"; this.me.hue = this.accent; }
  peekBest() { return this.best; }

  protected onPointerDown(e: PointerEvent) { if (this.flow !== "playing") return; const p = this.pointerPos(e); this.dash(this.me, p.x, p.y); this.tone(300, 0.05, "sine", 0.04); this.buzz(5); }

  protected step(dt: number, now: number) {
    if (this.flow !== "playing") return;
    const all = [this.me, ...this.rivals];
    // rival AI: periodically dash toward me
    for (const r of this.rivals) { if (now > (r.dashAt || 0)) { r.dashAt = now + 800 + Math.random() * 900; this.dash(r, this.me.x + (Math.random() - 0.5) * 40, this.me.y + (Math.random() - 0.5) * 40); } }
    // integrate + friction
    for (const b of all) { b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= 0.97; b.vy *= 0.97; }
    // collisions (elastic-ish)
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) { const a = all[i], b = all[j]; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1; if (d < a.r + b.r) { const ux = dx / d, uy = dy / d; const overlap = a.r + b.r - d; a.x -= ux * overlap / 2; a.y -= uy * overlap / 2; b.x += ux * overlap / 2; b.y += uy * overlap / 2; const va = a.vx * ux + a.vy * uy, vb = b.vx * ux + b.vy * uy; const imp = (vb - va); a.vx += ux * imp; a.vy += uy * imp; b.vx -= ux * imp; b.vy -= uy * imp; this.burst((a.x + b.x) / 2, (a.y + b.y) / 2, "#fff", 3, this.rimR * 0.4); this.tone(400, 0.03, "square", 0.02); } }
    // ring-out
    for (const r of this.rivals) { if (Math.hypot(r.x - this.cx, r.y - this.cy) > this.ringR() + r.r) { (r as any).out = true; this.score++; this.burst(r.x, r.y, r.hue, 10, this.rimR * 0.6); this.tone(660, 0.1, "sine", 0.045); this.buzz(6); } }
    this.rivals = this.rivals.filter((r) => !(r as any).out);
    if (Math.hypot(this.me.x - this.cx, this.me.y - this.cy) > this.ringR() + this.me.r) { this.gameOver(); return; }
    if (!this.rivals.length) { this.tone(920, 0.2, "sine", 0.05); this.pop(this.cx, this.cy, "RING CLEAR", "#34d399"); this.nextRound(); }
    this.emitHud();
  }
  private gameOver() { this.flow = "over"; this.shake = 14; this.burst(this.me.x, this.me.y, "#fb7185", 22, this.rimR); [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sawtooth", 0.05), i * 120)); this.buzz([30, 50]); this.best = Math.max(this.best, this.score); LS.set("csumo_best", String(this.best)); this.opts.onRunEnd?.({ score: this.score, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const sig = [this.score, this.round, this.rivals.length].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ score: this.score, round: this.round, rivals: this.rivals.length }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this; const R = this.ringR();
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.2); g.addColorStop(0, "rgba(251,191,36,.05)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.2, 0, TAU); ctx.fill();
    ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = "#7c3aed"; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.strokeStyle = "rgba(150,130,255,.35)"; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    const drawB = (b: Blob) => { ctx.save(); ctx.shadowBlur = 12; ctx.shadowColor = b.hue; const gg = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, 0, b.x, b.y, b.r); gg.addColorStop(0, "#fff"); gg.addColorStop(0.5, b.hue); gg.addColorStop(1, b.hue + "66"); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); if (b.you) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke(); } ctx.restore(); };
    for (const r of this.rivals) drawB(r); drawB(this.me);
    if (this.flow === "playing" && this.round <= 1) { ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = "600 12px system-ui"; ctx.textAlign = "center"; ctx.fillText("tap to dash · shove them off the ring", cx, cy + rimR * 1.05); }
    this.drawFx(now); void now;
  }
}
