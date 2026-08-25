// Cirql Koi — engine (CirqlCade, Zen). A pond of koi drift inside the ring. Trail
// your finger and they follow it in slow, curving schools; touch the water for
// ripples. No aim, no clock. Tap Finish whenever you like.

import { ArcadeEngine, type ArcadeOpts, TAU, LS, norm } from "./arcade-core";

export interface KoiHud { ripples: number; best: number; }
export interface KoiResult { ripples: number; best: number; }
export interface KoiOpts extends ArcadeOpts { accent?: string; onHud?: (s: KoiHud) => void; onRunEnd?: (r: KoiResult) => void; }

type Flow = "menu" | "playing" | "over";
interface Fish { x: number; y: number; ang: number; spd: number; phase: number; hue: number; }

export class KoiEngine extends ArcadeEngine {
  private opts: KoiOpts;
  private accent = "#fb923c";
  private flow: Flow = "menu";
  private ripples = 0; private best = +(LS.get("ckoi_best") || 0);
  private fish: Fish[] = []; private target: { x: number; y: number } | null = null; private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: KoiOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.build(); this.emitHud(); }
  private build() { this.fish = []; const hues = [22, 30, 45, 0, 200]; for (let i = 0; i < 9; i++) { const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * this.rimR * 0.7; this.fish.push({ x: this.cx + Math.cos(a) * d, y: this.cy + Math.sin(a) * d, ang: Math.random() * TAU, spd: this.rimR * (0.28 + Math.random() * 0.14), phase: Math.random() * TAU, hue: hues[i % hues.length] }); } }
  protected onResize() { this.build(); }

  start() { this.flow = "playing"; this.ripples = 0; this.build(); this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; }
  finish() { if (this.flow !== "playing") return; this.flow = "over"; this.best = Math.max(this.best, this.ripples); LS.set("ckoi_best", String(this.best)); this.opts.onRunEnd?.({ ripples: this.ripples, best: this.best }); this.emitHud(); }
  peekBest() { return this.best; }

  protected onPointerDown(e: PointerEvent) { const p = this.pointerPos(e); this.target = p; this.ripples++; this.shock(p.x, p.y, "rgba(150,200,255,.6)", this.rimR * 0.3); this.tone(320 + Math.random() * 120, 0.4, "sine", 0.02); this.emitHud(); }
  protected onPointerMove(e: PointerEvent) { this.target = this.pointerPos(e); }
  protected onPointerUp() { this.target = null; }

  protected step(dt: number, now: number) {
    if (this.flow === "menu") return;
    for (const f of this.fish) {
      let want: number;
      if (this.target) { want = Math.atan2(this.target.y - f.y, this.target.x - f.x); }
      else { want = f.ang + Math.sin(now * 0.001 + f.phase) * 0.6; }
      const dr = norm(want - f.ang); f.ang += Math.max(-2.2 * dt, Math.min(2.2 * dt, dr));
      const dc = Math.hypot(f.x - this.cx, f.y - this.cy);
      if (dc > this.rimR * 0.9) { const inward = Math.atan2(this.cy - f.y, this.cx - f.x); const d2 = norm(inward - f.ang); f.ang += d2 * 2.5 * dt; }
      f.x += Math.cos(f.ang) * f.spd * dt; f.y += Math.sin(f.ang) * f.spd * dt; f.phase += dt * 6;
    }
    this.emitHud();
  }

  private emitHud() { if (!this.opts.onHud) return; const sig = String(this.ripples); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ ripples: this.ripples, best: this.best }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    ctx.fillStyle = "rgba(8,20,30,0.22)"; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.1, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, rimR * 0.94, 0, TAU); ctx.strokeStyle = "rgba(120,180,220,.14)"; ctx.lineWidth = 2; ctx.stroke();
    this.drawFx(now);
    for (const f of this.fish) {
      const wig = Math.sin(f.phase) * 0.5;
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.ang + wig * 0.2);
      ctx.shadowBlur = 10; ctx.shadowColor = `hsl(${f.hue},85%,60%)`;
      ctx.fillStyle = `hsl(${f.hue},80%,62%)`;
      ctx.beginPath(); ctx.ellipse(0, 0, rimR * 0.05, rimR * 0.022, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-rimR * 0.045, 0); ctx.lineTo(-rimR * 0.075, rimR * 0.02 * wig - rimR * 0.018); ctx.lineTo(-rimR * 0.075, rimR * 0.02 * wig + rimR * 0.018); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    if (this.flow === "playing" && this.ripples === 0) { ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.font = "500 12px system-ui"; ctx.textAlign = "center"; ctx.fillText("trail your finger to lead the koi", cx, cy); }
  }
}
