// HUE HOP — a Color-Switch homage, a MODERN cabinet (CHR-210).
//
// A paint blob bounces up the wall of the shop, passing through spinning colour wheels.
// You can only pass through the arc that matches YOUR colour — time your hop so the right
// slice is at the bottom as you rise in. Grab a paint splat to switch colour for the next
// wheel. One tap to hop; miss the match (or fall) and it's over. Endless climb, height score.

import { RetroEngine, shade, mix, type RetroHooks } from "./retro-engine";
import { MusicKit, MAIN_STREET_THEME } from "./musickit";
import { TAU } from "./arcade-core";

const HUE = ["#ff5d7d", "#3bb6ff", "#ffd24a", "#33e650"];
const GRAV = 560, HOP = -224, TOWERX = 100, BALLR = 6, SCREENY = 0.62;
const RING_R = 30, SPACING = 78;

interface Ring { y: number; rot: number; spd: number; checked: boolean; passed: boolean }
interface Swatch { y: number; x: number; col: number; got: boolean }

export class HueHopEngine extends RetroEngine {
  private worldY = 0; private vy = 0; private color = 0;
  private rings: Ring[] = []; private swatches: Swatch[] = []; private highest = 0;
  private state: "ready" | "play" | "over" = "ready";
  private score = 0; private best = 0; private tAnim = 0; private hitFlash = 0; private prevY = 0; private died = false;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, 200, 220);
    this.music = new MusicKit();
    try { this.best = +(window.localStorage.getItem("huehop_best") || 0); } catch { /* ignore */ }
    this.running = true;
    this.reset();
    this.emit();
  }
  protected onGesture() { this.music?.play(MAIN_STREET_THEME); this.music?.setIntensity(0.4); }

  private camY() { return this.worldY - this.LH * SCREENY; }
  private reset() {
    this.worldY = 0; this.vy = 0; this.color = Math.floor(Math.random() * HUE.length);
    this.rings = []; this.swatches = []; this.highest = 20; this.score = 0; this.hitFlash = 0; this.died = false;
    this.ensureRings(); this.prevY = this.worldY;
  }
  private ensureRings() {
    while (this.highest > this.camY() - this.LH) {
      this.highest -= SPACING;
      this.rings.push({ y: this.highest, rot: Math.random() * TAU, spd: (Math.random() < 0.5 ? 1 : -1) * (1.1 + Math.min(2, this.score * 0.03)), checked: false, passed: false });
      this.swatches.push({ y: this.highest + SPACING / 2, x: TOWERX + (Math.random() < 0.5 ? -26 : 26), col: Math.floor(Math.random() * HUE.length), got: false });
    }
  }
  private begin() { this.reset(); this.state = "play"; this.vy = HOP; this.music?.setIntensity(0.75); this.emit(); }
  protected onStart() { this.begin(); }
  protected onMenu() { this.state = "ready"; this.reset(); this.emit(); }
  private emit() { this.hooks.onHud?.({ state: this.state, score: this.score, color: this.color, best: this.best }); }

  private hop() { this.vy = HOP; this.tone(500 + this.color * 60, 0.04, "square", 0.05); this.buzz(5); this.fxBurst(TOWERX, this.worldY - this.camY() + 6, HUE[this.color], 3, 40, 40); }

  protected update(dt: number) {
    this.tAnim += dt; this.hitFlash = Math.max(0, this.hitFlash - dt);
    for (const r of this.rings) r.rot = (r.rot + r.spd * dt) % TAU;
    if (this.state === "ready") { this.worldY = Math.sin(this.tAnim * 3) * 6; if (this.pressed.a || (this.pointer.down && this.pointerFresh())) this.begin(); this.lastDown = this.pointer.down; return; }
    if (this.state === "over") { this.vy += GRAV * dt; this.worldY += this.vy * dt; if (this.pressed.a || (this.pointer.down && this.pointerFresh())) this.begin(); this.lastDown = this.pointer.down; return; }
    // play
    if (this.pressed.a || (this.pointer.down && this.pointerFresh())) this.hop();
    this.lastDown = this.pointer.down;
    this.prevY = this.worldY;
    this.vy += GRAV * dt; this.worldY += this.vy * dt;
    this.ensureRings();

    // ring gate: check bottom arc when the ball rises past the ring's bottom edge
    for (const r of this.rings) {
      if (r.checked) { if (!r.passed && this.worldY < r.y) { r.passed = true; this.score++; this.tone(880, 0.05, "square", 0.05); this.fxRing(TOWERX, r.y - this.camY(), HUE[this.color], RING_R); this.music?.setIntensity(Math.min(1, 0.75 + this.score * 0.01)); } continue; }
      const bottom = r.y + RING_R;
      if (this.prevY > bottom && this.worldY <= bottom) {                 // crossing the ring's bottom, rising
        r.checked = true;
        const arc = this.arcAt(r, Math.PI / 2);                          // bottom point (screen-down)
        if (arc !== this.color) return this.die(r);
      }
    }
    // swatches: switch colour
    for (const s of this.swatches) if (!s.got && Math.abs(s.x - TOWERX) < 12 && Math.abs(s.y - this.worldY) < 10) { s.got = true; this.color = s.col; this.tone(700, 0.05, "square", 0.05); this.tone(1046, 0.05, "square", 0.04); this.buzz(6); this.fxBurst(s.x, s.y - this.camY(), HUE[s.col], 8, 70); }
    // cull below
    this.rings = this.rings.filter((r) => r.y < this.camY() + this.LH + 40);
    this.swatches = this.swatches.filter((s) => !s.got && s.y < this.camY() + this.LH + 60);
    // fall death
    if (this.worldY - this.camY() > this.LH + 16) return this.die(null);
    this.emit();
  }
  private lastDown = false;
  private pointerFresh() { const f = this.pointer.down && !this.lastDown; return f; }
  private arcAt(r: Ring, screenAngle: number): number { let a = ((screenAngle - r.rot) % TAU + TAU) % TAU; return Math.floor(a / (TAU / HUE.length)) % HUE.length; }
  private die(r: Ring | null) { this.died = true; this.state = "over"; this.hitFlash = 0.5; this.addShake(3); this.hitstop(0.08); this.noise(0.2, 0.06); this.tone(200, 0.3, "square", 0.06); this.buzz(24); this.fxBurst(TOWERX, this.worldY - this.camY(), HUE[this.color], 18, 120); this.music?.setIntensity(0.2); if (this.score > this.best) { this.best = this.score; try { window.localStorage.setItem("huehop_best", String(this.best)); } catch { /* ignore */ } } this.hooks.onRunEnd?.({ score: this.score, shift: this.score }); this.emit(); void r; }

  // ---------- render ----------
  protected render() {
    this.vgrad(0, 0, this.LW, this.LH, "#241a30", "#160c18");
    const cam = this.camY();
    // paint drips backdrop
    for (let i = 0; i < 8; i++) { const x = (i * 53) % this.LW, y = ((i * 90 - cam * 0.3) % (this.LH + 40)) - 20; this.rect(x, y, 3, 14, "#2a1f38"); }
    for (const s of this.swatches) { if (s.got) continue; const sy = s.y - cam; if (sy < -8 || sy > this.LH + 8) continue; this.ball(s.x | 0, sy | 0, 5, HUE[s.col]); this.ring(s.x | 0, sy | 0, 7 + Math.round(Math.sin(this.tAnim * 6) * 1), shade(HUE[s.col], 0.3), 1.2); }
    for (const r of this.rings) this.drawRing(r, cam);
    // ball
    const by = this.worldY - cam;
    this.ball(TOWERX, by | 0, BALLR, HUE[this.color]); this.px(TOWERX - 2, (by - 2) | 0, "#ffffffc0");
    this.drawFx();
    if (this.hitFlash > 0) { this.b.globalAlpha = this.hitFlash; this.rect(0, 0, this.LW, this.LH, "#ff4d6d55"); this.b.globalAlpha = 1; }
    this.drawHud();
    if (this.state === "ready") this.drawReady();
    if (this.state === "over") this.drawOver();
  }
  private drawRing(r: Ring, cam: number) {
    const cy = r.y - cam; if (cy < -RING_R - 4 || cy > this.LH + RING_R + 4) return;
    const seg = TAU / HUE.length;
    for (let y = -RING_R - 2; y <= RING_R + 2; y++) for (let x = -RING_R - 2; x <= RING_R + 2; x++) {
      const d = Math.sqrt(x * x + y * y); if (Math.abs(d - RING_R) > 2.4) continue;
      let a = ((Math.atan2(y, x) - r.rot) % TAU + TAU) % TAU; const idx = Math.floor(a / seg) % HUE.length;
      this.px((TOWERX + x) | 0, (cy + y) | 0, HUE[idx]);
    }
  }
  private drawHud() {
    this.rect(0, 0, this.LW, 14, "#0a0714aa");
    this.text(4, 4, "HOPS", "#b79bff", 1, false); this.text(32, 4, `${this.score}`, "#fff1e8", 1, false);
    this.text(96, 4, "YOU", "#c2c3c7", 1, false); this.disc(122, 7, 4, HUE[this.color]);
    this.text(this.LW - 46, 4, `BEST ${this.best}`, "#83b0c8", 1, false);
  }
  private drawReady() {
    this.rect(0, 0, this.LW, this.LH, "#160c18cc");
    this.textCenter(70, "HUE HOP", "#b79bff", 3);
    this.textCenter(100, "TAP TO HOP UP THE WHEELS", "#c2c3c7", 1);
    this.textCenter(114, "PASS THE ARC THAT MATCHES YOU", "#83769c", 1);
    this.textCenter(128, "GRAB A SPLAT TO SWITCH COLOUR", "#83769c", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(156, "TAP TO START", "#fff1e8", 1);
  }
  private drawOver() {
    this.rect(0, 0, this.LW, this.LH, "#160c18cc");
    this.textCenter(80, "SPLAT!", "#ff5d7d", 3);
    this.textCenter(112, `${this.score} HOPS`, "#fff1e8", 2);
    this.textCenter(134, `BEST ${this.best}`, "#ffd24a", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(160, "TAP TO HOP AGAIN", "#7be0ff", 1);
  }
}
