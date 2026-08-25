// pedal-pusher-engine — Main Street cabinet (Excitebike homage). A bike shop's test
// track: the bike auto-runs right down an obstacle course. HOP the cones and jump the
// gaps, hit ramps for big air, and hold BOOST for speed — but the engine heats up, so
// let off before it redlines or you'll bog down in a cool-down. Signature twist:
// tapping BOOST inside a green SHIFT window gives a clean gear surge with no heat.
// Tracks: Trail -> Street -> Circuit (faster, tighter). One life per run; go for
// distance. RetroEngine + juice + MusicKit; two-button hop + boost.

import { RetroEngine, shade, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const BEST_KEY = "pedal_best";
const GY = 132;                 // ground top
const BIKE_X = 60;

interface Obs { x: number; type: "cone" | "ramp" | "gap"; w: number }

const PEDAL_THEME: Track = {
  bpm: 150,
  layers: [
    { role: "lead", wave: "square", gain: 0.34, pattern: [
      { n: "E5", d: 1 }, { n: "E5", d: 1 }, { n: "B4", d: 1 }, { n: "E5", d: 1 }, { n: "G5", d: 2 }, { n: "F5", d: 1 }, { n: "E5", d: 1 }, { n: "D5", d: 2 }, { n: "B4", d: 2 },
      { n: "C5", d: 1 }, { n: "E5", d: 1 }, { n: "G5", d: 2 }, { n: "A5", d: 2 }, { n: "G5", d: 2 }, { n: "E5", d: 2 },
    ] },
    { role: "bass", wave: "triangle", gain: 0.5, pattern: [{ n: "E2", d: 1 }, { n: "E2", d: 1 }, { n: "E3", d: 1 }, { n: "E2", d: 1 }, { n: "B2", d: 1 }, { n: "B2", d: 1 }, { n: "B3", d: 1 }, { n: "B2", d: 1 }] },
    { role: "drums", minIntensity: 0.2, pattern: [{ n: "K", d: 1 }, { n: "H", d: 1 }, { n: "S", d: 1 }, { n: "H", d: 1 }] },
  ],
};

export class PedalPusherEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private by = GY; private bvy = 0; private onGround = true; private tilt = 0;
  private obs: Obs[] = []; private spawnX = 0; private scroll = 0;
  private spd = 120; private heat = 0; private overheat = 0; private shift = 0; private shiftGood = false;
  private dist = 0; private score = 0; private best = +(LS.get(BEST_KEY) || 0);
  private wheelie = 0; private flash = 0; private track = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.4 });
    this.seed();
    this.start();
  }
  protected onGesture() { this.music?.play(PEDAL_THEME); }

  private seed() { this.obs = []; this.spawnX = LW + 40; for (let i = 0; i < 4; i++) this.addObs(); }
  private addObs() { const roll = this.rnd(); const type = roll < 0.5 ? "cone" : roll < 0.8 ? "ramp" : "gap"; const w = type === "gap" ? 24 + this.rnd() * 20 : type === "ramp" ? 20 : 12; this.obs.push({ x: this.spawnX, type, w }); this.spawnX += w + 60 + this.rnd() * 70; }
  private beginGame() { this.by = GY; this.bvy = 0; this.onGround = true; this.spd = 120; this.heat = 0; this.overheat = 0; this.shift = 0; this.dist = 0; this.score = 0; this.track = 0; this.scroll = 0; this.spawnX = LW + 40; this.seed(); this.clearFx(); this.state = "play"; this.music?.setIntensity(0.6); this.report(); }
  private gameOver() { this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); } this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(5); this.hooks.onRunEnd?.({ score: this.score, shift: this.track + 1 }); this.report(); }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, shift: this.track + 1, lives: 0, combo: 0 }); }
  private crash() { this.flash = 1; this.addShake(6); this.hitstop(0.08); this.buzz(120); this.fxShards(BIKE_X, this.by - 6, "#ff5d7d", 12); this.noise(0.24, 0.06); this.tone(140, 0.3, "square", 0.05); this.gameOver(); }

  // ground gap check at screen x
  private overGap(x: number): Obs | null { for (const o of this.obs) if (o.type === "gap" && x > o.x && x < o.x + o.w) return o; return null; }

  protected update(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 3); this.wheelie = Math.max(0, this.wheelie - dt * 2);
    if (this.state !== "play") { if (this.pressed.a || this.pressed.b || this.pointer.down) this.beginGame(); return; }

    // shift window oscillates
    this.shift += dt * 1.4; if (this.shift > 1) this.shift -= 1; this.shiftGood = this.shift > 0.6 && this.shift < 0.82;
    // boost / heat
    if (this.overheat > 0) { this.overheat -= dt; this.spd = 100; }
    else if (this.btn.b) {
      if (this.pressed.b && this.shiftGood) { this.spd = Math.min(240, this.spd + 40); this.fxPop(BIKE_X + 20, this.by - 20, "SHIFT!", "#33e650"); this.tone(700, 0.06, "square", 0.05); }
      else { this.spd = Math.min(240, this.spd + 60 * dt); this.heat = Math.min(1, this.heat + 0.5 * dt); if (this.heat >= 1) { this.overheat = 1.6; this.fxPop(BIKE_X + 20, this.by - 20, "OVERHEAT!", "#ff5d7d"); this.noise(0.2, 0.05); } }
    } else { this.spd = Math.max(120, this.spd - 50 * dt); this.heat = Math.max(0, this.heat - 0.4 * dt); }

    // scroll world
    const mv = this.spd * dt; this.scroll += mv; this.dist += mv; this.score = Math.floor(this.dist / 4);
    for (const o of this.obs) o.x -= mv;
    while (this.obs.length && this.obs[0].x + this.obs[0].w < -20) this.obs.shift();
    this.spawnX -= mv; if (this.obs.length < 5) this.addObs();
    this.track = Math.min(2, Math.floor(this.dist / 2400));

    // bike physics
    if (this.pressed.a && this.onGround) { this.bvy = -230; this.onGround = false; this.wheelie = 1; this.tone(520, 0.05, "square", 0.05); this.buzz(6); }
    if (!this.onGround) { this.bvy += 620 * dt; this.by += this.bvy * dt; }
    // ramp launch
    for (const o of this.obs) if (o.type === "ramp" && this.onGround && Math.abs((o.x + o.w / 2) - BIKE_X) < 8) { this.bvy = -180 - this.spd * 0.5; this.onGround = false; this.wheelie = 1; this.fxBurst(BIKE_X, GY, "#ffd24a", 6, 60); this.tone(660, 0.08, "square", 0.05); }
    // land / gap
    if (this.by >= GY) {
      if (this.overGap(BIKE_X)) { this.by += this.bvy * dt; if (this.by > GY + 20) this.crash(); }
      else { this.by = GY; this.bvy = 0; if (!this.onGround) { this.onGround = true; this.addShake(0.6); this.fxBurst(BIKE_X, GY, "#c8d0e0", 4, 40); } }
    }
    // hit a cone on the ground
    for (const o of this.obs) if (o.type === "cone" && this.by > GY - 10 && BIKE_X > o.x - 4 && BIKE_X < o.x + o.w + 2) { this.crash(); return; }

    this.tilt = this.onGround ? this.wheelie * 0.3 : Math.max(-0.5, Math.min(0.5, this.bvy / 400));
    this.report();
  }

  // ---- draw ----
  protected render() {
    const skies: [string, string][] = [["#2a3a5a", "#6a8ab0"], ["#3a2a5a", "#8a6ab0"], ["#5a2a3a", "#b06a7a"]];
    const sky = skies[this.track];
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#5a2020" : sky[0], sky[1]);
    // parallax hills
    const hx = -((this.scroll * 0.3) % 80); for (let x = hx; x < LW; x += 80) { this.disc(x + 40, GY + 6, 40, shade(sky[0], -0.1)); }
    // ground
    this.rect(0, GY, LW, LH - GY, "#3a2f22");
    for (const o of this.obs) { if (o.type === "gap") this.rect(o.x | 0, GY, o.w, LH - GY, "#0a0714"); }
    this.rect(0, GY, LW, 3, "#5a8a3a");
    for (let x = -(this.scroll % 16); x < LW; x += 16) { if (!this.overGap(x + 8)) this.rect(x, GY + 6, 8, 2, "#4a3f2a"); }
    // obstacles
    for (const o of this.obs) {
      if (o.type === "cone") { this.rect((o.x | 0) + 2, GY - 10, o.w - 4, 10, "#ff8a3d"); this.rect((o.x | 0) + 4, GY - 7, o.w - 8, 2, "#fff1e8"); }
      else if (o.type === "ramp") { for (let i = 0; i < o.w; i++) this.rect((o.x | 0) + i, GY - Math.round((i / o.w) * 16), 1, Math.round((i / o.w) * 16) + 2, "#8a5a2c"); }
    }
    // bike + rider (avatar-ish)
    const bx = BIKE_X, byy = this.by;
    const t = this.tilt;
    this.disc(bx - 6, byy - 3 + t * 4 | 0, 4, "#20242e"); this.disc(bx + 8, byy - 3 - t * 4 | 0, 4, "#20242e");
    this.ring(bx - 6, byy - 3 + t * 4 | 0, 4, "#5a5a6a", 1.2); this.ring(bx + 8, byy - 3 - t * 4 | 0, 4, "#5a5a6a", 1.2);
    this.rect(bx - 6, byy - 8, 14, 4, "#ff5d7d"); this.rect(bx - 2, byy - 14, 6, 7, "#3bb6ff"); this.disc(bx + 1, byy - 16, 3, "#f0c9a0"); this.rect(bx - 2, byy - 19, 6, 3, "#ffd24a");

    this.drawFx();

    // HUD
    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#e6e9ff", 1, false);
    this.text(150, 3, "TRACK " + (this.track + 1), "#ffd24a", 1, false);
    // heat gauge
    this.text(3, LH - 10, "HEAT", "#83769c", 1, false); this.rect(30, LH - 9, 40, 4, "#2a2438"); this.rect(30, LH - 9, Math.round(40 * this.heat), 4, this.overheat > 0 ? "#ff5d7d" : this.heat > 0.7 ? "#ffb020" : "#33e650");
    // shift window
    this.rect(LW - 54, LH - 9, 40, 4, "#2a2438"); this.rect(LW - 54 + Math.round(40 * 0.6), LH - 9, Math.round(40 * 0.22), 4, "#1a4a2a"); this.rect(LW - 54 + Math.round(40 * this.shift) - 1, LH - 11, 2, 8, this.shiftGood ? "#33e650" : "#c3b4de"); this.text(LW - 54, LH - 18, "SHIFT", "#83769c", 1, false);

    if (this.state !== "play") this.overlay();
  }
  private overlay() {
    this.b.globalAlpha = 0.7; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(40, "PEDAL PUSHER", "#ff5d7d", 2);
      this.textCenter(66, "RACE THE TEST TRACK", "#c3b4de", 1);
      this.textCenter(86, "HOP THE CONES - JUMP THE GAPS", "#83769c", 1);
      this.textCenter(98, "BOOST IN THE GREEN SHIFT WINDOW", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 26, "PRESS HOP TO START", "#ffec27", 1);
    } else {
      this.textCenter(50, "WIPEOUT!", "#ff5d7d", 2);
      this.textCenter(76, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(90, "BEST " + this.best, "#ffd24a", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 26, "PRESS HOP TO RETRY", "#ffec27", 1);
    }
  }
}
