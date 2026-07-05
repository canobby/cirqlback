// Cirql Kaleido — engine (CirqlCade, Zen). Draw anywhere and your marks are
// mirrored across six-fold symmetry into a living kaleidoscope. No aim, no clock.
// Tap Finish when it's beautiful.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface KaleidoHud { strokes: number; best: number; }
export interface KaleidoResult { strokes: number; best: number; }
export interface KaleidoOpts extends ArcadeOpts { accent?: string; onHud?: (s: KaleidoHud) => void; onRunEnd?: (r: KaleidoResult) => void; }

type Flow = "menu" | "playing" | "over";
interface Mark { dx: number; dy: number; hue: number; life: number; r: number; }
const SYM = 6;

export class KaleidoEngine extends ArcadeEngine {
  private opts: KaleidoOpts;
  private accent = "#f472b6";
  private flow: Flow = "menu";
  private strokes = 0; private best = +(LS.get("ckaleido_best") || 0);
  private marks: Mark[] = []; private drawing = false; private lastHud = ""; private hue = 300;

  constructor(canvas: HTMLCanvasElement, opts: KaleidoOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }

  start() { this.flow = "playing"; this.strokes = 0; this.marks = []; this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.marks = []; }
  finish() { if (this.flow !== "playing") return; this.flow = "over"; this.best = Math.max(this.best, this.strokes); LS.set("ckaleido_best", String(this.best)); this.opts.onRunEnd?.({ strokes: this.strokes, best: this.best }); this.emitHud(); }
  peekBest() { return this.best; }

  protected onPointerDown(e: PointerEvent) { this.drawing = true; this.strokes++; this.hue = (this.hue + 50) % 360; this.tone(300 + Math.random() * 200, 0.35, "triangle", 0.02); this.emitHud(); this.add(e); }
  protected onPointerMove(e: PointerEvent) { if (this.drawing) this.add(e); }
  protected onPointerUp() { this.drawing = false; }
  private add(e: PointerEvent) { if (this.marks.length > 700) return; const p = this.pointerPos(e); this.marks.push({ dx: p.x - this.cx, dy: p.y - this.cy, hue: this.hue, life: 1, r: this.rimR * (0.016 + Math.random() * 0.02) }); this.hue = (this.hue + 2) % 360; }

  protected step(dt: number, _now: number) {
    if (this.flow === "menu") return;
    for (const m of this.marks) { m.life -= dt * 0.05; m.hue = (m.hue + dt * 12) % 360; }
    this.marks = this.marks.filter((m) => m.life > 0);
    this.emitHud();
  }

  private emitHud() { if (!this.opts.onHud) return; const sig = String(this.strokes); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ strokes: this.strokes, best: this.best }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    ctx.fillStyle = "rgba(5,4,15,0.12)"; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, rimR, 0, TAU); ctx.clip();
    ctx.globalCompositeOperation = "lighter";
    for (const m of this.marks) {
      const a = Math.max(0, m.life) * 0.95;
      ctx.shadowBlur = m.r * 2; ctx.shadowColor = `hsl(${m.hue}, 90%, 62%)`;
      for (let s = 0; s < SYM; s++) {
        const ang = (s * TAU) / SYM, c = Math.cos(ang), sn = Math.sin(ang);
        const rx = m.dx * c - m.dy * sn, ry = m.dx * sn + m.dy * c;
        const mrx = m.dx * c + m.dy * sn, mry = m.dx * sn - m.dy * c; // mirror
        ctx.fillStyle = `hsla(${m.hue}, 90%, 62%, ${a})`;
        ctx.beginPath(); ctx.arc(cx + rx, cy + ry, m.r, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + mrx, cy + mry, m.r, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, rimR, 0, TAU); ctx.strokeStyle = "rgba(150,130,255,.14)"; ctx.lineWidth = 2; ctx.stroke();
    if (this.flow === "playing" && this.strokes === 0) { ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.font = "500 12px system-ui"; ctx.textAlign = "center"; ctx.fillText("draw to bloom the mirror", cx, cy); }
    void now;
  }
}
