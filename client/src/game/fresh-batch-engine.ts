// fresh-batch-engine — Main Street cabinet #6 (Donkey Kong homage). Climb ladders
// and oven racks to the top shelf while the grumpy baker hurls rolling pie-tins that
// zig-zag down. Jump the tins, climb past them, and reach the loaf up top. Signature
// twist: grab a ROLLING-PIN to smash tins for points, and a risky top-shelf bonus.
// Worlds: Ovens → Cooling Racks → Rooftop Garden. RetroEngine (16-bit + juice) +
// MusicKit; two-thumb d-pad + jump.

import { RetroEngine, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const BEST_KEY = "batch_best";
const GIRDERS = [34, 66, 98, 130, 162];         // girder feet-Y, top → bottom
const TOP_Y = GIRDERS[0], BOTTOM_Y = GIRDERS[GIRDERS.length - 1];
interface Ladder { x: number; hi: number; lo: number; }
const LADDERS: Ladder[] = [
  { x: 50, hi: 130, lo: 162 }, { x: 190, hi: 130, lo: 162 },
  { x: 120, hi: 98, lo: 130 },
  { x: 50, hi: 66, lo: 98 }, { x: 190, hi: 66, lo: 98 },
  { x: 120, hi: 34, lo: 66 },
];
const WALL_L = 12, WALL_R = 228;

interface Tin { x: number; gy: number; vx: number; life: number; cd: number; }
interface World { name: string; sky: [string, string]; girder: string; throwT: number; tinSpd: number; }
const WORLDS: World[] = [
  { name: "OVENS", sky: ["#3a1f14", "#150a06"], girder: "#c97a44", throwT: 2.0, tinSpd: 42 },
  { name: "COOLING RACKS", sky: ["#1a2430", "#0a1018"], girder: "#7a8a9a", throwT: 1.6, tinSpd: 52 },
  { name: "ROOFTOP GARDEN", sky: ["#1a3a2a", "#0a1810"], girder: "#5a8a4a", throwT: 1.3, tinSpd: 62 },
];

const BATCH_THEME: Track = {
  bpm: 140,
  layers: [
    { role: "lead", wave: "square", gain: 0.38, pattern: [
      { n: "E5", d: 2 }, { n: "E5", d: 1 }, { n: "F5", d: 1 }, { n: "G5", d: 2 }, { n: "G5", d: 1 }, { n: "F5", d: 1 }, { n: "E5", d: 2 }, { n: "C5", d: 2 },
      { n: "D5", d: 2 }, { n: "D5", d: 1 }, { n: "E5", d: 1 }, { n: "F5", d: 2 }, { n: "E5", d: 2 }, { n: "D5", d: 2 }, { n: "C5", d: 2 },
    ] },
    { role: "harmony", wave: "square", gain: 0.16, minIntensity: 0.4, pattern: [{ n: 0, d: 2 }, { n: "C4", d: 2 }, { n: 0, d: 2 }, { n: "G3", d: 2 }] },
    { role: "bass", wave: "triangle", gain: 0.5, pattern: [{ n: "C3", d: 2 }, { n: "G2", d: 2 }, { n: "C3", d: 2 }, { n: "G2", d: 2 }, { n: "F2", d: 2 }, { n: "C3", d: 2 }, { n: "G2", d: 2 }, { n: "G2", d: 2 }] },
    { role: "drums", minIntensity: 0.2, pattern: [{ n: "K", d: 2 }, { n: "H", d: 1 }, { n: "H", d: 1 }, { n: "S", d: 2 }, { n: "H", d: 2 }] },
  ],
};

export class FreshBatchEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private world = 0;
  private plx = 120; private ply = BOTTOM_Y; private gy = BOTTOM_Y;
  private vx = 0; private vy = 0; private onGround = true; private climbing: Ladder | null = null; private faceR = true;
  private hammer = 0;
  private tins: Tin[] = [];
  private pin: { x: number; gy: number } | null = null;
  private throwT = 0; private pinT = 0;

  private score = 0; private lives = 3; private stage = 1;
  private best = +(LS.get(BEST_KEY) || 0);
  private flash = 0; private intro = 0; private card = ""; private pause = 0; private bakerT = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.42 });
    this.start();
  }
  protected onGesture() { this.music?.play(BATCH_THEME); }
  private w() { return WORLDS[this.world]; }

  private resetStage(fresh: boolean) {
    this.world = Math.floor((this.stage - 1) / 3) % WORLDS.length;
    this.plx = 120; this.ply = BOTTOM_Y; this.gy = BOTTOM_Y; this.vx = 0; this.vy = 0; this.onGround = true; this.climbing = null; this.hammer = 0;
    this.tins = []; this.pin = null; this.throwT = 1.5; this.pinT = 6;
    if (fresh) { this.intro = 1.5; this.card = ((this.stage - 1) % 3 === 0 ? "WORLD " + (this.world + 1) + "  " + this.w().name : "LOAF " + this.stage); }
  }
  private beginGame() { this.score = 0; this.lives = 3; this.stage = 1; this.clearFx(); this.resetStage(true); this.state = "play"; this.music?.setIntensity(0.5); this.report(); }
  private gameOver() {
    this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); }
    this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(5); this.hooks.onRunEnd?.({ score: this.score, shift: this.stage }); this.report();
  }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: this.lives, shift: this.stage, combo: 0 }); }

  private ladderUp(x: number, gy: number) { return LADDERS.find((l) => l.lo === gy && Math.abs(x - l.x) < 6) || null; }
  private ladderDown(x: number, gy: number) { return LADDERS.find((l) => l.hi === gy && Math.abs(x - l.x) < 6) || null; }

  private loseLife() {
    this.lives--; this.flash = 1; this.addShake(4); this.hitstop(0.06); this.buzz(80); this.fxShards(this.plx, this.ply - 5, "#ffce9a", 8); this.noise(0.14, 0.06); this.tone(150, 0.16, "square", 0.05); this.pause = 0.7;
    if (this.lives <= 0) this.gameOver(); else { this.resetStage(false); this.report(); }
  }
  private stageClear() {
    const bonus = 100 * this.stage; this.score += bonus;
    this.fxRing(120, 60, "#ffd24a", 70); this.fxPop(120, 52, "TOP SHELF +" + bonus, "#ffd24a"); this.music?.playJingle(CLEAR_JINGLE, 165); this.addShake(2);
    this.stage++; this.resetStage(true); this.report();
  }
  private spawnTin() { this.tins.push({ x: 130, gy: TOP_Y, vx: this.w().tinSpd, life: 9, cd: 0 }); this.tone(300, 0.06, "square", 0.04); }

  protected update(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 3); this.hammer = Math.max(0, this.hammer - dt); this.bakerT += dt;
    if (this.state !== "play") { if (this.pressed.a || this.pressed.up || this.pressed.down || this.pressed.left || this.pressed.right || this.pointer.down) this.beginGame(); return; }
    if (this.intro > 0) { this.intro -= dt; return; }
    if (this.pause > 0) { this.pause -= dt; return; }

    if (this.climbing) {
      const l = this.climbing;
      if (this.btn.up) this.ply -= 48 * dt; if (this.btn.down) this.ply += 48 * dt;
      this.plx = l.x;
      if (this.ply <= l.hi) { this.ply = l.hi; this.gy = l.hi; this.climbing = null; this.onGround = true; if (l.hi === TOP_Y) { this.stageClear(); return; } }
      else if (this.ply >= l.lo) { this.ply = l.lo; this.gy = l.lo; this.climbing = null; this.onGround = true; }
    } else {
      let mv = 0; if (this.btn.left) { mv = -1; this.faceR = false; } else if (this.btn.right) { mv = 1; this.faceR = true; }
      if (this.onGround) this.vx = mv * 58; this.plx += this.vx * dt;
      this.plx = Math.max(WALL_L + 3, Math.min(WALL_R - 3, this.plx));
      if (this.onGround && this.btn.up) { const l = this.ladderUp(this.plx, this.gy); if (l) { this.climbing = l; this.vy = 0; } }
      if (this.onGround && this.btn.down) { const l = this.ladderDown(this.plx, this.gy); if (l) { this.climbing = l; this.vy = 0; } }
      if (this.onGround && this.pressed.a) { this.vy = -155; this.onGround = false; this.tone(600, 0.05, "square", 0.04); }
      if (!this.onGround) {
        const prev = this.ply; this.vy += 540 * dt; this.ply += this.vy * dt;
        if (this.vy > 0) { let landed = -1; for (const g of GIRDERS) if (prev <= g + 0.5 && this.ply >= g) { if (landed < 0 || g < landed) landed = g; } if (landed >= 0) { this.ply = landed; this.gy = landed; this.vy = 0; this.onGround = true; } }
      } else this.ply = this.gy;
    }

    this.throwT -= dt; if (this.throwT <= 0) { this.spawnTin(); this.throwT = this.w().throwT * (0.7 + this.rnd() * 0.6); }

    for (let i = this.tins.length - 1; i >= 0; i--) {
      const t = this.tins[i]; t.life -= dt; t.cd = Math.max(0, t.cd - dt); t.x += t.vx * dt;
      if (t.x < WALL_L + 3) { t.x = WALL_L + 3; t.vx = Math.abs(t.vx); } if (t.x > WALL_R - 3) { t.x = WALL_R - 3; t.vx = -Math.abs(t.vx); }
      if (t.cd <= 0) { const l = this.ladderDown(t.x, t.gy); if (l && this.rnd() < 0.5) { t.gy = l.lo; t.x = l.x; t.vx = (this.rnd() < 0.5 ? -1 : 1) * this.w().tinSpd; t.cd = 0.6; } }
      if (Math.abs(t.x - this.plx) < 7 && Math.abs(t.gy - this.ply) < 6 && !this.climbing) {
        if (this.hammer > 0) { this.tins.splice(i, 1); this.score += 25; this.fxBurst(t.x, t.gy - 3, "#cfc7ba", 8, 80); this.fxPop(t.x, t.gy - 8, "+25", "#ffd24a"); this.addShake(1.5); this.hitstop(0.03); this.tone(760, 0.06, "square", 0.05); continue; }
        this.loseLife(); return;
      }
      if (t.life <= 0) this.tins.splice(i, 1);
    }

    this.pinT -= dt; if (this.pinT <= 0 && !this.pin) { const gy = GIRDERS[1 + Math.floor(this.rnd() * (GIRDERS.length - 1))]; this.pin = { x: 30 + this.rnd() * 180, gy }; this.pinT = 12 + this.rnd() * 6; }
    if (this.pin && Math.abs(this.pin.x - this.plx) < 8 && Math.abs(this.pin.gy - this.ply) < 6 && !this.climbing) { this.hammer = 6; this.pin = null; this.fxRing(this.plx, this.ply - 4, "#ffd24a", 22); this.fxPop(this.plx, this.ply - 10, "ROLLING PIN!", "#ffd24a"); this.tone(880, 0.1, "square", 0.05); }
  }

  // ---- draw ----
  protected render() {
    const w = this.w();
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#4a1520" : w.sky[0], w.sky[1]);
    for (const g of GIRDERS) { this.shelf(WALL_L, g + 1, WALL_R - WALL_L, 4, w.girder); for (let x = WALL_L; x < WALL_R; x += 6) this.rect(x, g + 3, 1, 1, "#00000040"); }
    for (const l of LADDERS) { for (let y = l.hi; y < l.lo; y += 4) { this.rect(l.x - 3, y, 1, 3, "#e0a51f"); this.rect(l.x + 2, y, 1, 3, "#e0a51f"); this.rect(l.x - 3, y + 1, 6, 1, "#c98a1a"); } }
    // baker
    this.rect(115, TOP_Y - 12, 10, 12, "#c94f6c"); this.disc(120, TOP_Y - 14, 4, "#f0c9a0"); this.rect(115, TOP_Y - 18, 10, 3, "#f4f0e8"); if (Math.floor(this.bakerT * 3) % 2 === 0) this.rect(126, TOP_Y - 12, 5, 3, "#e2c08a");
    this.ball(200, TOP_Y - 4, 4, "#e0a860"); this.rect(198, TOP_Y - 6, 1, 1, "#fff1e8");

    if (this.pin) { this.rect(this.pin.x - 5, this.pin.gy - 5, 10, 3, "#e0a860"); this.rect(this.pin.x - 6, this.pin.gy - 4, 1, 1, "#8a5a2c"); this.rect(this.pin.x + 5, this.pin.gy - 4, 1, 1, "#8a5a2c"); }
    for (const t of this.tins) { this.ball(t.x | 0, (t.gy - 3) | 0, 4, "#cfc7ba"); this.ring(t.x | 0, (t.gy - 3) | 0, 4, "#8a8276", 1.4); }

    const cx = this.plx | 0, cy = this.ply | 0;
    const body = this.hammer > 0 ? "#33e650" : "#3bb6ff";
    this.rect(cx - 3, cy - 9, 6, 7, body); this.rect(cx - 3, cy - 9, 6, 1, "#bfe6ff"); this.disc(cx, cy - 11, 3, "#f0c9a0");
    this.rect(cx - 3, cy - 2, 2, 2, "#2a2a3a"); this.rect(cx + 1, cy - 2, 2, 2, "#2a2a3a");
    if (this.hammer > 0) this.rect(this.faceR ? cx + 3 : cx - 6, cy - 10, 4, 2, "#e0a860");

    this.drawFx();

    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#ffe6c2", 1, false);
    this.text(112, 3, "W" + (this.world + 1) + " L" + this.stage, "#ffb020", 1, false);
    if (this.hammer > 0) this.text(78, 3, "PIN!", "#33e650", 1, false);
    for (let i = 0; i < 3; i++) this.disc(LW - 9 - i * 9, 6, 3, i < this.lives ? "#ff5d7d" : "#3a2a2a");

    if (this.state === "play" && this.intro > 0) { this.b.globalAlpha = 0.55; this.rect(0, 78, LW, 34, "#0a0714"); this.b.globalAlpha = 1; this.textCenter(88, this.card, "#ffd24a", 2); }
    if (this.state !== "play") this.overlay();
  }
  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(38, "FRESH BATCH", "#ff5d7d", 2);
      this.textCenter(62, "CLIMB TO THE TOP SHELF", "#c3b4de", 1);
      this.textCenter(86, "ARROWS MOVE / CLIMB", "#83769c", 1);
      this.textCenter(98, "JUMP OVER THE PIE-TINS", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS JUMP TO START", "#ffec27", 1);
    } else {
      this.textCenter(46, "BURNT!", "#ff5d7d", 2);
      this.textCenter(72, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(86, "BEST " + this.best, "#ffd24a", 1);
      this.textCenter(102, "REACHED W" + (this.world + 1) + " L" + this.stage, "#c3b4de", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS JUMP TO RETRY", "#ffec27", 1);
    }
  }
}
