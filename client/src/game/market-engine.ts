// Cirql Market — engine (CirqlCade, Strategy). Three goods orbit the ring, their
// prices rising and falling. Select a good and BUY low, SELL high, and grow your
// net worth past a rival trader before the clock runs out.

import { ArcadeEngine, type ArcadeOpts, TAU, LS, clamp } from "./arcade-core";

export interface MarketHud { net: number; ai: number; cash: number; time: number; }
export interface MarketResult { won: boolean; net: number; ai: number; best: number; }
export interface MarketOpts extends ArcadeOpts { accent?: string; onHud?: (s: MarketHud) => void; onRunEnd?: (r: MarketResult) => void; }

type Flow = "menu" | "playing" | "over";
const N = 3, MATCH = 60, NAMES = ["Aur", "Cyn", "Mag"];

export class MarketEngine extends ArcadeEngine {
  private opts: MarketOpts;
  private accent = "#34d399";
  private flow: Flow = "menu";
  private price: number[] = []; private avg: number[] = []; private hold: number[] = []; private cash = 100;
  private aiHold: number[] = []; private aiCash = 100;
  private sel = 0; private t = 0; private time = MATCH; private aiT = 0;
  private best = +(LS.get("cmarket_best") || 0); private lastHud = ""; private ph: number[] = []; private per: number[] = [];

  constructor(canvas: HTMLCanvasElement, opts: MarketOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.reset(); this.emitHud(); }
  private reset() {
    this.price = []; this.avg = []; this.hold = []; this.aiHold = []; this.ph = []; this.per = [];
    for (let i = 0; i < N; i++) { const base = 20 + i * 8; this.price.push(base); this.avg.push(base); this.hold.push(0); this.aiHold.push(0); this.ph.push(Math.random() * TAU); this.per.push(0.5 + Math.random() * 0.5); }
    this.cash = 100; this.aiCash = 100; this.sel = 0; this.t = 0; this.time = MATCH; this.aiT = 1.4;
  }
  start() { this.flow = "playing"; this.reset(); this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; }
  peekBest() { return this.best; }

  buy() { if (this.flow !== "playing") return; const p = this.price[this.sel]; if (this.cash >= p) { this.cash -= p; this.hold[this.sel]++; this.tone(520, 0.05, "square", 0.03); this.emitHud(); } }
  sell() { if (this.flow !== "playing") return; if (this.hold[this.sel] > 0) { this.cash += this.price[this.sel]; this.hold[this.sel]--; this.tone(360, 0.05, "square", 0.03); this.emitHud(); } }

  private net(cash: number, hold: number[]) { let v = cash; for (let i = 0; i < N; i++) v += hold[i] * this.price[i]; return Math.round(v); }
  private aiTrade() {
    // A cautious rival — trades only some opportunities and with a slim edge, so an
    // active player can out-hustle it.
    for (let i = 0; i < N; i++) {
      if (Math.random() > 0.55) continue;
      if (this.price[i] < this.avg[i] * 0.9 && this.aiCash >= this.price[i]) { this.aiCash -= this.price[i]; this.aiHold[i]++; }
      else if (this.price[i] > this.avg[i] * 1.1 && this.aiHold[i] > 0) { this.aiCash += this.price[i]; this.aiHold[i]--; }
    }
  }

  protected onPointerDown(e: PointerEvent) {
    if (this.flow !== "playing") return; const p = this.pointerPos(e);
    let hit = -1, bd = this.rimR * 0.3; for (let i = 0; i < N; i++) { const c = this.nodePos(i); const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < bd) { bd = d; hit = i; } }
    if (hit >= 0) { this.sel = hit; this.tone(440, 0.04, "triangle", 0.02); this.emitHud(); }
  }

  protected step(dt: number, _now: number) {
    if (this.flow !== "playing") return;
    this.t += dt;
    for (let i = 0; i < N; i++) {
      const base = 20 + i * 8;
      this.price[i] = clamp(base + base * 0.75 * Math.sin(this.t * this.per[i] + this.ph[i]) + (Math.random() - 0.5) * base * 0.06, 4, base * 2.4);
      this.avg[i] += (this.price[i] - this.avg[i]) * dt * 0.35;
    }
    this.aiT -= dt; if (this.aiT <= 0) { this.aiT = 2 + Math.random() * 1.5; this.aiTrade(); }
    this.time -= dt; if (this.time <= 0) this.gameOver();
    this.emitHud();
  }
  private gameOver() { this.flow = "over"; const net = this.net(this.cash, this.hold), ai = this.net(this.aiCash, this.aiHold); const won = net > ai; this.best = Math.max(this.best, net); LS.set("cmarket_best", String(this.best)); this.opts.onRunEnd?.({ won, net, ai, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const net = this.net(this.cash, this.hold), ai = this.net(this.aiCash, this.aiHold); const sig = [net, ai, Math.ceil(this.time)].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ net, ai, cash: Math.round(this.cash), time: Math.max(0, Math.ceil(this.time)) }); }

  private nodePos(i: number) { const a = -Math.PI / 2 + i * (TAU / N); return { x: this.cx + Math.cos(a) * this.rimR * 0.55, y: this.cy + Math.sin(a) * this.rimR * 0.55 }; }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    for (let i = 0; i < N; i++) {
      const c = this.nodePos(i), up = this.price[i] >= this.avg[i]; const col = up ? "#34d399" : "#fb7185";
      if (i === this.sel) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(c.x, c.y, rimR * 0.17, 0, TAU); ctx.stroke(); }
      ctx.fillStyle = col + "22"; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.shadowBlur = 12; ctx.shadowColor = col;
      ctx.beginPath(); ctx.arc(c.x, c.y, rimR * 0.15, 0, TAU); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = "800 15px system-ui"; ctx.fillText(`$${Math.round(this.price[i])}`, c.x, c.y - 6);
      ctx.font = "600 10px system-ui"; ctx.fillStyle = "rgba(230,233,255,.6)"; ctx.fillText(`${NAMES[i]} · ${up ? "▲" : "▼"}`, c.x, c.y + 10);
      ctx.fillStyle = this.accent; ctx.font = "700 11px system-ui"; ctx.fillText(`you: ${this.hold[i]}`, c.x, c.y + rimR * 0.2);
    }
    ctx.fillStyle = "rgba(230,233,255,.7)"; ctx.textAlign = "center"; ctx.font = "700 13px system-ui";
    ctx.fillText(`Cash $${Math.round(this.cash)}`, cx, cy);
    void now;
  }
}
