// green-thumb-engine — Main Street cabinet (Centipede homage). A garden centre: a
// leaf-munching caterpillar winds down through a trellis of potted sprouts. Blast its
// segments from your patch at the bottom — tag a middle segment and the caterpillar
// SPLITS in two and a fresh sprout pops where it fell. Clear every segment to bank
// the bed and face a longer, faster crawler. Signature twist: shooting a sprout to
// dust clears a lane; a full clear with no life lost is a GREEN THUMB bonus. Beds:
// Seedbed -> Greenhouse -> Night Garden. RetroEngine + juice + MusicKit; move + fire.

import { RetroEngine, shade, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const BEST_KEY = "greenthumb_best";
const CELL = 12, COLS = 20, ROWS = 15;
const BAND = ROWS - 4;          // player's top row

interface Seg { c: number; r: number; dir: number }
interface Bul { x: number; y: number }

const GT_THEME: Track = {
  bpm: 138,
  layers: [
    { role: "lead", wave: "square", gain: 0.32, pattern: [
      { n: "G4", d: 1 }, { n: "B4", d: 1 }, { n: "D5", d: 1 }, { n: "B4", d: 1 }, { n: "C5", d: 2 }, { n: "A4", d: 2 }, { n: "G4", d: 2 }, { n: "D4", d: 2 },
      { n: "E4", d: 1 }, { n: "G4", d: 1 }, { n: "B4", d: 1 }, { n: "G4", d: 1 }, { n: "A4", d: 2 }, { n: "D5", d: 2 },
    ] },
    { role: "bass", wave: "triangle", gain: 0.5, pattern: [{ n: "G2", d: 1 }, { n: "G2", d: 1 }, { n: "D2", d: 1 }, { n: "D2", d: 1 }, { n: "C2", d: 1 }, { n: "C2", d: 1 }, { n: "D2", d: 1 }, { n: "D2", d: 1 }] },
    { role: "drums", minIntensity: 0.3, pattern: [{ n: "K", d: 2 }, { n: "H", d: 2 }, { n: "S", d: 2 }, { n: "H", d: 2 }] },
  ],
};

export class GreenThumbEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private plants: number[][] = [];
  private centis: Seg[][] = [];
  private moveT = 0; private stepInt = 0.16;
  private pc = 10; private pr = ROWS - 1; private bullets: Bul[] = []; private fireCd = 0; private moveCd = 0;
  private wave = 1; private bed = 0; private score = 0; private lives = 3; private hurt = false;
  private best = +(LS.get(BEST_KEY) || 0); private intro = 0; private card = ""; private flash = 0; private pause = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.4 });
    this.buildBed(true);
    this.start();
  }
  protected onGesture() { this.music?.play(GT_THEME); }
  private bedName() { return ["SEEDBED", "GREENHOUSE", "NIGHT GARDEN"][this.bed]; }

  private buildBed(fresh: boolean) {
    this.bed = Math.min(2, Math.floor((this.wave - 1) / 3));
    if (fresh) { this.plants = Array.from({ length: ROWS }, () => new Array(COLS).fill(0)); const n = 22 + this.wave * 2; for (let i = 0; i < n; i++) { const r = 1 + Math.floor(this.rnd() * (ROWS - 3)), c = Math.floor(this.rnd() * COLS); this.plants[r][c] = 1 + Math.floor(this.rnd() * 2); } }
    this.stepInt = Math.max(0.07, 0.17 - this.wave * 0.008);
    const len = 8 + Math.min(8, this.wave);
    const centi: Seg[] = []; for (let i = 0; i < len; i++) centi.push({ c: -i, r: 0, dir: 1 });
    this.centis = [centi]; this.hurt = false;
    if (fresh) { this.pc = 10; this.pr = ROWS - 1; } this.bullets = [];
  }
  private beginGame() { this.wave = 1; this.score = 0; this.lives = 3; this.buildBed(true); this.clearFx(); this.intro = 1.2; this.card = "SEEDBED"; this.state = "play"; this.music?.setIntensity(0.6); this.report(); }
  private gameOver() { this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); } this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(5); this.hooks.onRunEnd?.({ score: this.score, shift: this.wave }); this.report(); }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: this.lives, shift: this.wave, combo: 0 }); }
  private loseLife() { this.lives--; this.hurt = true; this.flash = 1; this.addShake(4); this.hitstop(0.06); this.buzz(80); this.fxShards(FX(this.pc), FY(this.pr), "#33e650", 8); this.noise(0.16, 0.06); this.tone(150, 0.16, "square", 0.05); this.pause = 0.7; const len = 8 + Math.min(8, this.wave); const centi: Seg[] = []; for (let i = 0; i < len; i++) centi.push({ c: -i, r: 0, dir: 1 }); this.centis = [centi]; this.pc = 10; this.pr = ROWS - 1; this.bullets = []; if (this.lives <= 0) this.gameOver(); else this.report(); }

  private stepCenti(centi: Seg[]) {
    const prev = centi.map((s) => ({ c: s.c, r: s.r, dir: s.dir }));
    const head = centi[0]; let nc = head.c + head.dir;
    const blocked = nc < 0 || nc >= COLS || (head.r >= 0 && this.plants[head.r]?.[nc] > 0);
    if (blocked) { head.dir *= -1; head.r = Math.min(ROWS - 1, head.r + 1); if (head.r >= ROWS - 1) head.r = ROWS - 1; }
    else head.c = nc;
    for (let i = 1; i < centi.length; i++) { centi[i].c = prev[i - 1].c; centi[i].r = prev[i - 1].r; centi[i].dir = prev[i - 1].dir; }
  }

  protected update(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 3); this.fireCd = Math.max(0, this.fireCd - dt); this.moveCd = Math.max(0, this.moveCd - dt);
    if (this.state !== "play") { if (this.pressed.a || this.pressed.left || this.pressed.right || this.pressed.up || this.pressed.down || this.pointer.down) this.beginGame(); return; }
    if (this.intro > 0) { this.intro -= dt; return; }
    if (this.pause > 0) { this.pause -= dt; return; }

    // move (within bottom band)
    let dc = 0, dr = 0;
    if (this.pressed.left) dc = -1; else if (this.pressed.right) dc = 1; else if (this.pressed.up) dr = -1; else if (this.pressed.down) dr = 1;
    const doMove = (a: number, b: number) => { const nc = this.pc + a, nr = this.pr + b; if (nc >= 0 && nc < COLS && nr >= BAND && nr < ROWS && !(this.plants[nr]?.[nc] > 0)) { this.pc = nc; this.pr = nr; } };
    if (dc || dr) { doMove(dc, dr); this.moveCd = 0.1; }
    else if (this.moveCd <= 0) { if (this.btn.left) dc = -1; else if (this.btn.right) dc = 1; else if (this.btn.up) dr = -1; else if (this.btn.down) dr = 1; if (dc || dr) { doMove(dc, dr); this.moveCd = 0.09; } }
    // fire
    if (this.btn.a && this.fireCd <= 0 && this.bullets.length < 3) { this.bullets.push({ x: FX(this.pc), y: FY(this.pr) - 6 }); this.fireCd = 0.16; this.tone(760, 0.03, "square", 0.03); }

    // bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i]; b.y -= 260 * dt; if (b.y < -4) { this.bullets.splice(i, 1); continue; }
      const bc = Math.floor(b.x / CELL), br = Math.floor(b.y / CELL);
      // plant hit
      if (br >= 0 && br < ROWS && this.plants[br]?.[bc] > 0) { this.plants[br][bc]--; this.bullets.splice(i, 1); this.score += 2; this.fxBurst(b.x, b.y, "#33e650", 4, 50); if (this.plants[br][bc] <= 0) this.fxPop(FX(bc), FY(br), "+2", "#33e650"); continue; }
      // segment hit
      let hit = false;
      for (let ci = this.centis.length - 1; ci >= 0 && !hit; ci--) { const centi = this.centis[ci]; for (let si = 0; si < centi.length; si++) { const s = centi[si]; if (s.c === bc && s.r === br) { hit = true; this.bullets.splice(i, 1); this.score += 10; this.fxBurst(b.x, b.y, "#ff8ab5", 6, 70); this.tone(660, 0.05, "square", 0.05); this.plants[Math.max(0, s.r)][s.c] = 1; // sprout where it fell
        const front = centi.slice(0, si), rear = centi.slice(si + 1); this.centis.splice(ci, 1); if (rear.length) this.centis.push(rear); if (front.length) this.centis.push(front); break; } } }
    }

    // step centipedes
    this.moveT -= dt; if (this.moveT <= 0) { this.moveT = this.stepInt; for (const centi of this.centis) this.stepCenti(centi); }
    // collide with player
    for (const centi of this.centis) for (const s of centi) if (s.c === this.pc && s.r === this.pr) { this.loseLife(); return; }

    if (this.centis.length === 0) { const bonus = 100 * this.wave + (this.hurt ? 0 : 150); this.score += bonus; this.fxPop(LW / 2, 70, (this.hurt ? "BED +" : "GREEN THUMB! +") + bonus, this.hurt ? "#c3b4de" : "#33e650", 1); this.music?.playJingle(CLEAR_JINGLE, 165); this.wave++; this.buildBed(false); this.intro = 1; this.card = ((this.wave - 1) % 3 === 0 ? this.bedName() : "BED " + this.wave); }
    this.report();
  }

  // ---- draw ----
  protected render() {
    const skies: [string, string][] = [["#1a2a1a", "#0a140a"], ["#1a2a2a", "#0a1414"], ["#0a1a2a", "#050a14"]];
    const sk = skies[this.bed];
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#4a2020" : sk[0], sk[1]);
    // player band tint
    this.rect(0, BAND * CELL, LW, LH - BAND * CELL, "#12220e");
    // plants (sprouts)
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const hp = this.plants[r][c]; if (hp > 0) { const x = FX(c), y = FY(r); this.rect(x - 1, y + 1, 2, 4, "#3a6a2a"); this.disc(x, y - 2, hp > 1 ? 4 : 3, hp > 1 ? "#33e650" : "#5a8a3a"); this.px(x, y - 3, "#8affa0"); } }
    // centipedes
    for (const centi of this.centis) for (let i = 0; i < centi.length; i++) { const s = centi[i]; const x = FX(s.c), y = FY(s.r); this.ball(x, y, 5, i === 0 ? "#ff8ab5" : "#c94f7c"); this.rect(x - 5, y - 5, 2, 2, "#5a2a3a"); this.rect(x + 3, y - 5, 2, 2, "#5a2a3a"); if (i === 0) { this.px(x - 2, y - 2, "#0a0714"); this.px(x + 2, y - 2, "#0a0714"); } }
    // bullets
    for (const b of this.bullets) this.rect(b.x | 0, b.y | 0, 2, 5, "#ffec9a");
    // player (watering can)
    { const x = FX(this.pc), y = FY(this.pr); this.rect(x - 4, y - 3, 8, 7, "#3bb6ff"); this.rect(x + 3, y - 1, 4, 2, "#2570a0"); this.rect(x - 2, y - 6, 4, 3, "#7be0ff"); }

    this.drawFx();

    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#dff2ff", 1, false);
    this.text(150, 3, this.bedName().slice(0, 8), "#33e650", 1, false);
    for (let i = 0; i < 3; i++) this.disc(LW - 9 - i * 9, 6, 3, i < this.lives ? "#ff5d7d" : "#3a2a2a");

    if (this.state === "play" && this.intro > 0) { this.b.globalAlpha = 0.55; this.rect(0, 76, LW, 30, "#0a0714"); this.b.globalAlpha = 1; this.textCenter(86, this.card, "#33e650", 2); }
    if (this.state !== "play") this.overlay();
  }
  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(40, "GREEN THUMB", "#33e650", 2);
      this.textCenter(64, "BLAST THE CATERPILLAR", "#c3b4de", 1);
      this.textCenter(84, "TAG A MIDDLE SEGMENT TO SPLIT IT", "#83769c", 1);
      this.textCenter(96, "CLEAR EVERY SEGMENT TO ADVANCE", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS FIRE TO START", "#ffec27", 1);
    } else {
      this.textCenter(50, "OVERRUN!", "#ff5d7d", 2);
      this.textCenter(76, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(90, "BEST " + this.best, "#ffd24a", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS FIRE TO RETRY", "#ffec27", 1);
    }
  }
}
function FX(c: number) { return c * CELL + CELL / 2; }
function FY(r: number) { return r * CELL + CELL / 2; }
