// taco-stack-engine — Main Street cabinet #9 (BurgerTime homage). Walk platforms and
// ladders over stacked ingredient layers, stepping each one down onto the plate to
// build every taco, while chili-peppers and onions chase you. Signature twist: LIME
// is both weapon and combo — squeeze one to stun a chaser and fill the spicy meter;
// full meter = a FIESTA (double points). Worlds: Lunch Truck → Cantina → Fiesta.
// RetroEngine (16-bit + juice) + MusicKit; two-thumb d-pad + lime.

import { RetroEngine, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const BEST_KEY = "taco_best";
const PLAT = [40, 72, 104, 136, 168];       // platform feet-Y, top → bottom
const PLATE = PLAT.length - 1;               // bottom platform holds the plates
const LANES = [46, 120, 194];               // lane centre-X
const ING_W = 40, SEG = 10;
const WALL_L = 10, WALL_R = 230;

interface Ladder { x: number; hi: number; lo: number; }
const LADDERS: Ladder[] = [];
for (let g = 0; g < PLAT.length - 1; g++) for (const x of LANES) LADDERS.push({ x, hi: PLAT[g], lo: PLAT[g + 1] });

interface Ing { lane: number; plat: number; color: string; segs: [number, number, number, number]; dropping: boolean; y: number; placed: boolean; }
interface Foe { x: number; plat: number; dir: number; climbing: Ladder | null; stun: number; kind: 0 | 1; }
interface Lime { x: number; y: number; vx: number; life: number; }

interface World { name: string; sky: [string, string]; plat: string; foes: number; speed: number; }
const WORLDS: World[] = [
  { name: "LUNCH TRUCK", sky: ["#4a2a12", "#1a0f08"], plat: "#3bb6ff", foes: 2, speed: 1.0 },
  { name: "CANTINA", sky: ["#3a1a2a", "#180a12"], plat: "#e0a860", foes: 3, speed: 1.18 },
  { name: "FIESTA", sky: ["#2a1a3a", "#120a1a"], plat: "#ff8ab5", foes: 3, speed: 1.36 },
];
const ING_COLORS = ["#e2b06a", "#c0392b", "#ffd24a"]; // shell, meat, cheese

const TACO_THEME: Track = {
  bpm: 150,
  layers: [
    { role: "lead", wave: "square", gain: 0.38, pattern: [
      { n: "A4", d: 1 }, { n: "A4", d: 1 }, { n: "C5", d: 2 }, { n: "E5", d: 1 }, { n: "D5", d: 1 }, { n: "C5", d: 2 }, { n: "A4", d: 2 }, { n: "E5", d: 2 },
      { n: "F5", d: 1 }, { n: "E5", d: 1 }, { n: "D5", d: 2 }, { n: "C5", d: 2 }, { n: "A4", d: 4 },
    ] },
    { role: "harmony", wave: "square", gain: 0.16, minIntensity: 0.4, pattern: [{ n: 0, d: 1 }, { n: "E4", d: 1 }, { n: 0, d: 1 }, { n: "A4", d: 1 }] },
    { role: "bass", wave: "triangle", gain: 0.5, pattern: [{ n: "A2", d: 1 }, { n: "E2", d: 1 }, { n: "A2", d: 2 }, { n: "F2", d: 2 }, { n: "E2", d: 2 }] },
    { role: "drums", minIntensity: 0.2, pattern: [{ n: "K", d: 1 }, { n: "H", d: 1 }, { n: "K", d: 2 }, { n: "S", d: 2 }, { n: "H", d: 2 }] },
  ],
};

export class TacoStackEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private world = 0;
  private chefX = LANES[1]; private chefPlat = PLATE; private climbing: Ladder | null = null; private faceR = true;
  private ings: Ing[] = [];
  private foes: Foe[] = [];
  private limes: Lime[] = [];
  private placedPerLane = [0, 0, 0];
  private foeT = 0; private limeCd = 0; private spicy = 0; private fiesta = 0;

  private score = 0; private lives = 3; private level = 1; private combo = 0; private comboT = 0;
  private best = +(LS.get(BEST_KEY) || 0);
  private flash = 0; private intro = 0; private card = ""; private pause = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.42 });
    this.genLevel(); this.start();
  }
  protected onGesture() { this.music?.play(TACO_THEME); }
  private w() { return WORLDS[this.world]; }

  private genLevel() {
    this.world = Math.floor((this.level - 1) / 3) % WORLDS.length;
    this.ings = []; this.placedPerLane = [0, 0, 0]; this.foes = []; this.limes = [];
    for (let lane = 0; lane < 3; lane++) for (let i = 0; i < 3; i++) this.ings.push({ lane, plat: i, color: ING_COLORS[i], segs: [0, 0, 0, 0], dropping: false, y: PLAT[i], placed: false });
    this.chefX = LANES[1]; this.chefPlat = PLATE; this.climbing = null; this.foeT = 2; this.spicy = 0; this.fiesta = 0;
  }
  private newLevel(fresh: boolean) { this.genLevel(); if (fresh) { this.intro = 1.4; this.card = ((this.level - 1) % 3 === 0 ? "SHIFT " + (this.world + 1) + "  " + this.w().name : "ORDER " + this.level); } }
  private beginGame() { this.score = 0; this.lives = 3; this.level = 1; this.combo = 0; this.clearFx(); this.newLevel(true); this.state = "play"; this.music?.setIntensity(0.5); this.report(); }
  private gameOver() {
    this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); }
    this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(5); this.hooks.onRunEnd?.({ score: this.score, shift: this.level }); this.report();
  }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: this.lives, shift: this.level, combo: this.combo }); }

  private ladderUp(x: number, plat: number) { return LADDERS.find((l) => l.lo === PLAT[plat] && Math.abs(x - l.x) < 6) || null; }
  private ladderDown(x: number, plat: number) { return LADDERS.find((l) => l.hi === PLAT[plat] && Math.abs(x - l.x) < 6) || null; }
  private platOf(y: number) { let best = 0; for (let i = 0; i < PLAT.length; i++) if (Math.abs(PLAT[i] - y) < Math.abs(PLAT[best] - y)) best = i; return best; }

  private loseLife() {
    this.lives--; this.combo = 0; this.flash = 1; this.addShake(4); this.hitstop(0.06); this.buzz(80); this.fxShards(this.chefX, PLAT[this.chefPlat] - 5, "#33e650", 8); this.noise(0.14, 0.06); this.tone(150, 0.16, "square", 0.05); this.pause = 0.7;
    if (this.lives <= 0) this.gameOver(); else { this.chefX = LANES[1]; this.chefPlat = PLATE; this.climbing = null; this.foes = []; this.foeT = 1.5; this.report(); }
  }
  private levelClear() {
    const bonus = 120 * this.level; this.score += bonus;
    this.fxRing(LW / 2, LH / 2, "#ffd24a", 70); this.fxPop(LW / 2, LH / 2 - 8, "ORDER UP! +" + bonus, "#ffd24a"); this.music?.playJingle(CLEAR_JINGLE, 165); this.addShake(2);
    this.level++; this.newLevel(true); this.report();
  }

  private dropIng(ing: Ing) {
    ing.dropping = true; this.tone(420, 0.06, "square", 0.04); this.addScore(20, LANES[ing.lane], ing.y);
    // squash foes in this lane below
    for (const f of this.foes) if (Math.abs(LANES[ing.lane] - f.x) < ING_W / 2 && PLAT[f.plat] > ing.y) { f.stun = 3; this.addScore(50, f.x, PLAT[f.plat]); this.fxBurst(f.x, PLAT[f.plat] - 4, "#ffd24a", 8, 80); }
  }
  private addScore(n: number, x: number, y: number) { const g = n * (this.fiesta > 0 ? 2 : 1) * (this.combo > 0 ? this.combo : 1); this.score += g; this.fxPop(x, y - 6, "+" + g, this.combo > 1 ? "#ffd24a" : "#fff4ea"); }

  private throwLime() {
    if (this.limeCd > 0) return; this.limeCd = 0.35;
    this.limes.push({ x: this.chefX, y: PLAT[this.chefPlat] - 5, vx: this.faceR ? 150 : -150, life: 1.2 });
    this.tone(700, 0.05, "square", 0.04);
  }

  protected update(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 3); this.limeCd = Math.max(0, this.limeCd - dt); this.fiesta = Math.max(0, this.fiesta - dt);
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
    if (this.state !== "play") { if (this.pressed.a || this.pressed.up || this.pressed.down || this.pressed.left || this.pressed.right || this.pointer.down) this.beginGame(); return; }
    if (this.intro > 0) { this.intro -= dt; return; }
    if (this.pause > 0) { this.pause -= dt; return; }

    // ---- chef ----
    if (this.climbing) {
      const l = this.climbing; const cy = PLAT[this.chefPlat];
      let ny = cy; if (this.btn.up) ny -= 52 * dt; if (this.btn.down) ny += 52 * dt;
      this.chefX = l.x;
      // arrive on a platform
      const upP = this.platOf(l.hi), loP = this.platOf(l.lo);
      if (ny <= l.hi) { this.chefPlat = upP; this.climbing = null; }
      else if (ny >= l.lo) { this.chefPlat = loP; this.climbing = null; }
      else { /* mid-climb: track via chefPlat nearest */ this.chefPlat = this.platOf(ny); (this as any)._cy = ny; }
    } else {
      let mv = 0; if (this.btn.left) { mv = -1; this.faceR = false; } else if (this.btn.right) { mv = 1; this.faceR = true; }
      this.chefX = Math.max(WALL_L + 3, Math.min(WALL_R - 3, this.chefX + mv * 56 * dt));
      if (this.btn.up) { const l = this.ladderUp(this.chefX, this.chefPlat); if (l) this.climbing = l; }
      if (this.btn.down) { const l = this.ladderDown(this.chefX, this.chefPlat); if (l) this.climbing = l; }
      if (this.pressed.a) this.throwLime();
      // step ingredients on this platform
      for (const ing of this.ings) if (!ing.dropping && !ing.placed && ing.plat === this.chefPlat) {
        const ix = LANES[ing.lane] - ING_W / 2;
        if (this.chefX >= ix && this.chefX <= ix + ING_W) { const seg = Math.max(0, Math.min(3, Math.floor((this.chefX - ix) / SEG))); if (!ing.segs[seg]) { ing.segs[seg] = 1; this.tone(520 + seg * 40, 0.02, "square", 0.03); } if (ing.segs.every((s) => s)) this.dropIng(ing); }
      }
    }

    // ---- dropping ingredients ----
    for (const ing of this.ings) if (ing.dropping) {
      ing.y += 160 * dt;
      if (ing.y >= PLAT[PLATE] - this.placedPerLane[ing.lane] * 3) { ing.y = PLAT[PLATE] - this.placedPerLane[ing.lane] * 3; ing.dropping = false; ing.placed = true; this.placedPerLane[ing.lane]++; this.fxBurst(LANES[ing.lane], ing.y, ing.color, 6, 60); this.addShake(0.8);
        if (this.placedPerLane.every((p) => p >= 3)) { this.levelClear(); return; } }
    }

    // ---- limes ----
    for (let i = this.limes.length - 1; i >= 0; i--) { const l = this.limes[i]; l.x += l.vx * dt; l.life -= dt; if (l.x < WALL_L || l.x > WALL_R || l.life <= 0) { this.limes.splice(i, 1); continue; }
      for (const f of this.foes) if (f.stun <= 0 && Math.abs(f.x - l.x) < 7 && Math.abs(PLAT[f.plat] - l.y) < 8) { f.stun = 2.5; this.spicy = Math.min(1, this.spicy + 0.25); this.combo++; this.comboT = 2.5; this.addScore(30, f.x, PLAT[f.plat]); this.fxBurst(f.x, PLAT[f.plat] - 4, "#33e650", 8, 80); this.tone(880, 0.06, "square", 0.05); this.limes.splice(i, 1); if (this.spicy >= 1) { this.fiesta = 6; this.spicy = 0; this.fxPop(LW / 2, LH / 2, "FIESTA!", "#ffd24a"); this.music?.setIntensity(1); } break; }
    }

    // ---- foes ----
    this.foeT -= dt; if (this.foeT <= 0 && this.foes.length < this.w().foes) { this.foes.push({ x: LANES[Math.floor(this.rnd() * 3)], plat: 0, dir: this.rnd() < 0.5 ? -1 : 1, climbing: null, stun: 0, kind: this.rnd() < 0.5 ? 0 : 1 }); this.foeT = 3 + this.rnd() * 2; }
    const fs = (34 + this.level * 2) * this.w().speed;
    for (const f of this.foes) {
      if (f.stun > 0) { f.stun -= dt; continue; }
      // move toward chef
      if (f.plat === this.chefPlat && !f.climbing) { f.x += Math.sign(this.chefX - f.x) * fs * dt; }
      else if (!f.climbing) { // seek a ladder toward chef
        const wantUp = this.chefPlat < f.plat; const l = wantUp ? this.ladderDown(f.x, f.plat) : this.ladderUp(f.x, f.plat);
        const near = LADDERS.filter((L) => (wantUp ? L.hi === PLAT[f.plat] : L.lo === PLAT[f.plat]));
        if (l) f.climbing = l; else if (near.length) { const t = near.reduce((a, b) => Math.abs(b.x - this.chefX) < Math.abs(a.x - this.chefX) ? b : a); f.x += Math.sign(t.x - f.x) * fs * dt; }
      } else { const l = f.climbing; const wantUp = this.chefPlat < f.plat; f.x = l.x; const cur = PLAT[f.plat]; const ny = cur + (wantUp ? -1 : 1) * fs * dt; if (wantUp && ny <= l.hi) { f.plat = this.platOf(l.hi); f.climbing = null; } else if (!wantUp && ny >= l.lo) { f.plat = this.platOf(l.lo); f.climbing = null; } else (f as any)._cy = ny; }
      // catch chef
      if (!this.climbing && f.plat === this.chefPlat && Math.abs(f.x - this.chefX) < 7) { this.loseLife(); return; }
    }
  }

  // ---- draw ----
  protected render() {
    const w = this.w();
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#4a1520" : w.sky[0], w.sky[1]);
    for (const p of PLAT) { this.shelf(WALL_L, p + 1, WALL_R - WALL_L, 4, w.plat); for (let x = WALL_L; x < WALL_R; x += 6) this.rect(x, p + 3, 1, 1, "#00000040"); }
    for (const l of LADDERS) for (let y = l.hi; y < l.lo; y += 4) { this.rect(l.x - 3, y, 1, 3, "#e0a51f"); this.rect(l.x + 2, y, 1, 3, "#e0a51f"); this.rect(l.x - 3, y + 1, 6, 1, "#c98a1a"); }
    // plates
    for (const lx of LANES) this.rect(lx - ING_W / 2, PLAT[PLATE] + 2, ING_W, 2, "#cfc7ba");
    // ingredients
    for (const ing of this.ings) {
      const ix = LANES[ing.lane] - ING_W / 2; const y = ing.dropping || ing.placed ? ing.y : PLAT[ing.plat];
      for (let s = 0; s < 4; s++) { const sy = (ing.dropping || ing.placed) ? y : y - 3 + (ing.segs[s] ? 3 : 0); this.rect(ix + s * SEG, sy - 3, SEG - 1, 3, ing.color); this.rect(ix + s * SEG, sy - 3, SEG - 1, 1, "#ffffff33"); }
    }
    // limes
    for (const l of this.limes) { this.ball(l.x | 0, l.y | 0, 3, "#a4e635"); this.px(l.x | 0, (l.y | 0) - 1, "#d9f99d"); }
    // foes
    for (const f of this.foes) { const fy = ((f as any)._cy && f.climbing ? (f as any)._cy : PLAT[f.plat]) | 0; const col = f.stun > 0 ? "#5a5a6a" : f.kind === 0 ? "#e23b4e" : "#c9a0d0"; this.disc(f.x | 0, fy - 4, 4, col); this.rect((f.x | 0) - 3, fy - 1, 6, 3, col); this.px((f.x | 0) - 2, fy - 4, "#fff"); this.px((f.x | 0) + 2, fy - 4, "#fff"); if (f.kind === 0 && f.stun <= 0) this.px((f.x | 0), fy - 8, "#33e650"); }
    // chef
    const cy = (this.climbing && (this as any)._cy) ? (this as any)._cy : PLAT[this.chefPlat];
    const cx = this.chefX | 0, cyi = cy | 0;
    this.rect(cx - 3, cyi - 9, 6, 7, "#ffd24a"); this.rect(cx - 3, cyi - 9, 6, 1, "#fff1c0"); this.disc(cx, cyi - 11, 3, "#f0c9a0"); this.rect(cx - 3, cyi - 14, 6, 2, "#f4f0e8");
    this.rect(cx - 3, cyi - 2, 2, 2, "#2a2a3a"); this.rect(cx + 1, cyi - 2, 2, 2, "#2a2a3a");

    this.drawFx();

    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#ffe6c2", 1, false);
    this.text(120, 3, "SHIFT " + this.level, "#ffb020", 1, false);
    if (this.fiesta > 0) this.text(84, 3, "FIESTA", "#ffd24a", 1, false);
    // spicy meter
    this.rect(52, 4, 30, 4, "#3a1a1a"); this.rect(53, 5, Math.round(this.spicy * 28), 2, "#ff5d3d");
    for (let i = 0; i < 3; i++) this.disc(LW - 9 - i * 9, 6, 3, i < this.lives ? "#33e650" : "#3a2a2a");

    if (this.state === "play" && this.intro > 0) { this.b.globalAlpha = 0.55; this.rect(0, 78, LW, 34, "#0a0714"); this.b.globalAlpha = 1; this.textCenter(88, this.card, "#33e650", 2); }
    if (this.state !== "play") this.overlay();
  }
  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(38, "TACO STACK", "#33e650", 2);
      this.textCenter(62, "STEP EVERY LAYER TO THE PLATE", "#c3b4de", 1);
      this.textCenter(86, "ARROWS MOVE / CLIMB", "#83769c", 1);
      this.textCenter(98, "LIME STUNS THE CHASERS", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS LIME TO START", "#ffec27", 1);
    } else {
      this.textCenter(46, "KITCHEN CLOSED", "#ff5d7d", 2);
      this.textCenter(72, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(86, "BEST " + this.best, "#ffd24a", 1);
      this.textCenter(102, "REACHED SHIFT " + this.level, "#c3b4de", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS LIME TO RETRY", "#ffec27", 1);
    }
  }
}
