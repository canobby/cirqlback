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
import { RINGS, MINIMAP_RINGS, type Ring, type Prop } from "./cirql-world";
import { getRing, ringName, isSubMap, parentOf, subKindOf } from "./cirql-ring-gen";
import { MOVIES, REEL_SECONDS } from "./cirql-theater";
import {
  allQuests, questById, offerableQuest, repeatableQuest, questStatusList, registerQuest,
  type QuestDef, type QuestProgress, type ObjectiveKind, type QuestStatus,
} from "./cirql-quests";
import { generateRingQuest } from "./cirql-quest-gen";
import { EMOTE_BY_ID, EMOTE_SECONDS } from "./cirql-emotes";
import { arrivalCutscene, BEAT_SECONDS, type Cutscene, type CutsceneBeat, type CutsceneFx } from "./cirql-cutscenes";
import { decorById, DECOR_SOLID } from "./cirql-decor";

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
interface RemotePlayer { x: number; y: number; tx: number; ty: number; facing: Facing; name: string; avatar: AvatarConfig; chat: string; chatT: number; walk: number; emote: string; emoteT: number; }
export interface RemoteState { id: string; x: number; y: number; dir: string; name: string; avatar: AvatarConfig; ring?: number; }

export class CirqlWorldEngine extends RetroEngine {
  private ringIdx = 0;
  private curRing: Ring = RINGS[0];
  private maxRing = 0;                          // furthest ring reached (lifts the fog)
  private arriveT = 0; private arriveName = ""; private arriveSub = "";   // arrival name-card flourish
  // cutscene player (CHR-264): a skippable, letterboxed sequence of timed beats
  private cs: Cutscene | null = null;
  private csBeat = 0; private csT = 0; private csAge = 0; private csClosing = 0;
  private csOnDone: (() => void) | undefined;
  // sailing voyage (CHR-262): a short interactive crossing between surface rings
  private voyage: {
    dest: number; t: number; progress: number;   // 0..1 distance to the far shore
    bx: number; wob: number;                       // boat lateral pos (-1..1) + bob phase
    outward: boolean; accent: string; destName: string;
    motes: { x: number; y: number; vy: number; got: boolean }[];   // drifting light to gather
    gathered: number; wake: number;
  } | null = null;
  private posX = 0; private posY = 0;         // player world position
  private vx = 0; private vy = 0; private facing: "up" | "down" | "left" | "right" = "down"; private walk = 0;
  private jumpZ = 0; private jumpVel = 0;      // fake-Z hop (CHR-263): raised height + vertical velocity
  // Hearth décor (CHR-259): your placed decorations, an edit mode, and a "visiting" overlay
  private decor: { item: string; x: number; y: number }[] = [];
  private editDecor = false; private editSel = "";     // placing this item; "" = remove-on-tap
  private snapGrid = false;                             // snap placement to a grid (CHR-273)
  private visiting: { name: string; decor: { item: string; x: number; y: number }[] } | null = null;
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
  private doneOnce = new Set<string>();   // quest ids completed at least once (repeats pay less)
  private lit = new Set<string>();   // permanently-lit lanterns + puzzle rune states
  private litForQuest = new Set<string>();   // lanterns lit for the CURRENT lightLanterns quest (reset on accept — never blocked by stale global lit)

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
  /** Fired when the player sails to a new ring (host persists ring + maxRing). */
  onSail?: (ring: number, maxRing: number) => void;
  /** Fired when a quest completes — host grants the reward (reduced when firstTime=false) + persists. */
  onQuestComplete?: (quest: QuestDef, firstTime: boolean) => void;
  /** Fired when quest progress changes (accept / advance / complete) — host may persist. */
  onQuestChange?: () => void;
  private lastSent = 0; private lastX = 1e9; private lastY = 1e9;

  // ---- M8 live presence (host wires these to the /ws/cirql socket) ----
  private remotes = new Map<string, RemotePlayer>();
  private myChat = ""; private myChatT = 0;                 // your own chat bubble
  private myEmote = ""; private myEmoteT = 0;               // your own active emote (CHR-260)
  private nearPlayer: { id: string; name: string } | null = null;  // remote in "share a light" range
  private lastPresence = 0; private lastPx = 1e9; private lastPy = 1e9;
  /** Fired often (throttled) with the live position, for the presence socket. */
  onPresence?: (ring: number, x: number, y: number, facing: Facing) => void;
  /** Fired when the player presses E next to another traveller (share a light). */
  onShareLight?: (id: string) => void;
  /** Fired when the local player plays an emote (broadcast over the presence socket). */
  onEmote?: (emote: string) => void;
  /** Fired at the end of a sailing voyage with the light gathered (host grants sparqs). */
  onVoyageReward?: (sparqs: number) => void;

  // ---- M9 party (host wires these to the campaign/party state) ----
  private partyWp: { x: number; y: number } | null = null;   // shared campaign waypoint
  private partyArrived = false;                                // local-arrival latch (per step)
  private partyIds = new Set<string>();                        // remote ids in my party (highlighted)
  private partyTarget: { ring: number; at?: string; x?: number; y?: number } | null = null;   // the step's target (ring-aware)
  private partyAdvanceable = false;                            // is the current waypoint the real target (vs a dock hint)?
  /** Fired once when the local player reaches the shared party waypoint. */
  onPartyArrive?: () => void;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, 264, 200);
    // responsive full-bleed world viewport (fills the screen, shows more world)
    this.fit = true; this.fitPx = 1.5; this.resize();
    this.hero = loadAvatarLS();
    this.posX = this.curRing.spawn.x; this.posY = this.curRing.spawn.y;
    this.camX = this.posX - this.LW / 2; this.camY = this.posY - this.LH / 2;
    this.ensureRingQuest();
    this.running = true;
  }

  /** Register the current ring's generated quest so its keeper can offer it (CHR-256). */
  private ensureRingQuest() { const q = generateRingQuest(this.ringIdx); if (q) registerQuest(q); }

  // ---------- host API ----------
  setLocal(name: string, avatar?: AvatarConfig) { this.myName = (name || "You").slice(0, 16); if (avatar) this.hero = avatar; }
  /** Live-update the player's look (character creator / "edit look"). */
  setAvatar(avatar: AvatarConfig) { this.hero = avatar; }
  setStats(s: Partial<CirqlStats>) { this.stats = { ...this.stats, ...s }; }
  // ---- Hearth décor (CHR-259) ----
  /** Fired when the player places/removes décor (host persists + rebroadcasts). */
  onDecorChange?: () => void;
  getDecor() { return this.decor.slice(); }
  setDecor(list: { item: string; x: number; y: number }[]) { this.decor = Array.isArray(list) ? list.filter((d) => d && decorById[d.item]).map((d) => ({ item: d.item, x: +d.x, y: +d.y })) : []; }
  /** Enter décor edit mode; `itemId` is the piece to place, or "" to remove-on-tap. */
  beginDecorEdit(itemId: string) { if (this.ringIdx !== 0 || this.visiting) return; this.editDecor = true; this.editSel = decorById[itemId] ? itemId : ""; }
  setDecorTool(itemId: string) { this.editSel = decorById[itemId] ? itemId : ""; }
  setSnap(on: boolean) { this.snapGrid = !!on; }
  endDecorEdit() { this.editDecor = false; }
  decorEditing() { return this.editDecor; }
  clearDecor() { if (this.decor.length) { this.decor = []; this.onDecorChange?.(); } }
  /** Visit another traveller's CIRQLSPACE (render their décor read-only over it). */
  startVisit(name: string, decor: { item: string; x: number; y: number }[]) {
    this.editDecor = false;
    this.visiting = { name: (name || "Traveller").slice(0, 16), decor: (decor || []).filter((d) => d && decorById[d.item]) };
    if (this.ringIdx !== 0) { this.ringIdx = 0; this.curRing = getRing(0); }
    this.posX = 0; this.posY = 150; this.camX = -this.LW / 2; this.camY = 150 - this.LH / 2;
    this.near = null; this.dialog = null;
  }
  endVisit() { this.visiting = null; }
  isVisiting() { return !!this.visiting; }
  visitingName() { return this.visiting?.name ?? ""; }
  /** Full-screen safe-area: keep the HUD below the floating header + above the controls (CSS px). */
  setHudInsets(topCss: number, botCss: number) { this.insetTopCss = Math.max(0, topCss); this.insetBotCss = Math.max(0, botCss); }
  /** The on-screen action button + the quest system call this to interact. */
  interact() { if (this.voyage) { this.endVoyage(); return; } if (this.cs) { if (this.csClosing <= 0) this.csClosing = 0.35; return; } this.doInteract(); }
  /** A little fake-Z hop (CHR-263) — raise the sprite; the shadow stays grounded. */
  jump() { if (this.cs || this.voyage || this.dialog || this.mapOpen) return; if (this.jumpZ <= 0.01 && this.jumpVel <= 0) this.jumpVel = 66; }
  getState() { return { ring: this.ringIdx, maxRing: this.maxRing, x: Math.round(this.posX), y: Math.round(this.posY), quests: this.quests, lit: Array.from(this.lit), litForQuest: Array.from(this.litForQuest), doneOnce: Array.from(this.doneOnce), decor: this.decor.slice() }; }
  applyState(s: any) {
    if (!s) return;
    if (Array.isArray(s.doneOnce)) this.doneOnce = new Set(s.doneOnce);
    if (Array.isArray(s.decor)) this.setDecor(s.decor);
    if (Array.isArray(s.litForQuest)) this.litForQuest = new Set(s.litForQuest);
    if (typeof s.maxRing === "number") this.maxRing = Math.max(this.maxRing, s.maxRing);
    if (typeof s.ring === "number" && s.ring >= 0) { this.ringIdx = s.ring; this.curRing = getRing(s.ring); this.maxRing = Math.max(this.maxRing, s.ring); this.ensureRingQuest(); }
    if (typeof s.x === "number" && typeof s.y === "number") { this.posX = s.x; this.posY = s.y; }
    if (s.quests && typeof s.quests === "object") this.quests = s.quests;
    if (Array.isArray(s.lit)) this.lit = new Set(s.lit);
    this.camX = this.posX - this.LW / 2; this.camY = this.posY - this.LH / 2;
  }
  /** How many concentric rings are "known" (lit on the chart) — grows as you explore. */
  private knownRings() { return Math.max(1, this.maxRing + 1); }
  /** Travel to another ring/sub-map. Crossing the open sea between surface rings plays
   *  the interactive sailing voyage (CHR-262); entering a sub-map via a portal (cave/
   *  tree/cloud) swaps instantly. */
  private sailTo(dest: number) {
    if (dest < 0 || dest === this.ringIdx) return;
    const overSea = !isSubMap(dest) && !isSubMap(this.ringIdx);   // surface↔surface = a real voyage
    if (overSea && !this.reduce) this.startVoyage(dest);
    else this.doSail(dest);
  }
  /** Swap the world + arrive at the connector back (the actual ring change). */
  private doSail(dest: number) {
    if (dest < 0 || dest === this.ringIdx) return;
    const from = this.ringIdx;
    // a brand-new outer shore (not a sub-map, never reached before) earns a full arrival cutscene
    const firstShore = !isSubMap(dest) && dest > this.maxRing;
    this.ringIdx = dest;
    this.curRing = getRing(dest);
    if (!isSubMap(dest)) this.maxRing = Math.max(this.maxRing, dest);   // sub-maps don't lift the fog
    this.ensureRingQuest();
    const r = this.curRing.radius;
    // arrive at the dock/portal that leads back to where we came from
    const back = this.curRing.props.find((p) => (p.t === "dock" || p.t === "portal") && p.to === from);
    if (back) { this.posX = back.x; this.posY = back.y + (back.t === "portal" ? 26 : 30); }
    else { const outward = dest > from; this.posX = 0; this.posY = outward ? -r * 0.68 : r * 0.7; }
    this.vx = this.vy = 0; this.facing = "down";
    this.camX = this.posX - this.LW / 2; this.camY = this.posY - this.LH / 2;
    this.near = null; this.dialog = null; this.moveTarget = null;
    this.resolvePartyWp();   // re-point the shared waypoint for the new ring
    if (firstShore) this.playCutscene(arrivalCutscene(this.curRing.name, this.curRing.sub, this.curRing.palette.accent));
    else { this.arriveT = 3.0; this.arriveName = this.curRing.name; this.arriveSub = this.curRing.sub; }   // quick card on revisits
    this.onSail?.(this.ringIdx, this.maxRing);
  }
  // ---------- sailing voyage (CHR-262) ----------
  /** Begin the interactive crossing to `dest`: steer the boat up-screen toward the far
   *  shore, gathering drifting light, then land (doSail runs the real ring change). */
  private startVoyage(dest: number) {
    const destRing = getRing(dest);
    const motes = Array.from({ length: 7 }, (_, i) => ({
      x: 0.12 + (((i * 97) % 76) / 100),          // spread across the lane, deterministic (no Math.random)
      y: 0.15 + ((i * 137) % 70) / 100,
      vy: 0.045 + ((i * 53) % 40) / 1000,
      got: false,
    }));
    this.voyage = { dest, t: 0, progress: 0, bx: 0, wob: 0, outward: dest > this.ringIdx, accent: destRing.palette.accent, destName: destRing.name, motes, gathered: 0, wake: 0 };
    this.vx = this.vy = 0; this.moveTarget = null; this.dialog = null; this.near = null; this.mapOpen = false;
  }
  /** Is the sailing voyage running (the world is suspended)? */
  voyageActive() { return !!this.voyage; }
  private endVoyage() {
    const v = this.voyage; this.voyage = null;
    if (!v) return;
    if (v.gathered > 0) this.onVoyageReward?.(v.gathered);   // light gathered → sparqs (host caps)
    this.doSail(v.dest);                                     // now actually land
  }
  toast(text: string) { this.msg = text; this.msgT = 4.6; }
  /** Play a skippable, letterboxed cutscene (CHR-264). `onDone` fires when it finishes/skips. */
  playCutscene(cs: Cutscene, onDone?: () => void) {
    if (!cs || !cs.beats.length) { onDone?.(); return; }
    this.cs = cs; this.csBeat = 0; this.csT = 0; this.csAge = 0; this.csClosing = 0; this.csOnDone = onDone;
    this.vx = this.vy = 0; this.moveTarget = null; this.dialog = null; this.mapOpen = false;   // settle the world under the scene
  }
  /** Is a cutscene currently playing (the world is frozen)? */
  cutsceneActive() { return !!this.cs; }
  private csBeatDef(): CutsceneBeat | null { return this.cs ? this.cs.beats[this.csBeat] ?? null : null; }
  private endCutscene() { const cb = this.csOnDone; this.cs = null; this.csOnDone = undefined; cb?.(); }
  /** Current interact target's kind (host may use to theme the action button). */
  nearKind(): InteractKind | null { return (this.near?.t as InteractKind) ?? null; }

  // ---------- M8 live presence host API ----------
  private facingOf(d: string): Facing { return d === "up" || d === "left" || d === "right" ? d : "down"; }
  addRemote(s: RemoteState) {
    this.remotes.set(s.id, { x: s.x, y: s.y, tx: s.x, ty: s.y, facing: this.facingOf(s.dir), name: (s.name || "Traveller").slice(0, 16), avatar: s.avatar || DEFAULT_AVATAR, chat: "", chatT: 0, walk: 0, emote: "", emoteT: 0 });
  }
  moveRemote(id: string, x: number, y: number, dir: string) { const r = this.remotes.get(id); if (r) { r.tx = x; r.ty = y; r.facing = this.facingOf(dir); } }
  removeRemote(id: string) { this.remotes.delete(id); }
  chatRemote(id: string, text: string) { const r = this.remotes.get(id); if (r) { r.chat = text; r.chatT = 5.5; } }
  /** A remote traveller played an emote — show its glyph (+ motion) over them (CHR-260). */
  emoteRemote(id: string, emote: string) { const r = this.remotes.get(id); const def = EMOTE_BY_ID[emote]; if (r && def) { r.emote = emote; r.emoteT = def.hold ?? EMOTE_SECONDS; } }
  /** Show your own chat bubble over your avatar. */
  sayLocal(text: string) { this.myChat = text; this.myChatT = 5.5; }
  /** Play an emote locally + broadcast it (called by the emote wheel). */
  playEmote(emote: string) { const def = EMOTE_BY_ID[emote]; if (!def) return; this.myEmote = emote; this.myEmoteT = def.hold ?? EMOTE_SECONDS; this.onEmote?.(emote); }
  remoteCount() { return this.remotes.size; }
  clearRemotes() { this.remotes.clear(); }

  // ---------- M9 party host API ----------
  /**
   * Set the shared campaign target. `ring` says which ring the step is on; `at` is a
   * prop id resolved on that ring (or x/y for an explicit spot). Off the step's ring the
   * waypoint points to the dock that sails the right way (and can't be "arrived" at).
   */
  setPartyTarget(t: { ring: number; at?: string; x?: number; y?: number } | null) {
    this.partyTarget = t; this.resolvePartyWp();
  }
  private resolvePartyWp() {
    const t = this.partyTarget;
    if (!t) { this.setWp(null, false); return; }
    if ((t.ring ?? 0) === this.ringIdx) {
      let pos: { x: number; y: number } | null = null;
      if (t.at) { const p = this.curRing.props.find((x) => x.id === t.at); if (p) pos = { x: p.x, y: p.y }; }
      else if (t.x != null && t.y != null) pos = { x: t.x, y: t.y };
      this.setWp(pos, !!pos);                      // on-ring → real target, arrival advances
    } else {
      const d = this.dockToward(t.ring ?? 0);
      this.setWp(d ? { x: d.x, y: d.y } : null, false);   // off-ring → dock hint, no arrival
    }
  }
  private setWp(wp: { x: number; y: number } | null, advanceable: boolean) {
    const changed = (!!wp !== !!this.partyWp) || (wp && this.partyWp && (wp.x !== this.partyWp.x || wp.y !== this.partyWp.y));
    this.partyWp = wp ? { x: wp.x, y: wp.y } : null;
    this.partyAdvanceable = advanceable;
    if (changed) this.partyArrived = false;
  }
  /** The connector on the current ring heading toward `targetRing` — a direct dock/portal
   *  if one exists (handles sub-maps), else the surface dock going the right way. */
  private dockToward(targetRing: number): Prop | null {
    const direct = this.curRing.props.find((p) => (p.t === "dock" || p.t === "portal") && p.to === targetRing);
    if (direct) return direct;
    const outward = targetRing > this.ringIdx;
    for (const p of this.curRing.props) if (p.t === "dock") {
      const to = p.to ?? -1;
      if (outward && to > this.ringIdx) return p;
      if (!outward && to >= 0 && to < this.ringIdx) return p;
    }
    return null;
  }
  /** Highlight which remote travellers are in my party. */
  setPartyMembers(ids: string[]) { this.partyIds = new Set(ids); }

  // ---------- quests ----------
  /** Accept a quest (offered by an NPC or auto-started on first run). */
  acceptQuest(id: string) {
    const q = questById(id); if (!q || this.quests[id]?.status === "active") return;   // re-accept allowed if done (repeat)
    this.quests[id] = { status: "active", obj: q.objectives.map(() => 0) };
    // a "light the lanterns" quest starts fresh: reset the per-quest lit set so the
    // lanterns are all dark + lightable, regardless of any permanent/global lit state
    if (q.objectives.some((o) => o.kind === "lightLanterns")) this.litForQuest = new Set();
    this.toast(`✦ New quest — ${q.name}`);
    this.onQuestChange?.();
  }
  private activeQuest(): QuestDef | null {
    for (const q of allQuests()) if (this.quests[q.id]?.status === "active") return q;
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
    if (o.ring != null && o.ring !== this.ringIdx) return;   // cross-ring: advance only on the objective's ring
    if ((kind === "reach" || kind === "interact") && o.target && o.target !== targetId) return;
    p.obj[oi] = Math.min(o.count ?? 1, (p.obj[oi] || 0) + 1);
    this.onQuestChange?.();
    if (this.currentObjIndex(q) < 0) this.completeQuest(q);
  }
  private completeQuest(q: QuestDef) {
    const p = this.quests[q.id]; if (!p || p.status === "done") return;
    p.status = "done";
    const first = !this.doneOnce.has(q.id);
    this.doneOnce.add(q.id);
    // lanterns lit for this quest become permanently lit (the path stays glowing)
    if (this.litForQuest.size) { for (const id of Array.from(this.litForQuest)) this.lit.add(id); this.litForQuest.clear(); }
    this.onQuestComplete?.(q, first);   // page grants the reward (reduced on repeat) + toast
    this.onQuestChange?.();
    if (q.next) this.acceptQuest(q.next);   // chain onward (re-accepting resets a repeated chain)
  }
  /** Rows for the quest-log panel (available/active/done, with the current objective). */
  getQuestLog(): QuestLogRow[] {
    const curGiver = `keeper-${this.ringIdx}`;
    return questStatusList(this.quests)
      .filter((s) => s.status !== "locked")
      // keep authored quests + any you've started/finished + the current ring's offer;
      // hide stale "available" ring quests from rings you've sailed past
      .filter((s) => !s.quest.id.startsWith("ring-") || this.quests[s.quest.id] || s.quest.giver === curGiver)
      .map(({ quest, status }) => {
        const p = this.quests[quest.id];
        let objective = quest.objectives[0]?.label ?? "";
        if (status === "active" && p) { const oi = this.currentObjIndex(quest); if (oi >= 0) { const o = quest.objectives[oi]; objective = (o.ring != null && o.ring !== this.ringIdx) ? `Sail to ${ringName(o.ring)} — ${o.label}` : o.label; } else objective = "Return complete"; }
        else if (status === "done") objective = "Complete";
        return { id: quest.id, name: quest.name, status, objective };
      });
  }
  private objTargetProp(): Prop | null {
    const q = this.activeQuest(); if (!q) return null;
    const oi = this.currentObjIndex(q); if (oi < 0) return null;
    const o = q.objectives[oi];
    if (o.ring != null && o.ring !== this.ringIdx) return this.dockToward(o.ring);   // cross-ring: point to the dock that sails there
    if (o.kind === "lightLanterns") {   // point to the nearest lantern not yet lit this quest
      let best: Prop | null = null, bd = 1e9;
      for (const p of this.curRing.props) if (p.t === "lantern" && p.id && !this.litForQuest.has(p.id)) { const d = Math.hypot(this.posX - p.x, this.posY - p.y); if (d < bd) { bd = d; best = p; } }
      return best;
    }
    if (o.kind === "enterWonders") return this.curRing.props.find((p) => p.t === "wonders") ?? null;
    if (o.kind === "solvePuzzle") {
      const target = this.curRing.puzzleTarget; if (!target) return null;
      if (this.puzzleSolved()) return this.curRing.props.find((p) => p.t === "shrine") ?? null;
      let best: Prop | null = null, bd = 1e9;   // nearest rune in the wrong state (needs toggling)
      for (const p of this.curRing.props) if (p.t === "rune" && p.id && (this.lit.has(p.id) !== target.includes(p.id))) {
        const d = Math.hypot(this.posX - p.x, this.posY - p.y); if (d < bd) { bd = d; best = p; }
      }
      return best;
    }
    if (!o.target) return null;
    return this.curRing.props.find((p) => p.id === o.target) ?? null;
  }
  /** The kind of the active quest's current objective (drives lantern interactivity). */
  private currentObjKind(): ObjectiveKind | null {
    const q = this.activeQuest(); if (!q) return null;
    const oi = this.currentObjIndex(q); if (oi < 0) return null;
    return q.objectives[oi].kind;
  }
  // A lantern is a quest lantern (unlit + interactable) whenever the active quest's
  // current objective is lightLanterns and it isn't yet lit FOR THIS QUEST — works on the
  // Hearth AND generated rings, and is never blocked by permanent/global lit state.
  private isQuestLantern(p: Prop) { return p.t === "lantern" && !!p.id && this.currentObjKind() === "lightLanterns" && !this.litForQuest.has(p.id); }

  // ---------- interaction ----------
  private solids(): { x: number; y: number; r: number }[] {
    const out: { x: number; y: number; r: number }[] = [];
    for (const p of this.curRing.props) {
      if (p.t === "hearth") out.push({ x: p.x, y: p.y, r: 40 });
      else if (p.t === "wonders") out.push({ x: p.x, y: p.y, r: 34 });
      else if (p.t === "tree") out.push({ x: p.x, y: p.y + 2, r: p.big ? 13 : 10 });
      else if (p.t === "bush") out.push({ x: p.x, y: p.y, r: 7 });
      else if (p.t === "rock") out.push({ x: p.x, y: p.y, r: p.big ? 12 : 8 });
      else if (p.t === "pond") out.push({ x: p.x, y: p.y, r: (p.r ?? 20) - 2 });
      else if (p.t === "fence") out.push({ x: p.x, y: p.y, r: 9 });
      else if (p.t === "shrine") out.push({ x: p.x, y: p.y, r: 16 });
      else if (p.t === "theater") out.push({ x: p.x, y: p.y - 4, r: 20 });
      else if (p.t === "gathering") out.push({ x: p.x, y: p.y - 2, r: 11 });
    }
    // solid décor you've placed on CIRQLSPACE — trees/rocks/bushes/fences/ponds (Phase B)
    if (this.ringIdx === 0 && !this.visiting) for (const d of this.decor) {
      const def = decorById[d.item]; const r = def?.render;
      if (!r || !DECOR_SOLID[r]) continue;
      const rad = r === "tree" ? (def!.big ? 13 : 10) : r === "stone" ? (def!.big ? 12 : 7) : r === "pond" ? 20 : r === "bush" ? 7 : 9;
      out.push({ x: d.x, y: d.y, r: rad });
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
    // ---- The Sunken Runes puzzle (CHR-258) ----
    if (p.t === "tablet") { this.openTablet(p); return; }
    if (p.t === "rune" && p.id) {
      const wasSolved = this.puzzleSolved();
      if (this.lit.has(p.id)) this.lit.delete(p.id); else this.lit.add(p.id);   // toggle
      this.onQuestChange?.();
      const nowSolved = this.puzzleSolved();
      if (nowSolved && !wasSolved) this.toast("The runes align — the shrine stirs.");
      else if (!nowSolved && wasSolved) this.toast("The shrine seals once more.");
      return;
    }
    if (p.t === "shrine") {
      if (this.puzzleSolved()) { this.advanceObjective("solvePuzzle"); this.toast("The shrine opens to you."); }
      else this.toast("Sealed. The runes must match the stone.");
      return;
    }
    if (p.t === "gathering") { this.toast("A good place to rest and meet fellow travellers."); return; }
    if (p.t === "theater") { const m = this.nowShowing(); this.dialog = { name: "Cirql Drive-In", accent: "#7fd0ff", i: 0, lines: [`Now showing: "${m.title}"`, m.tagline, "Pull up a bench and stay a while."] }; return; }
    if (p.t === "lantern" && p.id) { if (this.currentObjKind() === "lightLanterns" && !this.litForQuest.has(p.id)) { this.litForQuest.add(p.id); this.advanceObjective("lightLanterns"); this.onQuestChange?.(); } }
    else if (p.t === "wonders") { this.advanceObjective("enterWonders"); this.onInteract?.("wonders", p); }
    else if (p.t === "npc") { this.openNpcDialog(p); this.onInteract?.("npc", p); }
    else if (p.t === "dock") {
      const to = p.to ?? -1;
      if (to < 0) this.toast("Only open sea lies inward from the Hearth.");
      else { this.onInteract?.("dock", p); this.sailTo(to); }
    }
    else if (p.t === "portal") { if (typeof p.to === "number") this.sailTo(p.to); }
  }
  /** Is the current ring's rune puzzle solved (exactly the target runes lit)? */
  private puzzleSolved(): boolean {
    const target = this.curRing.puzzleTarget; if (!target || !target.length) return false;
    for (const p of this.curRing.props) if (p.t === "rune" && p.id) {
      const shouldBeLit = target.includes(p.id);
      if (this.lit.has(p.id) !== shouldBeLit) return false;
    }
    return true;
  }
  // Inspect the runestone: show the clue and, first time, grant the puzzle quest.
  private openTablet(p: Prop) {
    const q = questById("sunken-runes");
    const notTaken = !this.quests["sunken-runes"];
    this.dialog = {
      name: p.label || "Runestone", accent: "#b26cff", i: 0,
      lines: q ? q.intro : ["The carving has worn away."],
      acceptOnClose: notTaken ? "sunken-runes" : undefined,
    };
  }
  private openNpcDialog(p: Prop) {
    const npcId = p.id || "";
    const accent = p.accent || this.curRing.palette.accent;
    // an "interact" objective aimed at this NPC advances on talk
    this.advanceObjective("interact", npcId);
    // offer a fresh quest, or re-offer a finished one for a smaller reward (repeatable)
    const fresh = offerableQuest(npcId, this.quests);
    const offer = fresh || repeatableQuest(npcId, this.quests);
    if (offer) {
      const repeat = !fresh;
      this.dialog = { name: p.label || "Ferra", accent, i: 0, lines: repeat ? [...offer.intro, "— though you've done this before; the reward will be slighter."] : offer.intro, acceptOnClose: offer.id };
      return;
    }
    // otherwise a contextual greeting
    const active = this.activeQuest();
    const guide = npcId === "guide";           // Cirqla, on your CIRQLSPACE (CHR-269)
    const town = this.ringIdx === 1;
    const lines = guide
      ? ["Welcome to your CIRQLSPACE — this whole island is yours.", "Open your Inventory to build: place things, paint the ground, make it your own.", "When you're ready for quests, the arcade and the shops, sail south to the Town."]
      : active
        ? [`Off you go — ${active.name.toLowerCase()} awaits.`, "The glimmer marks your way."]
        : town
          ? ["Welcome to the Town, traveller.", "CirqlCade waits east; the onward dock lies south to the wilds."]
          : [`Safe travels on ${this.curRing.name}.`, "The onward dock lies to the south — the fog thins the farther you sail."];
    this.dialog = { name: p.label || "Ferra", accent, i: 0, lines };
  }

  // ---------- update ----------
  protected update(dt: number) {
    this.t += dt;
    this.msgT = Math.max(0, this.msgT - dt);
    this.arriveT = Math.max(0, this.arriveT - dt);
    // fake-Z hop physics (CHR-263) — always settles, independent of movement
    if (this.jumpZ > 0 || this.jumpVel !== 0) { this.jumpVel -= 260 * dt; this.jumpZ += this.jumpVel * dt; if (this.jumpZ <= 0) { this.jumpZ = 0; this.jumpVel = 0; } }

    // live remotes ease toward their last-known position + decay chat bubbles (runs
    // unconditionally so other travellers keep moving during your dialog / chart)
    this.myChatT = Math.max(0, this.myChatT - dt);
    this.myEmoteT = Math.max(0, this.myEmoteT - dt);
    for (const r of Array.from(this.remotes.values())) {
      const px = r.x, py = r.y;
      r.x += (r.tx - r.x) * Math.min(1, dt * 10);
      r.y += (r.ty - r.y) * Math.min(1, dt * 10);
      r.chatT = Math.max(0, r.chatT - dt);
      r.emoteT = Math.max(0, r.emoteT - dt);
      r.walk = (Math.abs(r.x - px) + Math.abs(r.y - py)) > 0.15 ? r.walk + dt * 10 : 0;
    }

    // pointer-down edge (tap detection, for the minimap → chart)
    const justDown = this.pointer.down && !this.pDownPrev; this.pDownPrev = this.pointer.down;

    // cutscene (CHR-264): freezes the world; a tap / E skips to the end. Remotes keep
    // animating (handled above) but the local player stays put.
    if (this.cs) {
      this.csAge += dt;
      if (this.csClosing > 0) {
        this.csClosing = Math.max(0, this.csClosing - dt);
        if (this.csClosing <= 0) this.endCutscene();
      } else if (justDown || this.pressed.a) {
        this.csClosing = 0.35;                 // skip → retract the letterbox, then end
      } else {
        this.csT += dt;
        const hold = this.csBeatDef()?.hold ?? BEAT_SECONDS;
        if (this.csT >= hold) {
          if (this.csBeat < this.cs.beats.length - 1) { this.csBeat++; this.csT = 0; }
          else this.csClosing = 0.45;          // last beat done → close
        }
      }
      return;
    }

    // sailing voyage (CHR-262): steer up-screen toward the far shore, gather light, land
    if (this.voyage) {
      const v = this.voyage; v.t += dt; v.wob += dt; v.wake += dt;
      if (justDown || this.pressed.a) { this.endVoyage(); return; }   // tap / E skips to the shore
      // steer laterally (joystick / arrows / drag)
      let steer = (this.btn.right ? 1 : 0) - (this.btn.left ? 1 : 0);
      if (this.pointer.down) steer += Math.max(-1, Math.min(1, ((this.pointer.x - this.LW / 2) / (this.LW * 0.36)) - v.bx)) * 1.2;
      v.bx = Math.max(-1, Math.min(1, v.bx + steer * dt * 1.9));
      const boost = (this.btn.up || this.btn.b) ? 1.75 : (this.btn.down ? 0.5 : 1);
      const fwd = 0.16 * boost;
      v.progress = Math.min(1, v.progress + dt * fwd);
      // drift the light down past the boat; gather what you steer through
      const boatN = 0.5 + v.bx * 0.36;
      for (const m of v.motes) {
        m.y += (fwd * 1.25 + m.vy) * dt;
        if (!m.got && Math.abs(m.y - 0.8) < 0.05 && Math.abs(m.x - boatN) < 0.06) { m.got = true; if (v.gathered < 6) { v.gathered++; this.fxRing(boatN * this.LW, 0.8 * this.LH, v.accent, 12); this.fxPop(boatN * this.LW, 0.74 * this.LH, "+✦", v.accent, 0.9); } }
        if (m.y > 1.08) { m.y = -0.08; m.x = ((m.x * 7.13 + v.t * 0.37) % 0.86) + 0.07; m.got = false; }   // recycle from the top
      }
      if (v.progress >= 1) { this.endVoyage(); return; }
      return;
    }

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

    // décor edit (CHR-259): a tap places the selected item / removes the nearest one
    const tapEdit = this.editDecor && justDown && !tapMap && !this.dialog;
    if (tapEdit) {
      const wx = this.pointer.x + this.camX, wy = this.pointer.y + this.camY;
      if (this.editSel) {
        const rr = Math.hypot(wx, wy), lim = this.curRing.radius * 0.82;
        let px = rr > lim ? (wx / rr) * lim : wx, py = rr > lim ? (wy / rr) * lim : wy;
        if (this.snapGrid) { px = Math.round(px / 20) * 20; py = Math.round(py / 20) * 20; }   // grid snap (CHR-273)
        if (this.decor.length < 120) { this.decor.push({ item: this.editSel, x: Math.round(px), y: Math.round(py) }); this.onDecorChange?.(); }
      } else {
        let bi = -1, bd = 22 * 22;
        for (let i = 0; i < this.decor.length; i++) { const dd = (this.decor[i].x - wx) ** 2 + (this.decor[i].y - wy) ** 2; if (dd < bd) { bd = dd; bi = i; } }
        if (bi >= 0) { this.decor.splice(bi, 1); this.onDecorChange?.(); }
      }
      this.moveTarget = null;
    }

    // movement is frozen while a dialog is open or the chart is up
    if (!this.dialog && !tapMap) {
      if (this.pointer.down && !this.inMinimap(this.pointer.x, this.pointer.y) && !this.editDecor) this.moveTarget = { x: this.pointer.x + this.camX, y: this.pointer.y + this.camY };
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
        const puzzle = p.t === "rune" || p.t === "tablet" || p.t === "shrine";
        const social = p.t === "gathering" || p.t === "theater";
        if (p.t !== "wonders" && p.t !== "npc" && p.t !== "dock" && p.t !== "portal" && !isQL && !puzzle && !social) continue;
        const d = Math.hypot(this.posX - p.x, this.posY - p.y);
        const range = p.r ?? (isQL || p.t === "rune" ? 26 : 40);
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

    // party shared-waypoint arrival — fires once per step, only when the waypoint is the
    // real target (not a cross-ring dock hint); server is idempotent per step
    if (this.partyWp && this.partyAdvanceable && !this.partyArrived && Math.hypot(this.posX - this.partyWp.x, this.posY - this.partyWp.y) < 26) {
      this.partyArrived = true; this.onPartyArrive?.();
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
    if (this.voyage) { this.drawVoyage(); this.drawFx(); return; }   // the sailing crossing owns the screen
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

    // ground decoration — paths + ponds, under the depth-sorted props
    for (const p of this.curRing.props) if (p.t === "path") this.drawPath(p.x - camX, p.y - camY);
    for (const p of this.curRing.props) if (p.t === "pond") this.drawPond(p.x - camX, p.y - camY, p.r ?? 22);
    // ground-layer décor (paths walk on, ponds walk around) — CIRQLSPACE only (Phase B)
    if (this.ringIdx === 0) for (const d of (this.visiting ? this.visiting.decor : this.decor)) {
      const r = decorById[d.item]?.render;
      if (r === "path") this.drawPath(d.x - camX, d.y - camY);
      else if (r === "pond") this.drawPond(d.x - camX, d.y - camY, 22);
    }

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
        case "tree": draws.push({ y: p.y, f: () => this.drawTree(sxp, syp, p.big, this.treeKind(p.x, p.y)) }); break;
        case "bush": draws.push({ y: p.y, f: () => this.drawBush(sxp, syp) }); break;
        case "crystal": draws.push({ y: p.y, f: () => this.drawCrystal(sxp, syp, p.big, p.accent || pal.accent) }); break;
        case "rock": draws.push({ y: p.y, f: () => this.drawRock(sxp, syp, p.big) }); break;
        case "flower": draws.push({ y: p.y, f: () => this.drawFlower(sxp, syp, p.accent || "#ff8fbf") }); break;
        case "fence": draws.push({ y: p.y, f: () => this.drawFence(sxp, syp, !!p.vert) }); break;
        case "lantern": { const isQ = !!p.id && this.currentObjKind() === "lightLanterns"; const litState = isQ ? this.litForQuest.has(p.id!) : true; draws.push({ y: p.y, f: () => this.drawLantern(sxp, syp, pal.accent, litState) }); break; }
        case "dock": draws.push({ y: p.y - 40, f: () => this.drawDock(sxp, syp, p) }); break;
        case "portal": draws.push({ y: p.y, f: () => this.drawPortal(sxp, syp, p) }); break;
        case "tablet": draws.push({ y: p.y, f: () => this.drawTablet(sxp, syp, this.near === p) }); break;
        case "rune": { const rl = !!p.id && this.lit.has(p.id); const rn = this.near === p; draws.push({ y: p.y, f: () => this.drawRune(sxp, syp, rl, rn) }); break; }
        case "shrine": draws.push({ y: p.y + 8, f: () => this.drawShrine(sxp, syp, this.puzzleSolved()) }); break;
        case "gathering": draws.push({ y: p.y, f: () => this.drawGathering(sxp, syp, p) }); break;
        case "theater": draws.push({ y: p.y + 6, f: () => this.drawTheater(sxp, syp, p) }); break;
        case "marker": { const isTarget = this.objTargetProp() === p; if (isTarget) draws.push({ y: p.y - 1, f: () => this.drawMarker(sxp, syp) }); break; }
        default: break;
      }
    }
    // Hearth décor (CHR-259) — your placed pieces, or the host's while visiting (Hearth only)
    if (this.ringIdx === 0) {
      const list = this.visiting ? this.visiting.decor : this.decor;
      const pacc = this.curRing.palette.accent;
      for (const d of list) {
        const def = decorById[d.item]; if (!def) continue;
        const sx = d.x - camX, sy = d.y - camY, r = def.render ?? "glyph";
        if (r === "path" || r === "pond") continue;                                             // ground pass
        else if (r === "stone") draws.push({ y: d.y, f: () => this.drawRock(sx, sy, def.big) });
        else if (r === "fence") draws.push({ y: d.y, f: () => this.drawFence(sx, sy, false) });
        else if (r === "tree") draws.push({ y: d.y, f: () => this.drawTree(sx, sy, def.big, this.treeKind(d.x, d.y)) });
        else if (r === "bush") draws.push({ y: d.y, f: () => this.drawBush(sx, sy) });
        else if (r === "flower") draws.push({ y: d.y, f: () => this.drawFlower(sx, sy, def.accent || "#ff8fbf") });
        else if (r === "lantern") draws.push({ y: d.y, f: () => this.drawLantern(sx, sy, def.accent || pacc, true) });
        else if (r === "crystal") draws.push({ y: d.y, f: () => this.drawCrystal(sx, sy, def.big, def.accent || pacc) });
        else draws.push({ y: d.y, f: () => this.drawDecor(sx, sy, def.glyph, def.scale ?? 1) });
      }
    }
    // the player
    draws.push({ y: this.posY, f: () => this.drawHero(this.posX - camX, this.posY - camY) });
    // live remote travellers (depth-sorted in with everything else)
    for (const [rid, r] of Array.from(this.remotes.entries())) draws.push({ y: r.y, f: () => this.drawRemote(r.x - camX, r.y - camY, r, this.partyIds.has(rid)) });
    draws.sort((a, c) => a.y - c.y);
    for (const d of draws) d.f();

    // décor placement ghost — a translucent preview under the pointer while editing
    if (this.editDecor && this.editSel && this.pointer.down) {
      const def = decorById[this.editSel];
      if (def) this.drawDecor(this.pointer.x, this.pointer.y, def.glyph, def.scale ?? 1, 0.55);
    }

    // quest waypoint — a bouncing chevron over the current objective target
    const wp = this.objTargetProp();
    if (wp) { const bob = this.reduce ? 0 : Math.round(Math.sin(this.t * 4) * 2); this.drawWaypoint(wp.x - camX, wp.y - camY - 22 + bob); }
    // party shared waypoint — a teal beacon the whole crew moves toward
    if (this.partyWp) {
      const bob = this.reduce ? 0 : Math.round(Math.sin(this.t * 3.5) * 2);
      const px = this.partyWp.x - camX, py = this.partyWp.y - camY;
      this.glow(px, py, 16, "#35e0d0", this.reduce ? 0.3 : 0.24 + 0.12 * Math.sin(this.t * 3));
      this.ring(px, py, this.reduce ? 8 : 7 + Math.sin(this.t * 3) * 1.5, "#35e0d0", 1.3);
      this.drawPartyWaypoint(px, py - 24 + bob);
    }

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
    this.drawAmbient();
    if (this.mapOpen) this.drawChart(); else if (!this.cs) this.drawHud();
    if (this.cs) this.drawCutscene();
  }

  // ---------- cutscene (CHR-264) ----------
  // A letterboxed, skippable set-piece: bars slide in, a soft per-beat effect plays
  // behind smooth-text (title / sub / body) that fades in and out, and a "tap to skip"
  // hint sits in the lower bar. All drawn over the frozen world.
  private drawCutscene() {
    const b = this.cs?.beats[this.csBeat]; if (!b) return;
    this.ui.length = 0;                        // drop world labels queued this frame — scene text only
    const W = this.LW, H = this.LH;
    // letterbox envelope: opens over ~0.45s, retracts while closing
    const env = this.csClosing > 0 ? Math.min(1, this.csClosing / 0.4) : Math.min(1, this.csAge / 0.45);
    const barH = Math.round(H * 0.15 * env);
    // dim the world a touch under the scene
    this.b.globalAlpha = 0.42 * env; this.rect(0, 0, W, H, "#05060f"); this.b.globalAlpha = 1;
    // per-beat text fade (in over 0.4s, out over the last 0.4s of the beat; gone while closing)
    const hold = b.hold ?? BEAT_SECONDS;
    const tf = this.csClosing > 0 ? Math.min(1, this.csClosing / 0.3)
      : Math.min(1, this.csT / 0.4) * Math.min(1, (hold - this.csT) / 0.4 + 0.001);
    const textA = Math.max(0, Math.min(1, tf));
    const accent = b.accent || this.curRing.palette.accent;
    if (barH > 0) this.drawCutsceneFx(b.fx ?? "none", accent, textA);
    // cinematic bars
    this.rect(0, 0, W, barH, "#05060f");
    this.rect(0, H - barH, W, barH, "#05060f");
    this.rect(0, barH, W, 1, hexA(accent, 0.5 * env));
    this.rect(0, H - barH - 1, W, 1, hexA(accent, 0.5 * env));
    // text block, centred
    let cy = Math.round(H * 0.44);
    if (b.title) { this.q(W / 2, cy, b.title, "#f4f9ff", 1.7, "c", true, textA); cy += 15; }
    if (b.sub) { this.q(W / 2, cy, b.sub, accent, 0.95, "c", false, textA); cy += 12; }
    if (b.body) { for (const ln of this.wrapText(b.body, 30).slice(0, 3)) { this.q(W / 2, cy, ln, "#d7e4f5", 1.0, "c", false, textA); cy += 10; } }
    // beat progress pips + skip hint in the lower bar
    if (env > 0.6 && (this.cs?.beats.length ?? 0) > 1) {
      const n = this.cs!.beats.length, pw = 5, gap = 3, tot = n * pw + (n - 1) * gap, x0 = Math.round((W - tot) / 2), py = H - Math.round(barH / 2);
      for (let i = 0; i < n; i++) this.rect(x0 + i * (pw + gap), py, pw, 1.5, hexA(i <= this.csBeat ? accent : "#6a7590", 0.9));
    }
    if (env > 0.8 && this.csClosing <= 0) this.q(W - 6, H - 8, "tap to skip", "#7d88a8", 0.82, "r", false, 0.75);
  }
  private drawCutsceneFx(fx: CutsceneFx, accent: string, a: number) {
    if (this.reduce || a <= 0 || fx === "none") return;
    const W = this.LW, H = this.LH, cx = W / 2, cy = H * 0.42, t = this.t;
    switch (fx) {
      case "fog": {   // pale bands drifting sideways then thinning away
        for (let i = 0; i < 5; i++) { const fy = H * (0.2 + i * 0.14), off = ((t * (10 + i * 4)) % (W + 80)) - 40; this.b.globalAlpha = a * 0.14; this.disc((off + cx * 0.2) % W, fy, 26 - i * 2, "#cdd8ec"); }
        this.b.globalAlpha = 1; break;
      }
      case "bloom": {   // a swelling ring of light behind the name
        const r = 10 + (t * 18) % 60; this.b.globalAlpha = a * 0.5; this.ring(cx, cy, r, accent, 1.4); this.glow(cx, cy, 46, accent, a * 0.22); this.b.globalAlpha = 1; break;
      }
      case "sparks": {   // slow rising motes
        for (let i = 0; i < 16; i++) { const sx = cx + Math.sin(i * 2.3) * W * 0.4, sy = H - ((t * 22 + i * 40) % (H * 0.9)); this.b.globalAlpha = a * (0.3 + 0.3 * Math.sin(t * 2 + i)); this.disc(sx, sy, 1 + (i % 2), accent); } this.b.globalAlpha = 1; break;
      }
      case "aurora": {   // a soft violet/teal sweep across the top third
        for (let i = 0; i < 3; i++) { const ay = H * 0.24 + Math.sin(t * 0.8 + i) * 8; this.b.globalAlpha = a * 0.12; this.rect(0, ay + i * 4, W, 3, i === 1 ? "#8be0d6" : accent); } this.b.globalAlpha = 1; break;
      }
      case "celebrate": {   // confetti of accent + gold falling
        for (let i = 0; i < 22; i++) { const px = (i * 53 + (t * 30 % W)) % W, py = ((t * (34 + i % 5 * 6) + i * 30) % H); this.b.globalAlpha = a * 0.85; this.rect(px, py, 2, 2, i % 3 === 0 ? "#ffd98a" : i % 3 === 1 ? accent : "#7ff5e8"); } this.b.globalAlpha = 1; break;
      }
      case "dawn": {   // a warm horizon glow rising
        this.b.globalAlpha = a * 0.3; this.glow(cx, H * 0.62, 70, "#ffb765", a * 0.28); this.rect(0, H * 0.6, W, 1, hexA("#ffd98a", a * 0.4)); this.b.globalAlpha = 1; break;
      }
    }
  }

  // ---------- sailing voyage render (CHR-262) ----------
  private drawVoyage() {
    const v = this.voyage!; const W = this.LW, H = this.LH, s = this.SS, b = this.b, ac = v.accent, grow = v.progress;
    // open-sea backdrop
    const g = b.createLinearGradient(0, 0, 0, H * s);
    g.addColorStop(0, "#0a1836"); g.addColorStop(0.55, "#0e2b52"); g.addColorStop(1, "#123a63");
    b.fillStyle = g; b.fillRect(0, 0, W * s, H * s);
    // scrolling swell lines (forward motion)
    if (!this.reduce) {
      b.strokeStyle = "rgba(150,210,255,0.13)"; b.lineWidth = 1 * s;
      for (let i = 0; i < 9; i++) {
        const y = ((i / 9 + v.t * 0.4) % 1) * H, amp = 2 + i * 0.4;
        b.beginPath();
        for (let x = 0; x <= W; x += 8) { const yy = (y + Math.sin(x * 0.08 + v.t * 2 + i) * amp) * s; if (x === 0) b.moveTo(0, yy); else b.lineTo(x * s, yy); }
        b.stroke();
      }
    }
    // destination land growing at the top
    const landY = H * (0.30 - grow * 0.05), landR = 14 + grow * 46;
    this.glow(W / 2, landY, landR * 1.6, ac, 0.14 + grow * 0.18);
    this.disc(W / 2, landY + landR * 0.15, landR, "#123a2f");
    this.disc(W / 2, landY - landR * 0.15, landR * 0.82, "#1c5540");
    for (let i = 0; i < 3; i++) { const lx = W / 2 + (i - 1) * landR * 0.5; this.disc(lx, landY - landR * 0.1, 1.6, ac); }   // shore lanterns
    // fog veil over the far water, thinning as you approach
    b.fillStyle = hexA("#dfeaff", (1 - grow) * 0.5); b.fillRect(0, 0, W * s, H * 0.44 * s);
    // drifting light to gather
    for (const m of v.motes) if (!m.got) { const mx = m.x * W, my = m.y * H; this.glow(mx, my, 6, ac, 0.5); this.disc(mx, my, 1.6, "#fff7d8"); }
    // your boat + wake
    const boatX = W / 2 + v.bx * (W * 0.36), boatY = H * 0.8 + (this.reduce ? 0 : Math.sin(v.wob * 3) * 1.5);
    if (!this.reduce) for (let i = 1; i <= 5; i++) { const wy = boatY + i * 4, sp = i * 1.6; b.fillStyle = hexA("#bfe6ff", 0.16 * (1 - i / 6)); b.fillRect((boatX - sp) * s, wy * s, 1 * s, 1 * s); b.fillRect((boatX + sp) * s, wy * s, 1 * s, 1 * s); }
    this.drawBoat(boatX, boatY, ac);
    // HUD (crisp overlay text)
    this.q(W / 2, this.itop() + 6, `Sailing to ${v.destName}`, "#eaf6ff", 1.2, "c", true);
    const pw = W * 0.5, px = (W - pw) / 2, py = this.itop() + 18;
    this.rect(px, py, pw, 2, "#0a0714aa"); this.rect(px, py, pw * grow, 2, ac);
    if (v.gathered > 0) this.q(W / 2, py + 5, `✦ ${v.gathered} light gathered`, ac, 0.92, "c");
    this.q(W / 2, H - this.ibot() - 12, "steer with the stick · tap to skip", "#9fb0d0", 0.82, "c", false, 0.72);
  }
  private drawBoat(cx: number, cy: number, accent: string) {
    // hull (little wooden dinghy, viewed from behind)
    this.disc(cx, cy, 5, "#0a071450");
    this.rect(cx - 6, cy - 1, 12, 4, "#7a4a2a"); this.rect(cx - 5, cy - 2, 10, 1, "#9a6238");
    this.rect(cx - 4, cy + 3, 8, 1, "#5a3620");
    // mast + sail (accent, catching the wind)
    this.rect(cx - 0.5, cy - 12, 1, 11, "#e8dcc4");
    const b = this.b, s = this.SS;
    b.fillStyle = accent; b.beginPath();
    b.moveTo(cx * s, (cy - 12) * s); b.lineTo((cx + 7) * s, (cy - 3) * s); b.lineTo(cx * s, (cy - 2) * s); b.closePath(); b.fill();
    b.fillStyle = hexA("#ffffff", 0.25); b.beginPath();
    b.moveTo(cx * s, (cy - 12) * s); b.lineTo((cx + 3) * s, (cy - 6) * s); b.lineTo(cx * s, (cy - 5) * s); b.closePath(); b.fill();
    this.glow(cx, cy - 6, 12, accent, this.reduce ? 0.25 : 0.2 + 0.08 * Math.sin(this.t * 3));
  }

  // ---------- props ----------
  private drawHero(cx: number, cy: number) {
    const walkBob = this.walk > 0 ? Math.round(Math.sin(this.walk)) : 0;
    const z = Math.round(this.jumpZ);
    const bob = walkBob + this.emoteBob(this.myEmoteT > 0 ? this.myEmote : "") - z;
    // aura glow (cosmetic) behind the figure
    const aura = this.hero.aura && AURA_COLORS[this.hero.aura];
    if (aura) this.glow(cx, cy - 12 - z, 20, aura, this.reduce ? 0.4 : 0.32 + 0.1 * Math.sin(this.t * 2.5));
    this.disc(cx, cy + 2, Math.max(2, 4 - this.jumpZ * 0.16), "#0a071460");   // grounded shadow shrinks as you rise
    this.ring(cx, cy + 2, 6, "#35e0d0", 1.1);       // gentle "you" ring (grounded)
    this.avatar(cx, cy + bob, this.hero, this.facing);
    this.nameTag(cx, cy, this.myName, "#ffd24a");
    if (this.myEmoteT > 0 && this.myEmote) this.drawEmote(cx, cy, this.myEmote, this.myEmoteT);
    if (this.myChatT > 0 && this.myChat) this.drawBubble(cx, cy, this.myChat, this.myChatT);
  }
  private drawRemote(cx: number, cy: number, r: RemotePlayer, inParty = false) {
    const bob = (r.walk > 0 ? Math.round(Math.sin(r.walk)) : 0) + this.emoteBob(r.emoteT > 0 ? r.emote : "");
    const aura = r.avatar.aura && AURA_COLORS[r.avatar.aura];
    if (aura) this.glow(cx, cy - 12, 18, aura, this.reduce ? 0.34 : 0.26);
    this.disc(cx, cy + 2, 4, "#0a071460");
    if (inParty) { this.glow(cx, cy + 2, 12, "#35e0d0", 0.3); this.ring(cx, cy + 2, 7, "#35e0d0", 1.2); }  // party-mate
    const share = this.nearPlayer?.id && this.remotes.get(this.nearPlayer.id) === r;
    if (share) this.ring(cx, cy + 2, 6, "#ffc46b", 1.1);          // highlight the "share a light" target
    this.avatar(cx, cy + bob, r.avatar, r.facing);
    this.nameTag(cx, cy, r.name, inParty ? "#a8f5ea" : "#dfe6ff");
    if (r.emoteT > 0 && r.emote) this.drawEmote(cx, cy, r.emote, r.emoteT);
    if (r.chatT > 0 && r.chat) this.drawBubble(cx, cy, r.chat, r.chatT);
  }
  // A small avatar movement while an emote plays: a dance bounce, a settle-to-sit, or a
  // celebratory hop. Glyph-only emotes return 0. Reduced-motion keeps everyone still.
  private emoteBob(emote: string): number {
    if (!emote || this.reduce) return 0;
    const m = EMOTE_BY_ID[emote]?.motion;
    if (m === "bob") return -Math.abs(Math.round(Math.sin(this.t * 9) * 2));   // dance/sing bounce
    if (m === "hop") { const j = Math.sin(this.t * 6); return j > 0 ? -Math.round(j * 5) : 0; }   // wave/celebrate/flip
    if (m === "sit") return 3;                                                  // settle down to rest
    return 0;
  }
  // A placed décor piece (CHR-259): an emoji glyph standing on a soft shadow.
  private drawDecor(cx: number, cy: number, glyph: string, scale: number, alpha = 1) {
    this.disc(cx, cy + 5, 4 * scale, hexA("#0a0714", 0.38 * alpha));
    this.q(cx, cy - 8 * scale, glyph, "#ffffff", 1.6 * scale, "c", false, alpha);
  }
  // A timed emote glyph that pops in, drifts up and fades over the avatar (CHR-260).
  private drawEmote(cx: number, feet: number, emote: string, life: number) {
    const def = EMOTE_BY_ID[emote]; if (!def) return;
    const total = def.hold ?? EMOTE_SECONDS;
    const age = total - life;
    const rise = this.reduce ? 8 : Math.min(11, age * 7);
    const a = life < 0.6 ? life / 0.6 : (age < 0.22 ? age / 0.22 : 1);   // fade in then out
    const y = feet - 44 - rise;
    this.b.globalAlpha = a * 0.85;
    this.disc(cx, y + 5, 8, "#0a0714");           // soft backing so the glyph reads over any scene
    this.b.globalAlpha = 1;
    this.q(cx, y - 4, def.glyph, "#ffffff", 1.95, "c", false, a);
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
  // tree kind from a stable hash of world position → a mix of shapes per ring (CHR-259)
  private treeKind(x: number, y: number): "round" | "pine" {
    return ((Math.abs(x * 3 + y * 7) | 0) % 10) < 3 ? "pine" : "round";
  }
  private triY(cx: number, apexY: number, halfW: number, h: number, color: string) {
    const b = this.b, s = this.SS;
    b.fillStyle = color; b.beginPath();
    b.moveTo(cx * s, apexY * s); b.lineTo((cx - halfW) * s, (apexY + h) * s); b.lineTo((cx + halfW) * s, (apexY + h) * s); b.closePath(); b.fill();
  }
  private drawTree(cx: number, cy: number, big?: boolean, kind: "round" | "pine" = "round") {
    const s = big ? 1.4 : 1, pal = this.curRing.palette;
    this.disc(cx, cy + 2, 6 * s, "#0a071440");
    if (kind === "pine") {
      this.rect(cx - 1.5, cy - 6 * s, 3, 8 * s, "#4a3420");                        // trunk
      for (let i = 0; i < 3; i++) this.triY(cx, cy - 12 * s - i * 6 * s, (9 - i * 2.5) * s, 9 * s, i === 2 ? "#3e6d52" : pal.grass);
    } else {
      this.rect(cx - 2, cy - 8 * s, 4, 10 * s, "#3a2a1e");
      for (let i = 0; i < 3; i++) this.disc(cx, cy - 14 * s - i * 5 * s, (11 - i * 2) * s, i === 0 ? "#356149" : pal.grass);
      this.disc(cx - 3 * s, cy - 20 * s, 3 * s, "#3e6d52");                         // highlight
    }
  }
  private drawCrystal(cx: number, cy: number, big: boolean | undefined, c: string) {
    const s = big ? 1.35 : 1;
    this.disc(cx, cy + 2, 5 * s, "#0a071440");
    this.glow(cx, cy - 6 * s, 16 * s, c, this.reduce ? 0.35 : 0.28 + 0.12 * Math.sin(this.t * 1.7 + cx));
    // faceted shard
    this.rect(cx - 2 * s, cy - 6 * s, 4 * s, 8 * s, c);
    this.rect(cx - 1 * s, cy - 12 * s, 2 * s, 8 * s, c);
    this.rect(cx - 1 * s, cy - 6 * s, 1, 6 * s, "#ffffff");
    if (big) { this.rect(cx + 3 * s, cy - 3 * s, 2 * s, 5 * s, c); this.rect(cx - 5 * s, cy - 2 * s, 2 * s, 4 * s, c); }
  }
  // ---- landscape: rocks + ponds ----
  private drawRock(cx: number, cy: number, big?: boolean) {
    const s = big ? 1.5 : 1;
    this.disc(cx, cy + 2, 6 * s, "#0a071440");
    this.disc(cx, cy - 2 * s, 6 * s, "#565663");
    this.disc(cx - 2 * s, cy - 1 * s, 4 * s, "#6a6a77");
    this.disc(cx + 2 * s, cy, 3.5 * s, "#474753");
    this.rect(cx - 6 * s, cy + 1 * s, 12 * s, 2 * s, "#38384352");
    this.disc(cx - 2 * s, cy - 4 * s, 1.5 * s, "#8a8a97");   // highlight
  }
  private drawFlower(cx: number, cy: number, c: string) {
    // stem + a little leaf, then a rounded 5-petal bloom + centre (reads as a flower,
    // not a jewel — CHR-259 landscape pass)
    this.rect(cx, cy - 4, 1, 5, "#3a6a34");
    this.disc(cx - 1.5, cy - 1, 1.1, "#4c8a46");            // leaf
    const R = 2.1;
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * (TAU / 5); this.disc(cx + Math.cos(a) * R, cy - 5 + Math.sin(a) * R, 1.5, c); }
    this.disc(cx, cy - 5, 1.3, "#ffe58a");                  // centre
  }
  private drawBush(cx: number, cy: number) {
    const g = this.curRing.palette.grass;
    this.disc(cx, cy + 2, 7, "#0a071438");
    this.disc(cx - 3.5, cy - 1, 4.2, "#2e5638"); this.disc(cx + 3.5, cy - 1, 4.2, "#2e5638");
    this.disc(cx, cy - 3.5, 5, g); this.disc(cx - 3, cy - 1, 3.4, g); this.disc(cx + 3, cy - 1, 3.4, g);
    this.disc(cx - 1.5, cy - 4.5, 1.6, "#6fbf7a");          // highlight
  }
  private drawFence(cx: number, cy: number, vert: boolean) {
    this.disc(cx, cy + 2, 5, "#0a071430");
    if (vert) {
      for (let i = -1; i <= 1; i++) { const py = cy + i * 7; this.rect(cx - 1, py - 5, 2, 10, "#7a5a38"); this.rect(cx - 1, py - 5, 2, 2, "#96703f"); }   // posts
      this.rect(cx - 4, cy - 11, 1.5, 22, "#8a663f"); this.rect(cx + 2.5, cy - 11, 1.5, 22, "#8a663f");   // vertical rails
    } else {
      for (let i = -1; i <= 1; i++) { const px = cx + i * 8; this.rect(px - 1, cy - 8, 2, 12, "#7a5a38"); this.rect(px - 1, cy - 8, 2, 2, "#96703f"); }   // posts
      this.rect(cx - 9, cy - 6, 18, 1.5, "#8a663f"); this.rect(cx - 9, cy - 1, 18, 1.5, "#8a663f");   // rails
    }
  }
  private drawPath(cx: number, cy: number) {
    const b = this.b, s = this.SS;
    b.fillStyle = "rgba(90,72,46,0.5)"; b.beginPath(); b.ellipse(cx * s, cy * s, 16 * s, 9 * s, 0, 0, TAU); b.fill();
    b.fillStyle = "rgba(120,98,64,0.4)"; b.beginPath(); b.ellipse(cx * s, cy * s, 12 * s, 6 * s, 0, 0, TAU); b.fill();
  }
  private drawPond(cx: number, cy: number, r: number) {
    const sea = this.curRing.palette.sea;
    this.fillCirc(cx, cy + 2, r, "rgba(10,15,30,0.35)");     // damp rim shadow
    this.fillCirc(cx, cy, r, "rgba(70,120,150,0.55)");       // shallow water
    this.fillCirc(cx, cy, r - 3, sea);                        // deeper centre
    if (!this.reduce) for (let i = 0; i < 3; i++) { const yy = cy - r * 0.4 + i * r * 0.4; this.rect(cx - r * 0.4, yy + Math.sin(this.t * 2 + i) * 1, r * 0.8, 1, "rgba(255,255,255,0.14)"); }  // shimmer
    for (let i = 0; i < 8; i++) { const a = i * (TAU / 8); this.disc(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9, 1.6, "#4a4a52"); }   // rim stones
    // water's edge: reeds, grass tufts + the odd flower fringe the rim (CHR-259)
    const g = this.curRing.palette.grass;
    for (let i = 0; i < 11; i++) {
      const a = i * (TAU / 11) + (Math.abs(cx) % 5) * 0.13;
      const ex = cx + Math.cos(a) * (r + 1), ey = cy + Math.sin(a) * (r * 0.9 + 1);
      const k = (i * 7 + (Math.abs(cx) | 0)) % 5;
      if (k === 0) { this.rect(ex, ey - 7, 1, 7, "#3f6f36"); this.rect(ex - 0.5, ey - 8, 2, 2, "#8a6a2e"); }      // cattail reed
      else if (k === 1) this.drawFlower(ex, ey, i % 2 ? "#ff8fbf" : "#ffd24a");                                    // a bloom
      else { this.rect(ex - 1, ey - 3, 1, 4, g); this.rect(ex + 1, ey - 2, 1, 3, g); this.rect(ex, ey - 4, 1, 5, g); }   // grass tuft
    }
  }

  // ---- drifting ambient life, per biome (WORLD-space — stays put in the world, each
  //      creature moves in its own way; count scales with the island's size) ----
  private drawAmbient() {
    const kind = this.curRing.ambient; if (!kind || this.reduce) return;
    const camX = this.camX, camY = this.camY, R = this.curRing.radius, t = this.t, W = this.LW, H = this.LH;
    const bases: Record<string, number> = { snow: 16, ember: 12, dust: 10, firefly: 7, grasshopper: 9, bee: 9, dragonfly: 7, gull: 4, butterfly: 10 };
    const N = Math.max(bases[kind] ?? 8, Math.min(36, Math.round((bases[kind] ?? 8) * (R / 460))));
    const cols = ["#ffd24a", "#ff8fbf", "#8fd0ff", "#b6ff9c", "#e0a0ff"];
    for (let i = 0; i < N; i++) {
      // a deterministic world anchor spread across the island (stays with the ground)
      const h = this.ringIdx * 131 + i * 977 + 17;
      const ang = (h % 6283) / 1000, rad = R * (0.1 + ((h >> 3) % 82) / 100);
      let fx = Math.cos(ang) * rad, fy = Math.sin(ang) * rad;   // final world position
      let render: ((sx: number, sy: number) => void) | null = null;
      if (kind === "butterfly") {
        fx += Math.sin(t * 0.7 + i) * 24 + Math.sin(t * 1.9 + i * 2) * 8;
        fy += Math.cos(t * 0.6 + i * 1.3) * 18 + Math.cos(t * 2.1 + i) * 6;
        const c = cols[i % cols.length]; render = (sx, sy) => this.drawButterfly(sx, sy, t * 1.6 + i, c);
      } else if (kind === "bee") {
        fx += Math.sin(t * 2.6 + i) * 12 + Math.sin(t * 6.5 + i * 3) * 5;   // fast tight zigzag
        fy += Math.cos(t * 2.3 + i * 1.7) * 9 + Math.cos(t * 7.1 + i) * 4;
        render = (sx, sy) => this.drawBee(sx, sy, t);
      } else if (kind === "dragonfly") {
        const seg = Math.floor(t * 0.55 + i * 1.3), lt = (t * 0.55 + i * 1.3) - seg;   // hover, then dart
        const dartA = seg * 2.4 + i * 1.9, dist = lt < 0.35 ? 0 : (lt - 0.35) / 0.65 * 46;
        fx += Math.cos(dartA) * dist + Math.sin(t * 9 + i) * 1.5;
        fy += Math.sin(dartA) * dist + Math.cos(t * 9 + i) * 1.5;
        render = (sx, sy) => this.drawDragonfly(sx, sy, t, dartA);
      } else if (kind === "grasshopper") {
        const cyc = 2.2 + (i % 4) * 0.5, prog = (t + i * 0.9) / cyc, hopN = Math.floor(prog), ph = prog - hopN;
        const ra = hopN * 1.7 + i * 2.1, ra2 = (hopN + 1) * 1.7 + i * 2.1;
        let gx = Math.cos(ra) * 16, gy = Math.sin(ra) * 9; let jumping = false;
        if (ph > 0.72) { const jt = (ph - 0.72) / 0.28; jumping = true;   // arc-hop to the next rest spot
          gx = Math.cos(ra) * 16 + (Math.cos(ra2) * 16 - Math.cos(ra) * 16) * jt;
          gy = Math.sin(ra) * 9 + (Math.sin(ra2) * 9 - Math.sin(ra) * 9) * jt - Math.sin(jt * Math.PI) * 20;
        }
        fx += gx; fy += gy; render = (sx, sy) => this.drawGrasshopper(sx, sy, jumping);
      } else if (kind === "firefly") {
        fx += Math.sin(t * 0.5 + i * 2.1) * 22 + Math.sin(t * 0.9 + i) * 8;
        fy += Math.cos(t * 0.43 + i * 1.7) * 18 + Math.cos(t * 1.1 + i * 2) * 7;
        const bl = Math.sin(t * 2.6 + i * 1.9); if (bl > 0.15) render = (sx, sy) => { this.glow(sx, sy, 5, "#c8ff9a", bl * 0.5); this.disc(sx, sy, 1, "#eaffcf"); };
      } else if (kind === "gull") {
        fx = ((t * 26 + i * 260) % (R * 2.6)) - R * 1.3;   // glide across
        fy = -R * 0.55 + i * 46 + Math.sin(t * 0.8 + i) * 12;
        render = (sx, sy) => this.drawGull(sx, sy, t * 5 + i);
      } else if (kind === "snow") {
        fx += Math.sin(t * 0.6 + i) * 12; fy = ((t * 34 + h) % (R * 2)) - R;   // fall
        render = (sx, sy) => this.disc(sx, sy, 1 + (i % 2) * 0.5, "rgba(230,244,255,0.85)");
      } else if (kind === "ember") {
        fx += Math.sin(t * 1.1 + i) * 8; fy = R - ((t * 40 + h) % (R * 2));   // rise
        const a = Math.max(0, (fy + R) / (R * 2)) * 0.8; render = (sx, sy) => this.disc(sx, sy, 1 + (i % 2), hexA("#ff8c3c", a));
      } else if (kind === "dust") {
        fx = ((t * 30 + i * 90 + h) % (R * 2.4)) - R * 1.2; fy += Math.sin(t * 0.9 + i) * 6;   // low drift
        render = (sx, sy) => this.disc(sx, sy, 1, "rgba(230,200,140,0.3)");
      }
      const sx = fx - camX, sy = fy - camY;
      if (render && sx > -30 && sx < W + 30 && sy > -30 && sy < H + 30) render(sx, sy);
    }
  }
  private drawButterfly(x: number, y: number, ph: number, color: string) {
    x = Math.round(x); y = Math.round(y);
    const w = 2 + Math.abs(Math.sin(ph * 8)) * 1.6;
    this.rect(x, y - 2, 1, 4, "#241a1a");                    // body
    this.disc(x - w, y - 1, 1.6, color); this.disc(x + w, y - 1, 1.6, color);
    this.disc(x - w * 0.7, y + 1, 1.2, color); this.disc(x + w * 0.7, y + 1, 1.2, color);
  }
  private drawBee(x: number, y: number, t: number) {
    x = Math.round(x); y = Math.round(y);
    this.disc(x - 2, y - 1, 1.5, "rgba(232,240,255,0.5)"); this.disc(x + 2, y - 1, 1.5, "rgba(232,240,255,0.5)");   // wing blur
    this.disc(x, y, 2, "#ffcf3a");                          // body
    this.rect(x - 1, y - 1, 2, 1, "#241a08"); this.rect(x - 1, y + 1, 2, 1, "#241a08");   // stripes
  }
  private drawDragonfly(x: number, y: number, t: number, ang: number) {
    x = Math.round(x); y = Math.round(y);
    const dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx;
    for (let k = 1; k <= 4; k++) this.px(Math.round(x - dx * k), Math.round(y - dy * k), k < 2 ? "#7fffe6" : "#3ad0c0");   // slender tail
    this.disc(x, y, 1.4, "#aefff2");                        // head
    const wf = Math.abs(Math.sin(t * 22)) * 1.4 + 1.4;      // 4 blurring wings
    this.disc(x + px * wf, y + py * wf, 1.3, "rgba(200,255,245,0.5)"); this.disc(x - px * wf, y - py * wf, 1.3, "rgba(200,255,245,0.5)");
    this.disc(x - dx + px * wf, y - dy + py * wf, 1.1, "rgba(200,255,245,0.4)"); this.disc(x - dx - px * wf, y - dy - py * wf, 1.1, "rgba(200,255,245,0.4)");
  }
  private drawGrasshopper(x: number, y: number, jumping: boolean) {
    x = Math.round(x); y = Math.round(y);
    this.disc(x, y + 2, 2.5, "#0a071430");                  // shadow
    this.rect(x - 2, y - 2, 4, 3, "#5b9a3a"); this.rect(x + 1, y - 3, 2, 2, "#6fb04a");   // body + head
    if (jumping) { this.rect(x - 4, y, 2, 1, "#3a6a24"); this.rect(x - 5, y + 1, 1, 2, "#3a6a24"); }   // legs extended
    else { this.rect(x - 3, y + 1, 2, 1, "#3a6a24"); this.rect(x + 2, y + 1, 2, 1, "#3a6a24"); }       // legs folded
  }
  private drawGull(x: number, y: number, ph: number) {
    x = Math.round(x); y = Math.round(y);
    const f = Math.round(Math.sin(ph) * 2);
    this.rect(x - 3, y - f, 3, 1, "#e8eef6"); this.rect(x, y - f, 3, 1, "#e8eef6");   // two wings, flapping
    this.px(x, y, "#e8eef6");
  }

  // ---- The Sunken Runes puzzle props (CHR-258) ----
  private drawTablet(cx: number, cy: number, near: boolean) {
    this.disc(cx, cy + 2, 6, "#0a071440");
    if (near) this.glow(cx, cy - 8, 16, "#b26cff", 0.3);
    this.rect(cx - 6, cy - 17, 12, 19, "#39324f");            // slab
    this.rect(cx - 6, cy - 17, 12, 2, "#4c4368");
    for (let i = 0; i < 4; i++) this.rect(cx - 3, cy - 13 + i * 3, 6, 1, "#9a8fc0");   // runic lines
    this.labelPill(cx, cy - 25, "Runestone", "#b26cff");
  }
  private drawRune(cx: number, cy: number, lit: boolean, near: boolean) {
    this.disc(cx, cy + 2, 4, "#0a071440");
    if (lit) this.glow(cx, cy - 8, 18, "#c98aff", this.reduce ? 0.5 : 0.4 + 0.15 * Math.sin(this.t * 2 + cx));
    else if (near) this.glow(cx, cy - 8, 12, "#6a5a8a", 0.3);
    this.rect(cx - 3, cy - 11, 6, 13, "#2a2540");             // standing stone
    this.rect(cx - 2, cy - 15, 4, 5, "#2a2540");
    const c = lit ? "#e6ccff" : "#4a4460";
    this.disc(cx, cy - 7, 2, c);                              // glyph
    if (lit) { this.rect(cx - 1, cy - 12, 2, 3, c); this.rect(cx - 3, cy - 5, 6, 1, c); }
  }
  private drawShrine(cx: number, cy: number, open: boolean) {
    this.rect(cx - 20, cy + 8, 40, 5, "#0a071455");           // base shadow
    const edge = open ? "#e0c0ff" : "#4a4460";
    if (open) this.glow(cx, cy - 12, 42, "#b26cff", 0.32 + (this.reduce ? 0 : 0.1 * Math.sin(this.t * 1.5)));
    this.rect(cx - 16, cy - 26, 6, 34, "#2c2742");            // left pillar
    this.rect(cx + 10, cy - 26, 6, 34, "#2c2742");            // right pillar
    this.rect(cx - 18, cy - 31, 36, 7, "#332d4e");            // lintel
    // portal interior
    this.rect(cx - 10, cy - 24, 20, 32, open ? "#241046" : "#141024");
    if (open) {
      this.glow(cx, cy - 6, 16, "#e6ccff", 0.5);
      if (!this.reduce) for (let i = 0; i < 5; i++) { const yy = cy + 6 - ((this.t * 20 + i * 8) % 30); this.px(Math.round(cx - 6 + (i * 3)), Math.round(yy), "#e6ccff"); }
    } else {
      for (let i = 0; i < 3; i++) this.rect(cx - 10, cy - 20 + i * 9, 20, 2, "#3a3352");   // sealing bars
    }
    this.rectLine(cx - 18, cy - 31, 36, 39, edge);
    this.labelPill(cx, cy - 40, open ? "The Shrine" : "Sealed Shrine", edge);
  }
  // ---- social gathering spots ----
  private drawGathering(cx: number, cy: number, p: Prop) {
    const near = this.near === p;
    this.glow(cx, cy - 4, 30, "#ffb066", (this.reduce ? 0.3 : 0.26 + 0.08 * Math.sin(this.t * 3)) + (near ? 0.1 : 0));
    this.fillCirc(cx, cy + 1, 22, "rgba(58,48,38,0.5)");         // paved commons
    for (let i = 0; i < 6; i++) { const a = i * (TAU / 6) + 0.3; const bx = cx + Math.cos(a) * 20, by = cy + Math.sin(a) * 11; this.rect(bx - 3, by - 1, 6, 3, "#4a3f33"); }  // benches/stones
    this.rect(cx - 5, cy - 1, 10, 3, "#3a2a1e");                  // fire logs
    if (!this.reduce) { const f = Math.sin(this.t * 6); this.disc(cx, cy - 4, 4, "#ff5d2a"); this.disc(cx, cy - 6 + f, 3, "#ff8a3d"); this.disc(cx, cy - 9 + f * 1.4, 2, "#ffd24a"); }
    else this.disc(cx, cy - 6, 3, "#ff8a3d");
    this.labelPill(cx, cy - 22, p.label || "The Commons", "#ffb066");
  }
  private nowShowing() { return MOVIES[Math.floor(this.t / REEL_SECONDS) % MOVIES.length]; }
  private drawTheater(cx: number, cy: number, p: Prop) {
    const b = this.b, s = this.SS, m = this.nowShowing();
    this.glow(cx, cy - 42, 64, "#cfe0ff", 0.12);                 // ambient screen light
    // ground + a couple of bench rows in front
    this.fillCirc(cx, cy + 8, 40, "rgba(30,30,44,0.35)");
    for (let r = 0; r < 2; r++) for (let i = -1; i <= 1; i++) this.rect(cx + i * 16 - 5, cy + 6 + r * 8, 12, 3, "#3a3242");
    // posts
    this.rect(cx - 32, cy - 24, 5, 26, "#2b2b38");
    this.rect(cx + 27, cy - 24, 5, 26, "#2b2b38");
    // screen
    const SW = 76, SH = 48, sx0 = cx - SW / 2, sy0 = cy - 24 - SH;
    this.rect(sx0 - 3, sy0 - 3, SW + 6, SH + 6, "#15151f");      // bezel
    const g = b.createLinearGradient(0, sy0 * s, 0, (sy0 + SH) * s); g.addColorStop(0, m.bg1); g.addColorStop(1, m.bg2);
    b.fillStyle = g; b.fillRect(sx0 * s, sy0 * s, SW * s, SH * s);
    b.fillStyle = "rgba(255,255,255,0.04)"; for (let i = 2; i < SH; i += 3) b.fillRect(sx0 * s, (sy0 + i) * s, SW * s, 1 * s);  // scanlines
    this.rectLine(sx0, sy0, SW, SH, "#0a0a14");
    // poster art (emoji) + title (smooth overlay)
    this.q(cx, sy0 + 5, m.emoji, "#ffffff", 2.9, "c");
    const lines = this.wrapText(m.title.toUpperCase(), 17).slice(0, 2);
    const ty = sy0 + SH - (lines.length * 8) - 2;
    for (let i = 0; i < lines.length; i++) this.q(cx, ty + i * 8, lines[i], "#ffffff", 0.9, "c", true);
    // marquee under the screen
    this.rect(cx - 30, cy - 1, 60, 8, "#0a0a14");
    this.q(cx, cy + 1, "✦ NOW SHOWING", "#ffd24a", 0.72, "c", true);
    this.labelPill(cx, sy0 - 11, p.label || "Cirql Drive-In", "#7fd0ff");
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
  private drawPartyWaypoint(cx: number, cy: number) {
    // a teal chevron distinguishing the shared party goal from solo quests
    this.glow(cx, cy - 2, 10, "#35e0d0", 0.45);
    this.rect(cx - 3, cy - 4, 6, 2, "#7ff5e8");
    this.rect(cx - 2, cy - 2, 4, 2, "#7ff5e8");
    this.rect(cx - 1, cy, 2, 2, "#7ff5e8");
  }
  private drawPortal(cx: number, cy: number, p: Prop) {
    const near = this.near === p, kind = p.sub || "cave";
    if (kind === "cave" || kind === "up") {
      // a cave mouth in the rock (or a hole down/up)
      const c = kind === "up" ? "#ffe0a0" : "#7fd8ff";
      this.disc(cx, cy + 2, 12, "#0a071450");
      this.disc(cx - 8, cy - 4, 9, "#4a4a56"); this.disc(cx + 8, cy - 4, 9, "#565663"); this.disc(cx, cy - 8, 11, "#4a4a56");   // rock
      this.disc(cx, cy - 2, 8, "#0a0a12");   // dark mouth
      this.glow(cx, cy - 2, 14, c, 0.2 + (near ? 0.18 : 0) + (this.reduce ? 0 : 0.06 * Math.sin(this.t * 2)));
      if (kind === "up") { this.rect(cx - 1, cy - 10, 2, 10, c); this.rect(cx - 3, cy - 10, 6, 2, c); }   // a light shaft up
      this.labelPill(cx, cy - 22, p.label || "cave", c);
    } else if (kind === "tree") {
      // a great hollow tree you climb
      this.disc(cx, cy + 2, 10, "#0a071440");
      this.rect(cx - 8, cy - 30, 16, 32, "#4a3320"); this.rect(cx - 8, cy - 30, 16, 3, "#5e4228");   // trunk
      for (let i = 0; i < 3; i++) this.disc(cx, cy - 34 - i * 8, (18 - i * 3), i === 0 ? "#356149" : this.curRing.palette.grass);   // canopy
      this.rect(cx - 4, cy - 12, 8, 12, "#0a0a10");   // hollow
      this.glow(cx, cy - 8, 14, "#b6ff6a", 0.2 + (near ? 0.16 : 0));
      for (let i = 0; i < 4; i++) this.rect(cx - 3, cy - 2 - i * 3, 6, 1, "#6e5030");   // rungs
      this.labelPill(cx, cy - 52, p.label || "hollow tree", "#b6ff6a");
    } else {
      // a shimmering cloud stair up into the sky
      this.glow(cx, cy - 10, 26, "#eaf4ff", 0.25 + (near ? 0.18 : 0));
      for (let i = 0; i < 4; i++) { const yy = cy - i * 7, w = 14 - i * 2; this.disc(cx - w / 2, yy, 4, "rgba(240,248,255,0.85)"); this.disc(cx + w / 2, yy, 4, "rgba(220,235,250,0.85)"); }
      this.labelPill(cx, cy - 34, p.label || "cloud stair", "#eaf4ff");
    }
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
    this.labelPill(cx, cy - 34, p.label || "sail →", this.curRing.palette.accent);
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
    this.q(this.LW - 4, it + 2, `${this.stats.sparks} SPARQS`, "#ffc46b", 1, "r", true);

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
            : this.near.t === "dock" ? (this.near.label || "Set sail")
              : this.near.t === "tablet" ? "Read the runestone"
                : this.near.t === "rune" ? (this.near.id && this.lit.has(this.near.id) ? "Dim the rune" : "Wake the rune")
                  : this.near.t === "shrine" ? (this.puzzleSolved() ? "Enter the shrine" : "The shrine is sealed")
                    : this.near.t === "theater" ? "Watch the show"
                      : this.near.t === "gathering" ? "Rest a while"
                        : this.near.t === "portal" ? (this.near.sub === "up" ? "Return to the surface" : this.near.sub === "cave" ? "Descend into the cave" : this.near.sub === "tree" ? "Climb the great tree" : "Ascend the cloud stair")
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

    // arrival name-card — a brief cinematic when you reach a new shore
    if (this.arriveT > 0) {
      const a = Math.min(1, this.arriveT / 0.6) * Math.min(1, (3.0 - this.arriveT) / 0.4 + 0.001);
      const al = Math.max(0, Math.min(1, a));
      const cy = this.LH * 0.4;
      this.b.globalAlpha = al * 0.85;
      this.rect(0, cy - 2, this.LW, 26, "#0a0714");
      this.b.globalAlpha = 1;
      this.rect(this.LW / 2 - 30, cy - 3, 60, 1, hexA(this.curRing.palette.accent, al));
      this.rect(this.LW / 2 - 30, cy + 22, 60, 1, hexA(this.curRing.palette.accent, al));
      this.q(this.LW / 2, cy + 1, this.arriveName, "#eaf6ff", 1.35, "c", true, al);
      this.q(this.LW / 2, cy + 13, this.arriveSub, this.curRing.palette.accent, 0.85, "c", false, al);
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
    const line = (o.ring != null && o.ring !== this.ringIdx) ? `→ Sail to ${ringName(o.ring)}` : `${o.label}${prog}`;
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
    const inSub = isSubMap(this.ringIdx), homeRing = inSub ? parentOf(this.ringIdx) : this.ringIdx;
    b.fillStyle = "rgba(6,12,26,0.82)"; b.beginPath(); b.arc(cx * s, cy * s, R * s, 0, TAU); b.fill();
    const rings = Math.max(MINIMAP_RINGS, this.maxRing + 2), known0 = this.knownRings();
    const step = (R - 3) / rings;
    for (let i = rings - 1; i >= 0; i--) {
      const rad = step * (i + 1); const known = i < known0;
      b.beginPath(); b.arc(cx * s, cy * s, rad * s, 0, TAU);
      if (known) { b.strokeStyle = i === homeRing ? "#ffffff" : "rgba(120,200,255,0.5)"; b.lineWidth = (i === homeRing ? 1.6 : 1) * s; b.setLineDash([]); }
      else { b.strokeStyle = "rgba(120,140,180,0.22)"; b.lineWidth = 1 * s; b.setLineDash([3 * s, 5 * s]); }
      b.stroke();
    }
    b.setLineDash([]);
    this.q(cx, cy - R + 1, "?", "#b4bedc", 1, "c");
    const dr = step * (homeRing + 1);
    if (inSub) {
      // in a sub-map: mark the parent ring + a pulsing centre "you're within" dot
      const acc = this.curRing.palette.accent;
      const pr = this.reduce ? 2.2 : 1.8 + Math.abs(Math.sin(this.t * 3)) * 1.2;
      b.fillStyle = acc; b.beginPath(); b.arc(cx * s, cy * s, pr * s, 0, TAU); b.fill();
      b.fillStyle = "rgba(255,255,255,0.7)"; b.beginPath(); b.arc(cx * s, (cy - dr) * s, 1.6 * s, 0, TAU); b.fill();   // where the portal is
    } else {
      const tgt = this.objTargetProp();
      if (tgt) { const ta = Math.atan2(tgt.y, tgt.x); const pr = this.reduce ? 2 : 1.6 + Math.abs(Math.sin(this.t * 3)) * 1.2; b.fillStyle = "#ffd24a"; b.beginPath(); b.arc((cx + Math.cos(ta) * dr) * s, (cy + Math.sin(ta) * dr) * s, pr * s, 0, TAU); b.fill(); }
      if (this.partyWp) { const wa = Math.atan2(this.partyWp.y, this.partyWp.x); const pr = this.reduce ? 2 : 1.6 + Math.abs(Math.sin(this.t * 3.5)) * 1.2; b.fillStyle = "#35e0d0"; b.beginPath(); b.arc((cx + Math.cos(wa) * dr) * s, (cy + Math.sin(wa) * dr) * s, pr * s, 0, TAU); b.fill(); }
      const ang = Math.atan2(this.posY, this.posX);
      b.fillStyle = "#ffffff"; b.beginPath(); b.arc((cx + Math.cos(ang) * dr) * s, (cy + Math.sin(ang) * dr) * s, 1.8 * s, 0, TAU); b.fill();
    }
    // current place name + tappable hint under the minimap
    const subHint = inSub ? (subKindOf(this.ringIdx) === "cave" ? "underground" : subKindOf(this.ringIdx) === "tree" ? "in the trees" : "in the clouds") : "tap · chart";
    if (this.ringIdx === 0) {   // CIRQLSPACE — styled like the logo (CIRQL big + SPACE small)
      this.q(cx - 1, cy + R + 1, "CIRQL", "#ffffff", 1.05, "r", true);
      this.q(cx + 1, cy + R + 3, "SPACE", this.curRing.palette.accent, 0.7, "l", true);
    } else {
      this.q(cx, cy + R + 2, this.curRing.name, this.curRing.palette.accent, 0.92, "c", true);
    }
    this.q(cx, cy + R + 11, subHint, "#8fa6c6", 0.72, "c");
  }
  private drawChart() {
    const b = this.b, s = this.SS, W = this.LW, H = this.LH;
    const it = this.itop();
    this.ui.length = 0;   // drop any world labels queued this frame — chart only
    b.fillStyle = "rgba(4,7,16,0.93)"; b.fillRect(0, 0, W * s, H * s);
    this.q(W / 2, it + 6, "The Endless Ocean", "#eaf6ff", 1.3, "c", true);
    this.q(W / 2, it + 20, "your chart of the rings", "#7fa0c8", 0.9, "c");
    const rings = Math.max(MINIMAP_RINGS, this.maxRing + 2), known0 = this.knownRings();
    const homeRing = isSubMap(this.ringIdx) ? parentOf(this.ringIdx) : this.ringIdx;
    const cx = W / 2, cy = H / 2 + 4, maxR = Math.min(W, H) * 0.40, step = maxR / rings;
    this.glow(cx, cy, maxR + 10, "#16264d", 0.55);
    for (let i = rings - 1; i >= 0; i--) {
      const rad = step * (i + 1); const known = i < known0;
      b.beginPath(); b.arc(cx * s, cy * s, rad * s, 0, TAU);
      if (known) { b.strokeStyle = i === homeRing ? "#ffffff" : "rgba(120,200,255,0.55)"; b.lineWidth = (i === homeRing ? 2 : 1.2) * s; b.setLineDash([]); }
      else { b.strokeStyle = "rgba(120,140,180,0.28)"; b.lineWidth = 1 * s; b.setLineDash([4 * s, 6 * s]); }
      b.stroke();
    }
    b.setLineDash([]);
    // land labels (known named; the first fogged ring marked uncharted). Skip labels
    // when the rings are packed too tight to read.
    const labelEvery = step < 16 ? 2 : 1;
    for (let i = 0; i < rings; i++) {
      const rad = step * (i + 1);
      if (i < known0) { if (i % labelEvery === 0 || i === homeRing) this.q(cx, cy - rad - 7, ringName(i), i === homeRing ? "#ffd24a" : "#bfe0ff", i === homeRing ? 1 : 0.85, "c", true); }
      else if (i === known0) { this.q(cx, cy - rad - 7, "? uncharted ?", "#6f86ad", 0.9, "c"); break; }
    }
    if (isSubMap(this.ringIdx)) this.q(cx, cy, `— you are in ${this.curRing.name} —`, this.curRing.palette.accent, 0.95, "c", true);
    // objective (gold) + you (teal/white) on the current ring
    const pr = step * (homeRing + 1);
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
