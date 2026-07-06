// frost-bite-engine — Main Street cabinet (Pengo homage). A fishmonger's ice house:
// shove blocks of shaved ice across the floor to squash the crawling churn-crabs. A
// pushed block slides until it hits a wall or another block — catch a crab in its
// path and it's flattened. Clear every crab to move to the next case. Signature
// twist: slide one block through TWO+ crabs in a line for a FROST COMBO, and a
// glittering ICE STAR block flash-freezes every crab when it slams a wall. Cases:
// Fish Case -> Freezer -> Deep Freeze. RetroEngine + juice + MusicKit; 4-way d-pad.

import { RetroEngine, shade, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const BEST_KEY = "frost_best";
const COLS = 13, ROWS = 9, CELL = 16;
const FX = (LW - COLS * CELL) / 2 | 0, FY = 14;
// cell: 0 empty, 1 ice, 2 wall, 3 ice-star
type Crab = { c: number; r: number; moveT: number; stun: number; dead: boolean; deathT: number };

interface Case { name: string; floor: [string, string]; ice: string; crabs: number; speed: number; density: number }
const CASES: Case[] = [
  { name: "FISH CASE", floor: ["#1a2a3a", "#0a1420"], ice: "#a8d8e8", crabs: 3, speed: 0.85, density: 0.3 },
  { name: "FREEZER", floor: ["#1a2438", "#0a1020"], ice: "#bfe4f0", crabs: 4, speed: 0.68, density: 0.34 },
  { name: "DEEP FREEZE", floor: ["#12203a", "#080e1c"], ice: "#d0eef8", crabs: 5, speed: 0.52, density: 0.38 },
];

const FROST_THEME: Track = {
  bpm: 126,
  layers: [
    { role: "lead", wave: "square", gain: 0.34, pattern: [
      { n: "E5", d: 2 }, { n: "B4", d: 2 }, { n: "C5", d: 2 }, { n: "D5", d: 2 }, { n: "E5", d: 2 }, { n: "G5", d: 2 }, { n: "E5", d: 4 },
      { n: "D5", d: 2 }, { n: "C5", d: 2 }, { n: "B4", d: 2 }, { n: "A4", d: 2 }, { n: "B4", d: 4 },
    ] },
    { role: "harmony", wave: "square", gain: 0.14, minIntensity: 0.4, pattern: [{ n: 0, d: 2 }, { n: "E4", d: 2 }, { n: 0, d: 2 }, { n: "A3", d: 2 }] },
    { role: "bass", wave: "triangle", gain: 0.48, pattern: [{ n: "A2", d: 2 }, { n: "A2", d: 2 }, { n: "E2", d: 2 }, { n: "E2", d: 2 }, { n: "F2", d: 2 }, { n: "F2", d: 2 }, { n: "G2", d: 2 }, { n: "G2", d: 2 }] },
    { role: "drums", minIntensity: 0.3, pattern: [{ n: "K", d: 2 }, { n: "H", d: 2 }, { n: "S", d: 2 }, { n: "H", d: 2 }] },
  ],
};

export class FrostBiteEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private grid: number[][] = [];
  private crabs: Crab[] = [];
  private pcx = 6; private pcr = 4; private face: [number, number] = [1, 0];
  private moveCd = 0; private slides: { c: number; r: number; dc: number; dr: number; t: number; star: boolean }[] = [];
  private caseN = 0; private level = 1; private score = 0; private lives = 3; private combo = 0;
  private best = +(LS.get(BEST_KEY) || 0);
  private intro = 0; private card = ""; private flash = 0; private freeze = 0; private pause = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.4 });
    this.buildLevel();
    this.start();
  }
  protected onGesture() { this.music?.play(FROST_THEME); }
  private cs() { return CASES[this.caseN]; }

  private buildLevel() {
    this.caseN = Math.min(CASES.length - 1, Math.floor((this.level - 1) / 3));
    const d = this.cs().density;
    this.grid = Array.from({ length: ROWS }, (_, r) => Array.from({ length: COLS }, (_, c) => (r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1) ? 2 : (this.rnd() < d ? 1 : 0)));
    // clear a spawn pocket in the centre
    this.pcx = 6; this.pcr = 4; this.face = [1, 0];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const r = this.pcr + dr, c = this.pcx + dc; if (r > 0 && r < ROWS - 1 && c > 0 && c < COLS - 1) this.grid[r][c] = 0; }
    // an ice-star somewhere
    let guard = 0; while (guard++ < 200) { const r = 1 + Math.floor(this.rnd() * (ROWS - 2)), c = 1 + Math.floor(this.rnd() * (COLS - 2)); if (this.grid[r][c] === 1) { this.grid[r][c] = 3; break; } }
    // crabs in far corners / empty cells away from player
    this.crabs = []; const n = this.cs().crabs + Math.floor((this.level - 1) / 3);
    guard = 0; while (this.crabs.length < n && guard++ < 500) { const r = 1 + Math.floor(this.rnd() * (ROWS - 2)), c = 1 + Math.floor(this.rnd() * (COLS - 2)); if (this.grid[r][c] === 0 && (Math.abs(r - this.pcr) + Math.abs(c - this.pcx) > 4) && !this.crabs.some((k) => k.c === c && k.r === r)) this.crabs.push({ c, r, moveT: 0.5 + this.rnd(), stun: 0, dead: false, deathT: 0 }); }
    this.slides = [];
  }
  private beginGame() { this.level = 1; this.score = 0; this.lives = 3; this.combo = 0; this.buildLevel(); this.clearFx(); this.intro = 1.3; this.card = "CASE 1"; this.state = "play"; this.music?.setIntensity(0.5); this.report(); }
  private gameOver() { this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); } this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(5); this.hooks.onRunEnd?.({ score: this.score, shift: this.level }); this.report(); }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: this.lives, shift: this.level, combo: this.combo }); }

  private levelClear() { const bonus = 200 * this.level; this.score += bonus; this.fxRing(LW / 2, LH / 2, "#7be0ff", 90); this.fxPop(LW / 2, LH / 2 - 8, "CASE CLEAR +" + bonus, "#7be0ff"); this.music?.playJingle(CLEAR_JINGLE, 165); this.addShake(2); this.level++; this.buildLevel(); this.intro = 1.1; this.card = ((this.level - 1) % 3 === 0 ? this.cs().name : "CASE " + this.level); this.report(); }
  private loseLife() { this.lives--; this.flash = 1; this.combo = 0; this.addShake(4); this.hitstop(0.06); this.buzz(80); this.fxShards(FX + this.pcx * CELL + CELL / 2, FY + this.pcr * CELL + CELL / 2, "#7be0ff", 8); this.noise(0.14, 0.06); this.tone(150, 0.16, "square", 0.05); this.pause = 0.7; if (this.lives <= 0) this.gameOver(); else this.report(); }

  private tryMove(dc: number, dr: number) {
    this.face = [dc, dr];
    const nc = this.pcx + dc, nr = this.pcr + dr;
    const cell = this.grid[nr]?.[nc];
    if (cell === 0 && !this.crabs.some((k) => k.c === nc && k.r === nr && !k.dead)) { this.pcx = nc; this.pcr = nr; this.tone(300, 0.02, "square", 0.03); }
    else if (cell === 1 || cell === 3) { this.push(nc, nr, dc, dr); }
  }
  private push(bc: number, br: number, dc: number, dr: number) {
    // beyond the block must be free to start sliding
    let cc = bc, cr = br; const star = this.grid[br][bc] === 3;
    if (this.grid[br + dr]?.[bc + dc] !== 0 && !this.crabs.some((k) => k.c === bc + dc && k.r === br + dr && !k.dead)) { this.tone(200, 0.05, "square", 0.03); return; }
    this.grid[br][bc] = 0;
    let squashed = 0; let hitWall = false;
    while (true) {
      const ndc = cc + dc, ndr = cr + dr; const ahead = this.grid[ndr]?.[ndc];
      const crab = this.crabs.find((k) => k.c === ndc && k.r === ndr && !k.dead);
      if (crab) { crab.dead = true; crab.deathT = 0.4; squashed++; this.combo = squashed; this.score += 100 * squashed; this.fxBurst(FX + ndc * CELL + CELL / 2, FY + ndr * CELL + CELL / 2, "#ff5d7d", 10, 90); this.fxPop(FX + ndc * CELL + CELL / 2, FY + ndr * CELL, squashed > 1 ? "FROST x" + squashed : "SQUASH!", squashed > 1 ? "#7be0ff" : "#ffd24a"); this.hitstop(0.03); this.tone(400 + squashed * 100, 0.06, "square", 0.05); cc = ndc; cr = ndr; continue; }
      if (ahead === 0) { cc = ndc; cr = ndr; continue; }
      hitWall = ahead === 2; break; // hit wall or block
    }
    this.grid[cr][cc] = star ? 3 : 1;
    this.slides.push({ c: cc, r: cr, dc, dr, t: 0.14, star });
    this.addShake(0.5 + squashed * 0.5); this.buzz(6); this.noise(0.05, 0.03);
    if (star && hitWall) { this.freeze = 2.2; this.crabs.forEach((k) => { if (!k.dead) k.stun = 2.2; }); this.fxRing(LW / 2, LH / 2, "#bfe4f0", 100); this.fxPop(LW / 2, 40, "ICE STAR!  FREEZE!", "#7be0ff", 1); this.tone(880, 0.14, "square", 0.05); this.addShake(3); }
    if (squashed > 1) { this.fxRing(FX + cc * CELL, FY + cr * CELL, "#7be0ff", 30); }
    this.report();
  }

  protected update(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 3); this.moveCd = Math.max(0, this.moveCd - dt); this.freeze = Math.max(0, this.freeze - dt);
    for (const s of this.slides) s.t -= dt; this.slides = this.slides.filter((s) => s.t > 0);
    for (const k of this.crabs) if (k.dead) k.deathT -= dt;
    this.crabs = this.crabs.filter((k) => !k.dead || k.deathT > 0);
    const alive = this.crabs.filter((k) => !k.dead);

    if (this.state !== "play") { if (this.pressed.a || this.pressed.left || this.pressed.right || this.pressed.up || this.pressed.down || this.pointer.down) this.beginGame(); return; }
    if (this.intro > 0) { this.intro -= dt; return; }
    if (this.pause > 0) { this.pause -= dt; return; }

    // input (tap or held-repeat)
    let dc = 0, dr = 0;
    if (this.pressed.left) dc = -1; else if (this.pressed.right) dc = 1; else if (this.pressed.up) dr = -1; else if (this.pressed.down) dr = 1;
    if (dc || dr) { this.tryMove(dc, dr); this.moveCd = 0.16; }
    else if (this.moveCd <= 0) { if (this.btn.left) dc = -1; else if (this.btn.right) dc = 1; else if (this.btn.up) dr = -1; else if (this.btn.down) dr = 1; if (dc || dr) { this.tryMove(dc, dr); this.moveCd = 0.12; } }

    // crab AI
    for (const k of alive) {
      if (k.stun > 0) { k.stun -= dt; continue; }
      k.moveT -= dt; if (k.moveT > 0) continue; k.moveT = this.cs().speed * (0.8 + this.rnd() * 0.4);
      // step toward player through empty cells
      const opts: [number, number][] = [];
      const wc = this.pcx - k.c, wr = this.pcr - k.r;
      if (Math.abs(wc) > Math.abs(wr)) { if (wc) opts.push([Math.sign(wc), 0]); if (wr) opts.push([0, Math.sign(wr)]); } else { if (wr) opts.push([0, Math.sign(wr)]); if (wc) opts.push([Math.sign(wc), 0]); }
      opts.push([1, 0], [-1, 0], [0, 1], [0, -1]);
      for (const [mc, mr] of opts) { const nc = k.c + mc, nr = k.r + mr; if (this.grid[nr]?.[nc] === 0 && !alive.some((o) => o !== k && o.c === nc && o.r === nr)) { k.c = nc; k.r = nr; break; } }
      if (k.c === this.pcx && k.r === this.pcr) { this.loseLife(); return; }
    }

    if (alive.length === 0 && this.slides.length === 0) this.levelClear();
  }

  // ---- draw ----
  protected render() {
    const cs = this.cs();
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#4a2030" : cs.floor[0], cs.floor[1]);
    if (this.freeze > 0) { this.b.globalAlpha = 0.12; this.rect(0, 0, LW, LH, "#bfe4f0"); this.b.globalAlpha = 1; }
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const x = FX + c * CELL, y = FY + r * CELL, v = this.grid[r][c];
      if (v === 2) { this.shelf(x, y, CELL, CELL, "#3a4a5a"); this.rect(x + 2, y + 2, CELL - 4, CELL - 4, "#2a3a4a"); }
      else if (v === 1) { this.shelf(x + 1, y + 1, CELL - 2, CELL - 2, cs.ice); this.rect(x + 2, y + 2, 4, 4, "#ffffffa0"); this.rect(x + 1, y + CELL - 3, CELL - 2, 2, shade(cs.ice, -0.35)); }
      else if (v === 3) { this.shelf(x + 1, y + 1, CELL - 2, CELL - 2, "#bfe4f0"); this.disc(x + CELL / 2, y + CELL / 2, 4, "#7be0ff"); this.rect(x + CELL / 2 - 1, y + CELL / 2 - 3, 2, 6, "#ffffff"); this.rect(x + CELL / 2 - 3, y + CELL / 2 - 1, 6, 2, "#ffffff"); }
      else this.rect(x, y, CELL, CELL, (r + c) % 2 ? shade(cs.floor[1], 0.06) : cs.floor[1]);
    }
    // crabs
    for (const k of this.crabs) { const x = FX + k.c * CELL + CELL / 2, y = FY + k.r * CELL + CELL / 2; if (k.dead) { this.rect(x - 6, y + 2, 12, 3, "#8a3a4a"); continue; } const col = k.stun > 0 ? "#8ab4d0" : "#ff5d7d"; this.ball(x, y, 6, col); this.rect(x - 4, y - 5, 2, 2, "#0a0714"); this.rect(x + 2, y - 5, 2, 2, "#0a0714"); this.rect(x - 6, y + 1, 2, 3, shade(col, -0.2)); this.rect(x + 4, y + 1, 2, 3, shade(col, -0.2)); if (k.stun > 0) this.px(x, y - 8, "#bfe4f0"); }
    // player (fishmonger)
    { const x = FX + this.pcx * CELL + CELL / 2, y = FY + this.pcr * CELL + CELL / 2; this.rect(x - 4, y - 3, 8, 8, "#3bb6ff"); this.disc(x, y - 5, 3, "#f0c9a0"); this.rect(x - 4, y - 8, 8, 2, "#f4f0e8"); this.rect(x - 4 + this.face[0] * 4, y - 1 + this.face[1] * 3, 3, 3, "#2570a0"); }

    this.drawFx();

    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#dff2ff", 1, false);
    this.text(140, 3, this.cs().name, "#7be0ff", 1, false);
    if (this.combo > 1) this.text(112, 3, "x" + this.combo, "#ffd24a", 1, false);
    for (let i = 0; i < 3; i++) this.disc(LW - 9 - i * 9, 6, 3, i < this.lives ? "#ff5d7d" : "#3a2a3a");

    if (this.state === "play" && this.intro > 0) { this.b.globalAlpha = 0.55; this.rect(0, 78, LW, 30, "#0a0714"); this.b.globalAlpha = 1; this.textCenter(88, this.card, "#7be0ff", 2); }
    if (this.state !== "play") this.overlay();
  }
  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(40, "FROST BITE", "#7be0ff", 2);
      this.textCenter(64, "SLIDE ICE TO SQUASH THE CRABS", "#c3b4de", 1);
      this.textCenter(84, "A PUSHED BLOCK SLIDES TILL IT STOPS", "#83769c", 1);
      this.textCenter(96, "CATCH TWO IN A ROW FOR A COMBO", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS A DIRECTION TO START", "#ffec27", 1);
    } else {
      this.textCenter(48, "PINCHED!", "#ff5d7d", 2);
      this.textCenter(74, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(88, "BEST " + this.best, "#ffd24a", 1);
      this.textCenter(104, "REACHED CASE " + this.level, "#c3b4de", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS A DIRECTION TO RETRY", "#ffec27", 1);
    }
  }
}
