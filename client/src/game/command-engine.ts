// Cirql Command — engine (CirqlCade). Galcon, ringed. Nodes of light sit around the
// disc, each swelling with troops. Tap one of yours, then a target, to fling half its
// force there — reinforce your own or storm a rival's. Take every node to win; lose
// them all and it's over. A quick war in one thumb.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface CommandHud { yours: number; enemy: number; }
export interface CommandResult { won: boolean; nodes: number; best: number; }
export interface CommandOpts extends ArcadeOpts { accent?: string; onHud?: (s: CommandHud) => void; onRunEnd?: (r: CommandResult) => void; }

type Flow = "menu" | "playing" | "over";
type Owner = 0 | 1 | 2; // 0 neutral, 1 you, 2 enemy
interface Node { x: number; y: number; owner: Owner; count: number; }
interface Fleet { fx: number; fy: number; tx: number; ty: number; owner: Owner; count: number; prog: number; ti: number; }
const COL = ["#8a86b8", "#34d399", "#fb7185"];

export class CommandEngine extends ArcadeEngine {
  private opts: CommandOpts;
  private accent = "#34d399";
  private flow: Flow = "menu";
  private nodes: Node[] = []; private fleets: Fleet[] = []; private sel = -1; private best = +(LS.get("ccommand_best") || 0);
  private aiAt = 0; private growAt = 0; private wave = 0; private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: CommandOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }

  start() { this.flow = "playing"; this.wave = 0; this.build(); this.fleets = []; this.sel = -1; this.aiAt = 0; this.growAt = 0; this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.nodes = []; this.fleets = []; this.clearFx(); }
  private build() {
    this.wave++; const n = 6 + Math.min(4, this.wave); this.nodes = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU - Math.PI / 2, d = this.rimR * (0.4 + (i % 2) * 0.42); this.nodes.push({ x: this.cx + Math.cos(a) * d, y: this.cy + Math.sin(a) * d, owner: 0, count: 8 + Math.floor(Math.random() * 8) }); }
    this.nodes[0].owner = 1; this.nodes[0].count = 20; this.nodes[n - 1].owner = 2; this.nodes[n - 1].count = 20;
  }
  peekBest() { return this.best; }

  protected onPointerDown(e: PointerEvent) {
    if (this.flow !== "playing") return; const p = this.pointerPos(e);
    let hit = -1, bd = this.rimR * 0.11; for (let i = 0; i < this.nodes.length; i++) { const d = Math.hypot(this.nodes[i].x - p.x, this.nodes[i].y - p.y); if (d < bd) { bd = d; hit = i; } }
    if (hit < 0) { this.sel = -1; return; }
    if (this.sel < 0) { if (this.nodes[hit].owner === 1) { this.sel = hit; this.tone(360, 0.04, "sine", 0.03); } return; }
    if (hit === this.sel) { this.sel = -1; return; }
    this.send(this.sel, hit, 1); this.sel = -1;
  }
  private send(from: number, to: number, owner: Owner) {
    const src = this.nodes[from]; if (src.owner !== owner || src.count < 2) return; const c = Math.floor(src.count / 2); src.count -= c;
    this.fleets.push({ fx: src.x, fy: src.y, tx: this.nodes[to].x, ty: this.nodes[to].y, owner, count: c, prog: 0, ti: to }); this.tone(owner === 1 ? 440 : 300, 0.06, "triangle", 0.04);
  }

  protected step(dt: number, now: number) {
    if (this.flow !== "playing") return;
    // growth
    this.growAt -= dt; if (this.growAt <= 0) { this.growAt = 0.7; for (const nd of this.nodes) if (nd.owner !== 0 && nd.count < 60) nd.count++; }
    // AI
    if (now > this.aiAt) { this.aiAt = now + 1400; const mine = this.nodes.map((n, i) => ({ n, i })).filter((x) => x.n.owner === 2 && x.n.count > 6); if (mine.length) { const src = mine[Math.floor(Math.random() * mine.length)]; const targets = this.nodes.map((n, i) => ({ n, i })).filter((x) => x.i !== src.i && x.n.count < src.n.count); if (targets.length) { const t = targets.sort((a, b) => a.n.count - b.n.count)[0]; this.send(src.i, t.i, 2); } } }
    // fleets
    for (const f of this.fleets) { f.prog += dt * 0.9; if (f.prog >= 1) { const nd = this.nodes[f.ti]; if (nd.owner === f.owner) nd.count += f.count; else { nd.count -= f.count; if (nd.count < 0) { nd.owner = f.owner; nd.count = -nd.count; } else if (nd.count === 0) nd.owner = 0; } (f as any).done = true; this.burst(nd.x, nd.y, COL[f.owner], 6, this.rimR * 0.4); } }
    this.fleets = this.fleets.filter((f) => !(f as any).done);
    // win/lose
    const yours = this.nodes.filter((n) => n.owner === 1).length + this.fleets.filter((f) => f.owner === 1).length;
    const enemy = this.nodes.filter((n) => n.owner === 2).length + this.fleets.filter((f) => f.owner === 2).length;
    if (enemy === 0) { this.win(); return; }
    if (yours === 0) { this.gameOver(false); return; }
    this.emitHud();
  }
  private win() { this.tone(880, 0.2, "sine", 0.05); this.pop(this.cx, this.cy, "CONQUERED", "#34d399"); if (this.wave >= 4) { this.gameOver(true); } else { this.build(); this.fleets = []; this.emitHud(); } }
  private gameOver(won: boolean) { this.flow = "over"; const nodes = this.wave; const scoreBase = won ? 100 * this.wave : 20 * (this.wave - 1); this.best = Math.max(this.best, scoreBase); LS.set("ccommand_best", String(this.best)); if (won) [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, "sine", 0.05), i * 90)); else [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sawtooth", 0.05), i * 120)); this.opts.onRunEnd?.({ won, nodes, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const yours = this.nodes.filter((n) => n.owner === 1).length; const enemy = this.nodes.filter((n) => n.owner === 2).length; const sig = [yours, enemy].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ yours, enemy }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(52,211,153,.05)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    // selection link
    if (this.sel >= 0) { const s = this.nodes[this.sel]; ctx.strokeStyle = "rgba(52,211,153,.4)"; ctx.lineWidth = 2; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(s.x, s.y, rimR * 0.1, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    for (const f of this.fleets) { const x = f.fx + (f.tx - f.fx) * f.prog, y = f.fy + (f.ty - f.fy) * f.prog; ctx.save(); ctx.shadowBlur = 8; ctx.shadowColor = COL[f.owner]; ctx.fillStyle = COL[f.owner]; ctx.beginPath(); ctx.arc(x, y, rimR * 0.02, 0, TAU); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = "bold 9px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(f.count), x, y - rimR * 0.035); ctx.restore(); }
    for (const nd of this.nodes) { const r = rimR * (0.05 + Math.min(0.04, nd.count * 0.0008)); ctx.save(); ctx.shadowBlur = 12; ctx.shadowColor = COL[nd.owner]; const gg = ctx.createRadialGradient(nd.x, nd.y, 0, nd.x, nd.y, r); gg.addColorStop(0, "#fff"); gg.addColorStop(0.5, COL[nd.owner]); gg.addColorStop(1, COL[nd.owner] + "44"); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(nd.x, nd.y, r, 0, TAU); ctx.fill(); ctx.restore(); ctx.fillStyle = "#fff"; ctx.font = "bold 12px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(nd.count), nd.x, nd.y); }
    if (this.flow === "playing" && this.wave <= 1 && !this.fleets.length && this.sel < 0) { ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = "600 12px system-ui"; ctx.textAlign = "center"; ctx.fillText("tap your node, then a target", cx, cy); }
    this.drawFx(now); void now;
  }
}
