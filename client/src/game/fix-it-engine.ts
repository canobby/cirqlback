// fix-it-engine — Main Street cabinet #10 (Fix-It Felix Jr. homage). Climb the
// building face patching each broken window with your hammer while a wrecker up top
// hurls bricks down the columns to dodge. Fix every window before the timer. Signature
// twist: the wrecker ADAPTS — it aims bricks at the columns you hang around in; fix
// enough windows to earn a GOLDEN HAMMER (repairs a whole cross); fast clears pay a
// renovation bonus. Worlds: Apartments → Offices → Penthouse. RetroEngine + MusicKit.

import { RetroEngine, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const COLS = 6, ROWS = 6, CW = 32, RH = 22, OX = 24, OY = 32;
const BEST_KEY = "fixit_best";

interface Brick { col: number; y: number; vy: number; }
interface World { name: string; sky: [string, string]; wall: string; broken: number; brickSpd: number; dropT: number; adapt: number; }
const WORLDS: World[] = [
  { name: "APARTMENTS", sky: ["#2a3a5a", "#0e1424"], wall: "#6a5a4a", broken: 0.5, brickSpd: 70, dropT: 1.3, adapt: 0.3 },
  { name: "OFFICES", sky: ["#1a2a3a", "#0a1018"], wall: "#5a6a7a", broken: 0.6, brickSpd: 90, dropT: 1.05, adapt: 0.55 },
  { name: "PENTHOUSE", sky: ["#2a1a3a", "#120a1a"], wall: "#7a6a5a", broken: 0.68, brickSpd: 112, dropT: 0.85, adapt: 0.8 },
];

const FIX_THEME: Track = {
  bpm: 138,
  layers: [
    { role: "lead", wave: "square", gain: 0.38, pattern: [
      { n: "C5", d: 1 }, { n: "E5", d: 1 }, { n: "G5", d: 2 }, { n: "F5", d: 1 }, { n: "E5", d: 1 }, { n: "D5", d: 2 }, { n: "C5", d: 2 }, { n: "G4", d: 2 },
      { n: "A4", d: 1 }, { n: "C5", d: 1 }, { n: "E5", d: 2 }, { n: "D5", d: 2 }, { n: "C5", d: 4 },
    ] },
    { role: "harmony", wave: "square", gain: 0.16, minIntensity: 0.4, pattern: [{ n: 0, d: 2 }, { n: "G4", d: 2 }, { n: 0, d: 2 }, { n: "C4", d: 2 }] },
    { role: "bass", wave: "triangle", gain: 0.5, pattern: [{ n: "C3", d: 2 }, { n: "C3", d: 2 }, { n: "G2", d: 2 }, { n: "A2", d: 2 }, { n: "F2", d: 2 }, { n: "G2", d: 2 }, { n: "C3", d: 4 }] },
    { role: "drums", minIntensity: 0.2, pattern: [{ n: "K", d: 2 }, { n: "H", d: 2 }, { n: "S", d: 2 }, { n: "H", d: 1 }, { n: "K", d: 1 }] },
  ],
};

export class FixItEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private world = 0;
  private win: Uint8Array = new Uint8Array(ROWS * COLS); // 1 = broken
  private brokenLeft = 0;
  private cr = ROWS - 1; private cc = 3; private fx = 0; private fy = 0;
  private bricks: Brick[] = [];
  private colFreq = new Float32Array(COLS);
  private dropT = 0; private stun = 0; private golden = false; private fixedFloor = 0;
  private timeLeft = 0; private timeMax = 1; private wreckerT = 0;

  private score = 0; private lives = 3; private floor = 1;
  private best = +(LS.get(BEST_KEY) || 0);
  private flash = 0; private intro = 0; private card = ""; private pause = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.42 });
    this.genFloor(); this.start();
  }
  protected onGesture() { this.music?.play(FIX_THEME); }
  private w() { return WORLDS[this.world]; }
  private idx(r: number, c: number) { return r * COLS + c; }
  private cellX(c: number) { return OX + c * CW + CW / 2; }
  private cellY(r: number) { return OY + r * RH + RH / 2; }

  private genFloor() {
    this.world = Math.floor((this.floor - 1) / 3) % WORLDS.length;
    this.win.fill(0); this.brokenLeft = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (this.rnd() < this.w().broken) { this.win[this.idx(r, c)] = 1; this.brokenLeft++; }
    if (this.brokenLeft === 0) { this.win[0] = 1; this.brokenLeft = 1; }
    this.cr = ROWS - 1; this.cc = 3; this.fx = this.cellX(this.cc); this.fy = this.cellY(this.cr);
    this.bricks = []; this.colFreq.fill(1); this.dropT = 1.2; this.stun = 0; this.golden = false; this.fixedFloor = 0;
    this.timeMax = Math.max(9, 18 - this.floor * 0.5); this.timeLeft = this.timeMax;
  }
  private newFloor(fresh: boolean) { this.genFloor(); if (fresh) { this.intro = 1.4; this.card = ((this.floor - 1) % 3 === 0 ? "TOWER " + (this.world + 1) + "  " + this.w().name : "FLOOR " + this.floor); } }
  private beginGame() { this.score = 0; this.lives = 3; this.floor = 1; this.clearFx(); this.newFloor(true); this.state = "play"; this.music?.setIntensity(0.5); this.report(); }
  private gameOver() {
    this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); }
    this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(5); this.hooks.onRunEnd?.({ score: this.score, shift: this.floor }); this.report();
  }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: this.lives, shift: this.floor, combo: 0 }); }

  private hit() {
    this.lives--; this.flash = 1; this.addShake(4); this.hitstop(0.06); this.buzz(80); this.fxShards(this.fx, this.fy, "#c0392b", 8); this.noise(0.14, 0.06); this.tone(150, 0.16, "square", 0.05); this.stun = 0.8; this.pause = 0.5;
    this.cr = ROWS - 1; this.cc = 3;
    if (this.lives <= 0) this.gameOver();
    else this.report();
  }
  private floorClear() {
    const bonus = 100 * this.floor + Math.round(this.timeLeft * 8); this.score += bonus;
    this.fxRing(LW / 2, LH / 2, "#ffd24a", 70); this.fxPop(LW / 2, LH / 2 - 8, "FIXED IT! +" + bonus, "#ffd24a"); this.music?.playJingle(CLEAR_JINGLE, 165); this.addShake(2);
    this.floor++; this.newFloor(true); this.report();
  }

  private fix() {
    const doOne = (r: number, c: number) => { if (r < 0 || c < 0 || r >= ROWS || c >= COLS) return; if (this.win[this.idx(r, c)]) { this.win[this.idx(r, c)] = 0; this.brokenLeft--; this.fixedFloor++; this.score += 15; this.fxBurst(this.cellX(c), this.cellY(r), "#7be0ff", 6, 60); } };
    if (!this.win[this.idx(this.cr, this.cc)] && !this.golden) { this.tone(240, 0.04, "square", 0.03); return; }
    doOne(this.cr, this.cc);
    if (this.golden) { doOne(this.cr - 1, this.cc); doOne(this.cr + 1, this.cc); doOne(this.cr, this.cc - 1); doOne(this.cr, this.cc + 1); }
    this.tone(760, 0.05, "square", 0.05); this.addShake(0.6); this.hitstop(0.02);
    if (!this.golden && this.fixedFloor >= 4) { this.golden = true; this.fxPop(this.fx, this.fy - 10, "GOLDEN HAMMER!", "#ffd24a"); this.tone(980, 0.1, "square", 0.05); }
    if (this.brokenLeft <= 0) this.floorClear();
  }

  private chooseCol() {
    if (this.rnd() < this.w().adapt) { let best = 0; for (let c = 1; c < COLS; c++) if (this.colFreq[c] > this.colFreq[best]) best = c; return best; }
    return Math.floor(this.rnd() * COLS);
  }

  protected update(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 3); this.stun = Math.max(0, this.stun - dt);
    if (this.state !== "play") { if (this.pressed.a || this.pressed.up || this.pressed.down || this.pressed.left || this.pressed.right || this.pointer.down) this.beginGame(); return; }
    if (this.intro > 0) { this.intro -= dt; return; }
    if (this.pause > 0) { this.pause -= dt; return; }

    // timer
    this.timeLeft -= dt; if (this.timeLeft <= 0) { this.fxPop(this.fx, this.fy - 8, "TIME UP!", "#ff5d7d"); this.hit(); this.timeLeft = this.timeMax; return; }

    // move (cell step when arrived)
    const arrived = Math.abs(this.fx - this.cellX(this.cc)) < 1.5 && Math.abs(this.fy - this.cellY(this.cr)) < 1.5;
    if (arrived && this.stun <= 0) {
      if (this.pressed.up && this.cr > 0) this.cr--; else if (this.pressed.down && this.cr < ROWS - 1) this.cr++;
      else if (this.pressed.left && this.cc > 0) this.cc--; else if (this.pressed.right && this.cc < COLS - 1) this.cc++;
      if (this.pressed.a) this.fix();
    }
    this.fx += (this.cellX(this.cc) - this.fx) * Math.min(1, dt * 14); this.fy += (this.cellY(this.cr) - this.fy) * Math.min(1, dt * 14);
    this.colFreq[this.cc] += dt;

    // wrecker drops bricks
    this.dropT -= dt; if (this.dropT <= 0) { this.bricks.push({ col: this.chooseCol(), y: OY - 6, vy: this.w().brickSpd }); this.wreckerT = 0.3; this.tone(200, 0.06, "square", 0.04); this.dropT = this.w().dropT * (0.7 + this.rnd() * 0.6); }
    this.wreckerT = Math.max(0, this.wreckerT - dt);

    // bricks fall
    for (let i = this.bricks.length - 1; i >= 0; i--) {
      const b = this.bricks[i]; b.y += b.vy * dt;
      if (b.y > OY + ROWS * RH + 6) { this.bricks.splice(i, 1); this.fxBurst(this.cellX(b.col), OY + ROWS * RH + 4, "#c0392b", 4, 50); continue; }
      if (this.stun <= 0 && b.col === this.cc && Math.abs(b.y - this.fy) < 12) { this.bricks.splice(i, 1); this.hit(); return; }
    }
  }

  // ---- draw ----
  protected render() {
    const w = this.w();
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#4a1520" : w.sky[0], w.sky[1]);
    // building face
    this.shelf(OX - 4, OY - 4, COLS * CW + 8, ROWS * RH + 10, w.wall);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const x = OX + c * CW + 4, y = OY + r * RH + 3, ww = CW - 8, wh = RH - 6;
      if (this.win[this.idx(r, c)]) { this.rect(x, y, ww, wh, "#12141c"); this.line(x + 2, y + 2, x + ww - 3, y + wh - 3, "#5a5a6a"); this.line(x + ww - 3, y + 3, x + 4, y + wh - 4, "#5a5a6a"); }
      else { this.vgrad(x, y, ww, wh, "#7be0ff", "#2c7fd6"); this.rect(x + ww / 2 - 1, y, 2, wh, "#3a4a6a"); this.rect(x, y + wh / 2 - 1, ww, 2, "#3a4a6a"); this.rect(x, y, ww, 1, "#cff0ff"); }
    }
    // ledge
    this.rect(OX - 6, OY + ROWS * RH + 4, COLS * CW + 12, 3, "#4a3a2a");
    // wrecker up top
    const wx = OX + 6; this.rect(wx, 10, 14, 14, "#8a5a2c"); this.disc(wx + 7, 8, 4, "#e2544f"); this.rect(wx, 6, 14, 3, "#c0392b"); if (this.wreckerT > 0) this.rect(wx + 14, 12, 6, 3, "#a85a34");
    // bricks
    for (const b of this.bricks) { this.rect(this.cellX(b.col) - 5, b.y - 3, 10, 6, "#c0392b"); this.rect(this.cellX(b.col) - 5, b.y - 3, 10, 1, "#e2544f"); this.rect(this.cellX(b.col) - 1, b.y - 3, 1, 6, "#8a2020"); }

    // felix (repairman)
    const fxi = this.fx | 0, fyi = this.fy | 0;
    if (this.stun <= 0 || Math.floor(performance.now() / 100) % 2 === 0) {
      this.rect(fxi - 3, fyi - 3, 6, 7, "#2f7fd6"); this.rect(fxi - 3, fyi - 3, 6, 1, "#bfe6ff"); this.disc(fxi, fyi - 5, 3, "#f0c9a0");
      this.rect(fxi - 4, fyi - 8, 8, 2, this.golden ? "#ffd24a" : "#e23b4e"); // cap
      this.rect(fxi + 3, fyi - 4, 3, 2, this.golden ? "#ffd24a" : "#c9a24f"); // hammer
    }

    this.drawFx();

    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#ffe6c2", 1, false);
    this.text(120, 3, "FLOOR " + this.floor, "#ffb020", 1, false);
    if (this.golden) this.text(84, 3, "GOLD", "#ffd24a", 1, false);
    // fix + timer meters
    const bw = Math.round((this.timeLeft / this.timeMax) * 40); this.rect(40, 4, 42, 4, "#2a1a2a"); this.rect(41, 5, Math.max(0, bw), 2, this.timeLeft < this.timeMax * 0.3 ? "#ff5d7d" : "#33e650");
    for (let i = 0; i < 3; i++) this.disc(LW - 9 - i * 9, 6, 3, i < this.lives ? "#3bb6ff" : "#3a2a2a");

    if (this.state === "play" && this.intro > 0) { this.b.globalAlpha = 0.55; this.rect(0, 78, LW, 34, "#0a0714"); this.b.globalAlpha = 1; this.textCenter(88, this.card, "#3bb6ff", 2); }
    if (this.state !== "play") this.overlay();
  }
  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(38, "FIX-IT", "#3bb6ff", 2);
      this.textCenter(62, "PATCH EVERY WINDOW", "#c3b4de", 1);
      this.textCenter(86, "ARROWS CLIMB / FIX REPAIRS", "#83769c", 1);
      this.textCenter(98, "DODGE THE FALLING BRICKS", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS FIX TO START", "#ffec27", 1);
    } else {
      this.textCenter(46, "DEMOLISHED", "#ff5d7d", 2);
      this.textCenter(72, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(86, "BEST " + this.best, "#ffd24a", 1);
      this.textCenter(102, "REACHED FLOOR " + this.floor, "#c3b4de", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS FIX TO RETRY", "#ffec27", 1);
    }
  }
}
