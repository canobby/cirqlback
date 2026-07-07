// CIRQL — CirqlWorldEngine (CHR-216/219/220/221).
//
// The flagship world renderer: a top-down, walk-around island on the supersampled
// RetroEngine, lifted by the neon glow-up kit (lantern light, motes, aurora,
// vignette). You walk your avatar around a ring, camera follows, a minimap shows
// the concentric world fading into fog, and walking up to a dock / the Wonders /
// an NPC raises an interact prompt. Persistence, quests, the Wonders arcade and
// "your Cirql" plug in on top of this (M2–M6) via the hooks below.

import { RetroEngine, type RetroHooks } from "./retro-engine";
import { loadAvatarLS, DEFAULT_AVATAR, AURA_COLORS, type AvatarConfig } from "./avatar";
import { RINGS, MINIMAP_RINGS, KNOWN_RINGS, type Ring, type Prop } from "./cirql-world";
import {
  QUESTS, questById, offerableQuest, questStatusList,
  type QuestDef, type QuestProgress, type ObjectiveKind, type QuestStatus,
} from "./cirql-quests";

export type InteractKind = "wonders" | "npc" | "dock";
export interface CirqlStats { sparks: number; cirqlLit: number; cirqlTotal: number; online: number; energy: number; }
export interface QuestLogRow { id: string; name: string; status: QuestStatus; objective: string; }

const TAU = Math.PI * 2;
function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

interface Dialog { name: string; accent: string; lines: string[]; i: number; acceptOnClose?: string; }

// M8 — a live remote traveller on your ring (presence + chat). Position eases from
// x/y toward the last-received tx/ty for smooth movement between throttled updates.
type Facing = "up" | "down" | "left" | "right";
interface RemotePlayer { x: number; y: number; tx: number; ty: number; facing: Facing; name: string; avatar: AvatarConfig; chat: string; chatT: number; walk: number; }
export interface RemoteState { id: string; x: number; y: number; dir: string; name: string; avatar: AvatarConfig; ring?: number; }

export class CirqlWorldEngine extends RetroEngine {
  private ringIdx = 0;
  private curRing: Ring = RINGS[0];
  private posX = 0; private posY = 0;         // player world position
  private vx = 0; private vy = 0; private facing: "up" | "down" | "left" | "right" = "down"; private walk = 0;
  private camX = 0; private camY = 0;
  private t = 0;
  private hero: AvatarConfig;
  private myName = "You";
  private moveTarget: { x: number; y: number } | null = null;

  private near: Prop | null = null;       // nearest interactable in range
  private dialog: Dialog | null = null;
  private msg = ""; private msgT = 0;      // transient toast

  private stats: CirqlStats = { sparks: 0, cirqlLit: 0, cirqlTotal: 12, online: 1, energy: 0 };
  private quests: QuestProgress = {};
  private lit = new Set<string>();   // quest lanterns the player has lit

  // Smooth-text overlay queue: UI/labels are enqueued in logical coords during
  // render() and painted crisply (system sans) in onOverlay(), so words stay
  // readable on small phones while the world keeps its 16-bit pixel look.
  private ui: { x: number; y: number; s: string; c: string; sc: number; align: "l" | "c" | "r"; bold?: boolean; alpha?: number }[] = [];
  private q(x: number, y: number, s: string, c: string, sc = 1, align: "l" | "c" | "r" = "l", bold = false, alpha = 1) {
    this.ui.push({ x, y, s, c, sc, align, bold, alpha });
  }
  // Safe-area insets (CSS px) so the HUD clears the floating header + controls in
  // full-screen mode; converted to logical px on use.
  private insetTopCss = 0; private insetBotCss = 0;
  private itop() { return this.dispW > 0 ? this.insetTopCss * this.LW / this.dispW : 0; }
  private ibot() { return this.dispW > 0 ? this.insetBotCss * this.LW / this.dispW : 0; }
  private mapOpen = false;      // full-screen sea chart
  private pDownPrev = false;    // pointer edge for tap detection
  private minimapCx() { return this.LW - 26; }
  private minimapCy() { return this.itop() + 34; }
  private inMinimap(x: number, y: number) { return Math.hypot(x - this.minimapCx(), y - this.minimapCy()) < 24; }

  // ---- hooks the host page wires ----
  /** Fired when the player interacts (E / on-screen action) with a target. */
  onInteract?: (kind: InteractKind, prop: Prop) => void;
  /** Fired when the player position changes materially (for autosave, later). */
  onLocalMove?: (ring: number, x: number, y: number) => void;
  /** Fired when a quest completes — the host grants the sparks reward + persists. */
  onQuestComplete?: (quest: QuestDef) => void;
  /** Fired when quest progress changes (accept / advance / complete) — host may persist. */
  onQuestChange?: () => void;
  private lastSent = 0; private lastX = 1e9; private lastY = 1e9;

  // ---- M8 live presence (host wires these to the /ws/cirql socket) ----
  private remotes = new Map<string, RemotePlayer>();
  private myChat = ""; private myChatT = 0;                 // your own chat bubble
  private nearPlayer: { id: string; name: string } | null = null;  // remote in "share a light" range
  private lastPresence = 0; private lastPx = 1e9; private lastPy = 1e9;
  /** Fired often (throttled) with the live position, for the presence socket. */
  onPresence?: (ring: number, x: number, y: number, facing: Facing) => void;
  /** Fired when the player presses E next to another traveller (share a light). */
  onShareLight?: (id: string) => void;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, 264, 200);
    // responsive full-bleed world viewport (fills the screen, shows more world)
    this.fit = true; this.fitPx = 1.5; this.resize();
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
  /** Full-screen safe-area: keep the HUD below the floating header + above the controls (CSS px). */
  setHudInsets(topCss: number, botCss: number) { this.insetTopCss = Math.max(0, topCss); this.insetBotCss = Math.max(0, botCss); }
  /** The on-screen action button + the quest system call this to interact. */
  interact() { this.doInteract(); }
  getState() { return { ring: this.ringIdx, x: Math.round(this.posX), y: Math.round(this.posY), quests: this.quests, lit: Array.from(this.lit) }; }
  applyState(s: any) {
    if (!s) return;
    if (typeof s.ring === "number" && RINGS[s.ring]?.explorable) { this.ringIdx = s.ring; this.curRing = RINGS[s.ring]; }
    if (typeof s.x === "number" && typeof s.y === "number") { this.posX = s.x; this.posY = s.y; }
    if (s.quests && typeof s.quests === "object") this.quests = s.quests;
    if (Array.isArray(s.lit)) this.lit = new Set(s.lit);
    this.camX = this.posX - this.LW / 2; this.camY = this.posY - this.LH / 2;
  }
  toast(text: string) { this.msg = text; this.msgT = 4.6; }
  /** Current interact target's kind (host may use to theme the action button). */
  nearKind(): InteractKind | null { return (this.near?.t as InteractKind) ?? null; }

  // ---------- M8 live presence host API ----------
  private facingOf(d: string): Facing { return d === "up" || d === "left" || d === "right" ? d : "down"; }
  addRemote(s: RemoteState) {
    this.remotes.set(s.id, { x: s.x, y: s.y, tx: s.x, ty: s.y, facing: this.facingOf(s.dir), name: (s.name || "Traveller").slice(0, 16), avatar: s.avatar || DEFAULT_AVATAR, chat: "", chatT: 0, walk: 0 });
  }
  moveRemote(id: string, x: number, y: number, dir: string) { const r = this.remotes.get(id); if (r) { r.tx = x; r.ty = y; r.facing = this.facingOf(dir); } }
  removeRemote(id: string) { this.remotes.delete(id); }
  chatRemote(id: string, text: string) { const r = this.remotes.get(id); if (r) { r.chat = text; r.chatT = 5.5; } }
  /** Show your own chat bubble over your avatar. */
  sayLocal(text: string) { this.myChat = text; this.myChatT = 5.5; }
  remoteCount() { return this.remotes.size; }
  clearRemotes() { this.remotes.clear(); }

  // ---------- quests ----------
  /** Accept a quest (offered by an NPC or auto-started on first run). */
  acceptQuest(id: string) {
    const q = questById(id); if (!q || this.quests[id]) return;
    this.quests[id] = { status: "active", obj: q.objectives.map(() => 0) };
    this.toast(`✦ New quest — ${q.name}`);
    this.onQuestChange?.();
  }
  private activeQuest(): QuestDef | null {
    for (const q of QUESTS) if (this.quests[q.id]?.status === "active") return q;
    return null;
  }
  /** The active quest's current (first unfinished) objective index, or -1. */
  private currentObjIndex(q: QuestDef): number {
    const p = this.quests[q.id]; if (!p) return -1;
    return q.objectives.findIndex((o, i) => (p.obj[i] || 0) < (o.count ?? 1));
  }
  /** Advance any active objective matching (kind, targetId); complete the quest if done. */
  private advanceObjective(kind: ObjectiveKind, targetId?: string) {
    const q = this.activeQuest(); if (!q) return;
    const p = this.quests[q.id]; const oi = this.currentObjIndex(q); if (oi < 0) return;
    const o = q.objectives[oi];
    if (o.kind !== kind) return;
    if ((kind === "reach" || kind === "interact") && o.target && o.target !== targetId) return;
    p.obj[oi] = Math.min(o.count ?? 1, (p.obj[oi] || 0) + 1);
    this.onQuestChange?.();
    if (this.currentObjIndex(q) < 0) this.completeQuest(q);
  }
  private completeQuest(q: QuestDef) {
    const p = this.quests[q.id]; if (!p || p.status === "done") return;
    p.status = "done";
    this.toast(`✦ ${q.name} complete  +${q.reward.sparks} sparks`);
    this.onQuestComplete?.(q);
    this.onQuestChange?.();
    if (q.next) this.acceptQuest(q.next);
  }
  /** Rows for the quest-log panel (available/active/done, with the current objective). */
  getQuestLog(): QuestLogRow[] {
    return questStatusList(this.quests)
      .filter((s) => s.status !== "locked")
      .map(({ quest, status }) => {
        const p = this.quests[quest.id];
        let objective = quest.objectives[0]?.label ?? "";
        if (status === "active" && p) { const oi = this.currentObjIndex(quest); objective = oi >= 0 ? quest.objectives[oi].label : "Return complete"; }
        else if (status === "done") objective = "Complete";
        return { id: quest.id, name: quest.name, status, objective };
      });
  }
  private objTargetProp(): Prop | null {
    const q = this.activeQuest(); if (!q) return null;
    const oi = this.currentObjIndex(q); if (oi < 0) return null;
    const o = q.objectives[oi];
    if (o.kind === "lightLanterns") {   // point to the nearest unlit quest lantern
      let best: Prop | null = null, bd = 1e9;
      for (const p of this.curRing.props) if (p.t === "lantern" && p.id && !this.lit.has(p.id)) { const d = Math.hypot(this.posX - p.x, this.posY - p.y); if (d < bd) { bd = d; best = p; } }
      return best;
    }
    if (o.kind === "enterWonders") return this.curRing.props.find((p) => p.t === "wonders") ?? null;
    if (!o.target) return null;
    return this.curRing.props.find((p) => p.id === o.target) ?? null;
  }
  private isQuestLantern(p: Prop) { return p.t === "lantern" && !!p.id && this.activeQuest()?.id === "lantern-path" && !this.lit.has(p.id); }

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
    if (this.dialog) {
      this.dialog.i++;
      if (this.dialog.i >= this.dialog.lines.length) { const acc = this.dialog.acceptOnClose; this.dialog = null; if (acc) this.acceptQuest(acc); }
      return;
    }
    if (this.nearPlayer) { this.onShareLight?.(this.nearPlayer.id); return; }   // share a light with a traveller
    const p = this.near; if (!p) return;
    if (p.t === "lantern" && p.id) { if (!this.lit.has(p.id)) { this.lit.add(p.id); this.advanceObjective("lightLanterns"); this.onQuestChange?.(); } }
    else if (p.t === "wonders") { this.advanceObjective("enterWonders"); this.onInteract?.("wonders", p); }
    else if (p.t === "npc") { this.openNpcDialog(p); this.onInteract?.("npc", p); }
    else if (p.t === "dock") {
      const dest = RINGS[p.to ?? -1];
      if (!dest || !dest.explorable) this.toast("The fog past the Hearth hasn't lifted yet.");
      else this.onInteract?.("dock", p);
    }
  }
  private openNpcDialog(p: Prop) {
    const npcId = p.id || "";
    const accent = p.accent || this.curRing.palette.accent;
    // an "interact" objective aimed at this NPC advances on talk
    this.advanceObjective("interact", npcId);
    // offer a quest if this giver has one available
    const offer = offerableQuest(npcId, this.quests);
    if (offer) { this.dialog = { name: p.label || "Ferra", accent, i: 0, lines: offer.intro, acceptOnClose: offer.id }; return; }
    // otherwise a contextual greeting
    const active = this.activeQuest();
    const lines = active
      ? [`Off you go — ${active.name.toLowerCase()} awaits.`, "The glimmer marks your way."]
      : ["Well met again, traveller.", "CirqlCade waits east, past the lanterns."];
    this.dialog = { name: p.label || "Ferra", accent, i: 0, lines };
  }

  // ---------- update ----------
  protected update(dt: number) {
    this.t += dt;
    this.msgT = Math.max(0, this.msgT - dt);

    // live remotes ease toward their last-known position + decay chat bubbles (runs
    // unconditionally so other travellers keep moving during your dialog / chart)
    this.myChatT = Math.max(0, this.myChatT - dt);
    for (const r of Array.from(this.remotes.values())) {
      const px = r.x, py = r.y;
      r.x += (r.tx - r.x) * Math.min(1, dt * 10);
      r.y += (r.ty - r.y) * Math.min(1, dt * 10);
      r.chatT = Math.max(0, r.chatT - dt);
      r.walk = (Math.abs(r.x - px) + Math.abs(r.y - py)) > 0.15 ? r.walk + dt * 10 : 0;
    }

    // pointer-down edge (tap detection, for the minimap → chart)
    const justDown = this.pointer.down && !this.pDownPrev; this.pDownPrev = this.pointer.down;

    // full-screen sea chart: a fresh tap (or E) closes it; nothing else runs
    if (this.mapOpen) {
      if (justDown || this.pressed.a) this.mapOpen = false;
      this.camX += ((this.posX - this.LW / 2) - this.camX) * Math.min(1, dt * 8);
      this.camY += ((this.posY - this.LH / 2) - this.camY) * Math.min(1, dt * 8);
      return;
    }

    // interact edge (Space / E map to "a"); also used to advance dialog
    if (this.pressed.a) this.doInteract();

    // tapping the corner minimap opens the chart (consumes the tap — not a move)
    const tapMap = justDown && !this.dialog && this.inMinimap(this.pointer.x, this.pointer.y);
    if (tapMap) { this.mapOpen = true; this.moveTarget = null; }

    // movement is frozen while a dialog is open or the chart is up
    if (!this.dialog && !tapMap) {
      if (this.pointer.down && !this.inMinimap(this.pointer.x, this.pointer.y)) this.moveTarget = { x: this.pointer.x + this.camX, y: this.pointer.y + this.camY };
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
      if (moving) this.facing = Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? "down" : "up") : (dx > 0 ? "right" : "left");
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

      // nearest interactable in range (incl. unlit quest lanterns during The Lantern Path)
      this.near = null; let best = 1e9;
      for (const p of this.curRing.props) {
        const isQL = this.isQuestLantern(p);
        if (p.t !== "wonders" && p.t !== "npc" && p.t !== "dock" && !isQL) continue;
        const d = Math.hypot(this.posX - p.x, this.posY - p.y);
        const range = p.r ?? (isQL ? 30 : 40);
        if (d < range && d < best) { best = d; this.near = p; }
      }
      // a nearby live traveller wins the E prompt if closer than any prop → "share a light"
      this.nearPlayer = null;
      for (const [id, r] of Array.from(this.remotes.entries())) {
        const d = Math.hypot(this.posX - r.x, this.posY - r.y);
        if (d < 30 && d < best) { best = d; this.nearPlayer = { id, name: r.name }; this.near = null; }
      }

      // "reach" quest objectives complete automatically by walking onto the target
      const tgt = this.objTargetProp();
      if (tgt && Math.hypot(this.posX - tgt.x, this.posY - tgt.y) < (tgt.r ?? 26)) this.advanceObjective("reach", tgt.id);
    }

    // camera easing
    this.camX += ((this.posX - this.LW / 2) - this.camX) * Math.min(1, dt * 8);
    this.camY += ((this.posY - this.LH / 2) - this.camY) * Math.min(1, dt * 8);

    // throttled autosave hook
    if (this.t - this.lastSent > 1.2 && (Math.abs(this.posX - this.lastX) > 3 || Math.abs(this.posY - this.lastY) > 3)) {
      this.onLocalMove?.(this.ringIdx, Math.round(this.posX), Math.round(this.posY));
      this.lastX = this.posX; this.lastY = this.posY; this.lastSent = this.t;
    }

    // fast presence broadcast — only when the position actually moved
    if (this.t - this.lastPresence > 0.09) {
      if (Math.abs(this.posX - this.lastPx) > 0.6 || Math.abs(this.posY - this.lastPy) > 0.6) {
        this.onPresence?.(this.ringIdx, Math.round(this.posX), Math.round(this.posY), this.facing);
        this.lastPx = this.posX; this.lastPy = this.posY;
      }
      this.lastPresence = this.t;
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
    this.ui.length = 0;   // reset the smooth-text queue for this frame
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
        case "lantern": { const isQ = !!p.id && this.activeQuest()?.id === "lantern-path"; const litState = isQ ? this.lit.has(p.id!) : true; draws.push({ y: p.y, f: () => this.drawLantern(sxp, syp, pal.accent, litState) }); break; }
        case "dock": draws.push({ y: p.y - 40, f: () => this.drawDock(sxp, syp, p) }); break;
        case "marker": { const isTarget = this.objTargetProp() === p; if (isTarget) draws.push({ y: p.y - 1, f: () => this.drawMarker(sxp, syp) }); break; }
        default: break;
      }
    }
    // the player
    draws.push({ y: this.posY, f: () => this.drawHero(this.posX - camX, this.posY - camY) });
    // live remote travellers (depth-sorted in with everything else)
    for (const r of Array.from(this.remotes.values())) draws.push({ y: r.y, f: () => this.drawRemote(r.x - camX, r.y - camY, r) });
    draws.sort((a, c) => a.y - c.y);
    for (const d of draws) d.f();

    // quest waypoint — a bouncing chevron over the current objective target
    const wp = this.objTargetProp();
    if (wp) { const bob = this.reduce ? 0 : Math.round(Math.sin(this.t * 4) * 2); this.drawWaypoint(wp.x - camX, wp.y - camY - 22 + bob); }

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
    if (this.mapOpen) this.drawChart(); else this.drawHud();
  }

  // ---------- props ----------
  private drawHero(cx: number, cy: number) {
    const bob = this.walk > 0 ? Math.round(Math.sin(this.walk)) : 0;
    // aura glow (cosmetic) behind the figure
    const aura = this.hero.aura && AURA_COLORS[this.hero.aura];
    if (aura) this.glow(cx, cy - 12, 20, aura, this.reduce ? 0.4 : 0.32 + 0.1 * Math.sin(this.t * 2.5));
    this.disc(cx, cy + 2, 4, "#0a071460");
    this.ring(cx, cy + 2, 6, "#35e0d0", 1.1);       // gentle "you" ring
    this.avatar(cx, cy + bob, this.hero, this.facing);
    this.nameTag(cx, cy, this.myName, "#ffd24a");
    if (this.myChatT > 0 && this.myChat) this.drawBubble(cx, cy, this.myChat, this.myChatT);
  }
  private drawRemote(cx: number, cy: number, r: RemotePlayer) {
    const bob = r.walk > 0 ? Math.round(Math.sin(r.walk)) : 0;
    const aura = r.avatar.aura && AURA_COLORS[r.avatar.aura];
    if (aura) this.glow(cx, cy - 12, 18, aura, this.reduce ? 0.34 : 0.26);
    this.disc(cx, cy + 2, 4, "#0a071460");
    const share = this.nearPlayer?.id && this.remotes.get(this.nearPlayer.id) === r;
    if (share) this.ring(cx, cy + 2, 6, "#ffc46b", 1.1);          // highlight the "share a light" target
    this.avatar(cx, cy + bob, r.avatar, r.facing);
    this.nameTag(cx, cy, r.name, "#dfe6ff");
    if (r.chatT > 0 && r.chat) this.drawBubble(cx, cy, r.chat, r.chatT);
  }
  // a small dark speech bubble above an avatar's head (smooth text via the overlay)
  private drawBubble(cx: number, feet: number, text: string, life: number) {
    const lines = this.wrapText(text.toUpperCase(), 18).slice(0, 2);
    const w = Math.min(98, Math.max(24, ...lines.map((l) => this.textWidth(l, 1))) + 8);
    const h = lines.length * 8 + 5;
    const x = Math.round(cx - w / 2), y = Math.round(feet - 40 - h);
    const a = life < 0.6 ? life / 0.6 : 1;
    this.b.globalAlpha = a;
    this.rect(x, y, w, h, "#0a0714e8"); this.rectLine(x, y, w, h, "#b26cff");
    this.rect(cx - 2, y + h, 4, 3, "#0a0714e8");
    this.b.globalAlpha = 1;
    for (let i = 0; i < lines.length; i++) this.q(cx, y + 3 + i * 8, lines[i], "#eaf6ff", 0.9, "c", false, a);
  }
  private wrapText(s: string, max: number): string[] {
    const words = s.split(" "); const out: string[] = []; let line = "";
    for (const w of words) { const t = line ? line + " " + w : w; if (t.length > max && line) { out.push(line); line = w; } else line = t; }
    if (line) out.push(line); return out;
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
    const near = this.near === p;
    // mysterious aura
    this.glow(cx, cy - 10, 66, ac, 0.24 + (near ? 0.14 : 0) + (this.reduce ? 0 : 0.05 * Math.sin(this.t * 1.5)));
    this.rect(cx - 30, cy + 16, 60, 6, "#0a071455"); // ground shadow

    // ---- cosmic dome roof (drawn first; the walls cover its lower half) ----
    const domeY = cy - 14, domeR = 30;
    this.disc(cx, domeY, domeR, "#0a0a24");            // deep-space base
    this.glow(cx - 9, domeY - 8, 16, "#b26cff", 0.5);  // nebula
    this.glow(cx + 10, domeY - 4, 14, "#ff7ea8", 0.4);
    this.glow(cx + 2, domeY - 12, 12, "#35e0d0", 0.35);
    for (let i = 0; i < 18; i++) {                     // twinkling stars, kept inside the dome cap
      const sx = cx - (domeR - 6) + ((i * 13) % (2 * (domeR - 6)));
      const sy = domeY - 3 - ((i * 11) % (domeR - 6));
      if ((sx - cx) * (sx - cx) + (sy - domeY) * (sy - domeY) > (domeR - 3) * (domeR - 3)) continue;
      const tw = this.reduce ? true : Math.sin(this.t * 4 + i * 1.7) > -0.25;
      if (tw) this.px(Math.round(sx), Math.round(sy), i % 5 === 0 ? "#ffd24a" : "#ffffff");
    }
    this.disc(cx - 14, domeY - 2, 3, "#7fbfff"); this.ring(cx - 14, domeY - 2, 5, "#cfe6ff", 1); // ringed planet
    this.ring(cx, domeY, domeR, ac, 1.4);              // dome rim

    // ---- walls (cover the dome's lower half) ----
    this.rect(cx - 26, cy - 14, 52, 30, "#1a1433");
    this.rect(cx - 26, cy - 14, 52, 2, "#2a2150");     // eave
    this.rectLine(cx - 26, cy - 14, 52, 30, ac);
    this.disc(cx - 16, cy - 2, 3, "#ffd98a"); this.disc(cx + 16, cy - 2, 3, "#ffd98a"); // windows
    // arched glowing entrance
    this.disc(cx, cy + 6, 8, ac); this.rect(cx - 8, cy + 6, 16, 10, ac);
    this.rect(cx - 5, cy + 9, 10, 7, "#0b0a1e");
    this.labelPill(cx, cy - 46, p.label || "CirqlCade", ac);
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
  private drawMarker(cx: number, cy: number) {
    const c = "#ffd24a";
    this.glow(cx, cy, 20, c, this.reduce ? 0.35 : 0.28 + 0.14 * Math.sin(this.t * 3));
    const r = this.reduce ? 7 : 6 + Math.sin(this.t * 3) * 1.5;
    this.ring(cx, cy, r, c, 1.4);
    this.disc(cx, cy, 1.5, c);
  }
  private drawWaypoint(cx: number, cy: number) {
    // a downward chevron + soft glow marking "go here"
    this.glow(cx, cy - 2, 10, "#ffd24a", 0.4);
    this.rect(cx - 3, cy - 4, 6, 2, "#ffd24a");
    this.rect(cx - 2, cy - 2, 4, 2, "#ffd24a");
    this.rect(cx - 1, cy, 2, 2, "#ffd24a");
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
    const w = Math.max(this.textWidth(name, 1), name.length * 3.4);
    this.rect(cx - w / 2 - 2, feet - 27, w + 4, 9, "#0a0714b8");
    this.q(cx, feet - 26, name, c, 0.92, "c", true);
  }
  private labelPill(cx: number, y: number, s: string, c: string) {
    const w = Math.max(this.textWidth(s, 1), s.length * 3.4);
    this.rect(cx - w / 2 - 3, y - 1, w + 6, 9, "#0a0714cc");
    this.q(cx, y, s, c, 0.95, "c", true);
  }
  private drawHud() {
    const it = this.itop(), ib = this.ibot();
    // top row (below the floating header): online (left) · sparks (right)
    this.ring(9, it + 6, 3, "#33e650", 1.3); this.q(15, it + 2, `${this.stats.online}`, "#c2fbe0", 1, "l");
    this.q(this.LW - 4, it + 2, `${this.stats.sparks} SPARKS`, "#ffc46b", 1, "r", true);

    this.drawQuestTracker(it);
    this.drawMinimap(it);

    // World Energy — the light you've fed the shared world (bottom-left)
    const ew = 70, ex = 6, ey = this.LH - ib - 27;
    this.q(ex, ey - 9, "WORLD ENERGY", "#7fa0c8", 0.8, "l", true);
    this.rect(ex, ey, ew, 5, "#0a0714aa");
    const efill = Math.round(ew * Math.max(0, Math.min(1, this.stats.energy)));
    if (efill > 0) { this.rect(ex, ey, efill, 5, "#35e0d0"); this.rect(ex, ey, efill, 1, "#bafff2"); }
    // your Cirql — friends as lanterns lighting the Hearth
    const lit = `CIRQL ${this.stats.cirqlLit}/${this.stats.cirqlTotal}`;
    this.q(6, this.LH - ib - 11, lit, "#ffc46b", 1, "l", true);

    // interact prompt — bottom-centre, above the controls (a live traveller wins over props)
    let promptTxt = "", promptAcc = "#35e0d0";
    if (this.nearPlayer && !this.dialog) { promptTxt = `E · Share a light with ${this.nearPlayer.name}`; promptAcc = "#ffc46b"; }
    else if (this.near && !this.dialog) {
      const label = this.near.t === "wonders" ? "Enter CirqlCade"
        : this.near.t === "npc" ? `Talk to ${this.near.label || ""}`
          : this.near.t === "lantern" ? "Light the lantern"
            : "Set sail";
      promptTxt = `E · ${label}`; promptAcc = this.near.accent || "#35e0d0";
    }
    if (promptTxt) {
      const w = Math.max(this.textWidth(promptTxt, 1), promptTxt.length * 3.6);
      const x = Math.round((this.LW - w) / 2), y = this.LH - ib - 24;
      this.rect(x - 5, y - 3, w + 10, 12, "#0a0714dd");
      this.rectLine(x - 5, y - 3, w + 10, 12, promptAcc);
      this.q(this.LW / 2, y, promptTxt, "#eaf6ff", 1, "c", true);
    }

    // toast — top centre (below the top row)
    if (this.msgT > 0) {
      const w = Math.max(this.textWidth(this.msg, 1), this.msg.length * 3.4); const x = Math.round((this.LW - w) / 2);
      const a = Math.min(1, this.msgT * 1.5);
      this.b.globalAlpha = a;
      this.rect(x - 5, it + 14, w + 10, 11, "#0a0714e0"); this.rectLine(x - 5, it + 14, w + 10, 11, "#b26cff");
      this.b.globalAlpha = 1;
      this.q(this.LW / 2, it + 16, this.msg, "#e6d8ff", 1, "c", false, a);
    }

    // dialog
    if (this.dialog) this.drawDialog();
  }
  private drawQuestTracker(it: number) {
    const q = this.activeQuest(); if (!q) return;
    const oi = this.currentObjIndex(q); if (oi < 0) return;
    const o = q.objectives[oi];
    const cnt = o.count ?? 1; const have = this.quests[q.id]?.obj[oi] ?? 0;
    const prog = cnt > 1 ? `  ${have}/${cnt}` : "";
    const line = `${o.label}${prog}`;
    const w = Math.max(q.name.length, line.length) * 4.4 + 12;
    const x = 3, y = it + 14;
    this.rect(x, y, w, 21, "#0a0714c0");
    this.rect(x, y, 2, 21, "#ffd24a");
    this.q(x + 5, y + 3, q.name, "#ffd24a", 1, "l", true);
    this.q(x + 5, y + 12, line, "#eaf6ff", 0.95, "l");
  }
  private drawMinimap(it: number) {
    const b = this.b, s = this.SS;
    const cx = this.LW - 26, cy = it + 34, R = 20;
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
    this.q(cx, cy - R + 1, "?", "#b4bedc", 1, "c");
    const dr = step * (this.ringIdx + 1);
    // quest objective target (gold, pulsing) at its angle on the current ring
    const tgt = this.objTargetProp();
    if (tgt) { const ta = Math.atan2(tgt.y, tgt.x); const pr = this.reduce ? 2 : 1.6 + Math.abs(Math.sin(this.t * 3)) * 1.2; b.fillStyle = "#ffd24a"; b.beginPath(); b.arc((cx + Math.cos(ta) * dr) * s, (cy + Math.sin(ta) * dr) * s, pr * s, 0, TAU); b.fill(); }
    // player dot at their angle on the current ring
    const ang = Math.atan2(this.posY, this.posX);
    b.fillStyle = "#ffffff"; b.beginPath(); b.arc((cx + Math.cos(ang) * dr) * s, (cy + Math.sin(ang) * dr) * s, 1.8 * s, 0, TAU); b.fill();
    // tappable hint
    this.q(cx, cy + R + 2, "MAP", "#8fa6c6", 0.8, "c", true);
  }
  private drawChart() {
    const b = this.b, s = this.SS, W = this.LW, H = this.LH;
    const it = this.itop();
    this.ui.length = 0;   // drop any world labels queued this frame — chart only
    b.fillStyle = "rgba(4,7,16,0.93)"; b.fillRect(0, 0, W * s, H * s);
    this.q(W / 2, it + 6, "The Endless Ocean", "#eaf6ff", 1.3, "c", true);
    this.q(W / 2, it + 20, "your chart of the rings", "#7fa0c8", 0.9, "c");
    const cx = W / 2, cy = H / 2 + 4, maxR = Math.min(W, H) * 0.40, step = maxR / MINIMAP_RINGS;
    this.glow(cx, cy, maxR + 10, "#16264d", 0.55);
    for (let i = MINIMAP_RINGS - 1; i >= 0; i--) {
      const rad = step * (i + 1); const known = i < KNOWN_RINGS;
      b.beginPath(); b.arc(cx * s, cy * s, rad * s, 0, TAU);
      if (known) { b.strokeStyle = i === this.ringIdx ? "#ffffff" : "rgba(120,200,255,0.55)"; b.lineWidth = (i === this.ringIdx ? 2 : 1.2) * s; b.setLineDash([]); }
      else { b.strokeStyle = "rgba(120,140,180,0.28)"; b.lineWidth = 1 * s; b.setLineDash([4 * s, 6 * s]); }
      b.stroke();
    }
    b.setLineDash([]);
    // land labels (known named; the first fogged ring marked uncharted)
    for (let i = 0; i < MINIMAP_RINGS; i++) {
      const rad = step * (i + 1);
      if (i < KNOWN_RINGS) this.q(cx, cy - rad - 7, RINGS[i]?.name || "", i === this.ringIdx ? "#ffd24a" : "#bfe0ff", 1, "c", true);
      else if (i === KNOWN_RINGS) { this.q(cx, cy - rad - 7, "? uncharted ?", "#6f86ad", 0.9, "c"); break; }
    }
    // objective (gold) + you (teal/white) on the current ring
    const pr = step * (this.ringIdx + 1);
    const tgt = this.objTargetProp();
    if (tgt) { const ta = Math.atan2(tgt.y, tgt.x), tx = cx + Math.cos(ta) * pr, ty = cy + Math.sin(ta) * pr; this.glow(tx, ty, 9, "#ffd24a", 0.6); this.disc(tx, ty, 2, "#ffd24a"); }
    const pa = Math.atan2(this.posY, this.posX), pxp = cx + Math.cos(pa) * pr, pyp = cy + Math.sin(pa) * pr;
    this.glow(pxp, pyp, 9, "#35e0d0", 0.7); this.disc(pxp, pyp, 2.2, "#ffffff"); this.ring(pxp, pyp, 4, "#35e0d0", 1);
    this.q(pxp, pyp - 11, "You", "#ffffff", 0.85, "c", true);
    this.q(W / 2, H - this.ibot() - 12, "tap anywhere to close", "#8fa6c6", 0.95, "c");
  }
  private drawDialog() {
    if (!this.dialog) return;
    const d = this.dialog;
    const boxH = 40, boxY = this.LH - this.ibot() - boxH - 6;
    this.rect(6, boxY, this.LW - 12, boxH, "#0a0714ee");
    this.rectLine(6, boxY, this.LW - 12, boxH, d.accent);
    this.q(11, boxY + 4, d.name, d.accent, 1, "l", true);
    const line = d.lines[d.i] || "";
    // wrap to width (measured in the smooth font at overlay time is ideal, but the
    // pixel-width estimate leaves margin, so smooth text always fits inside it)
    const words = line.split(" "); const rows: string[] = []; let cur = "";
    for (const w of words) { const tryn = cur ? cur + " " + w : w; if (this.textWidth(tryn, 1) > this.LW - 34 && cur) { rows.push(cur); cur = w; } else cur = tryn; }
    if (cur) rows.push(cur);
    for (let i = 0; i < Math.min(3, rows.length); i++) this.q(11, boxY + 15 + i * 9, rows[i], "#eaf6ff", 1, "l");
    const hint = d.i < d.lines.length - 1 ? "E ▸" : "E ✕";
    this.q(this.LW - 11, boxY + boxH - 10, hint, "#9fb0d0", 1, "r");
  }

  // ---------- smooth-text overlay (crisp UI at full display resolution) ----------
  protected onOverlay(g: CanvasRenderingContext2D) {
    if (!this.ui.length) return;
    const sc = this.dispW / this.LW;                       // logical → CSS px
    g.textBaseline = "top";
    g.shadowColor = "rgba(0,0,0,0.85)"; g.shadowOffsetX = 0; g.shadowOffsetY = Math.max(1, sc);
    for (const it of this.ui) {
      const fs = Math.max(9, Math.round(it.sc * 7.4 * sc));
      g.font = `${it.bold ? 700 : 600} ${fs}px "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif`;
      g.textAlign = it.align === "c" ? "center" : it.align === "r" ? "right" : "left";
      g.globalAlpha = it.alpha ?? 1;
      g.shadowBlur = 2 * sc;
      g.fillStyle = it.c;
      g.fillText(it.s, it.x * sc, it.y * sc);
    }
    g.globalAlpha = 1; g.shadowBlur = 0; g.shadowOffsetY = 0; g.textAlign = "left";
  }
}
