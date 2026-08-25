// CHOP SHOP — a Fruit-Ninja homage, a MODERN cabinet (CHR-201).
//
// The deli's slammed and orders are flying: ingredients arc up from the counter and you
// swipe to slice them mid-air. String slices in one swipe for a combo. Miss a fruit and
// it hits the floor (lose a life); slice a stink-bomb and the whole run's over. Pure
// swipe — drag across the screen. Spawn + blade-trail + slice-collision toolkit.

import { RetroEngine, shade, type RetroHooks } from "./retro-engine";
import { MusicKit, MAIN_STREET_THEME } from "./musickit";

const GRAV = 210;
interface Obj { x: number; y: number; vx: number; vy: number; r: number; type: number; bomb: boolean; sliced: boolean; spin: number; sp: number }
// deli ingredients
const FRUIT = ["#ff5d7d", "#ff8a3d", "#ffd24a", "#33e650", "#b79bff", "#ff9ec2"];

export class ChopShopEngine extends RetroEngine {
  private objs: Obj[] = [];
  private trail: { x: number; y: number; life: number }[] = [];
  private state: "ready" | "play" | "over" = "ready";
  private lives = 3; private score = 0; private best = 0; private combo = 0; private comboT = 0;
  private spawnCd = 0; private elapsed = 0; private tAnim = 0; private flash = 0;
  private prevPt = { x: 0, y: 0 }; private lastDown = false;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, 240, 180);
    this.music = new MusicKit();
    try { this.best = +(window.localStorage.getItem("chopshop_best") || 0); } catch { /* ignore */ }
    this.running = true;
    this.emit();
  }
  protected onGesture() { this.music?.play(MAIN_STREET_THEME); this.music?.setIntensity(0.4); }

  private reset() { this.objs = []; this.trail = []; this.lives = 3; this.score = 0; this.combo = 0; this.comboT = 0; this.spawnCd = 0.6; this.elapsed = 0; this.flash = 0; this.clearFx(); }
  private begin() { this.reset(); this.state = "play"; this.music?.setIntensity(0.8); this.emit(); }
  protected onStart() { this.begin(); }
  protected onMenu() { this.state = "ready"; this.reset(); this.emit(); }
  private emit() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: this.lives, best: this.best }); }

  private spawnWave() {
    const p = Math.min(1, this.elapsed / 90);
    const n = 1 + Math.floor(Math.random() * (1 + p * 2));
    for (let i = 0; i < n; i++) {
      const x = 30 + Math.random() * (this.LW - 60);
      const bomb = Math.random() < 0.08 + p * 0.09;
      this.objs.push({ x, y: this.LH + 10, vx: (Math.random() - 0.5) * 50 + (x < this.LW / 2 ? 14 : -14), vy: -(150 + Math.random() * 46 + p * 26), r: bomb ? 7 : 8, type: Math.floor(Math.random() * FRUIT.length), bomb, sliced: false, spin: Math.random() * 6, sp: (Math.random() - 0.5) * 8 });
    }
    this.tone(300, 0.05, "square", 0.03);
  }

  protected update(dt: number) {
    this.tAnim += dt; this.flash = Math.max(0, this.flash - dt);
    // blade trail from pointer
    for (const t of this.trail) t.life -= dt * 3;
    this.trail = this.trail.filter((t) => t.life > 0);

    if (this.state === "ready" || this.state === "over") { if (this.pointer.down && !this.lastDown) this.begin(); else if (this.pressed.a) this.begin(); this.lastDown = this.pointer.down; return; }

    this.elapsed += dt; this.comboT = Math.max(0, this.comboT - dt); if (this.comboT === 0) this.combo = 0;
    // spawning
    this.spawnCd -= dt; if (this.spawnCd <= 0) { this.spawnWave(); this.spawnCd = Math.max(0.5, 1.3 - this.elapsed / 90 * 0.7); }

    // objects
    for (const o of this.objs) {
      if (o.sliced) { o.vy += GRAV * 1.4 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.spin += o.sp * dt; continue; }
      o.vy += GRAV * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.spin += o.sp * dt;
      if (o.y - o.r > this.LH + 12) { if (!o.bomb) this.loseLife(); o.sliced = true; o.y = this.LH + 999; }
    }
    // blade slicing
    if (this.pointer.down) {
      const px = this.pointer.x, py = this.pointer.y;
      if (!this.lastDown) this.prevPt = { x: px, y: py };
      const spd = Math.hypot(px - this.prevPt.x, py - this.prevPt.y);
      this.trail.push({ x: px, y: py, life: 1 });
      if (spd > 2) for (const o of this.objs) { if (o.sliced) continue; if (this.segHitsCircle(this.prevPt.x, this.prevPt.y, px, py, o.x, o.y, o.r + 3)) this.slice(o); }
      this.prevPt = { x: px, y: py };
    }
    this.lastDown = this.pointer.down;
    this.objs = this.objs.filter((o) => o.y < this.LH + 60 && o.x > -40 && o.x < this.LW + 40);
    this.emit();
  }

  private segHitsCircle(x0: number, y0: number, x1: number, y1: number, cx: number, cy: number, r: number): boolean {
    const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy;
    let t = l2 ? ((cx - x0) * dx + (cy - y0) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t));
    const px = x0 + dx * t, py = y0 + dy * t;
    return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
  }
  private slice(o: Obj) {
    o.sliced = true; o.vx += (Math.random() - 0.5) * 40; o.sp = (Math.random() - 0.5) * 16;
    if (o.bomb) { this.flash = 0.5; this.addShake(3); this.hitstop(0.1); this.noise(0.3, 0.07); this.tone(120, 0.3, "square", 0.06); this.buzz([30, 30, 60]); this.fxBurst(o.x, o.y, "#3a3a44", 22, 130); this.over(); return; }
    this.combo++; this.comboT = 0.6;
    const gain = 10 * this.combo;
    this.score += gain;
    this.fxBurst(o.x, o.y, FRUIT[o.type], 12, 110); this.fxRing(o.x, o.y, FRUIT[o.type], 12);
    if (this.combo >= 2) this.fxPop(o.x, o.y - 8, `x${this.combo}`, "#ffd24a", 1);
    this.addShake(0.5); this.tone(700 + this.combo * 60, 0.04, "square", 0.05); this.tone(1046, 0.05, "square", 0.04); this.buzz(6);
    this.music?.setIntensity(Math.min(1, 0.8 + this.combo * 0.03));
  }
  private loseLife() { this.lives--; this.flash = 0.25; this.addShake(1); this.tone(200, 0.12, "square", 0.05); this.buzz(16); if (this.lives <= 0) this.over(); }
  private over() { this.state = "over"; this.music?.setIntensity(0.2); if (this.score > this.best) { this.best = this.score; try { window.localStorage.setItem("chopshop_best", String(this.best)); } catch { /* ignore */ } } this.hooks.onRunEnd?.({ score: this.score, shift: Math.floor(this.score / 200) }); this.emit(); }

  // ---------- render ----------
  protected render() {
    this.vgrad(0, 0, this.LW, this.LH, "#2a1620", "#160c14");
    // deli counter backdrop
    this.rect(0, this.LH - 18, this.LW, 18, "#3a2a2e"); this.rect(0, this.LH - 18, this.LW, 2, "#5a4248");
    for (let x = 0; x < this.LW; x += 16) this.rect(x, this.LH - 16, 8, 14, "#33262a");

    for (const o of this.objs) this.drawObj(o);
    this.drawFx();
    this.drawBlade();
    if (this.flash > 0) { this.b.globalAlpha = this.flash; this.rect(0, 0, this.LW, this.LH, "#ffffff55"); this.b.globalAlpha = 1; }
    this.drawHud();
    if (this.state === "ready") this.drawReady();
    if (this.state === "over") this.drawOver();
  }
  private drawObj(o: Obj) {
    if (o.sliced && !o.bomb) { const dx = Math.cos(o.spin) * 3, dy = Math.sin(o.spin) * 3; this.disc((o.x - dx) | 0, (o.y - dy) | 0, o.r - 2, shade(FRUIT[o.type], -0.1)); this.disc((o.x + dx) | 0, (o.y + dy) | 0, o.r - 2, shade(FRUIT[o.type], -0.1)); return; }
    if (o.sliced) return;
    if (o.bomb) { this.ball(o.x | 0, o.y | 0, o.r, "#2a2a34"); this.rect((o.x - 1) | 0, (o.y - o.r - 3) | 0, 2, 3, "#6a5a4a"); if (Math.sin(this.tAnim * 20) > 0) this.px((o.x) | 0, (o.y - o.r - 4) | 0, "#ffd24a"); this.px((o.x - 2) | 0, (o.y - 1) | 0, "#ff5d5d"); return; }
    this.ball(o.x | 0, o.y | 0, o.r, FRUIT[o.type]);
    this.px((o.x - 2) | 0, (o.y - 2) | 0, "#ffffffb0");
    this.rect((o.x - 1) | 0, (o.y - o.r - 1) | 0, 2, 2, "#33a06a"); // stem/leaf
  }
  private drawBlade() {
    if (this.trail.length < 2) return;
    for (let i = 1; i < this.trail.length; i++) { const a = this.trail[i], b = this.trail[i - 1]; this.b.globalAlpha = Math.max(0, a.life); this.line(a.x | 0, a.y | 0, b.x | 0, b.y | 0, "#eaf6ff"); if (a.life > 0.5) this.line(a.x | 0, (a.y + 1) | 0, b.x | 0, (b.y + 1) | 0, "#7be0ff"); }
    this.b.globalAlpha = 1;
    const h = this.trail[this.trail.length - 1]; this.disc(h.x | 0, h.y | 0, 2, "#fff");
  }
  private drawHud() {
    this.rect(0, 0, this.LW, 12, "#0a0714aa");
    this.text(4, 3, "SCORE", "#ffd24a", 1, false); this.text(34, 3, `${this.score}`, "#fff1e8", 1, false);
    for (let i = 0; i < 3; i++) this.disc(this.LW - 10 - i * 9, 6, 3, i < this.lives ? "#ff5d7d" : "#3a2430");
    if (this.combo >= 2) this.text(90, 3, `COMBO x${this.combo}`, "#33e650", 1, false);
  }
  private drawReady() {
    this.rect(0, 0, this.LW, this.LH, "#160c14c8");
    this.textCenter(50, "CHOP SHOP", "#ff5d7d", 3);
    this.textCenter(80, "SWIPE TO SLICE THE INGREDIENTS", "#c2c3c7", 1);
    this.textCenter(96, "MISS ONE = A LIFE - SLICE A BOMB = OUT", "#83769c", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(126, "SWIPE OR TAP TO START", "#fff1e8", 1);
  }
  private drawOver() {
    this.rect(0, 0, this.LW, this.LH, "#160c14d8");
    this.textCenter(56, this.lives <= 0 ? "ORDERS PILED UP!" : "BOOM!", "#ff4d6d", 2);
    this.textCenter(82, `SCORE ${this.score}`, "#fff1e8", 2);
    this.textCenter(104, `BEST ${this.best}`, "#ffd24a", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(130, "TAP TO CHOP AGAIN", "#7be0ff", 1);
  }
}
