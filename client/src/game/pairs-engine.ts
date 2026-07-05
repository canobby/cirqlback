// Cirql Pairs — engine (CirqlCade). Memory match on a ring of cards. Flip two; a
// match stays lit, a miss flips back. Clear the ring and a bigger one appears.
// Sixty seconds — how many pairs can you remember?

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface PairsHud { pairs: number; time: number; best: number; }
export interface PairsResult { pairs: number; best: number; }
export interface PairsOpts extends ArcadeOpts { accent?: string; onHud?: (s: PairsHud) => void; onRunEnd?: (r: PairsResult) => void; }

type Flow = "menu" | "playing" | "over";
const RUN_TIME = 60;
const SYMS = ["#f472b6", "#38bdf8", "#34d399", "#fbbf24", "#a78bfa", "#fb7185", "#67e8f9", "#c4b5fd", "#fda4af", "#6ee7b7"];
interface Card { sym: number; revealed: boolean; matched: boolean; }

export class PairsEngine extends ArcadeEngine {
  private opts: PairsOpts;
  private accent = "#a78bfa";
  private flow: Flow = "menu";
  private cards: Card[] = []; private first = -1; private lockUntil = 0;
  private pairs = 0; private level = 1; private timeLeft = RUN_TIME; private best = +(LS.get("cpairs_best") || 0);
  private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: PairsOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }
  private ringR() { return this.rimR * 0.68; }
  private cardXY(i: number) { const a = (i / this.cards.length) * TAU - Math.PI / 2; return { x: this.cx + Math.cos(a) * this.ringR(), y: this.cy + Math.sin(a) * this.ringR() }; }

  start() { this.flow = "playing"; this.pairs = 0; this.level = 1; this.timeLeft = RUN_TIME; this.first = -1; this.lockUntil = 0; this.build(); this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.cards = []; this.clearFx(); }
  private build() {
    const nPairs = Math.min(SYMS.length, 3 + this.level);
    const deck: number[] = []; for (let i = 0; i < nPairs; i++) { deck.push(i, i); }
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    this.cards = deck.map((sym) => ({ sym, revealed: false, matched: false })); this.first = -1;
  }
  peekBest() { return this.best; }

  protected onPointerDown(e: PointerEvent) {
    if (this.flow !== "playing" || performance.now() < this.lockUntil) return;
    const p = this.pointerPos(e);
    for (let i = 0; i < this.cards.length; i++) { const c = this.cards[i]; if (c.matched || c.revealed) continue; const xy = this.cardXY(i); if (Math.hypot(xy.x - p.x, xy.y - p.y) < this.rimR * 0.08) { this.flip(i); return; } }
  }
  private flip(i: number) {
    this.cards[i].revealed = true; this.tone(360, 0.05, "sine", 0.04); this.buzz(4);
    if (this.first < 0) { this.first = i; return; }
    if (this.cards[this.first].sym === this.cards[i].sym) {
      this.cards[this.first].matched = true; this.cards[i].matched = true; this.pairs++; this.first = -1;
      const xy = this.cardXY(i); this.burst(xy.x, xy.y, SYMS[this.cards[i].sym], 8, this.rimR * 0.6); this.tone(720, 0.1, "triangle", 0.045); this.buzz(6);
      if (this.cards.every((c) => c.matched)) { this.level++; this.tone(920, 0.2, "sine", 0.05); this.pop(this.cx, this.cy, "CLEARED", "#34d399"); this.build(); }
    } else { this.lockUntil = performance.now() + 650; const f = this.first; this.first = -1; setTimeout(() => { if (this.cards[f]) this.cards[f].revealed = false; if (this.cards[i]) this.cards[i].revealed = false; }, 640); }
    this.emitHud();
  }

  protected step(dt: number, _now: number) { if (this.flow !== "playing") return; this.timeLeft -= dt; if (this.timeLeft <= 0) { this.timeLeft = 0; this.gameOver(); } this.emitHud(); }
  private gameOver() { this.flow = "over"; this.best = Math.max(this.best, this.pairs); LS.set("cpairs_best", String(this.best)); [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sine", 0.05), i * 120)); this.opts.onRunEnd?.({ pairs: this.pairs, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const sig = [this.pairs, Math.ceil(this.timeLeft)].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ pairs: this.pairs, time: Math.ceil(this.timeLeft), best: this.best }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(167,139,250,.06)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    const cr = rimR * 0.062;
    for (let i = 0; i < this.cards.length; i++) {
      const c = this.cards[i]; const xy = this.cardXY(i); const show = c.revealed || c.matched;
      ctx.save(); ctx.shadowBlur = show ? 12 : 4; ctx.shadowColor = show ? SYMS[c.sym] : "#6d6a9c";
      ctx.fillStyle = show ? SYMS[c.sym] : "rgba(40,36,64,.9)"; ctx.globalAlpha = c.matched ? 1 : show ? 0.95 : 0.8;
      ctx.beginPath(); ctx.arc(xy.x, xy.y, cr, 0, TAU); ctx.fill();
      if (!show) { ctx.globalAlpha = 0.5; ctx.strokeStyle = "rgba(150,130,255,.4)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(xy.x, xy.y, cr * 0.55, 0, TAU); ctx.stroke(); }
      ctx.restore(); ctx.globalAlpha = 1;
    }
    this.drawFx(now); void now;
  }
}
