// GARDEN GUARD — a Plants-vs-Zombies homage, a MODERN cabinet (CHR-207).
//
// Garden pests are marching on the shop, lane by lane. Spend water to plant growers:
// SPROUTS spit seeds down their row, BLOOMS make more water, SPUDS just soak up bites.
// Pick a plant, tap a plot. Waves escalate; let three pests reach the shop and it's
// overrun. Reuses the entity/projectile/wave shape from Night Shift's action toolkit.

import { RetroEngine, shade, mix, type RetroHooks } from "./retro-engine";
import { MusicKit, MAIN_STREET_THEME } from "./musickit";

const LANES = 5, SLOTS = 6, CW = 30, CH = 24, GX = 30, GY = 34, BASE = GX - 6;

type Kind = "shoot" | "water" | "wall";
interface PlantDef { name: string; cost: number; hp: number; kind: Kind; rate: number; dmg: number; col: string }
const PLANTS: PlantDef[] = [
  { name: "SPROUT", cost: 4, hp: 6, kind: "shoot", rate: 1.5, dmg: 2, col: "#33e650" },
  { name: "BLOOM", cost: 5, hp: 6, kind: "water", rate: 4, dmg: 0, col: "#ffd24a" },
  { name: "SPUD", cost: 3, hp: 22, kind: "wall", rate: 0, dmg: 0, col: "#a86a3a" },
];

interface Plant { row: number; col: number; type: number; hp: number; cd: number }
interface Pest { x: number; row: number; hp: number; maxHp: number; spd: number; eat: Plant | null; t: number }
interface Seed { x: number; row: number; dmg: number }

export class GardenGuardEngine extends RetroEngine {
  private grid: (Plant | null)[][] = [];
  private pests: Pest[] = []; private seeds: Seed[] = [];
  private water = 8; private waterCd = 0; private lives = 3; private sel = 0;
  private cur = { r: 2, c: 2 };
  private wave = 0; private waveCd = 3; private spawnCd = 0; private toSpawn = 0;
  private state: "ready" | "play" | "over" = "ready";
  private score = 0; private best = 0; private tAnim = 0; private kills = 0; private lastDown = false; private flash = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, 240, 180);
    this.music = new MusicKit();
    try { this.best = +(window.localStorage.getItem("gardenguard_best") || 0); } catch { /* ignore */ }
    this.grid = Array.from({ length: LANES }, () => new Array(SLOTS).fill(null));
    this.running = true;
    this.emit();
  }
  protected onGesture() { this.music?.play(MAIN_STREET_THEME); this.music?.setIntensity(0.4); }

  private reset() { this.grid = Array.from({ length: LANES }, () => new Array(SLOTS).fill(null)); this.pests = []; this.seeds = []; this.water = 8; this.waterCd = 0; this.lives = 3; this.wave = 0; this.waveCd = 3; this.spawnCd = 0; this.toSpawn = 0; this.score = 0; this.kills = 0; this.flash = 0; this.clearFx(); }
  private begin() { this.reset(); this.state = "play"; this.music?.setIntensity(0.75); this.emit(); }
  protected onStart() { this.begin(); }
  protected onMenu() { this.state = "ready"; this.reset(); this.emit(); }
  private emit() { this.hooks.onHud?.({ state: this.state, score: this.score, water: this.water, lives: this.lives, wave: this.wave, sel: this.sel, best: this.best }); }

  private cellX(c: number) { return GX + c * CW; }
  private cellY(r: number) { return GY + r * CH; }
  private laneMid(r: number) { return GY + r * CH + CH / 2; }

  protected update(dt: number) {
    this.tAnim += dt; this.flash = Math.max(0, this.flash - dt);
    if (this.state === "ready" || this.state === "over") { if (this.pressed.a || (this.pointer.down && !this.lastDown)) this.begin(); this.lastDown = this.pointer.down; return; }
    // input
    if (this.pointer.down && !this.lastDown) this.tap(this.pointer.x, this.pointer.y);
    this.lastDown = this.pointer.down;
    if (this.pressed.b) this.sel = (this.sel + 1) % PLANTS.length;
    if (this.pressed.left) this.cur.c = Math.max(0, this.cur.c - 1);
    if (this.pressed.right) this.cur.c = Math.min(SLOTS - 1, this.cur.c + 1);
    if (this.pressed.up) this.cur.r = Math.max(0, this.cur.r - 1);
    if (this.pressed.down) this.cur.r = Math.min(LANES - 1, this.cur.r + 1);
    if (this.pressed.a) this.plant(this.cur.r, this.cur.c);

    // economy
    this.waterCd -= dt; if (this.waterCd <= 0) { this.water = Math.min(50, this.water + 1); this.waterCd = 3; }
    // waves
    this.waveCd -= dt;
    if (this.toSpawn <= 0 && this.waveCd <= 0) { this.wave++; this.toSpawn = 3 + this.wave * 2; this.spawnCd = 0.4; this.waveCd = 9999; this.music?.setIntensity(Math.min(1, 0.75 + this.wave * 0.02)); }
    if (this.toSpawn > 0) { this.spawnCd -= dt; if (this.spawnCd <= 0) { this.spawnPest(); this.toSpawn--; this.spawnCd = Math.max(0.7, 2.2 - this.wave * 0.05); if (this.toSpawn === 0) this.waveCd = 6; } }

    this.updatePlants(dt); this.updatePests(dt); this.updateSeeds(dt);
    this.emit();
  }

  private tap(px: number, py: number) {
    // plant card row (top)
    if (py < GY - 4) { const i = Math.floor((px - 4) / 46); if (i >= 0 && i < PLANTS.length) { this.sel = i; this.tone(560, 0.03, "square", 0.04); } return; }
    const c = Math.floor((px - GX) / CW), r = Math.floor((py - GY) / CH);
    if (r >= 0 && r < LANES && c >= 0 && c < SLOTS) { this.cur = { r, c }; this.plant(r, c); }
  }
  private plant(r: number, c: number) {
    if (this.grid[r][c]) { this.tone(200, 0.06, "square", 0.04); return; }
    const def = PLANTS[this.sel]; if (this.water < def.cost) { this.tone(200, 0.06, "square", 0.05); this.flash = 0.2; return; }
    this.water -= def.cost; this.grid[r][c] = { row: r, col: c, type: this.sel, hp: def.hp, cd: def.rate * 0.5 };
    this.fxBurst(this.cellX(c) + CW / 2, this.laneMid(r), def.col, 8, 60); this.tone(600, 0.05, "square", 0.05); this.tone(880, 0.05, "square", 0.04); this.buzz(6);
  }
  private updatePlants(dt: number) {
    for (let r = 0; r < LANES; r++) for (let c = 0; c < SLOTS; c++) {
      const p = this.grid[r][c]; if (!p) continue; const def = PLANTS[p.type];
      if (def.kind === "shoot") { p.cd -= dt; if (p.cd <= 0 && this.pests.some((z) => z.row === r && z.x > this.cellX(c))) { p.cd = def.rate; this.seeds.push({ x: this.cellX(c) + CW - 4, row: r, dmg: def.dmg }); this.tone(720, 0.03, "square", 0.04); } }
      else if (def.kind === "water") { p.cd -= dt; if (p.cd <= 0) { p.cd = def.rate; this.water = Math.min(50, this.water + 2); this.fxPop(this.cellX(c) + CW / 2, this.laneMid(r) - 6, "+2", "#ffd24a", 1); } }
    }
  }
  private spawnPest() { const row = Math.floor(Math.random() * LANES); const hp = 4 + this.wave * 2 + Math.floor(Math.random() * 3); this.pests.push({ x: this.LW + 8, row, hp, maxHp: hp, spd: 9 + this.wave * 0.6 + Math.random() * 3, eat: null, t: 0 }); }
  private updatePests(dt: number) {
    for (const z of this.pests) {
      z.t += dt;
      // find plant in this cell
      const c = Math.floor((z.x - GX) / CW);
      const plant = (c >= 0 && c < SLOTS) ? this.grid[z.row][c] : null;
      if (plant && z.x <= this.cellX(c) + CW - 2) { z.eat = plant; plant.hp -= 4 * dt; if (Math.random() < 0.3) this.fxBurst(z.x, this.laneMid(z.row), PLANTS[plant.type].col, 1, 30); if (plant.hp <= 0) { this.grid[z.row][c] = null; z.eat = null; } }
      else { z.eat = null; z.x -= z.spd * dt; }
      if (z.x < BASE) { z.hp = 0; z.x = -999; this.breach(); }
    }
    this.pests = this.pests.filter((z) => z.hp > 0);
  }
  private updateSeeds(dt: number) {
    for (const s of this.seeds) {
      s.x += 150 * dt;
      for (const z of this.pests) if (z.row === s.row && Math.abs(z.x - s.x) < 8 && z.x > BASE) { z.hp -= s.dmg; s.x = 9999; this.fxBurst(s.x < 9000 ? s.x : z.x, this.laneMid(z.row), "#dfeaff", 3, 50); this.tone(880, 0.02, "square", 0.03); if (z.hp <= 0) this.killPest(z); break; }
    }
    this.seeds = this.seeds.filter((s) => s.x < this.LW + 10);
  }
  private killPest(z: Pest) { z.hp = 0; this.kills++; this.score += 15; this.fxBurst(z.x, this.laneMid(z.row), "#7ec850", 10, 90); this.fxPop(z.x, this.laneMid(z.row) - 6, "+15", "#ffd24a", 1); this.tone(300, 0.05, "square", 0.05); if (Math.random() < 0.25) this.water = Math.min(50, this.water + 1); }
  private breach() { this.lives--; this.flash = 0.4; this.addShake(2); this.noise(0.15, 0.05); this.tone(180, 0.2, "square", 0.06); this.buzz(20); if (this.lives <= 0) this.over(); }
  private over() { this.state = "over"; this.music?.setIntensity(0.2); if (this.score > this.best) { this.best = this.score; try { window.localStorage.setItem("gardenguard_best", String(this.best)); } catch { /* ignore */ } } this.hooks.onRunEnd?.({ score: this.score, shift: this.wave }); this.emit(); }

  // ---------- render ----------
  protected render() {
    this.vgrad(0, 0, this.LW, this.LH, "#2a3a20", "#182610");
    // top bar: plant cards + water
    this.rect(0, 0, this.LW, GY - 4, "#14200e");
    for (let i = 0; i < PLANTS.length; i++) { const d = PLANTS[i], x = 4 + i * 46, on = i === this.sel, aff = this.water >= d.cost; this.rect(x, 3, 43, GY - 10, on ? "#2a4a1e" : "#1a2a12"); this.rectLine(x, 3, 43, GY - 10, on ? "#ffd24a" : "#3a4a2a"); this.disc(x + 8, 14, 5, aff ? d.col : shade(d.col, -0.4)); this.text(x + 16, 6, d.name.slice(0, 5), aff ? "#fff1e8" : "#6a7a5a", 1, false); this.text(x + 16, 15, `${d.cost}`, aff ? "#7be0ff" : "#5a6a4a", 1, false); }
    this.disc(this.LW - 40, 13, 4, "#3bb6ff"); this.text(this.LW - 32, 10, `${this.water}`, "#fff1e8", 1, false);
    // lawn
    for (let r = 0; r < LANES; r++) for (let c = 0; c < SLOTS; c++) { const x = this.cellX(c), y = this.cellY(r); this.rect(x, y, CW, CH, ((r + c) % 2) ? "#3a5a26" : "#33501f"); }
    this.rect(GX - 8, GY, 8, LANES * CH, "#5a3a1a");   // shop wall
    // plants
    for (let r = 0; r < LANES; r++) for (let c = 0; c < SLOTS; c++) { const p = this.grid[r][c]; if (p) this.drawPlant(p); }
    // pests + seeds
    for (const s of this.seeds) { this.disc(s.x | 0, this.laneMid(s.row) | 0, 2, "#eaf6c8"); this.px((s.x + 1) | 0, this.laneMid(s.row) | 0, "#fff"); }
    for (const z of this.pests) this.drawPest(z);
    // cursor
    if (this.state === "play") this.rectLine(this.cellX(this.cur.c), this.cellY(this.cur.r), CW, CH, "#fff1e8");
    this.drawFx();
    if (this.flash > 0) { this.b.globalAlpha = this.flash; this.rect(0, 0, this.LW, this.LH, "#ff4d6d44"); this.b.globalAlpha = 1; }
    this.drawHud();
    if (this.state === "ready") this.drawReady();
    if (this.state === "over") this.drawOver();
  }
  private drawPlant(p: Plant) {
    const d = PLANTS[p.type], x = this.cellX(p.col) + CW / 2, y = this.laneMid(p.row) + 2;
    if (d.kind === "wall") { this.shelf((x - 8) | 0, (y - 8) | 0, 16, 14, d.col); this.rect((x - 6) | 0, (y - 6) | 0, 12, 2, shade(d.col, 0.3)); }
    else { this.ball(x | 0, y | 0, 7, d.col); this.px((x - 2) | 0, (y - 2) | 0, "#ffffffb0"); this.rect((x - 1) | 0, (y - 10) | 0, 2, 3, "#2f6f2a"); if (d.kind === "shoot") { this.rect((x + 6) | 0, (y - 1) | 0, 3, 2, shade(d.col, -0.2)); } if (d.kind === "water") { this.px((x) | 0, (y) | 0, "#a86a1a"); } }
    // hp tint when hurt
    if (p.hp < d.hp * 0.5) { this.rect((this.cellX(p.col)) | 0, (this.cellY(p.row)) | 0, Math.round(CW * p.hp / d.hp), 2, "#ff5d7d"); }
  }
  private drawPest(z: Pest) {
    const x = z.x | 0, y = this.laneMid(z.row) | 0;
    this.disc(x, y, 5, z.eat ? "#8a6f4a" : "#6a8f4a");
    this.px(x - 2, y - 1, "#20242e"); this.px(x + 2, y - 1, "#20242e");
    this.rect(x - 3, y + 4, 2, 2, "#3a5a2a"); this.rect(x + 1, y + 4, 2, 2, "#3a5a2a");   // legs
    this.px(x - 1, y - 4, "#3a5a2a"); this.px(x + 1, y - 4, "#3a5a2a");                   // antennae
    this.rect(x - 5, y - 8, Math.round(10 * z.hp / z.maxHp), 1, "#ff5d7d");
  }
  private drawHud() {
    for (let i = 0; i < 3; i++) this.disc(this.LW - 12 - i * 8, GY - 1 + 2, 2, i < this.lives ? "#ff5d7d" : "#3a2430");
    this.text(4, GY - 3, `W${this.wave}`, "#ffd24a", 1, false);
    this.text(this.LW - 70, GY - 3, `${this.score}`, "#c2c3c7", 1, false);
  }
  private drawReady() {
    this.rect(0, 0, this.LW, this.LH, "#182610cc");
    this.textCenter(50, "GARDEN GUARD", "#33e650", 2);
    this.textCenter(76, "PICK A PLANT, TAP A PLOT", "#c2c3c7", 1);
    this.textCenter(92, "SPROUTS SHOOT - BLOOMS MAKE WATER - SPUDS BLOCK", "#83a05a", 1);
    this.textCenter(108, "DON'T LET 3 PESTS REACH THE SHOP", "#83769c", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(136, "TAP TO START", "#fff1e8", 1);
  }
  private drawOver() {
    this.rect(0, 0, this.LW, this.LH, "#182610d8");
    this.textCenter(56, "GARDEN OVERRUN!", "#ff5d7d", 2);
    this.textCenter(82, `WAVE ${this.wave}   ${this.kills} PESTS`, "#fff1e8", 1);
    this.textCenter(98, `SCORE ${this.score}    BEST ${this.best}`, "#ffd24a", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(126, "TAP TO DEFEND AGAIN", "#7be0ff", 1);
  }
}
