// rummage-engine — Main Street cabinet #4 (Pac-Man homage). A maze of clothing
// racks: grab every vintage find to clear the floor while snooty shoppers hunt you.
// Grab a "50% OFF" tag to turn the tables and chase them. Signature twist: the rack
// maze RESHUFFLES as you play (rack gates flip), and OUTFIT power-ups drop — running
// shoes (speed), disguise (unseen), magnet (pull finds). Worlds: Racks → Fitting
// Rooms → Storeroom. Built on RetroEngine (16-bit + juice) + MusicKit; hero = a button.

import { RetroEngine, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";

const COLS = 19, ROWS = 13, TILE = 12, OX = 6, OY = 16;
const LW = 240, LH = 180;
const BEST_KEY = "rummage_best";

type Dir = [number, number];
const DIRS: Dir[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
interface Mob { x: number; y: number; dir: Dir; }
interface Shopper extends Mob { col: string; home: [number, number]; }
type PowerKind = "shoe" | "disguise" | "magnet";
interface PowerUp { r: number; c: number; kind: PowerKind; }

interface World { name: string; sky: [string, string]; rack: string; ghosts: number; speed: number; }
const WORLDS: World[] = [
  { name: "RACKS", sky: ["#181030", "#0c0820"], rack: "#3a2f6e", ghosts: 3, speed: 1.0 },
  { name: "FITTING ROOMS", sky: ["#2a1838", "#100a1c"], rack: "#5a2f6e", ghosts: 4, speed: 1.15 },
  { name: "STOREROOM", sky: ["#22221a", "#0e0e08"], rack: "#5a4a2f", ghosts: 4, speed: 1.32 },
];
const GHOST_COLORS = ["#ff5d7d", "#3bb6ff", "#33e650", "#ffb020", "#b79bff"];

const RUM_THEME: Track = {
  bpm: 130,
  layers: [
    { role: "lead", wave: "square", gain: 0.38, pattern: [
      { n: "D5", d: 1 }, { n: "F5", d: 1 }, { n: "A5", d: 2 }, { n: "G5", d: 1 }, { n: "E5", d: 1 }, { n: "C5", d: 2 }, { n: "D5", d: 2 }, { n: "A4", d: 2 },
      { n: "D5", d: 1 }, { n: "F5", d: 1 }, { n: "A5", d: 2 }, { n: "B5", d: 2 }, { n: "A5", d: 2 }, { n: "F5", d: 2 }, { n: "D5", d: 2 },
    ] },
    { role: "harmony", wave: "square", gain: 0.16, minIntensity: 0.4, pattern: [{ n: 0, d: 1 }, { n: "A4", d: 1 }, { n: 0, d: 1 }, { n: "A4", d: 1 }] },
    { role: "bass", wave: "triangle", gain: 0.5, pattern: [{ n: "D2", d: 2 }, { n: "D2", d: 2 }, { n: "A2", d: 2 }, { n: "A2", d: 2 }, { n: "A#2", d: 2 }, { n: "A#2", d: 2 }, { n: "A2", d: 4 }] },
    { role: "drums", minIntensity: 0.2, pattern: [{ n: "K", d: 2 }, { n: "H", d: 2 }, { n: "K", d: 1 }, { n: "H", d: 1 }, { n: "S", d: 2 }] },
  ],
};

export class RummageEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private maze: Uint8Array = new Uint8Array(ROWS * COLS);
  private pellet: Uint8Array = new Uint8Array(ROWS * COLS); // 1 find, 2 power tag
  private gates: [number, number][] = [];
  private pelletsLeft = 0;

  private player: Mob = { x: 0, y: 0, dir: [0, 0] };
  private want: Dir = [0, 0];
  private shoppers: Shopper[] = [];

  private score = 0; private lives = 3; private floor = 1; private world = 0;
  private best = +(LS.get(BEST_KEY) || 0);
  private fright = 0; private eatChain = 0;
  private reshuffleT = 0; private powerT = 0; private power: PowerUp | null = null;
  private effShoe = 0; private effDisguise = 0; private effMagnet = 0;
  private flash = 0; private intro = 0; private caughtPause = 0; private card = "";

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.42 });
    this.start();
  }
  protected onGesture() { this.music?.play(RUM_THEME); }

  private w() { return WORLDS[this.world]; }
  private idx(r: number, c: number) { return r * COLS + c; }
  private wall(r: number, c: number) { return r < 0 || c < 0 || r >= ROWS || c >= COLS || this.maze[this.idx(r, c)] === 1; }
  private tileX(c: number) { return OX + c * TILE + TILE / 2; }
  private tileY(r: number) { return OY + r * TILE + TILE / 2; }
  private colOf(x: number) { return Math.round((x - OX - TILE / 2) / TILE); }
  private rowOf(y: number) { return Math.round((y - OY - TILE / 2) / TILE); }

  private genFloor() {
    this.world = Math.floor((this.floor - 1) / 3) % WORLDS.length;
    this.maze.fill(0); this.pellet.fill(0); this.gates = [];
    for (let c = 0; c < COLS; c++) { this.maze[this.idx(0, c)] = 1; this.maze[this.idx(ROWS - 1, c)] = 1; }
    for (let r = 0; r < ROWS; r++) { this.maze[this.idx(r, 0)] = 1; this.maze[this.idx(r, COLS - 1)] = 1; }
    for (let r = 2; r < ROWS - 1; r += 2) for (let c = 2; c < COLS - 1; c += 2) this.maze[this.idx(r, c)] = 1; // pillars
    // gates on the "between-pillar" cells (odd corridors always stay open → maze stays connected)
    for (let r = 1; r < ROWS - 1; r++) for (let c = 1; c < COLS - 1; c++) {
      if ((r % 2 === 0 && c % 2 === 1) || (r % 2 === 1 && c % 2 === 0)) { this.gates.push([r, c]); if (this.rnd() < 0.42) this.maze[this.idx(r, c)] = 1; }
    }
    // pellets on every path cell
    this.pelletsLeft = 0;
    for (let r = 1; r < ROWS - 1; r++) for (let c = 1; c < COLS - 1; c++) if (!this.wall(r, c)) { this.pellet[this.idx(r, c)] = 1; this.pelletsLeft++; }
    // power tags near the corners
    for (const [r, c] of [[1, 1], [1, COLS - 2], [ROWS - 2, 1], [ROWS - 2, COLS - 2]] as [number, number][]) if (!this.wall(r, c)) this.pellet[this.idx(r, c)] = 2;
    // player + shoppers
    this.resetPositions();
    this.reshuffleT = 6; this.powerT = 8; this.power = null; this.fright = 0;
    this.intro = 1.5; this.card = ((this.floor - 1) % 3 === 0 ? "WORLD " + (this.world + 1) + "  " + this.w().name : "FLOOR " + this.floor);
  }
  private resetPositions() {
    this.player = { x: this.tileX(9), y: this.tileY(11), dir: [0, 0] }; this.want = [0, 0];
    if (this.pellet[this.idx(11, 9)]) { /* leave */ }
    const homes: [number, number][] = [[1, 9], [11, 9], [5, 3], [5, 15], [7, 9]];
    this.shoppers = [];
    for (let i = 0; i < this.w().ghosts; i++) { const [r, c] = homes[i % homes.length]; this.shoppers.push({ x: this.tileX(c), y: this.tileY(r), dir: [0, -1], col: GHOST_COLORS[i % GHOST_COLORS.length], home: [r, c] }); }
  }

  private beginGame() {
    this.score = 0; this.lives = 3; this.floor = 1; this.effShoe = this.effDisguise = this.effMagnet = 0;
    this.clearFx(); this.genFloor(); this.state = "play"; this.music?.setIntensity(0.5); this.report();
  }
  private gameOver() {
    this.state = "over";
    if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); }
    this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(5);
    this.hooks.onRunEnd?.({ score: this.score, shift: this.floor }); this.report();
  }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: this.lives, shift: this.floor, combo: this.eatChain }); }

  private canGo(r: number, c: number, d: Dir) { return !this.wall(r + d[1], c + d[0]); }
  private atCenter(m: Mob) { return Math.abs(m.x - this.tileX(this.colOf(m.x))) < 1.6 && Math.abs(m.y - this.tileY(this.rowOf(m.y))) < 1.6; }

  private stepMob(m: Mob, speed: number, dt: number, ai?: (r: number, c: number) => Dir) {
    if (this.atCenter(m)) {
      const r = this.rowOf(m.y), c = this.colOf(m.x); m.x = this.tileX(c); m.y = this.tileY(r);
      if (ai) m.dir = ai(r, c);
      else { if ((this.want[0] || this.want[1]) && this.canGo(r, c, this.want)) m.dir = this.want; if (!this.canGo(r, c, m.dir)) m.dir = [0, 0]; }
    }
    m.x += m.dir[0] * speed * dt; m.y += m.dir[1] * speed * dt;
  }

  private ghostAI(g: Shopper, i: number): (r: number, c: number) => Dir {
    return (r, c) => {
      const opts = DIRS.filter((d) => this.canGo(r, c, d) && !(d[0] === -g.dir[0] && d[1] === -g.dir[1]));
      const list = opts.length ? opts : DIRS.filter((d) => this.canGo(r, c, d));
      if (!list.length) return [0, 0];
      if (this.fright > 0 || this.effDisguise > 0) return list[Math.floor(this.rnd() * list.length)];
      const pr = this.rowOf(this.player.y), pc = this.colOf(this.player.x);
      let tr = pr, tc = pc;
      if (i % 3 === 1) { tr = pr + this.player.dir[1] * 3; tc = pc + this.player.dir[0] * 3; } // ambush
      else if (i % 3 === 2) { tr = g.home[0]; tc = g.home[1]; if (Math.abs(pr - r) + Math.abs(pc - c) > 6) { tr = pr; tc = pc; } }
      let best = list[0], bd = 1e9;
      for (const d of list) { const nr = r + d[1], nc = c + d[0]; const dd = (nr - tr) ** 2 + (nc - tc) ** 2; if (dd < bd) { bd = dd; best = d; } }
      return best;
    };
  }

  private reshuffle() {
    let toggled = 0;
    const occupied = new Set<number>([this.idx(this.rowOf(this.player.y), this.colOf(this.player.x))]);
    for (const s of this.shoppers) occupied.add(this.idx(this.rowOf(s.y), this.colOf(s.x)));
    const shuffled = [...this.gates].sort(() => this.rnd() - 0.5);
    for (const [r, c] of shuffled) {
      if (toggled >= 6) break; const id = this.idx(r, c); if (occupied.has(id)) continue;
      this.maze[id] = this.maze[id] ? 0 : 1;
      if (this.maze[id] === 1 && this.pellet[id]) { if (this.pellet[id] === 1) this.pelletsLeft--; this.pellet[id] = 0; }
      toggled++;
    }
    this.addShake(2); this.tone(240, 0.14, "sawtooth", 0.04); this.fxPop(LW / 2, LH / 2, "RESHUFFLE!", "#ffd24a");
  }

  private dropPowerup() {
    const kinds: PowerKind[] = ["shoe", "disguise", "magnet"];
    for (let tries = 0; tries < 40; tries++) { const r = 1 + Math.floor(this.rnd() * (ROWS - 2)), c = 1 + Math.floor(this.rnd() * (COLS - 2)); if (!this.wall(r, c)) { this.power = { r, c, kind: kinds[Math.floor(this.rnd() * 3)] }; break; } }
  }

  private eatPellet(r: number, c: number) {
    const id = this.idx(r, c); const p = this.pellet[id]; if (!p) return;
    this.pellet[id] = 0; this.pelletsLeft--; this.score += p === 2 ? 20 : 5;
    if (p === 2) { this.fright = 6; this.eatChain = 0; this.fxRing(this.tileX(c), this.tileY(r), "#ff5d7d", 30); this.tone(300, 0.16, "square", 0.05); this.music?.setIntensity(0.9); this.fxPop(this.tileX(c), this.tileY(r) - 6, "50% OFF!", "#ffd24a"); }
    else this.tone(760 + (this.pelletsLeft % 6) * 30, 0.02, "square", 0.03);
    if (this.pelletsLeft <= 0) this.floorClear();
  }

  private floorClear() {
    const bonus = 60 * this.floor; this.score += bonus;
    this.fxRing(LW / 2, LH / 2, "#ffd24a", 70); this.fxPop(LW / 2, LH / 2 - 8, "FLOOR CLEAR +" + bonus, "#ffd24a"); this.music?.playJingle(CLEAR_JINGLE, 165); this.addShake(2);
    this.floor++; this.genFloor(); this.report();
  }

  private loseLife() {
    this.lives--; this.flash = 1; this.addShake(4); this.hitstop(0.06); this.buzz(80); this.fxShards(this.player.x, this.player.y, "#ffd24a", 8); this.noise(0.14, 0.06); this.tone(150, 0.16, "square", 0.05);
    this.eatChain = 0; this.fright = 0; this.caughtPause = 1;
    if (this.lives <= 0) this.gameOver(); else { this.resetPositions(); this.report(); }
  }

  protected update(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 3);
    if (this.state !== "play") { if (this.pressed.a || this.pressed.up || this.pressed.down || this.pressed.left || this.pressed.right || this.pointer.down) this.beginGame(); return; }
    if (this.intro > 0) { this.intro -= dt; return; }
    if (this.caughtPause > 0) { this.caughtPause -= dt; return; }

    if (this.btn.up) this.want = [0, -1]; else if (this.btn.down) this.want = [0, 1]; else if (this.btn.left) this.want = [-1, 0]; else if (this.btn.right) this.want = [1, 0];

    if (this.fright > 0) this.fright -= dt;
    this.effShoe = Math.max(0, this.effShoe - dt); this.effDisguise = Math.max(0, this.effDisguise - dt); this.effMagnet = Math.max(0, this.effMagnet - dt);

    const pSpeed = (52 + this.floor * 1.5) * (this.effShoe > 0 ? 1.5 : 1);
    this.stepMob(this.player, pSpeed, dt);
    const pr = this.rowOf(this.player.y), pc = this.colOf(this.player.x);
    this.eatPellet(pr, pc);
    if (this.effMagnet > 0) for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0], [0, 2], [0, -2], [2, 0], [-2, 0]] as [number, number][]) { const rr = pr + dr, cc = pc + dc; if (rr > 0 && cc > 0 && rr < ROWS - 1 && cc < COLS - 1 && this.pellet[this.idx(rr, cc)] === 1) { this.eatPellet(rr, cc); this.fxBurst(this.tileX(cc), this.tileY(rr), "#7be0c2", 2, 40); } }

    // powerup pickup
    if (this.power && pr === this.power.r && pc === this.power.c) {
      const k = this.power.kind; if (k === "shoe") this.effShoe = 6; else if (k === "disguise") this.effDisguise = 6; else this.effMagnet = 7;
      this.fxRing(this.tileX(pc), this.tileY(pr), "#33e650", 24); this.fxPop(this.tileX(pc), this.tileY(pr) - 6, k === "shoe" ? "SPEED!" : k === "disguise" ? "DISGUISE!" : "MAGNET!", "#33e650"); this.tone(880, 0.1, "square", 0.05); this.power = null;
    }

    // shoppers
    const gSpeed = (44 + this.floor * 1.6) * this.w().speed * (this.fright > 0 ? 0.6 : 1);
    this.shoppers.forEach((g, i) => {
      this.stepMob(g, gSpeed, dt, this.ghostAI(g, i));
      if (Math.abs(g.x - this.player.x) < TILE * 0.6 && Math.abs(g.y - this.player.y) < TILE * 0.6) {
        if (this.fright > 0) { this.eatChain++; const gain = 100 * this.eatChain; this.score += gain; this.fxBurst(g.x, g.y, g.col, 10, 90); this.fxPop(g.x, g.y - 6, "+" + gain, "#ffd24a"); this.hitstop(0.04); this.addShake(2); this.tone(520 + this.eatChain * 80, 0.08, "square", 0.05); const [hr, hc] = g.home; g.x = this.tileX(hc); g.y = this.tileY(hr); g.dir = [0, -1]; }
        else if (this.effDisguise <= 0) this.loseLife();
      }
    });

    // timers: reshuffle + powerup drop
    this.reshuffleT -= dt; if (this.reshuffleT <= 0) { this.reshuffle(); this.reshuffleT = 7 + this.rnd() * 3; }
    this.powerT -= dt; if (this.powerT <= 0 && !this.power) { this.dropPowerup(); this.powerT = 10 + this.rnd() * 6; }
  }

  // ---- draw ----
  protected render() {
    const w = this.w();
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#4a1530" : w.sky[0], w.sky[1]);
    // maze racks + finds
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const x = OX + c * TILE, y = OY + r * TILE;
      if (this.maze[this.idx(r, c)] === 1) { this.rect(x + 1, y + 1, TILE - 2, TILE - 2, w.rack); this.rect(x + 1, y + 1, TILE - 2, 1, "#ffffff22"); }
      else { const p = this.pellet[this.idx(r, c)]; if (p === 1) this.rect(this.tileX(c) - 1, this.tileY(r) - 1, 2, 2, "#ffe9a8"); else if (p === 2) { const pu = 0.5 + 0.5 * Math.sin(performance.now() / 150); this.disc(this.tileX(c), this.tileY(r), 3, pu > 0.5 ? "#ff5d7d" : "#ffd24a"); } }
    }
    // powerup
    if (this.power) { const x = this.tileX(this.power.c), y = this.tileY(this.power.r); this.disc(x, y, 4, "#33e650"); const g = this.power.kind === "shoe" ? "S" : this.power.kind === "disguise" ? "D" : "M"; this.text(x - 1, y - 2, g, "#0a0714", 1, false); }

    // player button hero
    const px = this.player.x | 0, py = this.player.y | 0;
    if (this.effDisguise > 0 && Math.floor(performance.now() / 150) % 2 === 0) this.disc(px, py, 5, "#5f6a8a");
    else { this.ball(px, py, 5, this.effShoe > 0 ? "#33e650" : "#ffd24a"); this.px(px - 2, py - 1, "#7a5a10"); this.px(px + 2, py - 1, "#7a5a10"); this.px(px - 2, py + 1, "#7a5a10"); this.px(px + 2, py + 1, "#7a5a10"); }

    // shoppers
    for (const g of this.shoppers) {
      const gx = g.x | 0, gy = g.y | 0; const fr = this.fright > 0;
      const body = fr ? (this.fright < 1.5 && Math.floor(performance.now() / 150) % 2 === 0 ? "#f4f4ff" : "#3b57ff") : g.col;
      this.disc(gx, gy - 1, 4, body); this.rect(gx - 4, gy + 2, 8, 3, body);
      this.px(gx - 2, gy - 1, "#fff"); this.px(gx + 2, gy - 1, "#fff"); this.px(gx - 2, gy - 1 + (g.dir[1] > 0 ? 1 : 0), "#1a1226"); this.px(gx + 2, gy - 1, "#1a1226");
    }

    this.drawFx();

    // HUD
    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#ffe6c2", 1, false);
    this.text(112, 3, "W" + (this.world + 1) + " F" + this.floor, "#ffb020", 1, false);
    if (this.fright > 0) this.text(70, 3, "SALE!", "#ff5d7d", 1, false);
    for (let i = 0; i < 3; i++) this.disc(LW - 9 - i * 9, 6, 3, i < this.lives ? "#ffd24a" : "#3a2a2a");

    if (this.state === "play" && this.intro > 0) this.card2();
    if (this.state !== "play") this.overlay();
  }
  private card2() { this.b.globalAlpha = 0.55; this.rect(0, 74, LW, 34, "#0a0714"); this.b.globalAlpha = 1; this.textCenter(84, this.card, "#ffd24a", 2); }
  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(38, "RUMMAGE", "#ffd24a", 2);
      this.textCenter(62, "GRAB EVERY FIND", "#c3b4de", 1);
      this.textCenter(86, "ARROWS  MOVE", "#83769c", 1);
      this.textCenter(98, "GRAB A 50% TAG TO CHASE", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS A KEY TO START", "#ffec27", 1);
    } else {
      this.textCenter(46, "CAUGHT!", "#ff5d7d", 2);
      this.textCenter(72, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(86, "BEST " + this.best, "#ffd24a", 1);
      this.textCenter(102, "REACHED W" + (this.world + 1) + " F" + this.floor, "#c3b4de", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS A KEY TO RETRY", "#ffec27", 1);
    }
  }
}
