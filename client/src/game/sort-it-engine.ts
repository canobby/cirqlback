// SORT IT — a Ball/Water-Sort homage, a MODERN cabinet (CHR-209).
//
// The pharmacy's vials got jumbled. Pour a colour onto the same colour until every vial
// holds just one — then the next, messier batch rolls in. It's a timed shift: solve as
// many as you can before the clock runs out. Jam yourself into a corner and the batch
// auto-reshuffles so you never truly stall. Tap a vial to lift, tap another to pour.

import { RetroEngine, shade, mix, type RetroHooks } from "./retro-engine";
import { MusicKit, MAIN_STREET_THEME } from "./musickit";

const CAP = 4, SHIFT = 90;
const COLORS = ["#ff5d7d", "#3bb6ff", "#ffd24a", "#33e650", "#b79bff", "#ff8a3d"];

export class SortItEngine extends RetroEngine {
  private tubes: number[][] = [];
  private sel = -1; private cursor = 0;
  private ncolors = 3; private level = 0;
  private state: "ready" | "play" | "over" = "ready";
  private t = 0; private tAnim = 0; private score = 0; private best = 0; private solvedT = 0; private msg = ""; private msgT = 0;
  private lastDown = false;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, 240, 180);
    this.music = new MusicKit();
    try { this.best = +(window.localStorage.getItem("sortit_best") || 0); } catch { /* ignore */ }
    this.build();
    this.running = true;
    this.emit();
  }
  protected onGesture() { this.music?.play(MAIN_STREET_THEME); this.music?.setIntensity(0.4); }

  private build() {
    const K = this.ncolors;
    const bag: number[] = [];
    for (let c = 0; c < K; c++) for (let i = 0; i < CAP; i++) bag.push(c);
    for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
    this.tubes = [];
    for (let c = 0; c < K; c++) this.tubes.push(bag.slice(c * CAP, c * CAP + CAP));
    this.tubes.push([]); this.tubes.push([]);         // two empties
    this.sel = -1; this.cursor = 0;
    if (this.solved()) this.build();                  // never start pre-solved
  }
  private reset() { this.ncolors = 3; this.level = 0; this.score = 0; this.t = 0; this.solvedT = 0; this.build(); this.clearFx(); }
  private begin() { this.reset(); this.state = "play"; this.msg = ""; this.music?.setIntensity(0.7); this.emit(); }
  protected onStart() { this.begin(); }
  protected onMenu() { this.state = "ready"; this.reset(); this.emit(); }
  private emit() { this.hooks.onHud?.({ state: this.state, score: this.score, level: this.level + 1, time: Math.max(0, SHIFT - this.t), best: this.best }); }

  private topRun(t: number[]): { col: number; n: number } { if (!t.length) return { col: -1, n: 0 }; const col = t[t.length - 1]; let n = 0; for (let i = t.length - 1; i >= 0 && t[i] === col; i--) n++; return { col, n }; }
  private canPour(a: number, b: number): boolean { if (a === b) return false; const ta = this.tubes[a], tb = this.tubes[b]; if (!ta.length) return false; if (tb.length >= CAP) return false; if (!tb.length) return true; return tb[tb.length - 1] === ta[ta.length - 1]; }
  private pour(a: number, b: number) {
    const { col, n } = this.topRun(this.tubes[a]); const space = CAP - this.tubes[b].length; const move = Math.min(n, space);
    for (let i = 0; i < move; i++) { this.tubes[a].pop(); this.tubes[b].push(col); }
    this.fxBurst(this.tubeX(b) + 8, this.tubeTopY(b), COLORS[col], 6, 60); this.tone(500, 0.05, "square", 0.05); this.tone(700, 0.05, "square", 0.04); this.buzz(6);
    if (this.solved()) this.levelDone();
    else if (!this.anyMove()) { this.msg = "JAMMED - RESHUFFLE"; this.msgT = 1.2; this.tone(220, 0.12, "square", 0.05); this.build(); }
  }
  private solved(): boolean { return this.tubes.every((t) => t.length === 0 || (t.length === CAP && t.every((v) => v === t[0]))); }
  private anyMove(): boolean { for (let a = 0; a < this.tubes.length; a++) for (let b = 0; b < this.tubes.length; b++) if (this.canPour(a, b)) return true; return false; }
  private levelDone() {
    const bonus = 150 + this.ncolors * 30; this.score += bonus; this.level++;
    this.state = "play"; this.solvedT = 0.9;
    this.fxPop(120, 30, `+${bonus} SORTED!`, "#33e650", 1); this.addShake(1); this.tone(523, 0.08, "square", .05); this.tone(659, 0.08, "square", .05); this.tone(880, 0.16, "square", .05); this.music?.setIntensity(1);
    if (this.level % 2 === 0 && this.ncolors < COLORS.length) this.ncolors++;
    this.build();
  }
  private over() { this.state = "over"; this.music?.setIntensity(0.2); if (this.score > this.best) { this.best = this.score; try { window.localStorage.setItem("sortit_best", String(this.best)); } catch { /* ignore */ } } this.hooks.onRunEnd?.({ score: this.score, shift: this.level }); this.emit(); }

  // layout
  private cols() { return this.tubes.length; }
  private tubeX(i: number) { const w = 22, gap = 6, total = this.cols() * w + (this.cols() - 1) * gap; return (this.LW - total) / 2 + i * (w + gap); }
  private tubeTopY(i: number) { return 44 + (CAP - this.tubes[i].length) * 18; }

  protected update(dt: number) {
    this.tAnim += dt; this.msgT = Math.max(0, this.msgT - dt); this.solvedT = Math.max(0, this.solvedT - dt);
    if (this.state === "ready" || this.state === "over") { if (this.pressed.a || this.pointer.down) this.begin(); this.lastDown = this.pointer.down; return; }
    this.t += dt; if (this.t >= SHIFT) return this.over();
    // pointer tap → tube
    if (this.pointer.down && !this.lastDown) { const i = this.tubeAt(this.pointer.x); if (i >= 0) { this.cursor = i; this.pick(i); } }
    this.lastDown = this.pointer.down;
    // pad
    if (this.pressed.left) this.cursor = (this.cursor + this.cols() - 1) % this.cols();
    if (this.pressed.right) this.cursor = (this.cursor + 1) % this.cols();
    if (this.pressed.a) this.pick(this.cursor);
    this.emit();
  }
  private tubeAt(px: number): number { for (let i = 0; i < this.cols(); i++) { const x = this.tubeX(i); if (px >= x - 3 && px < x + 25) return i; } return -1; }
  private pick(i: number) {
    if (this.sel < 0) { if (this.tubes[i].length) { this.sel = i; this.tone(620, 0.03, "square", 0.04); } return; }
    if (i === this.sel) { this.sel = -1; return; }
    if (this.canPour(this.sel, i)) { this.pour(this.sel, i); this.sel = -1; }
    else { this.sel = this.tubes[i].length ? i : -1; this.tone(this.tubes[i].length ? 620 : 200, 0.04, "square", 0.04); }
  }

  // ---------- render ----------
  protected render() {
    this.vgrad(0, 0, this.LW, this.LH, "#1a2230", "#0e141c");
    this.rect(0, 0, this.LW, 14, "#0a0714aa");
    this.text(4, 4, "SORTED", "#33e650", 1, false); this.text(40, 4, `${this.score}`, "#fff1e8", 1, false);
    this.text(96, 4, "VIAL", "#3bb6ff", 1, false); this.text(120, 4, `${this.level + 1}`, "#fff1e8", 1, false);
    const tl = Math.max(0, SHIFT - this.t); this.text(150, 4, "TIME", "#ff8ab5", 1, false); this.text(176, 4, `${Math.ceil(tl)}`, tl < 10 ? "#ff5d7d" : "#fff1e8", 1, false);
    for (let i = 0; i < this.cols(); i++) this.drawTube(i);
    this.drawFx();
    if (this.msgT > 0) { this.rect(this.LW / 2 - 44, 150, 88, 12, "#0a0714dd"); this.textCenter(153, this.msg, "#ff8ab5", 1); }
    if (this.state === "ready") this.drawReady();
    if (this.state === "over") this.drawOver();
  }
  private drawTube(i: number) {
    const x = this.tubeX(i), w = 22, botY = 44 + CAP * 18, topY = 44;
    const on = i === this.sel, cur = i === this.cursor && this.state === "play";
    // glass
    this.rect(x - 1, topY - 3, w + 2, botY - topY + 6, "#141a24");
    this.rectLine(x - 1, topY - 3, w + 2, botY - topY + 6, on ? "#fff1e8" : cur ? "#3bb6ff" : "#3a4556");
    // liquid segments bottom-up
    const t = this.tubes[i], lift = on ? 6 : 0;
    for (let s = 0; s < t.length; s++) {
      const isTopRun = s >= t.length - this.topRun(t).n;
      const y = botY - (s + 1) * 18, col = COLORS[t[s]];
      const dy = (on && isTopRun) ? -lift : 0;
      this.rect(x + 1, y + dy, w - 2, 18, col); this.rect(x + 1, y + dy, w - 2, 2, shade(col, 0.3)); this.rect(x + 1, y + dy + 16, w - 2, 2, shade(col, -0.25));
    }
    // cap glint
    this.rect(x + 2, topY - 3, 3, botY - topY + 4, "#ffffff10");
  }
  private drawReady() {
    this.rect(0, 0, this.LW, this.LH, "#0e141ccc");
    this.textCenter(50, "SORT IT", "#33e650", 3);
    this.textCenter(80, "POUR A COLOUR ONTO THE SAME COLOUR", "#c2c3c7", 1);
    this.textCenter(96, "MAKE EVERY VIAL ONE COLOUR - BEAT THE CLOCK", "#83769c", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(126, "TAP TO START", "#fff1e8", 1);
  }
  private drawOver() {
    this.rect(0, 0, this.LW, this.LH, "#0e141ccc");
    this.textCenter(54, "SHIFT'S UP!", "#33e650", 2);
    this.textCenter(80, `${this.level} BATCHES SORTED`, "#fff1e8", 1);
    this.textCenter(96, `SCORE ${this.score}    BEST ${this.best}`, "#3bb6ff", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(124, "TAP TO SORT AGAIN", "#7be0ff", 1);
  }
}
