// brick-mortar-engine — Main Street cabinet (Rampart homage). A masonry yard defends
// the keep: catapults offscreen lob rocks that smash your castle wall, and you sprint
// along the battlements laying fresh brick to plug the gaps before the next volley gets
// through. A rock that finds a hole hits the keep — lose all your keep-stones and the
// wall's overrun. Signature twist: a lay-brick streak drops a golden REINFORCE that
// patches a whole span. Sieges get heavier. RetroEngine + juice + MusicKit; run + lay.

import { RetroEngine, shade, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const BEST_KEY = "brick_best";
const WCOLS = 13, CW = LW / 13, WALLY = 118;

interface Rock { col: number; x: number; y: number; vy: number }

const BRICK_THEME: Track = {
  bpm: 126,
  layers: [
    { role: "lead", wave: "square", gain: 0.32, pattern: [
      { n: "A4", d: 2 }, { n: "E4", d: 2 }, { n: "A4", d: 1 }, { n: "C5", d: 1 }, { n: "B4", d: 2 }, { n: "A4", d: 2 }, { n: "E4", d: 4 },
      { n: "F4", d: 2 }, { n: "A4", d: 2 }, { n: "C5", d: 1 }, { n: "B4", d: 1 }, { n: "A4", d: 2 }, { n: "E4", d: 2 },
    ] },
    { role: "bass", wave: "triangle", gain: 0.5, pattern: [{ n: "A2", d: 2 }, { n: "A2", d: 2 }, { n: "E2", d: 2 }, { n: "E2", d: 2 }, { n: "F2", d: 2 }, { n: "F2", d: 2 }, { n: "E2", d: 2 }, { n: "E2", d: 2 }] },
    { role: "drums", minIntensity: 0.3, pattern: [{ n: "K", d: 2 }, { n: "H", d: 2 }, { n: "S", d: 2 }, { n: "H", d: 2 }] },
  ],
};

export class BrickMortarEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private wall: number[] = []; private pcol = 6; private moveCd = 0; private layAnim = 0;
  private rocks: Rock[] = []; private spawnT = 1.4; private keep = 6; private repairs = 0; private repairStreak = 0;
  private siege = 1; private score = 0; private time = 0; private best = +(LS.get(BEST_KEY) || 0); private flash = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.4 });
    this.wall = new Array(WCOLS).fill(2);
    this.start();
  }
  protected onGesture() { this.music?.play(BRICK_THEME); }

  private beginGame() { this.wall = new Array(WCOLS).fill(2); this.pcol = 6; this.rocks = []; this.spawnT = 1.2; this.keep = 6; this.repairs = 0; this.repairStreak = 0; this.siege = 1; this.score = 0; this.time = 0; this.clearFx(); this.state = "play"; this.music?.setIntensity(0.6); this.report(); }
  private gameOver() { this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); } this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(5); this.hooks.onRunEnd?.({ score: this.score, shift: this.siege }); this.report(); }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: this.keep, shift: this.siege, combo: this.repairStreak }); }

  private lay() { const w = this.wall[this.pcol]; if (w >= 2) { this.tone(200, 0.03, "square", 0.03); return; } this.wall[this.pcol] = w + 1; this.layAnim = 1; this.repairs++; this.repairStreak++; this.score += 3; this.fxBurst(this.pcol * CW + CW / 2, WALLY, "#c98a54", 4, 50); this.tone(360 + this.wall[this.pcol] * 80, 0.04, "square", 0.04); this.buzz(5);
    if (this.repairStreak > 0 && this.repairStreak % 8 === 0) { // golden reinforce a span
      this.fxPop(this.pcol * CW + CW / 2, WALLY - 14, "REINFORCE!", "#ffd24a"); this.tone(880, 0.1, "square", 0.05); this.addShake(1.5); for (let c = Math.max(0, this.pcol - 2); c <= Math.min(WCOLS - 1, this.pcol + 2); c++) { this.wall[c] = 2; this.fxBurst(c * CW + CW / 2, WALLY, "#ffd24a", 3, 40); } this.score += 30; }
  }

  protected update(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 3); this.moveCd = Math.max(0, this.moveCd - dt); this.layAnim = Math.max(0, this.layAnim - dt * 4);
    if (this.state !== "play") { if (this.pressed.a || this.pressed.left || this.pressed.right || this.pointer.down) this.beginGame(); return; }

    this.time += dt; this.siege = 1 + Math.floor(this.time / 20); this.score += Math.floor(dt * 5);
    // move
    if (this.pressed.left && this.pcol > 0) this.pcol--; if (this.pressed.right && this.pcol < WCOLS - 1) this.pcol++;
    if ((this.btn.left || this.btn.right) && this.moveCd <= 0) { if (this.btn.left && this.pcol > 0) this.pcol--; else if (this.btn.right && this.pcol < WCOLS - 1) this.pcol++; this.moveCd = 0.11; }
    if (this.pressed.a) this.lay();

    // spawn rocks
    this.spawnT -= dt; if (this.spawnT <= 0) { const col = Math.floor(this.rnd() * WCOLS); this.rocks.push({ col, x: col * CW + CW / 2, y: -6, vy: 60 + this.siege * 12 }); this.spawnT = Math.max(0.4, 1.4 - this.siege * 0.12) * (0.6 + this.rnd() * 0.7); }
    // rocks fall
    for (let i = this.rocks.length - 1; i >= 0; i--) { const r = this.rocks[i]; r.y += r.vy * dt; if (r.y >= WALLY - 2) { this.rocks.splice(i, 1); if (this.wall[r.col] > 0) { this.wall[r.col]--; this.addShake(1.5); this.hitstop(0.02); this.fxBurst(r.x, WALLY, "#8a6a4a", 6, 70); this.noise(0.08, 0.05); this.tone(180, 0.08, "square", 0.05); this.repairStreak = 0; } else { this.keep--; this.flash = 1; this.addShake(4); this.buzz(90); this.fxBurst(r.x, WALLY + 20, "#ff5d7d", 10, 90); this.fxPop(r.x, WALLY + 8, "BREACH!", "#ff5d7d"); this.noise(0.16, 0.06); this.tone(140, 0.2, "square", 0.05); if (this.keep <= 0) { this.gameOver(); return; } } }
    }
    // survived a siege bump
    if (Math.floor(this.time) > 0 && Math.floor(this.time) % 20 === 0 && Math.floor(this.time - dt) % 20 !== 0) { this.music?.playJingle(CLEAR_JINGLE, 165); this.fxPop(LW / 2, 50, "SIEGE " + this.siege, "#ffd24a", 1); }
    this.report();
  }

  // ---- draw ----
  protected render() {
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#5a2020" : "#3a2a4a", "#160f1e");
    // hills / catapults hint
    for (let x = 0; x < LW; x += 40) { this.disc(x + 20, 30, 18, "#2a2038"); }
    // keep (castle behind wall)
    this.rect(60, WALLY + 6, LW - 120, LH - WALLY - 6, "#4a3f5a"); this.rect(60, WALLY + 6, LW - 120, 3, "#6a5f7a");
    for (let x = 70; x < LW - 70; x += 16) this.rect(x, WALLY + 8, 6, 4, "#5a4f6a");
    // keep stones (HP)
    for (let i = 0; i < 6; i++) this.rect(LW / 2 - 24 + i * 8, WALLY + 20, 6, 6, i < this.keep ? "#ffd24a" : "#2a2438");
    // wall
    for (let c = 0; c < WCOLS; c++) { const x = c * CW, hp = this.wall[c]; const h = 16; if (hp === 2) { this.shelf(x, WALLY, CW, h, "#a86a44"); this.rect(x, WALLY + h / 2, CW, 1, "#7a4a2c"); this.rect(x + 1, WALLY + 1, CW - 2, 1, "#c98a5c"); } else if (hp === 1) { this.shelf(x, WALLY + 6, CW, h - 6, "#8a5a3a"); } else { this.rect(x, WALLY + h - 3, CW, 3, "#3a2a1a"); } }
    // rocks
    for (const r of this.rocks) { this.ball(r.x | 0, r.y | 0, 5, "#6a5a4a"); this.px((r.x | 0) - 1, (r.y | 0) - 1, "#8a7a6a"); }
    // mason (player)
    { const x = this.pcol * CW + CW / 2, y = WALLY - 6 - (this.layAnim > 0 ? 2 : 0); this.rect(x - 3, y - 6, 6, 8, "#3bb6ff"); this.disc(x, y - 8, 3, "#f0c9a0"); this.rect(x - 3, y - 11, 6, 2, "#ffd24a"); if (this.layAnim > 0) this.rect(x + 2, y - 2, 4, 2, "#c98a54"); }

    this.drawFx();

    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#e6ddf5", 1, false);
    this.text(120, 3, "SIEGE " + this.siege, "#ffd24a", 1, false);
    this.text(180, 3, "KEEP", "#ff5d7d", 1, false); for (let i = 0; i < 6; i++) this.disc(206 + i * 6, 6, 2, i < this.keep ? "#ff5d7d" : "#3a2a2a");

    if (this.state !== "play") this.overlay();
  }
  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(40, "BRICK & MORTAR", "#ffd24a", 1);
      this.textCenter(64, "LAY BRICK TO PLUG THE GAPS", "#c3b4de", 1);
      this.textCenter(84, "ROCKS THROUGH A HOLE HIT THE KEEP", "#83769c", 1);
      this.textCenter(96, "A LAY-STREAK DROPS A REINFORCE", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 22, "PRESS LAY TO START", "#ffec27", 1);
    } else {
      this.textCenter(50, "OVERRUN!", "#ff5d7d", 2);
      this.textCenter(76, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(90, "BEST " + this.best, "#ffd24a", 1);
      void shade;
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 22, "PRESS LAY TO RETRY", "#ffec27", 1);
    }
  }
}
