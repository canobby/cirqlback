// Cirql Tap — engine (CirqlCade). osu!, on the ring. Targets bloom around the disc,
// each with a shrinking approach ring; tap right as the ring meets the target for a
// perfect. Chain them for combo and keep the meter up. Faster the longer you last.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface TapHud { score: number; combo: number; health: number; }
export interface TapResult { score: number; best: number; comboMax: number; }
export interface TapOpts extends ArcadeOpts { accent?: string; onHud?: (s: TapHud) => void; onRunEnd?: (r: TapResult) => void; }

type Flow = "menu" | "playing" | "over";
const HUES = ["#f472b6", "#38bdf8", "#34d399", "#fbbf24", "#a78bfa"];
interface Target { x: number; y: number; born: number; hit: number; hue: string; judged: boolean; }

export class TapEngine extends ArcadeEngine {
  private opts: TapOpts;
  private accent = "#ec4899";
  private flow: Flow = "menu";
  private score = 0; private combo = 0; private comboMax = 0; private health = 1; private best = +(LS.get("ctap_best") || 0);
  private targets: Target[] = []; private spawnAt = 0; private t = 0; private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: TapOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }
  private approach() { return Math.max(0.8, 1.5 - this.t * 0.01); }
  private tgtR() { return this.rimR * 0.05; }

  start() { this.flow = "playing"; this.score = 0; this.combo = 0; this.comboMax = 0; this.health = 1; this.targets = []; this.t = 0; this.spawnAt = 0; this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.targets = []; this.clearFx(); }
  peekBest() { return this.best; }

  private spawn(now: number) { const a = Math.random() * TAU, d = this.rimR * (0.25 + Math.random() * 0.6); this.targets.push({ x: this.cx + Math.cos(a) * d, y: this.cy + Math.sin(a) * d, born: now, hit: now + this.approach() * 1000, hue: HUES[Math.floor(Math.random() * HUES.length)], judged: false }); }

  protected onPointerDown(e: PointerEvent) {
    if (this.flow !== "playing") return; const now = performance.now(); const p = this.pointerPos(e);
    let best: Target | null = null, bd = this.tgtR() * 2.4;
    for (const t of this.targets) { if (t.judged) continue; const d = Math.hypot(t.x - p.x, t.y - p.y); if (d < bd) { bd = d; best = t; } }
    if (!best) return;
    const err = Math.abs(now - best.hit);
    if (err < 620) { best.judged = true; const perfect = err < 130; this.combo++; if (this.combo > this.comboMax) this.comboMax = this.combo; this.score += (perfect ? 15 : 8) * Math.min(8, 1 + Math.floor(this.combo / 5)); this.health = Math.min(1, this.health + 0.03); this.burst(best.x, best.y, best.hue, perfect ? 12 : 7, this.rimR); if (perfect) this.pop(best.x, best.y, "PERFECT", "#fff"); else if (this.combo >= 5) this.pop(best.x, best.y, "×" + this.combo, best.hue); this.tone(perfect ? 880 : 660, 0.08, "triangle", 0.05); this.buzz(perfect ? 10 : 6); }
  }

  protected step(_dt: number, now: number) {
    if (this.flow !== "playing") return; this.t += _dt;
    this.spawnAt -= _dt; if (this.spawnAt <= 0) { this.spawn(now); this.spawnAt = Math.max(0.5, 1.0 - this.t * 0.008); }
    for (const t of this.targets) { if (!t.judged && now > t.hit + 260) { t.judged = true; this.combo = 0; this.health -= 0.1; if (this.health <= 0) { this.gameOver(); return; } } }
    this.targets = this.targets.filter((t) => !(t.judged && now > t.hit + 300));
    this.emitHud();
  }
  private gameOver() { this.flow = "over"; this.health = 0; this.best = Math.max(this.best, this.score); LS.set("ctap_best", String(this.best)); [523, 440, 349, 262].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sine", 0.05), i * 120)); this.buzz([30, 50]); this.opts.onRunEnd?.({ score: this.score, best: this.best, comboMax: this.comboMax }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const sig = [this.score, this.combo, Math.round(this.health * 20)].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ score: this.score, combo: this.combo, health: this.health }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(236,72,153,.06)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    const R = this.tgtR();
    for (const t of this.targets) { if (t.judged) continue; const prog = (now - t.born) / (t.hit - t.born); const ar = R + (rimR * 0.16) * (1 - Math.min(1, prog)); ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = t.hue;
      // approach ring
      ctx.strokeStyle = t.hue; ctx.globalAlpha = 0.7; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(t.x, t.y, Math.max(R, ar), 0, TAU); ctx.stroke();
      // target
      ctx.globalAlpha = 1; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(t.x, t.y, R * 0.5, 0, TAU); ctx.fill(); ctx.fillStyle = t.hue; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(t.x, t.y, R, 0, TAU); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1; }
    if (this.flow === "playing" && this.t < 3) { ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = "600 12px system-ui"; ctx.textAlign = "center"; ctx.fillText("tap when the ring meets the dot", cx, cy); }
    this.drawFx(now); void now;
  }
}
