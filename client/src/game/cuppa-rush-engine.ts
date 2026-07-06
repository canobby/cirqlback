// cuppa-rush-engine — the first Main Street cabinet (Tapper homage). You're the
// barista (your avatar). Slide coffees down four counters to meet customers, then
// be in the right lane to catch the empty mug they slide back — or it shatters.
// Clear the rush to advance a shift; a customer reaching the bar or a smashed mug
// costs a life. Signature twist: "regular" customers need two serves, and back-to-
// back serves build a tip combo. Built on RetroEngine (16-bit) + MusicKit.

import { RetroEngine, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track } from "./musickit";
import { avatarForShop, loadAvatarLS, type AvatarConfig } from "./avatar";

const LANES = [40, 76, 112, 148];   // lane centre-Y
const BAR_X = 202;                   // the espresso bar (right)
const SPAWN_X = 14;
const BEST_KEY = "cuppa_best";

interface Customer { lane: number; x: number; hits: number; need: number; drinking: number; }
interface Mug { lane: number; x: number; }
interface Empty { lane: number; x: number; }
interface Pop { x: number; y: number; txt: string; color: string; life: number; }

// A brisk little coffee-shop theme (its own identity vs the lobby leitmotif).
const CUPPA_THEME: Track = {
  bpm: 144,
  layers: [
    { role: "lead", wave: "square", gain: 0.4, pattern: [
      { n: "C5", d: 2 }, { n: "E5", d: 2 }, { n: "G5", d: 2 }, { n: "E5", d: 2 }, { n: "F5", d: 2 }, { n: "D5", d: 2 }, { n: "C5", d: 4 },
      { n: "D5", d: 2 }, { n: "F5", d: 2 }, { n: "A5", d: 2 }, { n: "F5", d: 2 }, { n: "G5", d: 2 }, { n: "E5", d: 2 }, { n: "C5", d: 4 },
    ] },
    { role: "harmony", wave: "square", gain: 0.2, minIntensity: 0.4, pattern: [
      { n: 0, d: 1 }, { n: "G4", d: 1 }, { n: 0, d: 1 }, { n: "G4", d: 1 }, { n: 0, d: 1 }, { n: "A4", d: 1 }, { n: 0, d: 1 }, { n: "A4", d: 1 },
    ] },
    { role: "bass", wave: "triangle", gain: 0.5, pattern: [
      { n: "C3", d: 4 }, { n: "C3", d: 4 }, { n: "F2", d: 4 }, { n: "G2", d: 4 },
    ] },
    { role: "drums", minIntensity: 0.2, pattern: [
      { n: "K", d: 2 }, { n: "H", d: 2 }, { n: "S", d: 2 }, { n: "H", d: 2 },
    ] },
  ],
};

export class CuppaRushEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private av: AvatarConfig;

  private lane = 1;
  private mugs: Mug[] = [];
  private customers: Customer[] = [];
  private empties: Empty[] = [];
  private pops: Pop[] = [];

  private score = 0;
  private lives = 3;
  private shift = 1;
  private combo = 0;
  private comboT = 0;
  private best = +(LS.get(BEST_KEY) || 0);

  private toSpawn = 0;
  private spawned = 0;
  private spawnT = 0;
  private serveCd = 0;
  private interlude = 0;
  private flash = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, 240, 180);
    this.av = avatarForShop(loadAvatarLS(), "cuppa");
    this.music = new MusicKit({ volume: 0.45 });
    this.start();
  }

  protected onGesture() { this.music?.play(CUPPA_THEME); }

  // ---- shift setup ----
  private resetShift() {
    this.mugs = []; this.customers = []; this.empties = [];
    this.toSpawn = 5 + this.shift * 2;
    this.spawned = 0; this.spawnT = 0.6;
  }
  private beginGame() {
    this.score = 0; this.lives = 3; this.shift = 1; this.combo = 0; this.lane = 1;
    this.pops = []; this.resetShift(); this.state = "play";
    this.music?.setIntensity(0.5);
    this.report();
  }
  private gameOver() {
    this.state = "over";
    if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); }
    this.music?.setIntensity(0.2);
    this.tone(196, 0.14, "square", 0.05); this.tone(147, 0.2, "square", 0.05);
    this.hooks.onRunEnd?.({ score: this.score, shift: this.shift });
    this.report();
  }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: this.lives, shift: this.shift, combo: this.combo }); }

  private curSpeed() { return 11 + this.shift * 2.4; }
  private emptySpeed() { return 74 + this.shift * 4; }

  private loseLife() {
    this.lives--; this.combo = 0; this.flash = 1; this.buzz(60); this.noise(0.12, 0.06); this.tone(160, 0.12, "square", 0.05);
    if (this.lives <= 0) this.gameOver(); else this.report();
  }

  private serve() {
    if (this.serveCd > 0) return;
    this.serveCd = 0.16;
    this.mugs.push({ lane: this.lane, x: BAR_X - 6 });
    this.tone(660, 0.05, "square", 0.045); this.tone(880, 0.04, "square", 0.03);
  }

  private addScore(n: number, x: number, y: number) {
    this.combo++; this.comboT = 2.2;
    const gain = n * this.combo;
    this.score += gain;
    this.pops.push({ x, y: y - 6, txt: "+" + gain, color: this.combo > 1 ? "#ffd24a" : "#fff4ea", life: 1 });
    if (this.combo > 1) this.music?.setIntensity(Math.min(1, 0.5 + this.combo * 0.08));
  }

  // ---- loop ----
  protected update(dt: number) {
    this.serveCd -= dt; this.flash = Math.max(0, this.flash - dt * 3);
    for (const p of this.pops) { p.y -= dt * 14; p.life -= dt * 1.3; }
    this.pops = this.pops.filter((p) => p.life > 0);

    // menu / over: any action starts
    if (this.state !== "play") { if (this.pressed.a || this.pressed.up || this.pressed.down || this.pointer.down) this.beginGame(); return; }

    if (this.interlude > 0) { this.interlude -= dt; if (this.interlude <= 0) this.resetShift(); this.report(); }

    // input
    if (this.pressed.up) { this.lane = Math.max(0, this.lane - 1); this.tone(520, 0.03, "square", 0.03); }
    if (this.pressed.down) { this.lane = Math.min(3, this.lane + 1); this.tone(440, 0.03, "square", 0.03); }
    if (this.pressed.a) this.serve();

    // combo decay
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }

    // spawn customers
    if (this.interlude <= 0 && this.spawned < this.toSpawn) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        const lane = (Math.floor(this.rnd() * 4)) % 4;
        const tough = this.shift >= 2 && this.rnd() < 0.22;
        this.customers.push({ lane, x: SPAWN_X, hits: 0, need: tough ? 2 : 1, drinking: 0 });
        this.spawned++;
        this.spawnT = Math.max(0.7, 2.1 - this.shift * 0.14) * (0.7 + this.rnd() * 0.6);
      }
    }

    // mugs slide left; collide with the frontmost customer in-lane
    for (const m of this.mugs) m.x -= 150 * dt;
    for (let i = this.mugs.length - 1; i >= 0; i--) {
      const m = this.mugs[i];
      if (m.x < 6) { this.mugs.splice(i, 1); continue; }
      let hit = -1, hx = -1;
      for (let j = 0; j < this.customers.length; j++) { const c = this.customers[j]; if (c.lane === m.lane && Math.abs(c.x - m.x) < 7 && c.x > hx) { hit = j; hx = c.x; } }
      if (hit >= 0) {
        const c = this.customers[hit];
        this.mugs.splice(i, 1); c.hits++;
        if (c.hits >= c.need) { this.empties.push({ lane: c.lane, x: c.x }); this.customers.splice(hit, 1); this.addScore(10, c.x, LANES[c.lane]); this.tone(720, 0.05, "square", 0.04); }
        else { c.drinking = 0.4; this.tone(590, 0.05, "square", 0.04); this.pops.push({ x: c.x, y: LANES[c.lane] - 6, txt: "1 MORE", color: "#ff9ec2", life: 0.9 }); }
      }
    }

    // customers walk right; reaching the bar costs a life
    for (let i = this.customers.length - 1; i >= 0; i--) {
      const c = this.customers[i];
      if (c.drinking > 0) { c.drinking -= dt; continue; }
      c.x += this.curSpeed() * dt;
      if (c.x >= BAR_X - 14) { this.customers.splice(i, 1); this.loseLife(); }
    }

    // empties slide right; catch in-lane else shatter
    for (const e of this.empties) e.x += this.emptySpeed() * dt;
    for (let i = this.empties.length - 1; i >= 0; i--) {
      const e = this.empties[i];
      if (e.x >= BAR_X - 8) {
        this.empties.splice(i, 1);
        if (e.lane === this.lane) { this.score += 5; this.pops.push({ x: e.x, y: LANES[e.lane] - 6, txt: "+5", color: "#7be0c2", life: 0.8 }); this.tone(980, 0.04, "square", 0.035); }
        else this.loseLife();
      }
    }

    // shift cleared?
    if (this.interlude <= 0 && this.spawned >= this.toSpawn && this.customers.length === 0 && this.mugs.length === 0) {
      const bonus = 25 * this.shift; this.score += bonus;
      this.pops.push({ x: 120, y: 90, txt: "SHIFT CLEAR +" + bonus, color: "#ffd24a", life: 1.4 });
      this.shift++; this.interlude = 1.6; this.empties = [];
      this.tone(660, 0.06, "square", 0.05); this.tone(880, 0.06, "square", 0.05); this.tone(1170, 0.1, "square", 0.05);
      this.report();
    }
  }

  // ---- draw ----
  private drawCustomer(c: Customer) {
    const y = LANES[c.lane];
    const tough = c.need > 1;
    const body = c.hits > 0 ? "#8a8fb0" : tough ? "#c94f4f" : "#4f8fc9";
    this.rect(c.x - 3, y - 2, 6, 8, body); this.rect(c.x - 3, y - 2, 6, 1, this.shadeUp(body));
    this.disc(c.x, y - 6, 3, "#f0c9a0");
    this.px(c.x - 1, y - 6, "#1a1226"); this.px(c.x + 1, y - 6, "#1a1226");
    if (tough) this.rect(c.x - 3, y - 9, 6, 2, "#7a2020"); // regular's hat
  }
  private shadeUp(hex: string) { return hex; }

  protected render() {
    const flashBg = this.flash > 0.5 ? "#3a1520" : "#241a10";
    this.vgrad(0, 0, this.LW, this.LH, flashBg, "#160f08");
    // top HUD bar
    this.rect(0, 0, this.LW, 14, "#20140b");
    this.text(4, 4, "SCORE " + this.score, "#ffe6c2", 1, false);
    this.text(120, 4, "SHIFT " + this.shift, "#ffb020", 1, false);
    for (let i = 0; i < 3; i++) this.disc(this.LW - 10 - i * 9, 7, 3, i < this.lives ? "#ff4d6d" : "#3a2a2a");
    if (this.combo > 1) this.text(74, 4, "x" + this.combo, "#ffd24a", 1, false);

    // counters
    for (let l = 0; l < 4; l++) { const y = LANES[l]; this.shelf(6, y + 7, BAR_X - 6, 5, "#8a5a2c"); this.rect(6, y + 12, BAR_X - 6, 2, "#120a05"); }
    // espresso bar
    this.rect(BAR_X, 14, this.LW - BAR_X, this.LH - 14, "#3a2a18"); this.rect(BAR_X, 14, 2, this.LH - 14, "#5a4028");

    // entities
    for (const c of this.customers) this.drawCustomer(c);
    for (const e of this.empties) { this.ring(e.x, LANES[e.lane], 4, "#cfc7ba", 1.4); this.px(e.x + 3, LANES[e.lane] - 1, "#8a8276"); }
    for (const m of this.mugs) { this.ball(m.x, LANES[m.lane], 4, "#e88a2a"); this.rect(m.x - 4, LANES[m.lane] - 2, 8, 4, "#f4efe6"); this.px(m.x - 2, LANES[m.lane] - 6, "#d8cfc2"); }

    // barista (your avatar) at the bar, in the current lane
    this.avatar(BAR_X + 16, LANES[this.lane] + 9, this.av);
    // lane pointer
    this.px(BAR_X - 2, LANES[this.lane], "#ffd24a"); this.px(BAR_X - 4, LANES[this.lane], "#ffd24a");

    // pops
    for (const p of this.pops) { const c = p.life < 0.4 ? "#8a8276" : p.color; this.text(Math.round(p.x - this.textWidth(p.txt) / 2), Math.round(p.y), p.txt, c, 1, false); }

    if (this.state !== "play") this.overlay();
  }

  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, this.LW, this.LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(46, "CUPPA RUSH", "#ffb020", 2);
      this.textCenter(70, "SERVE THE MORNING RUSH", "#c3b4de", 1);
      this.textCenter(96, "UP DOWN  MOVE", "#83769c", 1);
      this.textCenter(108, "SERVE  SLIDE A COFFEE", "#83769c", 1);
      this.avatar(120, 138, this.av);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(this.LH - 16, "PRESS SERVE TO START", "#ffec27", 1);
    } else {
      this.textCenter(52, "SHIFT OVER", "#ff5d7d", 2);
      this.textCenter(78, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(92, "BEST " + this.best, "#ffd24a", 1);
      this.textCenter(108, "REACHED SHIFT " + this.shift, "#c3b4de", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(this.LH - 16, "PRESS SERVE TO RETRY", "#ffec27", 1);
    }
  }
}
