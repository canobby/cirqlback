// swatch-engine — Main Street cabinet (Columns homage). A paint store: a falling
// stack of three paint chips drops in; line up THREE or more of a shade in any
// direction — across, down, or diagonal — to clear them. Cleared chips cascade into
// fresh matches for a CHAIN. Signature twist: clear 4+ different shades across a
// single drop for a SWATCH BONUS, and the fall speeds up as the wall fills.
// RetroEngine + juice + MusicKit; d-pad move/soft-drop + cycle + hard-drop.

import { RetroEngine, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const BEST_KEY = "swatch_best";
const COLS = 7, ROWS = 14, CELL = 11;
const FX = (LW - COLS * CELL) / 2 - 20 | 0, FY = 14;
const SHADES = ["#ff5d7d", "#ff9e2c", "#ffd24a", "#33e650", "#3bb6ff", "#b79bff"];

type Piece = { r: number; c: number; cells: number[] }; // cells top→bottom

const SWATCH_THEME: Track = {
  bpm: 124,
  layers: [
    { role: "lead", wave: "square", gain: 0.36, pattern: [
      { n: "A4", d: 2 }, { n: "C5", d: 2 }, { n: "D5", d: 2 }, { n: "E5", d: 2 }, { n: "D5", d: 2 }, { n: "C5", d: 2 }, { n: "A4", d: 4 },
      { n: "G4", d: 2 }, { n: "B4", d: 2 }, { n: "D5", d: 2 }, { n: "E5", d: 2 }, { n: "G5", d: 2 }, { n: "E5", d: 2 }, { n: "D5", d: 4 },
    ] },
    { role: "harmony", wave: "square", gain: 0.15, minIntensity: 0.4, pattern: [{ n: 0, d: 2 }, { n: "E4", d: 2 }, { n: 0, d: 2 }, { n: "C4", d: 2 }] },
    { role: "bass", wave: "triangle", gain: 0.48, pattern: [{ n: "A2", d: 2 }, { n: "A2", d: 2 }, { n: "F2", d: 2 }, { n: "F2", d: 2 }, { n: "G2", d: 2 }, { n: "G2", d: 2 }, { n: "E2", d: 2 }, { n: "E2", d: 2 }] },
    { role: "drums", minIntensity: 0.3, pattern: [{ n: "K", d: 2 }, { n: "H", d: 2 }, { n: "S", d: 2 }, { n: "H", d: 2 }] },
  ],
};

export class SwatchEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private grid: (number | null)[][] = [];
  private piece: Piece | null = null;
  private nextCells = [0, 1, 2];
  private level = 1; private score = 0; private cleared = 0; private combo = 0;
  private best = +(LS.get(BEST_KEY) || 0);
  private dropT = 0; private moveT = 0; private clearMarks: [number, number][] = []; private clearT = 0;
  private intro = 0; private card = "";

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.4 });
    this.grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
    this.rollNext(); this.spawn();
    this.start();
  }
  protected onGesture() { this.music?.play(SWATCH_THEME); }

  private dropInterval() { return Math.max(0.22, 0.7 - (this.level - 1) * 0.045); }
  private rollNext() { this.nextCells = [0, 1, 2].map(() => Math.floor(this.rnd() * SHADES.length)); }
  private spawn() {
    this.piece = { r: 2, c: 3, cells: this.nextCells.slice() }; this.rollNext(); this.dropT = 0;
    // top cell occupied → game over
    if (this.grid[0][3] || this.grid[1][3] || this.grid[2][3]) { this.piece = null; this.gameOver(); }
  }

  private beginGame() { this.level = 1; this.score = 0; this.cleared = 0; this.combo = 0; this.grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(null)); this.clearFx(); this.clearMarks = []; this.rollNext(); this.spawn(); this.intro = 1.2; this.card = "WALL 1"; this.state = "play"; this.music?.setIntensity(0.5); this.report(); }
  private gameOver() { this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); } this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(5); this.hooks.onRunEnd?.({ score: this.score, shift: this.level }); this.report(); }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, shift: this.level, lives: this.cleared, combo: this.combo }); }

  private canFall(p: Piece) { return p.r + 1 < ROWS && this.grid[p.r + 1][p.c] === null; }
  private lock() {
    const p = this.piece!;
    // the piece occupies (r-2,r-1,r) at column c with cells top→bottom
    for (let i = 0; i < 3; i++) { const rr = p.r - (2 - i); if (rr >= 0) this.grid[rr][p.c] = p.cells[i]; }
    this.piece = null; this.combo = 0; this.tone(300, 0.05, "square", 0.04); this.buzz(6); this.resolve();
  }

  private collapse() { for (let c = 0; c < COLS; c++) { let write = ROWS - 1; for (let r = ROWS - 1; r >= 0; r--) if (this.grid[r][c] !== null) { const v = this.grid[r][c]; this.grid[r][c] = null; this.grid[write--][c] = v; } } }
  private findMatches(): [number, number][] {
    const mark = new Set<string>();
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const col = this.grid[r][c]; if (col === null) continue;
      for (const [dr, dc] of dirs) {
        const pr = r - dr, pc = c - dc;
        if (pr >= 0 && pr < ROWS && pc >= 0 && pc < COLS && this.grid[pr][pc] === col) continue; // not the run start
        let n = 0, rr = r, cc = c;
        while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && this.grid[rr][cc] === col) { n++; rr += dr; cc += dc; }
        if (n >= 3) { for (let k = 0; k < n; k++) mark.add((r + dr * k) + "," + (c + dc * k)); }
      }
    }
    return Array.from(mark).map((s) => s.split(",").map(Number) as [number, number]);
  }
  private resolve() {
    this.collapse();
    const marks = this.findMatches();
    if (marks.length === 0) { this.spawn(); return; }
    this.combo++;
    const shades = new Set<number>();
    for (const [r, c] of marks) { shades.add(this.grid[r][c]!); const cx = FX + c * CELL + CELL / 2, cy = FY + r * CELL + CELL / 2; this.fxBurst(cx, cy, SHADES[this.grid[r][c]!], 8, 80); this.grid[r][c] = null; this.cleared++; }
    let gain = marks.length * 15 * this.combo;
    if (shades.size >= 4) { gain += 400; this.fxPop(LW / 2 - 20, FY + 24, "SWATCH BONUS!", "#ffd24a", 1); this.tone(660, 0.1, "square", 0.05); this.tone(880, 0.12, "square", 0.05); }
    this.score += gain;
    this.fxPop(FX + COLS * CELL / 2, FY + 40, (this.combo > 1 ? "CHAIN x" + this.combo + " +" : "+") + gain, this.combo > 1 ? "#ffd24a" : "#7be0c2");
    this.addShake(1 + this.combo * 0.4); this.hitstop(0.03); this.tone(480 + this.combo * 70, 0.07, "square", 0.05);
    if (this.cleared > this.level * 24) { this.level++; this.card = "WALL " + this.level; this.intro = 1; this.music?.playJingle(CLEAR_JINGLE, 165); }
    this.clearT = 0.14; this.report();
  }

  protected update(dt: number) {
    if (this.state !== "play") { if (this.pressed.a || this.pressed.b || this.pressed.left || this.pressed.right || this.pressed.down || this.pointer.down) this.beginGame(); return; }
    if (this.intro > 0) { this.intro -= dt; return; }
    if (this.clearT > 0) { this.clearT -= dt; if (this.clearT <= 0) this.resolve(); return; }
    if (!this.piece) return;
    const p = this.piece;

    // cycle colours
    if (this.pressed.a || this.pressed.up) { p.cells = [p.cells[2], p.cells[0], p.cells[1]]; this.tone(680, 0.04, "square", 0.03); this.buzz(4); }
    // move (DAS)
    this.moveT -= dt;
    const dir = (this.btn.right ? 1 : 0) - (this.btn.left ? 1 : 0);
    if (this.pressed.left || this.pressed.right) { const d = this.pressed.right ? 1 : -1; if (p.c + d >= 0 && p.c + d < COLS && this.grid[p.r][p.c + d] === null && this.grid[Math.max(0, p.r - 1)][p.c + d] === null) { p.c += d; this.tone(420, 0.03, "square", 0.03); } this.moveT = 0.16; }
    else if (dir !== 0 && this.moveT <= 0) { if (p.c + dir >= 0 && p.c + dir < COLS && this.grid[p.r][p.c + dir] === null) p.c += dir; this.moveT = 0.06; }

    if (this.pressed.b) { while (this.canFall(p)) p.r++; this.lock(); return; }
    this.dropT += dt * (this.btn.down ? 8 : 1);
    if (this.dropT >= this.dropInterval()) { this.dropT = 0; if (this.canFall(p)) p.r++; else { this.lock(); return; } }
  }

  // ---- draw ----
  private drawChip(r: number, c: number, s: number) { const x = FX + c * CELL, y = FY + r * CELL; this.shelf(x + 1, y + 1, CELL - 2, CELL - 2, SHADES[s]); this.px(x + 3, y + 3, "#ffffffc0"); this.rect(x + 1, y + CELL - 2, CELL - 2, 1, "#00000060"); }
  protected render() {
    this.vgrad(0, 0, LW, LH, "#20222c", "#0c0e14");
    this.rect(FX - 3, FY - 3, COLS * CELL + 6, ROWS * CELL + 6, "#3a3f4c");
    this.rect(FX - 1, FY - 1, COLS * CELL + 2, ROWS * CELL + 2, "#0a0c12");
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (this.grid[r][c] !== null) this.drawChip(r, c, this.grid[r][c]!);
    if (this.piece) { const p = this.piece; for (let i = 0; i < 3; i++) { const rr = p.r - (2 - i); if (rr >= 0) this.drawChip(rr, p.c, p.cells[i]); } }
    this.drawFx();

    // HUD + side
    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#e6e9ff", 1, false);
    this.text(150, 3, "WALL " + this.level, "#7be0c2", 1, false);
    const px0 = FX + COLS * CELL + 12;
    this.text(px0, 20, "NEXT", "#7be0c2");
    for (let i = 0; i < 3; i++) this.drawChipAt(px0 + 2, 30 + i * (CELL + 1), this.nextCells[i]);
    this.text(px0, 74, "CLEARED", "#83769c"); this.text(px0, 84, "" + this.cleared, "#fff4ea");
    if (this.combo > 1) this.text(px0, 100, "x" + this.combo, "#ffd24a");

    if (this.state === "play" && this.intro > 0) { this.b.globalAlpha = 0.55; this.rect(0, 76, LW, 30, "#0a0714"); this.b.globalAlpha = 1; this.textCenter(86, this.card, "#7be0c2", 2); }
    if (this.state !== "play") this.overlay();
  }
  private drawChipAt(x: number, y: number, s: number) { this.shelf(x, y, CELL - 2, CELL - 2, SHADES[s]); this.px(x + 2, y + 2, "#ffffffc0"); }
  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(40, "SWATCH", "#ffd24a", 2);
      this.textCenter(64, "MATCH THREE PAINT CHIPS", "#c3b4de", 1);
      this.textCenter(84, "ACROSS - DOWN - OR DIAGONAL", "#83769c", 1);
      this.textCenter(96, "CYCLE THE STACK TO LINE THEM UP", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS CYCLE TO START", "#ffec27", 1);
    } else {
      this.textCenter(48, "WALL FULL", "#ff5d7d", 2);
      this.textCenter(74, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(88, "BEST " + this.best, "#ffd24a", 1);
      this.textCenter(104, "REACHED WALL " + this.level, "#c3b4de", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS CYCLE TO RETRY", "#ffec27", 1);
    }
  }
}
