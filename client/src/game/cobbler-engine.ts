// cobbler-engine — Main Street cabinet (Dig Dug homage). A shoe-repair stockroom:
// tunnel through the packed-leather fill, pump up the leather-munching moths till
// they burst, or undermine a stacked SHOE BOX so it drops and flattens them. Clear
// every moth to move to the next stockroom. Signature twist: drop one box through
// TWO+ moths for a COBBLER COMBO; deeper moths are worth more. Stockrooms: Repairs
// -> Storeroom -> Vault. RetroEngine + juice + MusicKit; 4-way d-pad + pump.

import { RetroEngine, shade, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const BEST_KEY = "cobbler_best";
const COLS = 13, ROWS = 9, CELL = 16;
const FX = (LW - COLS * CELL) / 2 | 0, FY = 16;

type Moth = { c: number; r: number; moveT: number; pumped: number; pumpT: number; phase: number; dead: boolean };
type Box = { c: number; r: number; fy: number; falling: boolean; vy: number; crushed: number };

interface Room { name: string; fill: string; speed: number; moths: number }
const ROOMS: Room[] = [
  { name: "REPAIRS", fill: "#6b4a2c", speed: 0.9, moths: 3 },
  { name: "STOREROOM", fill: "#5a3a4a", speed: 0.72, moths: 4 },
  { name: "THE VAULT", fill: "#3a3a5a", speed: 0.58, moths: 5 },
];

const COB_THEME: Track = {
  bpm: 130,
  layers: [
    { role: "lead", wave: "square", gain: 0.36, pattern: [
      { n: "C5", d: 1 }, { n: "C5", d: 1 }, { n: "G4", d: 2 }, { n: "A4", d: 1 }, { n: "A4", d: 1 }, { n: "G4", d: 2 }, { n: "E4", d: 2 }, { n: "C4", d: 2 },
      { n: "D4", d: 2 }, { n: "E4", d: 2 }, { n: "F4", d: 1 }, { n: "E4", d: 1 }, { n: "D4", d: 2 }, { n: "G4", d: 2 },
    ] },
    { role: "harmony", wave: "square", gain: 0.14, minIntensity: 0.4, pattern: [{ n: 0, d: 2 }, { n: "C4", d: 2 }, { n: 0, d: 2 }, { n: "G3", d: 2 }] },
    { role: "bass", wave: "triangle", gain: 0.5, pattern: [{ n: "C3", d: 2 }, { n: "C3", d: 2 }, { n: "G2", d: 2 }, { n: "G2", d: 2 }, { n: "F2", d: 2 }, { n: "F2", d: 2 }, { n: "G2", d: 2 }, { n: "G2", d: 2 }] },
    { role: "drums", minIntensity: 0.3, pattern: [{ n: "K", d: 2 }, { n: "H", d: 2 }, { n: "S", d: 2 }, { n: "H", d: 2 }] },
  ],
};

export class CobblerEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private dirt: boolean[][] = [];          // true = packed fill
  private moths: Moth[] = [];
  private boxes: Box[] = [];
  private pgx = 6; private pgy = 8; private face: [number, number] = [0, -1];
  private harpoon = 0; private pumpTarget: Moth | null = null; private moveCd = 0;
  private roomN = 0; private level = 1; private score = 0; private lives = 3; private combo = 0;
  private best = +(LS.get(BEST_KEY) || 0);
  private intro = 0; private card = ""; private flash = 0; private pause = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.4 });
    this.buildRoom();
    this.start();
  }
  protected onGesture() { this.music?.play(COB_THEME); }
  private rm() { return ROOMS[this.roomN]; }

  private buildRoom() {
    this.roomN = Math.min(ROOMS.length - 1, Math.floor((this.level - 1) / 3));
    this.dirt = Array.from({ length: ROWS }, () => new Array(COLS).fill(true));
    // player shaft down the middle-ish + pocket
    this.pgx = 6; this.pgy = 8; this.face = [0, -1];
    for (let r = 2; r <= 8; r++) this.dirt[r][6] = false;
    // moth chambers (pre-dug pockets)
    this.moths = []; this.boxes = [];
    const n = this.rm().moths + Math.floor((this.level - 1) / 3);
    const spots: [number, number][] = [[2, 3], [10, 3], [3, 6], [9, 6], [2, 8], [10, 8], [4, 4], [8, 4]];
    for (let i = 0; i < n && i < spots.length; i++) { const [c, r] = spots[i]; this.dirt[r][c] = false; this.dirt[r][c - 1] = false; this.moths.push({ c, r, moveT: 1 + this.rnd(), pumped: 0, pumpT: 0, phase: 0, dead: false }); }
    // a few boxes suspended in the fill
    const bspots: [number, number][] = [[4, 2], [8, 2], [6, 4], [3, 5], [9, 5]];
    for (let i = 0; i < 3 + Math.floor(this.level / 2) && i < bspots.length; i++) { const [c, r] = bspots[i]; this.boxes.push({ c, r, fy: FY + r * CELL, falling: false, vy: 0, crushed: 0 }); this.dirt[r][c] = true; }
    this.harpoon = 0; this.pumpTarget = null;
  }
  private beginGame() { this.level = 1; this.score = 0; this.lives = 3; this.combo = 0; this.buildRoom(); this.clearFx(); this.intro = 1.3; this.card = "REPAIRS"; this.state = "play"; this.music?.setIntensity(0.5); this.report(); }
  private gameOver() { this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); } this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(5); this.hooks.onRunEnd?.({ score: this.score, shift: this.level }); this.report(); }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: this.lives, shift: this.level, combo: this.combo }); }
  private levelClear() { const bonus = 200 * this.level; this.score += bonus; this.fxRing(LW / 2, LH / 2, "#ffd24a", 90); this.fxPop(LW / 2, LH / 2 - 8, "STOCKROOM CLEAR +" + bonus, "#ffd24a"); this.music?.playJingle(CLEAR_JINGLE, 165); this.level++; this.buildRoom(); this.intro = 1.1; this.card = ((this.level - 1) % 3 === 0 ? this.rm().name : "ROOM " + this.level); this.report(); }
  private loseLife() { this.lives--; this.flash = 1; this.combo = 0; this.addShake(4); this.hitstop(0.06); this.buzz(80); this.fxShards(FX + this.pgx * CELL + CELL / 2, FY + this.pgy * CELL + CELL / 2, "#c98a44", 8); this.noise(0.14, 0.06); this.tone(150, 0.16, "square", 0.05); this.pause = 0.7; this.harpoon = 0; this.pumpTarget = null; if (this.lives <= 0) this.gameOver(); else { this.pgx = 6; this.pgy = 8; this.report(); } }

  private mothAt(c: number, r: number) { return this.moths.find((m) => !m.dead && m.c === c && m.r === r) || null; }
  private boxAt(c: number, r: number) { return this.boxes.find((b) => !b.falling && b.c === c && b.r === r) || null; }

  private tryMove(dc: number, dr: number) {
    this.face = [dc, dr]; const nc = this.pgx + dc, nr = this.pgy + dr;
    if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) return;
    if (this.boxAt(nc, nr)) return;                      // can't walk into a box
    this.dirt[nr][nc] = false;                            // dig
    if (!this.mothAt(nc, nr)) { this.pgx = nc; this.pgy = nr; this.tone(240, 0.02, "square", 0.03); }
  }
  private pump() {
    // target the moth in the facing cell (or 2 out through open tunnel)
    let tc = this.pgx + this.face[0], tr = this.pgy + this.face[1];
    let target = this.mothAt(tc, tr);
    if (!target && !this.dirt[tr]?.[tc]) { tc += this.face[0]; tr += this.face[1]; target = this.mothAt(tc, tr); }
    this.harpoon = 0.14;
    if (target) { target.pumped++; target.pumpT = 1.2; this.pumpTarget = target; this.fxBurst(FX + tc * CELL + CELL / 2, FY + tr * CELL + CELL / 2, "#7be0ff", 4, 40); this.tone(500 + target.pumped * 120, 0.05, "square", 0.04); this.buzz(6);
      if (target.pumped >= 3) { target.dead = true; const depth = 1 + Math.floor(target.r / 3); this.score += 100 * depth; this.combo = 0; this.fxBurst(FX + tc * CELL + CELL / 2, FY + tr * CELL + CELL / 2, "#ff5d7d", 12, 100); this.fxPop(FX + tc * CELL + CELL / 2, FY + tr * CELL, "POP! +" + 100 * depth, "#ffd24a"); this.addShake(1.2); this.hitstop(0.04); this.tone(880, 0.1, "square", 0.05); this.pumpTarget = null; }
    } else { this.tone(200, 0.04, "square", 0.03); }
  }

  protected update(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 3); this.moveCd = Math.max(0, this.moveCd - dt); this.harpoon = Math.max(0, this.harpoon - dt);
    for (const m of this.moths) if (m.pumpT > 0) { m.pumpT -= dt; if (m.pumpT <= 0 && m.pumped > 0 && m.pumped < 3) m.pumped = Math.max(0, m.pumped - 1); }
    if (this.state !== "play") { if (this.pressed.a || this.pressed.left || this.pressed.right || this.pressed.up || this.pressed.down || this.pointer.down) this.beginGame(); return; }
    if (this.intro > 0) { this.intro -= dt; return; }
    if (this.pause > 0) { this.pause -= dt; return; }

    // input
    if (this.pressed.a) this.pump();
    let dc = 0, dr = 0;
    if (this.pressed.left) dc = -1; else if (this.pressed.right) dc = 1; else if (this.pressed.up) dr = -1; else if (this.pressed.down) dr = 1;
    if (dc || dr) { this.tryMove(dc, dr); this.moveCd = 0.14; }
    else if (this.moveCd <= 0) { if (this.btn.left) dc = -1; else if (this.btn.right) dc = 1; else if (this.btn.up) dr = -1; else if (this.btn.down) dr = 1; if (dc || dr) { this.tryMove(dc, dr); this.moveCd = 0.12; } }

    // boxes: fall if the cell below is empty
    for (const b of this.boxes) {
      if (!b.falling) { const belowDirt = b.r + 1 < ROWS ? this.dirt[b.r + 1][b.c] : true; const belowBox = this.boxAt(b.c, b.r + 1); if (b.r + 1 < ROWS && !belowDirt && !belowBox) b.falling = true; }
      if (b.falling) {
        b.vy += 300 * dt; b.fy += b.vy * dt; const cellR = Math.floor((b.fy - FY) / CELL);
        // crush moths in this cell
        const m = this.mothAt(b.c, cellR); if (m) { m.dead = true; b.crushed++; this.combo = b.crushed; this.score += 150 * b.crushed; this.fxBurst(FX + b.c * CELL + CELL / 2, b.fy, "#ff5d7d", 12, 100); this.fxPop(FX + b.c * CELL + CELL / 2, b.fy - 8, b.crushed > 1 ? "COMBO x" + b.crushed : "CRUSH!", "#ffd24a"); this.addShake(1.5); this.hitstop(0.04); this.tone(300, 0.08, "square", 0.05); }
        // crush player
        if (b.c === this.pgx && cellR === this.pgy) { this.loseLife(); return; }
        // land
        const landR = cellR + 1; const stop = landR >= ROWS || this.dirt[landR]?.[b.c] || !!this.boxAt(b.c, landR);
        if (stop) { b.r = cellR; b.fy = FY + cellR * CELL; b.falling = false; b.vy = 0; this.addShake(1); this.noise(0.06, 0.04); if (b.crushed > 1) this.fxRing(FX + b.c * CELL + CELL / 2, b.fy, "#ffd24a", 26); b.crushed = 0; }
      }
    }

    // moth AI
    for (const m of this.moths) {
      if (m.dead || m.pumpT > 0) continue;
      m.moveT -= dt; if (m.moveT > 0) continue; m.moveT = this.rm().speed * (0.8 + this.rnd() * 0.4);
      // phase toward player through dirt occasionally when boxed in
      const dcs = Math.sign(this.pgx - m.c), drs = Math.sign(this.pgy - m.r);
      const opts: [number, number][] = Math.abs(this.pgx - m.c) > Math.abs(this.pgy - m.r) ? [[dcs, 0], [0, drs]] : [[0, drs], [dcs, 0]];
      let moved = false;
      for (const [mc, mr] of opts) { if (mc === 0 && mr === 0) continue; const nc = m.c + mc, nr = m.r + mr; if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue; if (!this.dirt[nr][nc] && !this.boxAt(nc, nr) && !this.mothAt(nc, nr)) { m.c = nc; m.r = nr; moved = true; break; } }
      if (!moved && this.rnd() < 0.4) { m.phase = 0.5; const [mc, mr] = opts[0]; const nc = m.c + mc, nr = m.r + mr; if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && !this.boxAt(nc, nr)) { m.c = nc; m.r = nr; this.dirt[nr][nc] = false; } }
      if (m.c === this.pgx && m.r === this.pgy) { this.loseLife(); return; }
      m.phase = Math.max(0, m.phase - this.rm().speed);
    }

    if (this.moths.every((m) => m.dead)) this.levelClear();
  }

  // ---- draw ----
  protected render() {
    const rm = this.rm();
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#4a1520" : "#1a1208", "#0e0a04");
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const x = FX + c * CELL, y = FY + r * CELL;
      if (this.dirt[r][c]) { const shade1 = shade(rm.fill, -0.05 - ((r * 3 + c) % 3) * 0.04); this.rect(x, y, CELL, CELL, shade1); this.rect(x, y, CELL, 1, shade(rm.fill, 0.1)); if ((r + c) % 3 === 0) this.px(x + 4, y + 6, shade(rm.fill, -0.3)); }
      else this.rect(x, y, CELL, CELL, "#0a0804");
    }
    // boxes (shoe boxes)
    for (const b of this.boxes) { const x = FX + b.c * CELL, y = b.falling ? b.fy : FY + b.r * CELL; this.shelf(x + 1, y + 1, CELL - 2, CELL - 2, "#c98a54"); this.rect(x + 1, y + CELL / 2 - 1, CELL - 2, 2, "#8a5a2c"); this.rect(x + 3, y + 3, CELL - 6, 3, "#e0b080"); }
    // moths
    for (const m of this.moths) { if (m.dead) continue; const x = FX + m.c * CELL + CELL / 2, y = FY + m.r * CELL + CELL / 2; const sz = 5 + m.pumped * 1.6; const col = m.pumped > 0 ? "#ff8ab5" : "#c3b4de"; this.ball(x, y, sz | 0, col); this.rect(x - 4, y - 1, 3, 2, "#e6ddf5"); this.rect(x + 1, y - 1, 3, 2, "#e6ddf5"); this.rect(x - 5, y - 5, 3, 3, shade(col, -0.2)); this.rect(x + 2, y - 5, 3, 3, shade(col, -0.2)); if (m.pumped > 0) this.px(x, y - sz - 2, "#7be0ff"); }
    // harpoon
    if (this.harpoon > 0) { const x = FX + this.pgx * CELL + CELL / 2, y = FY + this.pgy * CELL + CELL / 2; this.line(x, y, x + this.face[0] * CELL * 1.6 | 0, y + this.face[1] * CELL * 1.6 | 0, "#7be0ff"); }
    // player (cobbler)
    { const x = FX + this.pgx * CELL + CELL / 2, y = FY + this.pgy * CELL + CELL / 2; this.rect(x - 4, y - 3, 8, 8, "#ffb020"); this.disc(x, y - 5, 3, "#f0c9a0"); this.rect(x - 4, y - 8, 8, 2, "#8a5a2c"); this.rect(x - 4 + (this.face[0] === 0 ? 3 : this.face[0] > 0 ? 6 : 0), y - 1 + this.face[1] * 2, 3, 3, "#a86a1a"); }

    this.drawFx();

    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#ffe6c2", 1, false);
    this.text(140, 3, rm.name, "#ffd24a", 1, false);
    if (this.combo > 1) this.text(112, 3, "x" + this.combo, "#ff8ab5", 1, false);
    for (let i = 0; i < 3; i++) this.disc(LW - 9 - i * 9, 6, 3, i < this.lives ? "#ff5d7d" : "#3a2a2a");

    if (this.state === "play" && this.intro > 0) { this.b.globalAlpha = 0.55; this.rect(0, 78, LW, 30, "#0a0714"); this.b.globalAlpha = 1; this.textCenter(88, this.card, "#ffd24a", 2); }
    if (this.state !== "play") this.overlay();
  }
  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(40, "COBBLER", "#ffb020", 2);
      this.textCenter(64, "TUNNEL AND POP THE MOTHS", "#c3b4de", 1);
      this.textCenter(84, "PUMP THREE TIMES TO BURST ONE", "#83769c", 1);
      this.textCenter(96, "OR DROP A BOX TO FLATTEN THEM", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS A DIRECTION TO START", "#ffec27", 1);
    } else {
      this.textCenter(48, "MOTH-EATEN!", "#ff5d7d", 2);
      this.textCenter(74, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(88, "BEST " + this.best, "#ffd24a", 1);
      this.textCenter(104, "REACHED ROOM " + this.level, "#c3b4de", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS A DIRECTION TO RETRY", "#ffec27", 1);
    }
  }
}
