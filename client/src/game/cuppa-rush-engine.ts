// cuppa-rush-engine — the first Main Street cabinet (Tapper homage). You're the
// barista (your avatar). Slide coffees down four counters to meet customers, then
// be in the right lane to catch the empty mug they slide back — or it shatters.
// Content pass: three themed worlds (Morning Rush → Lunch Crowd → Late Night), a
// boss "Regular" every third shift, escalating speed and regulars. Juice pass:
// coffee splashes, ceramic shards, shockwaves, shake, hit-stop, world title cards.

import { RetroEngine, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";
import { avatarForShop, loadAvatarLS, type AvatarConfig } from "./avatar";

const LANES = [40, 76, 112, 148];
const BAR_X = 202;
const SPAWN_X = 14;
const BEST_KEY = "cuppa_best";

interface Customer { lane: number; x: number; hits: number; need: number; drinking: number; boss: boolean; regular: boolean; }
interface Mug { lane: number; x: number; }
interface Empty { lane: number; x: number; }

interface World { name: string; sky: [string, string]; counter: string; body: string; regular: number; speed: number; }
const WORLDS: World[] = [
  { name: "MORNING RUSH", sky: ["#3a2416", "#160f08"], counter: "#8a5a2c", body: "#4f8fc9", regular: 0.14, speed: 1.0 },
  { name: "LUNCH CROWD", sky: ["#2a2a4e", "#12101f"], counter: "#5a6a8a", body: "#5fae7a", regular: 0.30, speed: 1.22 },
  { name: "LATE NIGHT", sky: ["#161028", "#08060f"], counter: "#3f3a66", body: "#a06ad0", regular: 0.36, speed: 1.45 },
];

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
    { role: "drums", minIntensity: 0.2, pattern: [{ n: "K", d: 2 }, { n: "H", d: 2 }, { n: "S", d: 2 }, { n: "H", d: 2 }] },
  ],
};

export class CuppaRushEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private av: AvatarConfig;

  private lane = 1;
  private mugs: Mug[] = [];
  private customers: Customer[] = [];
  private empties: Empty[] = [];

  private score = 0;
  private lives = 3;
  private shift = 1;
  private combo = 0;
  private comboT = 0;
  private best = +(LS.get(BEST_KEY) || 0);

  private world = 0;
  private shiftInWorld = 0;
  private bossShift = false;
  private bossSpawned = false;

  private toSpawn = 0;
  private spawned = 0;
  private spawnT = 0;
  private serveCd = 0;
  private interlude = 0;
  private card = "";
  private flash = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, 240, 180);
    this.av = avatarForShop(loadAvatarLS(), "cuppa");
    this.music = new MusicKit({ volume: 0.45 });
    this.start();
  }

  protected onGesture() { this.music?.play(CUPPA_THEME); }

  private resetShift() {
    this.mugs = []; this.customers = []; this.empties = [];
    this.world = Math.floor((this.shift - 1) / 3) % WORLDS.length;
    this.shiftInWorld = (this.shift - 1) % 3;
    this.bossShift = this.shiftInWorld === 2;
    this.bossSpawned = false;
    this.toSpawn = 4 + this.shiftInWorld + this.world + Math.floor(this.shift / 2);
    this.spawned = 0; this.spawnT = 0.7;
    this.card = (this.shiftInWorld === 0 ? "WORLD " + (this.world + 1) + "  " + WORLDS[this.world].name : "SHIFT " + this.shift) + (this.bossShift ? "  -  REGULAR INCOMING" : "");
    this.interlude = 1.7;
  }
  private beginGame() {
    this.score = 0; this.lives = 3; this.shift = 1; this.combo = 0; this.lane = 1;
    this.clearFx(); this.resetShift(); this.state = "play";
    this.music?.setIntensity(0.5); this.report();
  }
  private gameOver() {
    this.state = "over";
    if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); }
    this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150);
    this.addShake(5); this.hooks.onRunEnd?.({ score: this.score, shift: this.shift }); this.report();
  }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: this.lives, shift: this.shift, combo: this.combo }); }

  private w() { return WORLDS[this.world]; }
  private curSpeed() { return (10 + this.shift * 1.7) * this.w().speed; }
  private emptySpeed() { return (72 + this.shift * 3.5) * this.w().speed; }

  private loseLife(x: number, y: number) {
    this.lives--; this.combo = 0; this.flash = 1; this.addShake(3.5); this.buzz(60);
    this.noise(0.12, 0.06); this.tone(160, 0.12, "square", 0.05); this.fxPop(x, y, "MISS!", "#ff5d7d");
    if (this.lives <= 0) this.gameOver(); else this.report();
  }

  private serve() {
    if (this.serveCd > 0) return;
    this.serveCd = 0.15;
    this.mugs.push({ lane: this.lane, x: BAR_X - 6 });
    this.fxBurst(BAR_X - 8, LANES[this.lane], "#e88a2a", 3, 40);
    this.tone(660, 0.05, "square", 0.045); this.tone(880, 0.04, "square", 0.03);
  }

  private addScore(n: number, x: number, y: number) {
    this.combo++; this.comboT = 2.4;
    const gain = n * this.combo; this.score += gain;
    this.fxPop(x, y - 4, "+" + gain, this.combo > 1 ? "#ffd24a" : "#fff4ea");
    if (this.combo >= 3 && this.combo % 3 === 0) this.fxPop(x, y - 14, "COMBO x" + this.combo, "#ff9ec2");
    if (this.combo > 1) this.music?.setIntensity(Math.min(1, 0.5 + this.combo * 0.07));
  }

  protected update(dt: number) {
    this.serveCd -= dt; this.flash = Math.max(0, this.flash - dt * 3);

    if (this.state !== "play") { if (this.pressed.a || this.pressed.up || this.pressed.down || this.pointer.down) this.beginGame(); return; }
    if (this.interlude > 0) { this.interlude -= dt; return; }

    if (this.pressed.up) { this.lane = Math.max(0, this.lane - 1); this.tone(520, 0.03, "square", 0.03); }
    if (this.pressed.down) { this.lane = Math.min(3, this.lane + 1); this.tone(440, 0.03, "square", 0.03); }
    if (this.pressed.a) this.serve();

    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }

    // spawn
    if (this.spawned < this.toSpawn) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        const lane = Math.floor(this.rnd() * 4) % 4;
        const regular = this.rnd() < this.w().regular;
        this.customers.push({ lane, x: SPAWN_X, hits: 0, need: regular ? 2 : 1, drinking: 0, boss: false, regular });
        this.spawned++;
        this.spawnT = Math.max(0.6, 2.0 - this.shift * 0.12) * (0.7 + this.rnd() * 0.6);
      }
    }
    // boss appears mid-shift on boss shifts
    if (this.bossShift && !this.bossSpawned && this.spawned >= Math.ceil(this.toSpawn * 0.5)) {
      this.bossSpawned = true;
      this.customers.push({ lane: Math.floor(this.rnd() * 4) % 4, x: SPAWN_X, hits: 0, need: 3, drinking: 0, boss: true, regular: false });
      this.fxPop(120, 26, "THE REGULAR!", "#ffd24a"); this.tone(220, 0.14, "square", 0.05); this.addShake(2);
    }

    // mugs
    for (const m of this.mugs) m.x -= 150 * dt;
    for (let i = this.mugs.length - 1; i >= 0; i--) {
      const m = this.mugs[i];
      if (m.x < 6) { this.mugs.splice(i, 1); this.fxBurst(6, LANES[m.lane], "#5a3a1a", 3, 30); continue; }
      let hit = -1, hx = -1;
      for (let j = 0; j < this.customers.length; j++) { const c = this.customers[j]; if (c.lane === m.lane && c.drinking <= 0 && Math.abs(c.x - m.x) < 8 && c.x > hx) { hit = j; hx = c.x; } }
      if (hit >= 0) {
        const c = this.customers[hit]; this.mugs.splice(i, 1); c.hits++;
        this.fxBurst(c.x, LANES[c.lane], "#f4efe6", 5, 70); this.addShake(1); this.hitstop(0.02);
        if (c.hits >= c.need) {
          this.empties.push({ lane: c.lane, x: c.x }); this.customers.splice(hit, 1);
          if (c.boss) { this.addScore(60, c.x, LANES[c.lane]); this.fxRing(c.x, LANES[c.lane], "#ffd24a", 26); this.fxBurst(c.x, LANES[c.lane], "#ffd24a", 14, 120); this.addShake(4); this.hitstop(0.06); this.music?.playJingle(CLEAR_JINGLE, 170); }
          else { this.addScore(c.regular ? 20 : 10, c.x, LANES[c.lane]); this.tone(760, 0.05, "square", 0.04); }
        } else { c.drinking = 0.35; this.tone(590, 0.05, "square", 0.04); this.fxPop(c.x, LANES[c.lane] - 4, c.boss ? (c.need - c.hits) + " LEFT" : "1 MORE", "#ff9ec2"); }
      }
    }

    // customers advance
    for (let i = this.customers.length - 1; i >= 0; i--) {
      const c = this.customers[i];
      if (c.drinking > 0) { c.drinking -= dt; continue; }
      c.x += this.curSpeed() * (c.boss ? 0.8 : 1) * dt;
      if (c.x >= BAR_X - 14) { this.customers.splice(i, 1); this.loseLife(BAR_X - 18, LANES[c.lane]); }
    }

    // empties slide back
    for (const e of this.empties) e.x += this.emptySpeed() * dt;
    for (let i = this.empties.length - 1; i >= 0; i--) {
      const e = this.empties[i];
      if (e.x >= BAR_X - 8) {
        this.empties.splice(i, 1);
        if (e.lane === this.lane) { this.score += 5; this.fxPop(e.x, LANES[e.lane] - 4, "+5", "#7be0c2"); this.fxBurst(e.x, LANES[e.lane], "#7be0c2", 5, 60); this.tone(980, 0.04, "square", 0.035); }
        else { this.fxShards(e.x, LANES[e.lane], "#cfc7ba", 7); this.loseLife(e.x, LANES[e.lane]); }
      }
    }

    // shift clear
    if (this.spawned >= this.toSpawn && this.customers.length === 0 && this.mugs.length === 0 && (!this.bossShift || this.bossSpawned)) {
      const bonus = 25 * this.shift; this.score += bonus;
      this.fxRing(120, 90, "#ffd24a", 60); this.fxBurst(120, 90, "#ffd24a", 18, 130, 40); this.fxPop(120, 82, "SHIFT CLEAR +" + bonus, "#ffd24a");
      this.music?.playJingle(CLEAR_JINGLE, 165); this.addShake(2);
      this.shift++; this.resetShift(); this.report();
    }
  }

  // ---- draw ----
  private drawCustomer(c: Customer) {
    const y = LANES[c.lane];
    if (c.boss) {
      const body = c.hits > 0 ? "#7a6c9a" : "#6a4fb0";
      this.rect(c.x - 4, y - 3, 8, 10, body); this.rect(c.x - 4, y - 3, 8, 1, "#9a7ff0");
      this.disc(c.x, y - 8, 4, "#f0c9a0"); this.px(c.x - 2, y - 8, "#1a1226"); this.px(c.x + 2, y - 8, "#1a1226");
      this.rect(c.x - 4, y - 12, 8, 2, "#ffd24a"); this.px(c.x - 3, y - 13, "#ffd24a"); this.px(c.x, y - 14, "#ffd24a"); this.px(c.x + 3, y - 13, "#ffd24a"); // crown
      for (let h = 0; h < c.need; h++) this.rect(c.x - 3 + h * 3, y + 8, 2, 1, h < c.hits ? "#33e650" : "#5f574f");
      return;
    }
    const body = c.hits > 0 ? "#8a8fb0" : c.regular ? "#c94f4f" : this.w().body;
    this.rect(c.x - 3, y - 2, 6, 8, body); this.rect(c.x - 3, y - 2, 6, 1, "#ffffff22");
    this.disc(c.x, y - 6, 3, "#f0c9a0"); this.px(c.x - 1, y - 6, "#1a1226"); this.px(c.x + 1, y - 6, "#1a1226");
    if (c.regular) this.rect(c.x - 3, y - 9, 6, 2, "#7a2020");
  }

  protected render() {
    const w = this.w();
    this.vgrad(0, 0, this.LW, this.LH, this.flash > 0.5 ? "#4a1520" : w.sky[0], w.sky[1]);
    // counters
    for (let l = 0; l < 4; l++) { const y = LANES[l]; this.shelf(6, y + 7, BAR_X - 6, 5, w.counter); this.rect(6, y + 12, BAR_X - 6, 2, "#00000060"); }
    // bar
    this.rect(BAR_X, 14, this.LW - BAR_X, this.LH - 14, "#3a2a18"); this.rect(BAR_X, 14, 2, this.LH - 14, "#5a4028");

    for (const c of this.customers) this.drawCustomer(c);
    for (const e of this.empties) { this.ring(e.x, LANES[e.lane], 4, "#cfc7ba", 1.4); this.px(e.x + 3, LANES[e.lane] - 1, "#8a8276"); }
    for (const m of this.mugs) { this.ball(m.x, LANES[m.lane], 4, "#e88a2a"); this.rect(m.x - 4, LANES[m.lane] - 2, 8, 4, "#f4efe6"); this.px(m.x - 2, LANES[m.lane] - 6, "#d8cfc2"); }

    this.avatar(BAR_X + 16, LANES[this.lane] + 9, this.av);
    this.px(BAR_X - 2, LANES[this.lane], "#ffd24a"); this.px(BAR_X - 4, LANES[this.lane], "#ffd24a");

    this.drawFx();

    // HUD (drawn above the field, below overlays)
    this.rect(0, 0, this.LW, 14, "#00000090");
    this.text(4, 4, "SCORE " + this.score, "#ffe6c2", 1, false);
    this.text(112, 4, "W" + (this.world + 1) + " S" + this.shift, "#ffb020", 1, false);
    if (this.combo > 1) this.text(78, 4, "x" + this.combo, "#ffd24a", 1, false);
    for (let i = 0; i < 3; i++) this.disc(this.LW - 10 - i * 9, 7, 3, i < this.lives ? "#ff4d6d" : "#3a2a2a");

    if (this.state === "play" && this.interlude > 0) this.cardOverlay();
    if (this.state !== "play") this.overlay();
  }

  private cardOverlay() {
    this.b.globalAlpha = 0.55; this.rect(0, 60, this.LW, 60, "#0a0714"); this.b.globalAlpha = 1;
    this.textCenter(78, this.card.split("  -  ")[0], this.bossShift ? "#ff5d7d" : "#ffd24a", 2);
    if (this.bossShift) this.textCenter(100, "REGULAR INCOMING", "#ff9ec2", 1);
  }

  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, this.LW, this.LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(42, "CUPPA RUSH", "#ffb020", 2);
      this.textCenter(66, "SERVE THE MORNING RUSH", "#c3b4de", 1);
      this.textCenter(92, "UP DOWN  MOVE LANE", "#83769c", 1);
      this.textCenter(104, "SERVE  SLIDE A COFFEE", "#83769c", 1);
      this.avatar(120, 140, this.av);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(this.LH - 14, "PRESS SERVE TO START", "#ffec27", 1);
    } else {
      this.textCenter(48, "SHIFT OVER", "#ff5d7d", 2);
      this.textCenter(74, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(88, "BEST " + this.best, "#ffd24a", 1);
      this.textCenter(104, "REACHED W" + (this.world + 1) + " SHIFT " + this.shift, "#c3b4de", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(this.LH - 14, "PRESS SERVE TO RETRY", "#ffec27", 1);
    }
  }
}
