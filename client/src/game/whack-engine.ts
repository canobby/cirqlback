// Cirql Whack — engine (CirqlCade). Whack-a-mole around a ring. Critters pop from
// holes; tap them before they duck back. Watch for bombs — tapping one stings.
// Thirty seconds, as many whacks as you can land.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface WhackHud { score: number; time: number; best: number; }
export interface WhackResult { score: number; best: number; }
export interface WhackOpts extends ArcadeOpts { accent?: string; onHud?: (s: WhackHud) => void; onRunEnd?: (r: WhackResult) => void; }

type Flow = "menu" | "playing" | "over";
const HOLES = 8, RUN_TIME = 30;
interface Critter { hole: number; bomb: boolean; until: number; hit: boolean; pop: number; }

export class WhackEngine extends ArcadeEngine {
  private opts: WhackOpts;
  private accent = "#34d399";
  private flow: Flow = "menu";
  private score = 0; private timeLeft = RUN_TIME; private best = +(LS.get("cwhack_best") || 0);
  private critters: Critter[] = []; private spawnAt = 0; private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: WhackOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }
  private holeAngle(h: number) { return (h / HOLES) * TAU - Math.PI / 2; }
  private holeR() { return this.rimR * 0.62; }
  private holeXY(h: number) { const a = this.holeAngle(h); return { x: this.cx + Math.cos(a) * this.holeR(), y: this.cy + Math.sin(a) * this.holeR() }; }

  start() { this.flow = "playing"; this.score = 0; this.timeLeft = RUN_TIME; this.critters = []; this.spawnAt = 0; this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.critters = []; this.clearFx(); }
  peekBest() { return this.best; }

  protected onPointerDown(e: PointerEvent) {
    if (this.flow !== "playing") return; const p = this.pointerPos(e);
    for (const c of this.critters) { if (c.hit) continue; const h = this.holeXY(c.hole); if (Math.hypot(h.x - p.x, h.y - p.y) < this.rimR * 0.09) { this.whack(c); return; } }
  }
  private whack(c: Critter) {
    c.hit = true; const h = this.holeXY(c.hole);
    if (c.bomb) { this.score = Math.max(0, this.score - 3); this.shake = 12; this.tone(110, 0.25, "sawtooth", 0.05); this.buzz([20, 40]); this.burst(h.x, h.y, "#fb7185", 16, this.rimR * 0.9); this.pop(h.x, h.y, "-3", "#fb7185"); }
    else { this.score++; this.tone(560 + this.score * 3, 0.07, "triangle", 0.045); this.buzz(6); this.burst(h.x, h.y, this.accent, 9, this.rimR * 0.8); this.shock(h.x, h.y, this.accent, this.rimR * 0.12); }
  }

  protected step(dt: number, now: number) {
    if (this.flow !== "playing") return;
    this.timeLeft -= dt; if (this.timeLeft <= 0) { this.timeLeft = 0; this.gameOver(); return; }
    this.spawnAt -= dt;
    if (this.spawnAt <= 0 && this.critters.filter((c) => !c.hit && now < c.until).length < 3) {
      const taken = new Set(this.critters.filter((c) => !c.hit && now < c.until).map((c) => c.hole));
      let hole = Math.floor(Math.random() * HOLES); let guard = 0; while (taken.has(hole) && guard++ < HOLES) hole = (hole + 1) % HOLES;
      const dur = Math.max(560, 1200 - (RUN_TIME - this.timeLeft) * 22);
      this.critters.push({ hole, bomb: Math.random() < 0.18, until: now + dur, hit: false, pop: 0 });
      this.spawnAt = Math.max(0.28, 0.8 - (RUN_TIME - this.timeLeft) * 0.012);
    }
    for (const c of this.critters) { const t = (c.until - now); c.pop = c.hit ? Math.max(0, c.pop - dt * 4) : Math.min(1, c.pop + dt * 6); if (t < 0) c.pop = Math.max(0, c.pop - dt * 6); }
    this.critters = this.critters.filter((c) => now < c.until + 200 && !(c.hit && c.pop <= 0));
    this.emitHud();
  }
  private gameOver() { this.flow = "over"; this.best = Math.max(this.best, this.score); LS.set("cwhack_best", String(this.best)); [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sine", 0.05), i * 120)); this.opts.onRunEnd?.({ score: this.score, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const sig = [this.score, Math.ceil(this.timeLeft)].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ score: this.score, time: Math.ceil(this.timeLeft), best: this.best }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(52,211,153,.05)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    for (let h = 0; h < HOLES; h++) { const p = this.holeXY(h); ctx.fillStyle = "rgba(120,110,170,.18)"; ctx.beginPath(); ctx.ellipse(p.x, p.y, rimR * 0.075, rimR * 0.04, 0, 0, TAU); ctx.fill(); }
    for (const c of this.critters) { if (c.pop <= 0.02) continue; const p = this.holeXY(c.hole); const rr = rimR * 0.06 * c.pop; ctx.save(); ctx.shadowBlur = 12; ctx.shadowColor = c.bomb ? "#fb7185" : this.accent; const cg = ctx.createRadialGradient(p.x, p.y - rr * 0.3, 0, p.x, p.y, rr); cg.addColorStop(0, "#fff"); cg.addColorStop(0.5, c.bomb ? "#fb7185" : this.accent); cg.addColorStop(1, c.bomb ? "#7f1d1d" : "#065f46"); ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(p.x, p.y - rr * 0.3, rr, 0, TAU); ctx.fill(); if (c.bomb) { ctx.fillStyle = "#fff"; ctx.font = `${rr}px system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("✦", p.x, p.y - rr * 0.3); } ctx.restore(); }
    if (this.flow === "playing") { ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = "600 12px system-ui"; ctx.textAlign = "center"; ctx.fillText("tap the critters · avoid ✦ bombs", cx, cy); }
    this.drawFx(now); void now;
  }
}
