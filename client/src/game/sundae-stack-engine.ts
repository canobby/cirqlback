// sundae-stack-engine — Main Street cabinet #7 (Tetris homage). Trays of ice-cream
// scoops fall into the freezer; rotate + slot them to fill a shelf with no gaps — a
// full row ships and clears. Signature twist: a same-flavour row is a FLAVOUR combo
// (double score), each tier has a "ship N shelves" goal, and later tiers push
// BRAIN-FREEZE garbage rows up from the bottom. Tiers: Soft Serve → Sundae Bar →
// Deep Freeze. RetroEngine (16-bit + juice) + MusicKit; two-thumb d-pad + hard drop.

import { RetroEngine, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const COLS = 8, ROWS = 15, CELL = 11, OX = 18, OY = 14;
const BEST_KEY = "sundae_best";

type Cell = [number, number];
interface Shape { color: string; states: Cell[][]; }
const SHAPES: Shape[] = [
  { color: "#7be0ff", states: [[[0, 1], [1, 1], [2, 1], [3, 1]], [[2, 0], [2, 1], [2, 2], [2, 3]]] }, // I
  { color: "#ffd24a", states: [[[1, 0], [2, 0], [1, 1], [2, 1]]] }, // O
  { color: "#b79bff", states: [[[1, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [1, 1], [2, 1], [1, 2]], [[0, 1], [1, 1], [2, 1], [1, 2]], [[1, 0], [0, 1], [1, 1], [1, 2]]] }, // T
  { color: "#7be0c2", states: [[[1, 0], [2, 0], [0, 1], [1, 1]], [[1, 0], [1, 1], [2, 1], [2, 2]]] }, // S
  { color: "#ff8ab5", states: [[[0, 0], [1, 0], [1, 1], [2, 1]], [[2, 0], [1, 1], [2, 1], [1, 2]]] }, // Z
  { color: "#3bb6ff", states: [[[0, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [2, 0], [1, 1], [1, 2]], [[0, 1], [1, 1], [2, 1], [2, 2]], [[1, 0], [1, 1], [0, 2], [1, 2]]] }, // J
  { color: "#ffa300", states: [[[2, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [1, 1], [1, 2], [2, 2]], [[0, 1], [1, 1], [2, 1], [0, 2]], [[0, 0], [1, 0], [1, 1], [1, 2]]] }, // L
];

interface World { name: string; sky: [string, string]; drop: number; garbage: number; }
const WORLDS: World[] = [
  { name: "SOFT SERVE", sky: ["#1a3a4a", "#0a1622"], drop: 0.7, garbage: 0 },
  { name: "SUNDAE BAR", sky: ["#2a2044", "#12101f"], drop: 0.52, garbage: 8 },
  { name: "DEEP FREEZE", sky: ["#102a3a", "#060f18"], drop: 0.4, garbage: 6 },
];

const SUNDAE_THEME: Track = {
  bpm: 132,
  layers: [
    { role: "lead", wave: "square", gain: 0.38, pattern: [
      { n: "E5", d: 2 }, { n: "B4", d: 1 }, { n: "C5", d: 1 }, { n: "D5", d: 2 }, { n: "C5", d: 1 }, { n: "B4", d: 1 }, { n: "A4", d: 2 }, { n: "A4", d: 1 }, { n: "C5", d: 1 }, { n: "E5", d: 2 }, { n: "D5", d: 1 }, { n: "C5", d: 1 }, { n: "B4", d: 4 },
    ] },
    { role: "harmony", wave: "square", gain: 0.16, minIntensity: 0.4, pattern: [{ n: 0, d: 2 }, { n: "E4", d: 2 }, { n: 0, d: 2 }, { n: "A3", d: 2 }] },
    { role: "bass", wave: "triangle", gain: 0.5, pattern: [{ n: "A2", d: 2 }, { n: "A2", d: 2 }, { n: "E2", d: 2 }, { n: "E2", d: 2 }, { n: "A2", d: 2 }, { n: "G2", d: 2 }, { n: "F2", d: 2 }, { n: "E2", d: 2 }] },
    { role: "drums", minIntensity: 0.2, pattern: [{ n: "K", d: 2 }, { n: "H", d: 2 }, { n: "S", d: 2 }, { n: "H", d: 2 }] },
  ],
};

export class SundaeStackEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private grid: (string | null)[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  private world = 0;
  private piece = 0; private rot = 0; private ppx = 3; private ppy = 0;
  private nextPiece = 0;
  private dropT = 0; private moveT = 0; private lockPieces = 0;

  private score = 0; private lives = 3; private level = 1; private lines = 0; private target = 0; private combo = 0;
  private best = +(LS.get(BEST_KEY) || 0);
  private flash = 0; private intro = 0; private card = "";

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.42 });
    this.start();
  }
  protected onGesture() { this.music?.play(SUNDAE_THEME); }
  private w() { return WORLDS[this.world]; }

  private cells(piece: number, rot: number): Cell[] { const st = SHAPES[piece].states; return st[rot % st.length]; }
  private collide(piece: number, rot: number, x: number, y: number) {
    for (const [c, r] of this.cells(piece, rot)) { const gx = x + c, gy = y + r; if (gx < 0 || gx >= COLS || gy >= ROWS) return true; if (gy >= 0 && this.grid[gy][gx]) return true; }
    return false;
  }
  private spawn() {
    this.piece = this.nextPiece; this.nextPiece = Math.floor(this.rnd() * SHAPES.length);
    this.rot = 0; this.ppx = 3; this.ppy = 0;
    if (this.collide(this.piece, 0, this.ppx, this.ppy)) this.topOut();
  }
  private newLevel(fresh: boolean) {
    this.world = Math.floor((this.level - 1) / 3) % WORLDS.length;
    this.target = 4 + this.level; this.lines = 0;
    this.dropT = this.w().drop; this.lockPieces = 0;
    if (fresh) { this.intro = 1.4; this.card = ((this.level - 1) % 3 === 0 ? "TIER " + (this.world + 1) + "  " + this.w().name : "SHIFT " + this.level); }
  }
  private beginGame() {
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.score = 0; this.lives = 3; this.level = 1; this.combo = 0; this.clearFx();
    this.nextPiece = Math.floor(this.rnd() * SHAPES.length); this.newLevel(true); this.spawn(); this.state = "play"; this.music?.setIntensity(0.5); this.report();
  }
  private gameOver() {
    this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); }
    this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(5); this.hooks.onRunEnd?.({ score: this.score, shift: this.level }); this.report();
  }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: this.lives, shift: this.level, combo: this.combo }); }

  private topOut() {
    this.lives--; this.flash = 1; this.addShake(4); this.hitstop(0.06); this.buzz(80); this.noise(0.16, 0.06); this.tone(140, 0.18, "square", 0.05);
    // relief: clear the top 5 rows
    for (let r = 0; r < 5; r++) for (let c = 0; c < COLS; c++) if (this.grid[r][c]) { this.fxShards(this.cx(c), this.cy(r), this.grid[r][c]!, 3); this.grid[r][c] = null; }
    this.combo = 0;
    if (this.lives <= 0) this.gameOver(); else { this.rot = 0; this.ppx = 3; this.ppy = 0; this.report(); }
  }

  private lock() {
    for (const [c, r] of this.cells(this.piece, this.rot)) { const gy = this.ppy + r; if (gy >= 0) this.grid[gy][this.ppx + c] = SHAPES[this.piece].color; }
    this.tone(300, 0.04, "square", 0.03); this.addShake(0.5);
    this.clearLines();
    this.lockPieces++;
    if (this.w().garbage && this.lockPieces % this.w().garbage === 0) this.brainFreeze();
    this.spawn();
  }
  private clearLines() {
    const full: number[] = [];
    for (let r = 0; r < ROWS; r++) if (this.grid[r].every((x) => x)) full.push(r);
    if (!full.length) { this.combo = 0; return; }
    let gained = 0;
    for (const r of full) {
      const flavour = this.grid[r].every((x) => x === this.grid[r][0]);
      const base = 40 * full.length; const mult = flavour ? 2 : 1;
      gained += base * mult;
      for (let c = 0; c < COLS; c++) this.fxBurst(this.cx(c), this.cy(r), this.grid[r][c]!, 4, 70);
      if (flavour) this.fxPop(LW / 2 - 40, this.cy(r), "FLAVOUR!", "#ffd24a");
    }
    this.combo++; gained *= this.combo;
    this.score += gained; this.lines += full.length;
    this.fxRing(OX + COLS * CELL / 2, this.cy(full[0]), "#7be0ff", 40); this.fxPop(OX + COLS * CELL / 2, this.cy(full[0]) - 8, "+" + gained, "#fff4ea");
    this.tone(660 + this.combo * 40, 0.08, "square", 0.05); this.addShake(1.5); this.music?.setIntensity(Math.min(1, 0.5 + this.combo * 0.08));
    // collapse
    for (const r of full) { for (let rr = r; rr > 0; rr--) this.grid[rr] = this.grid[rr - 1].slice(); this.grid[0] = Array(COLS).fill(null); }
    if (this.lines >= this.target) this.levelUp();
  }
  private levelUp() {
    const bonus = 120 * this.level; this.score += bonus;
    this.fxRing(LW / 2, LH / 2, "#ffd24a", 70); this.fxPop(LW / 2, LH / 2 - 8, "SHIPPED! +" + bonus, "#ffd24a"); this.music?.playJingle(CLEAR_JINGLE, 165); this.addShake(2);
    this.level++; this.newLevel(true); this.report();
  }
  private brainFreeze() {
    if (this.grid[0].some((x) => x)) { this.topOut(); return; }
    for (let r = 0; r < ROWS - 1; r++) this.grid[r] = this.grid[r + 1].slice();
    const gap = Math.floor(this.rnd() * COLS); const row: (string | null)[] = [];
    for (let c = 0; c < COLS; c++) row.push(c === gap ? null : "#9ec8e0");
    this.grid[ROWS - 1] = row; this.addShake(2); this.tone(220, 0.14, "sawtooth", 0.04); this.fxPop(OX + COLS * CELL / 2, this.cy(ROWS - 2), "BRAIN FREEZE!", "#7be0ff");
  }

  private cx(c: number) { return OX + c * CELL + CELL / 2; }
  private cy(r: number) { return OY + r * CELL + CELL / 2; }
  private tryMove(dx: number) { if (!this.collide(this.piece, this.rot, this.ppx + dx, this.ppy)) this.ppx += dx; }
  private tryRotate() {
    const nr = (this.rot + 1) % SHAPES[this.piece].states.length;
    for (const k of [0, -1, 1, -2, 2]) if (!this.collide(this.piece, nr, this.ppx + k, this.ppy)) { this.rot = nr; this.ppx += k; this.tone(520, 0.03, "square", 0.03); return; }
  }
  private hardDrop() { let d = 0; while (!this.collide(this.piece, this.rot, this.ppx, this.ppy + 1)) { this.ppy++; d++; } this.score += d * 2; this.tone(420, 0.05, "square", 0.04); this.lock(); }

  protected update(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 3);
    if (this.state !== "play") { if (this.pressed.a || this.pressed.up || this.pressed.down || this.pressed.left || this.pressed.right || this.pointer.down) this.beginGame(); return; }
    if (this.intro > 0) { this.intro -= dt; return; }

    if (this.pressed.up) this.tryRotate();
    if (this.pressed.a) { this.hardDrop(); return; }
    // move repeat (DAS-ish)
    this.moveT -= dt;
    if (this.pressed.left) { this.tryMove(-1); this.moveT = 0.16; } else if (this.pressed.right) { this.tryMove(1); this.moveT = 0.16; }
    else if (this.moveT <= 0) { if (this.btn.left) { this.tryMove(-1); this.moveT = 0.06; } else if (this.btn.right) { this.tryMove(1); this.moveT = 0.06; } }

    // gravity (soft drop if down held)
    this.dropT -= dt * (this.btn.down ? 6 : 1);
    if (this.dropT <= 0) {
      this.dropT = this.w().drop;
      if (!this.collide(this.piece, this.rot, this.ppx, this.ppy + 1)) { this.ppy++; if (this.btn.down) this.score += 1; }
      else this.lock();
    }
  }

  // ---- draw ----
  private scoop(gx: number, gy: number, color: string, ghost = false) {
    const x = OX + gx * CELL, y = OY + gy * CELL;
    if (ghost) { this.rect(x + 1, y + 1, CELL - 2, CELL - 2, color + "00"); this.ring(x + CELL / 2, y + CELL / 2, CELL / 2 - 1, "#ffffff33", 1); return; }
    this.rect(x + 1, y + 1, CELL - 2, CELL - 2, color); this.rect(x + 1, y + 1, CELL - 2, 1, "#ffffff44"); this.ball(x + CELL / 2, y + CELL / 2, 3, color);
  }

  protected render() {
    const w = this.w();
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#4a1530" : w.sky[0], w.sky[1]);
    // freezer well
    this.rect(OX - 3, OY, 3, ROWS * CELL, "#3a5a6a"); this.rect(OX + COLS * CELL, OY, 3, ROWS * CELL, "#3a5a6a"); this.rect(OX - 3, OY + ROWS * CELL, COLS * CELL + 6, 3, "#3a5a6a");
    this.rect(OX, OY, COLS * CELL, ROWS * CELL, "#0d2230");
    // settled
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (this.grid[r][c]) this.scoop(c, r, this.grid[r][c]!);
    if (this.state === "play") {
      // ghost
      let gy = this.ppy; while (!this.collide(this.piece, this.rot, this.ppx, gy + 1)) gy++;
      for (const [c, r] of this.cells(this.piece, this.rot)) if (gy + r >= 0) this.scoop(this.ppx + c, gy + r, SHAPES[this.piece].color, true);
      // current
      for (const [c, r] of this.cells(this.piece, this.rot)) if (this.ppy + r >= 0) this.scoop(this.ppx + c, this.ppy + r, SHAPES[this.piece].color);
    }
    // side panel: NEXT + goal
    const panelX = OX + COLS * CELL + 12;
    this.text(panelX, 20, "NEXT", "#7be0ff", 1, false);
    this.rect(panelX, 28, 44, 30, "#0d2230"); this.rect(panelX, 28, 44, 30, "#3a5a6a"); this.rect(panelX + 1, 29, 42, 28, "#0a1a24");
    for (const [c, r] of this.cells(this.nextPiece, 0)) this.rect(panelX + 6 + c * 9, 32 + r * 9, 8, 8, SHAPES[this.nextPiece].color);
    this.text(panelX, 72, "SHIP", "#c3b4de", 1, false); this.text(panelX, 82, this.lines + "/" + this.target, "#ffd24a", 1, false);
    this.text(panelX, 100, "TIER " + (this.world + 1), "#83769c", 1, false);

    this.drawFx();

    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#ffe6c2", 1, false);
    this.text(120, 3, "SHIFT " + this.level, "#ffb020", 1, false);
    if (this.combo > 1) this.text(90, 3, "x" + this.combo, "#ffd24a", 1, false);
    for (let i = 0; i < 3; i++) this.disc(LW - 9 - i * 9, 6, 3, i < this.lives ? "#7be0ff" : "#3a2a2a");

    if (this.state === "play" && this.intro > 0) { this.b.globalAlpha = 0.55; this.rect(0, 78, LW, 34, "#0a0714"); this.b.globalAlpha = 1; this.textCenter(88, this.card, "#7be0ff", 2); }
    if (this.state !== "play") this.overlay();
  }
  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(38, "SUNDAE STACK", "#7be0ff", 2);
      this.textCenter(62, "FILL A SHELF TO SHIP IT", "#c3b4de", 1);
      this.textCenter(86, "LEFT RIGHT MOVE / UP ROTATE", "#83769c", 1);
      this.textCenter(98, "DOWN SOFT / DROP HARD-DROPS", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS DROP TO START", "#ffec27", 1);
    } else {
      this.textCenter(46, "FREEZER FULL", "#ff5d7d", 2);
      this.textCenter(72, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(86, "BEST " + this.best, "#ffd24a", 1);
      this.textCenter(102, "REACHED SHIFT " + this.level, "#c3b4de", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS DROP TO RETRY", "#ffec27", 1);
    }
  }
}
