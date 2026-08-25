// static-engine — Main Street cabinet (Frogger homage). An electronics-repair bench:
// hop across the busy counter dodging the sparking tools that whiz along the belts,
// then ride passing circuit-boards over the solder rivers to reach the fix-bays up
// top. Fill every bay to finish the repair and advance. Signature twist: land a
// device dead-centre in a bay for a PRECISION bonus, and a stray part in a bay is a
// two-fer. Benches speed up each level. RetroEngine + juice + MusicKit; 4-way d-pad.

import { RetroEngine, shade, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const BEST_KEY = "static_best";
const CELL = 16;
const LANES = [22, 42, 58, 74, 92, 110, 126, 142, 160]; // 0 goal · 1-3 river · 4 median · 5-7 road · 8 start
const RIVER = [1, 2, 3], ROAD = [5, 6, 7];
const START_ROW = 8, GOAL_ROW = 0;
const BAYS = [40, 90, 140, 190];

interface Ob { x: number; w: number }
interface Lane { row: number; dir: number; spd: number; obs: Ob[]; river: boolean; color: string }
interface Shift { name: string; sky: [string, string]; mult: number }
const SHIFTS: Shift[] = [
  { name: "BENCH 1", sky: ["#12202a", "#080e14"], mult: 1 },
  { name: "BENCH 2", sky: ["#1a1830", "#0c0a18"], mult: 1.3 },
  { name: "BENCH 3", sky: ["#2a1220", "#140810"], mult: 1.65 },
];

const STATIC_THEME: Track = {
  bpm: 132,
  layers: [
    { role: "lead", wave: "square", gain: 0.34, pattern: [
      { n: "E5", d: 1 }, { n: "G5", d: 1 }, { n: "E5", d: 1 }, { n: "C5", d: 1 }, { n: "D5", d: 2 }, { n: "G4", d: 2 }, { n: "A4", d: 2 }, { n: "B4", d: 2 },
      { n: "C5", d: 1 }, { n: "E5", d: 1 }, { n: "G5", d: 2 }, { n: "F5", d: 2 }, { n: "D5", d: 2 }, { n: "C5", d: 2 },
    ] },
    { role: "harmony", wave: "square", gain: 0.13, minIntensity: 0.4, pattern: [{ n: 0, d: 2 }, { n: "C4", d: 2 }, { n: 0, d: 2 }, { n: "G3", d: 2 }] },
    { role: "bass", wave: "triangle", gain: 0.48, pattern: [{ n: "C3", d: 2 }, { n: "C3", d: 2 }, { n: "G2", d: 2 }, { n: "G2", d: 2 }, { n: "A2", d: 2 }, { n: "A2", d: 2 }, { n: "G2", d: 2 }, { n: "G2", d: 2 }] },
    { role: "drums", minIntensity: 0.3, pattern: [{ n: "K", d: 2 }, { n: "H", d: 1 }, { n: "H", d: 1 }, { n: "S", d: 2 }, { n: "H", d: 2 }] },
  ],
};

export class StaticEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private lanes: Lane[] = [];
  private prow = START_ROW; private hx = LW / 2; private ridingDir = 0; private ridingSpd = 0;
  private bays: boolean[] = [false, false, false, false];
  private shiftN = 0; private level = 1; private score = 0; private lives = 3;
  private best = +(LS.get(BEST_KEY) || 0);
  private intro = 0; private card = ""; private flash = 0; private pause = 0; private hopAnim = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.4 });
    this.buildLanes();
    this.start();
  }
  protected onGesture() { this.music?.play(STATIC_THEME); }
  private sh() { return SHIFTS[this.shiftN]; }

  private buildLanes() {
    this.shiftN = Math.min(SHIFTS.length - 1, Math.floor((this.level - 1) / 2));
    const m = this.sh().mult; this.lanes = [];
    const cfg: [number[], boolean, string][] = [[RIVER, true, "#2a6a8a"], [ROAD, false, "#5a5568"]];
    RIVER.forEach((row, i) => { const dir = i % 2 ? 1 : -1, spd = (26 + i * 6) * m; const obs: Ob[] = []; const w = 40 + (i % 2) * 14; for (let x = -20; x < LW + 40; x += w + 34) obs.push({ x, w }); this.lanes.push({ row, dir, spd, obs, river: true, color: "#3bb6ff" }); });
    ROAD.forEach((row, i) => { const dir = i % 2 ? -1 : 1, spd = (34 + i * 8) * m; const obs: Ob[] = []; const w = 16; for (let x = -20; x < LW + 40; x += 40 + i * 6) obs.push({ x, w }); this.lanes.push({ row, dir, spd, obs, river: false, color: "#ff5d7d" }); });
    void cfg;
    this.prow = START_ROW; this.hx = LW / 2; this.ridingDir = 0;
  }
  private beginGame() { this.level = 1; this.score = 0; this.lives = 3; this.bays = [false, false, false, false]; this.buildLanes(); this.clearFx(); this.intro = 1.3; this.card = "BENCH 1"; this.state = "play"; this.music?.setIntensity(0.5); this.report(); }
  private gameOver() { this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); } this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(5); this.hooks.onRunEnd?.({ score: this.score, shift: this.level }); this.report(); }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: this.lives, shift: this.level, combo: this.bays.filter(Boolean).length }); }

  private laneAt(row: number) { return this.lanes.find((l) => l.row === row) || null; }
  private die() { this.lives--; this.flash = 1; this.addShake(4); this.hitstop(0.06); this.buzz(80); this.fxShards(this.hx, LANES[this.prow], "#ffd24a", 8); this.noise(0.14, 0.06); this.tone(150, 0.16, "square", 0.05); this.pause = 0.6; this.prow = START_ROW; this.hx = LW / 2; this.ridingDir = 0; if (this.lives <= 0) this.gameOver(); else this.report(); }
  private reachGoal() {
    const slot = BAYS.findIndex((bx) => Math.abs(bx - this.hx) < 20 && !this.bays[BAYS.indexOf(bx)]);
    const idx = BAYS.findIndex((bx, i) => Math.abs(bx - this.hx) < 20 && !this.bays[i]);
    if (idx < 0) { this.die(); return; }
    this.bays[idx] = true; const precise = Math.abs(BAYS[idx] - this.hx) < 6; const gain = Math.round((100 + (precise ? 80 : 0)) * this.sh().mult);
    this.score += gain; this.fxRing(BAYS[idx], LANES[GOAL_ROW], "#33e650", 22); this.fxPop(BAYS[idx], LANES[GOAL_ROW] - 8, (precise ? "PRECISION +" : "+") + gain, precise ? "#ffd24a" : "#33e650"); this.tone(880, 0.08, "square", 0.05); this.addShake(1); void slot;
    if (this.bays.every(Boolean)) { const bonus = 300 * this.level; this.score += bonus; this.fxPop(LW / 2, 60, "REPAIR DONE +" + bonus, "#33e650", 1); this.music?.playJingle(CLEAR_JINGLE, 165); this.level++; this.bays = [false, false, false, false]; this.buildLanes(); this.intro = 1.1; this.card = ((this.level - 1) % 2 === 0 ? this.sh().name : "REPAIR " + this.level); }
    this.prow = START_ROW; this.hx = LW / 2; this.ridingDir = 0; this.report();
  }

  protected update(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 3); this.hopAnim = Math.max(0, this.hopAnim - dt * 6);
    // obstacles always move (visual life on ready screen)
    for (const l of this.lanes) for (const o of l.obs) { o.x += l.dir * l.spd * dt; if (l.dir > 0 && o.x > LW + 24) o.x -= (LW + 48); if (l.dir < 0 && o.x + o.w < -24) o.x += (LW + 48); }

    if (this.state !== "play") { if (this.pressed.a || this.pressed.left || this.pressed.right || this.pressed.up || this.pressed.down || this.pointer.down) this.beginGame(); return; }
    if (this.intro > 0) { this.intro -= dt; return; }
    if (this.pause > 0) { this.pause -= dt; return; }

    // hop
    if (this.pressed.up && this.prow > 0) { this.prow--; this.hopAnim = 1; this.tone(500, 0.04, "square", 0.04); this.buzz(5); if (this.prow === GOAL_ROW) { this.reachGoal(); return; } }
    else if (this.pressed.down && this.prow < START_ROW) { this.prow++; this.hopAnim = 1; this.tone(360, 0.04, "square", 0.04); }
    else if (this.pressed.left) { this.hx = Math.max(10, this.hx - CELL); this.hopAnim = 1; this.tone(420, 0.03, "square", 0.03); }
    else if (this.pressed.right) { this.hx = Math.min(LW - 10, this.hx + CELL); this.hopAnim = 1; this.tone(420, 0.03, "square", 0.03); }

    // ride rivers
    const lane = this.laneAt(this.prow);
    this.ridingDir = 0;
    if (lane?.river) {
      const board = lane.obs.find((o) => this.hx > o.x - 2 && this.hx < o.x + o.w + 2);
      if (board) { this.hx += lane.dir * lane.spd * dt; this.ridingDir = lane.dir; if (this.hx < 4 || this.hx > LW - 4) { this.die(); return; } }
      else { this.die(); return; } // fell in the solder
    } else if (lane && !lane.river) {
      // road: hit by a sparking tool
      if (lane.obs.some((o) => this.hx > o.x - 4 && this.hx < o.x + o.w + 4)) { this.die(); return; }
    }
  }

  // ---- draw ----
  protected render() {
    const s = this.sh();
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#4a2010" : s.sky[0], s.sky[1]);
    // lane strips
    for (const y of [LANES[4], LANES[8]]) this.rect(0, y - 8, LW, 16, "#2a2f3a"); // safe medians
    for (const l of this.lanes) { const y = LANES[l.row]; this.rect(0, y - 8, LW, 16, l.river ? "#0e2a3a" : "#1a1620"); if (l.river) for (let x = 0; x < LW; x += 6) this.px(x + (Math.floor(performance.now() / 200) % 6), y + 4, "#1a4a6a"); }
    // goal bays
    this.rect(0, LANES[0] - 9, LW, 18, "#12281a");
    BAYS.forEach((bx, i) => { this.rect(bx - 14, LANES[0] - 8, 28, 16, this.bays[i] ? "#1a4a2a" : "#0a1a10"); this.rectLine(bx - 14, LANES[0] - 8, 28, 16, "#33e650"); if (this.bays[i]) { this.rect(bx - 8, LANES[0] - 4, 16, 8, "#33e650"); this.px(bx - 3, LANES[0] - 1, "#0a0714"); } });

    // obstacles
    for (const l of this.lanes) { const y = LANES[l.row]; for (const o of l.obs) { if (l.river) { this.shelf(o.x | 0, y - 5, o.w, 10, "#3a5a2c"); for (let cx = (o.x | 0) + 4; cx < o.x + o.w - 4; cx += 6) this.rect(cx, y - 3, 3, 6, "#5a7a3c"); } else { this.rect((o.x | 0) - 1, y - 5, o.w + 2, 10, "#5a5568"); this.disc((o.x | 0) + o.w / 2, y, 3, "#ffd24a"); this.px((o.x | 0) + o.w / 2, y - 5 - (Math.floor(performance.now() / 80) % 3), "#7be0ff"); } } }

    // player (device being carried)
    if (this.state === "play" || this.state === "ready") { const y = LANES[this.prow] - (this.hopAnim > 0 ? 3 : 0); this.shelf(this.hx - 5, y - 5, 10, 10, "#3bb6ff"); this.rect(this.hx - 3, y - 3, 6, 2, "#7be0ff"); this.px(this.hx - 3, y + 2, "#0a0714"); this.px(this.hx + 2, y + 2, "#0a0714"); if (this.ridingDir) this.px(this.hx - this.ridingDir * 6, y, "#ffd24a"); }

    this.drawFx();

    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#dff2ff", 1, false);
    this.text(150, 3, this.sh().name, "#33e650", 1, false);
    for (let i = 0; i < 3; i++) this.disc(LW - 9 - i * 9, 6, 3, i < this.lives ? "#ff5d7d" : "#3a2a2a");

    if (this.state === "play" && this.intro > 0) { this.b.globalAlpha = 0.55; this.rect(0, 78, LW, 30, "#0a0714"); this.b.globalAlpha = 1; this.textCenter(88, this.card, "#33e650", 2); }
    if (this.state !== "play") this.overlay();
  }
  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(40, "STATIC", "#33e650", 2);
      this.textCenter(64, "CARRY THE DEVICE TO THE FIX-BAYS", "#c3b4de", 1);
      this.textCenter(84, "DODGE THE SPARKS - RIDE THE BOARDS", "#83769c", 1);
      this.textCenter(96, "FILL EVERY BAY TO FINISH THE REPAIR", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS A DIRECTION TO START", "#ffec27", 1);
    } else {
      this.textCenter(48, "SHORT CIRCUIT!", "#ff5d7d", 2);
      this.textCenter(74, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(88, "BEST " + this.best, "#ffd24a", 1);
      this.textCenter(104, "REACHED REPAIR " + this.level, "#c3b4de", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS A DIRECTION TO RETRY", "#ffec27", 1);
    }
  }
}
