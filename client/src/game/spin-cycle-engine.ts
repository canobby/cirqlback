// spin-cycle-engine — Main Street cabinet #3 (Puzzle Bobble homage). Fire round
// soap-bubbles up into a descending grid of coloured laundry; match three of a
// colour to pop the load before it reaches the machine door. Signature twist: the
// DRUM SPINS — every few shots the whole grid rotates a column, changing your lines;
// plus a rare BLEACH bubble that clears a whole colour. Worlds: Wash → Spin → Dry.
// Built on RetroEngine (16-bit + juice) + MusicKit; the barista... er, laundry hero.

import { RetroEngine, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const COLS = 8, MAXROWS = 12;
const CW = 22, RH = 18, R = 9;
const MX = 34, TOP = 24;
const WALL_L = MX - R - 1, WALL_R = MX + (COLS - 1) * CW + CW / 2 + R + 1;
const SHOOT_Y = LH - 14, DOOR_Y = LH - 30;
const BEST_KEY = "spincycle_best";
const BLEACH = "#eef2ff";

interface Flying { x: number; y: number; vx: number; vy: number; color: string; bleach: boolean; }
interface World { name: string; sky: [string, string]; colors: string[]; descend: number; rotate: number; }
const WORLDS: World[] = [
  { name: "WASH", sky: ["#123047", "#081018"], colors: ["#3bb6ff", "#ff5d7d", "#33e650", "#ffd24a"], descend: 3.2, rotate: 6 },
  { name: "SPIN", sky: ["#1a2444", "#0a0f1f"], colors: ["#3bb6ff", "#ff5d7d", "#33e650", "#ffd24a", "#b79bff"], descend: 4.4, rotate: 5 },
  { name: "DRY", sky: ["#2a1e34", "#100a18"], colors: ["#3bb6ff", "#ff5d7d", "#33e650", "#ffd24a", "#b79bff", "#ff8ab5"], descend: 5.6, rotate: 4 },
];

const SPIN_THEME: Track = {
  bpm: 138,
  layers: [
    { role: "lead", wave: "square", gain: 0.38, pattern: [
      { n: "A4", d: 2 }, { n: "B4", d: 2 }, { n: "C5", d: 2 }, { n: "B4", d: 2 }, { n: "E5", d: 2 }, { n: "D5", d: 2 }, { n: "B4", d: 4 },
      { n: "C5", d: 2 }, { n: "D5", d: 2 }, { n: "E5", d: 2 }, { n: "G5", d: 2 }, { n: "E5", d: 2 }, { n: "D5", d: 2 }, { n: "C5", d: 4 },
    ] },
    { role: "harmony", wave: "square", gain: 0.18, minIntensity: 0.4, pattern: [{ n: 0, d: 2 }, { n: "E4", d: 2 }, { n: 0, d: 2 }, { n: "F4", d: 2 }] },
    { role: "bass", wave: "triangle", gain: 0.5, pattern: [{ n: "A2", d: 4 }, { n: "E2", d: 4 }, { n: "F2", d: 4 }, { n: "G2", d: 4 }] },
    { role: "drums", minIntensity: 0.2, pattern: [{ n: "K", d: 2 }, { n: "H", d: 2 }, { n: "S", d: 2 }, { n: "H", d: 1 }, { n: "H", d: 1 }] },
  ],
};

export class SpinCycleEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private grid: (string | null)[][] = Array.from({ length: MAXROWS }, () => Array(COLS).fill(null));
  private descentPx = 0;
  private flying: Flying | null = null;
  private loaded = ""; private loadedBleach = false;
  private next = ""; private nextBleach = false;
  private aim = 0;

  private score = 0; private lives = 3; private level = 1; private combo = 0;
  private best = +(LS.get(BEST_KEY) || 0);
  private world = 0;
  private shots = 0;
  private fireCd = 0; private flash = 0; private intro = 0; private spinFx = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.45 });
    this.start();
  }
  protected onGesture() { this.music?.play(SPIN_THEME); }

  private w() { return WORLDS[this.world]; }
  private cellX(r: number, c: number) { return MX + c * CW + (r % 2 ? CW / 2 : 0); }
  private cellY(r: number) { return TOP + this.descentPx + r * RH; }
  private randColor() { const cs = this.w().colors; return cs[Math.floor(this.rnd() * cs.length)]; }

  private newLevel() {
    this.world = Math.floor((this.level - 1) / 3) % WORLDS.length;
    this.grid = Array.from({ length: MAXROWS }, () => Array(COLS).fill(null));
    const startRows = 4 + Math.min(2, Math.floor(this.level / 2));
    for (let r = 0; r < startRows; r++) for (let c = 0; c < COLS; c++) if (this.rnd() < 0.82) this.grid[r][c] = this.randColor();
    this.descentPx = 0; this.shots = 0;
    this.loadClip(); this.loadClip(); // fill loaded + next
    this.intro = 1.5;
    this.card = ((this.level - 1) % 3 === 0 ? "WORLD " + (this.world + 1) + "  " + this.w().name : "LOAD " + this.level);
  }
  private card = "";
  private loadClip() {
    this.loaded = this.next || this.randColor(); this.loadedBleach = this.nextBleach;
    this.nextBleach = this.level >= 2 && this.rnd() < 0.1;
    this.next = this.nextBleach ? BLEACH : this.randColor();
  }
  private beginGame() {
    this.score = 0; this.lives = 3; this.level = 1; this.combo = 0; this.aim = 0; this.flying = null;
    this.next = ""; this.nextBleach = false; this.clearFx(); this.newLevel(); this.state = "play"; this.music?.setIntensity(0.5); this.report();
  }
  private gameOver() {
    this.state = "over";
    if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); }
    this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(5);
    this.hooks.onRunEnd?.({ score: this.score, shift: this.level }); this.report();
  }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: this.lives, shift: this.level, combo: this.combo }); }

  private neighbors(r: number, c: number): [number, number][] {
    const odd = r % 2 === 1;
    const list: [number, number][] = [[r, c - 1], [r, c + 1], odd ? [r - 1, c] : [r - 1, c - 1], odd ? [r - 1, c + 1] : [r - 1, c], odd ? [r + 1, c] : [r + 1, c - 1], odd ? [r + 1, c + 1] : [r + 1, c]];
    return list.filter(([rr, cc]) => rr >= 0 && rr < MAXROWS && cc >= 0 && cc < COLS);
  }

  private fire() {
    if (this.fireCd > 0 || this.flying) return;
    this.fireCd = 0.1;
    const sp = 230;
    this.flying = { x: LW / 2, y: SHOOT_Y, vx: Math.sin(this.aim) * sp, vy: -Math.cos(this.aim) * sp, color: this.loaded, bleach: this.loadedBleach };
    this.loadClip();
    this.tone(520, 0.05, "square", 0.04);
    this.shots++;
    if (this.shots % this.w().rotate === 0) this.spinDrum();
  }

  private spinDrum() {
    for (let r = 0; r < MAXROWS; r++) { const row = this.grid[r]; const last = row[COLS - 1]; for (let c = COLS - 1; c > 0; c--) row[c] = row[c - 1]; row[0] = last; }
    this.spinFx = 0.5; this.addShake(1.6); this.tone(300, 0.12, "sawtooth", 0.04); this.fxPop(LW / 2, TOP + this.descentPx + 30, "SPIN!", "#7be0ff");
  }

  private settle() {
    const f = this.flying!; this.flying = null;
    let r = Math.round((f.y - TOP - this.descentPx) / RH); r = Math.max(0, Math.min(MAXROWS - 1, r));
    let c = Math.round((f.x - MX - (r % 2 ? CW / 2 : 0)) / CW); c = Math.max(0, Math.min(COLS - 1, c));
    if (this.grid[r][c]) { // find nearest empty neighbour
      let bestN: [number, number] | null = null, bd = 1e9;
      for (const [rr, cc] of this.neighbors(r, c)) if (!this.grid[rr][cc]) { const d = (this.cellX(rr, cc) - f.x) ** 2 + (this.cellY(rr) - f.y) ** 2; if (d < bd) { bd = d; bestN = [rr, cc]; } }
      if (bestN) [r, c] = bestN; else return;
    }
    if (f.bleach) { this.bleach(r, c); return; }
    this.grid[r][c] = f.color;
    this.fxBurst(this.cellX(r, c), this.cellY(r), f.color, 4, 40);
    // match
    const group = this.flood(r, c, f.color);
    if (group.length >= 3) {
      this.combo++;
      let gain = 0;
      for (const [rr, cc] of group) { gain += 10; this.fxBurst(this.cellX(rr, cc), this.cellY(rr), this.grid[rr][cc]!, 5, 70); this.grid[rr][cc] = null; }
      gain *= this.combo; this.score += gain; this.fxPop(this.cellX(r, c), this.cellY(r) - 8, "+" + gain, this.combo > 1 ? "#ffd24a" : "#fff4ea");
      if (this.combo >= 3 && this.combo % 3 === 0) this.fxPop(this.cellX(r, c), this.cellY(r) - 18, "COMBO x" + this.combo, "#ff9ec2");
      this.tone(760 + this.combo * 20, 0.05, "square", 0.045); this.addShake(1); this.hitstop(0.02);
      this.dropFloating();
      this.music?.setIntensity(Math.min(1, 0.5 + this.combo * 0.07));
    } else { this.combo = 0; this.tone(300, 0.04, "square", 0.03); }
    if (this.gridEmpty()) this.levelClear();
  }

  private bleach(r: number, c: number) {
    // clear every bubble of the most common adjacent colour
    const counts: Record<string, number> = {};
    for (const [rr, cc] of this.neighbors(r, c)) { const col = this.grid[rr][cc]; if (col) counts[col] = (counts[col] || 0) + 1; }
    const target = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
    this.fxRing(this.cellX(r, c), this.cellY(r), BLEACH, 40); this.addShake(3); this.hitstop(0.05); this.music?.playJingle(CLEAR_JINGLE, 175);
    if (!target) { this.fxPop(this.cellX(r, c), this.cellY(r), "FIZZ", "#c3b4de"); return; }
    let n = 0;
    for (let rr = 0; rr < MAXROWS; rr++) for (let cc = 0; cc < COLS; cc++) if (this.grid[rr][cc] === target) { this.fxBurst(this.cellX(rr, cc), this.cellY(rr), target, 5, 80); this.grid[rr][cc] = null; n++; }
    const gain = n * 15; this.score += gain; this.fxPop(LW / 2, this.cellY(r), "BLEACH +" + gain, "#eef2ff");
    this.dropFloating();
    if (this.gridEmpty()) this.levelClear();
  }

  private flood(r: number, c: number, color: string): [number, number][] {
    const out: [number, number][] = []; const seen = new Set<number>(); const st: [number, number][] = [[r, c]]; seen.add(r * COLS + c);
    while (st.length) { const [rr, cc] = st.pop()!; if (this.grid[rr][cc] !== color) continue; out.push([rr, cc]); for (const [nr, nc] of this.neighbors(rr, cc)) { const k = nr * COLS + nc; if (!seen.has(k) && this.grid[nr][nc] === color) { seen.add(k); st.push([nr, nc]); } } }
    return out;
  }

  private dropFloating() {
    const anchored = new Set<number>(); const st: [number, number][] = [];
    for (let c = 0; c < COLS; c++) if (this.grid[0][c]) { anchored.add(0 * COLS + c); st.push([0, c]); }
    while (st.length) { const [rr, cc] = st.pop()!; for (const [nr, nc] of this.neighbors(rr, cc)) { const k = nr * COLS + nc; if (!anchored.has(k) && this.grid[nr][nc]) { anchored.add(k); st.push([nr, nc]); } } }
    let dropped = 0;
    for (let r = 0; r < MAXROWS; r++) for (let c = 0; c < COLS; c++) if (this.grid[r][c] && !anchored.has(r * COLS + c)) { this.fxBurst(this.cellX(r, c), this.cellY(r), this.grid[r][c]!, 6, 100, 160); this.grid[r][c] = null; dropped++; }
    if (dropped) { const gain = dropped * 20; this.score += gain; this.fxPop(LW / 2, LH / 2, "DROP +" + gain, "#7be0c2"); this.tone(640, 0.06, "square", 0.04); }
  }

  private gridEmpty() { for (let r = 0; r < MAXROWS; r++) for (let c = 0; c < COLS; c++) if (this.grid[r][c]) return false; return true; }
  private levelClear() {
    const bonus = 50 * this.level; this.score += bonus;
    this.fxRing(LW / 2, LH / 2, "#ffd24a", 70); this.fxPop(LW / 2, LH / 2 - 8, "LOAD DONE +" + bonus, "#ffd24a"); this.music?.playJingle(CLEAR_JINGLE, 165); this.addShake(2);
    this.level++; this.newLevel(); this.report();
  }

  private loseLife() {
    this.lives--; this.combo = 0; this.flash = 1; this.addShake(4); this.hitstop(0.05); this.buzz(70); this.noise(0.14, 0.06); this.tone(150, 0.14, "square", 0.05);
    // relief: clear the lowest two occupied rows
    let maxR = -1; for (let r = MAXROWS - 1; r >= 0; r--) { if (this.grid[r].some((x) => x)) { maxR = r; break; } }
    for (let r = maxR; r > maxR - 2 && r >= 0; r--) for (let c = 0; c < COLS; c++) if (this.grid[r][c]) { this.fxShards(this.cellX(r, c), this.cellY(r), this.grid[r][c]!, 4); this.grid[r][c] = null; }
    this.descentPx = Math.max(0, this.descentPx - RH);
    if (this.lives <= 0) this.gameOver(); else this.report();
  }

  protected update(dt: number) {
    this.fireCd -= dt; this.flash = Math.max(0, this.flash - dt * 3); this.spinFx = Math.max(0, this.spinFx - dt);
    if (this.state !== "play") { if (this.pressed.a || this.pressed.up || this.pressed.down || this.pointer.down) this.beginGame(); return; }
    if (this.intro > 0) { this.intro -= dt; return; }

    const aimSpd = 1.9 * dt;
    if (this.btn.left) this.aim -= aimSpd;
    if (this.btn.right) this.aim += aimSpd;
    this.aim = Math.max(-1.35, Math.min(1.35, this.aim));
    if (this.pressed.a) this.fire();

    if (this.flying) {
      const f = this.flying; const steps = 3;
      for (let s = 0; s < steps; s++) {
        f.x += f.vx * dt / steps; f.y += f.vy * dt / steps;
        if (f.x < WALL_L + R) { f.x = WALL_L + R; f.vx = Math.abs(f.vx); this.tone(400, 0.02, "square", 0.03); }
        if (f.x > WALL_R - R) { f.x = WALL_R - R; f.vx = -Math.abs(f.vx); this.tone(400, 0.02, "square", 0.03); }
        if (f.y <= TOP + this.descentPx + 2) { this.settle(); break; }
        let hit = false;
        for (let r = 0; r < MAXROWS && !hit; r++) for (let c = 0; c < COLS; c++) if (this.grid[r][c]) { const dx = this.cellX(r, c) - f.x, dy = this.cellY(r) - f.y; if (dx * dx + dy * dy < (R * 1.7) ** 2) { hit = true; break; } }
        if (hit) { this.settle(); break; }
      }
    }

    // drum descends
    this.descentPx += this.w().descend * dt;
    // danger: any bubble crossing the door?
    let reached = false;
    for (let r = 0; r < MAXROWS && !reached; r++) if (this.cellY(r) >= DOOR_Y) for (let c = 0; c < COLS; c++) if (this.grid[r][c]) { reached = true; break; }
    if (reached) this.loseLife();
  }

  // ---- draw ----
  private bubble(x: number, y: number, color: string) { this.ball(x | 0, y | 0, R - 1, color); this.px((x | 0) - 3, (y | 0) - 3, "#ffffffcc"); }

  protected render() {
    const w = this.w();
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#4a1530" : w.sky[0], w.sky[1]);
    // machine frame
    this.rect(WALL_L - 2, TOP - 4, 3, LH, "#7a8a9a"); this.rect(WALL_R - 1, TOP - 4, 3, LH, "#7a8a9a");
    this.rect(0, DOOR_Y, LW, 2, "#5a4028"); for (let x = 0; x < LW; x += 8) this.px(x, DOOR_Y + 1, "#3a2818");

    // grid
    for (let r = 0; r < MAXROWS; r++) for (let c = 0; c < COLS; c++) { const col = this.grid[r][c]; if (col) { const y = this.cellY(r); if (y > -R && y < LH + R) this.bubble(this.cellX(r, c), y, col); } }

    // shooter + aim
    const ax = LW / 2, ay = SHOOT_Y;
    for (let i = 1; i <= 7; i++) { const t = i * 7; this.px((ax + Math.sin(this.aim) * t) | 0, (ay - Math.cos(this.aim) * t) | 0, i % 2 ? "#ffd24a" : "#5a5a6a"); }
    this.shelf(ax - 12, ay + 6, 24, 8, "#7a8a9a");
    if (this.loaded) this.bubble(ax, ay, this.loadedBleach ? BLEACH : this.loaded);
    // next preview
    this.text(WALL_L + 2, LH - 10, "NEXT", "#83769c", 1, false); if (this.next) this.bubble(WALL_L + 30, LH - 8, this.nextBleach ? BLEACH : this.next);

    // flying
    if (this.flying) this.bubble(this.flying.x, this.flying.y, this.flying.bleach ? BLEACH : this.flying.color);

    this.drawFx();

    // HUD
    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#ffe6c2", 1, false);
    this.text(112, 3, "W" + (this.world + 1) + " L" + this.level, "#ffb020", 1, false);
    if (this.combo > 1) this.text(84, 3, "x" + this.combo, "#ffd24a", 1, false);
    for (let i = 0; i < 3; i++) this.disc(LW - 9 - i * 9, 6, 3, i < this.lives ? "#ff4d6d" : "#3a2a2a");

    if (this.state === "play" && this.intro > 0) this.card2();
    if (this.state !== "play") this.overlay();
  }
  private card2() {
    this.b.globalAlpha = 0.55; this.rect(0, 70, LW, 40, "#0a0714"); this.b.globalAlpha = 1;
    this.textCenter(84, this.card, "#7be0ff", 2);
  }
  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(40, "SPIN CYCLE", "#3bb6ff", 2);
      this.textCenter(64, "POP THE LOAD", "#c3b4de", 1);
      this.textCenter(90, "LEFT RIGHT  AIM", "#83769c", 1);
      this.textCenter(102, "FIRE  SHOOT A BUBBLE", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS FIRE TO START", "#ffec27", 1);
    } else {
      this.textCenter(46, "OVERFLOW", "#ff5d7d", 2);
      this.textCenter(72, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(86, "BEST " + this.best, "#ffd24a", 1);
      this.textCenter(102, "REACHED W" + (this.world + 1) + " L" + this.level, "#c3b4de", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS FIRE TO RETRY", "#ffec27", 1);
    }
  }
}
