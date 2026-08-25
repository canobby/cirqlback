// Cirql Breathe — engine (CirqlCade). The calm one. A ring breathes in and out on a
// slow, even count; tap at the top of each inhale and the bottom of each exhale to
// stay with it. Nothing to lose — a still few minutes. Tap Finish when you're ready.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface BreatheHud { breaths: number; phase: string; best: number; }
export interface BreatheResult { breaths: number; best: number; }
export interface BreatheOpts extends ArcadeOpts { accent?: string; onHud?: (s: BreatheHud) => void; onRunEnd?: (r: BreatheResult) => void; }

type Flow = "menu" | "playing" | "over";
// box-ish breathing: inhale, hold, exhale, hold (seconds)
const PHASES: { name: string; dur: number }[] = [
  { name: "Breathe in", dur: 4 }, { name: "Hold", dur: 2 }, { name: "Breathe out", dur: 4 }, { name: "Hold", dur: 2 },
];

export class BreatheEngine extends ArcadeEngine {
  private opts: BreatheOpts;
  private accent = "#f9a8d4";
  private flow: Flow = "menu";
  private breaths = 0; private best = +(LS.get("cbreathe_best") || 0);
  private phase = 0; private pt = 0; private synced = false; private glow = 0; private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: BreatheOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }

  start() { this.flow = "playing"; this.breaths = 0; this.phase = 0; this.pt = 0; this.synced = false; this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.clearFx(); }
  finish() { if (this.flow !== "playing") return; this.flow = "over"; this.best = Math.max(this.best, this.breaths); LS.set("cbreathe_best", String(this.best)); this.opts.onRunEnd?.({ breaths: this.breaths, best: this.best }); this.emitHud(); }
  peekBest() { return this.best; }

  // tap near a phase transition to log a synced breath
  protected onPointerDown() {
    if (this.flow !== "playing") return; const p = PHASES[this.phase]; const nearEdge = this.pt < 0.7 || this.pt > p.dur - 0.7;
    if (nearEdge && !this.synced) { this.synced = true; this.glow = 1; this.tone(this.phase < 2 ? 523 : 392, 0.5, "sine", 0.035); this.buzz(6); if (this.phase === 0 || this.phase === 2) this.breaths++; this.emitHud(); }
  }

  protected step(dt: number, _now: number) {
    if (this.flow !== "playing") return; this.glow = Math.max(0, this.glow - dt * 1.5);
    this.pt += dt; if (this.pt >= PHASES[this.phase].dur) { this.pt = 0; this.phase = (this.phase + 1) % PHASES.length; this.synced = false; this.tone(this.phase === 0 ? 440 : this.phase === 2 ? 330 : 392, 0.2, "sine", 0.02); }
    this.emitHud();
  }

  private emitHud() { if (!this.opts.onHud) return; const sig = [this.breaths, this.phase].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ breaths: this.breaths, phase: PHASES[this.phase].name, best: this.best }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const p = PHASES[this.phase]; const frac = this.pt / p.dur;
    // scale 0..1 across a full cycle (in→hold→out→hold)
    let scale = 0.4;
    if (this.phase === 0) scale = 0.4 + 0.55 * ease(frac);       // inhale grow
    else if (this.phase === 1) scale = 0.95;                     // hold full
    else if (this.phase === 2) scale = 0.95 - 0.55 * ease(frac); // exhale shrink
    else scale = 0.4;                                            // hold empty
    const R = rimR * scale;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.1); g.addColorStop(0, `rgba(249,168,212,${0.08 + 0.12 * scale + 0.15 * this.glow})`); g.addColorStop(0.6, "rgba(167,139,250,.05)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.1, 0, TAU); ctx.fill();
    // breathing orb
    ctx.save(); ctx.shadowBlur = 24 + 20 * this.glow; ctx.shadowColor = this.accent;
    const og = ctx.createRadialGradient(cx, cy, 0, cx, cy, R); og.addColorStop(0, "rgba(255,255,255,.9)"); og.addColorStop(0.5, "rgba(249,168,212,.5)"); og.addColorStop(1, "rgba(249,168,212,.08)");
    ctx.fillStyle = og; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke(); ctx.restore();
    // phase word
    ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.font = "600 16px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(p.name, cx, cy);
    if (this.flow === "playing") { ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.font = "500 11px system-ui"; ctx.fillText("tap as it turns", cx, cy + rimR * 0.9); }
    this.drawFx(now); void now;
  }
}
function ease(t: number) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
