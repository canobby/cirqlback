// SUGAR SWAP — a Candy-Crush homage, a MODERN cabinet (CHR-197).
//
// Swap two neighbouring candies to line up three or more; matches pop, everything above
// tumbles down, fresh candies rain in from the jar up top — and any NEW lines those
// falls create chain into a combo. Longer lines pay more. You get a fixed run of swaps;
// score as high as you can before they're gone. This is the reusable MATCH-3 GRID base
// (grid model, swap+revert, run detection, gravity/refill, timed cascade with combos)
// that the puzzle cluster (gem-swap variants) will build on.

import { RetroEngine, shade, type RetroHooks } from "./retro-engine";
import { MusicKit, MAIN_STREET_THEME } from "./musickit";

const COLS = 8, ROWS = 8, CELL = 18, OX = 48, OY = 20;
const N_COLORS = 6;
const START_MOVES = 25;
const CANDY = ["#ff5d7d", "#ffd24a", "#3bb6ff", "#33e650", "#b79bff", "#ff8a3d"];

export class SugarSwapEngine extends RetroEngine {
  private grid: number[][] = [];
  private cur = { c: 0, r: 0 };
  private selc = -1; private selr = -1;
  private state: "ready" | "play" | "over" = "ready";
  private busy = false; private phase: "clear" | "fall" = "clear"; private resolveT = 0; private combo = 0;
  private mask: boolean[][] = [];
  private moves = START_MOVES; private score = 0; private best = 0; private tAnim = 0;
  private lastDown = false; private badSwap: { a: [number, number]; b: [number, number]; t: number } | null = null;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, 240, 180);
    this.music = new MusicKit();
    try { this.best = +(window.localStorage.getItem("sugarswap_best") || 0); } catch { /* ignore */ }
    this.newBoard();
    this.running = true;
    this.emit();
  }
  protected onGesture() { this.music?.play(MAIN_STREET_THEME); this.music?.setIntensity(0.4); }

  private newBoard() {
    this.grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
    this.mask = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      let v: number; let guard = 0;
      do { v = Math.floor(Math.random() * N_COLORS); guard++; }
      while (guard < 20 && ((c >= 2 && this.grid[r][c - 1] === v && this.grid[r][c - 2] === v) || (r >= 2 && this.grid[r - 1][c] === v && this.grid[r - 2][c] === v)));
      this.grid[r][c] = v;
    }
  }
  private reset() { this.newBoard(); this.moves = START_MOVES; this.score = 0; this.busy = false; this.combo = 0; this.selc = this.selr = -1; this.cur = { c: 3, r: 4 }; this.badSwap = null; this.clearFx(); }
  private begin() { this.reset(); this.state = "play"; this.music?.setIntensity(0.7); this.emit(); }
  protected onStart() { this.begin(); }
  protected onMenu() { this.state = "ready"; this.reset(); this.emit(); }
  private emit() { this.hooks.onHud?.({ state: this.state, score: this.score, moves: this.moves, best: this.best }); }

  // ---------- input ----------
  protected update(dt: number) {
    this.tAnim += dt;
    if (this.badSwap) { this.badSwap.t -= dt; if (this.badSwap.t <= 0) this.badSwap = null; }
    if (this.state === "ready" || this.state === "over") { if (this.pressed.a) this.begin(); this.lastDown = this.pointer.down; return; }
    if (this.busy) { this.resolveTick(dt); this.lastDown = this.pointer.down; return; }

    // pointer selection (tap a candy, tap a neighbour)
    if (this.pointer.down && !this.lastDown) {
      const c = Math.floor((this.pointer.x - OX) / CELL), r = Math.floor((this.pointer.y - OY) / CELL);
      if (c >= 0 && c < COLS && r >= 0 && r < ROWS) { this.cur = { c, r }; this.pick(c, r); }
    }
    this.lastDown = this.pointer.down;

    // d-pad cursor + A
    if (this.pressed.left) this.cur.c = (this.cur.c + COLS - 1) % COLS;
    if (this.pressed.right) this.cur.c = (this.cur.c + 1) % COLS;
    if (this.pressed.up) this.cur.r = (this.cur.r + ROWS - 1) % ROWS;
    if (this.pressed.down) this.cur.r = (this.cur.r + 1) % ROWS;
    if (this.pressed.a) this.pick(this.cur.c, this.cur.r);
  }

  private pick(c: number, r: number) {
    if (this.selc < 0) { this.selc = c; this.selr = r; this.tone(620, 0.03, "square", 0.04); return; }
    if (c === this.selc && r === this.selr) { this.selc = this.selr = -1; return; }         // deselect
    if (Math.abs(c - this.selc) + Math.abs(r - this.selr) === 1) { this.trySwap(this.selc, this.selr, c, r); this.selc = this.selr = -1; }
    else { this.selc = c; this.selr = r; this.tone(620, 0.03, "square", 0.04); }             // reselect
  }
  private swapCells(c0: number, r0: number, c1: number, r1: number) { const t = this.grid[r0][c0]; this.grid[r0][c0] = this.grid[r1][c1]; this.grid[r1][c1] = t; }
  private trySwap(c0: number, r0: number, c1: number, r1: number) {
    this.swapCells(c0, r0, c1, r1);
    if (this.findMatches() > 0) {
      this.moves--; this.busy = true; this.phase = "clear"; this.resolveT = 0.08; this.combo = 0;
      this.tone(720, 0.04, "square", 0.05); this.buzz(6);
    } else {
      this.swapCells(c0, r0, c1, r1);   // revert
      this.badSwap = { a: [c0, r0], b: [c1, r1], t: 0.25 }; this.tone(200, 0.08, "square", 0.05); this.buzz(12);
    }
    this.emit();
  }

  // ---------- match / resolve ----------
  /** Fill this.mask with all cells in a run of 3+; return count marked. */
  private findMatches(): number {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) this.mask[r][c] = false;
    let count = 0;
    // horizontal runs
    for (let r = 0; r < ROWS; r++) { let run = 1; for (let c = 1; c <= COLS; c++) { if (c < COLS && this.grid[r][c] === this.grid[r][c - 1] && this.grid[r][c] >= 0) run++; else { if (run >= 3) for (let k = c - run; k < c; k++) this.mask[r][k] = true; run = 1; } } }
    // vertical runs
    for (let c = 0; c < COLS; c++) { let run = 1; for (let r = 1; r <= ROWS; r++) { if (r < ROWS && this.grid[r][c] === this.grid[r - 1][c] && this.grid[r][c] >= 0) run++; else { if (run >= 3) for (let k = r - run; k < r; k++) this.mask[k][c] = true; run = 1; } } }
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (this.mask[r][c]) count++;
    return count;
  }
  private resolveTick(dt: number) {
    this.resolveT -= dt; if (this.resolveT > 0) return;
    if (this.phase === "clear") {
      const n = this.findMatches();
      if (n === 0) { this.busy = false; this.combo = 0; this.endCheck(); this.emit(); return; }
      this.combo++;
      const gain = n * 10 * this.combo + (n >= 5 ? 60 : n >= 4 ? 25 : 0);
      this.score += gain;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (this.mask[r][c]) {
        const x = OX + c * CELL + CELL / 2, y = OY + r * CELL + CELL / 2;
        this.fxBurst(x, y, CANDY[this.grid[r][c] % N_COLORS], 6, 80); this.grid[r][c] = -1;
      }
      if (this.combo >= 2) this.fxPop(120, OY + 4, `COMBO x${this.combo}`, "#ffd24a", 1);
      this.addShake(Math.min(2, 0.4 * this.combo)); this.hitstop(0.03);
      this.tone(660 + this.combo * 80, 0.05, "square", 0.05); this.tone(990, 0.05, "square", 0.04); this.buzz(8);
      this.music?.setIntensity(Math.min(1, 0.7 + this.combo * 0.06));
      this.phase = "fall"; this.resolveT = 0.14;
    } else {
      this.collapse();
      this.phase = "clear"; this.resolveT = 0.1;
    }
    this.emit();
  }
  private collapse() {
    for (let c = 0; c < COLS; c++) {
      let w = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) if (this.grid[r][c] >= 0) { this.grid[w][c] = this.grid[r][c]; if (w !== r) this.grid[r][c] = -1; w--; }
      for (let r = w; r >= 0; r--) this.grid[r][c] = Math.floor(Math.random() * N_COLORS);
    }
  }
  private endCheck() { if (this.moves <= 0) this.over(); }
  private over() { this.state = "over"; this.music?.setIntensity(0.2); if (this.score > this.best) { this.best = this.score; try { window.localStorage.setItem("sugarswap_best", String(this.best)); } catch { /* ignore */ } } this.hooks.onRunEnd?.({ score: this.score, shift: Math.floor(this.score / 200) }); this.emit(); }

  // ---------- render ----------
  protected render() {
    this.vgrad(0, 0, this.LW, this.LH, "#3a1a3a", "#160a18");
    // candy-shop stripes backdrop
    for (let x = 0; x < this.LW; x += 16) this.rect(x, 0, 8, this.LH, "#40203f");
    this.drawBoardFrame();
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) this.drawCandy(c, r);
    // cursor + selection
    if (this.state === "play") {
      const cx = OX + this.cur.c * CELL, cy = OY + this.cur.r * CELL;
      this.rectLine(cx, cy, CELL, CELL, "#fff1e8");
      if (this.selc >= 0) { const sx = OX + this.selc * CELL, sy = OY + this.selr * CELL; const p = Math.round(Math.sin(this.tAnim * 8) * 1); this.rectLine(sx - p, sy - p, CELL + p * 2, CELL + p * 2, "#ffd24a"); this.rectLine(sx - 1, sy - 1, CELL + 2, CELL + 2, "#ffec9a"); }
    }
    this.drawFx();
    this.drawHud();
    if (this.state === "ready") this.drawReady();
    if (this.state === "over") this.drawOver();
  }
  private drawBoardFrame() {
    this.rect(OX - 3, OY - 3, COLS * CELL + 6, ROWS * CELL + 6, "#2a1428");
    this.rectLine(OX - 3, OY - 3, COLS * CELL + 6, ROWS * CELL + 6, "#ff8ab5");
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if ((c + r) % 2 === 0) this.rect(OX + c * CELL, OY + r * CELL, CELL, CELL, "#20101f");
  }
  private drawCandy(c: number, r: number) {
    const v = this.grid[r][c]; if (v < 0) return;
    const x = OX + c * CELL + CELL / 2, y = OY + r * CELL + CELL / 2;
    let dy = 0; if (this.busy && this.phase === "fall") dy = 0; // (kept simple; collapse is instant)
    const bad = this.badSwap && ((this.badSwap.a[0] === c && this.badSwap.a[1] === r) || (this.badSwap.b[0] === c && this.badSwap.b[1] === r));
    const col = bad ? "#8a8598" : CANDY[v % N_COLORS];
    this.ball(x | 0, (y + dy) | 0, 7, col);
    // tiny shape tag per colour so it's colour-blind friendlier
    if (v === 1) this.rect(x - 1, y - 1, 3, 3, shade(col, -0.4));            // square
    else if (v === 2) { this.px(x, y - 3, shade(col, -0.4)); this.px(x - 3, y + 2, shade(col, -0.4)); this.px(x + 3, y + 2, shade(col, -0.4)); } // triangle dots
    else if (v === 4) this.ring(x | 0, y | 0, 3, shade(col, -0.4), 1);       // ring
  }
  private drawHud() {
    this.rect(0, 0, this.LW, OY - 4, "#0a0714aa");
    this.text(4, 3, "SCORE", "#ff8ab5", 1, false); this.text(34, 3, `${this.score}`, "#fff1e8", 1, false);
    this.text(150, 3, "SWAPS", "#ffd24a", 1, false); this.text(184, 3, `${this.moves}`, this.moves <= 5 ? "#ff5d7d" : "#fff1e8", 1, false);
  }
  private drawReady() {
    this.rect(0, 0, this.LW, this.LH, "#160a18c8");
    this.textCenter(46, "SUGAR SWAP", "#ff8ab5", 2);
    this.textCenter(72, "SWAP NEIGHBOURS TO MATCH 3+", "#c2c3c7", 1);
    this.textCenter(90, "PAD + JUMP  OR  TAP TWO CANDIES", "#83769c", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(120, "PRESS JUMP TO START", "#fff1e8", 1);
  }
  private drawOver() {
    this.rect(0, 0, this.LW, this.LH, "#160a18cc");
    this.textCenter(56, "OUT OF SWAPS", "#ff5d7d", 2);
    this.textCenter(82, `SCORE ${this.score}`, "#fff1e8", 2);
    this.textCenter(104, `BEST ${this.best}`, "#ffd24a", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(130, "PRESS JUMP TO PLAY AGAIN", "#7be0ff", 1);
  }
}
