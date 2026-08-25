// deli-dash-engine — Main Street cabinet (Diner Dash homage). A deli counter: hungry
// regulars drop onto the stools, each with a stacked sandwich order and a ticking
// patience bar. Slide to a stool and SERVE to add the next layer; finish the order
// before patience runs out to bank the tip. Three walkouts and the lunch rush is
// over. Signature twist: finish orders back-to-back for a RUSH combo multiplier, and
// a golden BIG TIPPER worth double. Shifts: Lunch → Happy Hour → Dinner Rush.
// RetroEngine + juice + MusicKit; two-thumb slide + serve.

import { RetroEngine, shade, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const BEST_KEY = "deli_best";
const STOOLS = [40, 92, 148, 200];
const COUNTER_Y = 118;
const LAYER_COLORS = ["#c94f6c", "#33e650", "#ffd24a", "#8a5a2c", "#ff8a3d"];

interface Cust { color: string; order: number; done: number; patience: number; drain: number; big: boolean; anim: number }
interface Shift { name: string; sky: [string, string]; counter: string; spawn: number; drain: number; maxOrder: number }
const SHIFTS: Shift[] = [
  { name: "LUNCH", sky: ["#3a2a1a", "#1a1208"], counter: "#8a5a2c", spawn: 1.9, drain: 0.055, maxOrder: 2 },
  { name: "HAPPY HOUR", sky: ["#2a1a3a", "#120a1e"], counter: "#7a4fd0", spawn: 1.5, drain: 0.075, maxOrder: 3 },
  { name: "DINNER RUSH", sky: ["#1a2a3a", "#0a121e"], counter: "#2c6a8a", spawn: 1.1, drain: 0.1, maxOrder: 3 },
];

const DELI_THEME: Track = {
  bpm: 136,
  layers: [
    { role: "lead", wave: "square", gain: 0.38, pattern: [
      { n: "D5", d: 2 }, { n: "F5", d: 1 }, { n: "A5", d: 1 }, { n: "G5", d: 2 }, { n: "F5", d: 2 }, { n: "D5", d: 2 }, { n: "A4", d: 2 }, { n: "D5", d: 2 },
      { n: "C5", d: 2 }, { n: "E5", d: 1 }, { n: "G5", d: 1 }, { n: "F5", d: 2 }, { n: "E5", d: 2 }, { n: "C5", d: 2 }, { n: "D5", d: 2 },
    ] },
    { role: "harmony", wave: "square", gain: 0.15, minIntensity: 0.4, pattern: [{ n: 0, d: 2 }, { n: "D4", d: 2 }, { n: 0, d: 2 }, { n: "A3", d: 2 }] },
    { role: "bass", wave: "triangle", gain: 0.5, pattern: [{ n: "D3", d: 2 }, { n: "D3", d: 2 }, { n: "A2", d: 2 }, { n: "A2", d: 2 }, { n: "B2", d: 2 }, { n: "B2", d: 2 }, { n: "G2", d: 2 }, { n: "G2", d: 2 }] },
    { role: "drums", minIntensity: 0.25, pattern: [{ n: "K", d: 2 }, { n: "H", d: 2 }, { n: "S", d: 2 }, { n: "H", d: 1 }, { n: "H", d: 1 }] },
  ],
};

export class DeliDashEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private shift = 0; private served = 0;
  private custs: (Cust | null)[] = [null, null, null, null];
  private server = 0; private moveCd = 0; private serveCd = 0;
  private score = 0; private strikes = 0; private combo = 0; private comboT = 0;
  private best = +(LS.get(BEST_KEY) || 0);
  private spawnT = 0; private intro = 0; private card = ""; private flash = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.4 });
    this.custs[1] = this.makeCust();      // show a customer on the ready screen
    this.start();
  }
  protected onGesture() { this.music?.play(DELI_THEME); }
  private sh() { return SHIFTS[this.shift]; }

  private makeCust(): Cust { const s = this.sh(); const big = this.rnd() < 0.14; return { color: LAYER_COLORS[Math.floor(this.rnd() * LAYER_COLORS.length)], order: 1 + Math.floor(this.rnd() * s.maxOrder), done: 0, patience: 1, drain: s.drain * (0.85 + this.rnd() * 0.3), big, anim: 0 }; }

  private beginGame() { this.shift = 0; this.served = 0; this.score = 0; this.strikes = 0; this.combo = 0; this.custs = [null, null, null, null]; this.server = 0; this.spawnT = 0.6; this.clearFx(); this.intro = 1.3; this.card = "LUNCH"; this.state = "play"; this.music?.setIntensity(0.5); this.report(); }
  private gameOver() { this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); } this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(5); this.hooks.onRunEnd?.({ score: this.score, shift: this.shift + 1 }); this.report(); }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: 3 - this.strikes, shift: this.shift + 1, combo: this.combo }); }

  private walkout(i: number) { this.custs[i] = null; this.strikes++; this.combo = 0; this.flash = 1; this.addShake(3); this.buzz(60); this.noise(0.12, 0.05); this.tone(160, 0.16, "square", 0.05); this.fxPop(STOOLS[i], COUNTER_Y - 30, "WALKOUT!", "#ff5d7d"); if (this.strikes >= 3) this.gameOver(); else this.report(); }
  private complete(i: number) {
    const c = this.custs[i]!; const tip = Math.round((20 + c.patience * 40) * (c.big ? 2 : 1)); this.combo++; this.comboT = 2.5; const gain = (50 + tip) * Math.max(1, this.combo); this.score += gain; this.served++;
    this.fxBurst(STOOLS[i], COUNTER_Y - 20, c.big ? "#ffd24a" : "#33e650", 14, 100); this.fxRing(STOOLS[i], COUNTER_Y - 20, "#33e650", 18); this.fxPop(STOOLS[i], COUNTER_Y - 34, (this.combo > 1 ? "RUSH x" + this.combo + " +" : "+") + gain, this.combo > 1 ? "#ffd24a" : "#33e650");
    this.addShake(1); this.hitstop(0.03); this.tone(700, 0.06, "square", 0.05); this.tone(1046, 0.09, "square", 0.05); if (c.big) this.tone(1318, 0.12, "square", 0.05);
    this.custs[i] = null;
    // shift up every ~8 served
    const ns = Math.min(SHIFTS.length - 1, Math.floor(this.served / 8));
    if (ns !== this.shift) { this.shift = ns; this.card = this.sh().name; this.intro = 1.1; this.music?.playJingle(CLEAR_JINGLE, 165); this.music?.setIntensity(0.6 + ns * 0.2); }
    this.report();
  }

  protected update(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 3); this.moveCd = Math.max(0, this.moveCd - dt); this.serveCd = Math.max(0, this.serveCd - dt); this.comboT = Math.max(0, this.comboT - dt); if (this.comboT <= 0) this.combo = 0;
    if (this.state !== "play") { if (this.pressed.a || this.pressed.left || this.pressed.right || this.pointer.down) this.beginGame(); return; }
    if (this.intro > 0) { this.intro -= dt; return; }

    // move server between stools
    if (this.pressed.left && this.server > 0) { this.server--; this.tone(300, 0.03, "square", 0.03); }
    if (this.pressed.right && this.server < 3) { this.server++; this.tone(300, 0.03, "square", 0.03); }

    // serve current stool
    if (this.pressed.a) {
      const c = this.custs[this.server];
      if (c) { c.done++; c.anim = 1; this.tone(520 + c.done * 60, 0.05, "square", 0.04); this.buzz(6); this.fxBurst(STOOLS[this.server], COUNTER_Y - 24, c.color, 4, 50); if (c.done >= c.order) this.complete(this.server); }
      else { this.tone(200, 0.04, "square", 0.03); }
    }

    // customer patience
    for (let i = 0; i < 4; i++) { const c = this.custs[i]; if (!c) continue; c.anim = Math.max(0, c.anim - dt * 3); c.patience -= c.drain * dt; if (c.patience <= 0) { this.walkout(i); } }

    // spawn
    this.spawnT -= dt;
    if (this.spawnT <= 0) { const open = [0, 1, 2, 3].filter((i) => !this.custs[i]); if (open.length) { const i = open[Math.floor(this.rnd() * open.length)]; this.custs[i] = this.makeCust(); this.tone(660, 0.06, "square", 0.04); } this.spawnT = this.sh().spawn * (0.7 + this.rnd() * 0.6); }
  }

  // ---- draw ----
  protected render() {
    const s = this.sh();
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#4a1520" : s.sky[0], s.sky[1]);
    // back wall menu board
    this.rect(20, 18, LW - 40, 22, "#0a0714"); this.rect(20, 18, LW - 40, 2, "#2a2438"); this.text(30, 24, "TODAY: SANDWICHES", "#ffd24a", 1, false); this.text(150, 24, s.name, "#7be0c2", 1, false);
    // counter
    this.shelf(0, COUNTER_Y, LW, 10, s.counter); this.rect(0, COUNTER_Y + 10, LW, LH - COUNTER_Y - 10, shade(s.counter, -0.5));
    for (let x = 6; x < LW; x += 12) this.rect(x, COUNTER_Y + 12, 6, 2, shade(s.counter, -0.3));

    // stools + customers
    for (let i = 0; i < 4; i++) {
      const x = STOOLS[i];
      this.rect(x - 6, COUNTER_Y + 14, 12, 3, "#3a3040"); this.rect(x - 1, COUNTER_Y + 17, 2, 10, "#3a3040"); // stool
      const c = this.custs[i]; if (!c) continue;
      // customer head/body above counter
      const bob = c.anim > 0 ? -1 : 0;
      this.ball(x, COUNTER_Y - 10 + bob, 6, c.big ? "#ffd24a" : c.color);
      this.rect(x - 2, COUNTER_Y - 12 + bob, 2, 2, "#0a0714"); this.rect(x + 1, COUNTER_Y - 12 + bob, 2, 2, "#0a0714");
      if (c.patience < 0.3 && Math.floor(this.tPlay() * 6) % 2 === 0) this.text(x - 2, COUNTER_Y - 22, "!", "#ff5d7d", 1, false);
      // order stack (slots fill as served)
      for (let k = 0; k < c.order; k++) { const oy = COUNTER_Y - 30 - k * 4; if (k < c.done) this.rect(x - 5, oy, 10, 3, LAYER_COLORS[k % LAYER_COLORS.length]); else this.rectLine(x - 5, oy, 10, 3, "#5a5568"); }
      // patience bar
      const pw = 14; this.rect(x - pw / 2, COUNTER_Y - 2, pw, 2, "#2a2438"); this.rect(x - pw / 2, COUNTER_Y - 2, Math.round(pw * c.patience), 2, c.patience < 0.3 ? "#ff5d7d" : c.patience < 0.6 ? "#ffd24a" : "#33e650");
    }

    // server behind counter at current stool
    const sx = STOOLS[this.server];
    this.rect(sx - 3, COUNTER_Y - 2, 6, 8, "#3bb6ff"); this.disc(sx, COUNTER_Y - 5, 3, "#f0c9a0"); this.rect(sx - 3, COUNTER_Y - 9, 6, 2, "#f4f0e8");
    // selection arrow
    this.rect(sx - 2, COUNTER_Y + 6, 4, 2, "#ffd24a");

    this.drawFx();

    // HUD
    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#ffe6c2", 1, false);
    this.text(150, 3, this.sh().name, "#ffd24a", 1, false);
    if (this.combo > 1) this.text(120, 3, "x" + this.combo, "#33e650", 1, false);
    for (let i = 0; i < 3; i++) this.disc(LW - 9 - i * 9, 6, 3, i < 3 - this.strikes ? "#ff5d7d" : "#3a2a2a");

    if (this.state === "play" && this.intro > 0) { this.b.globalAlpha = 0.55; this.rect(0, 78, LW, 30, "#0a0714"); this.b.globalAlpha = 1; this.textCenter(88, this.card, "#ffd24a", 2); }
    if (this.state !== "play") this.overlay();
  }
  private tPlay() { return performance.now() / 1000; }
  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(40, "DELI DASH", "#ffd24a", 2);
      this.textCenter(64, "SERVE THE LUNCH RUSH", "#c3b4de", 1);
      this.textCenter(84, "SLIDE TO A STOOL - SERVE THE ORDER", "#83769c", 1);
      this.textCenter(96, "BEAT THE PATIENCE BAR FOR A TIP", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS SERVE TO START", "#ffec27", 1);
    } else {
      this.textCenter(48, "86'D!", "#ff5d7d", 2);
      this.textCenter(74, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(88, "BEST " + this.best, "#ffd24a", 1);
      this.textCenter(104, "SERVED " + this.served, "#c3b4de", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS SERVE TO RETRY", "#ffec27", 1);
    }
  }
}
