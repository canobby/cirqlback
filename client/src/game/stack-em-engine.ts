// stack-em-engine — Main Street cabinet (Tower Bloxx / "Stack" homage). A pancake
// house: a pancake slides back and forth over the stack — tap DROP to land it. Any
// overhang is sliced off and the stack narrows; a dead-centre drop is PERFECT, keeps
// the full width and builds a combo (and widens the stack back a touch). Miss the
// stack entirely and breakfast is over. Signature twist: a WOBBLE meter grows with
// sloppy drops (the whole stack sways); a perfect drop steadies it for a bonus.
// RetroEngine + juice + MusicKit; one-button DROP.

import { RetroEngine, shade, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const BEST_KEY = "stack_best";
const BLOCK_H = 13;
const GROUND = 4000;
const MOVER_Y = 40;           // screen-y the active pancake rides at
const INIT_W = 90;
const CENTER = LW / 2;

interface Blk { cx: number; w: number; perfect: boolean }

const STACK_THEME: Track = {
  bpm: 120,
  layers: [
    { role: "lead", wave: "square", gain: 0.36, pattern: [
      { n: "C5", d: 2 }, { n: "E5", d: 2 }, { n: "G5", d: 2 }, { n: "E5", d: 2 }, { n: "F5", d: 2 }, { n: "A5", d: 2 }, { n: "G5", d: 4 },
      { n: "E5", d: 2 }, { n: "C5", d: 2 }, { n: "D5", d: 2 }, { n: "E5", d: 2 }, { n: "C5", d: 4 },
    ] },
    { role: "harmony", wave: "square", gain: 0.14, minIntensity: 0.4, pattern: [{ n: 0, d: 2 }, { n: "C4", d: 2 }, { n: 0, d: 2 }, { n: "F4", d: 2 }] },
    { role: "bass", wave: "triangle", gain: 0.48, pattern: [{ n: "C3", d: 2 }, { n: "C3", d: 2 }, { n: "F2", d: 2 }, { n: "F2", d: 2 }, { n: "G2", d: 2 }, { n: "G2", d: 2 }, { n: "C3", d: 2 }, { n: "C3", d: 2 }] },
    { role: "drums", minIntensity: 0.3, pattern: [{ n: "K", d: 4 }, { n: "S", d: 4 }] },
  ],
};

export class StackEmEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private blocks: Blk[] = [];
  private mover = { cx: CENTER, w: INIT_W, dir: 1, spd: 80 };
  private score = 0; private combo = 0; private wobble = 0; private best = +(LS.get(BEST_KEY) || 0);
  private drops = 0; private slice: { x: number; w: number; y: number; vy: number; vx: number } | null = null;
  private flash = 0; private landAnim = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.4 });
    this.blocks = [{ cx: CENTER, w: INIT_W, perfect: false }];   // base plate
    this.start();
  }
  protected onGesture() { this.music?.play(STACK_THEME); }

  private beginGame() { this.blocks = [{ cx: CENTER, w: INIT_W, perfect: false }]; this.score = 0; this.combo = 0; this.wobble = 0; this.drops = 0; this.slice = null; this.spawnMover(); this.state = "play"; this.clearFx(); this.music?.setIntensity(0.5); this.report(); }
  private gameOver() { this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); } this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(5); this.hooks.onRunEnd?.({ score: this.score, shift: this.blocks.length - 1 }); this.report(); }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, shift: this.blocks.length - 1, combo: this.combo, lives: 0 }); }

  private spawnMover() { const top = this.blocks[this.blocks.length - 1]; this.mover = { cx: this.drops % 2 ? LW - 20 : 20, w: top.w, dir: this.drops % 2 ? -1 : 1, spd: Math.min(190, 80 + this.blocks.length * 5) }; }

  private drop() {
    const top = this.blocks[this.blocks.length - 1];
    const left = Math.max(this.mover.cx - this.mover.w / 2, top.cx - top.w / 2);
    const right = Math.min(this.mover.cx + this.mover.w / 2, top.cx + top.w / 2);
    const overlap = right - left;
    const topY = MOVER_Y + BLOCK_H;
    if (overlap <= 2) { // total miss
      this.slice = { x: this.mover.cx, w: this.mover.w, y: MOVER_Y, vy: 20, vx: 0 }; this.addShake(3); this.buzz(80); this.noise(0.16, 0.05); this.tone(150, 0.2, "square", 0.05); this.gameOver(); return;
    }
    const off = Math.abs(this.mover.cx - top.cx);
    const perfect = off < 3.2;
    let ncx: number, nw: number;
    if (perfect) { ncx = top.cx; nw = Math.min(INIT_W, top.w + 5); this.combo++; this.wobble = Math.max(0, this.wobble - 0.4); this.landAnim = 1;
      this.fxRing(ncx, topY, "#ffd24a", 24); this.fxPop(ncx, topY - 10, this.combo > 1 ? "PERFECT x" + this.combo : "PERFECT!", "#ffd24a"); this.addShake(1); this.hitstop(0.04); this.tone(880, 0.06, "square", 0.05); this.tone(1318, 0.09, "square", 0.05);
    } else {
      ncx = (left + right) / 2; nw = overlap; this.combo = 0; this.wobble = Math.min(1, this.wobble + off / 60);
      // the sliced-off overhang falls
      const sliceOnRight = this.mover.cx > top.cx; const sw = this.mover.w - overlap; const sx = sliceOnRight ? right + sw / 2 : left - sw / 2;
      this.slice = { x: sx, w: sw, y: MOVER_Y, vy: 10, vx: sliceOnRight ? 40 : -40 };
      this.fxBurst(ncx, topY, "#e0a860", 6, 60); this.addShake(0.6); this.tone(360, 0.05, "square", 0.04);
    }
    this.blocks.push({ cx: ncx, w: nw, perfect }); this.drops++;
    this.score += 10 + (perfect ? 20 + this.combo * 5 : 0); this.buzz(6);
    if (this.blocks.length % 10 === 0) { this.music?.playJingle(CLEAR_JINGLE, 165); this.music?.setIntensity(Math.min(1, 0.5 + this.blocks.length * 0.02)); }
    this.spawnMover(); this.report();
  }

  protected update(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 3); this.landAnim = Math.max(0, this.landAnim - dt * 4);
    if (this.slice) { this.slice.y += this.slice.vy * dt; this.slice.vy += 400 * dt; this.slice.x += this.slice.vx * dt; if (this.slice.y > LH + 20) this.slice = null; }
    if (this.state !== "play") { if (this.pressed.a || this.pointer.down) this.beginGame(); return; }
    // move the pancake
    this.mover.cx += this.mover.dir * this.mover.spd * dt;
    const half = this.mover.w / 2;
    if (this.mover.cx > LW - half - 6) { this.mover.cx = LW - half - 6; this.mover.dir = -1; }
    if (this.mover.cx < half + 6) { this.mover.cx = half + 6; this.mover.dir = 1; }
    if (this.pressed.a) this.drop();
  }

  // ---- draw ----
  private camY() { const moverWorldTop = GROUND - this.blocks.length * BLOCK_H; return moverWorldTop - MOVER_Y; }
  private pancake(cx: number, topY: number, w: number, perfect: boolean, sway: number) {
    const x = Math.round(cx + sway - w / 2);
    this.shelf(x, topY, w, BLOCK_H, perfect ? "#f0b429" : "#e0a860");
    this.rect(x, topY + 1, w, 2, "#ffe0a0");                     // fluffy highlight
    this.rect(x, topY + BLOCK_H - 2, w, 2, shade("#e0a860", -0.4)); // syrup shadow
    if (perfect) { this.rect(x + w / 2 - 4, topY - 3, 8, 4, "#fff1c0"); } // butter pat
  }
  protected render() {
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#4a2010" : "#2a1c3a", "#120a1e");
    // soft morning sun
    this.disc(200, 30, 14, "#ffcf7a"); this.ring(200, 30, 18, "#ffe0a040", 3);
    const cam = this.camY();
    const swayAmp = this.wobble * 6;
    // stacked pancakes
    for (let i = this.blocks.length - 1; i >= 0; i--) {
      const b = this.blocks[i]; const worldTop = GROUND - i * BLOCK_H; const sy = worldTop - cam;
      if (sy > LH + BLOCK_H || sy < -BLOCK_H) continue;
      const sway = Math.sin((this.tSec() * 2) + i * 0.4) * swayAmp * (i / Math.max(1, this.blocks.length));
      this.pancake(b.cx, sy, b.w, b.perfect, sway);
    }
    // falling slice
    if (this.slice) { const s = this.slice; this.shelf(Math.round(s.x - s.w / 2), Math.round(s.y), Math.max(2, s.w), BLOCK_H, "#c98a44"); }
    // active pancake
    if (this.state === "play") this.pancake(this.mover.cx, MOVER_Y, this.mover.w, false, 0);

    this.drawFx();

    // HUD
    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "STACK " + (this.blocks.length - 1), "#ffe6c2", 1, false);
    this.text(120, 3, "SCORE " + this.score, "#ffd24a", 1, false);
    // wobble meter
    this.text(3, LH - 10, "WOBBLE", "#83769c", 1, false);
    this.rect(44, LH - 9, 40, 4, "#2a2438"); this.rect(44, LH - 9, Math.round(40 * this.wobble), 4, this.wobble > 0.7 ? "#ff5d7d" : "#ffd24a");
    if (this.combo > 1) this.text(LW - 40, 3, "x" + this.combo, "#ffd24a", 1, false);

    if (this.state !== "play") this.overlay();
  }
  private tSec() { return performance.now() / 1000; }
  private overlay() {
    this.b.globalAlpha = 0.7; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(44, "STACK 'EM", "#ffd24a", 2);
      this.textCenter(68, "STACK THE PANCAKES", "#c3b4de", 1);
      this.textCenter(88, "TAP DROP WHEN IT LINES UP", "#83769c", 1);
      this.textCenter(100, "A CENTRED DROP IS PERFECT", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 22, "PRESS DROP TO START", "#ffec27", 1);
    } else {
      this.textCenter(50, "TIMBER!", "#ff5d7d", 2);
      this.textCenter(76, "STACK " + (this.blocks.length - 1), "#fff4ea", 1);
      this.textCenter(90, "SCORE " + this.score + "   BEST " + this.best, "#ffd24a", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 22, "PRESS DROP TO RETRY", "#ffec27", 1);
    }
  }
}
