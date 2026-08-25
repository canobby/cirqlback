// dozen-engine — Main Street cabinet #5 (Q*bert homage). Hop your donut across an
// isometric pyramid of crates, flipping each to SOLD; flip them all to clear the
// batch. The health inspector chases you and a rolling coffee-cup bounces down;
// touching either (or hopping off the pyramid) costs a life. Signature twist: later
// worlds are COLOR-MIX — a crate needs two hops through glaze colours to reach the
// target, and overshooting resets it; plus conveyor crates that bump you onward.
// Worlds: Counter → Kitchen → Loading Dock. RetroEngine (16-bit + juice) + MusicKit.

import { RetroEngine, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";

const N = 7;                       // pyramid rows
const HW = 11, ROWSTEP = 15, HH = 5, FACE = 9;
const LW = 240, LH = 180;
const CX = LW / 2, TOPY = 34;
const BEST_KEY = "dozen_best";
const HOP_DUR = 0.16, HOP_H = 12;

type Dir = "ul" | "ur" | "dl" | "dr";
const OFF: Record<Dir, [number, number]> = { ul: [-1, -1], ur: [-1, 0], dl: [1, 0], dr: [1, 1] };

interface Hopper { r: number; c: number; hopping: boolean; t: number; fx: number; fy: number; tx: number; ty: number; falling: boolean; }
interface World { name: string; sky: [string, string]; need: number; colors: string[]; conveyor: boolean; beat: number; }
const WORLDS: World[] = [
  { name: "COUNTER", sky: ["#241848", "#0e0a22"], need: 1, colors: ["#7a6cff", "#ffcf4a"], conveyor: false, beat: 0.6 },
  { name: "KITCHEN", sky: ["#1a2a2a", "#0a1414"], need: 2, colors: ["#7a6cff", "#e07a68", "#ffcf4a"], conveyor: false, beat: 0.52 },
  { name: "LOADING DOCK", sky: ["#2a2018", "#100c08"], need: 2, colors: ["#5a7fd6", "#e0a51f", "#33e650"], conveyor: true, beat: 0.46 },
];

const DOZEN_THEME: Track = {
  bpm: 128,
  layers: [
    { role: "lead", wave: "square", gain: 0.38, pattern: [
      { n: "G4", d: 2 }, { n: "C5", d: 2 }, { n: "E5", d: 2 }, { n: "C5", d: 2 }, { n: "D5", d: 2 }, { n: "G5", d: 2 }, { n: "E5", d: 4 },
      { n: "F5", d: 2 }, { n: "D5", d: 2 }, { n: "B4", d: 2 }, { n: "G4", d: 2 }, { n: "C5", d: 4 }, { n: "G4", d: 4 },
    ] },
    { role: "harmony", wave: "square", gain: 0.16, minIntensity: 0.4, pattern: [{ n: 0, d: 2 }, { n: "C4", d: 2 }, { n: 0, d: 2 }, { n: "G3", d: 2 }] },
    { role: "bass", wave: "triangle", gain: 0.5, pattern: [{ n: "C3", d: 2 }, { n: "C3", d: 2 }, { n: "G2", d: 2 }, { n: "G2", d: 2 }, { n: "A2", d: 2 }, { n: "A2", d: 2 }, { n: "F2", d: 2 }, { n: "G2", d: 2 }] },
    { role: "drums", minIntensity: 0.2, pattern: [{ n: "K", d: 2 }, { n: "H", d: 2 }, { n: "S", d: 2 }, { n: "H", d: 2 }] },
  ],
};

export class DozenEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private cube: number[][] = [];      // flip state per cube
  private conv: (Dir | null)[][] = [];
  private world = 0;
  private p: Hopper = this.mk(0, 0);
  private inspector: Hopper = this.mk(0, 0);
  private baller: Hopper | null = null;
  private beatT = 0; private ballT = 0;
  private sprinkle: [number, number] | null = null; private sprinkleT = 0; private invuln = 0;

  private score = 0; private lives = 3; private batch = 1; private combo = 0;
  private best = +(LS.get(BEST_KEY) || 0);
  private flash = 0; private intro = 0; private card = ""; private pause = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.42 });
    this.genBatch();  // initialise the pyramid so the ready-screen render is safe
    this.start();
  }
  protected onGesture() { this.music?.play(DOZEN_THEME); }

  private mk(r: number, c: number): Hopper { return { r, c, hopping: false, t: 0, fx: 0, fy: 0, tx: 0, ty: 0, falling: false }; }
  private w() { return WORLDS[this.world]; }
  private valid(r: number, c: number) { return r >= 0 && r < N && c >= 0 && c <= r; }
  private cubeX(r: number, c: number) { return CX + (c - r / 2) * 2 * HW; }
  private cubeY(r: number) { return TOPY + r * ROWSTEP; }

  private genBatch() {
    this.world = Math.floor((this.batch - 1) / 3) % WORLDS.length;
    this.cube = []; this.conv = [];
    for (let r = 0; r < N; r++) { this.cube[r] = []; this.conv[r] = []; for (let c = 0; c <= r; c++) { this.cube[r][c] = 0; this.conv[r][c] = this.w().conveyor && this.rnd() < 0.14 ? (this.rnd() < 0.5 ? "dl" : "dr") : null; } }
    this.p = this.mk(0, 0); this.inspector = this.mk(0, 0); this.inspector.r = 0; this.inspector.c = 0; this.baller = null;
    this.beatT = 1.2; this.ballT = 3; this.sprinkle = null; this.sprinkleT = 6; this.invuln = 0;
    this.intro = 1.5; this.card = ((this.batch - 1) % 3 === 0 ? "WORLD " + (this.world + 1) + "  " + this.w().name : "BATCH " + this.batch);
  }
  private beginGame() { this.score = 0; this.lives = 3; this.batch = 1; this.combo = 0; this.clearFx(); this.genBatch(); this.state = "play"; this.music?.setIntensity(0.5); this.report(); }
  private gameOver() {
    this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); }
    this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(5); this.hooks.onRunEnd?.({ score: this.score, shift: this.batch }); this.report();
  }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: this.lives, shift: this.batch, combo: this.combo }); }

  private startHop(h: Hopper, dir: Dir, onland: () => void) {
    const [dr, dc] = OFF[dir]; const nr = h.r + dr, nc = h.c + dc;
    h.fx = this.cubeX(h.r, h.c); h.fy = this.cubeY(h.r);
    h.hopping = true; h.t = 0; (h as any)._land = onland;
    if (this.valid(nr, nc)) { h.tx = this.cubeX(nr, nc); h.ty = this.cubeY(nr); (h as any)._nr = nr; (h as any)._nc = nc; h.falling = false; }
    else { h.tx = h.fx + (dir === "ul" || dir === "dl" ? -HW * 1.6 : HW * 1.6); h.ty = h.fy + (dir === "ul" || dir === "ur" ? -ROWSTEP : ROWSTEP) + ROWSTEP; (h as any)._nr = -99; h.falling = true; }
  }
  private stepHop(h: Hopper, dt: number) {
    if (!h.hopping) return; h.t += dt / HOP_DUR;
    if (h.t >= 1) { h.hopping = false; if (h.falling) { /* keep falling handled elsewhere */ } else { h.r = (h as any)._nr; h.c = (h as any)._nc; } const f = (h as any)._land as () => void; if (f) f(); }
  }
  private hx(h: Hopper) { if (!h.hopping) return this.cubeX(h.r, h.c); return h.fx + (h.tx - h.fx) * h.t; }
  private hy(h: Hopper) { if (!h.hopping) return this.cubeY(h.r); return h.fy + (h.ty - h.fy) * h.t - Math.sin(Math.PI * Math.min(1, h.t)) * HOP_H; }

  private land() {
    const h = this.p;
    if (h.falling) { this.loseLife(); return; }
    // sprinkle pickup
    if (this.sprinkle && this.sprinkle[0] === h.r && this.sprinkle[1] === h.c) { this.invuln = 4; this.sprinkle = null; this.fxRing(this.cubeX(h.r, h.c), this.cubeY(h.r), "#ff9ec2", 24); this.fxPop(this.cubeX(h.r, h.c), this.cubeY(h.r) - 8, "SPRINKLES!", "#ff9ec2"); this.tone(880, 0.1, "square", 0.05); }
    // flip crate
    const need = this.w().need; let s = this.cube[h.r][h.c];
    if (s < need) { s++; if (s === need) { this.score += 15 * (this.combo + 1); this.fxBurst(this.cubeX(h.r, h.c), this.cubeY(h.r), "#ffcf4a", 6, 60); } else this.score += 5; }
    else { s = 0; this.fxPop(this.cubeX(h.r, h.c), this.cubeY(h.r) - 6, "OOPS", "#ff5d7d"); } // overshoot resets (color-mix)
    this.cube[h.r][h.c] = s;
    this.tone(520 + s * 120, 0.05, "square", 0.04); this.addShake(0.6);
    // conveyor bump
    const cv = this.conv[h.r][h.c];
    if (cv && !h.hopping) { this.startHop(h, cv, () => this.land()); return; }
    this.checkCatch();
    if (this.batchDone()) this.batchClear();
  }
  private batchDone() { const need = this.w().need; for (let r = 0; r < N; r++) for (let c = 0; c <= r; c++) if (this.cube[r][c] !== need) return false; return true; }
  private batchClear() {
    const bonus = 80 * this.batch; this.score += bonus; this.combo++;
    this.fxRing(CX, LH / 2, "#ffcf4a", 70); this.fxPop(CX, LH / 2 - 8, "BATCH SOLD +" + bonus, "#ffcf4a"); this.music?.playJingle(CLEAR_JINGLE, 165); this.addShake(2);
    this.batch++; this.genBatch(); this.report();
  }
  private loseLife() {
    this.lives--; this.combo = 0; this.flash = 1; this.addShake(4); this.hitstop(0.06); this.buzz(80);
    this.fxShards(this.hx(this.p), this.hy(this.p), "#ff9ec2", 8); this.noise(0.14, 0.06); this.tone(150, 0.16, "square", 0.05); this.pause = 0.8; this.invuln = 1.5;
    if (this.lives <= 0) this.gameOver(); else { this.p = this.mk(0, 0); this.report(); }
  }
  private checkCatch() {
    if (this.invuln > 0) return;
    const hit = (h: Hopper | null) => h && !h.hopping && !h.falling && h.r === this.p.r && h.c === this.p.c;
    if (hit(this.inspector) || hit(this.baller)) this.loseLife();
  }

  private inspectorMove() {
    const h = this.inspector; if (h.hopping) return;
    // choose the diagonal that best reduces distance to the player (fall off = respawn)
    const dirs: Dir[] = ["ul", "ur", "dl", "dr"]; let best: Dir = "dl", bd = 1e9;
    for (const d of dirs) { const [dr, dc] = OFF[d]; const nr = h.r + dr, nc = h.c + dc; if (!this.valid(nr, nc)) continue; const dd = (nr - this.p.r) ** 2 + (nc - this.p.c) ** 2; if (dd < bd) { bd = dd; best = d; } }
    this.startHop(h, best, () => { if (h.falling) { h.falling = false; h.r = 0; h.c = 0; h.hopping = false; } this.checkCatch(); });
  }
  private ballerMove() {
    if (!this.baller) { this.baller = this.mk(0, Math.random() < 0.5 ? 0 : 0); this.baller.r = 0; this.baller.c = 0; return; }
    const h = this.baller; if (h.hopping) return;
    const d: Dir = this.rnd() < 0.5 ? "dl" : "dr";
    this.startHop(h, d, () => { if (h.falling) this.baller = null; else this.checkCatch(); });
  }

  protected update(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 3); this.invuln = Math.max(0, this.invuln - dt);
    if (this.state !== "play") { if (this.pressed.a || this.pressed.up || this.pressed.down || this.pressed.left || this.pressed.right || this.pointer.down) this.beginGame(); return; }
    if (this.intro > 0) { this.intro -= dt; return; }
    if (this.pause > 0) { this.pause -= dt; return; }

    // player hop input (diagonal mapping)
    if (!this.p.hopping) {
      let dir: Dir | null = null;
      if (this.pressed.up) dir = "ur"; else if (this.pressed.left) dir = "ul"; else if (this.pressed.down) dir = "dl"; else if (this.pressed.right) dir = "dr";
      if (dir) this.startHop(this.p, dir, () => this.land());
    }
    this.stepHop(this.p, dt);
    if (this.p.falling && !this.p.hopping) { /* handled by land() */ }
    this.stepHop(this.inspector, dt);
    if (this.baller) this.stepHop(this.baller, dt);

    // beats
    this.beatT -= dt; if (this.beatT <= 0) { this.inspectorMove(); this.beatT = this.w().beat; }
    this.ballT -= dt; if (this.ballT <= 0) { this.ballerMove(); this.ballT = this.baller ? this.w().beat : 2.5 + this.rnd() * 2; }
    this.checkCatch();

    // sprinkle spawn
    this.sprinkleT -= dt; if (this.sprinkleT <= 0 && !this.sprinkle) { const r = 1 + Math.floor(this.rnd() * (N - 1)); const c = Math.floor(this.rnd() * (r + 1)); this.sprinkle = [r, c]; this.sprinkleT = 12 + this.rnd() * 6; }
  }

  // ---- draw ----
  private drawCube(r: number, c: number) {
    const cx = this.cubeX(r, c) | 0, cy = this.cubeY(r) | 0;
    const need = this.w().need, s = this.cube[r][c];
    const top = this.w().colors[Math.min(s, need)];
    const left = shadeHex(top, -0.28), right = shadeHex(top, -0.5);
    // top diamond
    for (let dy = -HH; dy <= HH; dy++) { const wd = Math.round(HW * (1 - Math.abs(dy) / HH)); this.rect(cx - wd, cy + dy, wd * 2, 1, top); }
    // faces
    for (let i = 0; i < FACE; i++) { this.rect(cx - HW, cy + HH + i, HW, 1, left); this.rect(cx, cy + HH + i, HW, 1, right); }
    if (this.conv[r]?.[c]) { const d = this.conv[r][c]!; this.text(cx - 2, cy - 2, d[1] === "l" ? "<" : ">", "#0a0714", 1, false); }
  }
  private drawDonut(x: number, y: number) { if (this.invuln > 0 && Math.floor(performance.now() / 120) % 2 === 0) return; this.ball(x, y, 5, "#ff9ec2"); this.disc(x, y, 2, this.w().sky[1]); }

  protected render() {
    const w = this.w();
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#4a1530" : w.sky[0], w.sky[1]);
    // cubes back-to-front
    for (let r = 0; r < N; r++) for (let c = 0; c <= r; c++) this.drawCube(r, c);
    // sprinkle pad
    if (this.sprinkle) { const [r, c] = this.sprinkle; const x = this.cubeX(r, c) | 0, y = this.cubeY(r) | 0; for (let i = 0; i < 6; i++) this.px(x - 4 + i * 1.6, y - 2 + (i % 2) * 2, ["#ff5d7d", "#3bb6ff", "#33e650", "#ffd24a"][i % 4]); }
    // entities sorted by row (painter)
    const ents: { row: number; draw: () => void }[] = [];
    ents.push({ row: this.p.hopping ? (this.p as any)._nr ?? this.p.r : this.p.r, draw: () => this.drawDonut(this.hx(this.p) | 0, (this.hy(this.p) - 4) | 0) });
    ents.push({ row: this.inspector.r, draw: () => { const x = this.hx(this.inspector) | 0, y = (this.hy(this.inspector) - 4) | 0; this.rect(x - 3, y - 2, 6, 8, "#e23b4e"); this.disc(x, y - 5, 3, "#f0c9a0"); this.rect(x - 3, y - 8, 6, 2, "#f4f0e8"); } });
    if (this.baller) ents.push({ row: this.baller.r, draw: () => { const x = this.hx(this.baller!) | 0, y = (this.hy(this.baller!) - 4) | 0; this.ball(x, y, 4, "#8a5a2c"); this.rect(x - 4, y - 5, 8, 2, "#5a3a1a"); } });
    ents.sort((a, b) => a.row - b.row).forEach((e) => e.draw());

    this.drawFx();

    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#ffe6c2", 1, false);
    this.text(112, 3, "W" + (this.world + 1) + " B" + this.batch, "#ffb020", 1, false);
    for (let i = 0; i < 3; i++) this.disc(LW - 9 - i * 9, 6, 3, i < this.lives ? "#ff9ec2" : "#3a2a2a");

    if (this.state === "play" && this.intro > 0) { this.b.globalAlpha = 0.55; this.rect(0, 78, LW, 34, "#0a0714"); this.b.globalAlpha = 1; this.textCenter(88, this.card, "#ffcf4a", 2); }
    if (this.state !== "play") this.overlay();
  }
  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(38, "DOZEN", "#ffcf4a", 2);
      this.textCenter(62, "FLIP EVERY CRATE TO SOLD", "#c3b4de", 1);
      this.textCenter(86, "ARROWS  HOP DIAGONALLY", "#83769c", 1);
      this.textCenter(98, "DOWN OR RIGHT GO DOWNHILL", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS A KEY TO START", "#ffec27", 1);
    } else {
      this.textCenter(46, "OFF THE STACK", "#ff5d7d", 2);
      this.textCenter(72, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(86, "BEST " + this.best, "#ffd24a", 1);
      this.textCenter(102, "REACHED W" + (this.world + 1) + " B" + this.batch, "#c3b4de", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS A KEY TO RETRY", "#ffec27", 1);
    }
  }
}

function shadeHex(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const t = amt < 0 ? 0 : 255, k = Math.abs(amt); r = Math.round(r + (t - r) * k); g = Math.round(g + (t - g) * k); b = Math.round(b + (t - b) * k);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
