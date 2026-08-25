// CIRQL CITY — SharedTownEngine: the live multiplayer "shared town" prototype renderer.
//
// A top-down walk-around of Main Street (reusing the same town map as the flagship) where
// YOU plus every other connected player are drawn as real avatars, moving in real time,
// with names + chat bubbles. Movement/collision mirror the single-player town; the host
// page pipes positions + chat over the /ws/town websocket. Deliberately its own small
// engine so the flagship game stays untouched while we prove the social feel.

import { RetroEngine, shade, mix, type RetroHooks } from "./retro-engine";
import { loadAvatarLS, DEFAULT_AVATAR, type AvatarConfig } from "./avatar";
import { MusicKit, MAIN_STREET_THEME } from "./musickit";
import { buildTown, TT, TOWN_W, TOWN_H, TOP_B, BOT_B, type BuiltTown } from "./cirql-city-town";

interface Remote { x: number; y: number; tx: number; ty: number; dir: number; name: string; avatar: AvatarConfig; chat: string; chatT: number; walk: number; join: number }
export interface RemoteState { id: string; x: number; y: number; dir: number; name: string; avatar: AvatarConfig }

export class SharedTownEngine extends RetroEngine {
  private town: BuiltTown;
  private hero: AvatarConfig; private myName = "You";
  private hx = 0; private hy = 0; private tvx = 0; private tvy = 0; private tface = 1; private tWalk = 0;
  private camX = 0; private camY = 0; private t = 0;
  private myChat = ""; private myChatT = 0;
  private remotes = new Map<string, Remote>();
  private readonly pw = 10; private readonly ph = 8;
  private lastSent = 0; private lastX = -1; private lastY = -1;
  /** Host wires this to send the local position over the socket (throttled). */
  onLocalMove?: (x: number, y: number, dir: number) => void;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, 256, 224);
    this.hero = loadAvatarLS();
    this.music = new MusicKit();
    this.town = buildTown();
    this.hx = this.town.spawnTx * TT; this.hy = this.town.spawnTy * TT;
    this.running = true;
  }
  protected onGesture() { this.music?.play(MAIN_STREET_THEME); this.music?.setIntensity(0.35); }

  setLocal(name: string, avatar?: AvatarConfig) { this.myName = name || "You"; if (avatar) this.hero = avatar; }
  startX() { return Math.round(this.hx); } startY() { return Math.round(this.hy); }
  addRemote(s: RemoteState) { this.remotes.set(s.id, { x: s.x, y: s.y, tx: s.x, ty: s.y, dir: s.dir || 1, name: s.name, avatar: s.avatar || DEFAULT_AVATAR, chat: "", chatT: 0, walk: 0, join: this.t }); }
  moveRemote(id: string, x: number, y: number, dir: number) { const r = this.remotes.get(id); if (r) { r.tx = x; r.ty = y; r.dir = dir; } }
  removeRemote(id: string) { this.remotes.delete(id); }
  chatRemote(id: string, text: string) { const r = this.remotes.get(id); if (r) { r.chat = text; r.chatT = 5.5; } }
  sayLocal(text: string) { this.myChat = text; this.myChatT = 5.5; }
  count() { return this.remotes.size + 1; }

  private solidAt(wx: number, wy: number) { const tx = Math.floor(wx / TT), ty = Math.floor(wy / TT); if (tx < 0 || ty < 0 || tx >= this.town.W || ty >= this.town.H) return true; return this.town.solids[ty][tx] === 1; }
  private boxHits(x: number, y: number) { return this.solidAt(x, y) || this.solidAt(x + this.pw - 1, y) || this.solidAt(x, y + this.ph - 1) || this.solidAt(x + this.pw - 1, y + this.ph - 1); }

  protected update(dt: number) {
    this.t += dt;
    const dx = (this.btn.right ? 1 : 0) - (this.btn.left ? 1 : 0), dy = (this.btn.down ? 1 : 0) - (this.btn.up ? 1 : 0);
    const spd = this.btn.b ? 116 : 76; let tvx = dx * spd, tvy = dy * spd; if (dx && dy) { tvx *= 0.707; tvy *= 0.707; }
    this.tvx += (tvx - this.tvx) * Math.min(1, dt * 16); this.tvy += (tvy - this.tvy) * Math.min(1, dt * 16);
    if (dx !== 0) this.tface = dx;
    let nx = this.hx + this.tvx * dt; if (this.boxHits(nx, this.hy)) { const s = this.tvx > 0 ? 1 : -1; while (!this.boxHits(this.hx + s, this.hy) && Math.abs(this.hx - nx) > 0.5) this.hx += s; this.tvx = 0; nx = this.hx; } this.hx = nx;
    let ny = this.hy + this.tvy * dt; if (this.boxHits(this.hx, ny)) { const s = this.tvy > 0 ? 1 : -1; while (!this.boxHits(this.hx, this.hy + s) && Math.abs(this.hy - ny) > 0.5) this.hy += s; this.tvy = 0; ny = this.hy; } this.hy = ny;
    this.tWalk = (Math.abs(this.tvx) + Math.abs(this.tvy)) > 6 ? this.tWalk + dt * 10 : 0;
    this.myChatT = Math.max(0, this.myChatT - dt);
    for (const r of Array.from(this.remotes.values())) { const px = r.x, py = r.y; r.x += (r.tx - r.x) * Math.min(1, dt * 10); r.y += (r.ty - r.y) * Math.min(1, dt * 10); r.chatT = Math.max(0, r.chatT - dt); r.walk = (Math.abs(r.x - px) + Math.abs(r.y - py)) > 0.15 ? r.walk + dt * 10 : 0; }
    // camera
    const cx = this.hx + this.pw / 2, cy = this.hy + this.ph / 2, tw = this.town.W * TT, th = this.town.H * TT;
    this.camX += (Math.max(0, Math.min(tw - this.LW, cx - this.LW / 2)) - this.camX) * Math.min(1, dt * 8);
    this.camY += (Math.max(0, Math.min(th - this.LH, cy - this.LH / 2)) - this.camY) * Math.min(1, dt * 8);
    if (th <= this.LH) this.camY = (th - this.LH) / 2;
    // throttled position send
    if (this.t - this.lastSent > 0.08) { if (Math.abs(this.hx - this.lastX) > 0.5 || Math.abs(this.hy - this.lastY) > 0.5) { this.onLocalMove?.(Math.round(this.hx), Math.round(this.hy), this.tface); this.lastX = this.hx; this.lastY = this.hy; } this.lastSent = this.t; }
  }

  // ---------- render ----------
  protected render() {
    const camX = Math.round(this.camX), camY = Math.round(this.camY);
    this.vgrad(0, 0, this.LW, this.LH, "#161033", "#0d0a20");
    const bandY0 = TOP_B * TT - camY, bandY1 = BOT_B * TT - camY;
    this.rect(0, bandY0, this.LW, TT, "#2a2450");                                 // top sidewalk
    this.rect(0, bandY1 - TT, this.LW, TT, "#2a2450");                            // bottom sidewalk
    this.rect(0, bandY0 + TT, this.LW, bandY1 - bandY0 - TT * 2, "#1a1636");      // road
    const midY = Math.round((bandY0 + bandY1) / 2) - 1;
    for (let x = -((camX) % 24); x < this.LW; x += 24) this.rect(x, midY, 12, 2, "#3a3160");
    this.drawBuildings(camX, camY); this.drawGates(camX, camY);

    // players sorted by feet-y so nearer ones overlap correctly
    const list: { x: number; y: number; a: AvatarConfig; name: string; chat: string; chatT: number; walk: number; me: boolean }[] = [];
    for (const r of Array.from(this.remotes.values())) list.push({ x: r.x + this.pw / 2, y: r.y + this.ph, a: r.avatar, name: r.name, chat: r.chat, chatT: r.chatT, walk: r.walk, me: false });
    list.push({ x: this.hx + this.pw / 2, y: this.hy + this.ph, a: this.hero, name: this.myName, chat: this.myChat, chatT: this.myChatT, walk: this.tWalk, me: true });
    list.sort((a, b) => a.y - b.y);
    for (const p of list) this.drawPerson(p.x - camX, p.y - camY, p.a, p.name, p.chat, p.chatT, p.walk, p.me);

    this.drawFx();
    // HUD
    this.rect(0, 0, this.LW, 13, "#0a0714aa");
    this.textCenter(3, "CIRQL CITY - MAIN STREET", "#ffd24a", 1);
    this.ring(9, 7, 3, "#33e650", 1.3); this.text(15, 3, `${this.count()} HERE`, "#c2fbe0", 1, false);
    this.text(this.LW - 52, 3, "LIVE", "#33e650", 1, false); if (Math.floor(this.t * 2) % 2 === 0) this.disc(this.LW - 58, 6, 2, "#33e650");
  }
  private drawBuildings(camX: number, camY: number) {
    for (let si = 0; si < this.town.shops.length; si++) {
      const s = this.town.shops[si]; const top = s.side === "top";
      const bx = (s.cx - 2) * TT - camX, bw = TT * 5;
      const by = top ? 0 - camY : BOT_B * TT - camY, bh = top ? TOP_B * TT : (TOWN_H - BOT_B) * TT;
      if (bx > this.LW || bx + bw < 0) continue;
      const wall = "#241d44"; this.rect(bx, by, bw, bh, wall); this.rect(bx, by, bw, 2, shade(wall, 0.25));
      for (let wy = by + 6; wy < by + bh - 10; wy += 10) for (let wx = bx + 4; wx < bx + bw - 4; wx += 8) this.rect(wx, wy, 4, 5, ((wx + wy) % 3 === 0) ? mix("#20202e", s.accent, 0.5) : "#181430");
      const edgeY = top ? by + bh - 8 : by; this.shelf(bx + 2, edgeY, bw - 4, 6, s.accent);
      const doorY = top ? by + bh - 8 : by + 2; this.rect(bx + bw / 2 - 4, doorY, 8, 8, shade(s.accent, -0.3)); this.rectLine(bx + bw / 2 - 4, doorY, 8, 8, s.accent);
      const sy = top ? by + bh + 1 : by - 8; const lbl = s.label; this.rect(bx + bw / 2 - this.textWidth(lbl, 1) / 2 - 2, sy - 1, this.textWidth(lbl, 1) + 4, 8, "#0a0714c0"); this.textCenterAt(bx + bw / 2, sy, lbl, s.accent);
    }
  }
  private drawGates(camX: number, camY: number) {
    for (const g of this.town.gates) {
      const gx = (g.cx - 1) * TT - camX, gw = TT * 3, gy = 0 - camY, gh = TOP_B * TT;
      if (gx > this.LW || gx + gw < 0) continue;
      const col = ["#ff8a3d", "#ff5d7d", "#3bb6ff", "#b79bff", "#ffd24a"][g.index % 5];
      this.rect(gx, gy, 3, gh, shade(col, -0.2)); this.rect(gx + gw - 3, gy, 3, gh, shade(col, -0.2)); this.shelf(gx - 2, gy + gh - 14, gw + 4, 6, col);
      for (let i = 0; i < gh - 14; i += 6) this.rect(gx + 3, gy + i, gw - 6, 2, mix("#161033", col, 0.22));
      this.rect(gx - 2, gy + gh - 26, gw + 4, 10, "#0a0714cc"); this.textCenterAt(gx + gw / 2, gy + gh - 24, `D${g.index + 1}`, col);
    }
  }
  private textCenterAt(cx: number, y: number, s: string, c: string) { this.text(Math.round(cx - this.textWidth(s, 1) / 2), y, s, c, 1, false); }

  private drawPerson(cx: number, feet: number, a: AvatarConfig, name: string, chat: string, chatT: number, walk: number, me: boolean) {
    cx = Math.round(cx); feet = Math.round(feet);
    if (cx < -20 || cx > this.LW + 20) return;
    this.disc(cx, feet, 4, "#0a071460");
    const bob = walk > 0 ? Math.round(Math.sin(walk) * 1) : 0;
    if (me) this.ring(cx, feet, 6, "#33e650", 1.2);                              // subtle "you" ring
    this.avatar(cx, feet + bob, a);
    // name tag
    const nc = me ? "#ffd24a" : "#dfe6ff"; this.rect(cx - this.textWidth(name, 1) / 2 - 1, feet - 26, this.textWidth(name, 1) + 2, 7, "#0a0714aa"); this.textCenterAt(cx, feet - 25, name, nc);
    // chat bubble
    if (chatT > 0 && chat) this.bubble(cx, feet - 30, chat, chatT);
  }
  private bubble(cx: number, baseY: number, text: string, life: number) {
    const lines = this.wrap(text, 16); const w = Math.min(90, Math.max(...lines.map((l) => this.textWidth(l, 1))) + 6); const h = lines.length * 8 + 4;
    const x = Math.round(cx - w / 2), y = baseY - h; const a = life < 0.6 ? life / 0.6 : 1;
    this.b.globalAlpha = a;
    this.rect(x, y, w, h, "#fff1e8"); this.rect(x + w / 2 - 2, y + h, 4, 3, "#fff1e8"); this.rectLine(x, y, w, h, "#b79bff");
    for (let i = 0; i < lines.length; i++) this.text(x + 3, y + 3 + i * 8, lines[i], "#20142e", 1, false);
    this.b.globalAlpha = 1;
  }
  private wrap(s: string, max: number): string[] {
    const words = s.toUpperCase().split(" "); const out: string[] = []; let line = "";
    for (const w of words) { const t = line ? line + " " + w : w; if (t.length > max && line) { out.push(line); line = w; } else line = t; }
    if (line) out.push(line); return out.slice(0, 4);
  }
}
