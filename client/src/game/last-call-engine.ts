// last-call-engine — Main Street cabinet (Skee-Ball homage). A taproom: roll a
// coaster up the bar toward the target rings. TAP once to lock your aim as the
// marker sweeps left-right, TAP again to set power as the meter rises — then it
// rolls. Land in the bullseye or a corner 100-cup for the big points. Nine rolls a
// frame. Signature twist: two 40+ rolls in a row lights the LOYALTY JACKPOT
// bullseye (worth double) and builds a RUSH multiplier. RetroEngine + juice +
// MusicKit; one-button roll.

import { RetroEngine, shade, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const BEST_KEY = "lastcall_best";
const TCX = LW / 2, TCY = 46;         // target centre
const LAUNCH_Y = 156;
const CORNERS: [number, number][] = [[TCX - 44, 34], [TCX + 44, 34]];

const LC_THEME: Track = {
  bpm: 118,
  layers: [
    { role: "lead", wave: "square", gain: 0.34, pattern: [
      { n: "G4", d: 2 }, { n: "B4", d: 2 }, { n: "D5", d: 2 }, { n: "G5", d: 2 }, { n: "D5", d: 2 }, { n: "B4", d: 2 }, { n: "G4", d: 4 },
      { n: "A4", d: 2 }, { n: "C5", d: 2 }, { n: "E5", d: 2 }, { n: "C5", d: 2 }, { n: "A4", d: 4 },
    ] },
    { role: "harmony", wave: "square", gain: 0.14, minIntensity: 0.4, pattern: [{ n: 0, d: 2 }, { n: "G3", d: 2 }, { n: 0, d: 2 }, { n: "D4", d: 2 }] },
    { role: "bass", wave: "triangle", gain: 0.5, pattern: [{ n: "G2", d: 2 }, { n: "G2", d: 2 }, { n: "D2", d: 2 }, { n: "D2", d: 2 }, { n: "E2", d: 2 }, { n: "E2", d: 2 }, { n: "C2", d: 2 }, { n: "C2", d: 2 }] },
    { role: "drums", minIntensity: 0.3, pattern: [{ n: "K", d: 4 }, { n: "S", d: 2 }, { n: "H", d: 2 }] },
  ],
};

export class LastCallEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private phase: "aim" | "power" | "roll" | "result" = "aim";
  private aimX = TCX; private aimDir = 1; private power = 0; private powerDir = 1;
  private lockX = TCX; private puck = { x: TCX, y: LAUNCH_Y, t: 0, landX: TCX, landY: TCY };
  private ballsLeft = 9; private score = 0; private lastPts = 0; private streak = 0; private combo = 1; private jackpot = false;
  private best = +(LS.get(BEST_KEY) || 0);
  private resultT = 0; private flash = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.4 });
    this.start();
  }
  protected onGesture() { this.music?.play(LC_THEME); }

  private beginGame() { this.ballsLeft = 9; this.score = 0; this.streak = 0; this.combo = 1; this.jackpot = false; this.phase = "aim"; this.aimX = TCX; this.power = 0; this.state = "play"; this.clearFx(); this.music?.setIntensity(0.5); this.report(); }
  private gameOver() { this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); } this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(4); this.hooks.onRunEnd?.({ score: this.score, shift: 9 - this.ballsLeft }); this.report(); }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: this.ballsLeft, shift: 9 - this.ballsLeft, combo: this.combo }); }

  private scoreAt(x: number, y: number): number {
    for (const [cx, cy] of CORNERS) if ((x - cx) ** 2 + (y - cy) ** 2 < 7 * 7) return 100;
    const d = Math.hypot(x - TCX, y - TCY);
    if (d < 7) return this.jackpot ? 100 : 50;
    if (d < 15) return 40; if (d < 24) return 30; if (d < 34) return 20; if (d < 44) return 10;
    return 0;
  }
  private launch() {
    this.phase = "roll"; const landY = LAUNCH_Y - this.power * (LAUNCH_Y - 22);
    this.puck = { x: this.lockX, y: LAUNCH_Y, t: 0, landX: this.lockX, landY };
    this.tone(300, 0.06, "square", 0.04); this.buzz(6);
  }
  private resolveRoll() {
    let pts = this.scoreAt(this.puck.landX, this.puck.landY);
    const wasJack = this.jackpot && pts === 100 && Math.hypot(this.puck.landX - TCX, this.puck.landY - TCY) < 7;
    pts = Math.round(pts * this.combo);
    this.lastPts = pts; this.score += pts; this.ballsLeft--;
    if (pts >= 40) { this.streak++; this.combo = Math.min(4, 1 + Math.floor(this.streak / 1)); if (this.streak >= 2) { this.jackpot = true; } }
    else { this.streak = 0; this.combo = 1; this.jackpot = false; }
    if (pts >= 40) { this.fxRing(this.puck.landX, this.puck.landY, "#ffd24a", 26); this.fxPop(this.puck.landX, this.puck.landY - 8, "+" + pts + (this.combo > 1 ? "  x" + this.combo : ""), "#ffd24a"); this.addShake(1.4); this.hitstop(0.04); this.tone(880, 0.07, "square", 0.05); this.tone(1318, 0.1, "square", 0.05); }
    else if (pts > 0) { this.fxBurst(this.puck.landX, this.puck.landY, "#e0a860", 8, 70); this.fxPop(this.puck.landX, this.puck.landY - 8, "+" + pts, "#e0a860"); this.tone(520, 0.06, "square", 0.04); }
    else { this.fxPop(this.puck.landX, this.puck.landY - 6, "GUTTER", "#83769c"); this.tone(180, 0.1, "square", 0.04); }
    if (wasJack) { this.fxRing(TCX, TCY, "#33e650", 60); this.fxPop(TCX, TCY - 14, "LOYALTY JACKPOT!", "#33e650", 1); this.music?.playJingle(CLEAR_JINGLE, 165); }
    this.phase = "result"; this.resultT = 0.9; this.report();
  }

  protected update(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 3);
    if (this.state !== "play") { if (this.pressed.a || this.pointer.down) this.beginGame(); return; }

    if (this.phase === "aim") { this.aimX += this.aimDir * 150 * dt; if (this.aimX > TCX + 60) { this.aimX = TCX + 60; this.aimDir = -1; } if (this.aimX < TCX - 60) { this.aimX = TCX - 60; this.aimDir = 1; } if (this.pressed.a) { this.lockX = this.aimX; this.phase = "power"; this.power = 0; this.powerDir = 1; this.tone(500, 0.04, "square", 0.04); } }
    else if (this.phase === "power") { this.power += this.powerDir * 1.5 * dt; if (this.power > 1) { this.power = 1; this.powerDir = -1; } if (this.power < 0) { this.power = 0; this.powerDir = 1; } if (this.pressed.a) this.launch(); }
    else if (this.phase === "roll") { this.puck.t += dt * 2.2; const t = Math.min(1, this.puck.t); this.puck.x = this.lockX; this.puck.y = LAUNCH_Y + (this.puck.landY - LAUNCH_Y) * t; if (t >= 1) this.resolveRoll(); }
    else if (this.phase === "result") { this.resultT -= dt; if (this.resultT <= 0) { if (this.ballsLeft <= 0) this.gameOver(); else { this.phase = "aim"; this.puck.y = LAUNCH_Y; } } }
  }

  // ---- draw ----
  protected render() {
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#3a2a10" : "#241810", "#120a06");
    // the lane
    this.rect(TCX - 60, 20, 120, LH - 20, "#3a2412"); this.rect(TCX - 62, 20, 4, LH - 20, "#5a3a1c"); this.rect(TCX + 58, 20, 4, LH - 20, "#5a3a1c");
    for (let y = 30; y < LH; y += 14) this.rect(TCX - 58, y, 116, 1, shade("#3a2412", 0.15));
    // target board (concentric rings)
    const rings: [number, string, number][] = [[44, "#3a5a8a", 10], [34, "#5a8a3a", 20], [24, "#c98a2a", 30], [15, "#c94f6c", 40], [7, this.jackpot ? "#33e650" : "#ffd24a", this.jackpot ? 100 : 50]];
    this.disc(TCX, TCY, 46, "#1a1420");
    for (const [r, c] of rings) { this.disc(TCX, TCY, r, c); }
    this.disc(TCX, TCY, 6, this.jackpot ? "#7be09a" : "#fff1c0");
    if (this.jackpot) this.ring(TCX, TCY, 8 + (Math.floor(performance.now() / 120) % 2), "#33e650", 1.4);
    // corner 100 cups
    for (const [cx, cy] of CORNERS) { this.disc(cx, cy, 7, "#1a1420"); this.disc(cx, cy, 5, "#ffd24a"); this.text(cx - 4, cy - 2, "100", "#0a0714", 1, false); }

    // aim marker / power meter
    if (this.state === "play") {
      if (this.phase === "aim") { this.rect(this.aimX - 1, 70, 2, LH - 76, "#7be0ff88"); this.disc(this.aimX | 0, LAUNCH_Y - 4, 4, "#7be0ff"); this.text(TCX - 30, LH - 12, "TAP TO AIM", "#7be0ff", 1, false); }
      else if (this.phase === "power") { this.rect(this.lockX - 1, 70, 2, LH - 76, "#ffd24a66"); const bx = TCX - 30, bw = 60; this.rect(bx, LH - 16, bw, 6, "#2a2438"); this.rect(bx, LH - 16, Math.round(bw * this.power), 6, this.power > 0.8 || this.power < 0.2 ? "#ff5d7d" : "#33e650"); this.text(TCX - 34, LH - 26, "TAP FOR POWER", "#ffd24a", 1, false); }
      // the ball
      if (this.phase === "roll" || this.phase === "power" || this.phase === "aim") { const bx = this.phase === "roll" ? this.puck.x : (this.phase === "power" ? this.lockX : this.aimX); this.drawPuck(bx | 0, this.phase === "roll" ? this.puck.y | 0 : LAUNCH_Y - 4); }
      if (this.phase === "result") { this.textCenter(LH - 26, this.lastPts > 0 ? "+" + this.lastPts : "GUTTER", this.lastPts >= 40 ? "#ffd24a" : "#c3b4de", 2); }
    }

    this.drawFx();

    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#ffe6c2", 1, false);
    this.text(120, 3, "BALLS " + this.ballsLeft, "#7be0ff", 1, false);
    if (this.combo > 1) this.text(186, 3, "x" + this.combo, "#ffd24a", 1, false);

    if (this.state !== "play") this.overlay();
  }
  private drawPuck(x: number, y: number) { this.ball(x, y, 4, "#c98a44"); this.px(x - 1, y - 1, "#ffe0b0"); }
  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(40, "LAST CALL", "#ffd24a", 2);
      this.textCenter(64, "ROLL FOR THE BULLSEYE", "#c3b4de", 1);
      this.textCenter(84, "TAP TO AIM - TAP AGAIN FOR POWER", "#83769c", 1);
      this.textCenter(96, "TWO BIG ROLLS LIGHTS THE JACKPOT", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS ROLL TO START", "#ffec27", 1);
    } else {
      this.textCenter(48, "LAST CALL!", "#ff5d7d", 2);
      this.textCenter(74, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(88, "BEST " + this.best, "#ffd24a", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS ROLL TO RETRY", "#ffec27", 1);
    }
  }
}
