// Cirql Pong — engine (CirqlCade). Pong bent round a ring. You guard the bottom
// half with a paddle arc, an AI guards the top; the ball volleys across the disc.
// Return it past the AI to score; miss on your side and you lose a life. The rally
// speeds up the longer it runs.

import { ArcadeEngine, type ArcadeOpts, TAU, norm, angDiff, LS } from "./arcade-core";

export interface PongHud { score: number; lives: number; best: number; }
export interface PongResult { score: number; best: number; }
export interface PongOpts extends ArcadeOpts { accent?: string; onHud?: (s: PongHud) => void; onRunEnd?: (r: PongResult) => void; }

type Flow = "menu" | "playing" | "over";

export class PongEngine extends ArcadeEngine {
  private opts: PongOpts;
  private accent = "#67e8f9";
  private flow: Flow = "menu";
  private score = 0; private lives = 3; private best = +(LS.get("cpong_best") || 0);
  private you = Math.PI / 2; private ai = -Math.PI / 2; private span = 0.85;
  private bx = 0; private by = 0; private bvx = 0; private bvy = 0; private speed = 0; private lastHud = ""; private dragging = false;

  constructor(canvas: HTMLCanvasElement, opts: PongOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }
  private rimPlay() { return this.rimR * 0.9; }

  start() { this.flow = "playing"; this.score = 0; this.lives = 3; this.you = Math.PI / 2; this.ai = -Math.PI / 2; this.clearFx(); this.serve(1); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.clearFx(); }
  private serve(dir: number) { this.bx = this.cx; this.by = this.cy; this.speed = this.rimR * 0.9; const a = -Math.PI / 2 * dir + (Math.random() - 0.5) * 0.6; this.bvx = Math.cos(a) * this.speed; this.bvy = Math.sin(a) * this.speed; }
  aimYou(a: number) { // clamp to the bottom half
    let n = norm(a); if (n < 0.15) n = 0.15; if (n > Math.PI - 0.15) n = Math.PI - 0.15; this.you = n;
  }
  setCosmetic(c: string) { this.accent = c || "#67e8f9"; }
  peekBest() { return this.best; }

  protected onPointerDown(e: PointerEvent) { this.dragging = true; this.aimYou(this.pointerAngle(e)); try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { /* ignore */ } }
  protected onPointerMove(e: PointerEvent) { if (this.dragging) this.aimYou(this.pointerAngle(e)); }
  protected onPointerUp() { this.dragging = false; }

  protected step(dt: number, _now: number) {
    if (this.flow !== "playing") return;
    // AI tracks the ball's angle when the ball is in the top half
    const ba = Math.atan2(this.by - this.cy, this.bx - this.cx);
    const targetAi = Math.max(-Math.PI + 0.15, Math.min(-0.15, norm(ba) < 0 ? norm(ba) : (norm(ba) > Math.PI / 2 ? -Math.PI + 0.15 : -0.15)));
    this.ai += Math.max(-2.4 * dt, Math.min(2.4 * dt, targetAi - this.ai));
    this.bx += this.bvx * dt; this.by += this.bvy * dt;
    const dx = this.bx - this.cx, dy = this.by - this.cy, d = Math.hypot(dx, dy) || 1;
    if (d > this.rimPlay() - this.rimR * 0.03) {
      const ux = dx / d, uy = dy / d, ang = Math.atan2(dy, dx), bottom = norm(ang) > 0;
      const pad = bottom ? this.you : this.ai;
      if (angDiff(ang, pad) <= this.span / 2) {
        // reflect + a little english from where it hit the paddle
        const dot = this.bvx * ux + this.bvy * uy; this.bvx -= 2 * dot * ux; this.bvy -= 2 * dot * uy;
        const off = norm(ang - pad); const tx = -uy, ty = ux; const eng = off * 1.4;
        this.bvx += tx * eng * this.speed * 0.4; this.bvy += ty * eng * this.speed * 0.4;
        const sp = Math.hypot(this.bvx, this.bvy) || 1; this.speed = Math.min(this.rimR * 2.2, this.speed + this.rimR * 0.04); this.bvx = this.bvx / sp * this.speed; this.bvy = this.bvy / sp * this.speed;
        this.bx = this.cx + ux * (this.rimPlay() - this.rimR * 0.04); this.by = this.cy + uy * (this.rimPlay() - this.rimR * 0.04);
        if (bottom) { this.tone(400, 0.05, "square", 0.04); this.buzz(5); } else { this.score++; this.tone(660, 0.08, "sine", 0.045); this.pop(this.bx, this.by, "+1", "#34d399"); }
        this.burst(this.bx, this.by, bottom ? this.accent : "#fb7185", 6, this.rimR * 0.6);
      } else {
        // missed: point conceded on that side
        if (bottom) { this.lives--; this.shake = 12; this.tone(120, 0.3, "sawtooth", 0.05); this.buzz([30, 50]); this.burst(this.bx, this.by, "#fb7185", 18, this.rimR); if (this.lives <= 0) { this.gameOver(); return; } this.serve(1); }
        else { this.score++; this.serve(-1); }
      }
    }
    this.emitHud();
  }
  private gameOver() { this.flow = "over"; this.best = Math.max(this.best, this.score); LS.set("cpong_best", String(this.best)); [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sine", 0.05), i * 120)); this.opts.onRunEnd?.({ score: this.score, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const sig = [this.score, this.lives].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ score: this.score, lives: this.lives, best: this.best }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this; const R = this.rimPlay();
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(103,232,249,.05)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.strokeStyle = "rgba(150,130,255,.14)"; ctx.lineWidth = 2; ctx.stroke();
    // half divider
    ctx.strokeStyle = "rgba(150,130,255,.1)"; ctx.setLineDash([4, 8]); ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke(); ctx.setLineDash([]);
    const drawPad = (a: number, col: string) => { ctx.save(); ctx.shadowBlur = 14; ctx.shadowColor = col; ctx.strokeStyle = col; ctx.lineWidth = rimR * 0.05; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(cx, cy, R - 2, a - this.span / 2, a + this.span / 2); ctx.stroke(); ctx.restore(); };
    drawPad(this.you, this.accent); drawPad(this.ai, "#fb7185");
    // ball
    if (this.flow !== "menu") { ctx.save(); ctx.shadowBlur = 14; ctx.shadowColor = "#fff"; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(this.bx, this.by, rimR * 0.03, 0, TAU); ctx.fill(); ctx.restore(); }
    this.drawFx(now); void now;
  }
}
