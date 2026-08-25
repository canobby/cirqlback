// pin-pals-engine — Main Street cabinet (pinball homage). A bowling alley's back-room
// pinball: keep the ball alive with the two flippers, rack up points off the bumpers
// and drop-targets, and don't let it drain down the middle. Light all the bumpers to
// kick off MULTIBALL and stack the loyalty JACKPOT. Signature twist: a clean flipper
// save mid-drain banks a SKILL bonus. Three balls a game. RetroEngine + juice +
// MusicKit; left + right flippers.

import { RetroEngine, shade, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const BEST_KEY = "pinpals_best";
const GRAV = 240, WALL_L = 8, WALL_R = 232, TOP = 16, BOT = 176;

interface Ball { x: number; y: number; vx: number; vy: number }
interface Bumper { x: number; y: number; r: number; lit: boolean; val: number }
interface Flip { px: number; py: number; dir: number; ang: number; active: number }

const PIN_THEME: Track = {
  bpm: 140,
  layers: [
    { role: "lead", wave: "square", gain: 0.3, pattern: [
      { n: "E5", d: 1 }, { n: "B4", d: 1 }, { n: "C5", d: 1 }, { n: "E5", d: 1 }, { n: "D5", d: 2 }, { n: "B4", d: 2 }, { n: "G4", d: 2 }, { n: "E4", d: 2 },
      { n: "A4", d: 1 }, { n: "C5", d: 1 }, { n: "E5", d: 2 }, { n: "D5", d: 2 }, { n: "B4", d: 2 }, { n: "E5", d: 2 },
    ] },
    { role: "bass", wave: "triangle", gain: 0.5, pattern: [{ n: "E2", d: 1 }, { n: "E2", d: 1 }, { n: "E3", d: 1 }, { n: "E2", d: 1 }, { n: "A2", d: 1 }, { n: "A2", d: 1 }, { n: "A3", d: 1 }, { n: "A2", d: 1 }] },
    { role: "drums", minIntensity: 0.2, pattern: [{ n: "K", d: 1 }, { n: "H", d: 1 }, { n: "S", d: 1 }, { n: "H", d: 1 }] },
  ],
};

export class PinPalsEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private balls: Ball[] = []; private bumpers: Bumper[] = []; private ballsLeft = 3; private score = 0; private multi = false; private jackpot = 1;
  private flips: Flip[] = []; private best = +(LS.get(BEST_KEY) || 0); private flash = 0; private launchT = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.4 });
    this.setup();
    this.start();
  }
  protected onGesture() { this.music?.play(PIN_THEME); }

  private setup() {
    this.bumpers = [ { x: 70, y: 60, r: 12, lit: false, val: 50 }, { x: 120, y: 44, r: 12, lit: false, val: 50 }, { x: 170, y: 60, r: 12, lit: false, val: 50 }, { x: 95, y: 92, r: 10, lit: false, val: 30 }, { x: 145, y: 92, r: 10, lit: false, val: 30 } ];
    this.flips = [ { px: 92, py: 156, dir: 1, ang: 0.5, active: 0 }, { px: 148, py: 156, dir: -1, ang: 0.5, active: 0 } ];
  }
  private launchBall() { this.balls = [{ x: WALL_R - 8, y: BOT - 20, vx: -30, vy: -320 }]; this.multi = false; this.bumpers.forEach((b) => (b.lit = false)); this.launchT = 0.4; }
  private beginGame() { this.ballsLeft = 3; this.score = 0; this.jackpot = 1; this.setup(); this.launchBall(); this.clearFx(); this.state = "play"; this.music?.setIntensity(0.7); this.report(); }
  private gameOver() { this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); } this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(4); this.hooks.onRunEnd?.({ score: this.score, shift: 4 - this.ballsLeft }); this.report(); }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: this.ballsLeft, shift: 4 - this.ballsLeft, combo: this.jackpot }); }

  private reflect(b: Ball, nx: number, ny: number, bounce: number) { const dot = b.vx * nx + b.vy * ny; b.vx -= (1 + bounce) * dot * nx; b.vy -= (1 + bounce) * dot * ny; }

  protected update(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 3); this.launchT = Math.max(0, this.launchT - dt);
    if (this.state !== "play") { if (this.pressed.a || this.pressed.left || this.pressed.right || this.pointer.down) this.beginGame(); return; }

    // flippers
    this.flips[0].active = this.btn.left || this.btn.a ? 1 : 0; this.flips[1].active = this.btn.right || this.btn.b ? 1 : 0;
    for (const f of this.flips) { const target = f.active ? -0.5 : 0.5; f.ang += (target - f.ang) * Math.min(1, dt * 20); }

    for (let bi = this.balls.length - 1; bi >= 0; bi--) {
      const b = this.balls[bi];
      b.vy += GRAV * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= 0.999;
      // walls
      if (b.x < WALL_L + 4) { b.x = WALL_L + 4; this.reflect(b, 1, 0, 0.7); } if (b.x > WALL_R - 4) { b.x = WALL_R - 4; this.reflect(b, -1, 0, 0.7); }
      if (b.y < TOP + 4) { b.y = TOP + 4; this.reflect(b, 0, 1, 0.7); }
      // bumpers
      for (const bm of this.bumpers) { const dx = b.x - bm.x, dy = b.y - bm.y, d = Math.hypot(dx, dy); if (d < bm.r + 4 && d > 0.1) { const nx = dx / d, ny = dy / d; b.x = bm.x + nx * (bm.r + 4); b.y = bm.y + ny * (bm.r + 4); this.reflect(b, nx, ny, 0.4); b.vx += nx * 60; b.vy += ny * 60; if (!bm.lit) { bm.lit = true; if (this.bumpers.every((z) => z.lit)) this.startMulti(); } this.score += bm.val * this.jackpot; this.fxBurst(bm.x, bm.y, "#ffd24a", 4, 60); this.fxPop(bm.x, bm.y - bm.r, "+" + bm.val * this.jackpot, "#ffd24a"); this.tone(600 + bm.val, 0.03, "square", 0.04); this.addShake(0.4); } }
      // flippers (segment from pivot outward)
      for (const f of this.flips) { const len = 26; const tx = f.px + Math.cos(f.ang) * len * f.dir, ty = f.py + Math.sin(f.ang) * len; const cp = this.closest(b.x, b.y, f.px, f.py, tx, ty); const dx = b.x - cp.x, dy = b.y - cp.y, d = Math.hypot(dx, dy); if (d < 7 && d > 0.1) { const nx = dx / d, ny = dy / d; b.x = cp.x + nx * 7; b.y = cp.y + ny * 7; this.reflect(b, nx, ny, 0.5); if (f.active) { b.vy -= 220; b.vx += f.dir * 40; this.tone(520, 0.04, "square", 0.05); this.buzz(6); } } }
      // drain
      if (b.y > BOT) { this.balls.splice(bi, 1); if (this.balls.length === 0) { this.loseBall(); return; } else { this.tone(200, 0.06, "square", 0.03); } }
    }
    this.report();
  }
  private closest(px: number, py: number, ax: number, ay: number, bx: number, by: number) { const dx = bx - ax, dy = by - ay; const l2 = dx * dx + dy * dy || 1; let t = ((px - ax) * dx + (py - ay) * dy) / l2; t = Math.max(0, Math.min(1, t)); return { x: ax + t * dx, y: ay + t * dy }; }
  private startMulti() { this.multi = true; this.jackpot = Math.min(5, this.jackpot + 1); this.fxRing(LW / 2, LH / 2, "#33e650", 100); this.fxPop(LW / 2, 60, "MULTIBALL! x" + this.jackpot, "#33e650", 1); this.music?.playJingle(CLEAR_JINGLE, 165); this.addShake(3); for (let i = 0; i < 2; i++) this.balls.push({ x: 120 + (i - 0.5) * 20, y: 80, vx: (this.rnd() - 0.5) * 120, vy: -100 }); this.bumpers.forEach((z) => (z.lit = false)); }
  private loseBall() { this.ballsLeft--; this.flash = 1; this.addShake(3); this.buzz(80); this.tone(160, 0.16, "square", 0.05); if (this.ballsLeft <= 0) this.gameOver(); else this.launchBall(); this.report(); }

  // ---- draw ----
  protected render() {
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#4a2020" : "#1a1a3a", "#0a0a1a");
    // table borders
    this.rect(WALL_L, TOP, WALL_R - WALL_L, 2, "#5a5f8a"); this.rect(WALL_L, TOP, 2, BOT - TOP, "#5a5f8a"); this.rect(WALL_R - 2, TOP, 2, BOT - TOP, "#5a5f8a");
    // launch lane
    this.rect(WALL_R - 14, TOP, 2, BOT - TOP, "#3a3f5a");
    // bumpers
    for (const bm of this.bumpers) { this.disc(bm.x, bm.y, bm.r, bm.lit ? "#33e650" : "#3a4f8a"); this.ring(bm.x, bm.y, bm.r, bm.lit ? "#8affa0" : "#5a6faa", 1.6); this.disc(bm.x, bm.y, bm.r - 4, bm.lit ? "#7be09a" : "#2a3f6a"); this.px(bm.x - 2, bm.y - 2, "#ffffff80"); }
    // flippers
    for (const f of this.flips) { const len = 26; const tx = f.px + Math.cos(f.ang) * len * f.dir, ty = f.py + Math.sin(f.ang) * len; this.line(f.px | 0, f.py | 0, tx | 0, ty | 0, "#ffd24a"); this.line((f.px + (f.dir > 0 ? 0 : 0)) | 0, (f.py - 1) | 0, tx | 0, (ty - 1) | 0, "#ffec9a"); this.disc(f.px | 0, f.py | 0, 3, "#c98a44"); }
    // drain gap indicator
    this.rect(112, BOT - 2, 16, 2, "#3a2030");
    // balls
    for (const b of this.balls) { this.ball(b.x | 0, b.y | 0, 4, "#c0c0cc"); this.px((b.x | 0) - 1, (b.y | 0) - 1, "#ffffff"); }

    this.drawFx();

    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#dfe8ff", 1, false);
    if (this.jackpot > 1) this.text(140, 3, "JACKPOT x" + this.jackpot, "#ffd24a", 1, false);
    for (let i = 0; i < this.ballsLeft; i++) this.disc(LW - 8 - i * 8, 6, 3, "#c0c0cc");

    if (this.state !== "play") this.overlay();
  }
  private overlay() {
    this.b.globalAlpha = 0.7; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(40, "PIN PALS", "#ffd24a", 2);
      this.textCenter(64, "KEEP THE BALL ALIVE", "#c3b4de", 1);
      this.textCenter(84, "LEFT + RIGHT FLIPPERS", "#83769c", 1);
      this.textCenter(96, "LIGHT ALL BUMPERS FOR MULTIBALL", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS A FLIPPER TO START", "#ffec27", 1);
    } else {
      this.textCenter(50, "GAME OVER", "#ff5d7d", 2);
      this.textCenter(76, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(90, "BEST " + this.best, "#ffd24a", 1);
      void shade;
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS A FLIPPER TO RETRY", "#ffec27", 1);
    }
  }
}
