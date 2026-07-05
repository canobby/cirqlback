// Cirql Reflex — engine (CirqlCade). Pure reaction. The ring waits, then flares —
// tap the instant it does. Jump early and it's a false start. Five rounds; the
// faster your average, the higher the score.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface ReflexHud { round: number; last: number; best: number; }
export interface ReflexResult { score: number; avg: number; best: number; }
export interface ReflexOpts extends ArcadeOpts { accent?: string; onHud?: (s: ReflexHud) => void; onRunEnd?: (r: ReflexResult) => void; }

type Phase = "menu" | "wait" | "go" | "result" | "over";
const ROUNDS = 5;

export class ReflexEngine extends ArcadeEngine {
  private opts: ReflexOpts;
  private accent = "#67e8f9";
  private phase: Phase = "menu";
  private round = 0; private times: number[] = []; private lastMs = 0;
  private goAt = 0; private flareAt = 0; private best = +(LS.get("creflex_best") || 0);
  private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: ReflexOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }

  start() { this.phase = "wait"; this.round = 0; this.times = []; this.lastMs = 0; this.arm(); this.emitHud(); }
  toMenu() { this.phase = "menu"; this.clearFx(); }
  private arm() { this.phase = "wait"; this.goAt = performance.now() + 900 + Math.random() * 2200; }
  peekBest() { return this.best; }

  protected onPointerDown() { this.react(); }
  protected onKeyDown(e: KeyboardEvent) { if (e.key === " ") { e.preventDefault(); this.react(); } }
  private react() {
    const now = performance.now();
    if (this.phase === "wait") { // false start
      this.lastMs = 999; this.times.push(600); this.shake = 10; this.tone(120, 0.2, "sawtooth", 0.05); this.buzz([20, 40]); this.pop(this.cx, this.cy, "TOO SOON", "#fb7185"); this.finishRound();
    } else if (this.phase === "go") {
      this.lastMs = Math.round(now - this.flareAt); this.times.push(this.lastMs);
      this.tone(660, 0.08, "sine", 0.05); this.buzz(6); this.burst(this.cx, this.cy, this.accent, 12, this.rimR); this.pop(this.cx, this.cy, this.lastMs + " ms", "#fff");
      this.finishRound();
    } else if (this.phase === "result") { this.arm(); this.emitHud(); }
  }
  private finishRound() {
    this.round++; this.phase = "result";
    if (this.round >= ROUNDS) { setTimeout(() => this.gameOver(), 300); }
    else setTimeout(() => { if (this.phase === "result") this.arm(); this.emitHud(); }, 700);
    this.emitHud();
  }

  protected step(_dt: number, now: number) {
    if (this.phase === "wait" && now >= this.goAt) { this.phase = "go"; this.flareAt = now; this.tone(880, 0.05, "triangle", 0.04); }
  }
  private gameOver() {
    this.phase = "over"; const avg = Math.round(this.times.reduce((a, b) => a + b, 0) / Math.max(1, this.times.length));
    const score = this.times.reduce((s, t) => s + Math.max(0, 600 - t), 0);
    this.best = Math.max(this.best, score); LS.set("creflex_best", String(this.best));
    this.opts.onRunEnd?.({ score, avg, best: this.best }); this.emitHud();
  }

  private emitHud() { if (!this.opts.onHud) return; const sig = [this.round, this.lastMs, this.phase].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ round: Math.min(ROUNDS, this.round + (this.phase === "result" ? 0 : 1)), last: this.lastMs, best: this.best }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const go = this.phase === "go";
    const bgc = go ? "rgba(52,211,153,.16)" : this.phase === "wait" ? "rgba(251,113,133,.06)" : "rgba(124,58,237,.06)";
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, bgc); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    // big ring
    const col = go ? "#34d399" : this.phase === "wait" ? "#fb7185" : this.accent;
    ctx.save(); ctx.shadowBlur = go ? 30 : 12; ctx.shadowColor = col; ctx.strokeStyle = col; ctx.lineWidth = rimR * 0.06; ctx.beginPath(); ctx.arc(cx, cy, rimR * 0.6, 0, TAU); ctx.stroke(); ctx.restore();
    if (go) { const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 0.6); fg.addColorStop(0, "rgba(52,211,153,.5)"); fg.addColorStop(1, "rgba(52,211,153,0)"); ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(cx, cy, rimR * 0.6, 0, TAU); ctx.fill(); }
    ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.font = "800 20px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const label = this.phase === "wait" ? "wait…" : go ? "TAP!" : this.phase === "result" ? (this.lastMs === 999 ? "too soon" : this.lastMs + " ms") : "";
    ctx.fillText(label, cx, cy);
    this.drawFx(now); void now;
  }
}
