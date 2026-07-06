// WIRE UP — a Flow-Free homage, a MODERN cabinet (CHR-199).
//
// The shop's junction box is a mess. Drag a wire from each terminal to its matching-colour
// twin — no crossing, and fill every empty cell. Board solved, a bigger one snaps in. It's
// a timed shift, so wire fast. Puzzles are generated from a random space-filling path then
// cut into colour segments, so every board is guaranteed solvable.

import { RetroEngine, shade, type RetroHooks } from "./retro-engine";
import { mulberry32 } from "./arcade-core";
import { MusicKit, MAIN_STREET_THEME } from "./musickit";

const SHIFT = 100;
const WCOL = ["#ff5d7d", "#3bb6ff", "#ffd24a", "#33e650", "#b79bff", "#ff8a3d"];

export class WireUpEngine extends RetroEngine {
  private N = 5; private ep: number[][] = [];       // endpoint colour per cell, -1 none
  private cell: number[][] = [];                    // wire colour occupying cell, -1 none
  private paths: number[][][] = [];                 // paths[color] = [[r,c],...] from its start endpoint
  private starts: [number, number][] = [];          // one endpoint per colour (the "start")
  private ncolors = 4; private drawing = -1; private level = 0; private sol: number[][][] = [];
  private state: "ready" | "play" | "over" = "ready";
  private t = 0; private tAnim = 0; private score = 0; private best = 0; private msg = ""; private msgT = 0; private lastDown = false;
  private seed = 12345;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, 200, 200);
    this.music = new MusicKit();
    try { this.best = +(window.localStorage.getItem("wireup_best") || 0); } catch { /* ignore */ }
    this.gen();
    this.running = true;
    this.emit();
  }
  protected onGesture() { this.music?.play(MAIN_STREET_THEME); this.music?.setIntensity(0.4); }

  private gen() {
    const N = this.N; const rnd = mulberry32((this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff));
    // random space-filling (Hamiltonian) path via DFS with budget, snake fallback
    const path = this.hamPath(N, rnd);
    // cut into K contiguous segments (>=3 each)
    const K = Math.min(WCOL.length, Math.max(3, this.ncolors));
    const seg: number[][][] = []; let idx = 0;
    for (let i = 0; i < K; i++) { const len = i === K - 1 ? path.length - idx : Math.max(3, Math.round((path.length - idx) / (K - i))); seg.push(path.slice(idx, idx + len)); idx += len; }
    this.ep = Array.from({ length: N }, () => new Array(N).fill(-1));
    this.cell = Array.from({ length: N }, () => new Array(N).fill(-1));
    this.starts = []; this.paths = [];
    seg.forEach((s, c) => { const a = s[0], b = s[s.length - 1]; this.ep[a[0]][a[1]] = c; this.ep[b[0]][b[1]] = c; this.cell[a[0]][a[1]] = c; this.cell[b[0]][b[1]] = c; this.starts.push([a[0], a[1]]); this.paths.push([[a[0], a[1]]]); });
    this.sol = seg;   // the generated solution (one valid full-fill), for verification / future hints
  }
  private hamPath(N: number, rnd: () => number): number[][] {
    const seen = Array.from({ length: N }, () => new Array(N).fill(false));
    const path: number[][] = []; let steps = 0; const budget = 60000;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const dfs = (r: number, c: number): boolean => {
      seen[r][c] = true; path.push([r, c]); if (path.length === N * N) return true;
      const ds = dirs.slice().sort(() => rnd() - 0.5);
      for (const [dr, dc] of ds) { const nr = r + dr, nc = c + dc; if (nr >= 0 && nr < N && nc >= 0 && nc < N && !seen[nr][nc] && steps++ < budget) { if (dfs(nr, nc)) return true; } }
      seen[r][c] = false; path.pop(); return false;
    };
    const sr = Math.floor(rnd() * N), sc = Math.floor(rnd() * N);
    if (dfs(sr, sc)) return path;
    // snake fallback
    const snake: number[][] = []; for (let r = 0; r < N; r++) { if (r % 2 === 0) for (let c = 0; c < N; c++) snake.push([r, c]); else for (let c = N - 1; c >= 0; c--) snake.push([r, c]); } return snake;
  }

  private reset() { this.N = 5; this.ncolors = 4; this.level = 0; this.score = 0; this.t = 0; this.drawing = -1; this.gen(); this.clearFx(); }
  private begin() { this.reset(); this.state = "play"; this.msg = ""; this.music?.setIntensity(0.7); this.emit(); }
  protected onStart() { this.begin(); }
  protected onMenu() { this.state = "ready"; this.reset(); this.emit(); }
  private emit() { this.hooks.onHud?.({ state: this.state, score: this.score, level: this.level + 1, time: Math.max(0, SHIFT - this.t), best: this.best }); }

  // layout
  private gsz() { return Math.floor(160 / this.N); }
  private ox() { return (this.LW - this.N * this.gsz()) / 2; }
  private oy() { return 26; }
  private cellAt(px: number, py: number): [number, number] | null { const g = this.gsz(); const c = Math.floor((px - this.ox()) / g), r = Math.floor((py - this.oy()) / g); if (r < 0 || c < 0 || r >= this.N || c >= this.N) return null; return [r, c]; }

  protected update(dt: number) {
    this.tAnim += dt; this.msgT = Math.max(0, this.msgT - dt);
    if (this.state === "ready" || this.state === "over") { if (this.pressed.a || (this.pointer.down && !this.lastDown)) this.begin(); this.lastDown = this.pointer.down; return; }
    this.t += dt; if (this.t >= SHIFT) return this.over();
    // pointer draw
    if (this.pointer.down) { const at = this.cellAt(this.pointer.x, this.pointer.y); if (at) { if (!this.lastDown) this.startDraw(at[0], at[1]); else if (this.drawing >= 0) this.extend(at[0], at[1]); } }
    else if (this.lastDown) this.drawing = -1;
    this.lastDown = this.pointer.down;
    this.emit();
  }
  private startDraw(r: number, c: number) {
    const col = this.ep[r][c] >= 0 ? this.ep[r][c] : this.cell[r][c];
    if (col < 0) return;
    this.drawing = col;
    if (this.ep[r][c] === col) { this.clearColor(col); this.paths[col] = [[r, c]]; this.cell[r][c] = col; }        // start fresh from this endpoint
    else { const p = this.paths[col]; const i = p.findIndex(([pr, pc]) => pr === r && pc === c); if (i >= 0) { for (let k = i + 1; k < p.length; k++) { const [er, ec] = p[k]; if (this.ep[er][ec] !== col) this.cell[er][ec] = -1; } p.length = i + 1; } }
    this.tone(500, 0.02, "square", 0.03);
  }
  private clearColor(col: number) { for (const [r, c] of this.paths[col]) if (this.ep[r][c] !== col) this.cell[r][c] = -1; }
  private extend(r: number, c: number) {
    const col = this.drawing; const p = this.paths[col]; const [lr, lc] = p[p.length - 1];
    if (r === lr && c === lc) return;
    if (Math.abs(r - lr) + Math.abs(c - lc) !== 1) return;                       // must be adjacent
    // retrace: stepping onto own earlier cell truncates
    const own = p.findIndex(([pr, pc]) => pr === r && pc === c);
    if (own >= 0) { for (let k = own + 1; k < p.length; k++) { const [er, ec] = p[k]; if (this.ep[er][ec] !== col) this.cell[er][ec] = -1; } p.length = own + 1; return; }
    if (this.ep[r][c] >= 0 && this.ep[r][c] !== col) return;                     // can't cross another terminal
    if (p.length >= 2 && this.ep[lr][lc] === col && p.length > 1) { /* already reached far end earlier — allow re-extend only from truncation */ }
    // if reached the matching endpoint, connect (and stop growing past it)
    const other = this.cell[r][c];
    if (other >= 0 && other !== col) this.cutColor(other, r, c);                 // cut the crossed wire
    this.cell[r][c] = col; p.push([r, c]);
    this.tone(660, 0.015, "square", 0.03);
    if (this.ep[r][c] === col) { this.buzz(4); this.checkWin(); }
  }
  private cutColor(col: number, r: number, c: number) { const p = this.paths[col]; const i = p.findIndex(([pr, pc]) => pr === r && pc === c); if (i < 0) return; for (let k = i; k < p.length; k++) { const [er, ec] = p[k]; if (this.ep[er][ec] !== col) this.cell[er][ec] = -1; } p.length = Math.max(1, i); }
  private connected(col: number): boolean { const p = this.paths[col]; if (p.length < 2) return false; const [er, ec] = p[p.length - 1]; return this.ep[er][ec] === col; }
  private checkWin() {
    for (let col = 0; col < this.starts.length; col++) if (!this.connected(col)) return;
    for (let r = 0; r < this.N; r++) for (let c = 0; c < this.N; c++) if (this.cell[r][c] < 0) return;
    this.solved();
  }
  private solved() {
    const bonus = 150 + this.N * 30; this.score += bonus; this.level++;
    this.fxPop(this.LW / 2, 14, `+${bonus} WIRED!`, "#33e650", 1); this.addShake(1); this.tone(523, 0.08, "square", .05); this.tone(659, 0.08, "square", .05); this.tone(880, 0.16, "square", .05); this.music?.setIntensity(1);
    if (this.level % 2 === 0 && this.N < 6) this.N++;
    if (this.level >= 1 && this.ncolors < 6) this.ncolors = Math.min(6, this.ncolors + 1);
    this.gen(); this.drawing = -1;
  }
  private over() { this.state = "over"; this.music?.setIntensity(0.2); if (this.score > this.best) { this.best = this.score; try { window.localStorage.setItem("wireup_best", String(this.best)); } catch { /* ignore */ } } this.hooks.onRunEnd?.({ score: this.score, shift: this.level }); this.emit(); }

  // ---------- render ----------
  protected render() {
    this.vgrad(0, 0, this.LW, this.LH, "#101820", "#0a1016");
    this.rect(0, 0, this.LW, 14, "#0a0714aa");
    this.text(4, 4, "WIRED", "#3bb6ff", 1, false); this.text(38, 4, `${this.score}`, "#fff1e8", 1, false);
    this.text(96, 4, "BOX", "#ffd24a", 1, false); this.text(116, 4, `${this.level + 1}`, "#fff1e8", 1, false);
    const tl = Math.max(0, SHIFT - this.t); this.text(150, 4, "TIME", "#ff8ab5", 1, false); this.text(176, 4, `${Math.ceil(tl)}`, tl < 10 ? "#ff5d7d" : "#fff1e8", 1, false);
    const g = this.gsz(), ox = this.ox(), oy = this.oy();
    // board bg + grid
    this.rect(ox - 2, oy - 2, this.N * g + 4, this.N * g + 4, "#141c26"); this.rectLine(ox - 2, oy - 2, this.N * g + 4, this.N * g + 4, "#2a3a4a");
    for (let r = 0; r < this.N; r++) for (let c = 0; c < this.N; c++) this.rectLine(ox + c * g, oy + r * g, g, g, "#1a2430");
    // wires (thick segments along each path)
    for (let col = 0; col < this.paths.length; col++) { const p = this.paths[col], color = WCOL[col]; for (let i = 1; i < p.length; i++) { const [ar, ac] = p[i - 1], [br, bc] = p[i]; const ax = ox + ac * g + g / 2, ay = oy + ar * g + g / 2, bx2 = ox + bc * g + g / 2, by2 = oy + br * g + g / 2; this.thick(ax, ay, bx2, by2, color, Math.max(3, g / 3 | 0)); } }
    // endpoints
    for (let r = 0; r < this.N; r++) for (let c = 0; c < this.N; c++) if (this.ep[r][c] >= 0) { const x = ox + c * g + g / 2, y = oy + r * g + g / 2; this.disc(x | 0, y | 0, (g / 2 - 3) | 0, WCOL[this.ep[r][c]]); this.ring(x | 0, y | 0, (g / 2 - 2) | 0, shade(WCOL[this.ep[r][c]], 0.3), 1.2); if (this.connected(this.ep[r][c])) this.px(x | 0, y | 0, "#fff"); }
    this.drawFx();
    if (this.state === "ready") this.drawReady();
    if (this.state === "over") this.drawOver();
  }
  private thick(x0: number, y0: number, x1: number, y1: number, c: string, w: number) { const hw = w / 2 | 0; if (x0 === x1) this.rect((x0 - hw) | 0, Math.min(y0, y1) | 0, w, Math.abs(y1 - y0) | 0, c); else this.rect(Math.min(x0, x1) | 0, (y0 - hw) | 0, Math.abs(x1 - x0) | 0, w, c); this.disc(x1 | 0, y1 | 0, hw, c); this.disc(x0 | 0, y0 | 0, hw, c); }
  private drawReady() {
    this.rect(0, 0, this.LW, this.LH, "#0a1016cc");
    this.textCenter(56, "WIRE UP", "#3bb6ff", 3);
    this.textCenter(88, "CONNECT EACH COLOUR PAIR", "#c2c3c7", 1);
    this.textCenter(102, "FILL EVERY CELL - NO CROSSING", "#83769c", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(132, "TAP TO START", "#fff1e8", 1);
  }
  private drawOver() {
    this.rect(0, 0, this.LW, this.LH, "#0a1016cc");
    this.textCenter(60, "SHIFT'S UP!", "#3bb6ff", 2);
    this.textCenter(86, `${this.level} BOXES WIRED`, "#fff1e8", 1);
    this.textCenter(102, `SCORE ${this.score}    BEST ${this.best}`, "#ffd24a", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(130, "TAP TO WIRE AGAIN", "#7be0ff", 1);
  }
}
