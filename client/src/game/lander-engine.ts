// Cirql Lander — engine (CirqlCade). Lunar Lander, dropping to a planet. Gravity
// pulls you toward the centre; tap to fire the retro-thruster and slow your descent,
// steer around to line up with the pad, and touch down gently. Land soft and you
// bank the fuel you saved; come in hot and you crash.

import { ArcadeEngine, type ArcadeOpts, TAU, norm, angDiff, LS } from "./arcade-core";

export interface LanderHud { score: number; lives: number; fuel: number; }
export interface LanderResult { score: number; best: number; }
export interface LanderOpts extends ArcadeOpts { accent?: string; onHud?: (s: LanderHud) => void; onRunEnd?: (r: LanderResult) => void; }

type Flow = "menu" | "playing" | "over";

export class LanderEngine extends ArcadeEngine {
  private opts: LanderOpts;
  private accent = "#67e8f9";
  private flow: Flow = "menu";
  private score = 0; private lives = 3; private fuel = 1; private best = +(LS.get("clander_best") || 0);
  private a = -Math.PI / 2; private r = 0; private vr = 0; private padA = 0; private padW = 0.5; private thrusting = false;
  private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: LanderOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }
  private padR() { return this.rimR * 0.28; }
  private safeSpeed() { return this.rimR * 0.35; }

  start() { this.flow = "playing"; this.score = 0; this.lives = 3; this.newAttempt(); this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.clearFx(); }
  private newAttempt() { this.a = -Math.PI / 2 + (Math.random() - 0.5); this.r = this.rimR * 0.92; this.vr = 0; this.fuel = 1; this.padA = Math.random() * TAU; this.padW = 0.5; }
  steer(a: number) { this.a = a; }
  thrustDown() { this.thrusting = true; }
  thrustUp() { this.thrusting = false; }
  setCosmetic(c: string) { this.accent = c || "#67e8f9"; }
  peekBest() { return this.best; }

  protected onPointerDown(e: PointerEvent) { const p = this.pointerPos(e); const d = Math.hypot(p.x - this.cx, p.y - this.cy); if (d > this.rimR * 0.5) this.a = Math.atan2(p.y - this.cy, p.x - this.cx); this.thrusting = true; }
  protected onPointerMove(e: PointerEvent) { if (this.thrusting) { const p = this.pointerPos(e); const d = Math.hypot(p.x - this.cx, p.y - this.cy); if (d > this.rimR * 0.5) this.a = Math.atan2(p.y - this.cy, p.x - this.cx); } }
  protected onPointerUp() { this.thrusting = false; }
  protected onKeyDown(e: KeyboardEvent) { if (e.key === " ") this.thrusting = true; else if (e.key === "ArrowLeft") this.a -= 0.12; else if (e.key === "ArrowRight") this.a += 0.12; }

  protected step(dt: number, _now: number) {
    if (this.flow !== "playing") return;
    this.vr -= this.rimR * 0.9 * dt; // gravity inward
    if (this.thrusting && this.fuel > 0) { this.vr += this.rimR * 2.0 * dt; this.fuel = Math.max(0, this.fuel - dt * 0.32); const x = this.cx + Math.cos(this.a) * this.r, y = this.cy + Math.sin(this.a) * this.r; this.burst(x, y, this.accent, 2, this.rimR * 0.4); if (Math.random() < 0.3) this.tone(120 + Math.random() * 40, 0.04, "sawtooth", 0.02); }
    this.r += this.vr * dt;
    if (this.r > this.rimR * 0.96) { this.r = this.rimR * 0.96; this.vr = Math.min(0, this.vr); }
    if (this.r <= this.padR()) { this.touchdown(); }
    this.emitHud();
  }
  private touchdown() {
    const onPad = angDiff(this.a, this.padA) < this.padW / 2; const soft = Math.abs(this.vr) < this.safeSpeed();
    const x = this.cx + Math.cos(this.a) * this.padR(), y = this.cy + Math.sin(this.a) * this.padR();
    if (onPad && soft) { const gain = 100 + Math.round(this.fuel * 100); this.score += gain; this.burst(x, y, "#34d399", 14, this.rimR * 0.6); this.shock(x, y, "#34d399", this.rimR * 0.2); this.pop(x, y - 20, "+" + gain, "#34d399"); [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.2, "sine", 0.05), i * 90)); this.buzz([10, 20]); this.newAttempt(); }
    else { this.lives--; this.shake = 14; this.burst(x, y, "#fb7185", 22, this.rimR); this.tone(90, 0.4, "sawtooth", 0.06); this.buzz([30, 50, 30]); if (this.lives <= 0) this.gameOver(); else this.newAttempt(); }
    this.emitHud();
  }
  private gameOver() { this.flow = "over"; this.best = Math.max(this.best, this.score); LS.set("clander_best", String(this.best)); [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sine", 0.05), i * 120)); this.opts.onRunEnd?.({ score: this.score, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const sig = [this.score, this.lives, Math.round(this.fuel * 20)].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ score: this.score, lives: this.lives, fuel: this.fuel }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(103,232,249,.05)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    // planet
    ctx.fillStyle = "rgba(90,84,140,.5)"; ctx.beginPath(); ctx.arc(cx, cy, this.padR(), 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(150,130,255,.2)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, this.padR(), 0, TAU); ctx.stroke();
    // landing pad
    ctx.save(); ctx.shadowBlur = 12; ctx.shadowColor = "#34d399"; ctx.strokeStyle = "#34d399"; ctx.lineWidth = rimR * 0.05; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(cx, cy, this.padR(), this.padA - this.padW / 2, this.padA + this.padW / 2); ctx.stroke(); ctx.restore();
    // craft
    const x = cx + Math.cos(this.a) * this.r, y = cy + Math.sin(this.a) * this.r; const fast = Math.abs(this.vr) > this.safeSpeed();
    ctx.save(); ctx.translate(x, y); ctx.rotate(this.a + Math.PI / 2); ctx.shadowBlur = 12; ctx.shadowColor = fast ? "#fb7185" : this.accent; ctx.fillStyle = fast ? "#fb7185" : "#fff"; ctx.beginPath(); ctx.moveTo(0, -rimR * 0.03); ctx.lineTo(-rimR * 0.025, rimR * 0.025); ctx.lineTo(rimR * 0.025, rimR * 0.025); ctx.closePath(); ctx.fill();
    if (this.thrusting && this.fuel > 0) { ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.moveTo(-rimR * 0.015, rimR * 0.028); ctx.lineTo(rimR * 0.015, rimR * 0.028); ctx.lineTo(0, rimR * 0.028 + rimR * 0.03 * (0.6 + Math.random() * 0.5)); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    if (this.flow === "playing") { ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = "600 12px system-ui"; ctx.textAlign = "center"; ctx.fillText("hold to thrust · drag to steer · land soft on the pad", cx, cy + rimR * 1.05); }
    this.drawFx(now); void now;
  }
}
