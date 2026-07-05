// Cirql Mancala — engine (CirqlCade, Strategy). The ancient sowing game wrapped
// onto a ring: 6 pits + a store per side. Tap one of your pits to sow its stones
// counter-clockwise; land your last stone in your store for a free turn, or in
// one of your empty pits to capture the stones opposite. Most stones wins.
//
// Board indices around the ring: 0–5 your pits, 6 your store, 7–12 rival pits,
// 13 rival store. Sowing skips the opponent's store.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface MancalaHud { you: number; them: number; turn: 0 | 1; best: number; }
export interface MancalaResult { won: boolean; you: number; them: number; best: number; }
export interface MancalaOpts extends ArcadeOpts { accent?: string; onHud?: (s: MancalaHud) => void; onRunEnd?: (r: MancalaResult) => void; }

type Flow = "menu" | "playing" | "over";

export class MancalaEngine extends ArcadeEngine {
  private opts: MancalaOpts;
  private accent = "#fbbf24";
  private flow: Flow = "menu";
  private pits: number[] = [];
  private turn: 0 | 1 = 0;
  private aiTimer = 0;
  private best = +(LS.get("cmancala_best") || 0);
  private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: MancalaOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.reset(); this.emitHud(); }

  private reset() { this.pits = [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0]; this.turn = 0; this.aiTimer = 0; }
  start() { this.flow = "playing"; this.reset(); this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; }
  peekBest() { return this.best; }

  // ---- rules ----
  private sow(pits: number[], pit: number, side: 0 | 1): { freeTurn: boolean } {
    const store = side === 0 ? 6 : 13, oppStore = side === 0 ? 13 : 6;
    let stones = pits[pit]; pits[pit] = 0; let i = pit;
    while (stones > 0) { i = (i + 1) % 14; if (i === oppStore) continue; pits[i]++; stones--; }
    const lo = side === 0 ? 0 : 7, hi = side === 0 ? 5 : 12;
    if (i >= lo && i <= hi && pits[i] === 1) { const opp = 12 - i; if (pits[opp] > 0) { pits[store] += pits[opp] + 1; pits[i] = 0; pits[opp] = 0; } }
    return { freeTurn: i === store };
  }
  private sideEmpty(pits: number[], side: 0 | 1) { const lo = side === 0 ? 0 : 7; for (let k = lo; k < lo + 6; k++) if (pits[k] > 0) return false; return true; }
  private sweepRemainder(pits: number[]) { let a = 0, b = 0; for (let k = 0; k < 6; k++) { a += pits[k]; pits[k] = 0; } for (let k = 7; k < 13; k++) { b += pits[k]; pits[k] = 0; } pits[6] += a; pits[13] += b; }

  private move(pit: number) {
    const { freeTurn } = this.sow(this.pits, pit, this.turn);
    if (this.sideEmpty(this.pits, 0) || this.sideEmpty(this.pits, 1)) { this.sweepRemainder(this.pits); this.gameOver(); return; }
    if (!freeTurn) this.turn = (this.turn ^ 1) as 0 | 1;
    if (this.turn === 1) this.aiTimer = 0.6; // rival to move (fresh or continuing a free turn)
    this.emitHud();
  }

  private aiMove() {
    const cands: { p: number; score: number }[] = [];
    for (let p = 7; p <= 12; p++) { if (this.pits[p] <= 0) continue; const clone = this.pits.slice(); const { freeTurn } = this.sow(clone, p, 1); cands.push({ p, score: (clone[13] - this.pits[13]) * 2 + (freeTurn ? 3 : 0) + Math.random() }); }
    if (!cands.length) { this.sweepRemainder(this.pits); this.gameOver(); return; }
    cands.sort((a, b) => b.score - a.score);
    this.tone(320, 0.05, "square", 0.03);
    this.move(cands[0].p);
  }

  private gameOver() { this.flow = "over"; const you = this.pits[6], them = this.pits[13]; const won = you > them; this.best = Math.max(this.best, you); LS.set("cmancala_best", String(this.best)); [won ? 392 : 262, won ? 523 : 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "triangle", 0.05), i * 130)); this.opts.onRunEnd?.({ won, you, them, best: this.best }); this.emitHud(); }

  // ---- input ----
  protected onPointerDown(e: PointerEvent) {
    if (this.flow !== "playing" || this.turn !== 0) return;
    const p = this.pointerPos(e); let hit = -1, bd = this.pitR() * 1.7;
    for (let i = 0; i <= 5; i++) { const c = this.pitPos(i); const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < bd) { bd = d; hit = i; } }
    if (hit >= 0 && this.pits[hit] > 0) { this.tone(440, 0.05, "square", 0.03); this.move(hit); }
  }

  protected step(dt: number, _now: number) {
    if (this.flow !== "playing") return;
    if (this.turn === 1 && this.aiTimer > 0) { this.aiTimer -= dt; if (this.aiTimer <= 0) this.aiMove(); }
  }

  private emitHud() { if (!this.opts.onHud) return; const sig = [this.pits[6], this.pits[13], this.turn].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ you: this.pits[6], them: this.pits[13], turn: this.turn, best: this.best }); }

  // ---- geometry ----
  private pitR() { return this.rimR * 0.1; }
  private pitPos(i: number) { const a = Math.PI / 2 + i * (TAU / 14); return { x: this.cx + Math.cos(a) * this.rimR * 0.72, y: this.cy + Math.sin(a) * this.rimR * 0.72 }; }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    ctx.beginPath(); ctx.arc(cx, cy, rimR * 0.72, 0, TAU); ctx.strokeStyle = "rgba(150,130,255,.1)"; ctx.lineWidth = 1; ctx.stroke();
    for (let i = 0; i < 14; i++) {
      const isStore = i === 6 || i === 13;
      const mine = i <= 6, c = this.pitPos(i), r = this.pitR() * (isStore ? 1.35 : 1);
      const col = isStore ? "#fbbf24" : mine ? this.accent : "#fb7185";
      const playable = this.flow === "playing" && this.turn === 0 && i <= 5 && this.pits[i] > 0;
      if (playable) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(c.x, c.y, r + 5, 0, TAU); ctx.stroke(); }
      ctx.fillStyle = col + "26"; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.shadowBlur = isStore ? 14 : 8; ctx.shadowColor = col;
      ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, TAU); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `700 ${Math.round(r * (isStore ? 0.9 : 1))}px system-ui`;
      ctx.fillText(String(this.pits[i]), c.x, c.y);
    }
    if (this.flow === "playing") {
      ctx.fillStyle = this.turn === 0 ? this.accent : "rgba(230,233,255,.5)"; ctx.textAlign = "center"; ctx.font = "700 13px system-ui";
      ctx.fillText(this.turn === 0 ? "Your move — tap a pit" : "Rival thinking…", cx, cy);
    }
    void now;
  }
}
