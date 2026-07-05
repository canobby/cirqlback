// Cirql Pinball — engine (CirqlArcade). A tiny round table with one flipper. The
// ball falls under gravity, ricochets off glowing bumpers and the arena wall; tap
// to flip it back up before it drains through the gap at the bottom. Three balls.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface PinballHud { score: number; balls: number; best: number; }
export interface PinballResult { score: number; best: number; }
export interface PinballOpts extends ArcadeOpts { accent?: string; onHud?: (s: PinballHud) => void; onRunEnd?: (r: PinballResult) => void; }

type Flow = "menu" | "playing" | "over";
interface Bumper { x: number; y: number; r: number; hue: string; flash: number; }

export class PinballEngine extends ArcadeEngine {
  private opts: PinballOpts;
  private accent = "#fb7185";
  private flow: Flow = "menu";
  private score = 0; private balls = 3; private best = +(LS.get("cpinball_best") || 0);
  private bx = 0; private by = 0; private bvx = 0; private bvy = 0; private ballR = 8;
  private bumpers: Bumper[] = []; private flipUntil = 0; private lastHud = "";
  private readonly FLIP_A = Math.PI / 2; // flipper centred at bottom (angle down)
  private readonly FLIP_SPAN = 0.7;

  constructor(canvas: HTMLCanvasElement, opts: PinballOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.build(); this.emitHud(); }
  private arenaR() { return this.rimR * 0.94; }
  private build() { this.ballR = this.rimR * 0.028; this.bumpers = []; const n = 5; for (let i = 0; i < n; i++) { const a = (i / n) * TAU + 0.3, r = this.rimR * (0.32 + (i % 2) * 0.28); this.bumpers.push({ x: this.cx + Math.cos(a) * r, y: this.cy + Math.sin(a) * r, r: this.rimR * (0.06 + (i % 2) * 0.02), hue: ["#f472b6", "#38bdf8", "#34d399", "#fbbf24", "#a78bfa"][i], flash: 0 }); } }
  protected onResize() { this.build(); }

  start() { this.flow = "playing"; this.score = 0; this.balls = 3; this.build(); this.launch(); this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.clearFx(); }
  private launch() { this.bx = this.cx + this.rimR * 0.55; this.by = this.cy - this.rimR * 0.2; this.bvx = -this.rimR * 0.2; this.bvy = -this.rimR * 0.2; }
  flip() { if (this.flow !== "playing") return; this.flipUntil = performance.now() + 130; this.tone(200, 0.05, "square", 0.03); this.buzz(6); }
  peekBest() { return this.best; }

  protected onPointerDown() { this.flip(); }
  protected onKeyDown(e: KeyboardEvent) { if (e.key === " ") { e.preventDefault(); this.flip(); } }

  protected step(dt: number, now: number) {
    if (this.flow !== "playing") return;
    this.bvy += this.rimR * 1.4 * dt; // gravity
    this.bx += this.bvx * dt; this.by += this.bvy * dt;
    const dx = this.bx - this.cx, dy = this.by - this.cy, d = Math.hypot(dx, dy) || 1;
    // arena wall
    if (d > this.arenaR() - this.ballR) {
      const ux = dx / d, uy = dy / d, ang = Math.atan2(dy, dx);
      const flipping = now < this.flipUntil;
      const inFlipper = Math.abs(((ang - this.FLIP_A + Math.PI) % TAU + TAU) % TAU - Math.PI) < this.FLIP_SPAN / 2;
      if (inFlipper && !flipping) { this.drain(); return; } // fell through the flipper gap
      // reflect off wall (or flipper kick)
      const dot = this.bvx * ux + this.bvy * uy; this.bvx -= 2 * dot * ux; this.bvy -= 2 * dot * uy;
      this.bx = this.cx + ux * (this.arenaR() - this.ballR - 1); this.by = this.cy + uy * (this.arenaR() - this.ballR - 1);
      if (inFlipper && flipping) { const kick = this.rimR * 1.4; this.bvx -= ux * kick; this.bvy -= uy * kick; this.score += 5; this.tone(300, 0.06, "square", 0.04); this.shock(this.bx, this.by, this.accent, this.rimR * 0.2); }
      else { this.bvx *= 0.86; this.bvy *= 0.86; }
    }
    // bumpers (circle/circle → deflect away)
    for (const bm of this.bumpers) {
      const bdx = this.bx - bm.x, bdy = this.by - bm.y, bd = Math.hypot(bdx, bdy) || 1;
      if (bd < bm.r + this.ballR) { const ux = bdx / bd, uy = bdy / bd; const sp = Math.max(Math.hypot(this.bvx, this.bvy), this.rimR * 0.8) * 1.04; this.bvx = ux * sp; this.bvy = uy * sp; this.bx = bm.x + ux * (bm.r + this.ballR + 1); this.by = bm.y + uy * (bm.r + this.ballR + 1); bm.flash = 1; this.score += 10; this.burst(this.bx, this.by, bm.hue, 8, this.rimR * 0.7); this.tone(440 + this.score, 0.06, "sine", 0.04); this.buzz(5); }
      bm.flash = Math.max(0, bm.flash - dt * 3);
    }
    this.emitHud();
  }
  private drain() {
    this.balls--; this.shake = 12; this.tone(120, 0.3, "sawtooth", 0.05); this.buzz([30, 50]);
    if (this.balls <= 0) { this.gameOver(); } else { this.launch(); }
    this.emitHud();
  }
  private gameOver() { this.flow = "over"; this.best = Math.max(this.best, this.score); LS.set("cpinball_best", String(this.best)); [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sine", 0.05), i * 120)); this.opts.onRunEnd?.({ score: this.score, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const sig = [this.score, this.balls].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ score: this.score, balls: this.balls, best: this.best }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this; const AR = this.arenaR();
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(251,113,133,.06)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    // arena wall (with drain gap at the bottom)
    ctx.beginPath(); ctx.arc(cx, cy, AR, this.FLIP_A + this.FLIP_SPAN / 2, this.FLIP_A - this.FLIP_SPAN / 2 + TAU); ctx.strokeStyle = "rgba(150,130,255,.3)"; ctx.lineWidth = 3; ctx.stroke();
    // flipper
    const flipping = now < this.flipUntil; ctx.save(); ctx.shadowBlur = flipping ? 20 : 8; ctx.shadowColor = this.accent; ctx.strokeStyle = flipping ? "#fff" : this.accent; ctx.lineWidth = rimR * 0.05; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(cx, cy, AR, this.FLIP_A - this.FLIP_SPAN / 2, this.FLIP_A + this.FLIP_SPAN / 2); ctx.stroke(); ctx.restore();
    // bumpers
    for (const bm of this.bumpers) { ctx.save(); ctx.shadowBlur = 10 + 20 * bm.flash; ctx.shadowColor = bm.hue; ctx.fillStyle = bm.hue; ctx.globalAlpha = 0.5 + 0.5 * bm.flash; ctx.beginPath(); ctx.arc(bm.x, bm.y, bm.r, 0, TAU); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1; }
    // ball
    if (this.flow !== "menu") { ctx.save(); ctx.shadowBlur = 14; ctx.shadowColor = "#fff"; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(this.bx, this.by, this.ballR, 0, TAU); ctx.fill(); ctx.restore(); }
    this.drawFx(now); void now;
  }
}
