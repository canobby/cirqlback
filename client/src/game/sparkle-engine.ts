// SPARKLE — a PowerWash homage, a MODERN cabinet (CHR-208).
//
// The car wash is backed up. Aim the pressure sprayer and blast the grime off each
// motor until it gleams — the coverage meter climbs as you clean, and a spotless car
// pays a fat time bonus before the next one rolls in. Clean as many as you can before
// the shift-clock runs out. Aim + spray with a touch (or pad + SPRAY).

import { RetroEngine, shade, mix, type RetroHooks } from "./retro-engine";
import { MusicKit, MAIN_STREET_THEME } from "./musickit";

const SHIFT = 75;                 // seconds per shift
const CELL = 5;
const BX = 40, BY = 62, BCOLS = 32, BROWS = 15;   // grime grid bbox
const SPRAY_R = 11;
const CAR_COLS = ["#ff5d7d", "#3bb6ff", "#ffd24a", "#33e650", "#b79bff", "#ff8a3d"];

export class SparkleEngine extends RetroEngine {
  private grime: Uint8Array[] = [];        // 1 = grimy, 0 = clean, 2 = not part of car
  private total = 0; private cleaned = 0;
  private aim = { x: 120, y: 96 }; private spraying = false;
  private carCol = "#3bb6ff"; private carN = 0;
  private state: "ready" | "play" | "done" | "over" = "ready";
  private t = 0; private tAnim = 0; private score = 0; private best = 0; private doneT = 0; private lastPour = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, 240, 180);
    this.music = new MusicKit();
    try { this.best = +(window.localStorage.getItem("sparkle_best") || 0); } catch { /* ignore */ }
    this.newCar();
    this.running = true;
    this.emit();
  }
  protected onGesture() { this.music?.play(MAIN_STREET_THEME); this.music?.setIntensity(0.4); }

  // car mask: body slab + cabin + two wheels, in absolute buffer coords
  private inCar(px: number, py: number): boolean {
    if (px > 50 && px < 190 && py > 96 && py < 122) return true;               // body
    if (px > 84 && px < 158 && py > 78 && py < 96) return true;                // cabin
    if ((px - 76) ** 2 + (py - 122) ** 2 < 12 * 12) return true;              // rear wheel
    if ((px - 164) ** 2 + (py - 122) ** 2 < 12 * 12) return true;            // front wheel
    return false;
  }
  private newCar() {
    this.carCol = CAR_COLS[this.carN % CAR_COLS.length];
    this.grime = Array.from({ length: BROWS }, () => new Uint8Array(BCOLS));
    this.total = 0; this.cleaned = 0;
    for (let r = 0; r < BROWS; r++) for (let c = 0; c < BCOLS; c++) {
      const px = BX + c * CELL + CELL / 2, py = BY + r * CELL + CELL / 2;
      if (this.inCar(px, py)) { this.grime[r][c] = 1; this.total++; } else this.grime[r][c] = 2;
    }
  }
  private reset() { this.carN = 0; this.score = 0; this.t = 0; this.doneT = 0; this.aim = { x: 120, y: 96 }; this.newCar(); this.clearFx(); }
  private begin() { this.reset(); this.state = "play"; this.music?.setIntensity(0.8); this.emit(); }
  protected onStart() { this.begin(); }
  protected onMenu() { this.state = "ready"; this.reset(); this.emit(); }
  private coverage() { return this.total ? this.cleaned / this.total : 0; }
  private emit() { this.hooks.onHud?.({ state: this.state, score: this.score, coverage: this.coverage(), time: Math.max(0, SHIFT - this.t), best: this.best }); }

  protected update(dt: number) {
    this.tAnim += dt;
    if (this.state === "ready" || this.state === "over") { if (this.pressed.a || (this.pointer.down)) this.begin(); return; }
    if (this.state === "done") { this.doneT += dt; if (this.doneT > 1.1) { this.carN++; this.newCar(); this.state = "play"; } this.emit(); return; }
    // play
    this.t += dt; if (this.t >= SHIFT) return this.over();
    // aim
    if (this.pointer.down) { this.aim.x = this.pointer.x; this.aim.y = this.pointer.y; this.spraying = true; }
    else {
      const dx = (this.btn.right ? 1 : 0) - (this.btn.left ? 1 : 0), dy = (this.btn.down ? 1 : 0) - (this.btn.up ? 1 : 0);
      this.aim.x = Math.max(BX, Math.min(BX + BCOLS * CELL, this.aim.x + dx * 90 * dt));
      this.aim.y = Math.max(BY, Math.min(BY + BROWS * CELL, this.aim.y + dy * 90 * dt));
      this.spraying = this.btn.a;
    }
    if (this.spraying) this.spray(dt);
    this.emit();
  }
  private spray(dt: number) {
    let hit = 0;
    const c0 = Math.floor((this.aim.x - BX - SPRAY_R) / CELL), c1 = Math.ceil((this.aim.x - BX + SPRAY_R) / CELL);
    const r0 = Math.floor((this.aim.y - BY - SPRAY_R) / CELL), r1 = Math.ceil((this.aim.y - BY + SPRAY_R) / CELL);
    for (let r = Math.max(0, r0); r < Math.min(BROWS, r1); r++) for (let c = Math.max(0, c0); c < Math.min(BCOLS, c1); c++) {
      if (this.grime[r][c] !== 1) continue;
      const px = BX + c * CELL + CELL / 2, py = BY + r * CELL + CELL / 2;
      if ((px - this.aim.x) ** 2 + (py - this.aim.y) ** 2 < SPRAY_R * SPRAY_R) { this.grime[r][c] = 0; this.cleaned++; hit++; if (Math.random() < 0.3) this.fxBurst(px, py, "#dfeaff", 1, 30, 40); }
    }
    // spray droplets + sound cadence
    if (this.lastPour <= 0) { this.tone(400 + Math.random() * 200, 0.03, "square", 0.02); this.lastPour = 0.12; } this.lastPour -= dt;
    for (let i = 0; i < 2; i++) this.fxBurst(this.aim.x + (Math.random() - 0.5) * 6, this.aim.y + (Math.random() - 0.5) * 6, "#7be0ff", 1, 40, 60);
    if (hit) this.buzz(3);
    if (this.state === "play" && this.coverage() >= 0.985) this.carDone();
  }
  private carDone() {
    const bonus = Math.max(0, Math.round((SHIFT - this.t) * 2)) + 100;
    this.score += bonus; this.state = "done"; this.doneT = 0;
    this.fxRing(120, 100, "#ffd24a", 40); this.addShake(1); this.fxPop(120, 60, `+${bonus} SPOTLESS!`, "#ffd24a", 1);
    this.tone(523, 0.08, "square", .05); this.tone(659, 0.08, "square", .05); this.tone(880, 0.16, "square", .05); this.buzz(16);
    this.music?.setIntensity(1);
  }
  private over() { this.state = "over"; this.music?.setIntensity(0.2); if (this.score > this.best) { this.best = this.score; try { window.localStorage.setItem("sparkle_best", String(this.best)); } catch { /* ignore */ } } this.hooks.onRunEnd?.({ score: this.score, shift: this.carN }); this.emit(); }

  // ---------- render ----------
  protected render() {
    this.vgrad(0, 0, this.LW, this.LH, "#152430", "#0c1620");
    // wash-bay tiles + floor
    for (let y = 20; y < 60; y += 12) for (let x = 0; x < this.LW; x += 16) this.rect(x, y, 15, 11, (x + y) % 2 ? "#1a3040" : "#16283a");
    this.rect(0, 138, this.LW, this.LH - 138, "#20303c"); this.rect(0, 138, this.LW, 2, "#33505e");
    this.drawCar();
    this.drawFx();
    if (this.state === "play" || this.state === "done") this.drawSprayer();
    this.drawHud();
    if (this.state === "ready") this.drawReady();
    if (this.state === "over") this.drawOver();
  }
  private drawCar() {
    // clean car body underneath
    this.rect(50, 96, 140, 26, this.carCol); this.shelf(50, 96, 140, 26, this.carCol);
    this.rect(84, 78, 74, 20, shade(this.carCol, -0.1)); this.rect(88, 80, 66, 12, mix(this.carCol, "#bfe6ff", 0.6)); // cabin + windows
    this.disc(76, 122, 12, "#20242e"); this.disc(76, 122, 6, "#3a3f4c"); this.disc(164, 122, 12, "#20242e"); this.disc(164, 122, 6, "#3a3f4c");
    this.rect(52, 108, 136, 2, shade(this.carCol, 0.3));
    this.px(178, 104, "#fff"); // headlight glint
    // grime overlay
    for (let r = 0; r < BROWS; r++) for (let c = 0; c < BCOLS; c++) {
      if (this.grime[r][c] !== 1) continue;
      const x = BX + c * CELL, y = BY + r * CELL;
      this.rect(x, y, CELL, CELL, ((c + r) % 2) ? "#5a4a38" : "#4a3c2c");
      this.px(x + 1, y + 1, "#3a2e20"); this.px(x + 3, y + 3, "#6a5a44");
    }
  }
  private drawSprayer() {
    const ax = this.aim.x | 0, ay = this.aim.y | 0;
    // nozzle at bottom-left corner pointing at aim
    const nx = 26, ny = 150;
    this.rect(nx - 4, ny - 3, 12, 6, "#4a5560"); this.rect(nx + 6, ny - 1, 6, 2, "#6a7580");
    if (this.spraying) { this.line(nx + 10, ny, ax, ay, "#7be0ff"); this.line(nx + 10, ny + 1, ax, ay + 1, "#bfe8ff"); }
    // reticle
    this.ring(ax, ay, SPRAY_R, this.spraying ? "#7be0ff" : "#4a6a7a", 1.4);
    this.line(ax - 3, ay, ax + 3, ay, "#dfeaff"); this.line(ax, ay - 3, ax, ay + 3, "#dfeaff");
  }
  private drawHud() {
    this.rect(0, 0, this.LW, 14, "#0a0714aa");
    this.text(4, 4, "CLEAN", "#7be0ff", 1, false);
    this.rect(34, 5, 60, 5, "#1a2b3a"); this.rect(34, 5, Math.round(60 * this.coverage()), 5, mix("#3bb6ff", "#33e650", this.coverage())); this.rectLine(34, 5, 60, 5, "#2a4a5a");
    this.text(100, 4, "CAR", "#ffd24a", 1, false); this.text(120, 4, `${this.carN + 1}`, "#fff1e8", 1, false);
    const tl = Math.max(0, SHIFT - this.t); this.text(150, 4, "TIME", "#ff8ab5", 1, false); this.text(176, 4, `${Math.ceil(tl)}`, tl < 10 ? "#ff5d7d" : "#fff1e8", 1, false);
    this.textCenterAt(this.LW - 20, 4, `${this.score}`, "#c2c3c7");
  }
  private textCenterAt(cx: number, y: number, s: string, c: string) { this.text(Math.round(cx - this.textWidth(s, 1) / 2), y, s, c, 1, false); }
  private drawReady() {
    this.rect(0, 0, this.LW, this.LH, "#0c1620c8");
    this.textCenter(50, "SPARKLE", "#7be0ff", 3);
    this.textCenter(80, "BLAST THE GRIME OFF EACH CAR", "#c2c3c7", 1);
    this.textCenter(96, "TOUCH TO AIM + SPRAY - OR PAD + SPRAY", "#83769c", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(126, "TAP TO CLOCK IN", "#fff1e8", 1);
  }
  private drawOver() {
    this.rect(0, 0, this.LW, this.LH, "#0c1620d8");
    this.textCenter(54, "SHIFT'S UP!", "#ffd24a", 2);
    this.textCenter(80, `${this.carN} CARS DETAILED`, "#fff1e8", 1);
    this.textCenter(96, `SCORE ${this.score}    BEST ${this.best}`, "#7be0ff", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(124, "TAP TO WASH AGAIN", "#7be0ff", 1);
  }
}
