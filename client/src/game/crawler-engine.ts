// Cirql Crawler — engine (CirqlCade). Centipede, winding down the rings. A segmented
// crawler snakes around a ring and steps inward each lap; you sit at the centre,
// rotate your cannon and fire outward. Shooting a middle segment splits the crawler
// in two. Clear them before they reach you.

import { ArcadeEngine, type ArcadeOpts, TAU, angDiff, LS } from "./arcade-core";

export interface CrawlerHud { score: number; wave: number; lives: number; }
export interface CrawlerResult { score: number; wave: number; best: number; }
export interface CrawlerOpts extends ArcadeOpts { accent?: string; onHud?: (s: CrawlerHud) => void; onRunEnd?: (r: CrawlerResult) => void; }

type Flow = "menu" | "playing" | "over";
const RINGS = 6, SPACING = 0.3;
interface Chain { ring: number; head: number; len: number; dir: number; stepAt: number; hue: string; }
interface Shot { r: number; a: number; }

export class CrawlerEngine extends ArcadeEngine {
  private opts: CrawlerOpts;
  private accent = "#34d399";
  private flow: Flow = "menu";
  private score = 0; private wave = 0; private lives = 3; private best = +(LS.get("ccrawler_best") || 0);
  private chains: Chain[] = []; private shots: Shot[] = []; private aim = -Math.PI / 2; private fireAt = 0; private lastHud = ""; private dragging = false;

  constructor(canvas: HTMLCanvasElement, opts: CrawlerOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }
  private ringR(ring: number) { return this.rimR * (0.9 - ring * 0.12); } // ring 0 = outer, higher = inner
  private speed() { return 1.0 + this.wave * 0.12; }

  start() { this.flow = "playing"; this.score = 0; this.wave = 0; this.lives = 3; this.chains = []; this.shots = []; this.aim = -Math.PI / 2; this.clearFx(); this.nextWave(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.chains = []; this.shots = []; this.clearFx(); }
  aimTo(a: number) { this.aim = a; }
  fire() { if (this.flow !== "playing" || performance.now() < this.fireAt) return; this.fireAt = performance.now() + 180; this.shots.push({ r: this.rimR * 0.14, a: this.aim }); this.tone(600, 0.05, "square", 0.03); }
  setCosmetic(c: string) { this.accent = c || "#34d399"; }
  peekBest() { return this.best; }

  private nextWave() { this.wave++; const n = 1 + Math.floor(this.wave / 3); for (let i = 0; i < n; i++) this.chains.push({ ring: 0, head: Math.random() * TAU, len: 6 + this.wave, dir: i % 2 ? 1 : -1, stepAt: 0, hue: ["#34d399", "#38bdf8", "#a78bfa", "#f472b6"][i % 4] }); }
  private segAngle(c: Chain, i: number) { return c.head - i * SPACING * c.dir; }

  protected onPointerDown(e: PointerEvent) { this.dragging = true; this.aim = this.pointerAngle(e); this.fire(); try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { /* ignore */ } }
  protected onPointerMove(e: PointerEvent) { if (this.dragging) this.aim = this.pointerAngle(e); }
  protected onPointerUp() { this.dragging = false; }
  protected onKeyDown(e: KeyboardEvent) { if (e.key === "ArrowLeft") this.aim -= 0.1; else if (e.key === "ArrowRight") this.aim += 0.1; else if (e.key === " ") { e.preventDefault(); this.fire(); } }

  protected step(dt: number, now: number) {
    if (this.flow !== "playing") return;
    for (const c of this.chains) { c.head += c.dir * this.speed() * dt; if (!c.stepAt) c.stepAt = now + 1800; if (now >= c.stepAt) { c.ring++; c.dir *= -1; c.stepAt = now + 1800; if (c.ring >= RINGS) { this.loseLife(); return; } } }
    for (const s of this.shots) s.r += this.rimR * 2.4 * dt;
    this.shots = this.shots.filter((s) => s.r < this.rimR * 1.0);
    // shot vs segment
    for (const s of this.shots) {
      if ((s as any).dead) continue;
      for (const c of this.chains) { const R = this.ringR(c.ring); if (Math.abs(R - s.r) > this.rimR * 0.06) continue;
        for (let i = 0; i < c.len; i++) { if (angDiff(this.segAngle(c, i), s.a) < 0.12) { this.split(c, i); (s as any).dead = true; break; } }
        if ((s as any).dead) break;
      }
    }
    this.shots = this.shots.filter((s) => !(s as any).dead);
    if (!this.chains.length) this.nextWave();
    this.emitHud();
  }
  private split(c: Chain, i: number) {
    const R = this.ringR(c.ring), sx = this.cx + Math.cos(this.segAngle(c, i)) * R, sy = this.cy + Math.sin(this.segAngle(c, i)) * R;
    this.burst(sx, sy, c.hue, 8, this.rimR * 0.7); this.tone(320, 0.06, "square", 0.03); this.buzz(4); this.score += 10;
    const idx = this.chains.indexOf(c); if (idx < 0) return; this.chains.splice(idx, 1);
    if (i > 0) this.chains.push({ ...c, len: i });
    const backLen = c.len - i - 1; if (backLen > 0) this.chains.push({ ...c, head: c.head - (i + 1) * SPACING * c.dir, len: backLen });
  }
  private loseLife() { this.lives--; this.shake = 12; this.tone(120, 0.3, "sawtooth", 0.05); this.buzz([30, 50]); this.burst(this.cx, this.cy, "#fb7185", 20, this.rimR * 0.8); this.chains = this.chains.filter((c) => c.ring < RINGS); if (this.lives <= 0) this.gameOver(); this.emitHud(); }
  private gameOver() { this.flow = "over"; this.best = Math.max(this.best, this.score); LS.set("ccrawler_best", String(this.best)); [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sine", 0.05), i * 120)); this.opts.onRunEnd?.({ score: this.score, wave: this.wave, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const sig = [this.score, this.wave, this.lives].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ score: this.score, wave: this.wave, lives: this.lives }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(52,211,153,.05)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    for (let r = 0; r < RINGS; r++) { ctx.beginPath(); ctx.arc(cx, cy, this.ringR(r), 0, TAU); ctx.strokeStyle = "rgba(150,130,255,.06)"; ctx.lineWidth = 1; ctx.stroke(); }
    for (const c of this.chains) { const R = this.ringR(c.ring); for (let i = 0; i < c.len; i++) { const a = this.segAngle(c, i); const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; ctx.save(); ctx.shadowBlur = 8; ctx.shadowColor = c.hue; ctx.fillStyle = i === 0 ? "#fff" : c.hue; ctx.beginPath(); ctx.arc(x, y, rimR * (i === 0 ? 0.028 : 0.024), 0, TAU); ctx.fill(); ctx.restore(); } }
    for (const s of this.shots) { const x = cx + Math.cos(s.a) * s.r, y = cy + Math.sin(s.a) * s.r; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, TAU); ctx.fill(); }
    const cr = rimR * 0.09; ctx.save(); ctx.shadowBlur = 14; ctx.shadowColor = this.accent; ctx.fillStyle = this.accent; ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU); ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(this.aim) * cr * 1.7, cy + Math.sin(this.aim) * cr * 1.7); ctx.stroke(); ctx.restore();
    this.drawFx(now); void now;
  }
}
