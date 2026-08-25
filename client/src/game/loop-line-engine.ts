// LOOP LINE — a Mini-Metro homage, a MODERN cabinet (CHR-202). On-brand: close the loops!
//
// Riders pile up at the shops (stations), each wanting to reach a stop of a certain SHAPE.
// Draw transit lines connecting stops; a train shuttles each line, scooping up riders and
// dropping them at a matching-shape stop. New stops and riders keep coming — let any stop
// overflow and the network seizes up. Drag stop-to-stop to lay a line; SWAP picks the line.

import { RetroEngine, shade, mix, type RetroHooks } from "./retro-engine";
import { MusicKit, MAIN_STREET_THEME } from "./musickit";

const CAP = 6, OVERLIMIT = 5, TRAIN_CAP = 6, TOPBAR = 16;
const LCOL = ["#ff5d7d", "#3bb6ff", "#ffd24a"];

interface Station { x: number; y: number; shape: number; queue: number[]; overT: number }
interface Train { i: number; prog: number; dir: number; carry: number[] }
interface Line { stations: number[]; train: Train | null }

export class LoopLineEngine extends RetroEngine {
  private stations: Station[] = [];
  private lines: Line[] = [];
  private cur = 0; private dragging = false; private lastStation = -1;
  private state: "ready" | "play" | "over" = "ready";
  private score = 0; private best = 0; private tAnim = 0; private spawnCd = 0; private stationCd = 0; private lastDown = false;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, 240, 180);
    this.music = new MusicKit();
    try { this.best = +(window.localStorage.getItem("loopline_best") || 0); } catch { /* ignore */ }
    this.setup();
    this.running = true;
    this.emit();
  }
  protected onGesture() { this.music?.play(MAIN_STREET_THEME); this.music?.setIntensity(0.4); }

  private setup() {
    this.stations = []; this.lines = [{ stations: [], train: null }, { stations: [], train: null }, { stations: [], train: null }];
    // start with a few stations, one of each shape guaranteed
    this.addStation(0, 60, 60); this.addStation(1, 170, 60); this.addStation(2, 120, 130); this.addStation(Math.floor(Math.random() * 3), 60, 130);
    this.cur = 0; this.spawnCd = 2; this.stationCd = 14;
  }
  private addStation(shape: number, x?: number, y?: number) {
    if (x === undefined) { let ok = false, tx = 0, ty = 0, tries = 0; while (!ok && tries++ < 40) { tx = 24 + Math.random() * (this.LW - 48); ty = TOPBAR + 12 + Math.random() * (this.LH - TOPBAR - 24); ok = this.stations.every((s) => (s.x - tx) ** 2 + (s.y - ty) ** 2 > 30 * 30); } x = tx; y = ty; }
    this.stations.push({ x: x!, y: y!, shape, queue: [], overT: 0 });
  }
  private reset() { this.score = 0; this.setup(); this.clearFx(); }
  private begin() { this.reset(); this.state = "play"; this.music?.setIntensity(0.7); this.emit(); }
  protected onStart() { this.begin(); }
  protected onMenu() { this.state = "ready"; this.reset(); this.emit(); }
  private emit() { this.hooks.onHud?.({ state: this.state, score: this.score, cur: this.cur, best: this.best }); }

  private shapesOnLine(li: number): Set<number> { const s = new Set<number>(); for (const idx of this.lines[li].stations) s.add(this.stations[idx].shape); return s; }
  private stationAt(px: number, py: number): number { for (let i = 0; i < this.stations.length; i++) { const s = this.stations[i]; if ((s.x - px) ** 2 + (s.y - py) ** 2 < 12 * 12) return i; } return -1; }

  protected update(dt: number) {
    this.tAnim += dt;
    for (const s of this.stations) s.overT = s.queue.length > CAP ? s.overT + dt : Math.max(0, s.overT - dt * 2);
    if (this.state === "ready" || this.state === "over") { if (this.pressed.a || (this.pointer.down && !this.lastDown)) this.begin(); this.lastDown = this.pointer.down; return; }

    // input: drag to lay a line, SWAP (b) to change current line
    if (this.pressed.b) { this.cur = (this.cur + 1) % this.lines.length; this.tone(560, 0.03, "square", 0.04); }
    if (this.pressed.a) { this.lines[this.cur] = { stations: [], train: null }; this.tone(240, 0.06, "square", 0.04); }   // clear current line
    if (this.pointer.down) { const at = this.stationAt(this.pointer.x, this.pointer.y); if (at >= 0) { if (!this.lastDown) { this.lastStation = -1; this.tryAdd(at); } else if (at !== this.lastStation) this.tryAdd(at); } }
    else this.lastStation = -1;
    this.lastDown = this.pointer.down;

    // sim
    this.spawnCd -= dt; if (this.spawnCd <= 0) { this.spawnRider(); this.spawnCd = Math.max(1, 3 - this.score * 0.01); }
    this.stationCd -= dt; if (this.stationCd <= 0 && this.stations.length < 10) { this.addStation(Math.floor(Math.random() * 3)); this.stationCd = 16; this.fxPop(this.stations[this.stations.length - 1].x, this.stations[this.stations.length - 1].y - 10, "NEW STOP", "#7be0ff", 1); }
    for (const ln of this.lines) this.moveTrain(ln, dt);
    // overflow → game over
    for (const s of this.stations) if (s.overT > OVERLIMIT) return this.over(s);
    this.emit();
  }
  private tryAdd(idx: number) {
    const ln = this.lines[this.cur]; const st = ln.stations;
    if (st.length && st[st.length - 1] === idx) return;
    if (st.includes(idx) && idx !== st[0]) return;                 // no revisits (except closing a loop to start)
    st.push(idx); this.lastStation = idx;
    if (st.length >= 2 && !ln.train) ln.train = { i: 0, prog: 0, dir: 1, carry: [] };
    this.tone(660, 0.02, "square", 0.03); this.buzz(3);
  }
  private spawnRider() {
    const from = this.stations[Math.floor(Math.random() * this.stations.length)];
    let target = Math.floor(Math.random() * 3); let guard = 0; while (target === from.shape && guard++ < 5) target = Math.floor(Math.random() * 3);
    from.queue.push(target);
  }
  private moveTrain(ln: Line, dt: number) {
    const t = ln.train; if (!t || ln.stations.length < 2) return;
    const a = this.stations[ln.stations[t.i]], nb = ln.stations[t.i + t.dir];
    if (nb === undefined) { t.dir *= -1; return; }
    const b = this.stations[nb]; const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    t.prog += (46 * dt) / d;
    if (t.prog >= 1) { t.prog = 0; t.i += t.dir; if (t.i <= 0) t.dir = 1; if (t.i >= ln.stations.length - 1) t.dir = -1; this.arrive(ln, t); }
  }
  private arrive(ln: Line, t: Train) {
    const st = this.stations[ln.stations[t.i]];
    // deliver
    const before = t.carry.length; t.carry = t.carry.filter((tg) => tg !== st.shape);
    const delivered = before - t.carry.length;
    if (delivered) { this.score += delivered * 10; this.fxPop(st.x, st.y - 12, `+${delivered * 10}`, "#33e650", 1); this.fxBurst(st.x, st.y, "#33e650", delivered * 4, 60); this.tone(880, 0.05, "square", 0.05); this.buzz(6); this.music?.setIntensity(Math.min(1, 0.7 + this.score * 0.004)); }
    // board riders whose target shape is reachable on this line
    const reach = this.shapesOnLine(this.lines.indexOf(ln));
    for (let k = st.queue.length - 1; k >= 0 && t.carry.length < TRAIN_CAP; k--) { if (reach.has(st.queue[k])) { t.carry.push(st.queue[k]); st.queue.splice(k, 1); } }
  }
  private over(s: Station | null) { this.state = "over"; this.addShake(2); this.tone(180, 0.3, "square", 0.06); this.music?.setIntensity(0.2); if (this.score > this.best) { this.best = this.score; try { window.localStorage.setItem("loopline_best", String(this.best)); } catch { /* ignore */ } } this.hooks.onRunEnd?.({ score: this.score, shift: this.stations.length }); if (s) this.fxRing(s.x, s.y, "#ff5d7d", 30); this.emit(); }

  // ---------- render ----------
  protected render() {
    this.vgrad(0, 0, this.LW, this.LH, "#0e1420", "#0a0e16");
    this.rect(0, 0, this.LW, TOPBAR, "#0a0714aa");
    // lines
    for (let li = 0; li < this.lines.length; li++) { const ln = this.lines[li], col = LCOL[li]; for (let i = 1; i < ln.stations.length; i++) { const a = this.stations[ln.stations[i - 1]], b = this.stations[ln.stations[i]]; this.thick(a.x, a.y, b.x, b.y, li === this.cur ? col : shade(col, -0.15), 3); } }
    // trains
    for (let li = 0; li < this.lines.length; li++) { const ln = this.lines[li], t = ln.train; if (!t || ln.stations.length < 2) continue; const a = this.stations[ln.stations[t.i]], nb = ln.stations[t.i + t.dir]; if (nb === undefined) continue; const b = this.stations[nb]; const tx = a.x + (b.x - a.x) * t.prog, ty = a.y + (b.y - a.y) * t.prog; this.rect((tx - 4) | 0, (ty - 3) | 0, 8, 6, LCOL[li]); this.rect((tx - 3) | 0, (ty - 2) | 0, 6, 2, shade(LCOL[li], 0.3)); for (let c = 0; c < t.carry.length; c++) this.px((tx - 3 + c) | 0, (ty) | 0, "#0a0714"); }
    // stations
    for (const s of this.stations) this.drawStation(s);
    this.drawFx();
    this.drawHud();
    if (this.state === "ready") this.drawReady();
    if (this.state === "over") this.drawOver();
  }
  private thick(x0: number, y0: number, x1: number, y1: number, c: string, w: number) { const steps = Math.max(1, Math.hypot(x1 - x0, y1 - y0) | 0); for (let i = 0; i <= steps; i++) { const x = x0 + (x1 - x0) * i / steps, y = y0 + (y1 - y0) * i / steps; this.disc(x | 0, y | 0, (w / 2) | 0, c); } }
  private drawStation(s: Station) {
    const x = s.x | 0, y = s.y | 0, warn = s.overT > 1;
    if (warn) this.ring(x, y, 12 + Math.round(Math.sin(this.tAnim * 8) * 1), "#ff5d7d", 1.4);
    this.shape(x, y, s.shape, 7, "#fff1e8"); this.shape(x, y, s.shape, 5, warn ? "#3a1620" : "#0e1420");
    // waiting riders around the station
    for (let i = 0; i < Math.min(s.queue.length, CAP + 3); i++) { const a = -1.2 + i * 0.5, rx = x + Math.round(Math.cos(a) * 13), ry = y + Math.round(Math.sin(a) * 13) - 2; this.shape(rx, ry, s.queue[i], 2, i >= CAP ? "#ff5d7d" : "#c2c3c7"); }
  }
  private shape(x: number, y: number, sh: number, r: number, c: string) {
    if (sh === 0) this.disc(x, y, r, c);
    else if (sh === 1) this.rect(x - r, y - r, r * 2, r * 2, c);
    else { for (let yy = -r; yy <= r; yy++) { const w = Math.round((yy + r) / (2 * r) * r); this.rect(x - w, y + yy - 1, w * 2 + 1, 1, c); } }
  }
  private drawHud() {
    this.text(4, 4, "DELIVERED", "#3bb6ff", 1, false); this.text(52, 4, `${this.score}`, "#fff1e8", 1, false);
    // current line chip
    for (let i = 0; i < this.lines.length; i++) this.rect(this.LW - 44 + i * 10, 5, 7, 6, i === this.cur ? LCOL[i] : shade(LCOL[i], -0.4));
    this.text(this.LW - 60, 4, "LINE", "#83b0c8", 1, false);
  }
  private drawReady() {
    this.rect(0, 0, this.LW, this.LH, "#0a0e16cc");
    this.textCenter(46, "LOOP LINE", "#3bb6ff", 3);
    this.textCenter(76, "DRAG STOP-TO-STOP TO LAY A LINE", "#c2c3c7", 1);
    this.textCenter(92, "TRAINS CARRY RIDERS TO THEIR SHAPE", "#83769c", 1);
    this.textCenter(108, "SWAP PICKS THE LINE - DON'T LET A STOP OVERFLOW", "#83769c", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(136, "TAP TO START", "#fff1e8", 1);
  }
  private drawOver() {
    this.rect(0, 0, this.LW, this.LH, "#0a0e16d8");
    this.textCenter(58, "GRIDLOCK!", "#ff5d7d", 2);
    this.textCenter(84, `${this.score} DELIVERED`, "#fff1e8", 2);
    this.textCenter(106, `BEST ${this.best}`, "#ffd24a", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(132, "TAP TO RUN AGAIN", "#7be0ff", 1);
  }
}
