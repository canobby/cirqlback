// slice-route-engine — Main Street cabinet #2 (Paperboy homage). Ride the delivery
// scooter up a scrolling street; steer across the road and lob pizzas onto the
// porches that ordered (matching the side) while dodging cars, cones and hydrants.
// Signature twist: BRANCHING STREETS — at the end of each street pick an easy or a
// risky route (more orders + a score multiplier). Worlds: Suburbs → Downtown →
// Boardwalk. Built on RetroEngine (16-bit + juice) + MusicKit; you are the courier.

import { RetroEngine, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";
import { avatarForShop, loadAvatarLS, type AvatarConfig } from "./avatar";

const LW = 240, LH = 180;
const ROAD_L = 86, ROAD_R = 154;
const SCOOT_Y = 150;
const PORCH_X = { L: 42, R: 198 };
const BEST_KEY = "slice_best";

interface Order { side: "L" | "R"; y: number; done: boolean; }
interface Obstacle { x: number; y: number; kind: "car" | "cone" | "hydrant"; }
interface Pizza { x: number; y: number; vx: number; vy: number; life: number; }

interface World { name: string; road: string; walk: string; house: string; roof: string; speed: number; obst: number; }
const WORLDS: World[] = [
  { name: "SUBURBS", road: "#4a4a55", walk: "#6b7a55", house: "#a85a34", roof: "#c94f4f", speed: 1.0, obst: 0.5 },
  { name: "DOWNTOWN", road: "#3a3a46", walk: "#5a5a6a", house: "#5a6a8a", roof: "#3f4f6f", speed: 1.28, obst: 0.85 },
  { name: "BOARDWALK", road: "#6a5a44", walk: "#3a7a7a", house: "#c98a4a", roof: "#e0625a", speed: 1.55, obst: 1.1 },
];

const SLICE_THEME: Track = {
  bpm: 150,
  layers: [
    { role: "lead", wave: "square", gain: 0.4, pattern: [
      { n: "E5", d: 2 }, { n: "G5", d: 1 }, { n: "E5", d: 1 }, { n: "A5", d: 2 }, { n: "G5", d: 2 }, { n: "E5", d: 2 }, { n: "D5", d: 2 }, { n: "E5", d: 4 },
      { n: "C5", d: 2 }, { n: "E5", d: 1 }, { n: "C5", d: 1 }, { n: "G5", d: 2 }, { n: "E5", d: 2 }, { n: "D5", d: 2 }, { n: "B4", d: 2 }, { n: "C5", d: 4 },
    ] },
    { role: "harmony", wave: "square", gain: 0.18, minIntensity: 0.4, pattern: [{ n: 0, d: 2 }, { n: "B4", d: 2 }, { n: 0, d: 2 }, { n: "A4", d: 2 }] },
    { role: "bass", wave: "triangle", gain: 0.5, pattern: [{ n: "A2", d: 2 }, { n: "A2", d: 2 }, { n: "E2", d: 2 }, { n: "E2", d: 2 }, { n: "F2", d: 2 }, { n: "F2", d: 2 }, { n: "G2", d: 2 }, { n: "G2", d: 2 }] },
    { role: "drums", minIntensity: 0.2, pattern: [{ n: "K", d: 2 }, { n: "H", d: 1 }, { n: "H", d: 1 }, { n: "S", d: 2 }, { n: "H", d: 2 }] },
  ],
};

export class SliceRouteEngine extends RetroEngine {
  private state: "ready" | "play" | "fork" | "over" = "ready";
  private av: AvatarConfig;

  private sx = (ROAD_L + ROAD_R) / 2;
  private orders: Order[] = [];
  private obstacles: Obstacle[] = [];
  private pizzas: Pizza[] = [];
  private scrollY = 0;

  private score = 0;
  private lives = 3;
  private street = 1;
  private combo = 0;
  private comboT = 0;
  private best = +(LS.get(BEST_KEY) || 0);
  private mult = 1;

  private world = 0;
  private ordersTarget = 0;
  private spawnedOrders = 0;
  private orderT = 0;
  private obstT = 0;
  private throwCd = 0;
  private invuln = 0;
  private flash = 0;
  private card = "";
  private intro = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.av = avatarForShop(loadAvatarLS(), "slice");
    this.music = new MusicKit({ volume: 0.45 });
    this.start();
  }
  protected onGesture() { this.music?.play(SLICE_THEME); }

  private w() { return WORLDS[this.world]; }
  private scrollSpeed() { return (34 + this.street * 3) * this.w().speed; }

  private newStreet() {
    this.world = Math.floor((this.street - 1) / 3) % WORLDS.length;
    this.orders = []; this.obstacles = []; this.pizzas = [];
    this.ordersTarget = 4 + this.street + Math.round(this.mult > 1 ? 3 : 0);
    this.spawnedOrders = 0; this.orderT = 0.8; this.obstT = 1.2;
    this.card = ((this.street - 1) % 3 === 0 ? "WORLD " + (this.world + 1) + "  " + this.w().name : "STREET " + this.street) + (this.mult > 1 ? "  -  RISKY x" + this.mult : "");
    this.intro = 1.6;
  }
  private beginGame() {
    this.score = 0; this.lives = 3; this.street = 1; this.combo = 0; this.mult = 1; this.sx = (ROAD_L + ROAD_R) / 2;
    this.clearFx(); this.newStreet(); this.state = "play"; this.music?.setIntensity(0.5); this.report();
  }
  private gameOver() {
    this.state = "over";
    if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); }
    this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(5);
    this.hooks.onRunEnd?.({ score: this.score, shift: this.street }); this.report();
  }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: this.lives, shift: this.street, combo: this.combo }); }

  private crash(x: number, y: number) {
    this.lives--; this.combo = 0; this.flash = 1; this.invuln = 1.2; this.addShake(4); this.hitstop(0.05); this.buzz(70);
    this.fxShards(x, y, "#c94f4f", 8); this.fxBurst(x, y, "#ffb020", 8, 90); this.noise(0.14, 0.06); this.tone(150, 0.14, "square", 0.05); this.fxPop(x, y - 8, "CRASH!", "#ff5d7d");
    if (this.lives <= 0) this.gameOver(); else this.report();
  }

  private throwPizza() {
    if (this.throwCd > 0) return; this.throwCd = 0.2;
    const dir = this.btn.left ? "L" : this.btn.right ? "R" : null;
    // aim: an order on the chosen side (or nearest either side) within the throw window
    let target: Order | null = null, bestD = 28;
    for (const o of this.orders) { if (o.done) continue; if (dir && o.side !== dir) continue; const d = Math.abs(o.y - SCOOT_Y); if (d < bestD) { bestD = d; target = o; } }
    const side = target ? target.side : dir || (this.sx < (ROAD_L + ROAD_R) / 2 ? "L" : "R");
    const px = PORCH_X[side];
    this.pizzas.push({ x: this.sx, y: SCOOT_Y - 6, vx: (px - this.sx) * 1.9, vy: -60, life: 0.5 });
    this.tone(680, 0.05, "square", 0.04);
    if (target) {
      target.done = true; this.combo++; this.comboT = 2.2;
      const gain = 15 * this.combo * this.mult; this.score += gain;
      this.fxBurst(PORCH_X[side], target.y, "#ffd24a", 8, 80); this.fxPop(PORCH_X[side], target.y - 6, "+" + gain, this.combo > 1 ? "#ffd24a" : "#fff4ea");
      if (this.combo >= 3 && this.combo % 3 === 0) this.fxPop(PORCH_X[side], target.y - 16, "STREAK x" + this.combo, "#ff9ec2");
      this.tone(920, 0.05, "square", 0.045); this.music?.setIntensity(Math.min(1, 0.5 + this.combo * 0.07));
    }
  }

  protected update(dt: number) {
    this.throwCd -= dt; this.flash = Math.max(0, this.flash - dt * 3); this.invuln = Math.max(0, this.invuln - dt);
    const scroll = this.scrollSpeed() * dt;
    this.scrollY += scroll;

    // pizzas (cosmetic arc)
    for (const p of this.pizzas) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; p.life -= dt; }
    this.pizzas = this.pizzas.filter((p) => p.life > 0);

    if (this.state === "ready" || this.state === "over") { if (this.pressed.a || this.pressed.up || this.pressed.down || this.pointer.down) this.beginGame(); return; }

    if (this.state === "fork") {
      if (this.pressed.left) { this.mult = 1; this.advanceStreet(); }
      else if (this.pressed.right) { this.mult = 2; this.advanceStreet(); }
      return;
    }

    if (this.intro > 0) { this.intro -= dt; return; }

    // steer
    const steer = 88 * dt * 2.4;
    if (this.btn.left) this.sx -= steer;
    if (this.btn.right) this.sx += steer;
    this.sx = Math.max(ROAD_L + 6, Math.min(ROAD_R - 6, this.sx));
    if (this.pressed.a) this.throwPizza();
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }

    // spawn orders
    if (this.spawnedOrders < this.ordersTarget) {
      this.orderT -= dt;
      if (this.orderT <= 0) { this.orders.push({ side: this.rnd() < 0.5 ? "L" : "R", y: -8, done: false }); this.spawnedOrders++; this.orderT = (1.1 - this.street * 0.03) * (0.7 + this.rnd() * 0.8); }
    }
    // spawn obstacles
    this.obstT -= dt;
    if (this.obstT <= 0) {
      const kinds: Obstacle["kind"][] = ["car", "cone", "hydrant"];
      this.obstacles.push({ x: ROAD_L + 8 + this.rnd() * (ROAD_R - ROAD_L - 16), y: -10, kind: kinds[Math.floor(this.rnd() * 3)] });
      this.obstT = (1.5 - this.w().obst) * (0.6 + this.rnd() * 0.9);
    }

    // scroll orders
    for (const o of this.orders) o.y += scroll;
    for (let i = this.orders.length - 1; i >= 0; i--) { const o = this.orders[i]; if (o.y > LH + 8) { if (!o.done) { this.combo = 0; this.fxPop(PORCH_X[o.side], LH - 12, "MISSED", "#8a8276"); } this.orders.splice(i, 1); } }

    // scroll obstacles + collide
    for (const ob of this.obstacles) ob.y += scroll;
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const ob = this.obstacles[i];
      if (ob.y > LH + 8) { this.obstacles.splice(i, 1); continue; }
      if (this.invuln <= 0 && Math.abs(ob.x - this.sx) < 9 && Math.abs(ob.y - SCOOT_Y) < 9) { this.obstacles.splice(i, 1); this.crash(this.sx, SCOOT_Y); }
    }

    // street cleared?
    if (this.spawnedOrders >= this.ordersTarget && this.orders.length === 0) {
      const bonus = 30 * this.street; this.score += bonus;
      this.fxRing(120, 90, "#ffd24a", 60); this.fxPop(120, 84, "STREET CLEAR +" + bonus, "#ffd24a"); this.music?.playJingle(CLEAR_JINGLE, 165);
      this.street++; this.state = "fork"; this.report();
    }
  }
  private advanceStreet() { this.newStreet(); this.state = "play"; this.report(); }

  // ---- draw ----
  private drawHouses(x0: number, w: number) {
    const per = 40; const off = this.scrollY % per;
    for (let y = -per + off; y < LH + per; y += per) {
      this.rect(x0, y + 6, w, per - 8, this.w().house); this.rect(x0, y + 6, w, 1, "#ffffff22");
      this.rect(x0 + 2, y, w - 4, 7, this.w().roof); // roof
      this.rect(x0 + 4, y + 12, 6, 6, "#ffd24a"); this.rect(x0 + w - 10, y + 12, 6, 6, "#ffd24a"); // windows
      this.rect(x0 + w / 2 - 3, y + 22, 6, 10, "#3a2415"); // door
    }
  }

  protected render() {
    const w = this.w();
    this.rect(0, 0, LW, LH, w.walk);
    this.drawHouses(2, 44); this.drawHouses(LW - 46, 44);
    // road
    this.rect(ROAD_L, 0, ROAD_R - ROAD_L, LH, w.road);
    this.rect(ROAD_L, 0, 2, LH, "#c8c8b0"); this.rect(ROAD_R - 2, 0, 2, LH, "#c8c8b0");
    for (let y = (this.scrollY % 24) - 24; y < LH; y += 24) this.rect((ROAD_L + ROAD_R) / 2 - 1, y, 2, 12, "#ffe27a"); // centre dashes

    // orders (glowing porch markers with a side arrow)
    for (const o of this.orders) { if (o.done) continue; const x = PORCH_X[o.side]; const pulse = 0.5 + 0.5 * Math.sin(this.scrollY * 0.2 + o.y); this.rect(x - 5, o.y - 5, 10, 10, "#ffd24a"); this.rect(x - 3, o.y - 3, 6, 6, pulse > 0.5 ? "#ff5d7d" : "#e23b4e"); this.px(o.side === "L" ? x + 6 : x - 6, o.y, "#ffec27"); }

    // obstacles
    for (const ob of this.obstacles) {
      if (ob.kind === "car") { this.rect(ob.x - 5, ob.y - 6, 10, 12, "#3bb6ff"); this.rect(ob.x - 5, ob.y - 6, 10, 2, "#bfe6ff"); this.rect(ob.x - 4, ob.y - 3, 8, 3, "#0a1a2a"); }
      else if (ob.kind === "cone") { this.rect(ob.x - 3, ob.y, 6, 3, "#ff8a3d"); this.rect(ob.x - 2, ob.y - 3, 4, 3, "#ff8a3d"); this.px(ob.x, ob.y - 4, "#ffce9a"); }
      else { this.rect(ob.x - 2, ob.y - 3, 4, 7, "#e23b4e"); this.rect(ob.x - 4, ob.y - 1, 8, 2, "#e23b4e"); }
    }

    // scooter (courier avatar) — blink while invulnerable
    if (this.invuln <= 0 || Math.floor(this.scrollY * 0.3) % 2 === 0) {
      this.disc(this.sx - 4, SCOOT_Y + 8, 3, "#151515"); this.disc(this.sx + 4, SCOOT_Y + 8, 3, "#151515");
      this.shelf(this.sx - 6, SCOOT_Y + 2, 13, 5, "#e23b4e");
      this.avatar(this.sx + 1, SCOOT_Y + 2, this.av);
    }
    // pizzas in flight
    for (const p of this.pizzas) { this.ball(p.x | 0, p.y | 0, 3, "#f0b429"); this.px((p.x | 0) - 1, p.y | 0, "#c0392b"); }

    this.drawFx();

    // HUD
    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#ffe6c2", 1, false);
    this.text(112, 3, "W" + (this.world + 1) + " ST" + this.street, "#ffb020", 1, false);
    if (this.combo > 1) this.text(80, 3, "x" + this.combo, "#ffd24a", 1, false);
    for (let i = 0; i < 3; i++) this.disc(LW - 9 - i * 9, 6, 3, i < this.lives ? "#ff4d6d" : "#3a2a2a");

    if (this.state === "play" && this.intro > 0) this.introCard();
    if (this.state === "fork") this.forkCard();
    if (this.state === "ready" || this.state === "over") this.overlay();
  }

  private introCard() {
    this.b.globalAlpha = 0.55; this.rect(0, 62, LW, 54, "#0a0714"); this.b.globalAlpha = 1;
    this.textCenter(78, this.card.split("  -  ")[0], this.mult > 1 ? "#ff5d7d" : "#ffd24a", 2);
    if (this.mult > 1) this.textCenter(100, "RISKY ROUTE  x" + this.mult, "#ff9ec2", 1);
  }
  private forkCard() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    this.textCenter(46, "FORK AHEAD", "#ffd24a", 2);
    this.textCenter(72, "CHOOSE YOUR ROUTE", "#c3b4de", 1);
    this.text(28, 100, "< LEFT", "#7be0c2", 1); this.textCenter(100, "", "#fff", 1); this.text(160, 100, "RIGHT >", "#ff9ec2", 1);
    this.text(24, 112, "CALM  x1", "#83769c", 1); this.text(158, 112, "RISKY x2", "#ff9ec2", 1);
    if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 16, "STEER TO CHOOSE", "#ffec27", 1);
  }
  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(40, "SLICE ROUTE", "#ff5d7d", 2);
      this.textCenter(64, "DELIVER THE ORDERS", "#c3b4de", 1);
      this.textCenter(90, "LEFT RIGHT  STEER", "#83769c", 1);
      this.textCenter(102, "THROW  LOB A PIZZA", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS THROW TO START", "#ffec27", 1);
    } else {
      this.textCenter(46, "OUT OF TIME", "#ff5d7d", 2);
      this.textCenter(72, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(86, "BEST " + this.best, "#ffd24a", 1);
      this.textCenter(102, "REACHED W" + (this.world + 1) + " ST " + this.street, "#c3b4de", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS THROW TO RETRY", "#ffec27", 1);
    }
  }
}
