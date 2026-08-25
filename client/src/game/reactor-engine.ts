// Cirql Reactor — engine (CirqlArcade). Simon, on a ring of six segments.
// The reactor lights a growing sequence; you play it back by tapping the segments.
// One more each round; a wrong tap ends it. Pure memory — perfect for a board.

import { ArcadeEngine, type ArcadeOpts, TAU, norm, LS } from "./arcade-core";

export interface ReactorHud { round: number; best: number; watching: boolean; }
export interface ReactorResult { round: number; best: number; }
export interface ReactorOpts extends ArcadeOpts { accent?: string; onHud?: (s: ReactorHud) => void; onRunEnd?: (r: ReactorResult) => void; }

type Flow = "menu" | "watch" | "input" | "over";
const SEGN = 6;
const SEG_A = TAU / SEGN;
const SEG_COLORS = ["#f472b6", "#38bdf8", "#34d399", "#fbbf24", "#a78bfa", "#fb7185"];
const SEG_TONES = [261.63, 329.63, 392.0, 440.0, 523.25, 659.25];

export class ReactorEngine extends ArcadeEngine {
  private opts: ReactorOpts;
  private accent = "#a78bfa";
  private flow: Flow = "menu";
  private seq: number[] = [];
  private inputAt = 0;
  private best = +(LS.get("creactor_best") || 0);
  private lit = -1; private litUntil = 0;
  private playAt = 0; private playIdx = 0;
  private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: ReactorOpts = {}) {
    super(canvas, opts); this.opts = opts; if (opts.accent) this.accent = opts.accent; this.emitHud();
  }

  start() { this.flow = "watch"; this.seq = [Math.floor(Math.random() * SEGN)]; this.beginWatch(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.seq = []; this.clearFx(); }
  peekBest() { return this.best; }

  private beginWatch() { this.flow = "watch"; this.playIdx = 0; this.playAt = performance.now() + 500; this.inputAt = 0; this.emitHud(); }
  private flash(seg: number, dur: number) {
    this.lit = seg; this.litUntil = performance.now() + dur;
    this.tone(SEG_TONES[seg], dur / 1000 * 0.9, "sine", 0.05); this.buzz(8);
    const a = (seg + 0.5) * SEG_A; this.shock(this.cx + Math.cos(a) * this.rimR * 0.6, this.cy + Math.sin(a) * this.rimR * 0.6, SEG_COLORS[seg], this.rimR * 0.3);
  }

  protected onPointerDown(e: PointerEvent) {
    if (this.flow !== "input") return;
    const a = this.pointerAngle(e);
    const seg = (Math.floor(norm(a) / SEG_A) % SEGN + SEGN) % SEGN;
    this.flash(seg, 260);
    if (seg === this.seq[this.inputAt]) {
      this.inputAt++;
      if (this.inputAt >= this.seq.length) { // round complete
        this.tone(880, 0.18, "sine", 0.05);
        this.seq.push(Math.floor(Math.random() * SEGN));
        this.flow = "watch"; setTimeout(() => this.beginWatch(), 500);
      }
    } else { this.gameOver(); }
    this.emitHud();
  }

  private gameOver() {
    this.flow = "over"; this.shake = 12; this.burst(this.cx, this.cy, "#fb7185", 24, this.rimR);
    [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.5, "sawtooth", 0.05), i * 130)); this.buzz([40, 60, 40]);
    const round = this.seq.length - 1;
    this.best = Math.max(this.best, round); LS.set("creactor_best", String(this.best));
    this.opts.onRunEnd?.({ round, best: this.best });
    this.emitHud();
  }

  protected step(_dt: number, now: number) {
    if (this.lit >= 0 && now > this.litUntil) this.lit = -1;
    if (this.flow === "watch" && now >= this.playAt && this.lit < 0) {
      if (this.playIdx < this.seq.length) { this.flash(this.seq[this.playIdx], 420); this.playIdx++; this.playAt = now + 620; }
      else { this.flow = "input"; this.inputAt = 0; }
      this.emitHud();
    }
  }

  private emitHud() {
    if (!this.opts.onHud) return;
    const sig = [this.seq.length, this.flow].join("|");
    if (sig === this.lastHud) return; this.lastHud = sig;
    this.opts.onHud({ round: Math.max(0, this.seq.length - 1), best: this.best, watching: this.flow === "watch" });
  }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15);
    g.addColorStop(0, "rgba(124,58,237,.1)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    const inner = rimR * 0.32, outer = rimR * 0.86;
    for (let i = 0; i < SEGN; i++) {
      const a0 = i * SEG_A + 0.04, a1 = (i + 1) * SEG_A - 0.04;
      const on = this.lit === i;
      ctx.beginPath(); ctx.arc(cx, cy, outer, a0, a1); ctx.arc(cx, cy, inner, a1, a0, true); ctx.closePath();
      ctx.save(); ctx.globalAlpha = on ? 1 : 0.22; ctx.shadowBlur = on ? 28 : 6; ctx.shadowColor = SEG_COLORS[i]; ctx.fillStyle = SEG_COLORS[i]; ctx.fill(); ctx.restore();
      ctx.globalAlpha = 1;
    }
    // core
    const watching = this.flow === "watch";
    const cr = rimR * 0.16 * (1 + 0.06 * Math.sin(now / 300));
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr * 2);
    cg.addColorStop(0, "#fff"); cg.addColorStop(0.5, watching ? "rgba(167,139,250,.7)" : "rgba(52,211,153,.6)"); cg.addColorStop(1, "rgba(124,58,237,0)");
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, cr * 2, 0, TAU); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx, cy, cr * 0.5, 0, TAU); ctx.fill();
    this.drawFx(now);
  }
}
