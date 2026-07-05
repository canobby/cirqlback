// Cirql Stack — engine (CirqlCade). The tower-stacker, spun inward. A glowing arc
// sweeps the current ring; tap to lock it. Only the part overlapping the arc below
// carries up — so each ring can only get narrower. Stack all the way to the centre
// for a bonus, then start again, faster. Miss the overlap entirely and it's over.

import { ArcadeEngine, type ArcadeOpts, TAU, norm, LS } from "./arcade-core";

export interface StackHud { score: number; height: number; best: number; }
export interface StackResult { score: number; best: number; }
export interface StackOpts extends ArcadeOpts { accent?: string; onHud?: (s: StackHud) => void; onRunEnd?: (r: StackResult) => void; }

type Flow = "menu" | "playing" | "over";
const MAXL = 7;

export class StackEngine extends ArcadeEngine {
  private opts: StackOpts;
  private accent = "#38bdf8";
  private flow: Flow = "menu";
  private score = 0; private level = 0; private best = +(LS.get("cstack_best") || 0);
  private lockedCenter = -Math.PI / 2; private half = 0.6;
  private sweep = 0; private sweepDir = 1; private sweepSpeed = 1.6;
  private locked: { center: number; half: number; hue: string }[] = []; private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: StackOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }
  private outerR() { return this.rimR * 0.9; }
  private ringR(level: number) { return this.outerR() - level * (this.rimR * 0.1); }
  private hue(level: number) { return ["#f472b6", "#38bdf8", "#34d399", "#fbbf24", "#a78bfa", "#67e8f9", "#fb7185"][level % 7]; }

  start() { this.flow = "playing"; this.score = 0; this.level = 0; this.half = 0.6; this.lockedCenter = -Math.PI / 2; this.sweepSpeed = 1.6; this.locked = []; this.sweep = this.lockedCenter + Math.PI; this.sweepDir = 1; this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.locked = []; this.clearFx(); }
  peekBest() { return this.best; }

  protected onPointerDown() { this.lock(); }
  protected onKeyDown(e: KeyboardEvent) { if (e.key === " ") { e.preventDefault(); this.lock(); } }
  private lock() {
    if (this.flow !== "playing") return;
    const diff = angDiffSigned(this.sweep, this.lockedCenter);
    const overlap = 2 * this.half - Math.abs(diff);
    const R = this.ringR(this.level);
    if (overlap <= 0.02) { this.gameOver(); return; }
    const newHalf = overlap / 2;
    const newCenter = norm(this.lockedCenter + diff / 2);
    this.locked.push({ center: newCenter, half: newHalf, hue: this.hue(this.level) });
    this.score++; this.tone(360 + this.level * 60, 0.07, "triangle", 0.045); this.buzz(6);
    this.shock(this.cx + Math.cos(newCenter) * R, this.cy + Math.sin(newCenter) * R, this.hue(this.level), this.rimR * 0.12);
    this.lockedCenter = newCenter; this.half = newHalf; this.level++;
    if (this.level >= MAXL) { this.score += 5; this.tone(920, 0.25, "sine", 0.05); this.buzz([10, 20, 10]); this.pop(this.cx, this.cy, "TOWER +5", "#fbbf24"); this.level = 0; this.half = 0.6; this.lockedCenter = -Math.PI / 2; this.locked = []; this.sweepSpeed = Math.min(3.2, this.sweepSpeed + 0.3); }
    this.sweep = this.lockedCenter + Math.PI; this.sweepDir = Math.random() < 0.5 ? 1 : -1;
    this.emitHud();
  }

  protected step(dt: number, _now: number) {
    if (this.flow !== "playing") return;
    this.sweep += this.sweepDir * (this.sweepSpeed + this.level * 0.12) * dt;
    this.emitHud();
  }
  private gameOver() { this.flow = "over"; this.shake = 12; this.best = Math.max(this.best, this.score); LS.set("cstack_best", String(this.best)); [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sawtooth", 0.05), i * 120)); this.buzz([30, 50]); this.opts.onRunEnd?.({ score: this.score, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const sig = [this.score, this.level].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ score: this.score, height: this.level, best: this.best }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(56,189,248,.06)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    // guide rings
    for (let l = 0; l <= MAXL; l++) { ctx.beginPath(); ctx.arc(cx, cy, this.ringR(l), 0, TAU); ctx.strokeStyle = "rgba(150,130,255,.07)"; ctx.lineWidth = 1; ctx.stroke(); }
    // locked arcs
    for (let i = 0; i < this.locked.length; i++) { const L = this.locked[i], R = this.ringR(i); ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = L.hue; ctx.strokeStyle = L.hue; ctx.lineWidth = rimR * 0.08; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(cx, cy, R, L.center - L.half, L.center + L.half); ctx.stroke(); ctx.restore(); }
    // moving sweep on the current ring
    const R = this.ringR(this.level); ctx.save(); ctx.shadowBlur = 18; ctx.shadowColor = "#fff"; ctx.strokeStyle = "#fff"; ctx.lineWidth = rimR * 0.08; ctx.lineCap = "round"; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(cx, cy, R, this.sweep - this.half, this.sweep + this.half); ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1;
    // centre goal
    ctx.fillStyle = "rgba(196,181,253,.5)"; ctx.beginPath(); ctx.arc(cx, cy, this.ringR(MAXL) - rimR * 0.04, 0, TAU); ctx.fill();
    if (this.flow === "playing") { ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = "600 12px system-ui"; ctx.textAlign = "center"; ctx.fillText("tap to lock the arc", cx, cy + rimR * 1.0); }
    this.drawFx(now); void now;
  }
}

// signed smallest angle from b to a, in (-PI, PI]
function angDiffSigned(a: number, b: number) { return norm(a - b); }
