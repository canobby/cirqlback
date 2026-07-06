// spin-city-engine — Main Street cabinet #8 (Marble Madness homage). Roll a vinyl
// through a top-down course of grooves, gaps and speed-strips to the turntable before
// the needle drops. The record has momentum — tilt to steer, brake to keep from
// flying off the edge into the void. Signature twist: the needle-drop TIMER is the
// track's tempo and it tightens each leg; speed-strips (groove rails) fling you along.
// Worlds: 45s → LPs → Live Set. RetroEngine (16-bit + juice) + MusicKit; tilt + brake.

import { RetroEngine, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const COLS = 20, ROWS = 14, TILE = 12, OY = 12;
const BEST_KEY = "spincity_best";

interface World { name: string; sky: [string, string]; floor: string; acc: number; time: number; }
const WORLDS: World[] = [
  { name: "45s", sky: ["#140a28", "#060410"], floor: "#2c3f8a", acc: 320, time: 15 },
  { name: "LPs", sky: ["#1a1030", "#0a0618"], floor: "#3a2f8a", acc: 360, time: 13 },
  { name: "LIVE SET", sky: ["#2a1030", "#120618"], floor: "#5a2f7a", acc: 400, time: 11 },
];

const CITY_THEME: Track = {
  bpm: 146,
  layers: [
    { role: "lead", wave: "square", gain: 0.38, pattern: [
      { n: "A4", d: 1 }, { n: "C5", d: 1 }, { n: "E5", d: 2 }, { n: "D5", d: 1 }, { n: "C5", d: 1 }, { n: "A4", d: 2 }, { n: "B4", d: 2 }, { n: "E5", d: 2 },
      { n: "D5", d: 1 }, { n: "C5", d: 1 }, { n: "B4", d: 2 }, { n: "A4", d: 2 }, { n: "E4", d: 2 }, { n: "A4", d: 4 },
    ] },
    { role: "harmony", wave: "square", gain: 0.16, minIntensity: 0.4, pattern: [{ n: 0, d: 1 }, { n: "E4", d: 1 }, { n: 0, d: 1 }, { n: "E4", d: 1 }] },
    { role: "bass", wave: "triangle", gain: 0.5, pattern: [{ n: "A2", d: 1 }, { n: "A2", d: 1 }, { n: "A2", d: 2 }, { n: "E2", d: 2 }, { n: "F2", d: 2 }, { n: "G2", d: 2 }, { n: "A2", d: 2 }] },
    { role: "drums", minIntensity: 0.2, pattern: [{ n: "K", d: 1 }, { n: "H", d: 1 }, { n: "K", d: 1 }, { n: "H", d: 1 }, { n: "S", d: 2 }, { n: "H", d: 2 }] },
  ],
};

export class SpinCityEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private track: Uint8Array = new Uint8Array(ROWS * COLS);  // 0 void, 1 floor, 2 finish, 3 start
  private strip: Uint8Array = new Uint8Array(ROWS * COLS);  // 0 none, 1 up,2 down,3 left,4 right
  private world = 0;
  private vx = 0; private vy = 0; private mx = 0; private my = 0; private spin = 0;
  private startX = 0; private startY = 0; private falling = 0;
  private timeLeft = 0; private timeMax = 1;

  private score = 0; private lives = 3; private leg = 1;
  private best = +(LS.get(BEST_KEY) || 0);
  private flash = 0; private intro = 0; private card = ""; private pause = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.42 });
    this.genCourse(); this.start();
  }
  protected onGesture() { this.music?.play(CITY_THEME); }
  private w() { return WORLDS[this.world]; }
  private idx(r: number, c: number) { return r * COLS + c; }
  private tileAt(x: number, y: number) { const c = Math.floor(x / TILE), r = Math.floor((y - OY) / TILE); if (r < 0 || c < 0 || r >= ROWS || c >= COLS) return 0; return this.track[this.idx(r, c)]; }
  private cx(c: number) { return c * TILE + TILE / 2; }
  private cy(r: number) { return OY + r * TILE + TILE / 2; }

  private genCourse() {
    this.world = Math.floor((this.leg - 1) / 3) % WORLDS.length;
    this.track.fill(0); this.strip.fill(0);
    const v = (r: number, c: number) => { for (let d = -1; d <= 1; d++) { const cc = c + d; if (cc >= 0 && cc < COLS && r >= 0 && r < ROWS) this.track[this.idx(r, cc)] = this.track[this.idx(r, cc)] || 1; } };
    const h = (r: number, c: number) => { for (let d = -1; d <= 1; d++) { const rr = r + d; if (c >= 0 && c < COLS && rr >= 0 && rr < ROWS) this.track[this.idx(rr, c)] = this.track[this.idx(rr, c)] || 1; } };
    let c = 3 + Math.floor(this.rnd() * (COLS - 6)); let r = ROWS - 2;
    v(r, c); this.track[this.idx(r, c)] = 3; this.startX = this.cx(c); this.startY = this.cy(r);
    let firstRun: [number, number][] = [];
    while (r > 1) {
      const up = 2 + Math.floor(this.rnd() * 2);
      for (let k = 0; k < up && r > 1; k++) { r--; v(r, c); if (firstRun.length < 6) firstRun.push([r, c]); }
      const dir = this.rnd() < 0.5 ? -1 : 1; const jog = 2 + Math.floor(this.rnd() * 4);
      const nc = Math.max(2, Math.min(COLS - 3, c + dir * jog)); const step = nc > c ? 1 : -1;
      for (let cc = c; cc !== nc; cc += step) h(r, cc); c = nc;
    }
    this.track[this.idx(r, c)] = 2; // finish
    for (const [rr, cc] of firstRun) this.strip[this.idx(rr, cc)] = 1; // a speed-strip run
    this.mx = this.startX; this.my = this.startY; this.vx = 0; this.vy = 0; this.falling = 0;
    this.timeMax = Math.max(7, this.w().time - this.leg * 0.4); this.timeLeft = this.timeMax;
  }

  private newLeg(fresh: boolean) { this.genCourse(); if (fresh) { this.intro = 1.4; this.card = ((this.leg - 1) % 3 === 0 ? "SIDE " + (this.world + 1) + "  " + this.w().name : "TRACK " + this.leg); } }
  private beginGame() { this.score = 0; this.lives = 3; this.leg = 1; this.clearFx(); this.newLeg(true); this.state = "play"; this.music?.setIntensity(0.5); this.report(); }
  private gameOver() {
    this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); }
    this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(5); this.hooks.onRunEnd?.({ score: this.score, shift: this.leg }); this.report();
  }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: this.lives, shift: this.leg, combo: 0 }); }

  private legClear() {
    const bonus = 80 * this.leg + Math.round(this.timeLeft * 10); this.score += bonus;
    this.fxRing(this.mx, this.my, "#ffd24a", 60); this.fxPop(this.mx, this.my - 10, "SIDE DONE +" + bonus, "#ffd24a"); this.music?.playJingle(CLEAR_JINGLE, 165); this.addShake(2);
    this.leg++; this.newLeg(true); this.report();
  }
  private wipeout() {
    this.lives--; this.flash = 1; this.addShake(4); this.buzz(80); this.noise(0.16, 0.06); this.tone(140, 0.18, "square", 0.05); this.pause = 0.5;
    if (this.lives <= 0) this.gameOver(); else { this.mx = this.startX; this.my = this.startY; this.vx = 0; this.vy = 0; this.falling = 0; this.timeLeft = this.timeMax; this.report(); }
  }

  protected update(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 3);
    if (this.state !== "play") { if (this.pressed.a || this.pressed.up || this.pressed.down || this.pressed.left || this.pressed.right || this.pointer.down) this.beginGame(); return; }
    if (this.intro > 0) { this.intro -= dt; return; }
    if (this.pause > 0) { this.pause -= dt; return; }

    if (this.falling > 0) { this.falling += dt; if (this.falling > 0.5) this.wipeout(); return; }

    // timer (needle drop)
    this.timeLeft -= dt; if (this.timeLeft <= 0) { this.fxPop(this.mx, this.my - 8, "NEEDLE DROP!", "#ff5d7d"); this.wipeout(); return; }

    // input: tilt
    const a = this.w().acc;
    if (this.btn.left) this.vx -= a * dt; if (this.btn.right) this.vx += a * dt;
    if (this.btn.up) this.vy -= a * dt; if (this.btn.down) this.vy += a * dt;
    // brake
    if (this.btn.a) { const b = Math.pow(0.02, dt); this.vx *= b; this.vy *= b; }
    // speed-strip boost
    const st = this.strip[this.idx(Math.floor((this.my - OY) / TILE), Math.floor(this.mx / TILE))] || 0;
    if (st === 1) this.vy -= 280 * dt; else if (st === 2) this.vy += 280 * dt; else if (st === 3) this.vx -= 280 * dt; else if (st === 4) this.vx += 280 * dt;
    // friction + speed cap
    const fr = Math.pow(0.12, dt); this.vx *= fr; this.vy *= fr;
    const sp = Math.hypot(this.vx, this.vy), MAX = 128; if (sp > MAX) { this.vx *= MAX / sp; this.vy *= MAX / sp; }
    this.mx += this.vx * dt; this.my += this.vy * dt; this.spin += (this.vx) * dt * 0.05;

    const t = this.tileAt(this.mx, this.my);
    if (t === 0) { this.falling = 0.001; this.fxBurst(this.mx, this.my, "#1a1a2a", 6, 60); this.tone(200, 0.1, "square", 0.04); }
    else if (t === 2) this.legClear();
  }

  // ---- draw ----
  private vinyl(x: number, y: number, r: number) {
    this.ball(x | 0, y | 0, r, "#181818"); this.ring(x | 0, y | 0, r, "#3a3a3a", 1.2); this.ring(x | 0, y | 0, Math.max(2, r - 3), "#2a2a2a", 1);
    this.disc(x | 0, y | 0, 2, "#e23b4e");
    const gx = x + Math.cos(this.spin) * (r - 2), gy = y + Math.sin(this.spin) * (r - 2); this.px(gx | 0, gy | 0, "#6a6a6a");
  }

  protected render() {
    const w = this.w();
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#4a1530" : w.sky[0], w.sky[1]);
    // course
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const t = this.track[this.idx(r, c)]; if (!t) continue;
      const x = c * TILE, y = OY + r * TILE;
      if (t === 2) { for (let i = 4; i >= 1; i--) this.ring(this.cx(c), this.cy(r), i * 2, i % 2 ? "#ffd24a" : "#5a4028", 1.4); this.disc(this.cx(c), this.cy(r), 2, "#ff5d7d"); continue; }
      const base = t === 3 ? "#33a06a" : w.floor;
      this.shelf(x + 1, y + 1, TILE - 2, TILE - 2, base);
      const s = this.strip[this.idx(r, c)]; if (s) { this.rect(x + 4, y + 4, 4, 4, "#ffe27a"); this.px(this.cx(c), this.cy(r) - 3, "#fff0a0"); }
    }

    if (this.state === "play") this.vinyl(this.mx, this.my, this.falling > 0 ? Math.max(1, 5 - this.falling * 8) : 5);

    this.drawFx();

    // HUD + needle bar
    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#ffe6c2", 1, false);
    this.text(120, 3, "SIDE " + this.leg, "#ffb020", 1, false);
    for (let i = 0; i < 3; i++) this.disc(LW - 9 - i * 9, 6, 3, i < this.lives ? "#b79bff" : "#3a2a2a");
    // needle-drop bar
    const bw = Math.round((this.timeLeft / this.timeMax) * 60); this.rect(52, 4, 62, 4, "#2a1a2a"); this.rect(53, 5, Math.max(0, bw), 2, this.timeLeft < this.timeMax * 0.3 ? "#ff5d7d" : "#7be0ff");

    if (this.state === "play" && this.intro > 0) { this.b.globalAlpha = 0.55; this.rect(0, 78, LW, 34, "#0a0714"); this.b.globalAlpha = 1; this.textCenter(88, this.card, "#b79bff", 2); }
    if (this.state !== "play") this.overlay();
  }
  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(38, "SPIN CITY", "#b79bff", 2);
      this.textCenter(62, "ROLL TO THE TURNTABLE", "#c3b4de", 1);
      this.textCenter(86, "ARROWS TILT / BRAKE SLOWS", "#83769c", 1);
      this.textCenter(98, "BEAT THE NEEDLE DROP", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS A KEY TO START", "#ffec27", 1);
    } else {
      this.textCenter(46, "OFF THE RECORD", "#ff5d7d", 2);
      this.textCenter(72, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(86, "BEST " + this.best, "#ffd24a", 1);
      this.textCenter(102, "REACHED SIDE " + this.leg, "#c3b4de", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS A KEY TO RETRY", "#ffec27", 1);
    }
  }
}
