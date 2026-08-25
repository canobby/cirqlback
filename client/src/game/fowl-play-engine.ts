// FOWL PLAY — an Angry-Birds homage, a MODERN cabinet (CHR-200).
//
// The henhouse is overrun with garden pests holed up in crate forts. Pull back the
// slingshot, pick your angle and power, and let the fowl fly — it arcs, ricochets off
// the crates, and pops any pest it touches. Clear every pest before you run out of
// birds. Drag to aim (or pad + hold to charge).

import { RetroEngine, shade, mix, type RetroHooks } from "./retro-engine";
import { MusicKit, MAIN_STREET_THEME } from "./musickit";

const GROUND = 164, SX = 36, SY = GROUND - 34, BR = 5, MAXV = 260, GRAV = 300;

interface Box { x: number; y: number; w: number; h: number }
interface Pest { x: number; y: number; r: number; dead: boolean }

export class FowlPlayEngine extends RetroEngine {
  private bx = SX; private by = SY; private vx = 0; private vy = 0; private flying = false; private restT = 0;
  private ang = -0.62; private pow = 0.7; private charging = false; private dragging = false;
  private boxes: Box[] = []; private pests: Pest[] = [];
  private birds = 3; private level = 0;
  private state: "aim" | "fly" | "clear" | "over" | "ready" = "ready";
  private score = 0; private best = 0; private tAnim = 0; private clearT = 0; private lastDown = false;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, 240, 180);
    this.music = new MusicKit();
    try { this.best = +(window.localStorage.getItem("fowlplay_best") || 0); } catch { /* ignore */ }
    this.buildLevel();
    this.running = true;
    this.emit();
  }
  protected onGesture() { this.music?.play(MAIN_STREET_THEME); this.music?.setIntensity(0.4); }

  private buildLevel() {
    const lv = this.level, boxes: Box[] = [], pests: Pest[] = [];
    const cols = 2 + (lv % 3), baseX = 150 + (lv % 2) * 10;
    // a little crate fort
    for (let c = 0; c < cols; c++) { const h = 16 + ((c + lv) % 3) * 12; const x = baseX + c * 20; boxes.push({ x, y: GROUND - h, w: 16, h }); }
    // a lintel across the top
    boxes.push({ x: baseX, y: GROUND - (16 + 24) - 8, w: cols * 20 - 4, h: 8 });
    // pests perched / nested
    const np = 2 + Math.min(3, lv);
    for (let i = 0; i < np; i++) { const b = boxes[i % boxes.length]; pests.push({ x: b.x + b.w / 2 + (i % 2 ? 6 : -2), y: b.y - 5, r: 4, dead: false }); }
    this.boxes = boxes; this.pests = pests;
    this.resetBird();
  }
  private resetBird() { this.bx = SX; this.by = SY; this.vx = this.vy = 0; this.flying = false; this.restT = 0; this.state = "aim"; }
  private reset() { this.level = 0; this.score = 0; this.birds = 3; this.buildLevel(); this.clearFx(); }
  private begin() { this.reset(); this.state = "aim"; this.music?.setIntensity(0.7); this.emit(); }
  protected onStart() { this.begin(); }
  protected onMenu() { this.state = "ready"; this.reset(); this.emit(); }
  private emit() { this.hooks.onHud?.({ state: this.state, score: this.score, birds: this.birds, pests: this.pests.filter((p) => !p.dead).length, best: this.best }); }

  private launch() { this.vx = Math.cos(this.ang) * this.pow * MAXV; this.vy = Math.sin(this.ang) * this.pow * MAXV; this.flying = true; this.state = "fly"; this.charging = false; this.restT = 0; this.tone(300, 0.08, "square", 0.05); this.buzz(10); this.fxBurst(this.bx, this.by, "#fff1e8", 6, 60); }

  protected update(dt: number) {
    this.tAnim += dt; this.clearT = Math.max(0, this.clearT - dt);
    if (this.state === "ready" || this.state === "over") { if (this.pressed.a || (this.pointer.down && !this.lastDown)) this.begin(); this.lastDown = this.pointer.down; return; }
    if (this.state === "clear") { if (this.clearT <= 0) { this.level++; this.birds = 3; this.buildLevel(); } this.emit(); this.lastDown = this.pointer.down; return; }

    if (this.state === "aim") this.updateAim(dt);
    else if (this.state === "fly") this.updateFly(dt);
    this.lastDown = this.pointer.down;
    this.emit();
  }

  private updateAim(dt: number) {
    // drag to aim: pull back from the slingshot
    if (this.pointer.down) {
      this.dragging = true;
      const dx = SX - this.pointer.x, dy = SY - this.pointer.y, d = Math.hypot(dx, dy);
      if (d > 3) { this.ang = Math.atan2(dy, dx); this.pow = Math.max(0.25, Math.min(1, d / 46)); }
    } else if (this.dragging) { this.dragging = false; this.launch(); return; }
    // pad aim: up/down angle, hold A to charge power, release to fire
    if (!this.dragging) {
      if (this.btn.up) this.ang = Math.max(-1.5, this.ang - 1.4 * dt);
      if (this.btn.down) this.ang = Math.min(0.1, this.ang + 1.4 * dt);
      if (this.btn.a) { this.charging = true; this.pow = Math.min(1, this.pow + 0.7 * dt); }
      else if (this.charging) { this.launch(); return; }
    }
    // bird sits on sling, pulled back a bit for feedback
    const pull = this.pow * 12; this.bx = SX - Math.cos(this.ang) * pull; this.by = SY - Math.sin(this.ang) * pull;
  }

  private updateFly(dt: number) {
    this.vy += GRAV * dt; this.bx += this.vx * dt; this.by += this.vy * dt; this.vx *= 0.999;
    if (Math.random() < 0.5) this.fxBurst(this.bx, this.by, "#ffe9a0", 1, 20, 30);
    // ground
    if (this.by + BR > GROUND) { this.by = GROUND - BR; this.vy = -this.vy * 0.45; this.vx *= 0.7; }
    if (this.bx - BR < 0) { this.bx = BR; this.vx = -this.vx * 0.5; }
    // boxes (static AABB, reflect)
    for (const b of this.boxes) this.collideBox(b);
    // pests
    for (const p of this.pests) if (!p.dead && (p.x - this.bx) ** 2 + (p.y - this.by) ** 2 < (p.r + BR) ** 2) this.pop(p);
    // rest / off-screen → consume bird
    const spd = Math.hypot(this.vx, this.vy);
    if ((spd < 24 && this.by + BR >= GROUND - 1) ) this.restT += dt; else this.restT = 0;
    if (this.restT > 0.5 || this.bx > this.LW + 20 || this.by > this.LH + 30) this.consumeBird();
    if (this.pests.every((p) => p.dead)) this.levelClear();
  }
  private collideBox(b: Box) {
    const cx = Math.max(b.x, Math.min(this.bx, b.x + b.w)), cy = Math.max(b.y, Math.min(this.by, b.y + b.h));
    let dx = this.bx - cx, dy = this.by - cy, d = Math.hypot(dx, dy);
    if (d < BR) {
      if (d < 0.01) { dx = 0; dy = -1; d = 1; }
      const nx = dx / d, ny = dy / d; this.bx = cx + nx * BR; this.by = cy + ny * BR;
      const vn = this.vx * nx + this.vy * ny; if (vn < 0) { this.vx -= (1 + 0.55) * vn * nx; this.vy -= (1 + 0.55) * vn * ny; }
      this.vx *= 0.86; this.vy *= 0.86;
      if (Math.hypot(this.vx, this.vy) > 60) { this.fxBurst(this.bx, this.by, "#a86a3a", 4, 60); this.tone(240, 0.04, "square", 0.04); }
    }
  }
  private pop(p: Pest) { p.dead = true; this.score += 150; this.fxBurst(p.x, p.y, "#33e650", 14, 100); this.fxRing(p.x, p.y, "#33e650", 14); this.fxPop(p.x, p.y - 6, "+150", "#ffd24a", 1); this.addShake(1); this.hitstop(0.03); this.tone(660, 0.05, "square", 0.05); this.tone(990, 0.06, "square", 0.04); this.buzz(10); }

  private consumeBird() {
    if (this.pests.every((p) => p.dead)) return;
    this.birds--;
    if (this.birds <= 0 && this.pests.some((p) => !p.dead)) return this.over();
    this.resetBird();
  }
  private levelClear() {
    if (this.state === "clear") return;
    this.score += this.birds * 100; this.state = "clear"; this.clearT = 1.4;
    this.fxPop(120, 40, "COOP CLEARED!", "#33e650", 2); this.addShake(1); this.tone(523, 0.08, "square", .05); this.tone(659, 0.08, "square", .05); this.tone(880, 0.16, "square", .05); this.music?.setIntensity(1); this.emit();
  }
  private over() { this.state = "over"; this.music?.setIntensity(0.2); if (this.score > this.best) { this.best = this.score; try { window.localStorage.setItem("fowlplay_best", String(this.best)); } catch { /* ignore */ } } this.hooks.onRunEnd?.({ score: this.score, shift: this.level }); this.tone(200, 0.3, "square", 0.06); this.emit(); }

  // ---------- render ----------
  protected render() {
    this.vgrad(0, 0, this.LW, this.LH, "#5a8ac0", "#a8d0e8");
    this.disc(206, 30, 12, "#fff6d0");
    for (let x = -((this.tAnim * 6) % 70); x < this.LW; x += 70) { this.disc(x + 20, 40, 7, "#eef6ff"); this.disc(x + 30, 42, 6, "#dfeeff"); }
    // hills + ground
    this.disc(60, GROUND + 30, 50, "#4a7a3a"); this.disc(180, GROUND + 34, 60, "#3f6f34");
    this.rect(0, GROUND, this.LW, this.LH - GROUND, "#5a8a3a"); this.rect(0, GROUND, this.LW, 3, "#6faa4a");
    for (let x = 0; x < this.LW; x += 6) this.rect(x, GROUND + 3, 3, 2, "#3f6f2a");
    // boxes
    for (const b of this.boxes) { this.shelf(b.x, b.y, b.w, b.h, "#a86a3a"); this.rectLine(b.x, b.y, b.w, b.h, shade("#a86a3a", -0.3)); this.line(b.x + 1, b.y + 1, b.x + b.w - 2, b.y + b.h - 2, shade("#a86a3a", -0.2)); }
    // pests
    for (const p of this.pests) if (!p.dead) { this.ball(p.x | 0, p.y | 0, p.r, "#7ec850"); this.px((p.x - 1) | 0, (p.y - 1) | 0, "#20242e"); this.px((p.x + 1) | 0, (p.y - 1) | 0, "#20242e"); this.rect((p.x - 1) | 0, (p.y + 1) | 0, 2, 1, "#e0733a"); }
    // slingshot
    this.rect(SX - 1, SY, 3, GROUND - SY, "#6a4a2a"); this.rect(SX - 4, SY - 4, 3, 6, "#6a4a2a"); this.rect(SX + 2, SY - 4, 3, 6, "#6a4a2a");
    // trajectory preview while aiming
    if (this.state === "aim") this.drawAimGuide();
    // bird
    if (this.state === "aim" || this.state === "fly") this.drawBird();
    this.drawFx();
    this.drawHud();
    if (this.state === "clear") this.drawBanner("COOP CLEARED!", "#33e650");
    if (this.state === "ready") this.drawReady();
    if (this.state === "over") this.drawOver();
  }
  private drawBird() { this.ball(this.bx | 0, this.by | 0, BR, "#ff5d7d"); this.px((this.bx + 2) | 0, (this.by - 1) | 0, "#fff"); this.px((this.bx + 3) | 0, (this.by - 1) | 0, "#20242e"); this.rect((this.bx + BR - 1) | 0, this.by | 0, 3, 2, "#ff8a3d"); this.rect((this.bx - BR) | 0, (this.by - 3) | 0, 2, 2, "#c94f6c"); }
  private drawAimGuide() {
    let x = this.bx, y = this.by, vx = Math.cos(this.ang) * this.pow * MAXV, vy = Math.sin(this.ang) * this.pow * MAXV;
    for (let i = 0; i < 16; i++) { x += vx * 0.05; y += vy * 0.05; vy += GRAV * 0.05; if (i % 2 === 0) this.px(x | 0, y | 0, "#fff1e8"); if (y > GROUND) break; }
    // power meter
    this.rect(6, 20, 4, 40, "#0a071455"); this.rect(6, 60 - Math.round(40 * this.pow), 4, Math.round(40 * this.pow), mix("#33e650", "#ff5d7d", this.pow));
  }
  private drawHud() {
    this.rect(0, 0, this.LW, 12, "#0a071466");
    this.text(4, 3, "SCORE", "#ffd24a", 1, false); this.text(34, 3, `${this.score}`, "#fff1e8", 1, false);
    this.text(96, 3, "BIRDS", "#ff5d7d", 1, false); for (let i = 0; i < this.birds; i++) this.disc(128 + i * 8, 6, 3, "#ff5d7d");
    this.text(160, 3, "PESTS", "#33e650", 1, false); this.text(192, 3, `${this.pests.filter((p) => !p.dead).length}`, "#fff1e8", 1, false);
  }
  private drawBanner(t: string, c: string) { this.rect(0, 30, this.LW, 20, "#0a0714aa"); this.textCenter(34, t, c, 2); }
  private drawReady() {
    this.rect(0, 0, this.LW, this.LH, "#0a0714aa");
    this.textCenter(46, "FOWL PLAY", "#ff5d7d", 3);
    this.textCenter(76, "SLING THE FOWL - POP EVERY PEST", "#fff1e8", 1);
    this.textCenter(92, "DRAG TO AIM + POWER, RELEASE TO FIRE", "#c2c3c7", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(120, "TAP TO START", "#ffd24a", 1);
  }
  private drawOver() {
    this.rect(0, 0, this.LW, this.LH, "#0a0714c4");
    this.textCenter(56, "OUT OF BIRDS!", "#ff5d7d", 2);
    this.textCenter(82, `SCORE ${this.score}`, "#fff1e8", 2);
    this.textCenter(104, `COOP ${this.level + 1}   BEST ${this.best}`, "#ffd24a", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(130, "TAP TO PLAY AGAIN", "#7be0ff", 1);
  }
}
