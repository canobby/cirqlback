// Cirql Flip — engine (CirqlCade). Lights-Out on a ring. Tapping a segment toggles
// it and its two neighbours; light the whole ring to solve it. Puzzles are scrambled
// from solved so they're always solvable. Beat the clock.

import { ArcadeEngine, type ArcadeOpts, TAU, norm, LS } from "./arcade-core";

export interface FlipHud { solved: number; time: number; best: number; }
export interface FlipResult { solved: number; best: number; }
export interface FlipOpts extends ArcadeOpts { accent?: string; onHud?: (s: FlipHud) => void; onRunEnd?: (r: FlipResult) => void; }

type Flow = "menu" | "playing" | "over";
const SEG = 9, SEG_A = TAU / 9, RUN_TIME = 60;

export class FlipEngine extends ArcadeEngine {
  private opts: FlipOpts;
  private accent = "#34d399";
  private flow: Flow = "menu";
  private on: boolean[] = []; private solved = 0; private timeLeft = RUN_TIME; private best = +(LS.get("cflip_best") || 0);
  private flash = -1; private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: FlipOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }
  private ringR() { return this.rimR * 0.62; }

  start() { this.flow = "playing"; this.solved = 0; this.timeLeft = RUN_TIME; this.scramble(); this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.clearFx(); }
  private scramble() {
    this.on = new Array(SEG).fill(true);
    const taps = 3 + Math.floor(Math.random() * (SEG - 2));
    for (let i = 0; i < taps; i++) this.toggle(Math.floor(Math.random() * SEG), true);
    if (this.on.every((v) => v)) this.toggle(0, true); // never start solved
  }
  private toggle(seg: number, silent?: boolean) { for (const s of [seg, (seg + 1) % SEG, (seg + SEG - 1) % SEG]) this.on[s] = !this.on[s]; if (!silent) { this.flash = seg; this.tone(300 + seg * 20, 0.05, "sine", 0.04); this.buzz(4); } }
  peekBest() { return this.best; }

  protected onPointerDown(e: PointerEvent) {
    if (this.flow !== "playing") return; const a = this.pointerAngle(e); const seg = (Math.round(norm(a + Math.PI / 2) / SEG_A) % SEG + SEG) % SEG;
    this.toggle(seg);
    if (this.on.every((v) => v)) { this.solved++; this.tone(920, 0.2, "sine", 0.05); this.buzz([8, 16]); this.shock(this.cx, this.cy, this.accent, this.ringR()); this.pop(this.cx, this.cy, "SOLVED", "#34d399"); this.scramble(); }
    this.emitHud();
  }

  protected step(dt: number, _now: number) { if (this.flow !== "playing") return; this.flash = -1; this.timeLeft -= dt; if (this.timeLeft <= 0) { this.timeLeft = 0; this.gameOver(); } this.emitHud(); }
  private gameOver() { this.flow = "over"; this.best = Math.max(this.best, this.solved); LS.set("cflip_best", String(this.best)); [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sine", 0.05), i * 120)); this.opts.onRunEnd?.({ solved: this.solved, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const sig = [this.solved, Math.ceil(this.timeLeft)].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ solved: this.solved, time: Math.ceil(this.timeLeft), best: this.best }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this; const R = this.ringR();
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(52,211,153,.05)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    for (let s = 0; s < SEG; s++) {
      const a0 = s * SEG_A - Math.PI / 2 - SEG_A / 2 + 0.04, a1 = s * SEG_A - Math.PI / 2 + SEG_A / 2 - 0.04;
      const lit = this.on[s];
      ctx.save(); ctx.shadowBlur = lit ? 18 : 4; ctx.shadowColor = this.accent; ctx.strokeStyle = lit ? this.accent : "rgba(120,110,170,.3)"; ctx.globalAlpha = lit ? 1 : 0.5; ctx.lineWidth = rimR * 0.07; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1;
    }
    if (this.flow === "playing") { ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = "600 12px system-ui"; ctx.textAlign = "center"; ctx.fillText("tap to flip a segment + its neighbours", cx, cy); ctx.fillText("light them all", cx, cy + 18); }
    this.drawFx(now); void now;
  }
}
