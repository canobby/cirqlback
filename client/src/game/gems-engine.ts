// Cirql Gems — engine (CirqlCade). Match-3 swap on a polar grid. Tap two neighbours
// to swap; line up three or more of a colour along a ring or a spoke and they clear,
// the rest sliding inward with fresh gems dropping from the rim. Chain cascades for
// bonus. Sixty seconds.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface GemsHud { score: number; time: number; best: number; }
export interface GemsResult { score: number; best: number; }
export interface GemsOpts extends ArcadeOpts { accent?: string; onHud?: (s: GemsHud) => void; onRunEnd?: (r: GemsResult) => void; }

type Flow = "menu" | "playing" | "over";
const R = 5, S = 9, RUN_TIME = 60;
const COLORS = ["#f472b6", "#38bdf8", "#34d399", "#fbbf24", "#a78bfa"];

export class GemsEngine extends ArcadeEngine {
  private opts: GemsOpts;
  private accent = "#f472b6";
  private flow: Flow = "menu";
  private grid: number[][] = []; private sel = -1; private score = 0; private timeLeft = RUN_TIME;
  private best = +(LS.get("cgems_best") || 0); private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: GemsOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }
  private ringR(r: number) { return this.rimR * (0.34 + 0.56 * (r / (R - 1))); }
  private cellXY(r: number, s: number) { const a = (s / S) * TAU - Math.PI / 2; return { x: this.cx + Math.cos(a) * this.ringR(r), y: this.cy + Math.sin(a) * this.ringR(r) }; }
  private rand() { return Math.floor(Math.random() * COLORS.length); }

  start() { this.flow = "playing"; this.score = 0; this.timeLeft = RUN_TIME; this.sel = -1; this.grid = Array.from({ length: R }, () => Array.from({ length: S }, () => this.rand())); while (this.findMatches().size) { this.clearAndFill(this.findMatches(), true); } this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.clearFx(); }
  peekBest() { return this.best; }

  private findMatches(): Set<string> {
    const m = new Set<string>();
    const eq = (r: number, s: number, c: number) => r >= 0 && r < R && this.grid[r][(s % S + S) % S] === c;
    for (let r = 0; r < R; r++) for (let s = 0; s < S; s++) { const c = this.grid[r][s];
      if (eq(r, s - 1, c) && eq(r, s + 1, c)) { m.add(r + ":" + ((s - 1 + S) % S)); m.add(r + ":" + s); m.add(r + ":" + ((s + 1) % S)); }
      if (eq(r - 1, s, c) && eq(r + 1, s, c)) { m.add((r - 1) + ":" + s); m.add(r + ":" + s); m.add((r + 1) + ":" + s); }
    }
    return m;
  }
  private clearAndFill(matches: Set<string>, silent?: boolean) {
    for (const k of Array.from(matches)) { const [r, s] = k.split(":").map(Number); this.grid[r][s] = -1; if (!silent) { const xy = this.cellXY(r, s); this.burst(xy.x, xy.y, "#fff", 5, this.rimR * 0.5); } }
    this.score += matches.size * (silent ? 0 : 5);
    // gravity toward centre (high ring index), refill at rim (ring 0)
    for (let s = 0; s < S; s++) { const col: number[] = []; for (let r = 0; r < R; r++) if (this.grid[r][s] >= 0) col.push(this.grid[r][s]); while (col.length < R) col.unshift(this.rand()); for (let r = 0; r < R; r++) this.grid[r][s] = col[r]; }
    if (!silent) { this.tone(500 + Math.min(600, this.score), 0.07, "triangle", 0.045); this.buzz(5); }
  }

  protected onPointerDown(e: PointerEvent) {
    if (this.flow !== "playing") return; const p = this.pointerPos(e);
    let best = -1, bd = this.rimR * 0.12; for (let r = 0; r < R; r++) for (let s = 0; s < S; s++) { const xy = this.cellXY(r, s); const d = Math.hypot(xy.x - p.x, xy.y - p.y); if (d < bd) { bd = d; best = r * S + s; } }
    if (best < 0) return;
    if (this.sel < 0) { this.sel = best; this.tone(340, 0.04, "sine", 0.03); return; }
    if (this.sel === best) { this.sel = -1; return; }
    const [r1, s1] = [Math.floor(this.sel / S), this.sel % S], [r2, s2] = [Math.floor(best / S), best % S];
    const adj = (r1 === r2 && (Math.abs(s1 - s2) === 1 || Math.abs(s1 - s2) === S - 1)) || (s1 === s2 && Math.abs(r1 - r2) === 1);
    if (!adj) { this.sel = best; return; }
    // swap; keep only if it makes a match
    [this.grid[r1][s1], this.grid[r2][s2]] = [this.grid[r2][s2], this.grid[r1][s1]];
    const m = this.findMatches();
    if (m.size) { let mm = m; while (mm.size) { this.clearAndFill(mm); mm = this.findMatches(); } this.buzz(6); }
    else { [this.grid[r1][s1], this.grid[r2][s2]] = [this.grid[r2][s2], this.grid[r1][s1]]; this.tone(160, 0.08, "sine", 0.03); }
    this.sel = -1; this.emitHud();
  }

  protected step(dt: number, _now: number) { if (this.flow !== "playing") return; this.timeLeft -= dt; if (this.timeLeft <= 0) { this.timeLeft = 0; this.gameOver(); } this.emitHud(); }
  private gameOver() { this.flow = "over"; this.best = Math.max(this.best, this.score); LS.set("cgems_best", String(this.best)); [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sine", 0.05), i * 120)); this.opts.onRunEnd?.({ score: this.score, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const sig = [this.score, Math.ceil(this.timeLeft)].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ score: this.score, time: Math.ceil(this.timeLeft), best: this.best }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(236,72,153,.05)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    const cr = rimR * 0.055;
    for (let r = 0; r < R; r++) for (let s = 0; s < S; s++) { const c = this.grid[r]?.[s]; if (c == null || c < 0) continue; const xy = this.cellXY(r, s); const isSel = this.sel === r * S + s;
      ctx.save(); ctx.shadowBlur = isSel ? 20 : 8; ctx.shadowColor = COLORS[c]; const gg = ctx.createRadialGradient(xy.x - cr * 0.3, xy.y - cr * 0.3, 0, xy.x, xy.y, cr); gg.addColorStop(0, "#fff"); gg.addColorStop(0.4, COLORS[c]); gg.addColorStop(1, COLORS[c]); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(xy.x, xy.y, isSel ? cr * 1.15 : cr, 0, TAU); ctx.fill(); ctx.restore(); }
    this.drawFx(now); void now;
  }
}
