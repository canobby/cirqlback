// FLUTTER — a Flappy-Bird homage, a MODERN cabinet (CHR-204).
//
// A pet-shop parakeet escaped its cage and flutters down Main Street, threading the
// gaps between shop awnings. Tap to flap; gravity does the rest. Clip one awning (or
// the pavement) and the run's over. One button, endless, pass-count score — the
// simplest of the modern wave, a fast win for the shelf.

import { RetroEngine, shade, mix, type RetroHooks } from "./retro-engine";
import { MusicKit, MAIN_STREET_THEME } from "./musickit";

const GRAV = 620;
const FLAP = -190;
const BIRD_X = 74;
const GROUND_H = 22;
const PIPE_W = 26;
const GAP0 = 62;               // starting gap height
const SPACING = 116;           // horizontal distance between awnings
const SPEED = 78;

interface Pipe { x: number; gapY: number; passed: boolean }

export class FlutterEngine extends RetroEngine {
  private y = 0; private vy = 0; private rot = 0; private wing = 0;
  private pipes: Pipe[] = [];
  private scrollX = 0;
  private state: "ready" | "play" | "over" = "ready";
  private score = 0; private best = 0; private tAnim = 0; private hitFlash = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, 240, 180);
    this.music = new MusicKit();
    try { this.best = +(window.localStorage.getItem("flutter_best") || 0); } catch { /* ignore */ }
    this.running = true;
    this.reset();
    this.emit();
  }

  protected onGesture() { this.music?.play(MAIN_STREET_THEME); this.music?.setIntensity(0.4); }

  private gapH() { return Math.max(46, GAP0 - Math.floor(this.score / 4) * 3); }
  private groundY() { return this.LH - GROUND_H; }

  private reset() {
    this.y = this.LH / 2 - 10; this.vy = 0; this.rot = 0; this.score = 0; this.hitFlash = 0;
    this.pipes = [];
    for (let i = 0; i < 4; i++) this.pipes.push({ x: this.LW + 40 + i * SPACING, gapY: this.randGap(), passed: false });
    this.scrollX = 0;
  }
  private randGap() { const g = this.gapH(); const min = 22, max = this.groundY() - g - 8; return min + Math.random() * Math.max(1, max - min); }

  private begin() { this.reset(); this.state = "play"; this.vy = FLAP; this.music?.setIntensity(0.7); this.emit(); }
  protected onStart() { this.begin(); }
  protected onMenu() { this.state = "ready"; this.reset(); this.emit(); }
  private emit() { this.hooks.onHud?.({ state: this.state, score: this.score, best: this.best }); }

  private flap() { this.vy = FLAP; this.wing = 1; this.tone(660, 0.05, "square", 0.05); this.tone(880, 0.04, "square", 0.04); this.buzz(6); this.fxBurst(BIRD_X - 6, this.y + 4, "#ffe9a0", 3, 40, 20); }

  protected update(dt: number) {
    this.tAnim += dt; this.hitFlash = Math.max(0, this.hitFlash - dt); this.wing = Math.max(0, this.wing - dt * 4);
    if (this.state === "ready") { this.y = this.LH / 2 - 10 + Math.sin(this.tAnim * 4) * 5; if (this.pressed.a) this.begin(); return; }
    if (this.state === "over") { this.vy += GRAV * dt; this.y = Math.min(this.groundY() - 8, this.y + this.vy * dt); if (this.pressed.a) this.begin(); return; }
    // play
    if (this.pressed.a) this.flap();
    this.vy += GRAV * dt; this.y += this.vy * dt;
    this.rot = Math.max(-0.5, Math.min(1.2, this.vy / 260));
    this.scrollX += SPEED * dt;
    for (const p of this.pipes) {
      p.x -= SPEED * dt;
      if (!p.passed && p.x + PIPE_W < BIRD_X) { p.passed = true; this.score++; this.tone(1046, 0.05, "square", 0.05); this.fxPop(BIRD_X, this.y - 10, `${this.score}`, "#ffd24a", 1); if (this.score % 5 === 0) this.music?.setIntensity(Math.min(1, 0.7 + this.score * 0.01)); }
    }
    // recycle + collide
    if (this.pipes.length && this.pipes[0].x + PIPE_W < -4) { this.pipes.shift(); const lastX = this.pipes[this.pipes.length - 1].x; this.pipes.push({ x: lastX + SPACING, gapY: this.randGap(), passed: false }); }
    if (this.y < 4) { this.y = 4; this.vy = 0; }
    if (this.y + 6 >= this.groundY()) { this.y = this.groundY() - 6; return this.die(); }
    const g = this.gapH();
    for (const p of this.pipes) {
      if (BIRD_X + 6 > p.x && BIRD_X - 6 < p.x + PIPE_W) {
        if (this.y - 5 < p.gapY || this.y + 6 > p.gapY + g) return this.die();
      }
    }
    this.emit();
  }

  private die() {
    this.state = "over"; this.hitFlash = 0.4; this.addShake(2.4); this.hitstop(0.08); this.noise(0.18, 0.06); this.tone(220, 0.24, "square", 0.06); this.buzz(24);
    this.fxBurst(BIRD_X, this.y, "#ffd24a", 16, 120); this.music?.setIntensity(0.2);
    if (this.score > this.best) { this.best = this.score; try { window.localStorage.setItem("flutter_best", String(this.best)); } catch { /* ignore */ } }
    this.hooks.onRunEnd?.({ score: this.score, shift: this.score });
    this.emit();
  }

  // ---------- render ----------
  protected render() {
    this.vgrad(0, 0, this.LW, this.LH, "#2a5a8a", "#a8d0e8");
    this.disc(200, 30, 12, "#fff6d0");
    // parallax clouds + rooftops
    for (let x = -((this.scrollX * 0.25) % 70); x < this.LW; x += 70) { this.disc(x + 20, 40, 7, "#dff0ff"); this.disc(x + 30, 40, 8, "#eaf6ff"); this.disc(x + 40, 42, 6, "#dff0ff"); }
    const gy = this.groundY();
    for (let x = -((this.scrollX * 0.5) % 48); x < this.LW; x += 48) { this.rect(x, gy - 30, 30, 30, "#5a6f9a"); for (let wy = gy - 26; wy < gy - 6; wy += 8) for (let wx = x + 3; wx < x + 26; wx += 8) this.rect(wx, wy, 4, 4, "#2a3550"); }

    const g = this.gapH();
    for (const p of this.pipes) this.drawAwning(p, g);

    // ground
    this.rect(0, gy, this.LW, GROUND_H, "#caa15a");
    this.rect(0, gy, this.LW, 3, "#e6c67a");
    for (let x = -((this.scrollX) % 12); x < this.LW; x += 12) this.rect(x, gy + 3, 6, 2, "#a8823f");

    this.drawBird();
    this.drawFx();
    if (this.hitFlash > 0) { this.b.globalAlpha = this.hitFlash; this.rect(0, 0, this.LW, this.LH, "#ffffff66"); this.b.globalAlpha = 1; }

    // score
    if (this.state !== "ready") this.textCenter(14, `${this.score}`, "#fff1e8", 2);
    if (this.state === "ready") this.drawReady();
    if (this.state === "over") this.drawOver();
  }

  private drawAwning(p: Pipe, g: number) {
    const x = Math.round(p.x), top = p.gapY, botY = p.gapY + g;
    // top awning (hangs down)
    this.shelf(x, 0, PIPE_W, top - 8, "#c0403a");
    for (let sx = x + 2; sx < x + PIPE_W; sx += 6) this.rect(sx, 0, 3, top - 8, "#e2544f");
    this.rect(x - 2, top - 10, PIPE_W + 4, 10, "#8a2f2a"); this.rect(x - 2, top - 10, PIPE_W + 4, 2, "#e6867f");
    // bottom awning (rises up)
    this.shelf(x, botY + 8, PIPE_W, this.groundY() - botY - 8, "#c0403a");
    for (let sx = x + 2; sx < x + PIPE_W; sx += 6) this.rect(sx, botY + 8, 3, this.groundY() - botY - 8, "#e2544f");
    this.rect(x - 2, botY, PIPE_W + 4, 10, "#8a2f2a"); this.rect(x - 2, botY, PIPE_W + 4, 2, "#e6867f");
  }
  private drawBird() {
    const bx = BIRD_X, by = Math.round(this.y);
    // shadow on ground
    this.disc(bx, this.groundY() + 6, 4, "#0a071430");
    // body
    this.ball(bx, by, 6, "#ffd24a");
    // wing (flaps)
    const wUp = this.wing > 0.3 || (this.state === "play" && Math.sin(this.tAnim * 22) > 0);
    this.rect(bx - 7, by + (wUp ? -2 : 3), 6, 3, "#ffb020");
    // beak + eye
    this.rect(bx + 4, by - 1, 4, 3, "#ff8a3d");
    this.rect(bx + 1, by - 3, 3, 3, "#fff"); this.px(bx + 2, by - 2, "#1a1226");
    // tail
    this.rect(bx - 9, by, 3, 2, "#ffb020");
  }
  private drawReady() {
    this.textCenter(46, "FLUTTER", "#ffd24a", 3);
    this.textCenter(74, "TAP TO FLAP THROUGH THE GAPS", "#0a3a63", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(108, "TAP FLAP TO START", "#fff1e8", 1);
  }
  private drawOver() {
    this.rect(0, 0, this.LW, this.LH, "#0a0714a8");
    this.textCenter(52, "CLIPPED A WING!", "#ff5d7d", 2);
    this.textCenter(78, `SCORE ${this.score}`, "#fff1e8", 2);
    this.textCenter(100, `BEST ${this.best}`, "#ffd24a", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(126, "TAP TO FLY AGAIN", "#7be0ff", 1);
  }
}
