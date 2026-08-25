// bark-park-engine — Main Street cabinet (Zoo Keeper homage). A pet groomer's yard:
// freshly-washed pups scatter and you have to herd them all into the pen before the
// bell. Pups flee when you get close — use your body to nudge them toward the gate,
// and drop a TREAT to lure a cluster your way. Signature twist: pen a bunch in one
// sweep for a HERD combo; a golden pup is worth double. Miss the bell three rounds and
// it's chaos. Yards: Wash Pen -> Play Yard -> Groom Room. RetroEngine + juice +
// MusicKit; 4-way move + treat.

import { RetroEngine, shade, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const BEST_KEY = "bark_best";
const YX = 8, YY = 20, YW = 168, YH = 150;   // yard rect (pen is to the right)
const PENX = YX + YW;                          // pen starts here

interface Pup { x: number; y: number; vx: number; vy: number; penned: boolean; gold: boolean; col: string }

const BARK_THEME: Track = {
  bpm: 142,
  layers: [
    { role: "lead", wave: "square", gain: 0.32, pattern: [
      { n: "G4", d: 1 }, { n: "A4", d: 1 }, { n: "B4", d: 1 }, { n: "D5", d: 1 }, { n: "B4", d: 2 }, { n: "G4", d: 2 }, { n: "E4", d: 2 }, { n: "G4", d: 2 },
      { n: "A4", d: 1 }, { n: "B4", d: 1 }, { n: "D5", d: 2 }, { n: "E5", d: 2 }, { n: "D5", d: 2 }, { n: "B4", d: 2 },
    ] },
    { role: "bass", wave: "triangle", gain: 0.5, pattern: [{ n: "G2", d: 1 }, { n: "G2", d: 1 }, { n: "D2", d: 1 }, { n: "D2", d: 1 }, { n: "E2", d: 1 }, { n: "E2", d: 1 }, { n: "C2", d: 1 }, { n: "C2", d: 1 }] },
    { role: "drums", minIntensity: 0.3, pattern: [{ n: "K", d: 2 }, { n: "H", d: 2 }, { n: "S", d: 2 }, { n: "H", d: 2 }] },
  ],
};

export class BarkParkEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private hx = LW / 2; private py = LH / 2; private pups: Pup[] = []; private treat: { x: number; y: number; t: number } | null = null; private treats = 3;
  private round = 1; private yard = 0; private timer = 20; private score = 0; private strikes = 0; private combo = 0; private pennedThisFrame = 0;
  private best = +(LS.get(BEST_KEY) || 0); private intro = 0; private card = ""; private flash = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.4 });
    this.spawnRound();
    this.start();
  }
  protected onGesture() { this.music?.play(BARK_THEME); }
  private yardName() { return ["WASH PEN", "PLAY YARD", "GROOM ROOM"][this.yard]; }

  private spawnRound() {
    this.yard = Math.min(2, Math.floor((this.round - 1) / 3));
    const n = 3 + Math.min(6, this.round); this.pups = [];
    const cols = ["#c98a54", "#e2c8a8", "#5a4a3a", "#f0d8b8", "#8a6a4a"];
    for (let i = 0; i < n; i++) this.pups.push({ x: YX + 20 + this.rnd() * (YW - 60), y: YY + 20 + this.rnd() * (YH - 40), vx: 0, vy: 0, penned: false, gold: this.rnd() < 0.12, col: cols[Math.floor(this.rnd() * cols.length)] });
    this.timer = Math.max(12, 22 - this.round); this.hx = YX + 20; this.py = YY + YH / 2; this.treat = null; this.treats = 3;
  }
  private beginGame() { this.round = 1; this.score = 0; this.strikes = 0; this.combo = 0; this.spawnRound(); this.clearFx(); this.intro = 1.2; this.card = "WASH PEN"; this.state = "play"; this.music?.setIntensity(0.6); this.report(); }
  private gameOver() { this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); } this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(4); this.hooks.onRunEnd?.({ score: this.score, shift: this.round }); this.report(); }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: 3 - this.strikes, shift: this.round, combo: this.combo }); }

  private roundClear() { const bonus = 100 * this.round + Math.round(this.timer * 10); this.score += bonus; this.fxRing(PENX, LH / 2, "#33e650", 60); this.fxPop(LW / 2, 60, "ALL PENNED +" + bonus, "#33e650", 1); this.music?.playJingle(CLEAR_JINGLE, 165); this.round++; this.spawnRound(); this.intro = 1; this.card = ((this.round - 1) % 3 === 0 ? this.yardName() : "ROUND " + this.round); this.report(); }
  private strikeOut() { this.strikes++; this.combo = 0; this.flash = 1; this.addShake(3); this.buzz(70); this.noise(0.12, 0.05); this.tone(160, 0.16, "square", 0.05); this.fxPop(LW / 2, 70, "BELL! PUPS LOOSE!", "#ff5d7d"); if (this.strikes >= 3) this.gameOver(); else { this.round++; this.spawnRound(); this.intro = 0.9; this.card = "ROUND " + this.round; this.report(); } }

  protected update(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 3);
    if (this.state !== "play") { if (this.pressed.a || this.pressed.left || this.pressed.right || this.pressed.up || this.pressed.down || this.pointer.down) this.beginGame(); return; }
    if (this.intro > 0) { this.intro -= dt; return; }

    // move (8-dir)
    let dx = 0, dy = 0; if (this.btn.left) dx = -1; if (this.btn.right) dx = 1; if (this.btn.up) dy = -1; if (this.btn.down) dy = 1;
    const m = dx && dy ? 0.71 : 1; this.hx += dx * 95 * m * dt; this.py += dy * 95 * m * dt;
    this.hx = Math.max(YX + 4, Math.min(PENX - 4, this.hx)); this.py = Math.max(YY + 4, Math.min(YY + YH - 4, this.py));
    if (this.pressed.a && this.treats > 0) { this.treats--; this.treat = { x: this.hx, y: this.py, t: 3 }; this.fxRing(this.hx, this.py, "#ffd24a", 16); this.tone(880, 0.06, "square", 0.05); }
    if (this.treat) { this.treat.t -= dt; if (this.treat.t <= 0) this.treat = null; }

    // timer
    this.timer -= dt; if (this.timer <= 0) { this.strikeOut(); return; }

    // pups
    for (const p of this.pups) {
      if (p.penned) continue;
      // wander
      p.vx += (this.rnd() - 0.5) * 60 * dt; p.vy += (this.rnd() - 0.5) * 60 * dt;
      // flee player
      const dxp = p.x - this.hx, dyp = p.y - this.py, d = Math.hypot(dxp, dyp);
      if (d < 34 && d > 0.1) { const f = (34 - d) / 34 * 260; p.vx += (dxp / d) * f * dt; p.vy += (dyp / d) * f * dt; }
      // lure to treat
      if (this.treat) { const tx = this.treat.x - p.x, ty = this.treat.y - p.y, td = Math.hypot(tx, ty); if (td > 1) { p.vx += (tx / td) * 120 * dt; p.vy += (ty / td) * 120 * dt; } }
      p.vx *= 0.94; p.vy *= 0.94; const sp = Math.hypot(p.vx, p.vy); const max = 70; if (sp > max) { p.vx = p.vx / sp * max; p.vy = p.vy / sp * max; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < YX + 4) { p.x = YX + 4; p.vx = Math.abs(p.vx); } if (p.y < YY + 4) { p.y = YY + 4; p.vy = Math.abs(p.vy); } if (p.y > YY + YH - 4) { p.y = YY + YH - 4; p.vy = -Math.abs(p.vy); }
      if (p.x >= PENX - 4) { p.penned = true; p.x = PENX + 8 + this.rnd() * 20; p.y = YY + 10 + this.rnd() * (YH - 20); this.combo++; const g = (p.gold ? 60 : 30) * Math.max(1, this.combo); this.score += g; this.fxBurst(PENX, p.y, p.gold ? "#ffd24a" : "#33e650", 6, 60); this.fxPop(PENX, p.y - 8, (this.combo > 1 ? "HERD x" + this.combo + " +" : "+") + g, this.combo > 1 ? "#ffd24a" : "#33e650"); this.tone(660 + this.combo * 30, 0.05, "square", 0.05); }
    }
    if (this.pups.every((p) => p.penned)) { this.roundClear(); return; }
    // combo decays if none penned recently — reset when player is far from pen
    this.report();
  }

  // ---- draw ----
  protected render() {
    const grasses = ["#2a5a2a", "#2a5a4a", "#3a3a5a"][this.yard];
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#4a2020" : shade(grasses, 0.05), shade(grasses, -0.3));
    // yard fence
    this.rectLine(YX, YY, YW, YH, "#8a5a2c"); this.rect(YX, YY, YW, 2, "#a86a34");
    // pen (right)
    this.rect(PENX, YY, LW - PENX - 4, YH, "#3a2a1a"); this.rectLine(PENX, YY, LW - PENX - 4, YH, "#c98a44"); this.text(PENX + 4, YY + 4, "PEN", "#ffd24a", 1, false);
    // treat
    if (this.treat) { const t = this.treat; this.disc(t.x | 0, t.y | 0, 3, "#ffd24a"); this.ring(t.x | 0, t.y | 0, 5 + (Math.floor(this.tSec() * 6) % 2), "#ffec9a", 1.2); }
    // pups
    for (const p of this.pups) { const c = p.gold ? "#ffd24a" : p.col; this.ball(p.x | 0, p.y - 2 | 0, 5, c); this.rect((p.x | 0) - 5, (p.y | 0) - 5, 2, 3, shade(c, -0.15)); this.rect((p.x | 0) + 3, (p.y | 0) - 5, 2, 3, shade(c, -0.15)); this.px((p.x | 0) - 2, (p.y | 0) - 2, "#0a0714"); this.px((p.x | 0) + 2, (p.y | 0) - 2, "#0a0714"); this.px((p.x | 0), (p.y | 0), "#3a2a2a"); }
    // player (groomer)
    { const x = this.hx | 0, y = this.py | 0; this.rect(x - 4, y - 4, 8, 9, "#3bb6ff"); this.disc(x, y - 6, 3, "#f0c9a0"); this.rect(x - 4, y - 9, 8, 2, "#7be0ff"); }

    this.drawFx();

    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#dff2ff", 1, false);
    this.text(90, 3, "TIME " + Math.ceil(this.timer), this.timer < 5 ? "#ff5d7d" : "#ffd24a", 1, false);
    for (let i = 0; i < this.treats; i++) this.disc(140 + i * 8, 6, 3, "#ffd24a");
    for (let i = 0; i < 3; i++) this.disc(LW - 9 - i * 9, 6, 3, i < 3 - this.strikes ? "#ff5d7d" : "#3a2a2a");

    if (this.state === "play" && this.intro > 0) { this.b.globalAlpha = 0.55; this.rect(0, 78, LW, 30, "#0a0714"); this.b.globalAlpha = 1; this.textCenter(88, this.card, "#33e650", 2); }
    if (this.state !== "play") this.overlay();
  }
  private tSec() { return performance.now() / 1000; }
  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(40, "BARK PARK", "#33e650", 2);
      this.textCenter(64, "HERD EVERY PUP INTO THE PEN", "#c3b4de", 1);
      this.textCenter(84, "GET CLOSE AND THEY FLEE - NUDGE THEM", "#83769c", 1);
      this.textCenter(96, "DROP A TREAT TO LURE A CLUSTER", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS A DIRECTION TO START", "#ffec27", 1);
    } else {
      this.textCenter(48, "PANDEMONIUM!", "#ff5d7d", 2);
      this.textCenter(74, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(88, "BEST " + this.best, "#ffd24a", 1);
      this.textCenter(104, "REACHED ROUND " + this.round, "#c3b4de", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS A DIRECTION TO RETRY", "#ffec27", 1);
    }
  }
}
