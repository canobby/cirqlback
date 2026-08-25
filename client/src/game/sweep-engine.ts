// Cirql Sweep — engine (CirqlCade). Minesweeper on a disc of wedges. Tap to dig; a
// number shows how many sparks border that cell, and empty cells open their
// neighbours. Toggle FLAG to mark the sparks. Clear the disc to advance; hit a
// spark and you lose a life.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface SweepHud { level: number; lives: number; flags: number; mines: number; }
export interface SweepResult { score: number; level: number; best: number; }
export interface SweepOpts extends ArcadeOpts { accent?: string; onHud?: (s: SweepHud) => void; onRunEnd?: (r: SweepResult) => void; }

type Flow = "menu" | "playing" | "over";
const R = 4, S = 12;
interface Cell { mine: boolean; revealed: boolean; flag: boolean; n: number; }

export class SweepEngine extends ArcadeEngine {
  private opts: SweepOpts;
  private accent = "#38bdf8";
  private flow: Flow = "menu";
  private cells: Cell[][] = []; private level = 1; private lives = 3; private score = 0;
  private flagMode = false; private best = +(LS.get("csweep_best") || 0); private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: SweepOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }
  private ringR(r: number) { return this.rimR * (0.3 + 0.58 * (r / (R - 1))); }
  private cellXY(r: number, s: number) { const a = (s / S) * TAU - Math.PI / 2; return { x: this.cx + Math.cos(a) * this.ringR(r), y: this.cy + Math.sin(a) * this.ringR(r) }; }

  start() { this.flow = "playing"; this.level = 1; this.lives = 3; this.score = 0; this.flagMode = false; this.build(); this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.clearFx(); }
  setFlagMode(v: boolean) { this.flagMode = v; }
  toggleFlagMode() { this.flagMode = !this.flagMode; this.tone(300, 0.04, "square", 0.03); this.emitHud(); }
  private mineCount() { return Math.min(R * S - 2, 6 + this.level * 2); }
  private build() {
    this.cells = Array.from({ length: R }, () => Array.from({ length: S }, () => ({ mine: false, revealed: false, flag: false, n: 0 })));
    let placed = 0; const need = this.mineCount();
    while (placed < need) { const r = Math.floor(Math.random() * R), s = Math.floor(Math.random() * S); if (!this.cells[r][s].mine) { this.cells[r][s].mine = true; placed++; } }
    for (let r = 0; r < R; r++) for (let s = 0; s < S; s++) this.cells[r][s].n = this.neighbors(r, s).filter(([nr, ns]) => this.cells[nr][ns].mine).length;
  }
  private neighbors(r: number, s: number): [number, number][] { const out: [number, number][] = []; for (let dr = -1; dr <= 1; dr++) for (let ds = -1; ds <= 1; ds++) { if (!dr && !ds) continue; const nr = r + dr; if (nr < 0 || nr >= R) continue; out.push([nr, (s + ds + S) % S]); } return out; }
  peekBest() { return this.best; }

  protected onPointerDown(e: PointerEvent) {
    if (this.flow !== "playing") return; const p = this.pointerPos(e);
    let best: [number, number] | null = null, bd = this.rimR * 0.11; for (let r = 0; r < R; r++) for (let s = 0; s < S; s++) { const xy = this.cellXY(r, s); const d = Math.hypot(xy.x - p.x, xy.y - p.y); if (d < bd) { bd = d; best = [r, s]; } }
    if (!best) return; const [r, s] = best; const c = this.cells[r][s];
    if (this.flagMode) { if (!c.revealed) { c.flag = !c.flag; this.tone(360, 0.04, "sine", 0.03); this.buzz(3); } this.emitHud(); return; }
    if (c.revealed || c.flag) return;
    if (c.mine) { c.revealed = true; this.lives--; this.shake = 12; this.tone(120, 0.3, "sawtooth", 0.05); this.buzz([30, 50]); const xy = this.cellXY(r, s); this.burst(xy.x, xy.y, "#fb7185", 16, this.rimR * 0.9); if (this.lives <= 0) { this.gameOver(); return; } }
    else { this.reveal(r, s); if (this.solved()) { this.level++; this.score += 20; this.tone(920, 0.2, "sine", 0.05); this.pop(this.cx, this.cy, "CLEARED", "#34d399"); this.build(); } }
    this.emitHud();
  }
  private reveal(r: number, s: number) { const c = this.cells[r][s]; if (c.revealed || c.flag || c.mine) return; c.revealed = true; this.score++; if (c.n === 0) for (const [nr, ns] of this.neighbors(r, s)) this.reveal(nr, ns); }
  private solved() { for (let r = 0; r < R; r++) for (let s = 0; s < S; s++) if (!this.cells[r][s].mine && !this.cells[r][s].revealed) return false; return true; }

  protected step() { /* event-driven; nothing per frame */ }
  private gameOver() { this.flow = "over"; this.best = Math.max(this.best, this.score); LS.set("csweep_best", String(this.best)); [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sine", 0.05), i * 120)); this.opts.onRunEnd?.({ score: this.score, level: this.level, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; let flags = 0; for (const row of this.cells) for (const c of row) if (c.flag) flags++; const sig = [this.level, this.lives, flags, this.flagMode].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ level: this.level, lives: this.lives, flags, mines: this.mineCount() }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(56,189,248,.05)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    const cr = rimR * 0.06; const numCol = ["#334155", "#38bdf8", "#34d399", "#fbbf24", "#fb7185", "#f472b6", "#a78bfa", "#fff", "#fff"];
    for (let r = 0; r < R; r++) for (let s = 0; s < S; s++) { const c = this.cells[r]?.[s]; if (!c) continue; const xy = this.cellXY(r, s);
      ctx.save();
      if (c.revealed) { ctx.fillStyle = c.mine ? "rgba(251,113,133,.5)" : "rgba(40,44,68,.7)"; ctx.beginPath(); ctx.arc(xy.x, xy.y, cr, 0, TAU); ctx.fill(); if (!c.mine && c.n > 0) { ctx.fillStyle = numCol[c.n]; ctx.font = `bold ${cr * 1.1}px system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(c.n), xy.x, xy.y); } if (c.mine) { ctx.fillStyle = "#fff"; ctx.font = `${cr}px system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("✦", xy.x, xy.y); } }
      else { ctx.shadowBlur = 6; ctx.shadowColor = "#6d6a9c"; ctx.fillStyle = c.flag ? "rgba(251,191,36,.85)" : "rgba(70,64,104,.9)"; ctx.beginPath(); ctx.arc(xy.x, xy.y, cr, 0, TAU); ctx.fill(); if (c.flag) { ctx.fillStyle = "#0a0714"; ctx.font = `bold ${cr}px system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("⚑", xy.x, xy.y); } }
      ctx.restore();
    }
    if (this.flow === "playing") { ctx.fillStyle = this.flagMode ? "#fbbf24" : "rgba(255,255,255,.5)"; ctx.font = "600 12px system-ui"; ctx.textAlign = "center"; ctx.fillText(this.flagMode ? "FLAG mode — tap to mark" : "DIG mode — tap to reveal", cx, cy); }
    this.drawFx(now); void now;
  }
}
