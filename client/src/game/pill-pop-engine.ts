// pill-pop-engine — Main Street cabinet (Dr. Mario homage). A pharmacy: drop
// two-tone capsules and line up FOUR of a colour to clear them — and any germ of
// that colour caught in the line pops too. Clear every germ to fill the
// prescription and advance. Signature twist: clear on a chain (a cascade after
// gravity) for a PRESCRIPTION COMBO multiplier. Levels add more germs + speed.
// RetroEngine + juice + MusicKit; d-pad move/soft-drop + rotate + hard-drop.

import { RetroEngine, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const BEST_KEY = "pill_best";
const COLS = 8, ROWS = 16, CELL = 9;
const FX = (LW - COLS * CELL) / 2 | 0, FY = 16;
const COLORS = ["#ff5d7d", "#3bb6ff", "#ffd24a"];
const COLOR_DK = ["#a8324f", "#2570a0", "#b88a10"];

type Link = 0 | "l" | "r" | "u" | "d";
interface Cell { color: number; virus: boolean; link: Link }
type Piece = { r: number; c: number; o: number; a: number; b: number };

const PILL_THEME: Track = {
  bpm: 128,
  layers: [
    { role: "lead", wave: "square", gain: 0.36, pattern: [
      { n: "E5", d: 2 }, { n: "G5", d: 2 }, { n: "F5", d: 1 }, { n: "E5", d: 1 }, { n: "D5", d: 2 }, { n: "E5", d: 2 }, { n: "C5", d: 2 }, { n: "A4", d: 2 },
      { n: "B4", d: 2 }, { n: "D5", d: 2 }, { n: "C5", d: 1 }, { n: "B4", d: 1 }, { n: "A4", d: 2 }, { n: "B4", d: 2 }, { n: "G4", d: 2 },
    ] },
    { role: "harmony", wave: "square", gain: 0.16, minIntensity: 0.4, pattern: [{ n: 0, d: 2 }, { n: "A3", d: 2 }, { n: 0, d: 2 }, { n: "E3", d: 2 }] },
    { role: "bass", wave: "triangle", gain: 0.5, pattern: [{ n: "A2", d: 2 }, { n: "A2", d: 2 }, { n: "E2", d: 2 }, { n: "E2", d: 2 }, { n: "F2", d: 2 }, { n: "F2", d: 2 }, { n: "G2", d: 2 }, { n: "G2", d: 2 }] },
    { role: "drums", minIntensity: 0.25, pattern: [{ n: "K", d: 2 }, { n: "H", d: 2 }, { n: "S", d: 2 }, { n: "H", d: 2 }] },
  ],
};

export class PillPopEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private grid: (Cell | null)[][] = [];
  private piece: Piece | null = null;
  private nextA = 0; private nextB = 1;
  private level = 1; private score = 0; private virusesLeft = 0; private combo = 0;
  private best = +(LS.get(BEST_KEY) || 0);
  private dropT = 0; private moveT = 0; private lockFlash = 0; private clearing: [number, number][] = []; private clearT = 0;
  private intro = 0; private card = "";

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.4 });
    this.newLevel();      // populate a board so the ready screen shows the field
    this.start();
  }
  protected onGesture() { this.music?.play(PILL_THEME); }

  private dropInterval() { return Math.max(0.24, 0.8 - (this.level - 1) * 0.05); }

  private newLevel() {
    this.grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
    const germs = Math.min(4 + this.level * 3, 40);
    let placed = 0, guard = 0;
    while (placed < germs && guard++ < 2000) {
      const r = 5 + Math.floor(this.rnd() * (ROWS - 6)), c = Math.floor(this.rnd() * COLS), color = Math.floor(this.rnd() * 3);
      if (this.grid[r][c]) continue;
      // avoid making 3-in-a-line of the same colour at placement
      if (this.countRun(r, c, color) >= 2) continue;
      this.grid[r][c] = { color, virus: true, link: 0 }; placed++;
    }
    this.virusesLeft = placed;
    this.nextA = Math.floor(this.rnd() * 3); this.nextB = Math.floor(this.rnd() * 3);
    this.piece = null; this.clearing = []; this.spawn();
  }
  private countRun(r: number, c: number, color: number) {
    let n = 0;
    for (const [dr, dc] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as [number, number][]) { let rr = r + dr, cc = c + dc, k = 0; while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && this.grid[rr][cc]?.color === color && this.grid[rr][cc]?.virus) { k++; rr += dr; cc += dc; } n = Math.max(n, k); }
    return n;
  }

  private cellsOf(o: number, r: number, c: number): [number, number][] {
    return o === 0 ? [[r, c], [r, c + 1]] : o === 1 ? [[r, c], [r - 1, c]] : o === 2 ? [[r, c], [r, c - 1]] : [[r, c], [r + 1, c]];
  }
  private fits(o: number, r: number, c: number): boolean {
    for (const [pr, pc] of this.cellsOf(o, r, c)) { if (pc < 0 || pc >= COLS || pr >= ROWS) return false; if (pr >= 0 && this.grid[pr][pc]) return false; }
    return true;
  }
  private spawn() {
    this.piece = { r: 1, c: 3, o: 0, a: this.nextA, b: this.nextB };
    this.nextA = Math.floor(this.rnd() * 3); this.nextB = Math.floor(this.rnd() * 3);
    this.dropT = 0;
    if (!this.fits(this.piece.o, this.piece.r, this.piece.c)) { this.piece = null; this.gameOver(); }
  }

  private beginGame() { this.level = 1; this.score = 0; this.combo = 0; this.clearFx(); this.newLevel(); this.intro = 1.3; this.card = "RX 1"; this.state = "play"; this.music?.setIntensity(0.5); this.report(); }
  private gameOver() { this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); } this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(5); this.hooks.onRunEnd?.({ score: this.score, shift: this.level }); this.report(); }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, shift: this.level, lives: this.virusesLeft, combo: this.combo }); }

  private lock() {
    const p = this.piece!; const [[ar, ac], [br, bc]] = this.cellsOf(p.o, p.r, p.c);
    const linkA: Link = p.o === 0 ? "r" : p.o === 1 ? "u" : p.o === 2 ? "l" : "d";
    const linkB: Link = p.o === 0 ? "l" : p.o === 1 ? "d" : p.o === 2 ? "r" : "u";
    if (ar >= 0) this.grid[ar][ac] = { color: p.a, virus: false, link: linkA };
    if (br >= 0) this.grid[br][bc] = { color: p.b, virus: false, link: linkB };
    this.piece = null; this.lockFlash = 0.12; this.tone(300, 0.05, "square", 0.04); this.buzz(6);
    this.combo = 0; this.resolve();
  }

  private unlinkPartner(r: number, c: number) {
    const cell = this.grid[r][c]; if (!cell || cell.link === 0) return;
    const d = cell.link; const pr = r + (d === "u" ? -1 : d === "d" ? 1 : 0), pc = c + (d === "l" ? -1 : d === "r" ? 1 : 0);
    const pcell = this.grid[pr]?.[pc]; if (pcell) pcell.link = 0;
  }
  private findMatches(): Set<string> {
    const marks = new Set<string>();
    for (let r = 0; r < ROWS; r++) { let run = 1; for (let c = 1; c <= COLS; c++) { const same = c < COLS && this.grid[r][c] && this.grid[r][c - 1] && this.grid[r][c]!.color === this.grid[r][c - 1]!.color; if (same) run++; else { if (run >= 4) for (let k = c - run; k < c; k++) marks.add(r + "," + k); run = 1; } } }
    for (let c = 0; c < COLS; c++) { let run = 1; for (let r = 1; r <= ROWS; r++) { const same = r < ROWS && this.grid[r][c] && this.grid[r - 1][c] && this.grid[r][c]!.color === this.grid[r - 1][c]!.color; if (same) run++; else { if (run >= 4) for (let k = r - run; k < r; k++) marks.add(k + "," + c); run = 1; } } }
    return marks;
  }
  private applyGravity(): boolean {
    let movedAny = false, moved = true;
    while (moved) {
      moved = false;
      for (let r = ROWS - 2; r >= 0; r--) for (let c = 0; c < COLS; c++) {
        const cell = this.grid[r][c]; if (!cell || cell.virus) continue;
        const comp: [number, number][] = [[r, c]];
        if (cell.link === "l") comp.push([r, c - 1]); else if (cell.link === "r") comp.push([r, c + 1]); else if (cell.link === "u") comp.push([r - 1, c]); else if (cell.link === "d") comp.push([r + 1, c]);
        const anchor = comp.every(([pr, pc]) => pr > r || (pr === r && pc >= c)); if (!anchor) continue;
        const canFall = comp.every(([pr, pc]) => { const nr = pr + 1; if (nr >= ROWS) return false; const below = this.grid[nr][pc]; return !below || comp.some(([qr, qc]) => qr === nr && qc === pc); });
        if (canFall) { const saved = comp.map(([pr, pc]) => ({ pr, pc, v: this.grid[pr][pc] })); for (const s of saved) this.grid[s.pr][s.pc] = null; for (const s of saved) this.grid[s.pr + 1][s.pc] = s.v; moved = true; movedAny = true; }
      }
    }
    return movedAny;
  }
  private resolve() {
    this.applyGravity();
    const marks = this.findMatches();
    if (marks.size === 0) { if (this.virusesLeft <= 0) this.levelClear(); else this.spawn(); return; }
    this.combo++;
    let virusHit = 0;
    for (const key of Array.from(marks)) { const [r, c] = key.split(",").map(Number); const cell = this.grid[r][c]!; if (cell.virus) { virusHit++; this.virusesLeft--; } this.unlinkPartner(r, c); const cx = FX + c * CELL + CELL / 2, cy = FY + r * CELL + CELL / 2; this.fxBurst(cx, cy, COLORS[cell.color], 8, 80); this.grid[r][c] = null; }
    const gain = marks.size * 20 * this.combo + virusHit * 60 * this.combo; this.score += gain;
    this.fxPop(FX + COLS * CELL / 2, FY + 20, (this.combo > 1 ? "COMBO x" + this.combo + "  +" : "+") + gain, this.combo > 1 ? "#ffd24a" : "#7be0c2");
    this.addShake(1 + this.combo * 0.4); this.hitstop(0.03); this.tone(500 + this.combo * 80, 0.07, "square", 0.05); if (virusHit) this.tone(760, 0.09, "square", 0.05);
    this.clearT = 0.14; this.report();
    // cascade after a beat (handled by clearT in update → resolve again)
  }
  private levelClear() {
    const bonus = 500 * this.level + this.virusesLeftBonus(); this.score += bonus;
    this.fxRing(LW / 2, LH / 2, "#33e650", 90); this.fxPop(LW / 2, LH / 2 - 10, "PRESCRIPTION FILLED +" + bonus, "#33e650"); this.music?.playJingle(CLEAR_JINGLE, 165); this.addShake(3);
    this.level++; this.newLevel(); this.intro = 1.2; this.card = "RX " + this.level; this.report();
  }
  private virusesLeftBonus() { return 0; }

  protected update(dt: number) {
    this.lockFlash = Math.max(0, this.lockFlash - dt);
    if (this.state !== "play") { if (this.pressed.a || this.pressed.b || this.pressed.left || this.pressed.right || this.pressed.down || this.pointer.down) this.beginGame(); return; }
    if (this.intro > 0) { this.intro -= dt; return; }
    if (this.clearT > 0) { this.clearT -= dt; if (this.clearT <= 0) this.resolve(); return; }
    if (!this.piece) return;
    const p = this.piece;

    // rotate
    if (this.pressed.a || this.pressed.up) {
      const no = (p.o + 1) % 4;
      if (this.fits(no, p.r, p.c)) p.o = no;
      else if (this.fits(no, p.r, p.c - 1)) { p.c--; p.o = no; }
      else if (this.fits(no, p.r, p.c + 1)) { p.c++; p.o = no; }
      else if (this.fits(no, p.r - 1, p.c)) { p.r--; p.o = no; }
      if (p.o === no) { this.tone(680, 0.04, "square", 0.03); this.buzz(4); }
    }
    // horizontal move with DAS
    this.moveT -= dt;
    const dir = (this.btn.right ? 1 : 0) - (this.btn.left ? 1 : 0);
    if (this.pressed.left || this.pressed.right) { const d = this.pressed.right ? 1 : -1; if (this.fits(p.o, p.r, p.c + d)) { p.c += d; this.tone(420, 0.03, "square", 0.03); } this.moveT = 0.16; }
    else if (dir !== 0 && this.moveT <= 0) { if (this.fits(p.o, p.r, p.c + dir)) p.c += dir; this.moveT = 0.06; }

    // gravity / soft drop / hard drop
    if (this.pressed.b) { while (this.fits(p.o, p.r + 1, p.c)) p.r++; this.lock(); return; }
    this.dropT += dt * (this.btn.down ? 8 : 1);
    if (this.dropT >= this.dropInterval()) { this.dropT = 0; if (this.fits(p.o, p.r + 1, p.c)) p.r++; else { this.lock(); return; } }
  }

  // ---- draw ----
  private drawCell(r: number, c: number, cell: Cell) {
    const x = FX + c * CELL, y = FY + r * CELL, col = COLORS[cell.color], dk = COLOR_DK[cell.color];
    if (cell.virus) { this.rect(x + 1, y + 1, CELL - 2, CELL - 2, dk); this.disc(x + CELL / 2, y + CELL / 2, CELL / 2 - 2, col); this.rect(x + 2, y + 3, 2, 2, "#0a0714"); this.rect(x + CELL - 4, y + 3, 2, 2, "#0a0714"); this.rect(x + 3, y + CELL - 3, CELL - 6, 1, "#0a071480"); }
    else { this.shelf(x + 1, y + 1, CELL - 2, CELL - 2, col); this.px(x + 2, y + 2, "#ffffffb0"); if (cell.link) { const d = cell.link; if (d === "r") this.rect(x + CELL - 1, y + 2, 1, CELL - 4, dk); if (d === "l") this.rect(x, y + 2, 1, CELL - 4, dk); if (d === "d") this.rect(x + 2, y + CELL - 1, CELL - 4, 1, dk); if (d === "u") this.rect(x + 2, y, CELL - 4, 1, dk); } }
  }
  protected render() {
    this.vgrad(0, 0, LW, LH, "#141a2a", "#080a14");
    // field frame
    this.rect(FX - 3, FY - 3, COLS * CELL + 6, ROWS * CELL + 6, "#2a3550");
    this.rect(FX - 1, FY - 1, COLS * CELL + 2, ROWS * CELL + 2, "#0a0e18");
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const cell = this.grid[r][c]; if (cell) this.drawCell(r, c, cell); }
    // active piece
    if (this.piece) { const p = this.piece; const cells = this.cellsOf(p.o, p.r, p.c); const cols = [p.a, p.b]; cells.forEach(([r, c], i) => { if (r < 0) return; const link: Link = i === 0 ? (p.o === 0 ? "r" : p.o === 1 ? "u" : p.o === 2 ? "l" : "d") : (p.o === 0 ? "l" : p.o === 1 ? "d" : p.o === 2 ? "r" : "u"); this.drawCell(r, c, { color: cols[i], virus: false, link }); }); }
    this.drawFx();

    // HUD
    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#e6e9ff", 1, false);
    this.text(150, 3, "RX " + this.level, "#7be0c2", 1, false);
    // side panel: germs left + next
    const px0 = FX + COLS * CELL + 10;
    this.text(px0, 20, "GERMS", "#ff5d7d"); this.text(px0, 30, "" + this.virusesLeft, "#fff4ea");
    this.text(px0, 48, "NEXT", "#7be0c2");
    { const x = px0, y = 58; this.shelf(x, y, CELL - 1, CELL - 1, COLORS[this.nextA]); this.shelf(x + CELL, y, CELL - 1, CELL - 1, COLORS[this.nextB]); }
    if (this.combo > 1) this.text(px0, 78, "x" + this.combo, "#ffd24a");

    if (this.state === "play" && this.intro > 0) { this.b.globalAlpha = 0.55; this.rect(0, 78, LW, 30, "#0a0714"); this.b.globalAlpha = 1; this.textCenter(88, this.card, "#7be0c2", 2); }
    if (this.state !== "play") this.overlay();
  }
  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(40, "PILL POP", "#7be0c2", 2);
      this.textCenter(64, "LINE UP FOUR TO CLEAR", "#c3b4de", 1);
      this.textCenter(84, "MATCH A GERM'S COLOUR TO POP IT", "#83769c", 1);
      this.textCenter(96, "CLEAR EVERY GERM TO FILL THE RX", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS ROTATE TO START", "#ffec27", 1);
    } else {
      this.textCenter(48, "OUT OF ROOM", "#ff5d7d", 2);
      this.textCenter(74, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(88, "BEST " + this.best, "#ffd24a", 1);
      this.textCenter(104, "REACHED RX " + this.level, "#c3b4de", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS ROTATE TO RETRY", "#ffec27", 1);
    }
  }
}
