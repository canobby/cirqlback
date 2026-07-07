// CIRQL — CirqlWorldEngine (CHR-216/219/220/221).
//
// The flagship world renderer: a top-down, walk-around island on the supersampled
// RetroEngine, lifted by the neon glow-up kit (lantern light, motes, aurora,
// vignette). You walk your avatar around a ring, camera follows, a minimap shows
// the concentric world fading into fog, and walking up to a dock / the Wonders /
// an NPC raises an interact prompt. Persistence, quests, the Wonders arcade and
// "your Cirql" plug in on top of this (M2–M6) via the hooks below.

import { RetroEngine, type RetroHooks } from "./retro-engine";
import { loadAvatarLS, AURA_COLORS, type AvatarConfig } from "./avatar";
import { RINGS, MINIMAP_RINGS, KNOWN_RINGS, type Ring, type Prop } from "./cirql-world";

export type InteractKind = "wonders" | "npc" | "dock";
export interface CirqlStats { sparks: number; cirqlLit: number; cirqlTotal: number; online: number; }

const TAU = Math.PI * 2;
function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

interface Dialog { name: string; accent: string; lines: string[]; i: number; }

export class CirqlWorldEngine extends RetroEngine {
  private ringIdx = 0;
  private curRing: Ring = RINGS[0];
  private posX = 0; private posY = 0;         // player world position
  private vx = 0; private vy = 0; private face = 1; private walk = 0;
  private camX = 0; private camY = 0;
  private t = 0;
  private hero: AvatarConfig;
  private myName = "You";
  private moveTarget: { x: number; y: number } | null = null;

  private near: Prop | null = null;       // nearest interactable in range
  private dialog: Dialog | null = null;
  private msg = ""; private msgT = 0;      // transient toast

  private stats: CirqlStats = { sparks: 0, cirqlLit: 3, cirqlTotal: 12, online: 1 };

  // ---- hooks the host page wires ----
  /** Fired when the player interacts (E / on-screen action) with a target. */
  onInteract?: (kind: InteractKind, prop: Prop) => void;
  /** Fired when the player position changes materially (for autosave, later). */
  onLocalMove?: (ring: number, x: number, y: number) => void;
  private lastSent = 0; private lastX = 1e9; private lastY = 1e9;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, 264, 200);
    this.hero = loadAvatarLS();
    this.posX = this.curRing.spawn.x; this.posY = this.curRing.spawn.y;
    this.camX = this.posX - this.LW / 2; this.camY = this.posY - this.LH / 2;
    this.running = true;
  }

  // ---------- host API ----------
  setLocal(name: string, avatar?: AvatarConfig) { this.myName = (name || "You").slice(0, 16); if (avatar) this.hero = avatar; }
  /** Live-update the player's look (character creator / "edit look"). */
  setAvatar(avatar: AvatarConfig) { this.hero = avatar; }
  setStats(s: Partial<CirqlStats>) { this.stats = { ...this.stats, ...s }; }
  /** The on-screen action button + the quest system call this to interact. */
  interact() { this.doInteract(); }
  getState() { return { ring: this.ringIdx, x: Math.round(this.posX), y: Math.round(this.posY) }; }
  applyState(s: any) {
    if (!s) return;
    if (typeof s.ring === "number" && RINGS[s.ring]?.explorable) { this.ringIdx = s.ring; this.curRing = RINGS[s.ring]; }
    if (typeof s.x === "number" && typeof s.y === "number") { this.posX = s.x; this.posY = s.y; }
    this.camX = this.posX - this.LW / 2; this.camY = this.posY - this.LH / 2;
  }
  toast(text: string) { this.msg = text; this.msgT = 4.6; }
  /** Current interact target's kind (host may use to theme the action button). */
  nearKind(): InteractKind | null { return (this.near?.t as InteractKind) ?? null; }

  // ---------- interaction ----------
  private solids(): { x: number; y: number; r: number }[] {
    const out: { x: number; y: number; r: number }[] = [];
    for (const p of this.curRing.props) {
      if (p.t === "hearth") out.push({ x: p.x, y: p.y, r: 40 });
      else if (p.t === "wonders") out.push({ x: p.x, y: p.y, r: 34 });
      else if (p.t === "tree") out.push({ x: p.x, y: p.y + 2, r: p.big ? 12 : 9 });
    }
    return out;
  }
  private doInteract() {
    if (this.dialog) { this.dialog.i++; if (this.dialog.i >= this.dialog.lines.length) this.dialog = null; return; }
    const p = this.near; if (!p) return;
    if (p.t === "wonders") { this.onInteract?.("wonders", p); }
    else if (p.t === "npc") { this.openDialog(p); this.onInteract?.("npc", p); }
    else if (p.t === "dock") {
      const dest = RINGS[p.to ?? -1];
      if (!dest || !dest.explorable) this.toast("The fog past the Hearth hasn't lifted yet.");
      else this.onInteract?.("dock", p);
    }
  }
  private openDialog(p: Prop) {
    // Placeholder greeting; the quest system (M4) replaces this with real dialog.
    this.dialog = {
      name: p.label || "Ferra", accent: p.accent || this.curRing.palette.accent, i: 0,
      lines: [
        "Welcome to The Hearth, traveller.",
        "Your Cirql is dim — but every friend you gather lights a lantern here.",
        "When you're ready, the Wonders wait east, past the lanterns.",
      ],
    };
  }

  // ---------- update ----------
  protected update(dt: number) {
    this.t += dt;
    this.msgT = Math.max(0, this.msgT - dt);

    // interact edge (Space / E map to "a"); also used to advance dialog
    if (this.pressed.a) this.doInteract();

    // movement is frozen while a dialog is open
    if (!this.dialog) {
      if (this.pointer.down) this.moveTarget = { x: this.pointer.x + this.camX, y: this.pointer.y + this.camY };
      let dx = (this.btn.right ? 1 : 0) - (this.btn.left ? 1 : 0);
      let dy = (this.btn.down ? 1 : 0) - (this.btn.up ? 1 : 0);
      if (dx || dy) this.moveTarget = null;
      if (this.moveTarget) {
        const ddx = this.moveTarget.x - this.posX, ddy = this.moveTarget.y - this.posY, d = Math.hypot(ddx, ddy);
        if (d > 4) { dx = ddx / d; dy = ddy / d; } else this.moveTarget = null;
      }
      const mag = Math.hypot(dx, dy) || 1; dx /= mag; dy /= mag;
      const moving = (this.btn.right || this.btn.left || this.btn.up || this.btn.down || !!this.moveTarget);
      const spd = this.btn.b ? 118 : 80;
      const tvx = moving ? dx * spd : 0, tvy = moving ? dy * spd : 0;
      this.vx += (tvx - this.vx) * Math.min(1, dt * 16);
      this.vy += (tvy - this.vy) * Math.min(1, dt * 16);
      if (Math.abs(dx) > 0.2) this.face = dx > 0 ? 1 : -1;
      this.posX += this.vx * dt; this.posY += this.vy * dt;

      // solid props — push the player out of them
      for (const s of this.solids()) {
        const ox = this.posX - s.x, oy = this.posY - s.y, d = Math.hypot(ox, oy);
        const min = s.r + 5;
        if (d < min && d > 0.001) { const k = min / d; this.posX = s.x + ox * k; this.posY = s.y + oy * k; }
      }
      // island edge — keep the player on land
      const rr = Math.hypot(this.posX, this.posY), lim = this.curRing.radius * 0.9;
      if (rr > lim) { this.posX = this.posX / rr * lim; this.posY = this.posY / rr * lim; }

      this.walk = Math.hypot(this.vx, this.vy) > 8 ? this.walk + dt * 10 : 0;

      // nearest interactable in range
      this.near = null; let best = 1e9;
      for (const p of this.curRing.props) {
        if (p.t !== "wonders" && p.t !== "npc" && p.t !== "dock") continue;
        const d = Math.hypot(this.posX - p.x, this.posY - p.y);
        const range = p.r ?? 40;
        if (d < range && d < best) { best = d; this.near = p; }
      }
    }

    // camera easing
    this.camX += ((this.posX - this.LW / 2) - this.camX) * Math.min(1, dt * 8);
    this.camY += ((this.posY - this.LH / 2) - this.camY) * Math.min(1, dt * 8);

    // throttled autosave hook
    if (this.t - this.lastSent > 1.2 && (Math.abs(this.posX - this.lastX) > 3 || Math.abs(this.posY - this.lastY) > 3)) {
      this.onLocalMove?.(this.ringIdx, Math.round(this.posX), Math.round(this.posY));
      this.lastX = this.posX; this.lastY = this.posY; this.lastSent = this.t;
    }
  }

  // ---------- native-canvas helpers (fast big shapes + glows) ----------
  private fillCirc(cx: number, cy: number, r: number, color: string) {
    const b = this.b, s = this.SS; b.fillStyle = color; b.beginPath(); b.arc(cx * s, cy * s, r * s, 0, TAU); b.fill();
  }
  private glow(cx: number, cy: number, r: number, color: string, alpha: number) {
    const b = this.b, s = this.SS; const g = b.createRadialGradient(cx * s, cy * s, 0, cx * s, cy * s, r * s);
    g.addColorStop(0, hexA(color, alpha)); g.addColorStop(0.55, hexA(color, alpha * 0.4)); g.addColorStop(1, hexA(color, 0));
    b.fillStyle = g; b.beginPath(); b.arc(cx * s, cy * s, r * s, 0, TAU); b.fill();
  }

  // ---------- render ----------
  protected render() {
    const b = this.b, s = this.SS, W = this.LW * s, H = this.LH * s, pal = this.curRing.palette;
    // sky/sea backdrop
    const g = b.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, pal.sky[0]); g.addColorStop(0.5, pal.sky[1]); g.addColorStop(1, pal.sea);
    b.fillStyle = g; b.fillRect(0, 0, W, H);
    // aurora shimmer
    if (!this.reduce) {
      for (let i = 0; i < 3; i++) {
        b.fillStyle = hexA("#7fffe6", 0.05);
        b.beginPath();
        b.ellipse(W * 0.5 + Math.sin(this.t * 0.3 + i) * W * 0.25, H * 0.14 + i * 16 * s, W * 0.44, 14 * s, 0, 0, TAU);
        b.fill();
      }
    }
    // water specular
    b.fillStyle = "rgba(255,255,255,0.02)";
    for (let i = 0; i < 7; i++) b.fillRect(0, ((i * 40 + (this.t * 30) % 40) * s) % H, W, 2 * s);

    const camX = this.camX, camY = this.camY;
    const scx = -camX, scy = -camY; // island centre (world 0,0) on screen

    // island landmass
    const R = this.curRing.radius;
    this.fillCirc(scx + 4, scy + 6, R, "rgba(0,0,0,0.30)");   // soft cast
    this.fillCirc(scx, scy, R, pal.sand);
    this.fillCirc(scx, scy, R - 22, pal.land);
    // grass patches (deterministic)
    b.fillStyle = pal.grass;
    for (let i = 0; i < 9; i++) {
      const a = i * 0.94, rr = ((i * 53) % (R - 120));
      b.beginPath();
      b.ellipse((scx + Math.cos(a) * rr) * s, (scy + Math.sin(a) * rr) * s, (70 + (i % 4) * 18) * s, (48 + (i % 3) * 16) * s, a, 0, TAU);
      b.fill();
    }
    // faint path ring
    b.strokeStyle = "rgba(255,220,150,0.10)"; b.lineWidth = 20 * s;
    b.beginPath(); b.arc(scx * s, scy * s, R * 0.42 * s, 0, TAU); b.stroke();

    // ---- collect drawables (depth sorted by feet-y) ----
    const draws: { y: number; f: () => void }[] = [];
    // your Cirql lantern ring around the Hearth
    const hearth = this.curRing.props.find((p) => p.t === "hearth");
    if (hearth) {
      for (let i = 0; i < this.stats.cirqlTotal; i++) {
        const a = -Math.PI / 2 + i * (TAU / this.stats.cirqlTotal);
        const lx = hearth.x + Math.cos(a) * 118, ly = hearth.y + Math.sin(a) * 92 + 40;
        const lit = i < this.stats.cirqlLit;
        draws.push({ y: ly, f: () => this.drawLantern(lx - camX, ly - camY, "#ffc46b", lit) });
      }
    }
    for (const p of this.curRing.props) {
      const sxp = p.x - camX, syp = p.y - camY;
      switch (p.t) {
        case "hearth": draws.push({ y: p.y + 28, f: () => this.drawHearth(sxp, syp, p) }); break;
        case "wonders": draws.push({ y: p.y + 30, f: () => this.drawWonders(sxp, syp, p) }); break;
        case "npc": draws.push({ y: p.y, f: () => this.drawNpc(sxp, syp, p) }); break;
        case "tree": draws.push({ y: p.y, f: () => this.drawTree(sxp, syp, p.big) }); break;
        case "lantern": draws.push({ y: p.y, f: () => this.drawLantern(sxp, syp, pal.accent, true) }); break;
        case "dock": draws.push({ y: p.y - 40, f: () => this.drawDock(sxp, syp, p) }); break;
        default: break;
      }
    }
    // the player
    draws.push({ y: this.posY, f: () => this.drawHero(this.posX - camX, this.posY - camY) });
    draws.sort((a, c) => a.y - c.y);
    for (const d of draws) d.f();

    // floating motes
    if (!this.reduce) {
      for (let i = 0; i < 22; i++) {
        const mx = scx + Math.sin(this.t * 0.3 + i * 2.1) * R * 0.7 + Math.cos(i) * 60;
        const my = scy + Math.cos(this.t * 0.36 + i * 1.7) * R * 0.6 + Math.sin(i * 2) * 40;
        const al = 0.2 + 0.25 * Math.sin(this.t * 1.5 + i);
        b.fillStyle = hexA(pal.mote, Math.max(0, al) * 0.6);
        b.beginPath(); b.arc(mx * s, my * s, (1 + (i % 3) * 0.4) * s, 0, TAU); b.fill();
      }
    }

    this.drawFx();
    this.drawHud();
  }

  // ---------- props ----------
  private drawHero(cx: number, cy: number) {
    const bob = this.walk > 0 ? Math.round(Math.sin(this.walk)) : 0;
    // aura glow (cosmetic) behind the figure
    const aura = this.hero.aura && AURA_COLORS[this.hero.aura];
    if (aura) this.glow(cx, cy - 12, 20, aura, this.reduce ? 0.4 : 0.32 + 0.1 * Math.sin(this.t * 2.5));
    this.disc(cx, cy + 2, 4, "#0a071460");
    this.ring(cx, cy + 2, 6, "#35e0d0", 1.1);       // gentle "you" ring
    this.avatar(cx, cy + bob, this.hero);
    this.nameTag(cx, cy, this.myName, "#ffd24a");
  }
  private drawHearth(cx: number, cy: number, p: Prop) {
    this.glow(cx, cy, 70, "#ffc46b", 0.22);
    this.rect(cx - 26, cy + 14, 52, 6, "#0a071450");
    this.rect(cx - 26, cy - 14, 52, 30, "#e8dcc4");
    // roof
    for (let i = 0; i < 18; i++) this.rect(cx - 30 + i, cy - 14 - i, (30 - i) * 2, 1, "#c65b47");
    this.rect(cx + 12, cy - 30, 6, 12, "#8a3f30");   // chimney
    // glowing windows + door
    this.disc(cx - 13, cy - 2, 4, "#ffd98a"); this.disc(cx + 13, cy - 2, 4, "#ffd98a");
    this.rect(cx - 6, cy + 3, 12, 13, "#ffb347");
    this.labelPill(cx, cy - 40, p.label || "The Hearth", "#ffc46b");
  }
  private drawWonders(cx: number, cy: number, p: Prop) {
    const ac = p.accent || "#b26cff";
    this.glow(cx, cy - 6, 60, ac, 0.28 + (this.near === p ? 0.12 : 0));
    this.rect(cx - 28, cy + 16, 56, 6, "#0a071450");
    this.rect(cx - 28, cy - 20, 56, 36, "#151033");
    this.rectLine(cx - 28, cy - 20, 56, 36, ac);
    // enchanted "screen" face
    this.rect(cx - 12, cy - 14, 24, 22, ac);
    this.rect(cx - 9, cy - 11, 18, 16, "#0b0a1e");
    this.ring(cx, cy - 3, 6, ac, 1.4);
    // door
    this.rect(cx - 7, cy + 4, 14, 12, ac);
    this.labelPill(cx, cy - 34, p.label || "The Wonders", ac);
  }
  private drawNpc(cx: number, cy: number, p: Prop) {
    const ac = p.accent || "#7fffe6";
    if (this.near === p) this.glow(cx, cy, 26, ac, 0.3);
    this.disc(cx, cy + 2, 3, "#0a071460");
    // simple robed keeper
    this.rect(cx - 5, cy - 8, 10, 16, ac);
    this.disc(cx, cy - 12, 5, "#ffe0bd");
    this.rect(cx - 5, cy - 16, 10, 3, "#2a1c12");
    // quest spark above head
    if (!this.reduce) { const yb = cy - 26 + Math.sin(this.t * 3) * 1.5; this.disc(cx, yb, 2, "#ffd24a"); this.ring(cx, yb, 4, "#ffd24a", 1); }
    this.nameTag(cx, cy, p.label || "Ferra", ac);
  }
  private drawTree(cx: number, cy: number, big?: boolean) {
    const s = big ? 1.4 : 1;
    this.disc(cx, cy + 2, 6 * s, "#0a071440");
    this.rect(cx - 2, cy - 8 * s, 4, 10 * s, "#3a2a1e");
    for (let i = 0; i < 3; i++) this.disc(cx, cy - 14 * s - i * 5 * s, (11 - i * 2) * s, i === 0 ? "#356149" : this.curRing.palette.grass);
    this.disc(cx - 3 * s, cy - 20 * s, 3 * s, "#3e6d52");
  }
  private drawLantern(cx: number, cy: number, c: string, lit: boolean) {
    this.rect(cx - 1, cy - 13, 2, 13, "#2a2015");
    if (lit) { this.glow(cx, cy - 16, 22, c, this.reduce ? 0.5 : 0.4 + 0.15 * Math.sin(this.t * 2 + cx)); this.disc(cx, cy - 16, 3, c); }
    else this.disc(cx, cy - 16, 3, "#3a4258");
  }
  private drawDock(cx: number, cy: number, p: Prop) {
    // planks pointing outward (downward on the south dock)
    for (let i = 0; i < 5; i++) this.rect(cx - 8, cy - 20 + i * 9, 16, 3, "#5a3d22");
    this.rect(cx - 10, cy - 22, 20, 3, "#6b4a2a");
    // little boat
    this.rect(cx - 9, cy + 20, 18, 7, "#c65b47");
    this.rect(cx - 1, cy + 6, 2, 14, "#e8dcc4");
    for (let i = 0; i < 10; i++) this.rect(cx + 1, cy + 6 + i, i, 1, hexA(this.curRing.palette.accent, 0.9));
    if (this.near === p) this.glow(cx, cy, 30, this.curRing.palette.accent, 0.25);
    this.labelPill(cx, cy - 34, "sail →", this.curRing.palette.accent);
  }

  // ---------- HUD ----------
  private nameTag(cx: number, feet: number, name: string, c: string) {
    const w = this.textWidth(name, 1);
    this.rect(cx - w / 2 - 1, feet - 26, w + 2, 7, "#0a0714aa");
    this.text(Math.round(cx - w / 2), feet - 25, name, c, 1, false);
  }
  private labelPill(cx: number, y: number, s: string, c: string) {
    const w = this.textWidth(s, 1);
    this.rect(cx - w / 2 - 3, y - 1, w + 6, 8, "#0a0714cc");
    this.text(Math.round(cx - w / 2), y, s, c, 1, false);
  }
  private drawHud() {
    // top strip
    this.rect(0, 0, this.LW, 13, "#0a0714b0");
    this.textCenter(3, "CIRQL", "#ffffff", 1);
    this.ring(9, 7, 3, "#33e650", 1.3); this.text(15, 3, `${this.stats.online}`, "#c2fbe0", 1, false);
    const sp = `${this.stats.sparks} SPARKS`;
    this.text(this.LW - this.textWidth(sp, 1) - 4, 3, sp, "#ffc46b", 1, false);
    // your cirql (bottom-left card)
    const lit = `CIRQL ${this.stats.cirqlLit}/${this.stats.cirqlTotal}`;
    this.rect(3, this.LH - 12, this.textWidth(lit, 1) + 6, 10, "#0a0714aa");
    this.text(6, this.LH - 10, lit, "#ffc46b", 1, false);

    this.drawMinimap();

    // interact prompt
    if (this.near && !this.dialog) {
      const label = this.near.t === "wonders" ? "ENTER THE WONDERS"
        : this.near.t === "npc" ? `TALK TO ${(this.near.label || "").toUpperCase()}`
          : "SET SAIL";
      const txt = `[E] ${label}`;
      const w = this.textWidth(txt, 1);
      const x = Math.round((this.LW - w) / 2), y = this.LH - 26;
      this.rect(x - 5, y - 3, w + 10, 12, "#0a0714dd");
      this.rectLine(x - 5, y - 3, w + 10, 12, this.near.accent || "#35e0d0");
      this.text(x, y, txt, "#eaf6ff", 1, false);
    }

    // toast
    if (this.msgT > 0) {
      const w = this.textWidth(this.msg, 1); const x = Math.round((this.LW - w) / 2);
      this.b.globalAlpha = Math.min(1, this.msgT * 1.5);
      this.rect(x - 5, 16, w + 10, 11, "#0a0714e0"); this.rectLine(x - 5, 16, w + 10, 11, "#b26cff");
      this.text(x, 18, this.msg, "#e6d8ff", 1, false);
      this.b.globalAlpha = 1;
    }

    // dialog
    if (this.dialog) this.drawDialog();
  }
  private drawMinimap() {
    const b = this.b, s = this.SS;
    const cx = this.LW - 28, cy = this.LH - 30, R = 22;
    b.fillStyle = "rgba(6,12,26,0.82)"; b.beginPath(); b.arc(cx * s, cy * s, R * s, 0, TAU); b.fill();
    const step = (R - 3) / MINIMAP_RINGS;
    for (let i = MINIMAP_RINGS - 1; i >= 0; i--) {
      const rad = step * (i + 1); const known = i < KNOWN_RINGS;
      b.beginPath(); b.arc(cx * s, cy * s, rad * s, 0, TAU);
      if (known) { b.strokeStyle = i === this.ringIdx ? "#ffffff" : "rgba(120,200,255,0.5)"; b.lineWidth = (i === this.ringIdx ? 1.6 : 1) * s; b.setLineDash([]); }
      else { b.strokeStyle = "rgba(120,140,180,0.22)"; b.lineWidth = 1 * s; b.setLineDash([3 * s, 5 * s]); }
      b.stroke();
    }
    b.setLineDash([]);
    // player dot at their angle on the current ring
    const ang = Math.atan2(this.posY, this.posX); const dr = step * (this.ringIdx + 1);
    b.fillStyle = "#ffc46b"; b.beginPath(); b.arc((cx + Math.cos(ang) * dr) * s, (cy + Math.sin(ang) * dr) * s, 1.8 * s, 0, TAU); b.fill();
    // "the endless ocean" fog "?"
    this.text(cx - this.textWidth("?", 1) / 2, cy - R + 1, "?", "rgba(180,190,220,0.6)", 1, false);
  }
  private drawDialog() {
    if (!this.dialog) return;
    const d = this.dialog;
    const boxY = this.LH - 46, boxH = 40;
    this.rect(6, boxY, this.LW - 12, boxH, "#0a0714ee");
    this.rectLine(6, boxY, this.LW - 12, boxH, d.accent);
    this.text(11, boxY + 4, d.name.toUpperCase(), d.accent, 1, false);
    const line = d.lines[d.i] || "";
    // wrap to width
    const words = line.toUpperCase().split(" "); const rows: string[] = []; let cur = "";
    for (const w of words) { const tryn = cur ? cur + " " + w : w; if (this.textWidth(tryn, 1) > this.LW - 26 && cur) { rows.push(cur); cur = w; } else cur = tryn; }
    if (cur) rows.push(cur);
    for (let i = 0; i < Math.min(2, rows.length); i++) this.text(11, boxY + 15 + i * 9, rows[i], "#eaf6ff", 1, false);
    const hint = d.i < d.lines.length - 1 ? "[E] ▸" : "[E] ✕";
    this.text(this.LW - this.textWidth(hint, 1) - 11, boxY + boxH - 10, hint, "#9fb0d0", 1, false);
  }
}
