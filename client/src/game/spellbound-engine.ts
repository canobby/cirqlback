// SPELLBOUND — a Wordle homage, a MODERN cabinet (CHR-205).
//
// The bookshop's word-of-the-day: guess the hidden five-letter word in six tries. Green
// = right letter, right spot; amber = in the word, wrong spot; grey = not in it. Tap the
// keys (or type on a real keyboard). Fewer guesses = a bigger score. On-brand with the
// per-game Daily leaderboard.

import { RetroEngine, shade, mix, type RetroHooks } from "./retro-engine";
import { MusicKit, MAIN_STREET_THEME } from "./musickit";

const WORDS = [
  "APPLE", "BREAD", "CHAIR", "DANCE", "EAGLE", "FLAME", "GRAPE", "HOUSE", "IVORY", "JELLY",
  "KOALA", "LEMON", "MANGO", "NIGHT", "OCEAN", "PIANO", "QUILT", "RIVER", "STORM", "TIGER",
  "UNCLE", "VOICE", "WATER", "XENON", "YACHT", "ZEBRA", "BRICK", "CLOUD", "DREAM", "EARTH",
  "FROST", "GLOVE", "HONEY", "INDEX", "JOKER", "KNEEL", "LIGHT", "MONEY", "NURSE", "OLIVE",
  "PEACH", "QUEEN", "ROBOT", "SUGAR", "TABLE", "URBAN", "VIVID", "WHEAT", "YIELD", "ZESTY",
  "BAKER", "CANDY", "DINER", "FERRY", "GRILL", "MERGE", "PIZZA", "SPINS", "TACOS", "VINYL",
  "ARROW", "BLOOM", "CRANE", "DELTA", "EMBER", "FABLE", "GLINT", "HATCH", "INLET", "JOLLY",
  "KARMA", "LUNAR", "MIRTH", "NOVEL", "ONSET", "PLUMB", "QUARK", "RALLY", "SWIFT", "TRACE",
];

interface Guess { word: string; hint: number[] }   // hint: 0 grey, 1 amber, 2 green

const R = 6, C = 5;
const KROWS = ["QWERTYUIOP", "ASDFGHJKL", "✓ZXCVBNM←"];   // ✓ = enter, ← = back

export class SpellboundEngine extends RetroEngine {
  private answer = ""; private guesses: Guess[] = []; private cur = ""; private keyState: Record<string, number> = {};
  private state: "ready" | "play" | "over" = "ready"; private won = false;
  private score = 0; private best = 0; private tAnim = 0; private shakeRow = 0; private msg = ""; private msgT = 0;
  private lastDown = false; private keyHandler: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, 200, 210);
    this.music = new MusicKit();
    try { this.best = +(window.localStorage.getItem("spellbound_best") || 0); } catch { /* ignore */ }
    this.keyHandler = (e: KeyboardEvent) => {
      if (this.state !== "play") { if (e.key === "Enter") this.begin(); return; }
      if (e.key === "Enter") this.submit(); else if (e.key === "Backspace") this.backspace(); else if (/^[a-zA-Z]$/.test(e.key)) this.type(e.key.toUpperCase());
    };
    window.addEventListener("keydown", this.keyHandler);
    this.newGame();
    this.running = true;
    this.emit();
  }
  protected onDestroy() { window.removeEventListener("keydown", this.keyHandler); }
  protected onGesture() { this.music?.play(MAIN_STREET_THEME); this.music?.setIntensity(0.4); }

  private newGame() { this.answer = WORDS[Math.floor(Math.random() * WORDS.length)]; this.guesses = []; this.cur = ""; this.keyState = {}; this.won = false; }
  private begin() { this.newGame(); this.state = "play"; this.msg = ""; this.music?.setIntensity(0.7); this.emit(); }
  protected onStart() { this.begin(); }
  protected onMenu() { this.state = "ready"; this.newGame(); this.emit(); }
  private emit() { this.hooks.onHud?.({ state: this.state, score: this.score, row: this.guesses.length, best: this.best }); }

  private type(ch: string) { if (this.cur.length < C) { this.cur += ch; this.tone(600, 0.02, "square", 0.03); } }
  private backspace() { if (this.cur.length) { this.cur = this.cur.slice(0, -1); this.tone(400, 0.02, "square", 0.03); } }
  private flash(m: string) { this.msg = m; this.msgT = 1.2; this.shakeRow = 1; this.tone(200, 0.08, "square", 0.05); this.buzz(12); }

  private submit() {
    if (this.cur.length < C) { this.flash("5 LETTERS"); return; }
    const g = this.cur, hint = this.score5(g, this.answer);
    this.guesses.push({ word: g, hint });
    for (let i = 0; i < C; i++) { const ch = g[i]; this.keyState[ch] = Math.max(this.keyState[ch] ?? -1, hint[i]); }
    this.cur = "";
    this.addShake(0.4); this.tone(520, 0.05, "square", 0.05); this.tone(700, 0.05, "square", 0.04); this.buzz(6);
    if (g === this.answer) return this.win();
    if (this.guesses.length >= R) return this.lose();
    this.emit();
  }
  /** Standard two-pass Wordle scoring (greens first, then ambers by remaining letter counts). */
  private score5(g: string, a: string): number[] {
    const hint = new Array(C).fill(0); const left: Record<string, number> = {};
    for (let i = 0; i < C; i++) { if (g[i] === a[i]) hint[i] = 2; else left[a[i]] = (left[a[i]] ?? 0) + 1; }
    for (let i = 0; i < C; i++) { if (hint[i] === 2) continue; if (left[g[i]] > 0) { hint[i] = 1; left[g[i]]--; } }
    return hint;
  }
  private win() { this.won = true; this.state = "over"; const g = this.guesses.length; this.score = (R - g + 1) * 200 + 100; this.finish(); const rows = this.guesses.length; this.fxPop(this.LW / 2, 24, "SOLVED!", "#33e650", 2); this.tone(523, 0.08, "square", .05); this.tone(659, 0.08, "square", .05); this.tone(880, 0.16, "square", .05); this.addShake(1); void rows; }
  private lose() { this.won = false; this.state = "over"; this.score = 40; this.finish(); this.tone(200, 0.3, "square", 0.06); this.music?.setIntensity(0.2); }
  private finish() { if (this.score > this.best) { this.best = this.score; try { window.localStorage.setItem("spellbound_best", String(this.best)); } catch { /* ignore */ } } this.hooks.onRunEnd?.({ score: this.score, shift: this.won ? R - this.guesses.length + 1 : 0 }); this.emit(); }

  // ---------- input ----------
  private keyAt(px: number, py: number): string | null {
    for (const k of this.keyRects()) if (px >= k.x && px < k.x + k.w && py >= k.y && py < k.y + k.h) return k.ch;
    return null;
  }
  protected update(dt: number) {
    this.tAnim += dt; this.msgT = Math.max(0, this.msgT - dt); this.shakeRow = Math.max(0, this.shakeRow - dt * 4);
    if (this.pointer.down && !this.lastDown) {
      if (this.state !== "play") this.begin();
      else { const k = this.keyAt(this.pointer.x, this.pointer.y); if (k === "✓") this.submit(); else if (k === "←") this.backspace(); else if (k) this.type(k); }
    }
    if (this.state !== "play" && this.pressed.a) this.begin();
    this.lastDown = this.pointer.down;
  }

  // ---------- render ----------
  private keyRects() {
    const out: { ch: string; x: number; y: number; w: number; h: number }[] = [];
    const ky = 150, kh = 17, kw = 18, gap = 1;
    KROWS.forEach((row, r) => {
      const rw = row.length * (kw + gap) + (r === 2 ? kw : 0);
      let x = (this.LW - rw) / 2, y = ky + r * (kh + 2);
      for (const ch of row) { const w = (ch === "✓" || ch === "←") ? kw + 8 : kw; out.push({ ch, x, y, w, h: kh }); x += w + gap; }
    });
    return out;
  }
  protected render() {
    this.vgrad(0, 0, this.LW, this.LH, "#241a30", "#160c18");
    this.rect(0, 0, this.LW, 14, "#0a0714aa");
    this.textCenter(3, "SPELLBOUND", "#ff8ab5", 1);
    this.text(4, 3, `${this.score}`, "#ffd24a", 1, false);
    this.text(this.LW - 34, 3, `BEST ${this.best}`, "#83b0c8", 1, false);
    // grid
    const tile = 26, gx = (this.LW - C * (tile + 2)) / 2, gy = 20;
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const x = gx + c * (tile + 2), y = gy + r * (tile + 2);
      const gRow = this.guesses[r];
      const typing = r === this.guesses.length;
      const jitter = (typing && this.shakeRow > 0) ? Math.round(Math.sin(this.tAnim * 40) * this.shakeRow * 2) : 0;
      if (gRow) { const h = gRow.hint[c]; const col = h === 2 ? "#33a06a" : h === 1 ? "#c9a13a" : "#3a3448"; this.shelf(x, y, tile, tile, col); this.letter(x + tile / 2, y + tile / 2, gRow.word[c], "#fff1e8"); }
      else { this.rect(x + jitter, y, tile, tile, "#1c1626"); this.rectLine(x + jitter, y, tile, tile, "#3a3448"); if (typing && c < this.cur.length) this.letter(x + tile / 2 + jitter, y + tile / 2, this.cur[c], "#fff1e8"); }
    }
    // keyboard
    for (const k of this.keyRects()) {
      const st = this.keyState[k.ch] ?? -1;
      const base = k.ch === "✓" ? "#3a5a4a" : k.ch === "←" ? "#5a3a44" : st === 2 ? "#33a06a" : st === 1 ? "#c9a13a" : st === 0 ? "#2a2438" : "#4a4458";
      this.shelf(k.x, k.y, k.w, k.h, base);
      this.letter(k.x + k.w / 2, k.y + k.h / 2, k.ch, st === 0 ? "#6a647a" : "#fff1e8");
    }
    this.drawFx();
    if (this.msgT > 0) { this.rect(this.LW / 2 - 34, 132, 68, 12, "#0a0714dd"); this.textCenter(135, this.msg, "#ff8ab5", 1); }
    if (this.state === "ready") this.drawReady();
    if (this.state === "over") this.drawOver();
  }
  private letter(cx: number, cy: number, ch: string, col: string) {
    if (ch === "✓") { this.line(cx - 3, cy, cx - 1, cy + 3, col); this.line(cx - 1, cy + 3, cx + 4, cy - 3, col); return; }
    if (ch === "←") { this.line(cx - 4, cy, cx + 4, cy, col); this.line(cx - 4, cy, cx - 1, cy - 3, col); this.line(cx - 4, cy, cx - 1, cy + 3, col); return; }
    this.text(Math.round(cx - this.textWidth(ch, 1) / 2), Math.round(cy - 2), ch, col, 1, false);
  }
  private drawReady() {
    this.rect(0, 0, this.LW, this.LH, "#160c18cc");
    this.textCenter(56, "SPELLBOUND", "#ff8ab5", 2);
    this.textCenter(84, "GUESS THE 5-LETTER WORD", "#c2c3c7", 1);
    this.textCenter(98, "IN 6 TRIES - GREEN=RIGHT SPOT", "#83769c", 1);
    this.textCenter(112, "TAP KEYS OR TYPE", "#7be0ff", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(140, "TAP TO START", "#fff1e8", 1);
  }
  private drawOver() {
    this.rect(0, 0, this.LW, this.LH, "#160c18cc");
    this.textCenter(64, this.won ? "SPELLED IT!" : "OUT OF TRIES", this.won ? "#33e650" : "#ff5d7d", 2);
    if (!this.won) this.textCenter(88, `WORD: ${this.answer}`, "#ffd24a", 1);
    else this.textCenter(88, `IN ${this.guesses.length} - NICE!`, "#c2c3c7", 1);
    this.textCenter(104, `SCORE ${this.score}    BEST ${this.best}`, "#fff1e8", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(130, "TAP FOR A NEW WORD", "#7be0ff", 1);
  }
}
