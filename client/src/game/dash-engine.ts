// Cirql Dash — engine (CirqlArcade). Frogger, across rotating rings. You sit at the
// top; concentric rings spin at different speeds, each carrying hazard arcs. Tap to
// hop inward one ring at a time — time it to land in a gap. Reach the centre to
// score, then you're flung back out, faster. Touch a hazard and it's over.

import { ArcadeEngine, type ArcadeOpts, TAU, norm, LS } from "./arcade-core";

export interface DashHud { score: number; best: number; ring: number; }
export interface DashResult { score: number; best: number; }
export interface DashOpts extends ArcadeOpts { accent?: string; onHud?: (s: DashHud) => void; onRunEnd?: (r: DashResult) => void; }

type Flow = "menu" | "playing" | "over";
interface Ring { rot: number; spd: number; hazards: [number, number][]; } // hazard arcs [a0,a1] in ring-local space

export class DashEngine extends ArcadeEngine {
  private opts: DashOpts;
  private accent = "#38bdf8";
  private flow: Flow = "menu";
  private score = 0; private best = +(LS.get("cdash_best") || 0);
  private rings: Ring[] = []; private pr = 0; private hopUntil = 0; private hopFrom = 0;
  private speedMul = 1; private lastHud = "";
  private readonly PA = -Math.PI / 2; // player's fixed angle (top)

  constructor(canvas: HTMLCanvasElement, opts: DashOpts = {}) { super(canvas, opts); this.opts = opts; if (opts.accent) this.accent = opts.accent; this.emitHud(); }

  private get ringCount() { return 5; }
  private ringR(i: number) { return this.rimR * (0.36 + 0.6 * (i / (this.ringCount - 1))); } // 0 = inner(goal-ish), high = outer(start)
  start() { this.flow = "playing"; this.score = 0; this.speedMul = 1; this.buildRings(); this.pr = this.ringCount - 1; this.emitHud(); }
  toMenu() { this.flow = "menu"; this.rings = []; this.clearFx(); }
  peekBest() { return this.best; }

  private buildRings() {
    this.rings = [];
    for (let i = 0; i < this.ringCount; i++) {
      const dir = i % 2 ? 1 : -1;
      const spd = dir * (0.5 + i * 0.16 + Math.random() * 0.2) * this.speedMul;
      const nHaz = 1 + Math.floor(i / 2);
      const hazards: [number, number][] = [];
      for (let h = 0; h < nHaz; h++) { const a = (h / nHaz) * TAU + Math.random() * 0.6; const w = 0.5 + Math.random() * 0.5; hazards.push([a, a + w]); }
      this.rings.push({ rot: Math.random() * TAU, spd, hazards });
    }
  }
  hop() {
    if (this.flow !== "playing" || performance.now() < this.hopUntil) return;
    if (this.pr <= 0) return;
    this.hopFrom = this.pr; this.pr--; this.hopUntil = performance.now() + 160;
    this.tone(420, 0.06, "sine", 0.04); this.buzz(6);
    if (this.pr === 0) this.reachCenter();
    this.emitHud();
  }
  private reachCenter() {
    this.score++; this.speedMul += 0.12; this.tone(880, 0.2, "sine", 0.05); this.buzz([10, 20, 10]);
    this.shock(this.cx, this.cy, this.accent, this.rimR * 0.5); this.pop(this.cx, this.cy, "+1", "#34d399");
    this.buildRings(); this.pr = this.ringCount - 1;
  }

  protected onPointerDown() { this.hop(); }
  protected onKeyDown(e: KeyboardEvent) { if (e.key === " " || e.key === "ArrowUp") { e.preventDefault(); this.hop(); } }

  private hazardHit(ringIdx: number) {
    const ring = this.rings[ringIdx]; if (!ring) return false;
    const local = norm(this.PA - ring.rot);
    for (const [a0, a1] of ring.hazards) { const d0 = norm(local - a0); if (d0 >= 0 && d0 <= (a1 - a0)) return true; }
    return false;
  }
  protected step(dt: number, now: number) {
    if (this.flow !== "playing") return;
    for (const r of this.rings) r.rot += r.spd * dt;
    if (now >= this.hopUntil && this.pr > 0) { if (this.hazardHit(this.pr)) { this.gameOver(); return; } }
    this.emitHud();
  }
  private gameOver() {
    this.flow = "over"; this.shake = 12; const R = this.ringR(this.pr); this.burst(this.cx + Math.cos(this.PA) * R, this.cy + Math.sin(this.PA) * R, "#fb7185", 22, this.rimR);
    [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.5, "sawtooth", 0.05), i * 120)); this.buzz([40, 60, 40]);
    this.best = Math.max(this.best, this.score); LS.set("cdash_best", String(this.best));
    this.opts.onRunEnd?.({ score: this.score, best: this.best }); this.emitHud();
  }

  private emitHud() { if (!this.opts.onHud) return; const sig = [this.score, this.pr].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ score: this.score, best: this.best, ring: this.pr }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(56,189,248,.08)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    // goal core
    ctx.save(); ctx.shadowBlur = 20; ctx.shadowColor = "#34d399"; ctx.fillStyle = "rgba(52,211,153,.8)"; ctx.beginPath(); ctx.arc(cx, cy, rimR * 0.14, 0, TAU); ctx.fill(); ctx.restore();
    for (let i = 0; i < this.rings.length; i++) {
      const R = this.ringR(i), ring = this.rings[i];
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.strokeStyle = "rgba(150,130,255,.09)"; ctx.lineWidth = 1; ctx.stroke();
      for (const [a0, a1] of ring.hazards) { ctx.save(); ctx.shadowBlur = 12; ctx.shadowColor = "#fb7185"; ctx.strokeStyle = "#fb7185"; ctx.lineWidth = rimR * 0.05; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(cx, cy, R, ring.rot + a0, ring.rot + a1); ctx.stroke(); ctx.restore(); }
    }
    // player token (hop = lerp radius)
    let R = this.ringR(this.pr);
    if (performance.now() < this.hopUntil) { const k = 1 - (this.hopUntil - performance.now()) / 160; R = this.ringR(this.hopFrom) + (this.ringR(this.pr) - this.ringR(this.hopFrom)) * k; }
    const px = cx + Math.cos(this.PA) * R, py = cy + Math.sin(this.PA) * R;
    ctx.save(); ctx.shadowBlur = 16; ctx.shadowColor = this.accent; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(px, py, rimR * 0.035, 0, TAU); ctx.fill(); ctx.restore();
    this.drawFx(now); void now;
  }
}
