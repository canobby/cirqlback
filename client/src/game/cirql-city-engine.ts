// CIRQL CITY — the flagship. A SNES-style side-scroller where you revive a drained
// Main Street by running/jumping through it: bonk shop signs to light them, stomp
// BLANDCO's grey drones, grab a Spark perk, collect Cirql Coins, and reach the
// marquee to "CLOSE THE CIRQL" — a neon sweep rolls across the whole street and it
// erupts from dusk into blazing colour with customers pouring in.
//
// Built on RetroEngine (256×224, SNES-native): a scrolling camera, a tilemap and
// parallax are all added at this subclass level — no base-engine changes. The player
// is your customizable avatar; movement is the whole point, so it has momentum, a
// variable-height jump, coyote-time and jump-buffering, run vs walk, and squash/
// stretch. FEEL-FIRST vertical slice — one level, tuned to feel great.

import { RetroEngine, shade, mix, type RetroHooks } from "./retro-engine";
import { loadAvatarLS, type AvatarConfig } from "./avatar";
import { MusicKit, MAIN_STREET_THEME } from "./musickit";

const TILE = 16;
const GROUND_ROW = 11;                 // first solid ground row (of 14)
const LEVEL_W = 120;                   // tiles wide
const PITS: [number, number][] = [[34, 35], [66, 67]];
const PLATS: [number, number, number][] = [[18, 8, 4], [46, 6, 4], [72, 8, 4], [90, 9, 3]]; // tx, ty, wTiles
const SHOP_DEF: [number, number][] = [[10, 8], [24, 7], [40, 8], [58, 7], [80, 8], [100, 7]]; // sign tile x, y
const COIN_DEF: [number, number][] = [[8, 6], [26, 5], [45, 6], [62, 8], [84, 5], [101, 5], [112, 8]];
const PERK_DEF: [number, number][] = [[30, 8]];
const BOT_DEF: [number, number][] = [[16, 10], [50, 10], [78, 10], [95, 10]];
const FINISH_TX = 114;

const SHOP_ACCENTS = ["#ff8a3d", "#ff5d7d", "#3bb6ff", "#ffd24a", "#33e650", "#b79bff"];
const SHOP_NAMES = ["CAFE", "SLCE", "WASH", "SWTS", "MKT", "RECS"];

// physics — tuned for an expressive, forgiving, SNES-ish feel
const GRAV = 620;
const JUMP_V = -212;
const JUMP_SUSTAIN = 300;     // anti-gravity while holding jump (< GRAV → variable height, not flight)
const MAX_SUSTAIN = 0.28;
const WALK = 74, RUN = 120;
const ACCEL = 640, FRICTION = 760, AIR_ACCEL = 440;
const COYOTE = 0.09, BUFFER = 0.11;
const GLIDE_FALL = 42;

interface Shop { x: number; y: number; lit: boolean; accent: string; name: string }
interface Coin { x: number; y: number; got: boolean }
interface Perk { x: number; y: number; got: boolean }
interface Bot { x: number; y: number; vx: number; dead: boolean; t: number }
interface Cust { x: number; y: number; vx: number; body: string; t: number }

export class CirqlCityEngine extends RetroEngine {
  private hero: AvatarConfig;
  private cam = 0;
  private worldW = LEVEL_W * TILE;

  // player (hx/hy = collision-box top-left; NOT px/py — those are inherited draw methods)
  private hx = 0; private hy = 0;
  private readonly pw = 10; private readonly ph = 13;
  private vx = 0; private vy = 0;
  private onGround = false; private facing = 1;
  private coyote = 0; private buffer = 0; private sustain = 0; private jumpHeld = false;
  private squash = 0; private runBob = 0; private landDust = 0;
  private glideMeter = 0; private gliding = false;

  // world
  private solids: Uint8Array[] = [];
  private readonly W = LEVEL_W; private readonly H = 14;
  private shops: Shop[] = [];
  private coins: Coin[] = [];
  private perks: Perk[] = [];
  private bots: Bot[] = [];
  private custs: Cust[] = [];
  private finishX = FINISH_TX * TILE;
  private spawnX = 4 * TILE; private spawnY = 10 * TILE;

  // state
  private state: "ready" | "play" | "cirql" | "over" = "ready";
  private sparks = 0; private gotCoins = 0; private stomps = 0;
  private tPlay = 0; private sweepX = 0; private cirqlT = 0; private score = 0;
  private best = 0; private died = false;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, 256, 224);
    this.hero = loadAvatarLS();
    this.music = new MusicKit();
    this.buildWorld();
    try { this.best = +(window.localStorage.getItem("cirqlcity_best") || 0); } catch { /* ignore */ }
    this.running = true;          // self-run so the ready screen animates & takes input
    this.resetPlayer();
    this.emit();
  }

  protected onGesture() { this.music?.play(MAIN_STREET_THEME); this.music?.setIntensity(0.5); }

  private buildWorld() {
    // solids grid
    this.solids = Array.from({ length: this.H }, () => new Uint8Array(this.W));
    const inPit = (x: number) => PITS.some(([a, b]) => x >= a && x <= b);
    for (let y = GROUND_ROW; y < this.H; y++) for (let x = 0; x < this.W; x++) if (!inPit(x)) this.solids[y][x] = 1;
    for (const [tx, ty, w] of PLATS) for (let i = 0; i < w; i++) if (tx + i < this.W) this.solids[ty][tx + i] = 1;
    // entities
    this.shops = SHOP_DEF.map(([tx, ty], i) => ({ x: tx * TILE, y: ty * TILE, lit: false, accent: SHOP_ACCENTS[i % SHOP_ACCENTS.length], name: SHOP_NAMES[i % SHOP_NAMES.length] }));
    this.coins = COIN_DEF.map(([tx, ty]) => ({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2, got: false }));
    this.perks = PERK_DEF.map(([tx, ty]) => ({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2, got: false }));
    this.bots = BOT_DEF.map(([tx, ty]) => ({ x: tx * TILE, y: ty * TILE, vx: 26, dead: false, t: 0 }));
  }

  private resetPlayer() { this.hx = this.spawnX; this.hy = this.spawnY; this.vx = this.vy = 0; this.onGround = false; this.facing = 1; this.cam = 0; }

  private beginPlay() {
    this.state = "play"; this.tPlay = 0; this.sparks = this.gotCoins = this.stomps = 0; this.died = false;
    this.shops.forEach((s) => (s.lit = false)); this.coins.forEach((c) => (c.got = false)); this.perks.forEach((p) => (p.got = false));
    this.bots.forEach((b) => { b.dead = false; b.vx = Math.abs(b.vx); b.t = 0; }); this.custs = [];
    this.glideMeter = 0; this.resetPlayer(); this.clearFx(); this.music?.setIntensity(0.75); this.emit();
  }
  protected onStart() { this.beginPlay(); }
  protected onMenu() { this.state = "ready"; this.resetPlayer(); this.clearFx(); this.emit(); }

  private emit() { this.hooks.onHud?.({ state: this.state, sparks: this.sparks, shopsTotal: this.shops.length, coins: this.gotCoins, coinsTotal: this.coins.length, glide: this.glideMeter, best: this.best, score: this.score }); }

  // ---------- collision ----------
  private solidAt(wx: number, wy: number): boolean {
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    if (tx < 0 || ty < 0 || ty >= this.H || tx >= this.W) return false;
    return this.solids[ty][tx] === 1;
  }
  private boxHits(x: number, y: number): boolean {
    return this.solidAt(x, y) || this.solidAt(x + this.pw - 1, y) || this.solidAt(x, y + this.ph - 1) || this.solidAt(x + this.pw - 1, y + this.ph - 1) || this.solidAt(x + this.pw / 2, y + this.ph - 1);
  }

  protected update(dt: number) {
    if (this.state === "ready" || this.state === "over") { this.tPlay += dt; if (this.pressed.a) this.beginPlay(); return; }
    if (this.state === "cirql") { this.updateCirql(dt); return; }
    this.tPlay += dt;

    // horizontal: momentum, run vs walk
    const dir = (this.btn.right ? 1 : 0) - (this.btn.left ? 1 : 0);
    const target = dir * (this.btn.b ? RUN : WALK);
    const a = this.onGround ? (dir !== 0 ? ACCEL : FRICTION) : AIR_ACCEL;
    if (dir !== 0) this.facing = dir;
    if (this.vx < target) this.vx = Math.min(target, this.vx + a * dt);
    else if (this.vx > target) this.vx = Math.max(target, this.vx - a * dt);

    // jump: coyote + buffer + variable height
    if (this.pressed.a) this.buffer = BUFFER;
    this.buffer = Math.max(0, this.buffer - dt);
    this.coyote = this.onGround ? COYOTE : Math.max(0, this.coyote - dt);
    if (this.buffer > 0 && this.coyote > 0) {
      this.vy = JUMP_V; this.sustain = MAX_SUSTAIN; this.jumpHeld = true; this.buffer = this.coyote = 0; this.onGround = false; this.squash = -1;
      this.tone(360, 0.08, "square", 0.05); this.buzz(8);
    }
    if (!this.btn.a) this.jumpHeld = false;
    // glide
    this.gliding = false;
    if (!this.onGround && this.vy > 0 && this.btn.a && this.glideMeter > 0) { this.gliding = true; this.glideMeter = Math.max(0, this.glideMeter - dt); if (this.vy > GLIDE_FALL) this.vy = GLIDE_FALL; }
    // gravity
    if (this.jumpHeld && this.vy < 0 && this.sustain > 0) { this.vy += (GRAV - JUMP_SUSTAIN) * dt; this.sustain -= dt; }
    else this.vy += GRAV * dt;
    if (this.vy > 340) this.vy = 340;

    // integrate + resolve, axis-separated
    let nx = this.hx + this.vx * dt;
    if (this.boxHits(nx, this.hy)) { const step = this.vx > 0 ? 1 : -1; while (!this.boxHits(this.hx + step, this.hy) && Math.abs(this.hx - nx) > 0.5) this.hx += step; this.vx = 0; nx = this.hx; }
    this.hx = nx;
    const wasAir = !this.onGround; this.onGround = false;
    let ny = this.hy + this.vy * dt;
    if (this.boxHits(this.hx, ny)) {
      const step = this.vy > 0 ? 1 : -1;
      while (!this.boxHits(this.hx, this.hy + step) && Math.abs(this.hy - ny) > 0.5) this.hy += step;
      if (this.vy > 0) { this.onGround = true; if (wasAir && this.vy > 150) { this.squash = 1; this.landDust = 1; this.addShake(this.vy > 280 ? 1.4 : 0.7); this.noise(0.05, 0.03); } }
      this.vy = 0; ny = this.hy;
    }
    this.hy = ny;

    // sign bonks — rising into a floating sign lights the shop (signs aren't solid)
    if (this.vy < 0) this.bonkSigns();

    // bounds + fall death
    if (this.hx < 0) { this.hx = 0; this.vx = 0; }
    if (this.hx + this.pw > this.worldW) { this.hx = this.worldW - this.pw; this.vx = 0; }
    if (this.hy > this.H * TILE + 30) { this.die(); return; }

    this.squash += (0 - this.squash) * Math.min(1, dt * 14);
    this.runBob = this.onGround && Math.abs(this.vx) > 20 ? this.runBob + dt * Math.abs(this.vx) * 0.09 : 0;
    this.landDust = Math.max(0, this.landDust - dt * 4);

    this.pickups(); this.updateBots(dt); this.updateCam(dt);
    if (this.hx + this.pw > this.finishX && this.state === "play") this.startCirql();
    this.emit();
  }

  private overlapSign(s: Shop): boolean { return this.hx + this.pw > s.x && this.hx < s.x + TILE && this.hy < s.y + TILE && this.hy + this.ph > s.y; }
  private bonkSigns() { for (const s of this.shops) if (!s.lit && this.overlapSign(s)) this.lightShop(s); }
  private lightShop(s: Shop) {
    s.lit = true; this.sparks++;
    this.fxBurst(s.x + TILE / 2, s.y + TILE / 2, s.accent, 16, 120); this.fxRing(s.x + TILE / 2, s.y + TILE / 2, s.accent, 22); this.fxPop(s.x + TILE / 2, s.y - 4, "+100", s.accent, 1);
    this.addShake(0.8); this.hitstop(0.04); this.tone(520, 0.06, "square", 0.05); this.tone(780, 0.09, "square", 0.04); this.buzz(12);
    this.music?.setIntensity(Math.min(1, 0.75 + this.sparks * 0.03));
  }

  private pickups() {
    const cx = this.hx + this.pw / 2, cy = this.hy + this.ph / 2;
    for (const c of this.coins) if (!c.got && Math.abs(c.x - cx) < 11 && Math.abs(c.y - cy) < 12) { c.got = true; this.gotCoins++; this.fxBurst(c.x, c.y, "#ffd24a", 10, 90); this.fxPop(c.x, c.y - 4, "COIN", "#ffd24a", 1); this.tone(880, 0.05, "square", 0.05); this.tone(1174, 0.07, "square", 0.04); this.buzz(8); }
    for (const p of this.perks) if (!p.got && Math.abs(p.x - cx) < 12 && Math.abs(p.y - cy) < 13) { p.got = true; this.glideMeter = 4; this.fxBurst(p.x, p.y, "#7be0ff", 20, 130); this.fxRing(p.x, p.y, "#7be0ff", 20); this.fxPop(p.x, p.y - 6, "GLIDE!", "#7be0ff", 1); this.addShake(1); this.hitstop(0.05); this.tone(440, 0.05, "square", .05); this.tone(660, 0.05, "square", .05); this.tone(880, 0.12, "square", .05); }
  }

  private updateBots(dt: number) {
    for (const b of this.bots) {
      if (b.dead) { b.t += dt; continue; }
      b.t += dt;
      const nx = b.x + b.vx * dt;
      const footAhead = this.solidAt(nx + (b.vx > 0 ? TILE : 0), b.y + TILE + 2);
      const wallAhead = this.solidAt(nx + (b.vx > 0 ? TILE - 1 : 0), b.y + TILE / 2);
      if (!footAhead || wallAhead) b.vx = -b.vx; else b.x = nx;
      if (!this.solidAt(b.x + TILE / 2, b.y + TILE + 1)) b.y += 80 * dt;
      if (this.hx + this.pw > b.x + 2 && this.hx < b.x + TILE - 2 && this.hy + this.ph > b.y + 2 && this.hy < b.y + TILE) {
        if (this.vy > 40 && this.hy + this.ph < b.y + TILE * 0.7) {
          b.dead = true; b.t = 0; this.stomps++; this.vy = JUMP_V * 0.72; this.buffer = 0;
          this.fxBurst(b.x + TILE / 2, b.y + TILE / 2, "#9aa4b8", 14, 110); this.fxPop(b.x + TILE / 2, b.y - 4, "BONK!", "#c2c3c7", 1);
          this.addShake(1.1); this.hitstop(0.05); this.noise(0.06, 0.05); this.tone(300, 0.08, "square", 0.05); this.buzz(14);
        } else if (this.state === "play") { this.die(); return; }
      }
    }
  }

  private die() { this.died = true; this.state = "over"; this.score = this.tally(); this.addShake(2.4); this.hitstop(0.08); this.noise(0.2, 0.06); this.tone(200, 0.3, "square", 0.05); this.music?.setIntensity(0.2); this.finishRun(); this.emit(); }
  private tally() { return this.sparks * 100 + this.gotCoins * 250 + this.stomps * 60 + (this.died ? 0 : Math.max(0, 600 - Math.floor(this.tPlay * 10))); }

  private startCirql() { this.state = "cirql"; this.cirqlT = 0; this.sweepX = this.cam; this.vx = this.vy = 0; this.music?.setIntensity(1); this.tone(523, 0.1, "square", 0.05); this.tone(659, 0.1, "square", 0.05); this.tone(784, 0.16, "square", 0.05); }
  private updateCirql(dt: number) {
    this.cirqlT += dt;
    const prev = this.sweepX;
    this.sweepX = Math.min(this.worldW, this.sweepX + 150 * dt);
    for (const s of this.shops) if (!s.lit && s.x < this.sweepX) this.lightShop(s);
    if (Math.floor(prev / 26) !== Math.floor(this.sweepX / 26)) {
      this.fxBurst(this.sweepX, 20 + Math.random() * 50, ["#ff5d7d", "#ffd24a", "#3bb6ff", "#33e650"][Math.floor(Math.random() * 4)], 12, 150, 20);
      if (this.custs.length < 40) this.custs.push({ x: this.sweepX - 10 - Math.random() * 20, y: GROUND_ROW * TILE, vx: 10 + Math.random() * 14, body: ["#ff5d7d", "#3bb6ff", "#ffd24a", "#33e650", "#ff77a8"][Math.floor(Math.random() * 5)], t: 0 });
    }
    for (const c of this.custs) { c.x += c.vx * dt; c.t += dt; }
    this.cam += (Math.max(0, Math.min(this.worldW - this.LW, this.sweepX - this.LW * 0.5)) - this.cam) * Math.min(1, dt * 3);
    if (this.cam < 0) this.cam = 0;
    if (this.sweepX >= this.worldW && this.cirqlT > 2.6) { this.state = "over"; this.score = this.tally(); this.finishRun(); }
    this.emit();
  }

  private finishRun() { if (this.score > this.best) { this.best = this.score; try { window.localStorage.setItem("cirqlcity_best", String(this.best)); } catch { /* ignore */ } } this.hooks.onRunEnd?.({ score: this.score, shift: this.sparks, sparks: this.sparks, coins: this.gotCoins, revived: !this.died }); }

  private updateCam(dt: number) { const lead = this.facing * 26; const target = Math.max(0, Math.min(this.worldW - this.LW, this.hx + this.pw / 2 - this.LW / 2 + lead)); this.cam += (target - this.cam) * Math.min(1, dt * 6); }

  // ---------- render ----------
  protected render() {
    const cam = Math.round(this.cam);
    const swept = this.state === "cirql" || (this.state === "over" && !this.died) ? this.sweepX : -1;
    const vibAt = (wx: number) => (swept < 0 ? 0 : wx < swept ? 1 : 0);
    const overallVib = swept < 0 ? 0 : Math.min(1, this.sweepX / this.worldW);

    this.drawSky(overallVib);
    this.drawParallax(cam, overallVib);
    this.drawTiles(cam, vibAt);
    this.drawShops(cam, vibAt);
    this.drawCoinsPerks(cam);
    this.drawBots(cam);
    if (this.custs.length) this.drawCusts(cam);
    this.drawFinish(cam, vibAt);
    if (this.state !== "over" || !this.died) this.drawPlayer(cam);
    this.drawFx();
    this.drawHudBar();

    if (this.state === "ready") this.drawReady();
    if (this.state === "cirql") this.drawCirqlBanner();
    if (this.state === "over") this.drawOver();
  }

  private drawSky(v: number) { this.vgrad(0, 0, this.LW, this.LH, mix("#241a4e", "#3aa0e0", v), mix("#6a4a7a", "#bfe8ff", v)); this.disc(210, 34, 12, mix("#ffd9a0", "#fff6d0", v)); }
  private drawParallax(cam: number, v: number) {
    const far = mix("#3a3062", "#7a9ad0", v), ox = -((cam * 0.25) % 64);
    for (let x = ox; x < this.LW; x += 64) { this.rect(x, 120, 26, 60, far); this.rect(x + 30, 100, 20, 80, shade(far, -0.08)); this.rect(x + 52, 128, 14, 52, far); }
    const mid = mix("#4a3f74", "#8a7ad0", v), ox2 = -((cam * 0.5) % 48);
    for (let x = ox2; x < this.LW; x += 48) { this.rect(x, 138, 34, 46, mid); for (let wy = 144; wy < 180; wy += 8) for (let wx = x + 3; wx < x + 30; wx += 8) this.rect(wx, wy, 4, 4, mix("#2a2450", "#ffe9a0", v * 0.8)); }
  }
  private drawTiles(cam: number, vibAt: (x: number) => number) {
    const t0 = Math.floor(cam / TILE), t1 = Math.ceil((cam + this.LW) / TILE);
    for (let ty = 0; ty < this.H; ty++) for (let tx = t0; tx <= t1; tx++) {
      if (tx < 0 || tx >= this.W || this.solids[ty][tx] !== 1) continue;
      const sx = tx * TILE - cam, v = vibAt(tx * TILE), base = mix("#4a4560", "#8a90a8", v), isTop = ty === 0 || this.solids[ty - 1]?.[tx] !== 1;
      this.shelf(sx, ty * TILE, TILE, TILE, base);
      if (isTop) { this.rect(sx, ty * TILE, TILE, 3, mix("#6a6a86", "#c8d0e0", v)); this.rect(sx, ty * TILE, TILE, 1, mix("#8a8aa6", "#eef4ff", v)); }
      this.rect(sx, ty * TILE + 8, TILE, 1, shade(base, -0.25));
    }
  }
  private drawShops(cam: number, vibAt: (x: number) => number) {
    const groundY = GROUND_ROW * TILE;
    for (const s of this.shops) {
      const sx = s.x - cam; if (sx < -TILE * 3 || sx > this.LW + TILE) continue;
      const lit = s.lit || vibAt(s.x) > 0;
      this.rect(sx - TILE, groundY - 34, TILE * 3, 34, mix("#3a3648", "#e9e2d6", lit ? 0.55 : 0.1));
      this.shelf(sx - TILE, groundY - 34, TILE * 3, 4, lit ? s.accent : "#5a5568");
      this.rect(sx - TILE + 3, groundY - 26, TILE * 3 - 6, 14, lit ? shade(s.accent, 0.4) : "#2a2838");
      this.rect(sx + 2, groundY - 12, 8, 12, lit ? shade(s.accent, -0.2) : "#20202e");
      // floating sign (bonk target) + tether
      this.rect(sx + TILE / 2 - 1, s.y + TILE, 2, groundY - 34 - (s.y + TILE), lit ? shade(s.accent, -0.2) : "#3a3648");
      this.shelf(sx, s.y, TILE, TILE, lit ? s.accent : "#5a5568");
      this.rectLine(sx, s.y, TILE, TILE, lit ? shade(s.accent, 0.4) : "#6a6578");
      this.textCenterAt(sx + TILE / 2, s.y + 5, s.name, lit ? "#0a0714" : "#8a8598");
      if (lit) this.ring(sx + TILE / 2, s.y + TILE / 2, 10 + Math.round(Math.sin(this.tPlay * 6) * 1.5), s.accent, 1.4);
    }
  }
  private textCenterAt(cx: number, y: number, s: string, c: string) { this.text(Math.round(cx - this.textWidth(s, 1) / 2), y, s, c, 1, false); }

  private drawCoinsPerks(cam: number) {
    for (const c of this.coins) { if (c.got) continue; const sx = c.x - cam; if (sx < -8 || sx > this.LW + 8) continue; const bob = Math.sin(this.tPlay * 4 + c.x) * 2; this.ring(sx, c.y + bob, 5, "#ffd24a", 1.6); this.disc(sx, c.y + bob, 2, "#ffec9a"); this.px(sx - 1, c.y + bob - 2, "#fff"); }
    for (const p of this.perks) { if (p.got) continue; const sx = p.x - cam; if (sx < -8 || sx > this.LW + 8) continue; const bob = Math.sin(this.tPlay * 5 + p.x) * 2; this.ball(sx, p.y + bob, 6, "#3bb6ff"); this.ring(sx, p.y + bob, 8 + Math.round(Math.sin(this.tPlay * 8) * 1.5), "#7be0ff", 1.2); this.text(sx - 2, p.y + bob - 2, "S", "#fff", 1, false); }
  }
  private drawBots(cam: number) {
    for (const b of this.bots) {
      const sx = b.x - cam; if (sx < -TILE || sx > this.LW + TILE) continue;
      if (b.dead) { if (b.t < 0.5) this.rect(sx + 2, b.y + TILE - 4, TILE - 4, 4, "#5a5568"); continue; }
      this.shelf(sx + 2, b.y + 3, TILE - 4, TILE - 4, "#6a6f82");
      this.rect(sx + 3, b.y + 4, TILE - 6, 3, "#8a90a4");
      const ex = sx + TILE / 2 + (b.vx > 0 ? 2 : -2);
      this.rect(ex - 2, b.y + 7, 5, 3, "#20242e"); this.px(ex + (b.vx > 0 ? 1 : -1), b.y + 8, "#ff4d6d");
      this.rect(sx + 3, b.y + TILE - 1, 3, 2, "#3a3f4c"); this.rect(sx + TILE - 6, b.y + TILE - 1, 3, 2, "#3a3f4c");
    }
  }
  private drawCusts(cam: number) {
    for (const c of this.custs) { const sx = c.x - cam; if (sx < -6 || sx > this.LW + 6) continue; const step = Math.sin(c.t * 10) > 0 ? 1 : 0; this.rect(sx - 1, c.y - 6, 4, 4, c.body); this.px(sx, c.y - 7, "#f4c79a"); this.rect(sx - 1, c.y - 2, 1, 2 + step, shade(c.body, -0.3)); this.rect(sx + 1, c.y - 2, 1, 3 - step, shade(c.body, -0.3)); }
  }
  private drawFinish(cam: number, vibAt: (x: number) => number) {
    const sx = this.finishX - cam; if (sx < -30 || sx > this.LW + 30) return;
    const top = GROUND_ROW * TILE - 60, v = vibAt(this.finishX);
    this.rect(sx + 6, top, 3, 60, "#8a8276");
    this.shelf(sx - 14, top, 40, 16, mix("#5a5568", "#ffd24a", v));
    this.textCenterAt(sx + 6, top + 5, "CIRQL", mix("#c2c3c7", "#0a0714", v));
  }
  private drawPlayer(cam: number) {
    const cx = Math.round(this.hx + this.pw / 2 - cam), feet = Math.round(this.hy + this.ph);
    const bob = this.onGround ? Math.round(Math.sin(this.runBob) * 1.2) : 0;
    if (this.landDust > 0.02 && this.onGround) { const n = Math.round(this.landDust * 4); for (let i = 0; i < n; i++) this.px(cx - 6 + i * 3, feet - 1, "#c8d0e0"); }
    if (this.gliding) { this.ring(cx, feet - 8, 11, "#7be0ff", 1.2); }
    const lean = Math.round(this.facing * Math.min(2, Math.abs(this.vx) / 60));
    this.avatar(cx + lean, feet + bob, this.hero);
    if (this.onGround && Math.abs(this.vx) > 90 && Math.random() < 0.4) this.fxBurst(this.hx + this.pw / 2 - this.facing * 6, this.hy + this.ph - 1, "#7be0ff", 1, 30, 10);
  }

  // ---------- HUD + overlays ----------
  private drawHudBar() {
    this.rect(0, 0, this.LW, 12, "#0a071288");
    this.text(4, 3, "SPARK", "#ffd24a", 1, false); this.text(34, 3, `${this.sparks}/${this.shops.length}`, "#fff1e8", 1, false);
    this.text(70, 3, "COIN", "#ffec27", 1, false); this.text(96, 3, `${this.gotCoins}/${this.coins.length}`, "#fff1e8", 1, false);
    if (this.glideMeter > 0) { this.text(130, 3, "GLIDE", "#7be0ff", 1, false); this.rect(162, 4, 30, 4, "#1a2b53"); this.rect(162, 4, Math.round(30 * this.glideMeter / 4), 4, "#7be0ff"); }
    this.textCenterAt(this.LW - 28, 3, `${this.tally()}`.padStart(5, "0"), "#c2c3c7");
  }
  private drawReady() {
    this.rect(0, 0, this.LW, this.LH, "#0a071496");
    this.textCenter(52, "CIRQL CITY", "#ffd24a", 3);
    this.textCenter(80, "MAIN STREET HAS GONE DARK", "#c2c3c7", 1);
    this.textCenter(92, "LIGHT EVERY SHOP - CLOSE THE CIRQL", "#83769c", 1);
    this.textCenter(120, "MOVE   RUN   JUMP", "#7be0ff", 1);
    if (Math.floor(this.tPlay * 2) % 2 === 0) this.textCenter(146, "PRESS JUMP TO START", "#fff1e8", 1);
    this.textCenter(180, "JUMP UP INTO A SIGN TO LIGHT ITS SHOP", "#5f574f", 1);
  }
  private drawCirqlBanner() {
    this.rect(0, 22, this.LW, 18, "#0a0714aa");
    this.textCenter(26, "CLOSE THE CIRQL!", "#ffd24a", 2);
    if (this.sweepX >= this.worldW) { this.rect(0, 92, this.LW, 44, "#0a0714c8"); this.textCenter(98, "MAIN STREET REVIVED", "#33e650", 2); this.textCenter(120, `SCORE  ${this.tally()}`, "#fff1e8", 1); }
  }
  private drawOver() {
    this.rect(0, 0, this.LW, this.LH, "#0a0714b4");
    if (this.died) { this.textCenter(78, "BLANDCO WINS", "#ff4d6d", 2); this.textCenter(102, "THE STREET DIMS...", "#c2c3c7", 1); }
    else { this.textCenter(78, "MAIN STREET REVIVED", "#33e650", 2); this.textCenter(102, `SHOPS ${this.sparks}/${this.shops.length}   COINS ${this.gotCoins}/${this.coins.length}`, "#c2c3c7", 1); }
    this.textCenter(128, `SCORE  ${this.score}    BEST  ${this.best}`, "#fff1e8", 1);
    if (Math.floor(this.tPlay * 2) % 2 === 0) this.textCenter(152, "PRESS JUMP TO PLAY AGAIN", "#7be0ff", 1);
  }
}
