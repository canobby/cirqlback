// PIGGY BANK — a 2048 homage, a MODERN cabinet (CHR-206).
//
// Slide the whole board of coin tiles in one direction; equal coins that bump merge
// into the next denomination (2->4->...->the 2048 VAULT and beyond). Every move rains
// in a new coin. Fill the board with no merges left and the bank's closed. Simple,
// deterministic, endlessly chase a bigger vault. Swipe or d-pad.

import { RetroEngine, shade, mix, type RetroHooks } from "./retro-engine";
import { MusicKit, MAIN_STREET_THEME } from "./musickit";

const N = 4, CELL = 32, GAP = 4, OX = 52, OY = 26;
// value -> tile colour ramp (cool copper coins up to the gold vault)
const TILE_COL: Record<number, string> = {
  2: "#8a7f6a", 4: "#a8895a", 8: "#c98a3a", 16: "#e0733a", 32: "#e2544f", 64: "#ff5d7d",
  128: "#b79bff", 256: "#7a8adf", 512: "#3bb6ff", 1024: "#33e6a0", 2048: "#ffd24a",
};
const tileCol = (v: number) => TILE_COL[v] || "#ffec9a";

export class PiggyBankEngine extends RetroEngine {
  private grid: number[][] = [];
  private spawnAt: [number, number] | null = null;
  private merged: boolean[][] = [];
  private state: "ready" | "play" | "over" = "ready";
  private score = 0; private best = 0; private won = false; private tAnim = 0;
  private lastDown = false; private ptStart: { x: number; y: number } | null = null;
  private pop = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, 240, 180);
    this.music = new MusicKit();
    try { this.best = +(window.localStorage.getItem("piggybank_best") || 0); } catch { /* ignore */ }
    this.newBoard();
    this.running = true;
    this.emit();
  }
  protected onGesture() { this.music?.play(MAIN_STREET_THEME); this.music?.setIntensity(0.4); }

  private newBoard() {
    this.grid = Array.from({ length: N }, () => new Array(N).fill(0));
    this.merged = Array.from({ length: N }, () => new Array(N).fill(false));
    this.spawn(); this.spawn();
  }
  private reset() { this.score = 0; this.won = false; this.spawnAt = null; this.pop = 0; this.newBoard(); }
  private begin() { this.reset(); this.state = "play"; this.music?.setIntensity(0.7); this.emit(); }
  protected onStart() { this.begin(); }
  protected onMenu() { this.state = "ready"; this.reset(); this.emit(); }
  private emit() { this.hooks.onHud?.({ state: this.state, score: this.score, best: this.best }); }

  private empties(): [number, number][] { const o: [number, number][] = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (this.grid[r][c] === 0) o.push([r, c]); return o; }
  private spawn() { const e = this.empties(); if (!e.length) return; const [r, c] = e[Math.floor(Math.random() * e.length)]; this.grid[r][c] = Math.random() < 0.9 ? 2 : 4; this.spawnAt = [r, c]; }

  /** Slide+merge a line toward index 0. Returns [newLine, gained, moved, mergedFlags]. */
  private slide(line: number[]): [number[], number, boolean, boolean[]] {
    const nz = line.filter((v) => v !== 0);
    const out: number[] = []; const mf: boolean[] = []; let gained = 0;
    for (let i = 0; i < nz.length; i++) {
      if (i + 1 < nz.length && nz[i] === nz[i + 1]) { const m = nz[i] * 2; out.push(m); mf.push(true); gained += m; i++; }
      else { out.push(nz[i]); mf.push(false); }
    }
    while (out.length < N) { out.push(0); mf.push(false); }
    const moved = out.some((v, i) => v !== line[i]);
    return [out, gained, moved, mf];
  }

  private move(dir: "left" | "right" | "up" | "down") {
    let moved = false, gained = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) this.merged[r][c] = false;
    for (let i = 0; i < N; i++) {
      // extract a line oriented so index 0 is the destination edge
      const line: number[] = [];
      for (let j = 0; j < N; j++) {
        if (dir === "left") line.push(this.grid[i][j]);
        else if (dir === "right") line.push(this.grid[i][N - 1 - j]);
        else if (dir === "up") line.push(this.grid[j][i]);
        else line.push(this.grid[N - 1 - j][i]);
      }
      const [out, g, mv, mf] = this.slide(line);
      if (mv) moved = true; gained += g;
      for (let j = 0; j < N; j++) {
        const v = out[j], f = mf[j];
        if (dir === "left") { this.grid[i][j] = v; if (f) this.merged[i][j] = true; }
        else if (dir === "right") { this.grid[i][N - 1 - j] = v; if (f) this.merged[i][N - 1 - j] = true; }
        else if (dir === "up") { this.grid[j][i] = v; if (f) this.merged[j][i] = true; }
        else { this.grid[N - 1 - j][i] = v; if (f) this.merged[N - 1 - j][i] = true; }
      }
    }
    if (!moved) { this.tone(180, 0.05, "square", 0.04); return; }
    this.score += gained;
    if (gained > 0) { this.pop = 1; this.addShake(Math.min(1.6, gained / 64)); this.tone(520, 0.05, "square", 0.05); this.tone(780, 0.06, "square", 0.04); this.buzz(8); for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (this.merged[r][c]) this.fxBurst(OX + c * (CELL + GAP) + CELL / 2, OY + r * (CELL + GAP) + CELL / 2, tileCol(this.grid[r][c]), 8, 80); }
    if (!this.won && this.grid.some((row) => row.some((v) => v >= 2048))) { this.won = true; this.fxPop(120, 40, "VAULT!", "#ffd24a", 2); this.tone(880, 0.14, "square", 0.05); this.music?.setIntensity(1); }
    this.spawn();
    if (this.isStuck()) this.over();
    else this.emit();
  }
  private isStuck(): boolean {
    if (this.empties().length) return false;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { if (c + 1 < N && this.grid[r][c] === this.grid[r][c + 1]) return false; if (r + 1 < N && this.grid[r][c] === this.grid[r + 1][c]) return false; }
    return true;
  }
  private over() { this.state = "over"; this.music?.setIntensity(0.2); if (this.score > this.best) { this.best = this.score; try { window.localStorage.setItem("piggybank_best", String(this.best)); } catch { /* ignore */ } } this.hooks.onRunEnd?.({ score: this.score, shift: Math.floor(Math.log2(Math.max(2, this.maxTile()))) }); this.emit(); }
  private maxTile() { let m = 0; for (const row of this.grid) for (const v of row) m = Math.max(m, v); return m; }

  protected update(dt: number) {
    this.tAnim += dt; this.pop = Math.max(0, this.pop - dt * 4);
    if (this.state === "ready" || this.state === "over") { if (this.pressed.a) this.begin(); this.lastDown = this.pointer.down; return; }
    // swipe
    if (this.pointer.down && !this.lastDown) this.ptStart = { x: this.pointer.x, y: this.pointer.y };
    if (!this.pointer.down && this.lastDown && this.ptStart) {
      const dx = this.pointer.x - this.ptStart.x, dy = this.pointer.y - this.ptStart.y;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) this.move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
      this.ptStart = null;
    }
    this.lastDown = this.pointer.down;
    // d-pad
    if (this.pressed.left) this.move("left");
    else if (this.pressed.right) this.move("right");
    else if (this.pressed.up) this.move("up");
    else if (this.pressed.down) this.move("down");
  }

  // ---------- render ----------
  protected render() {
    this.vgrad(0, 0, this.LW, this.LH, "#1a2440", "#0e1424");
    // hud
    this.rect(0, 0, this.LW, OY - 6, "#0a0714aa");
    this.text(4, 4, "BANK", "#ffd24a", 1, false); this.text(30, 4, `${this.score}`, "#fff1e8", 1, false);
    this.text(150, 4, "BEST", "#83b0c8", 1, false); this.text(178, 4, `${this.best}`, "#fff1e8", 1, false);
    // board frame
    const bw = N * CELL + (N - 1) * GAP;
    this.rect(OX - 5, OY - 5, bw + 10, bw + 10, "#2a3550"); this.rectLine(OX - 5, OY - 5, bw + 10, bw + 10, "#3bb6ff");
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) this.drawTile(r, c);
    this.drawFx();
    if (this.state === "ready") this.drawReady();
    if (this.state === "over") this.drawOver();
  }
  private drawTile(r: number, c: number) {
    const x = OX + c * (CELL + GAP), y = OY + r * (CELL + GAP), v = this.grid[r][c];
    if (v === 0) { this.rect(x, y, CELL, CELL, "#20283f"); return; }
    const col = tileCol(v);
    const fresh = this.spawnAt && this.spawnAt[0] === r && this.spawnAt[1] === c;
    const mg = this.merged[r][c] && this.pop > 0;
    const inset = mg ? Math.round(this.pop * 2) : 0;
    this.shelf(x - inset, y - inset, CELL + inset * 2, CELL + inset * 2, col);
    this.rect(x + 2 - inset, y + 2 - inset, CELL - 4 + inset * 2, 2, shade(col, 0.3));
    if (fresh) this.rectLine(x, y, CELL, CELL, "#fff1e8");
    // value text, centred, scaled down for long numbers
    const s = `${v}`; const sc = 1; const tw = this.textWidth(s, sc);
    const tc = v >= 8 ? "#0a0714" : "#e8e0cc";
    this.text(Math.round(x + (CELL - tw) / 2), Math.round(y + CELL / 2 - 2), s, tc, sc, false);
  }
  private drawReady() {
    this.rect(0, 0, this.LW, this.LH, "#0e1424cc");
    this.textCenter(50, "PIGGY BANK", "#ffd24a", 2);
    this.textCenter(76, "SLIDE TO MERGE MATCHING COINS", "#c2c3c7", 1);
    this.textCenter(92, "PAD OR SWIPE - REACH THE 2048 VAULT", "#83769c", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(122, "PRESS JUMP TO START", "#fff1e8", 1);
  }
  private drawOver() {
    this.rect(0, 0, this.LW, this.LH, "#0e1424d8");
    this.textCenter(52, "BANK'S CLOSED", "#ff5d7d", 2);
    this.textCenter(78, `SAVED ${this.score}`, "#fff1e8", 2);
    this.textCenter(100, `TOP COIN ${this.maxTile()}   BEST ${this.best}`, "#ffd24a", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(128, "PRESS JUMP TO PLAY AGAIN", "#7be0ff", 1);
  }
}
