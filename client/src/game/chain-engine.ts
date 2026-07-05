// Cirql Chain — engine (CirqlArcade). Chain-reaction. Tap once to detonate; the
// blast ignites nearby orbs, which ignite their neighbours, and the whole field
// goes up in a cascade. Ignite enough to clear the round. Very satisfying.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface ChainHud { round: number; needed: number; ignited: number; best: number; armed: boolean; }
export interface ChainResult { round: number; best: number; }
export interface ChainOpts extends ArcadeOpts { accent?: string; onHud?: (s: ChainHud) => void; onRunEnd?: (r: ChainResult) => void; }

type Flow = "menu" | "armed" | "resolving" | "over";
interface Orb { x: number; y: number; vx: number; vy: number; hue: string; lit: boolean; r: number; }
interface Blast { x: number; y: number; r: number; max: number; life: number; hue: string; }
const HUES = ["#f472b6", "#38bdf8", "#34d399", "#fbbf24", "#a78bfa"];

export class ChainEngine extends ArcadeEngine {
  private opts: ChainOpts;
  private accent = "#fbbf24";
  private flow: Flow = "menu";
  private round = 1; private ignited = 0; private needed = 1; private score = 0;
  private best = +(LS.get("cchain_best") || 0);
  private orbs: Orb[] = []; private blasts: Blast[] = [];
  private settle = 0; private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: ChainOpts = {}) { super(canvas, opts); this.opts = opts; if (opts.accent) this.accent = opts.accent; this.emitHud(); }

  start() { this.flow = "armed"; this.round = 1; this.score = 0; this.spawnRound(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.orbs = []; this.blasts = []; this.clearFx(); }
  peekBest() { return this.best; }

  private spawnRound() {
    const n = 5 + this.round * 2;
    this.needed = Math.ceil(n * (0.45 + Math.min(0.25, this.round * 0.02)));
    this.ignited = 0; this.orbs = []; this.blasts = []; this.settle = 0; this.flow = "armed";
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, r = this.rimR * (0.2 + Math.random() * 0.72);
      this.orbs.push({ x: this.cx + Math.cos(a) * r, y: this.cy + Math.sin(a) * r, vx: (Math.random() - 0.5) * this.rimR * 0.12, vy: (Math.random() - 0.5) * this.rimR * 0.12, hue: HUES[i % HUES.length], lit: false, r: this.rimR * 0.028 });
    }
  }
  private detonate(x: number, y: number) {
    this.blasts.push({ x, y, r: 4, max: this.rimR * 0.2, life: 1, hue: this.accent });
    this.tone(180, 0.2, "sawtooth", 0.05); this.buzz(14); this.shock(x, y, this.accent, this.rimR * 0.2);
    this.flow = "resolving"; this.emitHud();
  }
  private ignite(o: Orb) {
    o.lit = true; this.ignited++;
    this.blasts.push({ x: o.x, y: o.y, r: 4, max: this.rimR * 0.19, life: 1, hue: o.hue });
    this.burst(o.x, o.y, o.hue, 12, this.rimR * 1.0); this.shock(o.x, o.y, o.hue, this.rimR * 0.16);
    const f = 300 + Math.min(this.ignited, 24) * 28; this.tone(f, 0.12, "triangle", 0.045); this.buzz(6);
    this.score += 10 * this.ignited;
  }

  protected onPointerDown(e: PointerEvent) { if (this.flow !== "armed") return; const p = this.pointerPos(e); this.detonate(p.x, p.y); }

  protected step(dt: number, _now: number) {
    if (this.flow === "menu" || this.flow === "over") return;
    for (const o of this.orbs) { if (o.lit) continue; o.x += o.vx * dt; o.y += o.vy * dt; const dx = o.x - this.cx, dy = o.y - this.cy, d = Math.hypot(dx, dy) || 1; if (d > this.rimR * 0.95) { o.vx -= dx / d * this.rimR * 0.4 * dt; o.vy -= dy / d * this.rimR * 0.4 * dt; } }
    for (const b of this.blasts) { b.r += (b.max - b.r) * Math.min(1, dt * 5); b.life -= dt * 1.4; }
    // ignition
    for (const b of this.blasts) { if (b.life < 0.35) continue; for (const o of this.orbs) { if (!o.lit && Math.hypot(o.x - b.x, o.y - b.y) < b.r + o.r) this.ignite(o); } }
    this.blasts = this.blasts.filter((b) => b.life > 0);

    if (this.flow === "resolving") {
      if (this.blasts.length === 0) { this.settle += dt; if (this.settle > 0.4) this.resolve(); }
      else this.settle = 0;
    }
    this.emitHud();
  }
  private resolve() {
    if (this.ignited >= this.needed) { this.round++; this.tone(880, 0.2, "sine", 0.05); this.pop(this.cx, this.cy, "+" + this.ignited, "#34d399"); this.spawnRound(); }
    else this.gameOver();
  }
  private gameOver() {
    this.flow = "over"; this.best = Math.max(this.best, this.round - 1); LS.set("cchain_best", String(this.best));
    [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.5, "sawtooth", 0.05), i * 120));
    this.opts.onRunEnd?.({ round: this.round - 1, best: this.best }); this.emitHud();
  }

  private emitHud() {
    if (!this.opts.onHud) return;
    const sig = [this.round, this.needed, this.ignited, this.flow].join("|");
    if (sig === this.lastHud) return; this.lastHud = sig;
    this.opts.onHud({ round: this.round, needed: this.needed, ignited: this.ignited, best: this.best, armed: this.flow === "armed" });
  }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(251,191,36,.07)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, rimR * 0.97, 0, TAU); ctx.strokeStyle = "rgba(150,130,255,.1)"; ctx.lineWidth = 2; ctx.stroke();
    for (const b of this.blasts) { ctx.globalAlpha = Math.max(0, b.life) * 0.4; ctx.fillStyle = b.hue; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); ctx.globalAlpha = Math.max(0, b.life); ctx.strokeStyle = b.hue; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
    for (const o of this.orbs) { if (o.lit) continue; const p = 1 + 0.12 * Math.sin(now / 240 + o.x); ctx.save(); ctx.shadowBlur = 12; ctx.shadowColor = o.hue; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 0.5 * p, 0, TAU); ctx.fill(); ctx.fillStyle = o.hue; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(o.x, o.y, o.r * p, 0, TAU); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1; }
    if (this.flow === "armed") { ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = "600 12px system-ui"; ctx.textAlign = "center"; ctx.fillText("tap anywhere to detonate", cx, cy + rimR * 0.95); }
    this.drawFx(now);
  }
}
