// Cirql Balance — engine (CirqlCade). Keep the marble balanced at the top of the
// ring. Gravity forever pulls it off; tap left or right to nudge it back. Little
// wobbles keep coming and grow stronger — hold the top as long as you can.

import { ArcadeEngine, type ArcadeOpts, TAU, norm, LS } from "./arcade-core";

export interface BalanceHud { time: number; best: number; }
export interface BalanceResult { time: number; best: number; }
export interface BalanceOpts extends ArcadeOpts { accent?: string; onHud?: (s: BalanceHud) => void; onRunEnd?: (r: BalanceResult) => void; }

type Flow = "menu" | "playing" | "over";
const TOP = -Math.PI / 2;

export class BalanceEngine extends ArcadeEngine {
  private opts: BalanceOpts;
  private accent = "#fbbf24";
  private flow: Flow = "menu";
  private ma = TOP; private mav = 0; private t = 0; private best = +(LS.get("cbalance_best") || 0);
  private nextGust = 0; private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: BalanceOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }
  private ringR() { return this.rimR * 0.72; }

  start() { this.flow = "playing"; this.ma = TOP + (Math.random() - 0.5) * 0.2; this.mav = 0; this.t = 0; this.nextGust = 2; this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.clearFx(); }
  nudge(dir: number) { if (this.flow === "playing") { this.mav += dir * 1.1; this.tone(360, 0.04, "sine", 0.03); this.buzz(4); const x = this.cx + Math.cos(this.ma) * this.ringR(), y = this.cy + Math.sin(this.ma) * this.ringR(); this.burst(x, y, this.accent, 4, this.rimR * 0.3); } }
  peekBest() { return this.best; }

  protected onPointerDown(e: PointerEvent) { const p = this.pointerPos(e); this.nudge(p.x < this.cx ? -1 : 1); }
  protected onKeyDown(e: KeyboardEvent) { if (e.key === "ArrowLeft") this.nudge(-1); else if (e.key === "ArrowRight") this.nudge(1); }

  protected step(dt: number, _now: number) {
    if (this.flow !== "playing") return;
    this.t += dt;
    const off = norm(this.ma - TOP); // 0 at top, ±PI at bottom
    // inverted-pendulum gravity: pushes away from the top
    this.mav += Math.sin(off) * 5.2 * dt;
    // random gusts, growing with time
    this.nextGust -= dt; if (this.nextGust <= 0) { this.mav += (Math.random() - 0.5) * (0.6 + Math.min(1.6, this.t * 0.05)); this.nextGust = 0.8 + Math.random() * 1.2; }
    this.mav *= 0.996; this.ma += this.mav * dt;
    if (Math.abs(norm(this.ma - TOP)) > 2.5) { this.gameOver(); return; }
    this.emitHud();
  }
  private gameOver() { this.flow = "over"; this.shake = 12; const x = this.cx + Math.cos(this.ma) * this.ringR(), y = this.cy + Math.sin(this.ma) * this.ringR(); this.burst(x, y, "#fb7185", 18, this.rimR * 0.9); [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sawtooth", 0.05), i * 120)); this.buzz([30, 50]); const time = Math.round(this.t * 10); this.best = Math.max(this.best, time); LS.set("cbalance_best", String(this.best)); this.opts.onRunEnd?.({ time, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const time = Math.round(this.t * 10); const sig = String(time); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ time, best: this.best }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this; const R = this.ringR(); const off = Math.abs(norm(this.ma - TOP));
    const danger = Math.min(1, off / 2.5);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, `rgba(${251},${191 - danger * 100},${36},${0.05 + 0.08 * danger})`); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    // ring
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.strokeStyle = "rgba(150,130,255,.16)"; ctx.lineWidth = 3; ctx.stroke();
    // top target zone
    ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = "#34d399"; ctx.strokeStyle = "rgba(52,211,153,.6)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, R, TOP - 0.18, TOP + 0.18); ctx.stroke(); ctx.restore();
    // marble
    const x = cx + Math.cos(this.ma) * R, y = cy + Math.sin(this.ma) * R;
    ctx.save(); ctx.shadowBlur = 16; ctx.shadowColor = off < 0.5 ? "#34d399" : this.accent; const mg = ctx.createRadialGradient(x - 4, y - 4, 0, x, y, rimR * 0.045); mg.addColorStop(0, "#fff"); mg.addColorStop(1, off < 0.5 ? "#34d399" : this.accent); ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(x, y, rimR * 0.045, 0, TAU); ctx.fill(); ctx.restore();
    if (this.flow === "playing") { ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = "600 12px system-ui"; ctx.textAlign = "center"; ctx.fillText("tap left / right to balance at the top", cx, cy); }
    this.drawFx(now); void now;
  }
}
