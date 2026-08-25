// Cirql Merge — engine (CirqlCade). 2048, rethought for a ring. Slide the tiles IN
// or OUT to merge equal numbers along the spokes; spin the whole field CW/CCW to
// line them up first (rotation repositions, it doesn't merge). A new tile lands each
// move. Fill the board with no merge left and it's over.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface MergeHud { score: number; top: number; best: number; }
export interface MergeResult { score: number; top: number; best: number; }
export interface MergeOpts extends ArcadeOpts { accent?: string; onHud?: (s: MergeHud) => void; onRunEnd?: (r: MergeResult) => void; }

type Flow = "menu" | "playing" | "over";
const R = 4, S = 8;
const TILE_COL: Record<number, string> = { 2: "#38bdf8", 4: "#34d399", 8: "#fbbf24", 16: "#fb7185", 32: "#f472b6", 64: "#a78bfa", 128: "#67e8f9", 256: "#f9a8d4", 512: "#fde68a", 1024: "#fff", 2048: "#fff" };

export class MergeEngine extends ArcadeEngine {
  private opts: MergeOpts;
  private accent = "#fbbf24";
  private flow: Flow = "menu";
  private grid: number[][] = []; private score = 0; private top = 0; private best = +(LS.get("cmerge_best") || 0);
  private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: MergeOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }
  private ringR(r: number) { return this.rimR * (0.3 + 0.56 * (r / (R - 1))); }
  private cellXY(r: number, s: number) { const a = (s / S) * TAU - Math.PI / 2; return { x: this.cx + Math.cos(a) * this.ringR(r), y: this.cy + Math.sin(a) * this.ringR(r) }; }

  start() { this.flow = "playing"; this.score = 0; this.top = 0; this.grid = Array.from({ length: R }, () => Array(S).fill(0)); this.spawn(); this.spawn(); this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.clearFx(); }
  private spawn() { const empty: [number, number][] = []; for (let r = 0; r < R; r++) for (let s = 0; s < S; s++) if (!this.grid[r][s]) empty.push([r, s]); if (!empty.length) return; const [r, s] = empty[Math.floor(Math.random() * empty.length)]; this.grid[r][s] = Math.random() < 0.9 ? 2 : 4; }
  peekBest() { return this.best; }

  // slide one column (array of R values) toward the high-index end (dir=+1) or low (dir=-1), merging
  private slideCol(vals: number[], dir: number): { out: number[]; changed: boolean; gained: number } {
    const seq = vals.filter((v) => v); if (dir > 0) seq.reverse(); // process from the packing wall
    const merged: number[] = []; let gained = 0;
    for (let i = 0; i < seq.length; i++) { if (i + 1 < seq.length && seq[i] === seq[i + 1]) { merged.push(seq[i] * 2); gained += seq[i] * 2; i++; } else merged.push(seq[i]); }
    if (dir > 0) merged.reverse();
    const out = Array(R).fill(0); if (dir > 0) { for (let i = 0; i < merged.length; i++) out[R - merged.length + i] = merged[i]; } else { for (let i = 0; i < merged.length; i++) out[i] = merged[i]; }
    const changed = out.some((v, i) => v !== vals[i]);
    return { out, changed, gained };
  }
  private move(dir: "in" | "out") {
    let changed = false, gained = 0; const d = dir === "in" ? 1 : -1;
    for (let s = 0; s < S; s++) { const col = []; for (let r = 0; r < R; r++) col.push(this.grid[r][s]); const res = this.slideCol(col, d); if (res.changed) changed = true; gained += res.gained; for (let r = 0; r < R; r++) this.grid[r][s] = res.out[r]; }
    if (changed) { this.score += gained; this.top = Math.max(this.top, ...this.grid.flat()); this.spawn(); this.tone(400 + Math.min(600, gained), 0.06, "triangle", 0.04); this.buzz(5); }
    if (this.stuck()) this.gameOver(); // full board with no merge left → over (even on a no-op move)
    this.emitHud();
  }
  moveIn() { if (this.flow === "playing") this.move("in"); }
  moveOut() { if (this.flow === "playing") this.move("out"); }
  rotate(dir: 1 | -1) {
    if (this.flow !== "playing") return; const g = Array.from({ length: R }, () => Array(S).fill(0));
    for (let r = 0; r < R; r++) for (let s = 0; s < S; s++) g[r][(s + dir + S) % S] = this.grid[r][s];
    this.grid = g; this.tone(300, 0.05, "sine", 0.035); this.buzz(4); this.emitHud();
  }
  private stuck() { for (let r = 0; r < R; r++) for (let s = 0; s < S; s++) if (!this.grid[r][s]) return false; for (let s = 0; s < S; s++) for (let r = 0; r < R - 1; r++) if (this.grid[r][s] === this.grid[r + 1][s]) return false; return true; }

  protected step() { /* turn-based; no per-frame logic */ }
  private gameOver() { this.flow = "over"; this.best = Math.max(this.best, this.score); LS.set("cmerge_best", String(this.best)); [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sine", 0.05), i * 120)); this.opts.onRunEnd?.({ score: this.score, top: this.top, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const sig = [this.score, this.top].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ score: this.score, top: this.top, best: this.best }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(251,191,36,.05)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    const cr = rimR * 0.062;
    for (let r = 0; r < R; r++) for (let s = 0; s < S; s++) { const xy = this.cellXY(r, s); ctx.strokeStyle = "rgba(150,130,255,.08)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(xy.x, xy.y, cr, 0, TAU); ctx.stroke();
      const v = this.grid[r]?.[s]; if (!v) continue; const col = TILE_COL[v] || "#fff"; ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = col; ctx.fillStyle = col; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(xy.x, xy.y, cr, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = v <= 4 ? "#0a0714" : "#0a0714"; ctx.font = `bold ${cr * (v < 100 ? 0.9 : v < 1000 ? 0.7 : 0.55)}px system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(v), xy.x, xy.y); ctx.restore(); }
    this.drawFx(now); void now;
  }
}
