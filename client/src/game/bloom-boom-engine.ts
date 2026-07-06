// bloom-boom-engine — Main Street cabinet (Bomberman homage). A florist: plant
// SEED-BOMBS that burst into a cross of blooms, clearing the overgrown weeds and the
// garden pests caught in the blast. Grab fertiliser to grow a bigger bloom and carry
// more seeds. Clear every pest to open the trellis gate to the next plot. Signature
// twist: a bloom sets off any seed-bomb it touches for a CHAIN-POLLINATE combo — but
// mind your own petals. Plots: Window Box -> Greenhouse -> Rooftop. RetroEngine +
// juice + MusicKit; 4-way d-pad + plant.

import { RetroEngine, shade, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const BEST_KEY = "bloom_best";
const COLS = 13, ROWS = 9, CELL = 16;
const FX = (LW - COLS * CELL) / 2 | 0, FY = 16;
// grid: 0 empty, 1 hard, 2 weed
type Bomb = { c: number; r: number; t: number; rad: number };
type Flame = { c: number; r: number; t: number };
type Pest = { c: number; r: number; moveT: number; dead: boolean };
type Power = { c: number; r: number; kind: "bomb" | "bloom" };

interface Plot { name: string; ground: string; weed: string; pests: number }
const PLOTS: Plot[] = [
  { name: "WINDOW BOX", ground: "#2a3a1a", weed: "#4a6a2a", pests: 3 },
  { name: "GREENHOUSE", ground: "#1a3a2a", weed: "#2a7a4a", pests: 4 },
  { name: "ROOFTOP", ground: "#2a2a3a", weed: "#5a4a7a", pests: 5 },
];

const BLOOM_THEME: Track = {
  bpm: 134,
  layers: [
    { role: "lead", wave: "square", gain: 0.32, pattern: [
      { n: "F5", d: 1 }, { n: "A5", d: 1 }, { n: "G5", d: 1 }, { n: "F5", d: 1 }, { n: "E5", d: 2 }, { n: "C5", d: 2 }, { n: "F5", d: 2 }, { n: "A4", d: 2 },
      { n: "G4", d: 1 }, { n: "B4", d: 1 }, { n: "D5", d: 2 }, { n: "C5", d: 2 }, { n: "F5", d: 2 }, { n: "C5", d: 2 },
    ] },
    { role: "bass", wave: "triangle", gain: 0.5, pattern: [{ n: "F2", d: 1 }, { n: "F2", d: 1 }, { n: "C3", d: 1 }, { n: "C3", d: 1 }, { n: "G2", d: 1 }, { n: "G2", d: 1 }, { n: "A2", d: 1 }, { n: "A2", d: 1 }] },
    { role: "drums", minIntensity: 0.3, pattern: [{ n: "K", d: 2 }, { n: "H", d: 2 }, { n: "S", d: 2 }, { n: "H", d: 2 }] },
  ],
};

export class BloomBoomEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private grid: number[][] = [];
  private bombs: Bomb[] = []; private flames: Flame[] = []; private pests: Pest[] = []; private powers: Power[] = [];
  private pc = 1; private pr = 1; private moveCd = 0;
  private maxBombs = 1; private blast = 1;
  private plotN = 0; private level = 1; private score = 0; private lives = 3;
  private best = +(LS.get(BEST_KEY) || 0); private intro = 0; private card = ""; private flash = 0; private pause = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.4 });
    this.buildPlot();
    this.start();
  }
  protected onGesture() { this.music?.play(BLOOM_THEME); }
  private plot() { return PLOTS[this.plotN]; }

  private buildPlot() {
    this.plotN = Math.min(PLOTS.length - 1, Math.floor((this.level - 1) / 3));
    this.grid = Array.from({ length: ROWS }, (_, r) => Array.from({ length: COLS }, (_, c) => {
      if (r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1 || (r % 2 === 0 && c % 2 === 0)) return 1;
      return this.rnd() < 0.45 ? 2 : 0;
    }));
    // clear player spawn corner
    for (const [dc, dr] of [[1, 1], [2, 1], [1, 2]] as [number, number][]) this.grid[dr][dc] = 0;
    this.pc = 1; this.pr = 1;
    this.bombs = []; this.flames = []; this.powers = [];
    // pests in far cells
    this.pests = []; const n = this.plot().pests + Math.floor((this.level - 1) / 3); let guard = 0;
    while (this.pests.length < n && guard++ < 300) { const c = 1 + Math.floor(this.rnd() * (COLS - 2)), r = 1 + Math.floor(this.rnd() * (ROWS - 2)); if (this.grid[r][c] === 0 && (Math.abs(c - 1) + Math.abs(r - 1) > 4) && !this.pests.some((p) => p.c === c && p.r === r)) this.pests.push({ c, r, moveT: 0.5 + this.rnd(), dead: false }); }
  }
  private beginGame() { this.level = 1; this.score = 0; this.lives = 3; this.maxBombs = 1; this.blast = 1; this.buildPlot(); this.clearFx(); this.intro = 1.2; this.card = "WINDOW BOX"; this.state = "play"; this.music?.setIntensity(0.6); this.report(); }
  private gameOver() { this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); } this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(5); this.hooks.onRunEnd?.({ score: this.score, shift: this.level }); this.report(); }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: this.lives, shift: this.level, combo: 0 }); }
  private loseLife() { this.lives--; this.flash = 1; this.addShake(4); this.hitstop(0.06); this.buzz(80); this.fxShards(cx(this.pc), cy(this.pr), "#ff8ab5", 8); this.noise(0.16, 0.06); this.tone(150, 0.16, "square", 0.05); this.pause = 0.7; this.pc = 1; this.pr = 1; this.bombs = []; this.flames = []; if (this.lives <= 0) this.gameOver(); else this.report(); }
  private levelClear() { const bonus = 200 * this.level; this.score += bonus; this.fxRing(LW / 2, LH / 2, "#ff8ab5", 90); this.fxPop(LW / 2, LH / 2 - 8, "PLOT CLEAR +" + bonus, "#ff8ab5"); this.music?.playJingle(CLEAR_JINGLE, 165); this.level++; this.buildPlot(); this.intro = 1; this.card = ((this.level - 1) % 3 === 0 ? this.plot().name : "PLOT " + this.level); this.report(); }

  private plant() { if (this.bombs.length >= this.maxBombs) return; if (this.bombs.some((b) => b.c === this.pc && b.r === this.pr)) return; this.bombs.push({ c: this.pc, r: this.pr, t: 2, rad: this.blast }); this.tone(300, 0.05, "square", 0.04); this.buzz(5); }
  private detonate(b: Bomb) {
    this.flames.push({ c: b.c, r: b.r, t: 0.4 }); this.addShake(1.5); this.hitstop(0.03); this.noise(0.1, 0.05); this.tone(180, 0.12, "square", 0.05);
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
      for (let d = 1; d <= b.rad; d++) { const c = b.c + dc * d, r = b.r + dr * d; if (this.grid[r]?.[c] === 1) break; this.flames.push({ c, r, t: 0.4 }); if (this.grid[r][c] === 2) { this.grid[r][c] = 0; this.score += 5; this.fxBurst(cx(c), cy(r), this.plot().weed, 5, 60); if (this.rnd() < 0.22) this.powers.push({ c, r, kind: this.rnd() < 0.5 ? "bomb" : "bloom" }); break; } }
    }
    this.fxRing(cx(b.c), cy(b.r), "#ff8ab5", 20);
  }

  protected update(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 3); this.moveCd = Math.max(0, this.moveCd - dt);
    for (const f of this.flames) f.t -= dt; this.flames = this.flames.filter((f) => f.t > 0);
    if (this.state !== "play") { if (this.pressed.a || this.pressed.left || this.pressed.right || this.pressed.up || this.pressed.down || this.pointer.down) this.beginGame(); return; }
    if (this.intro > 0) { this.intro -= dt; return; }
    if (this.pause > 0) { this.pause -= dt; return; }

    // move
    let dc = 0, dr = 0;
    if (this.pressed.left) dc = -1; else if (this.pressed.right) dc = 1; else if (this.pressed.up) dr = -1; else if (this.pressed.down) dr = 1;
    const tryMove = (a: number, b: number) => { const nc = this.pc + a, nr = this.pr + b; if (this.grid[nr]?.[nc] === 0 && !this.bombs.some((bo) => bo.c === nc && bo.r === nr)) { this.pc = nc; this.pr = nr; } };
    if (dc || dr) { tryMove(dc, dr); this.moveCd = 0.12; }
    else if (this.moveCd <= 0) { if (this.btn.left) dc = -1; else if (this.btn.right) dc = 1; else if (this.btn.up) dr = -1; else if (this.btn.down) dr = 1; if (dc || dr) { tryMove(dc, dr); this.moveCd = 0.11; } }
    if (this.pressed.a) this.plant();

    // bombs tick + chain (a flame on a bomb detonates it)
    for (let i = this.bombs.length - 1; i >= 0; i--) { const b = this.bombs[i]; b.t -= dt; const chained = this.flames.some((f) => f.c === b.c && f.r === b.r && f.t > 0.2); if (b.t <= 0 || chained) { this.bombs.splice(i, 1); this.detonate(b); } }

    // powers pickup
    for (let i = this.powers.length - 1; i >= 0; i--) { const p = this.powers[i]; if (p.c === this.pc && p.r === this.pr) { if (p.kind === "bomb") this.maxBombs = Math.min(5, this.maxBombs + 1); else this.blast = Math.min(5, this.blast + 1); this.powers.splice(i, 1); this.score += 20; this.fxPop(cx(p.c), cy(p.r), p.kind === "bomb" ? "+SEED" : "+BLOOM", "#ffd24a"); this.tone(1046, 0.06, "square", 0.05); }
      // a flame destroys an uncollected power
      else if (this.flames.some((f) => f.c === p.c && f.r === p.r)) this.powers.splice(i, 1);
    }

    // flames hit player / pests
    if (this.flames.some((f) => f.c === this.pc && f.r === this.pr)) { this.loseLife(); return; }
    for (const pe of this.pests) if (!pe.dead && this.flames.some((f) => f.c === pe.c && f.r === pe.r)) { pe.dead = true; this.score += 50; this.fxBurst(cx(pe.c), cy(pe.r), "#ff5d7d", 10, 90); this.fxPop(cx(pe.c), cy(pe.r), "+50", "#ffd24a"); this.tone(500, 0.06, "square", 0.05); }
    this.pests = this.pests.filter((p) => !p.dead);

    // pest AI
    for (const pe of this.pests) { pe.moveT -= dt; if (pe.moveT > 0) continue; pe.moveT = 0.5; const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].sort(() => this.rnd() - 0.5); for (const [mc, mr] of opts) { const nc = pe.c + mc, nr = pe.r + mr; if (this.grid[nr]?.[nc] === 0 && !this.bombs.some((b) => b.c === nc && b.r === nr) && !this.pests.some((o) => o !== pe && o.c === nc && o.r === nr)) { pe.c = nc; pe.r = nr; break; } } if (pe.c === this.pc && pe.r === this.pr) { this.loseLife(); return; } }

    if (this.pests.length === 0) this.levelClear();
    this.report();
  }

  // ---- draw ----
  protected render() {
    const pl = this.plot();
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#4a1520" : shade(pl.ground, 0.05), shade(pl.ground, -0.3));
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const x = FX + c * CELL, y = FY + r * CELL, v = this.grid[r][c];
      if (v === 1) { this.shelf(x, y, CELL, CELL, "#6a6f82"); this.rect(x + 2, y + 2, CELL - 4, CELL - 4, "#4a4f62"); }
      else if (v === 2) { this.shelf(x + 1, y + 1, CELL - 2, CELL - 2, pl.weed); this.disc(x + CELL / 2, y + CELL / 2, 3, shade(pl.weed, 0.2)); }
      else { this.rect(x, y, CELL, CELL, (r + c) % 2 ? shade(pl.ground, 0.03) : pl.ground); }
    }
    // powers
    for (const p of this.powers) { const x = cx(p.c), y = cy(p.r); this.disc(x, y, 5, p.kind === "bomb" ? "#ff8ab5" : "#ffd24a"); this.text(x - 2, y - 2, p.kind === "bomb" ? "S" : "B", "#0a0714", 1, false); }
    // bombs
    for (const b of this.bombs) { const x = cx(b.c), y = cy(b.r); const pulse = Math.floor(this.tSec() * 6) % 2; this.ball(x, y, 5 + pulse, "#5a8a3a"); this.rect(x - 1, y - 8, 2, 3, "#8a5a2c"); if (pulse) this.px(x, y - 9, "#ffd24a"); }
    // flames (blooms)
    for (const f of this.flames) { const x = cx(f.c), y = cy(f.r); const a = Math.min(1, f.t / 0.4); for (let i = 0; i < 6; i++) { const ang = i * 1.05; this.disc((x + Math.cos(ang) * 5 * a) | 0, (y + Math.sin(ang) * 5 * a) | 0, 3, ["#ff5d7d", "#ff8ab5", "#ffd24a"][i % 3]); } this.disc(x, y, 3, "#fff1e8"); }
    // pests
    for (const pe of this.pests) { const x = cx(pe.c), y = cy(pe.r); this.ball(x, y, 5, "#ff5d7d"); this.rect(x - 4, y - 5, 2, 2, "#0a0714"); this.rect(x + 2, y - 5, 2, 2, "#0a0714"); this.rect(x - 3, y + 3, 6, 1, "#0a071480"); }
    // player (gardener)
    { const x = cx(this.pc), y = cy(this.pr); this.rect(x - 4, y - 3, 8, 8, "#33e650"); this.disc(x, y - 5, 3, "#f0c9a0"); this.rect(x - 4, y - 8, 8, 2, "#e0a860"); }

    this.drawFx();

    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#ffe6f5", 1, false);
    this.text(88, 3, "S" + this.maxBombs + " B" + this.blast, "#ffd24a", 1, false);
    this.text(150, 3, this.plot().name.slice(0, 8), "#ff8ab5", 1, false);
    for (let i = 0; i < 3; i++) this.disc(LW - 9 - i * 9, 6, 3, i < this.lives ? "#ff5d7d" : "#3a2a2a");

    if (this.state === "play" && this.intro > 0) { this.b.globalAlpha = 0.55; this.rect(0, 78, LW, 30, "#0a0714"); this.b.globalAlpha = 1; this.textCenter(88, this.card, "#ff8ab5", 2); }
    if (this.state !== "play") this.overlay();
  }
  private tSec() { return performance.now() / 1000; }
  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(40, "BLOOM BOOM", "#ff8ab5", 2);
      this.textCenter(64, "PLANT SEED-BOMBS TO CLEAR PESTS", "#c3b4de", 1);
      this.textCenter(84, "BLOOMS BURST IN A CROSS", "#83769c", 1);
      this.textCenter(96, "GRAB FERTILISER - MIND YOUR PETALS", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS PLANT TO START", "#ffec27", 1);
    } else {
      this.textCenter(48, "WILTED!", "#ff5d7d", 2);
      this.textCenter(74, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(88, "BEST " + this.best, "#ffd24a", 1);
      this.textCenter(104, "REACHED PLOT " + this.level, "#c3b4de", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS PLANT TO RETRY", "#ffec27", 1);
    }
  }
}
function cx(c: number) { return FX + c * CELL + CELL / 2; }
function cy(r: number) { return FY + r * CELL + CELL / 2; }
