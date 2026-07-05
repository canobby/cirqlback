// Cirql Race — engine (CirqlArcade). Slot-car racing on concentric lanes. Inner
// lanes are shorter, so a well-timed dive can gain a whole lap — but everyone's
// jockeying for them. Shift lanes, spend your boost, and take the flag first.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface RaceHud { place: number; lap: number; laps: number; boost: number; }
export interface RaceResult { place: number; score: number; best: number; }
export interface RaceOpts extends ArcadeOpts { accent?: string; onHud?: (s: RaceHud) => void; onRunEnd?: (r: RaceResult) => void; }

type Flow = "menu" | "playing" | "over";
const LANES = 4, TOTAL_LAPS = 3;
interface Racer { angle: number; lane: number; base: number; laps: number; you: boolean; hue: string; laneChangeAt: number; }

export class RaceEngine extends ArcadeEngine {
  private opts: RaceOpts;
  private accent = "#fbbf24";
  private flow: Flow = "menu";
  private racers: Racer[] = []; private best = +(LS.get("crace_best") || 0);
  private boost = 1; private boosting = 0; private t = 0; private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: RaceOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }
  private laneR(l: number) { return this.rimR * (0.4 + 0.5 * (l / (LANES - 1))); }

  start() {
    this.flow = "playing"; this.boost = 1; this.boosting = 0; this.t = 0; this.clearFx();
    const hues = ["#fbbf24", "#f472b6", "#38bdf8", "#34d399"];
    this.racers = hues.map((hue, i) => ({ angle: -Math.PI / 2, lane: i, base: 1.5 + Math.random() * 0.25, laps: 0, you: i === 0, hue, laneChangeAt: 0 }));
    this.emitHud();
  }
  toMenu() { this.flow = "menu"; this.racers = []; this.clearFx(); }
  private me() { return this.racers[0]; }
  nudge(delta: number) { const m = this.me(); if (this.flow === "playing") { m.lane = Math.max(0, Math.min(LANES - 1, m.lane + delta)); this.tone(360, 0.04, "sine", 0.03); } }
  useBoost() { if (this.flow !== "playing" || this.boost < 0.25) return; this.boosting = performance.now() + 900; this.boost = Math.max(0, this.boost - 0.34); this.tone(520, 0.12, "sawtooth", 0.04); this.buzz(10); }
  peekBest() { return this.best; }

  protected onPointerDown(e: PointerEvent) { const p = this.pointerPos(e); this.me().lane = this.nearestLane(Math.hypot(p.x - this.cx, p.y - this.cy)); }
  protected onKeyDown(e: KeyboardEvent) { if (e.key === "ArrowUp" || e.key === "ArrowRight") this.nudge(1); else if (e.key === "ArrowDown" || e.key === "ArrowLeft") this.nudge(-1); else if (e.key === " ") { e.preventDefault(); this.useBoost(); } }
  private nearestLane(r: number) { let b = 0, bd = 1e9; for (let i = 0; i < LANES; i++) { const d = Math.abs(this.laneR(i) - r); if (d < bd) { bd = d; b = i; } } return b; }

  protected step(dt: number, now: number) {
    if (this.flow !== "playing") return;
    this.t += dt;
    if (this.boosting && now > this.boosting) this.boosting = 0;
    if (!this.boosting && this.boost < 1) this.boost = Math.min(1, this.boost + dt * 0.12);
    for (const r of this.racers) {
      const inner = 1 + (LANES - 1 - r.lane) * 0.14; // inner lanes cover angle faster
      let spd = r.base * inner;
      if (r.you && this.boosting) spd *= 1.7;
      if (!r.you) { spd *= 0.97 + 0.06 * Math.sin(this.t * 1.3 + r.lane); if (this.t > r.laneChangeAt) { r.lane = Math.max(0, Math.min(LANES - 1, r.lane + (Math.random() < 0.5 ? -1 : 1))); r.laneChangeAt = this.t + 1 + Math.random() * 2; } }
      const before = r.angle; r.angle += spd * dt;
      if (Math.floor((r.angle + Math.PI / 2) / TAU) > Math.floor((before + Math.PI / 2) / TAU)) { r.laps++; if (r.you) { this.tone(660, 0.1, "sine", 0.045); this.buzz(8); } if (r.laps >= TOTAL_LAPS) { this.finish(); return; } }
    }
    this.emitHud();
  }
  private placement() { const sorted = this.racers.slice().sort((a, b) => (b.laps - a.laps) || (b.angle - a.angle)); return sorted.indexOf(this.me()) + 1; }
  private finish() {
    this.flow = "over"; const place = this.placement();
    const score = [0, 100, 60, 30, 10][place] || 0;
    if (place === 1) { this.burst(this.cx, this.cy, "#fbbf24", 30, this.rimR); [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sine", 0.05), i * 90)); } else { this.tone(300, 0.4, "sine", 0.05); }
    this.buzz([20, 40, 20]); this.best = Math.max(this.best, score); LS.set("crace_best", String(this.best));
    this.opts.onRunEnd?.({ place, score, best: this.best }); this.emitHud();
  }

  private emitHud() { if (!this.opts.onHud) return; const m = this.me(); if (!m) return; const place = this.placement(); const sig = [place, m.laps, Math.round(this.boost * 10)].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ place, lap: m.laps + 1, laps: TOTAL_LAPS, boost: this.boost }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(251,191,36,.06)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    for (let l = 0; l < LANES; l++) { ctx.beginPath(); ctx.arc(cx, cy, this.laneR(l), 0, TAU); ctx.strokeStyle = "rgba(150,130,255,.1)"; ctx.lineWidth = rimR * 0.06; ctx.stroke(); }
    // start/finish line
    ctx.strokeStyle = "rgba(255,255,255,.3)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy - this.laneR(0) - rimR * 0.03); ctx.lineTo(cx, cy - this.laneR(LANES - 1) + rimR * 0.03); ctx.stroke();
    for (const r of this.racers) { const R = this.laneR(r.lane), x = cx + Math.cos(r.angle) * R, y = cy + Math.sin(r.angle) * R; ctx.save(); ctx.shadowBlur = r.you ? 18 : 10; ctx.shadowColor = r.hue; ctx.fillStyle = r.you ? "#fff" : r.hue; ctx.beginPath(); ctx.arc(x, y, rimR * (r.you ? 0.034 : 0.028), 0, TAU); ctx.fill(); if (r.you) { ctx.strokeStyle = r.hue; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, rimR * 0.048, 0, TAU); ctx.stroke(); } ctx.restore(); }
    this.drawFx(now); void now;
  }
}
