// SMOOTHIE — a Suika/Watermelon-Game homage, a MODERN cabinet (CHR-198).
//
// Drop fruit into the blender cup. Two of the same size that touch merge into the next
// size up — little berries climb all the way to the big melon, which pops for a jackpot.
// The catch: the cup keeps filling. Let the fruit pile over the rim and it's last call.
// Move + drop; light circle physics does the jiggle.

import { RetroEngine, shade, mix, type RetroHooks } from "./retro-engine";
import { MusicKit, MAIN_STREET_THEME } from "./musickit";

const RADII = [6, 8, 11, 14, 18, 23];
const FRUIT = ["#ff5d7d", "#ff8a3d", "#ffd24a", "#33e650", "#3bb6ff", "#b79bff"];
const VAL = [1, 3, 6, 12, 24, 60];
const L = 32, RW = 208, FLOOR = 172, DANGER = 40, GRAV = 340;

interface Fruit { x: number; y: number; vx: number; vy: number; type: number; r: number; merged: boolean; rest: number }

export class SmoothieEngine extends RetroEngine {
  private fruits: Fruit[] = [];
  private aim = 120; private nextType = 0; private dropCd = 0; private overT = 0;
  private state: "ready" | "play" | "over" = "ready";
  private score = 0; private best = 0; private tAnim = 0; private lastDown = false;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, 240, 180);
    this.music = new MusicKit();
    try { this.best = +(window.localStorage.getItem("smoothie_best") || 0); } catch { /* ignore */ }
    this.nextType = this.rollNext();
    this.running = true;
    this.emit();
  }
  protected onGesture() { this.music?.play(MAIN_STREET_THEME); this.music?.setIntensity(0.4); }

  private rollNext() { const r = Math.random(); return r < 0.5 ? 0 : r < 0.82 ? 1 : 2; }
  private reset() { this.fruits = []; this.aim = 120; this.score = 0; this.dropCd = 0; this.overT = 0; this.nextType = this.rollNext(); this.clearFx(); }
  private begin() { this.reset(); this.state = "play"; this.music?.setIntensity(0.7); this.emit(); }
  protected onStart() { this.begin(); }
  protected onMenu() { this.state = "ready"; this.reset(); this.emit(); }
  private emit() { this.hooks.onHud?.({ state: this.state, score: this.score, next: this.nextType, best: this.best }); }

  private drop() {
    if (this.dropCd > 0) return;
    const r = RADII[this.nextType];
    this.fruits.push({ x: Math.max(L + r, Math.min(RW - r, this.aim)), y: DANGER - 2, vx: 0, vy: 0, type: this.nextType, r, merged: false, rest: 0 });
    this.nextType = this.rollNext(); this.dropCd = 0.45;
    this.tone(400, 0.05, "square", 0.04); this.buzz(5); this.emit();
  }

  protected update(dt: number) {
    this.tAnim += dt; this.dropCd = Math.max(0, this.dropCd - dt);
    if (this.state === "ready" || this.state === "over") { if (this.pressed.a || (this.pointer.down && !this.lastDown)) this.begin(); this.lastDown = this.pointer.down; return; }
    // aim
    if (this.pointer.down) this.aim = Math.max(L, Math.min(RW, this.pointer.x));
    else { const d = (this.btn.right ? 1 : 0) - (this.btn.left ? 1 : 0); this.aim = Math.max(L, Math.min(RW, this.aim + d * 120 * dt)); }
    if ((this.pointer.down && !this.lastDown) || this.pressed.a) this.drop();
    this.lastDown = this.pointer.down;

    this.physics(dt);
    // over check: fruit resting above the rim
    let above = false;
    for (const f of this.fruits) if (f.rest > 0.3 && f.y - f.r < DANGER) above = true;
    this.overT = above ? this.overT + dt : Math.max(0, this.overT - dt * 2);
    if (this.overT > 1.3) return this.over();
    this.emit();
  }

  private physics(dt: number) {
    for (const f of this.fruits) {
      if (f.merged) continue;
      f.vy += GRAV * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.98;
      if (f.x - f.r < L) { f.x = L + f.r; f.vx = Math.abs(f.vx) * 0.2; }
      if (f.x + f.r > RW) { f.x = RW - f.r; f.vx = -Math.abs(f.vx) * 0.2; }
      if (f.y + f.r > FLOOR) { f.y = FLOOR - f.r; f.vy = -f.vy * 0.12; }
    }
    // relax collisions a few iterations
    const merges: [Fruit, Fruit][] = [];
    for (let it = 0; it < 3; it++) {
      for (let i = 0; i < this.fruits.length; i++) for (let j = i + 1; j < this.fruits.length; j++) {
        const a = this.fruits[i], b = this.fruits[j]; if (a.merged || b.merged) continue;
        let dx = b.x - a.x, dy = b.y - a.y; let d = Math.hypot(dx, dy); const min = a.r + b.r;
        if (d < min) {
          if (d < 0.01) { dx = Math.random() - 0.5; dy = -1; d = 1; }
          const nx = dx / d, ny = dy / d, ov = (min - d) / 2;
          a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
          // damp normal velocity
          const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rel < 0) { const imp = rel * 0.4; a.vx += nx * imp; a.vy += ny * imp; b.vx -= nx * imp; b.vy -= ny * imp; }
          if (it === 0 && a.type === b.type && a.type < RADII.length - 1 && d < min - 1) merges.push([a, b]);
        }
      }
    }
    // apply merges (each fruit once)
    for (const [a, b] of merges) {
      if (a.merged || b.merged) continue;
      a.merged = b.merged = true;
      const nt = a.type + 1, nx = (a.x + b.x) / 2, ny = (a.y + b.y) / 2;
      this.fruits.push({ x: nx, y: ny, vx: 0, vy: -30, type: nt, r: RADII[nt], merged: false, rest: 0 });
      this.score += VAL[nt] * 2;
      this.fxRing(nx, ny, FRUIT[nt], RADII[nt] + 6); this.fxBurst(nx, ny, FRUIT[nt], 8, 80); this.fxPop(nx, ny - RADII[nt] - 2, `+${VAL[nt] * 2}`, FRUIT[nt], 1);
      this.addShake(0.5); this.tone(500 + nt * 90, 0.05, "square", 0.05); this.tone(760 + nt * 90, 0.06, "square", 0.04); this.buzz(8);
      this.music?.setIntensity(Math.min(1, 0.7 + nt * 0.05));
    }
    // pop two max-size melons that merged-attempt (same type at max)
    for (let i = 0; i < this.fruits.length; i++) for (let j = i + 1; j < this.fruits.length; j++) {
      const a = this.fruits[i], b = this.fruits[j]; if (a.merged || b.merged) continue;
      if (a.type === RADII.length - 1 && b.type === RADII.length - 1) { const dd = Math.hypot(b.x - a.x, b.y - a.y); if (dd < a.r + b.r - 2) { a.merged = b.merged = true; this.score += 200; this.fxRing((a.x + b.x) / 2, (a.y + b.y) / 2, "#fff1e8", 46); this.addShake(2); this.hitstop(0.06); this.fxPop((a.x + b.x) / 2, (a.y + b.y) / 2 - 20, "JACKPOT!", "#ffd24a", 1); this.tone(880, 0.2, "square", 0.06); } }
    }
    this.fruits = this.fruits.filter((f) => !f.merged);
    // rest tracking
    for (const f of this.fruits) { if (Math.abs(f.vy) < 6 && Math.abs(f.vx) < 6) f.rest += dt; else f.rest = 0; }
  }
  private over() { this.state = "over"; this.music?.setIntensity(0.2); if (this.score > this.best) { this.best = this.score; try { window.localStorage.setItem("smoothie_best", String(this.best)); } catch { /* ignore */ } } this.hooks.onRunEnd?.({ score: this.score, shift: this.fruits.reduce((m, f) => Math.max(m, f.type), 0) }); this.tone(200, 0.3, "square", 0.06); this.emit(); }

  // ---------- render ----------
  protected render() {
    this.vgrad(0, 0, this.LW, this.LH, "#2a1830", "#160c18");
    // cup
    this.rect(L - 4, DANGER, 4, FLOOR - DANGER + 4, "#3a2f4a"); this.rect(RW, DANGER, 4, FLOOR - DANGER + 4, "#3a2f4a"); this.rect(L - 4, FLOOR, RW - L + 8, 4, "#3a2f4a");
    this.rect(L, FLOOR - 2, RW - L, 2, "#2a2038");
    // danger line
    const dc = this.overT > 0.4 ? "#ff5d7d" : "#5a4a6a"; for (let x = L; x < RW; x += 8) this.rect(x, DANGER, 4, 1, dc);
    for (const f of this.fruits) this.drawFruit(f);
    this.drawFx();
    // drop guide + next fruit
    if (this.state === "play") { const ax = Math.max(L + RADII[this.nextType], Math.min(RW - RADII[this.nextType], this.aim)); for (let y = DANGER; y < FLOOR; y += 6) this.rect(ax, y, 1, 3, "#ffffff20"); if (this.dropCd < 0.15) this.drawBall(ax, DANGER - 2, this.nextType); }
    this.drawHud();
    if (this.state === "ready") this.drawReady();
    if (this.state === "over") this.drawOver();
  }
  private drawFruit(f: Fruit) { this.drawBall(f.x, f.y, f.type); }
  private drawBall(x: number, y: number, type: number) { this.ball(x | 0, y | 0, RADII[type], FRUIT[type]); this.px((x - RADII[type] * 0.4) | 0, (y - RADII[type] * 0.4) | 0, "#ffffffc0"); if (type >= 3) { this.rect((x - 1) | 0, (y - RADII[type] - 1) | 0, 2, 3, "#5a8a3a"); } }
  private drawHud() {
    this.rect(0, 0, this.LW, 14, "#0a0714aa");
    this.text(4, 4, "JUICE", "#ff8ab5", 1, false); this.text(34, 4, `${this.score}`, "#fff1e8", 1, false);
    this.text(150, 4, "NEXT", "#ffd24a", 1, false); this.disc(184, 7, 4, FRUIT[this.nextType]);
    this.text(this.LW - 46, 4, `BEST ${this.best}`, "#83b0c8", 1, false);
  }
  private drawReady() {
    this.rect(0, 0, this.LW, this.LH, "#160c18cc");
    this.textCenter(50, "SMOOTHIE", "#ff8ab5", 3);
    this.textCenter(80, "DROP FRUIT - MATCH SIZES TO MERGE", "#c2c3c7", 1);
    this.textCenter(96, "DON'T LET IT SPILL OVER THE RIM", "#83769c", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(126, "TAP TO START", "#fff1e8", 1);
  }
  private drawOver() {
    this.rect(0, 0, this.LW, this.LH, "#160c18cc");
    this.textCenter(56, "LAST CALL!", "#ff5d7d", 2);
    this.textCenter(82, `JUICE ${this.score}`, "#fff1e8", 2);
    this.textCenter(104, `BEST ${this.best}`, "#ffd24a", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(130, "TAP TO BLEND AGAIN", "#7be0ff", 1);
  }
}
