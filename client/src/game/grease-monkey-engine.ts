// grease-monkey-engine — Main Street cabinet (Out Run homage). An auto detailer's
// road test: cruise the winding highway in a freshly-waxed ride, steer through the
// curves and weave the slower traffic, blast the WAX STRIPS for a speed surge, and
// beat the clock to each checkpoint. Signature twist: a clean near-miss past a car
// banks a POLISH combo. Run out of road-time and it's over — go for distance.
// Legs: Coast -> Canyon -> Neon Mile. RetroEngine + juice + MusicKit; steer L/R.

import { RetroEngine, shade, mix, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const BEST_KEY = "grease_best";
const HY = 56, CX = LW / 2;      // horizon, centre
const CARY = LH - 26;

interface Car { z: number; lane: number; color: string; passed: boolean }
interface Leg { name: string; sky: [string, string]; grass: string; road: string }
const LEGS: Leg[] = [
  { name: "COAST", sky: ["#3a6a9a", "#a8d0e8"], grass: "#2a7a3a", road: "#5a5a66" },
  { name: "CANYON", sky: ["#8a4a2a", "#e0a860"], grass: "#7a5a2a", road: "#6a5a4a" },
  { name: "NEON MILE", sky: ["#2a1a4a", "#6a3a8a"], grass: "#1a2a4a", road: "#3a3a5a" },
];

const GREASE_THEME: Track = {
  bpm: 128,
  layers: [
    { role: "lead", wave: "square", gain: 0.32, pattern: [
      { n: "A4", d: 2 }, { n: "C5", d: 2 }, { n: "E5", d: 2 }, { n: "D5", d: 1 }, { n: "C5", d: 1 }, { n: "A4", d: 4 },
      { n: "G4", d: 2 }, { n: "B4", d: 2 }, { n: "D5", d: 2 }, { n: "E5", d: 2 }, { n: "D5", d: 4 },
    ] },
    { role: "harmony", wave: "square", gain: 0.14, minIntensity: 0.4, pattern: [{ n: 0, d: 2 }, { n: "A3", d: 2 }, { n: 0, d: 2 }, { n: "E3", d: 2 }] },
    { role: "bass", wave: "triangle", gain: 0.5, pattern: [{ n: "A2", d: 1 }, { n: "A2", d: 1 }, { n: "A2", d: 1 }, { n: "E2", d: 1 }, { n: "F2", d: 1 }, { n: "F2", d: 1 }, { n: "G2", d: 1 }, { n: "G2", d: 1 }] },
    { role: "drums", minIntensity: 0.2, pattern: [{ n: "K", d: 1 }, { n: "H", d: 1 }, { n: "S", d: 1 }, { n: "H", d: 1 }] },
  ],
};

export class GreaseMonkeyEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private pcx = CX; private spd = 0; private dist = 0; private curve = 0; private targetCurve = 0; private curveT = 0;
  private cars: Car[] = []; private spawnT = 0; private wax: { z: number; lane: number } | null = null; private waxT = 0;
  private time = 40; private nextCP = 1200; private score = 0; private combo = 0; private comboT = 0; private boost = 0;
  private best = +(LS.get(BEST_KEY) || 0); private legN = 0; private spin = 0; private flash = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.4 });
    this.start();
  }
  protected onGesture() { this.music?.play(GREASE_THEME); }
  private leg() { return LEGS[this.legN]; }

  private beginGame() { this.pcx = CX; this.spd = 140; this.dist = 0; this.curve = 0; this.targetCurve = 0; this.curveT = 2; this.cars = []; this.spawnT = 1; this.wax = null; this.time = 40; this.nextCP = 1200; this.score = 0; this.combo = 0; this.boost = 0; this.legN = 0; this.spin = 0; this.state = "play"; this.clearFx(); this.music?.setIntensity(0.6); this.report(); }
  private gameOver() { this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); } this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(4); this.hooks.onRunEnd?.({ score: this.score, shift: this.legN + 1 }); this.report(); }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, shift: this.legN + 1, lives: Math.ceil(this.time), combo: this.combo }); }

  private curveAt(p: number) { return this.curve * p * p * 90; }
  private roadCenter(p: number) { return CX + this.curveAt(p); }
  private roadHalf(p: number) { return 8 + p * 118; }

  protected update(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 3); this.comboT = Math.max(0, this.comboT - dt); if (this.comboT <= 0) this.combo = 0; this.boost = Math.max(0, this.boost - dt);
    if (this.state !== "play") { if (this.pressed.a || this.pressed.left || this.pressed.right || this.pointer.down) this.beginGame(); return; }
    if (this.spin > 0) { this.spin -= dt; this.spd = Math.max(60, this.spd - 200 * dt); }

    // time
    this.time -= dt; if (this.time <= 0) { this.time = 0; this.gameOver(); return; }

    // curve evolves
    this.curveT -= dt; if (this.curveT <= 0) { this.targetCurve = (this.rnd() - 0.5) * 2; this.curveT = 1.5 + this.rnd() * 2; }
    this.curve += (this.targetCurve - this.curve) * Math.min(1, dt * 1.2);

    // speed + boost
    const maxSpd = 240 + (this.boost > 0 ? 120 : 0);
    if (this.spin <= 0) this.spd += (maxSpd - this.spd) * Math.min(1, dt * 0.8);
    // steer (curve pushes you outward)
    if (this.spin <= 0) { if (this.btn.left) this.pcx -= 130 * dt; if (this.btn.right) this.pcx += 130 * dt; }
    this.pcx -= this.curve * this.spd * dt * 0.02;      // centrifugal drift
    this.pcx = Math.max(20, Math.min(LW - 20, this.pcx));

    this.dist += this.spd * dt; this.score = Math.floor(this.dist / 10);
    this.legN = Math.min(2, Math.floor(this.dist / 4000));

    // checkpoint
    if (this.dist > this.nextCP) { this.time += 14; this.nextCP += 1400; this.fxPop(CX, 40, "CHECKPOINT +14s", "#33e650", 1); this.music?.playJingle(CLEAR_JINGLE, 165); this.addShake(1.5); }

    // off-road
    const cxb = this.roadCenter(1), rhb = this.roadHalf(1);
    if (Math.abs(this.pcx - cxb) > rhb - 6) { this.spd = Math.max(70, this.spd - 260 * dt); this.addShake(0.6); if (this.rnd() < 0.3) this.fxBurst(this.pcx, CARY, this.leg().grass, 2, 40); }

    // traffic
    this.spawnT -= dt; if (this.spawnT <= 0 && this.cars.length < 4) { this.cars.push({ z: 0.02, lane: (this.rnd() - 0.5) * 1.4, color: ["#ff5d7d", "#3bb6ff", "#ffd24a", "#33e650"][Math.floor(this.rnd() * 4)], passed: false }); this.spawnT = 0.7 + this.rnd() * 0.9; }
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const c = this.cars[i]; c.z += (this.spd * 0.0016) * dt * 60 * dt * 12; c.z += this.spd * 0.00006; // approach
      if (!c.passed && c.z > 0.9) { const p = Math.min(1, c.z); const cxCar = this.roadCenter(p) + c.lane * this.roadHalf(p); const dx = Math.abs(cxCar - this.pcx); if (dx < 12) { this.crash(); c.passed = true; } else if (dx < 30) { c.passed = true; this.combo++; this.comboT = 2; this.score += 20 * this.combo; this.fxPop(this.pcx, CARY - 12, "POLISH x" + this.combo, "#7be0ff"); this.tone(880, 0.05, "square", 0.05); } }
      if (c.z > 1.15) this.cars.splice(i, 1);
    }
    // wax strip
    this.waxT -= dt; if (this.waxT <= 0 && !this.wax) { this.wax = { z: 0.02, lane: (this.rnd() - 0.5) * 0.8 }; this.waxT = 4 + this.rnd() * 4; }
    if (this.wax) { this.wax.z += this.spd * 0.00006 + 0.004; if (this.wax.z > 0.92) { const p = Math.min(1, this.wax.z); const wx = this.roadCenter(p) + this.wax.lane * this.roadHalf(p); if (Math.abs(wx - this.pcx) < 20) { this.boost = 1.6; this.fxRing(this.pcx, CARY, "#7be0ff", 24); this.fxPop(this.pcx, CARY - 14, "WAX BOOST!", "#7be0ff"); this.tone(660, 0.08, "square", 0.05); } this.wax = null; } }

    this.report();
  }
  private crash() { this.spin = 0.8; this.spd = 60; this.flash = 1; this.addShake(5); this.hitstop(0.06); this.buzz(90); this.noise(0.2, 0.05); this.tone(160, 0.2, "square", 0.05); this.combo = 0; this.fxShards(this.pcx, CARY, "#c8d0e0", 8); }

  // ---- draw ----
  protected render() {
    const lg = this.leg();
    this.vgrad(0, 0, LW, HY, this.flash > 0.5 ? "#5a2020" : lg.sky[0], lg.sky[1]);
    // road (perspective scanlines)
    for (let y = HY; y < LH; y++) {
      const p = (y - HY) / (LH - HY); const cx = this.roadCenter(p), rh = this.roadHalf(p);
      const phase = Math.floor((this.dist * 0.06 + p * 24) % 2);
      const grass = phase ? shade(lg.grass, 0.06) : lg.grass;
      this.rect(0, y, LW, 1, grass);
      const road = phase ? shade(lg.road, 0.05) : lg.road;
      this.rect((cx - rh) | 0, y, (rh * 2) | 0, 1, road);
      // rumble strips
      const rc = phase ? "#e6e6ea" : "#c0343a";
      this.rect((cx - rh) | 0, y, Math.max(1, (rh * 0.1) | 0), 1, rc); this.rect((cx + rh - rh * 0.1) | 0, y, Math.max(1, (rh * 0.1) | 0), 1, rc);
      // centre dashes
      if (phase && p > 0.2) this.rect(cx | 0, y, Math.max(1, (rh * 0.04) | 0), 1, "#e6e6c0");
    }
    // wax strip
    if (this.wax && this.wax.z > 0.05) { const p = Math.min(1, this.wax.z); const wx = this.roadCenter(p) + this.wax.lane * this.roadHalf(p); const y = HY + p * (LH - HY); const w = 4 + p * 20; this.rect((wx - w / 2) | 0, y | 0, w, Math.max(1, (p * 4) | 0), "#7be0ff"); }
    // traffic (far to near)
    for (const c of [...this.cars].sort((a, b) => a.z - b.z)) { const p = Math.min(1, c.z); const y = HY + p * (LH - HY); const cx = this.roadCenter(p) + c.lane * this.roadHalf(p); const w = 4 + p * 22, h = 3 + p * 14; this.rect((cx - w / 2) | 0, (y - h) | 0, w | 0, h | 0, c.color); this.rect((cx - w / 2) | 0, (y - h) | 0, w | 0, Math.max(1, (h * 0.3) | 0), shade(c.color, 0.3)); this.rect((cx - w / 2) | 0, (y - 2) | 0, Math.max(1, (w * 0.2) | 0), 2, "#20242e"); this.rect((cx + w / 2 - w * 0.2) | 0, (y - 2) | 0, Math.max(1, (w * 0.2) | 0), 2, "#20242e"); }
    // player car
    { const wob = this.spin > 0 ? Math.sin(this.tSec() * 40) * 4 : 0; const x = this.pcx + wob, w = 26, h = 16; this.rect((x - w / 2) | 0, CARY - h, w, h, this.spin > 0 ? "#8a8a9a" : "#e2544f"); this.rect((x - w / 2) | 0, CARY - h, w, 5, "#ff8a7d"); this.rect((x - w / 2 + 2) | 0, CARY - h + 5, w - 4, 4, "#20242e"); this.disc((x - w / 2 + 5) | 0, CARY, 3, "#1a1a22"); this.disc((x + w / 2 - 5) | 0, CARY, 3, "#1a1a22"); if (this.boost > 0) this.fxBurst(x, CARY, "#7be0ff", 1, 30); }

    this.drawFx();

    // HUD
    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#e6e9ff", 1, false);
    this.text(88, 3, "TIME " + Math.ceil(this.time), this.time < 8 ? "#ff5d7d" : "#ffd24a", 1, false);
    this.text(150, 3, "SPD " + Math.floor(this.spd), "#7be0ff", 1, false);
    if (this.combo > 1) this.textCenter(20, "POLISH x" + this.combo, "#7be0ff", 1);

    if (this.state !== "play") this.overlay();
  }
  private tSec() { return performance.now() / 1000; }
  private overlay() {
    this.b.globalAlpha = 0.68; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(40, "GREASE MONKEY", "#ffd24a", 2);
      this.textCenter(66, "CRUISE THE HIGHWAY TEST DRIVE", "#c3b4de", 1);
      this.textCenter(86, "STEER THE CURVES - WEAVE TRAFFIC", "#83769c", 1);
      this.textCenter(98, "HIT WAX STRIPS - BEAT THE CLOCK", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 22, "PRESS LEFT OR RIGHT TO START", "#ffec27", 1);
    } else {
      this.textCenter(50, "TIME UP!", "#ff5d7d", 2);
      this.textCenter(76, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(90, "BEST " + this.best, "#ffd24a", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 22, "PRESS A DIRECTION TO RETRY", "#ffec27", 1);
    }
    void mix;
  }
}
