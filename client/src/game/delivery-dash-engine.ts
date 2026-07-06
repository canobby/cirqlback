// DELIVERY DASH — a Jetpack-Joyride homage, a MODERN cabinet (CHR-203).
//
// A courier straps on a parcel-rocket and blasts down the delivery route. HOLD to fire
// the thruster and rise, release to drop — thread the gap between the stacked crates,
// grab the coins strung through the openings, and go the distance. Clip a crate and
// the run's done. One button, endless, distance + coins score.

import { RetroEngine, shade, mix, type RetroHooks } from "./retro-engine";
import { loadAvatarLS, type AvatarConfig } from "./avatar";
import { MusicKit, MAIN_STREET_THEME } from "./musickit";

const GRAV = 340, THRUST = 620, MAX_UP = -170, MAX_DN = 220;
const HERO_X = 54, CEIL = 12, TILE = 16;

interface Wall { x: number; gapY: number; gapH: number; passed: boolean }
interface Coin { x: number; y: number; got: boolean }

export class DeliveryDashEngine extends RetroEngine {
  private hero: AvatarConfig;
  private y = 0; private vy = 0; private thrust = 0;
  private walls: Wall[] = []; private coins: Coin[] = [];
  private scroll = 0; private speed = 74; private spawnX = 0;
  private state: "ready" | "play" | "over" = "ready";
  private dist = 0; private got = 0; private score = 0; private best = 0; private tAnim = 0; private hitFlash = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, 240, 180);
    this.hero = loadAvatarLS();
    this.music = new MusicKit();
    try { this.best = +(window.localStorage.getItem("deliverydash_best") || 0); } catch { /* ignore */ }
    this.running = true;
    this.reset();
    this.emit();
  }
  protected onGesture() { this.music?.play(MAIN_STREET_THEME); this.music?.setIntensity(0.4); }

  private floorY() { return this.LH - 16; }
  private reset() { this.y = this.LH / 2; this.vy = 0; this.walls = []; this.coins = []; this.scroll = 0; this.speed = 74; this.spawnX = this.LW + 20; this.dist = 0; this.got = 0; this.score = 0; this.hitFlash = 0; this.clearFx(); }
  private begin() { this.reset(); this.state = "play"; this.music?.setIntensity(0.8); this.emit(); }
  protected onStart() { this.begin(); }
  protected onMenu() { this.state = "ready"; this.reset(); this.emit(); }
  private tally() { return Math.floor(this.dist) + this.got * 25; }
  private emit() { this.hooks.onHud?.({ state: this.state, dist: Math.floor(this.dist), coins: this.got, score: this.tally(), best: this.best }); }

  private spawn() {
    const p = Math.min(1, this.dist / 2600);
    const gapH = Math.max(46, 66 - p * 16);
    const gapY = CEIL + 8 + Math.random() * (this.floorY() - CEIL - gapH - 12);
    this.walls.push({ x: this.LW + 16, gapY, gapH, passed: false });
    // a string of coins through the gap
    const n = 3;
    for (let i = 0; i < n; i++) this.coins.push({ x: this.LW + 16 + 8 + i * 7, y: gapY + gapH / 2 + Math.sin(i) * 6, got: false });
  }

  protected update(dt: number) {
    this.tAnim += dt; this.hitFlash = Math.max(0, this.hitFlash - dt);
    if (this.state === "ready") { this.y = this.LH / 2 + Math.sin(this.tAnim * 3) * 6; if (this.pressed.a) this.begin(); return; }
    if (this.state === "over") { this.vy += GRAV * dt; this.y = Math.min(this.floorY() - 8, this.y + this.vy * dt); if (this.pressed.a) this.begin(); return; }
    // play
    this.dist += this.speed * dt * 0.6; this.speed = Math.min(140, 74 + this.dist / 90);
    this.thrust = this.btn.a ? 1 : 0;
    if (this.btn.a) { this.vy -= THRUST * dt; if (this.tAnim % 0.08 < dt) this.fxBurst(HERO_X - 5, this.y + 6, "#ffb020", 1, 40, 90); }
    this.vy += GRAV * dt; this.vy = Math.max(MAX_UP, Math.min(MAX_DN, this.vy)); this.y += this.vy * dt;
    if (this.y < CEIL + 4) { this.y = CEIL + 4; this.vy = 0; }
    if (this.y + 8 > this.floorY()) { this.y = this.floorY() - 8; this.vy = 0; }   // floor is safe to run on

    this.scroll += this.speed * dt;
    // spawn spacing by distance
    this.spawnX -= this.speed * dt;
    if (this.spawnX <= 0) { this.spawn(); this.spawnX = 116 - Math.min(40, this.dist / 60); }
    for (const w of this.walls) { w.x -= this.speed * dt; if (!w.passed && w.x + TILE < HERO_X) { w.passed = true; this.score = this.tally(); } }
    for (const c of this.coins) { c.x -= this.speed * dt; if (!c.got && Math.abs(c.x - HERO_X) < 7 && Math.abs(c.y - this.y) < 8) { c.got = true; this.got++; this.fxBurst(c.x, c.y, "#ffd24a", 6, 70); this.tone(1046, 0.04, "square", 0.05); this.buzz(5); } }
    this.walls = this.walls.filter((w) => w.x > -TILE * 2);
    this.coins = this.coins.filter((c) => !c.got && c.x > -8);

    // collision with crate stacks
    for (const w of this.walls) {
      if (HERO_X + 5 > w.x && HERO_X - 5 < w.x + TILE) {
        if (this.y - 6 < w.gapY || this.y + 6 > w.gapY + w.gapH) return this.die();
      }
    }
    this.emit();
  }
  private die() { this.state = "over"; this.hitFlash = 0.5; this.addShake(3); this.hitstop(0.08); this.noise(0.2, 0.06); this.tone(200, 0.3, "square", 0.06); this.buzz(24); this.fxBurst(HERO_X, this.y, "#ff5d7d", 18, 120); this.music?.setIntensity(0.2); this.score = this.tally(); if (this.score > this.best) { this.best = this.score; try { window.localStorage.setItem("deliverydash_best", String(this.best)); } catch { /* ignore */ } } this.hooks.onRunEnd?.({ score: this.score, shift: Math.floor(this.dist / 300) }); this.emit(); }

  // ---------- render ----------
  protected render() {
    this.vgrad(0, 0, this.LW, this.LH, "#1a2340", "#2a3a5a");
    // parallax city
    for (let x = -((this.scroll * 0.3) % 64); x < this.LW; x += 64) { this.rect(x, 90, 30, 90, "#233152"); this.rect(x + 34, 70, 22, 110, "#1c2846"); for (let wy = 96; wy < 170; wy += 8) for (let wx = x + 3; wx < x + 27; wx += 7) this.rect(wx, wy, 3, 3, "#3a4a70"); }
    // floor
    this.rect(0, this.floorY(), this.LW, this.LH - this.floorY(), "#2a2f3a"); this.rect(0, this.floorY(), this.LW, 2, "#3a4a5a");
    for (let x = -((this.scroll) % 10); x < this.LW; x += 10) this.rect(x, this.floorY() + 3, 5, 2, "#1e2530");

    for (const w of this.walls) this.drawWall(w);
    for (const c of this.coins) { if (c.got) continue; const sx = c.x | 0; if (sx < -6 || sx > this.LW + 6) continue; this.ring(sx, c.y | 0, 3, "#ffd24a", 1.4); this.px(sx - 1, (c.y - 1) | 0, "#fff"); }
    this.drawHero();
    this.drawFx();
    if (this.hitFlash > 0) { this.b.globalAlpha = this.hitFlash; this.rect(0, 0, this.LW, this.LH, "#ff4d6d55"); this.b.globalAlpha = 1; }
    this.drawHud();
    if (this.state === "ready") this.drawReady();
    if (this.state === "over") this.drawOver();
  }
  private drawWall(w: Wall) {
    const x = w.x | 0;
    for (let y = CEIL; y < w.gapY; y += TILE) this.crate(x, y);
    for (let y = w.gapY + w.gapH; y < this.floorY(); y += TILE) this.crate(x, y);
    // warning edges on the gap
    this.rect(x, (w.gapY - 2) | 0, TILE, 2, "#ffd24a"); this.rect(x, (w.gapY + w.gapH) | 0, TILE, 2, "#ffd24a");
  }
  private crate(x: number, y: number) { this.shelf(x, y, TILE, Math.min(TILE, this.floorY() - y), "#a86a3a"); this.rect(x + 1, y + 1, TILE - 2, 1, shade("#a86a3a", 0.3)); this.line(x + 1, y + 1, x + TILE - 2, y + TILE - 2, shade("#a86a3a", -0.25)); }
  private drawHero() {
    const hx = HERO_X, hy = Math.round(this.y);
    if (this.thrust) { this.fxBurst(hx - 5, hy + 6, "#3bb6ff", 1, 30, 60); this.rect(hx - 8, hy + 2, 3, 5, "#ffd24a"); this.rect(hx - 8, hy + 5, 2, 4, "#ff8a3d"); }
    // parcel jetpack
    this.rect(hx - 7, hy - 6, 4, 10, "#c98a3a"); this.rect(hx - 7, hy - 6, 4, 2, "#e0a85a");
    this.avatar(hx + 1, hy + 8, this.hero);
  }
  private drawHud() {
    this.rect(0, 0, this.LW, 12, "#0a0714aa");
    this.text(4, 3, "DIST", "#7be0ff", 1, false); this.text(30, 3, `${Math.floor(this.dist)}m`, "#fff1e8", 1, false);
    this.ring(72, 6, 3, "#ffd24a", 1.4); this.text(78, 3, `${this.got}`, "#fff1e8", 1, false);
    this.textCenterAt(this.LW - 26, 3, `${this.tally()}`.padStart(5, "0"), "#c2c3c7");
  }
  private textCenterAt(cx: number, y: number, s: string, c: string) { this.text(Math.round(cx - this.textWidth(s, 1) / 2), y, s, c, 1, false); }
  private drawReady() {
    this.rect(0, 0, this.LW, this.LH, "#1a2340bb");
    this.textCenter(46, "DELIVERY DASH", "#ffd24a", 2);
    this.textCenter(72, "HOLD THRUST TO FLY - RELEASE TO DROP", "#c2c3c7", 1);
    this.textCenter(88, "THREAD THE CRATES - GRAB THE COINS", "#83769c", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(118, "HOLD THRUST TO LAUNCH", "#fff1e8", 1);
  }
  private drawOver() {
    this.rect(0, 0, this.LW, this.LH, "#1a2340cc");
    this.textCenter(54, "CRASH LANDING!", "#ff5d7d", 2);
    this.textCenter(80, `${Math.floor(this.dist)}m   ${this.got} COINS`, "#fff1e8", 1);
    this.textCenter(96, `SCORE ${this.score}    BEST ${this.best}`, "#ffd24a", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(124, "HOLD THRUST TO DASH AGAIN", "#7be0ff", 1);
  }
}
