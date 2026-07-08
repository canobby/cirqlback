// CIRQL — CirqlWorldEngine (CHR-216/219/220/221).
//
// The flagship world renderer: a top-down, walk-around island on the supersampled
// RetroEngine, lifted by the neon glow-up kit (lantern light, motes, aurora,
// vignette). You walk your avatar around a ring, camera follows, a minimap shows
// the concentric world fading into fog, and walking up to a dock / the Wonders /
// an NPC raises an interact prompt. Persistence, quests, the Wonders arcade and
// "your Cirql" plug in on top of this (M2–M6) via the hooks below.

import { RetroEngine, shade, mix, type RetroHooks } from "./retro-engine";
import { loadAvatarLS, DEFAULT_AVATAR, AURA_COLORS, type AvatarConfig } from "./avatar";
import { RINGS, MINIMAP_RINGS, type Ring, type Prop, type RingPalette } from "./cirql-world";
import { getRing, ringName, isSubMap, parentOf, subKindOf, isTunnel } from "./cirql-ring-gen";
import { isShop } from "./cirql-shops";
import { isHome } from "./cirql-home";
import { CirqlOrchestra } from "./cirql-orchestra";
import { trackForContext } from "./cirql-music";
import { cirqlSfx, type SfxKind } from "./cirql-sfx";
import { MOVIES, REEL_SECONDS } from "./cirql-theater";
import {
  allQuests, questById, offerableQuest, repeatableQuest, questStatusList, registerQuest,
  type QuestDef, type QuestProgress, type ObjectiveKind, type QuestStatus,
} from "./cirql-quests";
import { generateRingQuests } from "./cirql-quest-gen";
import { EMOTE_BY_ID, EMOTE_SECONDS, PAIR_BY_ID } from "./cirql-emotes";
import { arrivalCutscene, BEAT_SECONDS, type Cutscene, type CutsceneBeat, type CutsceneFx } from "./cirql-cutscenes";
import { decorById, DECOR_SOLID } from "./cirql-decor";
import { npcLook, type NpcLook } from "./cirql-npc-looks";
import { simpleDialog, npcConversation, type DialogTree, type DialogChoice } from "./cirql-dialog";
import { npcProfile } from "./cirql-npc-cast";

export type InteractKind = "wonders" | "npc" | "dock" | "shop" | "shopkeeper";
export interface CirqlStats { sparks: number; cirqlLit: number; cirqlTotal: number; online: number; energy: number; }
export interface QuestLogRow { id: string; name: string; status: QuestStatus; objective: string; tier?: number; reward?: number; renownReward?: number; steps?: number; }

const TAU = Math.PI * 2;
// terrain paint (Phase C): a tile grid over CIRQLSPACE. Cells keyed with a +500 offset so
// negative coords stay unique; grass is the default (never stored). Tile chars: s=sand,
// t=stone, w=water, p=path.
const TILE = 30;
const CK = (gx: number, gy: number) => (gy + 500) * 1000 + (gx + 500);
// land growth (Phase D): CIRQLSPACE starts cozy and expands outward in tiers (buildable radius).
export const LAND_TIERS = [170, 215, 260, 305, 350, 395, 430];   // radius per tier (0=cozy … 6=estate cap)
const TILE_COL: Record<string, string> = { s: "#c9ad74", t: "#565663", w: "#183a58", p: "#6a4a2a" };
function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// A live conversation: a DialogTree (K1) + which node we're on + the line within it.
interface Dialog { name: string; accent: string; tree: DialogTree; nodeId: string; i: number; }

// M8 — a live remote traveller on your ring (presence + chat). Position eases from
// x/y toward the last-received tx/ty for smooth movement between throttled updates.
type Facing = "up" | "down" | "left" | "right";
interface RemotePlayer { x: number; y: number; tx: number; ty: number; facing: Facing; name: string; avatar: AvatarConfig; chat: string; chatT: number; walk: number; emote: string; emoteT: number; seated: boolean; blinkT: number; blinking: number; }
export interface RemoteState { id: string; x: number; y: number; dir: string; name: string; avatar: AvatarConfig; ring?: number; pose?: string; }

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
  // the tornado sweep (F weather entry): a short cinematic that lifts you into the sky realm
  private tornado: { dest: number; t: number; progress: number; accent: string; destName: string } | null = null;
  private exitEnd: "a" | "b" | null = null;   // which tunnel mouth to emerge from (F)
  private posX = 0; private posY = 0;         // player world position
  private vx = 0; private vy = 0; private facing: "up" | "down" | "left" | "right" = "down"; private walk = 0;
  private jumpZ = 0; private jumpVel = 0;      // fake-Z hop (CHR-263): raised height + vertical velocity
  private seated = false; private poseDirty = false;   // free-sit pose (Phase H1) — broadcast even when standing still
  private zoom = 1; private zoomTarget = 1;            // live camera zoom (Phase H2): 1 = normal, <1 sees more
  private diorama = false; private dioramaAng = 0; private dioramaT = 0;   // tilted 3/4 beauty shot (Phase H3)
  // idle life (Phase I1): breathing, blink, occasional fidgets, and an AFK doze
  private idleT = 0; private blinkT = 1.5; private blinking = 0; private dozing = false;
  private fidget: { kind: "lookL" | "lookR" | "lookU" | "stretch"; t: number } | null = null; private nextFidget = 4;
  // movement juice (Phase I2): world-space ground FX + step cadence + land squash + collision bump
  // (Phase I5 adds biome-flavoured kinds: pale "snow" prints, dark "ash" puffs, rising "puff" breath)
  private groundFx: { x: number; y: number; life: number; max: number; kind: "dust" | "splash" | "print" | "snow" | "ash" | "puff"; foot: number }[] = [];
  private stepT = 0; private stepFoot = 1; private squashT = 0; private wasAir = false; private bumpT = 0;
  private breathT = 2;   // cold-biome breath-puff cadence (Phase I5)
  // world interactions (Phase I6): a knock/wave beat before entering, and an item-get "present" pose
  private entryAction: { at: number; fn: () => void } | null = null;
  private presentPose: { glyph: string; color: string; t: number } | null = null;
  // Hearth décor (CHR-259): your placed decorations, an edit mode, and a "visiting" overlay
  private decor: { item: string; x: number; y: number }[] = [];
  private homeDecor: { item: string; x: number; y: number }[] = [];   // your indoor Home furniture (Milestone F)
  private editDecor = false; private editSel = "";     // placing this item; "" = remove-on-tap
  private snapGrid = false;                             // snap placement to a grid (CHR-273)
  // terrain paint (Phase C): sparse tile grid + paint mode
  private terrain = new Map<number, string>();
  private editPaint = false; private paintTile = "s"; private brush = 1; private paintStroke = false;
  private landTier = 0;                                 // CIRQLSPACE buildable-land tier (Phase D)
  // Live-party visiting (Phase E): the host's full build (décor + terrain + land tier) you're standing in.
  private visiting: { name: string; decor: { item: string; x: number; y: number }[]; terrain: Map<number, string>; landTier: number } | null = null;
  private curTerrain() { return this.visiting ? this.visiting.terrain : this.terrain; }
  private camX = 0; private camY = 0;
  private t = 0;
  private hero: AvatarConfig;
  private myName = "You";
  private moveTarget: { x: number; y: number } | null = null;

  private near: Prop | null = null;       // nearest interactable in range
  private dialog: Dialog | null = null;
  private dialogChoiceRects: { x: number; y: number; w: number; h: number }[] = [];   // tap targets for branching choices (K1)
  private msg = ""; private msgT = 0;      // transient toast

  private stats: CirqlStats = { sparks: 0, cirqlLit: 0, cirqlTotal: 12, online: 1, energy: 0 };
  private quests: QuestProgress = {};
  private doneOnce = new Set<string>();   // quest ids completed at least once (repeats pay less)
  private lit = new Set<string>();   // permanently-lit lanterns + puzzle rune states
  private litForQuest = new Set<string>();   // lanterns lit for the CURRENT lightLanterns quest (reset on accept — never blocked by stale global lit)
  private gatheredWisps = new Set<string>();   // wisps collected for the CURRENT gather quest (Phase K3; reset on accept)

  // Smooth-text overlay queue: UI/labels are enqueued in logical coords during
  // render() and painted crisply (system sans) in onOverlay(), so words stay
  // readable on small phones while the world keeps its 16-bit pixel look.
  private ui: { x: number; y: number; s: string; c: string; sc: number; align: "l" | "c" | "r"; bold?: boolean; alpha?: number; halo?: boolean; z?: boolean }[] = [];
  // true while enqueuing labels drawn INSIDE the world's zoom transform (props/NPCs) — those
  // must be scaled by the live zoom in onOverlay so they don't drift off their object; HUD +
  // post-restore labels (z=false) stay in screen space.
  private uiZoom = false;
  private q(x: number, y: number, s: string, c: string, sc = 1, align: "l" | "c" | "r" = "l", bold = false, alpha = 1, halo = false) {
    this.ui.push({ x, y, s, c, sc, align, bold, alpha, halo, z: this.uiZoom });
  }
  // Safe-area insets (CSS px) so the HUD clears the floating header + controls in
  // full-screen mode; converted to logical px on use.
  private insetTopCss = 0; private insetBotCss = 0;
  private itop() { return this.dispW > 0 ? this.insetTopCss * this.LW / this.dispW : 0; }
  private ibot() { return this.dispW > 0 ? this.insetBotCss * this.LW / this.dispW : 0; }
  private mapOpen = false;      // full-screen sea chart
  private chartGeom: { cx: number; cy: number; step: number; rings: number } | null = null;   // sea-chart layout for tap-to-travel
  private chartZoom = 1;        // sea-chart zoom (spread rings for easy tapping ↔ fit them all)
  private chartBtn(which: "in" | "out") { return { x: 22, y: Math.round(this.LH * 0.44) + (which === "in" ? 0 : 28), r: 11 }; }   // left edge, clear of the React controls
  private pDownPrev = false;    // pointer edge for tap detection
  /** Explore Mode (owner/beta walkthrough): unlock everything, skip gates. */
  private explore = false;
  setExplore(on: boolean) { this.explore = !!on; }
  isExplore() { return this.explore; }
  /** Fast travel (tap a chart ring to leap there) unlocks at ring 5 — or always in Explore Mode. */
  fastTravelReady() { return this.explore || this.maxRing >= 5; }
  private minimapCx() { return this.LW - 26; }
  private minimapCy() { return this.itop() + 34; }
  private inMinimap(x: number, y: number) { return Math.hypot(x - this.minimapCx(), y - this.minimapCy()) < 24; }
  private inOnline(x: number, y: number) { const it = this.itop(); return x < 48 && y > it && y < it + 16; }   // top-left online badge tap zone
  /** Settings (page-driven): screen brightness + a manual reduced-motion override. */
  setBrightness(v: number) { this.brightness = Math.max(0.5, Math.min(1.5, v)); }
  setReduceMotion(v: boolean) { this.reduce = v; }
  getReduceMotion() { return this.reduce; }
  /** Settings: "smoother animation" softens the pixel upscale (antialiased) vs crisp retro pixels. */
  setSmoothScale(on: boolean) { this.smooth = on; }
  /** Settings: pixel size — the base logical resolution (bigger = chunkier retro pixels). Re-lays out. */
  setPixelSize(v: number) { const nv = Math.max(1.15, Math.min(2.2, v)); if (Math.abs(nv - this.fitPx) < 0.001) return; this.fitPx = nv; this.resize(); }

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
  private lastNearId: string | null = null;                        // last announced nearPlayer (fire onNearPlayer on change)
  private pair: { withId: string; g: string; t: number } | null = null;   // active paired social gesture (Phase I4)
  private lastPresence = 0; private lastPx = 1e9; private lastPy = 1e9;
  /** Fired often (throttled) with the live position, for the presence socket. */
  onPresence?: (ring: number, x: number, y: number, facing: Facing, pose: string) => void;
  /** Fired when the player presses E next to another traveller (share a light). */
  onShareLight?: (id: string) => void;
  /** Fired when the nearby traveller changes (null when none) — the page shows the "Together" panel. */
  onNearPlayer?: (p: { id: string; name: string } | null) => void;
  /** Fired when the player taps the online-count badge (top-left) — the page shows "who's here". */
  onOnlineTap?: () => void;
  private brightness = 1;   // player brightness pref (Settings): <1 dims, >1 brightens the world
  /** Fired when the player offers a paired social gesture — the host relays it to both (Phase I4). */
  onPairGesture?: (id: string, g: string) => void;
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
    this.syncHomeDock();   // pin the Town dock to the land edge so it's reachable at any tier
    this.orchestra = new CirqlOrchestra({ volume: 0.7 });   // G: the cinematic world score (starts on first gesture)
    this.running = true;
  }

  // ---------- G: music & SFX ----------
  private orchestra: CirqlOrchestra | null = null;
  private musicStarted = false; private musicVol = 0.7;
  /** Begin (or resume) the adaptive soundtrack — call from a user gesture (start picker / confirm). */
  startAudio() { this.musicStarted = true; cirqlSfx.resume(); this.updateMusic(); }
  /** Swap to the theme for the current ring/biome + set its intensity by context. */
  private updateMusic() {
    if (!this.musicStarted || !this.orchestra || this.musicVol <= 0) return;
    const shop = isShop(this.ringIdx) || isHome(this.ringIdx), sub = isSubMap(this.ringIdx) && !isHome(this.ringIdx);
    this.orchestra.play(trackForContext(this.ringIdx, this.curRing.ambient, shop, sub));
    this.orchestra.setIntensity(this.ringIdx <= 0 ? 0.55 : shop ? 0.5 : sub ? 0.6 : this.ringIdx === 1 ? 0.8 : 0.9);
  }
  /** Settings "Music" (0..1). 0 stops the soundtrack; raising it restarts the current theme. */
  setMusicVol(v: number) {
    this.musicVol = Math.max(0, Math.min(1, v)); this.orchestra?.setVolume(this.musicVol);
    if (this.musicVol <= 0) this.orchestra?.stop();
    else if (this.musicStarted && !this.orchestra?.playing) this.updateMusic();
  }
  protected onDestroy() { this.orchestra?.dispose(); }
  /** Settings "Sound FX" (0..1). */
  setSfxVol(v: number) { cirqlSfx.setVolume(v); }
  /** Play a one-shot cue (best-effort; silent until audio has started via a gesture). */
  sfx(k: SfxKind) { cirqlSfx.play(k); }

  /** Register the current ring's generated quest so its keeper can offer it (CHR-256). */
  private ensureRingQuest() { for (const q of generateRingQuests(this.ringIdx)) registerQuest(q); }

  // ---------- host API ----------
  setLocal(name: string, avatar?: AvatarConfig) { this.myName = (name || "You").slice(0, 16); if (avatar) this.hero = avatar; }
  /** Live-update the player's look (character creator / "edit look"). */
  setAvatar(avatar: AvatarConfig) { this.hero = avatar; }
  setStats(s: Partial<CirqlStats>) { this.stats = { ...this.stats, ...s }; }
  // ---- Hearth décor (CHR-259) ----
  /** Fired when the player places/removes décor (host persists + rebroadcasts). */
  onDecorChange?: () => void;
  getDecor() { return this.decor.slice(); }
  setDecor(list: { item: string; x: number; y: number }[]) { this.decor = this.cleanDecor(list); }
  getHomeDecor() { return this.homeDecor.slice(); }
  setHomeDecor(list: { item: string; x: number; y: number }[]) { this.homeDecor = this.cleanDecor(list); }
  private cleanDecor(list: any) { return Array.isArray(list) ? list.filter((d) => d && decorById[d.item]).map((d: any) => ({ item: d.item, x: +d.x, y: +d.y })) : []; }
  /** Décor can be placed/rendered on your CIRQLSPACE (ring 0) OR inside your Home (F). */
  private canDecorate() { return this.ringIdx === 0 || isHome(this.ringIdx); }
  /** The décor list for the current space: a friend's build while visiting, else home vs outdoor. */
  private curDecorList() { return this.visiting ? this.visiting.decor : (isHome(this.ringIdx) ? this.homeDecor : this.decor); }
  /** Enter décor edit mode; `itemId` is the piece to place, or "" to remove-on-tap. */
  beginDecorEdit(itemId: string) { if (!this.canDecorate() || this.visiting) return; this.editDecor = true; this.editPaint = false; this.editSel = decorById[itemId] ? itemId : ""; this.setZoomTarget(1); }
  setDecorTool(itemId: string) { this.editSel = decorById[itemId] ? itemId : ""; }
  setSnap(on: boolean) { this.snapGrid = !!on; }
  endDecorEdit() { this.editDecor = false; }
  // ---- terrain paint (Phase C) ----
  beginPaint(tile: string) { if (this.ringIdx !== 0 || this.visiting) return; this.editPaint = true; this.editDecor = false; this.paintTile = tile; this.setZoomTarget(1); }
  setPaintTile(tile: string) { this.paintTile = tile; }
  setBrush(n: number) { this.brush = Math.max(1, Math.min(4, n | 0)); }
  endPaint() { this.editPaint = false; }
  paintingMode() { return this.editPaint; }
  getTerrain(): Record<string, string> { const o: Record<string, string> = {}; for (const [k, v] of Array.from(this.terrain)) o[k] = v; return o; }
  setTerrain(obj: any) { this.terrain.clear(); if (obj && typeof obj === "object") for (const k in obj) { const n = +k; if (Number.isFinite(n)) this.terrain.set(n, String(obj[k])); } }
  clearTerrain() { if (this.terrain.size) { this.terrain.clear(); this.onDecorChange?.(); } }
  // ---- land growth (Phase D) ----
  /** Effective buildable/walkable radius — the land tier on CIRQLSPACE, else the full ring. */
  private effR() { const tier = this.visiting ? this.visiting.landTier : this.landTier; return this.ringIdx === 0 ? LAND_TIERS[Math.max(0, Math.min(LAND_TIERS.length - 1, tier))] : this.curRing.radius; }
  getLandTier() { return this.landTier; }
  setLandTier(n: number) { this.landTier = Math.max(0, Math.min(LAND_TIERS.length - 1, n | 0)); this.syncHomeDock(); this.camX = this.posX - this.LW / 2; this.camY = this.posY - this.LH / 2; }
  /** Keep the CIRQLSPACE → Town dock pinned to the current land edge so it's ALWAYS
   *  reachable — at low land tiers the fixed dock sat far out in the sea, stranding you. */
  private syncHomeDock() {
    const lr = LAND_TIERS[Math.max(0, Math.min(LAND_TIERS.length - 1, this.landTier))];
    const d = RINGS[0].props.find((p) => p.t === "dock" && p.to === 1);
    // Sit the dock ~15px inside the sand edge (radius `lr`): its planks land on the shore
    // and its boat (drawn ~20px further out) sits in the water — a proper dock. Stays within
    // reach at every tier: player walk-clamp is lr*0.9, dock interact radius is 40, and
    // (lr - 15) − lr*0.9 = 0.1*lr − 15 ≤ 28 across all land tiers (max radius 430).
    if (d) d.y = Math.round(lr - 15);
  }
  private tileAtWorld(wx: number, wy: number) { return this.curTerrain().get(CK(Math.round(wx / TILE), Math.round(wy / TILE))) ?? "g"; }
  /** Parse a { numericKey | "gx,gy": tile } terrain blob into the engine's numeric-CK map. */
  private parseTerrain(obj: any): Map<number, string> {
    const m = new Map<number, string>();
    if (obj && typeof obj === "object") for (const k in obj) {
      const v = String(obj[k]); let key: number;
      if (k.indexOf(",") >= 0) { const [gx, gy] = k.split(",").map(Number); if (!Number.isFinite(gx) || !Number.isFinite(gy)) continue; key = CK(gx, gy); }
      else { key = +k; if (!Number.isFinite(key)) continue; }
      m.set(key, v);
    }
    return m;
  }
  private paintAt(wx: number, wy: number) {
    const cx = Math.round(wx / TILE), cy = Math.round(wy / TILE), rad = this.brush - 1, lim = this.effR() * 0.86;
    for (let gy = cy - rad; gy <= cy + rad; gy++) for (let gx = cx - rad; gx <= cx + rad; gx++) {
      if (Math.hypot(gx * TILE, gy * TILE) > lim) continue;
      const key = CK(gx, gy);
      if (this.paintTile === "g") this.terrain.delete(key);                       // grass = erase
      else if (this.terrain.size < 2400 || this.terrain.has(key)) this.terrain.set(key, this.paintTile);
    }
    this.paintStroke = true;
  }
  decorEditing() { return this.editDecor; }
  clearDecor() { if (this.decor.length) { this.decor = []; this.onDecorChange?.(); } }
  /** Visit another traveller's CIRQLSPACE — render their whole build (décor + terrain + land) read-only. */
  startVisit(name: string, build: { decor?: { item: string; x: number; y: number }[]; terrain?: any; landTier?: number }) {
    this.editDecor = false; this.editPaint = false;
    this.visiting = {
      name: (name || "Traveller").slice(0, 16),
      decor: (build?.decor || []).filter((d) => d && decorById[d.item]),
      terrain: this.parseTerrain(build?.terrain),
      landTier: Math.max(0, Math.min(LAND_TIERS.length - 1, +(build?.landTier ?? 0) | 0)),
    };
    if (this.ringIdx !== 0) { this.ringIdx = 0; this.curRing = getRing(0); }
    this.posX = 0; this.posY = 150; this.camX = -this.LW / 2; this.camY = 150 - this.LH / 2;
    this.near = null; this.dialog = null;
  }
  /** The host edited while you're watching — swap in their new build without moving you. */
  updateVisit(build: { decor?: { item: string; x: number; y: number }[]; terrain?: any; landTier?: number }) {
    if (!this.visiting) return;
    this.visiting.decor = (build?.decor || []).filter((d) => d && decorById[d.item]);
    this.visiting.terrain = this.parseTerrain(build?.terrain);
    this.visiting.landTier = Math.max(0, Math.min(LAND_TIERS.length - 1, +(build?.landTier ?? 0) | 0));
  }
  endVisit() { this.visiting = null; }
  isVisiting() { return !!this.visiting; }
  visitingName() { return this.visiting?.name ?? ""; }
  /** Full-screen safe-area: keep the HUD below the floating header + above the controls (CSS px). */
  setHudInsets(topCss: number, botCss: number) { this.insetTopCss = Math.max(0, topCss); this.insetBotCss = Math.max(0, botCss); }
  /** The on-screen action button + the quest system call this to interact. */
  interact() { if (this.diorama) { this.closeDiorama(); return; } if (this.tornado) { this.endTornado(); return; } if (this.voyage) { this.endVoyage(); return; } if (this.cs) { if (this.csClosing <= 0) this.csClosing = 0.35; return; } this.doInteract(); }
  /** A little fake-Z hop (CHR-263) — raise the sprite; the shadow stays grounded. */
  jump() { if (this.cs || this.voyage || this.dialog || this.mapOpen) return; this.standUp(); if (this.jumpZ <= 0.01 && this.jumpVel <= 0) { this.jumpVel = 66; this.sfx("hop"); } }
  /** Free-sit (Phase H1) — plop down where you stand; any movement stands you back up. */
  onSeatChange?: (seated: boolean) => void;
  toggleSit() { if (this.cs || this.voyage || this.dialog || this.mapOpen) return; this.seated = !this.seated; this.poseDirty = true; this.dozing = false; this.idleT = 0; if (this.seated) { this.vx = 0; this.vy = 0; this.moveTarget = null; } this.onSeatChange?.(this.seated); }
  private standUp() { this.dozing = false; this.idleT = 0; if (this.seated) { this.seated = false; this.poseDirty = true; this.onSeatChange?.(false); } }
  isSeated() { return this.seated; }
  /** How many distinct quests you've completed at least once (feeds the K5 journeys). */
  questsCompleted() { return this.doneOnce.size; }
  /** Jump straight to a start location (no sailing voyage) — used by the startup picker.
   *  "last" keeps the already-applied saved spot; "home" = CIRQLSPACE spawn; "arcade" =
   *  standing at the CirqlCade entrance on the Town ring (one tap from the games hall). */
  startAt(dest: "home" | "last" | "arcade") {
    if (dest === "last") return;
    if (dest === "home") {
      this.ringIdx = 0; this.curRing = getRing(0);
      this.posX = this.curRing.spawn.x; this.posY = this.curRing.spawn.y; this.facing = "down";
    } else {   // arcade — stand facing the CirqlCade building on the Town ring
      this.ringIdx = 1; this.curRing = getRing(1); this.maxRing = Math.max(this.maxRing, 1); this.ensureRingQuest();
      const cade = this.curRing.props.find((p) => p.t === "wonders");
      if (cade) { this.posX = cade.x; this.posY = cade.y + 42; } else { this.posX = this.curRing.spawn.x; this.posY = this.curRing.spawn.y; }
      this.facing = "up";
    }
    this.vx = this.vy = 0; this.moveTarget = null; this.seated = false;
    this.camX = this.posX - this.LW / 2; this.camY = this.posY - this.LH / 2;
  }
  // ---- live zoom (Phase H2) — 0.25 (whole ocean) … 1.5 (close). Building happens at 1:1. ----
  onZoomChange?: (z: number) => void;
  setZoomTarget(z: number) { if (this.editDecor || this.editPaint) z = 1; this.zoomTarget = Math.max(0.25, Math.min(1.5, z)); this.onZoomChange?.(this.zoomTarget); }
  zoomBy(mult: number) { this.setZoomTarget(this.zoomTarget * mult); }
  getZoom() { return this.zoomTarget; }
  /** Convert a logical screen point to world coords, accounting for the current zoom. */
  private screenToWorld(px: number, py: number) {
    const fx = this.LW / 2, fy = this.LH / 2;
    return { x: (px - fx) / this.zoom + fx + this.camX, y: (py - fy) / this.zoom + fy + this.camY };
  }
  // ---- diorama beauty shot (Phase H3) — a tilted 3/4 "physical model" of your whole CIRQLSPACE ----
  onDioramaChange?: (on: boolean) => void;
  openDiorama() { if (this.ringIdx !== 0 || this.cs || this.voyage) return; this.diorama = true; this.dioramaT = 0; this.dioramaAng = -0.5; this.editDecor = false; this.editPaint = false; this.onDioramaChange?.(true); }
  closeDiorama() { if (!this.diorama) return; this.diorama = false; this.onDioramaChange?.(false); }
  isDiorama() { return this.diorama; }
  getState() { return { ring: this.ringIdx, maxRing: this.maxRing, x: Math.round(this.posX), y: Math.round(this.posY), quests: this.quests, lit: Array.from(this.lit), litForQuest: Array.from(this.litForQuest), gatheredWisps: Array.from(this.gatheredWisps), doneOnce: Array.from(this.doneOnce), decor: this.decor.slice(), homeDecor: this.homeDecor.slice(), terrain: this.getTerrain(), landTier: this.landTier }; }
  applyState(s: any) {
    if (!s) return;
    if (Array.isArray(s.doneOnce)) this.doneOnce = new Set(s.doneOnce);
    if (Array.isArray(s.decor)) this.setDecor(s.decor);
    if (Array.isArray(s.homeDecor)) this.setHomeDecor(s.homeDecor);
    if (s.terrain && typeof s.terrain === "object") this.setTerrain(s.terrain);
    if (typeof s.landTier === "number") this.landTier = Math.max(0, Math.min(LAND_TIERS.length - 1, s.landTier | 0));
    this.syncHomeDock();   // re-pin the Town dock to the loaded land edge
    if (Array.isArray(s.litForQuest)) this.litForQuest = new Set(s.litForQuest);
    if (Array.isArray(s.gatheredWisps)) this.gatheredWisps = new Set(s.gatheredWisps);
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
    const wasFT = this.fastTravelReady();
    this.ringIdx = dest;
    this.curRing = getRing(dest);
    if (!isSubMap(dest)) this.maxRing = Math.max(this.maxRing, dest);   // sub-maps don't lift the fog
    if (!wasFT && this.fastTravelReady()) this.toast("✦ Fast travel unlocked! Tap a ring on your sea chart to leap there.");   // reward for reaching ring 5
    this.ensureRingQuest();
    const r = this.curRing.radius;
    // arrive at the dock/portal/storefront that leads back to where we came from. A tunnel
    // exit emerges at the mouth matching its end (so you come out ACROSS the ring), else the
    // first matching connector.
    const end = this.exitEnd; this.exitEnd = null;
    let back = end ? this.curRing.props.find((p) => p.t === "tunnel" && p.end === end) : undefined;
    if (!back) back = this.curRing.props.find((p) => (p.t === "dock" || p.t === "portal" || p.t === "shop" || p.t === "home" || p.t === "tunnel") && p.to === from);
    if (back) { this.posX = back.x; this.posY = back.y + (back.t === "portal" ? 26 : 30); }
    else { const outward = dest > from; this.posX = 0; this.posY = outward ? -r * 0.68 : r * 0.7; }
    this.vx = this.vy = 0; this.facing = "down";
    this.camX = this.posX - this.LW / 2; this.camY = this.posY - this.LH / 2;
    this.near = null; this.dialog = null; this.moveTarget = null;
    this.resolvePartyWp();   // re-point the shared waypoint for the new ring
    if (firstShore) this.playCutscene(arrivalCutscene(this.curRing.name, this.curRing.sub, this.curRing.palette.accent));
    else { this.arriveT = 3.0; this.arriveName = this.curRing.name; this.arriveSub = this.curRing.sub; }   // quick card on revisits
    this.updateMusic();   // G: swap to the theme for the new ring/biome/interior
    this.onSail?.(this.ringIdx, this.maxRing);
  }
  // ---------- sailing voyage (CHR-262) ----------
  /** Begin the interactive crossing to `dest`: steer the boat up-screen toward the far
   *  shore, gathering drifting light, then land (doSail runs the real ring change). */
  private startVoyage(dest: number) {
    this.sfx("sail");
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
  // ---------- tornado sweep (F weather entry) ----------
  /** Brave a storm: a tornado cinematic lifts you up, then lands you in the sky realm. */
  private startTornado(dest: number) {
    this.sfx("storm");
    const d = getRing(dest);
    this.tornado = { dest, t: 0, progress: 0, accent: d.palette.accent, destName: d.name };
    this.vx = this.vy = 0; this.moveTarget = null; this.dialog = null; this.near = null; this.mapOpen = false;
  }
  /** Is the tornado sweep playing (the world is suspended)? */
  tornadoActive() { return !!this.tornado; }
  private endTornado() { const t = this.tornado; this.tornado = null; if (t) this.doSail(t.dest); }
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
    this.remotes.set(s.id, { x: s.x, y: s.y, tx: s.x, ty: s.y, facing: this.facingOf(s.dir), name: (s.name || "Traveller").slice(0, 16), avatar: s.avatar || DEFAULT_AVATAR, chat: "", chatT: 0, walk: 0, emote: "", emoteT: 0, seated: s.pose === "sit", blinkT: 1 + Math.random() * 4, blinking: 0 });
  }
  moveRemote(id: string, x: number, y: number, dir: string, pose?: string) { const r = this.remotes.get(id); if (r) { r.tx = x; r.ty = y; r.facing = this.facingOf(dir); if (pose !== undefined) r.seated = pose === "sit"; } }
  removeRemote(id: string) { this.remotes.delete(id); if (this.pair?.withId === id) this.pair = null; if (this.nearPlayer?.id === id) { this.nearPlayer = null; if (this.lastNearId) { this.lastNearId = null; this.onNearPlayer?.(null); } } }
  chatRemote(id: string, text: string) { const r = this.remotes.get(id); if (r) { r.chat = text; r.chatT = 5.5; } }
  /** A remote traveller played an emote — show its glyph (+ motion) over them (CHR-260). */
  emoteRemote(id: string, emote: string) { const r = this.remotes.get(id); const def = EMOTE_BY_ID[emote]; if (r && def) { r.emote = emote; r.emoteT = def.hold ?? EMOTE_SECONDS; } }
  /** Show your own chat bubble over your avatar. */
  sayLocal(text: string) { this.myChat = text; this.myChatT = 5.5; }
  /** Play an emote locally + broadcast it (called by the emote wheel). */
  playEmote(emote: string) { const def = EMOTE_BY_ID[emote]; if (!def) return; this.myEmote = emote; this.myEmoteT = def.hold ?? EMOTE_SECONDS; this.sfx("emote"); this.onEmote?.(emote); }
  // ---- paired social gestures (Phase I4) — a two-person moment with the nearby traveller ----
  /** Offer a paired gesture to the traveller you're standing next to; the host relays it to both. */
  requestPair(g: string) { if (this.nearPlayer && PAIR_BY_ID[g]) this.onPairGesture?.(this.nearPlayer.id, g); }
  /** Start a synced paired gesture — called on BOTH sides when the host relays `paired`. */
  startPair(withId: string, g: string) {
    const def = PAIR_BY_ID[g]; if (!def) return;
    const r = this.remotes.get(withId);
    this.pair = { withId, g, t: def.hold };
    if (r) { this.facing = this.faceToward(r.x, r.y); this.poseDirty = true; }   // turn to face your partner
    if (g === "sit") { this.dozing = false; this.idleT = 0; if (!this.seated) { this.seated = true; this.onSeatChange?.(true); this.poseDirty = true; } }
    this.playEmote(def.emote);   // body animation (I3) + broadcasts so your partner sees it on your remote sprite
  }
  private faceToward(x: number, y: number): Facing { const dx = x - this.posX, dy = y - this.posY; return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"); }
  // ---- world interactions (Phase I6) ----
  /** Wave/knock at a shop door or sub-map mouth, then run `fn` a beat later (reduced-motion → now). */
  private enterWithWave(fn: () => void) {
    if (this.reduce || this.entryAction) { fn(); return; }
    this.playEmote("wave"); this.entryAction = { at: this.t + 0.55, fn };
  }
  /** Item-get: briefly raise an item overhead (arms up + sparkle). Called on rewards/pickups. */
  present(glyph: string, color = "#ffd24a") { this.presentPose = { glyph, color, t: 1.7 }; }
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
      // a named prop that doesn't exist on this (procedurally-generated) ring — e.g. a
      // campaign asking for a "commons" on a wild shore that rolled a different landmark —
      // falls back to the ring centre so the step is never an unreachable dead end.
      if (t.at) { const p = this.curRing.props.find((x) => x.id === t.at); pos = p ? { x: p.x, y: p.y } : { x: 0, y: 0 }; }
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
    if (q.objectives.some((o) => o.kind === "gather")) this.gatheredWisps = new Set();
    this.toast(`✦ New quest — ${q.name}`);
    this.onQuestChange?.();
  }
  private activeQuest(): QuestDef | null {
    for (const q of allQuests()) if (this.quests[q.id]?.status === "active") return q;
    return null;
  }
  /** Explore Mode: force-complete the active quest (fills objectives + fires the reward). */
  completeActiveQuest(): boolean {
    const q = this.activeQuest(); if (!q) return false;
    const p = this.quests[q.id]; if (!p) return false;
    q.objectives.forEach((o, i) => { p.obj[i] = (o.count ?? 1); });
    this.completeQuest(q);
    return true;
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
    this.sfx("quest");
    this.onQuestComplete?.(q, first);   // page grants the reward (reduced on repeat) + toast
    if (first) this.present("✦", "#ffd24a");   // item-get: raise the reward overhead (I6)
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
      .filter((s) => !s.quest.id.startsWith("ring-") || this.quests[s.quest.id] || s.quest.id.startsWith(`ring-${this.ringIdx}-`) || s.quest.giver === curGiver)
      .map(({ quest, status }) => {
        const p = this.quests[quest.id];
        let objective = quest.objectives[0]?.label ?? "";
        if (status === "active" && p) { const oi = this.currentObjIndex(quest); if (oi >= 0) { const o = quest.objectives[oi]; objective = (o.ring != null && o.ring !== this.ringIdx) ? `Sail to ${ringName(o.ring)} — ${o.label}` : o.label; } else objective = "Return complete"; }
        else if (status === "done") objective = "Complete";
        return { id: quest.id, name: quest.name, status, objective, tier: quest.tier, reward: quest.reward.sparks, renownReward: quest.reward.renown, steps: quest.objectives.length };
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
    if (o.kind === "gather") {   // point to the nearest wisp not yet gathered this quest
      let best: Prop | null = null, bd = 1e9;
      for (const p of this.curRing.props) if (p.t === "wisp" && p.id && !this.gatheredWisps.has(p.id)) { const d = Math.hypot(this.posX - p.x, this.posY - p.y); if (d < bd) { bd = d; best = p; } }
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
      else if (p.t === "shop") out.push({ x: p.x, y: p.y, r: 28 });   // walk around the storefront (F)
      else if (p.t === "home") out.push({ x: p.x, y: p.y, r: 26 });   // walk around your cottage (F)
      else if (p.t === "tree") out.push({ x: p.x, y: p.y + 2, r: p.big ? 13 : 10 });
      else if (p.t === "bush") out.push({ x: p.x, y: p.y, r: 7 });
      else if (p.t === "log") out.push({ x: p.x, y: p.y, r: 11 });     // a chunky maze wall
      else if (p.t === "stump") out.push({ x: p.x, y: p.y, r: 6 });
      else if (p.t === "rock") out.push({ x: p.x, y: p.y, r: p.big ? 12 : 8 });
      else if (p.t === "pond") out.push({ x: p.x, y: p.y, r: (p.r ?? 20) - 2 });
      else if (p.t === "fence") out.push({ x: p.x, y: p.y, r: 9 });
      else if (p.t === "shrine") out.push({ x: p.x, y: p.y, r: 16 });
      else if (p.t === "theater") out.push({ x: p.x, y: p.y - 4, r: 20 });
      else if (p.t === "gathering") out.push({ x: p.x, y: p.y - 2, r: 11 });
      else if (p.t === "landmark") out.push({ x: p.x, y: p.y, r: p.lm === "waterfall" || p.lm === "stonecircle" ? 20 : 12 });   // walk around the set-piece base (J4)
    }
    // solid décor on CIRQLSPACE/Home — yours, or the host's while you visit (Phase B / E / F)
    if (this.canDecorate()) for (const d of this.curDecorList()) {
      const def = decorById[d.item]; const r = def?.render;
      if (!r || !DECOR_SOLID[r]) continue;
      const rad = r === "tree" ? (def!.big ? 13 : 10) : r === "stone" ? (def!.big ? 12 : 7) : r === "pond" ? 20 : r === "bush" ? 7 : 9;
      out.push({ x: d.x, y: d.y, r: rad });
    }
    return out;
  }
  // ---- branching dialog framework (K1) ----
  private setDialog(name: string, accent: string, tree: DialogTree) { this.dialog = { name, accent, tree, nodeId: tree.start, i: 0 }; }
  private dialogNode() { return this.dialog ? this.dialog.tree.nodes[this.dialog.nodeId] : null; }
  /** Play a choice at the current node: accept a quest, jump to another node, or close. */
  private pickChoice(idx: number) {
    const d = this.dialog, node = this.dialogNode(); if (!d || !node?.choices) return;
    const c: DialogChoice | undefined = node.choices[idx]; if (!c) return;
    if (c.accept) { const id = c.accept; this.dialog = null; this.acceptQuest(id); }
    else if (c.goto && d.tree.nodes[c.goto]) { d.nodeId = c.goto; d.i = 0; }
    else this.dialog = null;   // plain choice → end the chat
  }
  private hitChoice(x: number, y: number) { return this.dialogChoiceRects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h); }
  private doInteract() {
    if (this.dialog) {
      const node = this.dialogNode();
      if (node && this.dialog.i < node.lines.length - 1) { this.dialog.i++; return; }   // read the next line
      if (node && node.choices && node.choices.length) return;                          // wait for a choice pick (tap)
      this.dialog = null; return;                                                       // a plain node ends on E
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
    if (p.t === "landmark") {   // a focal set-piece — a meeting spot + (later) a quest home (J4)
      const flavor: Record<string, string> = { greattree: "The Great Tree — older than the ring itself.", stonecircle: "The Stone Circle hums with a quiet, ancient charge.", lighthouse: "The Lighthouse sweeps the dark water for wanderers.", crystal: "The Great Crystal glows from somewhere deep within.", waterfall: "The Falls thunder into a cool, misted pool.", ruin: "The Old Ruin keeps the secrets of who built it." };
      this.toast(`${p.label || "A landmark"} · ${flavor[p.lm || ""] || "A memorable place."}`);
      return;
    }
    if (p.t === "theater") { const m = this.nowShowing(); this.setDialog("Cirql Drive-In", "#7fd0ff", simpleDialog([`Now showing: "${m.title}"`, m.tagline, "Pull up a bench and stay a while."])); return; }
    if (p.t === "lantern" && p.id) { if (this.currentObjKind() === "lightLanterns" && !this.litForQuest.has(p.id)) { this.litForQuest.add(p.id); this.advanceObjective("lightLanterns"); this.onQuestChange?.(); } }
    else if (p.t === "wonders") { this.advanceObjective("enterWonders"); this.sfx("enter"); this.enterWithWave(() => this.onInteract?.("wonders", p)); }   // wave/knock at the arcade doors (I6)
    else if (p.t === "shop") { if (typeof p.to === "number") { const to = p.to; this.sfx("enter"); this.enterWithWave(() => this.sailTo(to)); } }   // walk into a storefront → its interior (F)
    else if (p.t === "home") { if (typeof p.to === "number") { const to = p.to; this.sfx("enter"); this.enterWithWave(() => this.sailTo(to)); } }   // walk into your cottage → the Home interior (F)
    else if (p.t === "npc" && p.shopId) { this.sfx("talk"); this.onInteract?.("shopkeeper", p); }   // shop keeper → open the store (F)
    else if (p.t === "npc") { this.sfx("talk"); this.openNpcDialog(p); this.onInteract?.("npc", p); }
    else if (p.t === "dock") {
      const to = p.to ?? -1;
      if (to < 0) this.toast("Only open sea lies inward from the Hearth.");
      else { this.onInteract?.("dock", p); this.sailTo(to); }
    }
    else if (p.t === "storm") { if (typeof p.to === "number") { const to = p.to; this.enterWithWave(() => this.startTornado(to)); } }   // brave the storm → tornado sweep into the sky (F)
    else if (p.t === "tunnel") { if (typeof p.to === "number") { const to = p.to; this.sfx("enter"); this.enterWithWave(() => this.sailTo(to)); } }   // duck into a burrow → the tunnel (F)
    else if (p.t === "portal") { if (typeof p.to === "number") { const to = p.to, end = p.end ?? null; this.sfx(p.sub === "up" ? "leave" : "enter"); this.enterWithWave(() => { this.exitEnd = end; this.sailTo(to); }); } }   // sub-map mouth / tunnel exit (carries which mouth to emerge from)
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
    this.setDialog(p.label || "Runestone", "#b26cff", simpleDialog(q ? q.intro : ["The carving has worn away."], notTaken ? "sunken-runes" : undefined));
  }
  private openNpcDialog(p: Prop) {
    const npcId = p.id || "";
    const accent = p.accent || this.curRing.palette.accent;
    const name = p.label || "Ferra";
    // an "interact" objective aimed at this NPC advances on talk
    this.advanceObjective("interact", npcId);
    // a quest this keeper can offer (fresh, or a repeatable re-offer for a slighter reward)
    const fresh = offerableQuest(npcId, this.quests);
    const offer = fresh || repeatableQuest(npcId, this.quests);
    const active = this.activeQuest();
    // named cast (Phase K2) speak with their own voice + system-teaching topics; unnamed
    // wilderness keepers fall back to a generic, place-aware conversation.
    const prof = npcProfile(npcId);
    const greeting = prof ? prof.greeting
      : active && active.giver === npcId ? [`You're still on the trail — ${active.name.toLowerCase()}.`]
        : [`Well met on ${this.curRing.name}.`];
    const lore = prof ? prof.lore
      : ["The onward dock lies to the south; the fog thins the farther you sail.", "Each ring out is older, stranger — and pays a wanderer more."];
    this.setDialog(name, accent, npcConversation({ greeting, lore, loreLabel: prof?.loreLabel, topics: prof?.topics, questIntro: offer?.intro, questId: offer?.id, repeat: offer ? !fresh : false }));
  }

  // ---------- update ----------
  protected update(dt: number) {
    this.t += dt;
    // diorama beauty shot (Phase H3): freeze the sim, sweep in, and slowly orbit the model
    if (this.diorama) { this.dioramaT = Math.min(1, this.dioramaT + dt * 1.4); if (!this.reduce) this.dioramaAng += dt * 0.2; this.updateFx(dt); return; }
    this.msgT = Math.max(0, this.msgT - dt);
    this.arriveT = Math.max(0, this.arriveT - dt);
    // fake-Z hop physics (CHR-263) — always settles, independent of movement
    if (this.jumpZ > 0 || this.jumpVel !== 0) { this.jumpVel -= 260 * dt; this.jumpZ += this.jumpVel * dt; if (this.jumpZ <= 0) { this.jumpZ = 0; this.jumpVel = 0; } }
    // land squash + puff (I2) — fires the frame you touch down after a hop
    const air = this.jumpZ > 0.5;
    if (this.wasAir && !air) { this.squashT = 0.18; if (!this.reduce) this.spawnGroundFx(this.posX, this.posY, "dust"); }
    this.wasAir = air;
    // decay movement-juice timers + age the ground FX (I2)
    this.squashT = Math.max(0, this.squashT - dt); this.bumpT = Math.max(0, this.bumpT - dt);
    // paired social gesture (I4) — ends on its timer, or if your partner drifts away
    if (this.pair) { this.pair.t -= dt; const r = this.remotes.get(this.pair.withId); if (this.pair.t <= 0 || !r || Math.hypot(this.posX - r.x, this.posY - r.y) > 64) this.pair = null; }
    // world interactions (I6): fire a delayed shop/sub-map entry after the wave; decay the present pose
    if (this.entryAction && this.t >= this.entryAction.at) { const f = this.entryAction.fn; this.entryAction = null; f(); }
    if (this.presentPose) { this.presentPose.t -= dt; if (this.presentPose.t <= 0) this.presentPose = null; }
    // cold-biome breath puff (I5) — a little cloud drifts from the face every couple of seconds
    if (this.isCold() && !this.reduce && !this.dialog && !this.cs) {
      if ((this.breathT -= dt) <= 0) {
        this.breathT = 1.7 + Math.random() * 1.3;
        const fdx = this.facing === "left" ? -4 : this.facing === "right" ? 4 : 0, fdy = this.facing === "up" ? -2 : 2;
        this.spawnGroundFx(this.posX + fdx, this.posY - 18 + fdy, "puff");
      }
    }
    if (this.groundFx.length) { for (const f of this.groundFx) f.life -= dt; if (this.groundFx.some((f) => f.life <= 0)) this.groundFx = this.groundFx.filter((f) => f.life > 0); }
    // live-zoom easing (Phase H2)
    if (Math.abs(this.zoom - this.zoomTarget) > 0.001) this.zoom += (this.zoomTarget - this.zoom) * Math.min(1, dt * 10); else this.zoom = this.zoomTarget;

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
      // idle blink (I1) — each remote blinks on its own cadence
      if (r.blinking > 0) r.blinking -= dt; else if ((r.blinkT -= dt) <= 0) { r.blinking = 0.11; r.blinkT = 2.4 + Math.random() * 3.4; }
    }

    // ---- idle life for the hero (Phase I1): breathe, blink, fidget, doze ----
    if (this.blinking > 0) this.blinking -= dt; else if ((this.blinkT -= dt) <= 0) { this.blinking = 0.11; this.blinkT = 2.4 + Math.random() * 3.2; }
    const busy = !!this.dialog || !!this.cs || this.voyage || this.editDecor || this.editPaint || this.mapOpen;
    const still = this.walk <= 0 && !busy && this.jumpZ <= 0;   // standing OR sitting still (not actively doing anything)
    if (still) {
      this.idleT += dt;
      if (this.fidget) { this.fidget.t -= dt; if (this.fidget.t <= 0) this.fidget = null; }
      else if (this.idleT > 3.5 && !this.reduce && !this.seated && (this.nextFidget -= dt) <= 0) {   // fidgets only while standing
        const k = (["lookL", "lookR", "lookU", "stretch"] as const)[Math.floor(Math.random() * 4)];
        this.fidget = { kind: k, t: k === "stretch" ? 0.55 : 0.95 }; this.nextFidget = 3.5 + Math.random() * 4.5;
      }
      // AFK doze after 30s idle → drift off to sleep (auto-sit if still standing)
      if (this.idleT > 30 && !this.dozing) { this.dozing = true; if (!this.seated) { this.seated = true; this.poseDirty = true; this.onSeatChange?.(true); } }
    } else {
      this.idleT = 0; this.fidget = null; this.nextFidget = 3.5;
      if (this.dozing) { this.dozing = false; this.standUp(); }   // wake from the doze on any activity
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
    if (this.tornado) {
      const tn = this.tornado; tn.t += dt;
      tn.progress = Math.min(1, tn.t / (this.reduce ? 0.4 : 3.4));
      if ((justDown || this.pressed.a) && tn.progress > 0.12) { this.endTornado(); return; }   // tap / E skips
      if (tn.progress >= 1) { this.endTornado(); return; }
      return;
    }
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

    // full-screen sea chart: once fast travel is unlocked (reached ring 5), a tap on a
    // charted ring leaps you there; any other tap (or E) closes it.
    if (this.mapOpen) {
      if (justDown) {
        const px = this.pointer.x, py = this.pointer.y;
        const bi = this.chartBtn("in"), bo = this.chartBtn("out");
        if (Math.hypot(px - bi.x, py - bi.y) < bi.r + 3) { this.chartZoom = Math.min(3, this.chartZoom * 1.35); }         // zoom in (spread rings)
        else if (Math.hypot(px - bo.x, py - bo.y) < bo.r + 3) { this.chartZoom = Math.max(0.6, this.chartZoom / 1.35); }  // zoom out (fit more)
        else {
          const g = this.chartGeom, here = isSubMap(this.ringIdx) ? parentOf(this.ringIdx) : this.ringIdx;
          let travelled = false;
          if (g && this.fastTravelReady()) {
            const d = Math.hypot(px - g.cx, py - g.cy), i = Math.round(d / g.step) - 1;
            if (i >= 0 && i < this.knownRings() && i !== here && Math.abs(d - g.step * (i + 1)) < g.step * 0.62) {
              this.mapOpen = false; this.moveTarget = null; this.doSail(i); travelled = true;
            }
          }
          if (!travelled) this.mapOpen = false;
        }
      } else if (this.pressed.a) this.mapOpen = false;
      this.camX += ((this.posX - this.LW / 2) - this.camX) * Math.min(1, dt * 8);
      this.camY += ((this.posY - this.LH / 2) - this.camY) * Math.min(1, dt * 8);
      return;
    }

    // interact edge (Space / E map to "a"); also used to advance dialog
    if (this.pressed.a) this.doInteract();

    // dialog taps (K1): tap a branching choice to pick it; tap elsewhere advances/closes lines
    if (this.dialog && justDown) {
      const node = this.dialogNode(), atEnd = !node || this.dialog.i >= node.lines.length - 1;
      if (atEnd && node?.choices?.length) { const idx = this.hitChoice(this.pointer.x, this.pointer.y); if (idx >= 0) this.pickChoice(idx); }
      else if (node) { if (this.dialog.i < node.lines.length - 1) this.dialog.i++; else this.dialog = null; }
      return;
    }

    // tapping the corner minimap opens the chart (consumes the tap — not a move)
    const tapMap = justDown && !this.dialog && this.inMinimap(this.pointer.x, this.pointer.y);
    if (tapMap) { this.mapOpen = true; this.moveTarget = null; }
    // tapping the online badge (top-left) → the page shows who's here (consumes the tap)
    const tapOnline = justDown && !this.dialog && !this.editDecor && !this.editPaint && this.inOnline(this.pointer.x, this.pointer.y);
    if (tapOnline) { this.onOnlineTap?.(); this.moveTarget = null; }

    // décor edit (CHR-259): a tap places the selected item / removes the nearest one
    const tapEdit = this.editDecor && justDown && !tapMap && !this.dialog;
    if (tapEdit) {
      const wx = this.pointer.x + this.camX, wy = this.pointer.y + this.camY;
      const list = isHome(this.ringIdx) ? this.homeDecor : this.decor;   // place into the active space (F)
      if (this.editSel) {
        const rr = Math.hypot(wx, wy), lim = this.effR() * 0.82;
        let px = rr > lim ? (wx / rr) * lim : wx, py = rr > lim ? (wy / rr) * lim : wy;
        if (this.snapGrid) { px = Math.round(px / 20) * 20; py = Math.round(py / 20) * 20; }   // grid snap (CHR-273)
        if (list.length < 120) { list.push({ item: this.editSel, x: Math.round(px), y: Math.round(py) }); this.onDecorChange?.(); }
      } else {
        let bi = -1, bd = 22 * 22;
        for (let i = 0; i < list.length; i++) { const dd = (list[i].x - wx) ** 2 + (list[i].y - wy) ** 2; if (dd < bd) { bd = dd; bi = i; } }
        if (bi >= 0) { list.splice(bi, 1); this.onDecorChange?.(); }
      }
      this.moveTarget = null;
    }

    // terrain paint (Phase C): drag to paint tiles; persist once per stroke on release
    if (this.editPaint && this.pointer.down && !tapMap && !this.dialog && !this.inMinimap(this.pointer.x, this.pointer.y)) {
      this.paintAt(this.pointer.x + this.camX, this.pointer.y + this.camY);
      this.moveTarget = null;
    }
    if (this.paintStroke && !this.pointer.down) { this.paintStroke = false; this.onDecorChange?.(); }

    // movement is frozen while a dialog is open or the chart is up
    if (!this.dialog && !tapMap && !tapOnline) {
      if (this.pointer.down && !this.inMinimap(this.pointer.x, this.pointer.y) && !this.inOnline(this.pointer.x, this.pointer.y) && !this.editDecor && !this.editPaint) this.moveTarget = this.screenToWorld(this.pointer.x, this.pointer.y);
      let dx = (this.btn.right ? 1 : 0) - (this.btn.left ? 1 : 0);
      let dy = (this.btn.down ? 1 : 0) - (this.btn.up ? 1 : 0);
      if (dx || dy) this.moveTarget = null;
      if (this.moveTarget) {
        const ddx = this.moveTarget.x - this.posX, ddy = this.moveTarget.y - this.posY, d = Math.hypot(ddx, ddy);
        if (d > 4) { dx = ddx / d; dy = ddy / d; } else this.moveTarget = null;
      }
      const mag = Math.hypot(dx, dy) || 1; dx /= mag; dy /= mag;
      const moving = (this.btn.right || this.btn.left || this.btn.up || this.btn.down || !!this.moveTarget);
      if (moving && this.seated) this.standUp();   // any movement input stands you up (Phase H1)
      const spd = this.btn.b ? 118 : 80;
      const tvx = moving ? dx * spd : 0, tvy = moving ? dy * spd : 0;
      // ice-slide (I5): a winter ring is slippery — you build up + glide out of speed (low friction)
      const fr = this.isCold() ? (moving ? 7 : 2.2) : 16;
      this.vx += (tvx - this.vx) * Math.min(1, dt * fr);
      this.vy += (tvy - this.vy) * Math.min(1, dt * fr);
      if (moving) this.facing = Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? "down" : "up") : (dx > 0 ? "right" : "left");
      const preX = this.posX, preY = this.posY;
      this.posX += this.vx * dt; this.posY += this.vy * dt;

      // painted water tiles are non-walkable (Phase C) — slide back out (per axis for a smooth edge)
      if (this.ringIdx === 0 && !this.editPaint && this.curTerrain().size && this.tileAtWorld(this.posX, this.posY) === "w") {
        if (this.tileAtWorld(this.posX, preY) !== "w") this.posY = preY;
        else if (this.tileAtWorld(preX, this.posY) !== "w") this.posX = preX;
        else { this.posX = preX; this.posY = preY; }
      }

      // solid props — push the player out of them; bumping one gives a little recoil + puff (I2)
      for (const s of this.solids()) {
        const ox = this.posX - s.x, oy = this.posY - s.y, d = Math.hypot(ox, oy);
        const min = s.r + 5;
        if (d < min && d > 0.001) {
          const k = min / d; this.posX = s.x + ox * k; this.posY = s.y + oy * k;
          if (moving && this.bumpT <= 0) { this.bumpT = 0.16; if (!this.reduce) this.spawnGroundFx(this.posX, this.posY, "dust"); }
        }
      }
      // island edge — keep the player on the (tier-limited) land
      const rr = Math.hypot(this.posX, this.posY), lim = this.effR() * 0.9;
      if (rr > lim) { this.posX = this.posX / rr * lim; this.posY = this.posY / rr * lim; }

      this.walk = Math.hypot(this.vx, this.vy) > 8 ? this.walk + dt * 10 : 0;

      // footstep FX (I2): a step mark each stride — splash on water, prints on sand, dust otherwise
      if (moving && !this.seated && this.walk > 0) {
        if ((this.stepT -= dt) <= 0) {
          this.stepFoot = -this.stepFoot; this.stepT = this.btn.b ? 0.17 : 0.26;
          // ground the step marks: ring-0 uses painted tiles; other rings use the biome ground (I5)
          let kind: "dust" | "splash" | "print" | "snow" | "ash";
          if (this.ringIdx === 0) { const t = this.tileAtWorld(this.posX, this.posY); kind = t === "w" ? "splash" : t === "s" ? "print" : "dust"; }
          else { const g = this.groundKind(); kind = g === "snow" ? "snow" : g === "sand" ? "print" : g === "ash" ? "ash" : "dust"; }
          // coast/tropical shallows: near the shore, a wading splash instead of a footprint (I5)
          if (this.ringIdx > 0 && (this.curRing.ambient === "gull" || this.curRing.ambient === "dragonfly") && Math.hypot(this.posX, this.posY) > this.effR() * 0.74) kind = "splash";
          const off = this.facing === "left" || this.facing === "right" ? 0 : this.stepFoot * 3;
          if (kind === "print" || kind === "snow" || !this.reduce) this.spawnGroundFx(this.posX + off, this.posY + 1, kind, this.stepFoot);
        }
      } else this.stepT = 0;

      // nearest interactable in range (incl. unlit quest lanterns during The Lantern Path)
      this.near = null; let best = 1e9;
      for (const p of this.curRing.props) {
        const isQL = this.isQuestLantern(p);
        const puzzle = p.t === "rune" || p.t === "tablet" || p.t === "shrine";
        const social = p.t === "gathering" || p.t === "theater" || p.t === "landmark";
        if (p.t !== "wonders" && p.t !== "shop" && p.t !== "home" && p.t !== "storm" && p.t !== "tunnel" && p.t !== "npc" && p.t !== "dock" && p.t !== "portal" && !isQL && !puzzle && !social) continue;
        const d = Math.hypot(this.posX - p.x, this.posY - p.y);
        const range = p.t === "landmark" ? 52 : p.r ?? (isQL || p.t === "rune" ? 26 : 40);
        if (d < range && d < best) { best = d; this.near = p; }
      }
      // a nearby live traveller wins the E prompt if closer than any prop → "share a light"
      this.nearPlayer = null;
      for (const [id, r] of Array.from(this.remotes.entries())) {
        const d = Math.hypot(this.posX - r.x, this.posY - r.y);
        if (d < 30 && d < best) { best = d; this.nearPlayer = { id, name: r.name }; this.near = null; }
      }
      // tell the page when the nearby traveller changes → it shows/hides the "Together" panel (I4)
      if ((this.nearPlayer?.id ?? null) !== this.lastNearId) { this.lastNearId = this.nearPlayer?.id ?? null; this.onNearPlayer?.(this.nearPlayer); }

      // "reach"/"deliver" objectives complete automatically by walking onto the target
      const tgt = this.objTargetProp();
      if (tgt && Math.hypot(this.posX - tgt.x, this.posY - tgt.y) < (tgt.r ?? 26)) { this.advanceObjective("reach", tgt.id); this.advanceObjective("deliver", tgt.id); }
      // "gather" quest: walk over a wisp to collect it (Phase K3)
      if (this.currentObjKind() === "gather") {
        for (const p of this.curRing.props) {
          if (p.t === "wisp" && p.id && !this.gatheredWisps.has(p.id) && Math.hypot(this.posX - p.x, this.posY - p.y) < 15) {
            this.gatheredWisps.add(p.id); this.advanceObjective("gather"); this.onQuestChange?.(); this.sfx("wisp");
            if (!this.reduce) this.spawnGroundFx(p.x, p.y - 4, "puff");   // a little sparkle poof
            break;   // one per frame
          }
        }
      }
    }

    // living creatures react to you (shy/curious fauna) — stateful, per sim step
    this.ensureCreatures(); this.updateCreatures(dt);

    // camera easing
    this.camX += ((this.posX - this.LW / 2) - this.camX) * Math.min(1, dt * 8);
    this.camY += ((this.posY - this.LH / 2) - this.camY) * Math.min(1, dt * 8);

    // throttled autosave hook
    if (this.t - this.lastSent > 1.2 && (Math.abs(this.posX - this.lastX) > 3 || Math.abs(this.posY - this.lastY) > 3)) {
      this.onLocalMove?.(this.ringIdx, Math.round(this.posX), Math.round(this.posY));
      this.lastX = this.posX; this.lastY = this.posY; this.lastSent = this.t;
    }

    // fast presence broadcast — when the position moved, or the sit pose changed (Phase H1)
    if (this.t - this.lastPresence > 0.09) {
      if (Math.abs(this.posX - this.lastPx) > 0.6 || Math.abs(this.posY - this.lastPy) > 0.6 || this.poseDirty) {
        this.onPresence?.(this.ringIdx, Math.round(this.posX), Math.round(this.posY), this.facing, this.seated ? "sit" : "stand");
        this.lastPx = this.posX; this.lastPy = this.posY; this.poseDirty = false;
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
    this.ui.length = 0; this.uiZoom = false;   // reset the smooth-text queue for this frame
    if (this.tornado) { this.drawTornado(); this.drawFx(); return; }   // the storm sweep owns the screen (F)
    if (this.voyage) { this.drawVoyage(); this.drawFx(); return; }   // the sailing crossing owns the screen
    if (this.diorama) { this.drawDiorama(); this.drawFx(); return; }   // the beauty shot owns the screen (Phase H3)
    const b = this.b, s = this.SS, W = this.LW * s, H = this.LH * s, pal = this.curRing.palette;
    const dn = this.dayNight();   // day/night cycle (J3/J5)
    this.nightAmt = dn.night;     // per-object neon glow "breathes" up at night (biome kit)
    // sky/sea backdrop
    const g = b.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, pal.sky[0]); g.addColorStop(0.5, pal.sky[1]); g.addColorStop(1, pal.sea);
    b.fillStyle = g; b.fillRect(0, 0, W, H);
    // stars come out at night (deterministic, upper sky only)
    if (dn.night > 0.05) {
      for (let i = 0; i < 46; i++) {
        const sx = ((i * 137) % this.LW), sy = ((i * 89) % Math.round(this.LH * 0.55));
        const tw = 0.5 + 0.5 * Math.sin(this.t * 2 + i * 1.3);
        b.fillStyle = hexA("#eaf2ff", dn.night * (0.35 + tw * 0.4) * (0.6 + (i % 3) * 0.2));
        b.fillRect(sx * s, sy * s, (i % 4 === 0 ? 2 : 1) * s, (i % 4 === 0 ? 2 : 1) * s);
      }
    }
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

    // live zoom (Phase H2): scale the whole world pass around screen-centre; the sky/sea
    // backdrop above stays full-frame. Restored before the HUD/overlays (screen space).
    const zoomed = this.zoom !== 1;
    if (zoomed) { const fx = this.LW / 2 * s, fy = this.LH / 2 * s; b.save(); b.translate(fx, fy); b.scale(this.zoom, this.zoom); b.translate(-fx, -fy); }
    this.uiZoom = true;   // labels queued now are inside the zoom → onOverlay scales them to match

    // island landmass — grows with the land tier on CIRQLSPACE (Phase D)
    const R = this.effR();
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
    // groundcover (Phase J3): deterministic per-biome texture so the ground is never bald
    if (this.ringIdx !== 0) this.drawGroundcover(scx, scy, R);
    // faint path ring
    b.strokeStyle = "rgba(255,220,150,0.10)"; b.lineWidth = 20 * s;
    b.beginPath(); b.arc(scx * s, scy * s, R * 0.42 * s, 0, TAU); b.stroke();

    // painted terrain — the base ground layer under everything (Phase C, CIRQLSPACE only)
    if (this.ringIdx === 0 && this.curTerrain().size) this.drawTerrain(camX, camY);
    if (this.groundFx.length) this.drawGroundFx(camX, camY);   // footstep/land FX on the ground (I2)
    // ground decoration — paths + ponds, under the depth-sorted props
    for (const p of this.curRing.props) if (p.t === "path") this.drawPath(p.x - camX, p.y - camY);
    for (const p of this.curRing.props) if (p.t === "pond") this.drawPond(p.x - camX, p.y - camY, p.r ?? 22);
    // ground-layer décor (paths walk on, ponds walk around) — CIRQLSPACE / Home (Phase B / F)
    if (this.canDecorate()) for (const d of this.curDecorList()) {
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
        case "shop": draws.push({ y: p.y + 22, f: () => this.drawShop(sxp, syp, p) }); break;
        case "home": draws.push({ y: p.y + 22, f: () => this.drawHome(sxp, syp, p) }); break;
        case "storm": draws.push({ y: p.y + 30, f: () => this.drawStorm(sxp, syp, p) }); break;
        case "tunnel": draws.push({ y: p.y, f: () => this.drawTunnel(sxp, syp, p) }); break;
        case "npc": draws.push({ y: p.y, f: () => this.drawNpc(sxp, syp, p) }); break;
        case "tree": draws.push({ y: p.y, f: () => this.drawTree(sxp, syp, p.big, this.canopyStyle(p.x, p.y), this.seedOf(p.x, p.y)) }); break;
        case "bush": draws.push({ y: p.y, f: () => this.drawBush(sxp, syp) }); break;
        case "fern": draws.push({ y: p.y, f: () => this.drawFern(sxp, syp) }); break;
        case "fairyring": draws.push({ y: p.y, f: () => this.drawFairyRing(sxp, syp) }); break;
        case "log": draws.push({ y: p.y, f: () => this.drawLog(sxp, syp, this.seedOf(p.x, p.y)) }); break;
        case "stump": draws.push({ y: p.y, f: () => this.drawStump(sxp, syp) }); break;
        case "tallgrass": draws.push({ y: p.y, f: () => this.drawTallgrass(sxp, syp, this.seedOf(p.x, p.y)) }); break;
        case "crystal": draws.push({ y: p.y, f: () => this.drawCrystal(sxp, syp, p.big, p.accent || pal.accent) }); break;
        case "rock": draws.push({ y: p.y, f: () => this.drawRock(sxp, syp, p.big) }); break;
        case "flower": draws.push({ y: p.y, f: () => this.drawFlower(sxp, syp, p.accent || "#ff8fbf") }); break;
        case "wisp": if (!(p.id && this.gatheredWisps.has(p.id))) draws.push({ y: p.y, f: () => this.drawWisp(sxp, syp, p.accent || "#e0ffb0") }); break;
        case "fence": draws.push({ y: p.y, f: () => this.drawFence(sxp, syp, !!p.vert) }); break;
        case "lantern": { const isQ = !!p.id && this.currentObjKind() === "lightLanterns"; const litState = isQ ? this.litForQuest.has(p.id!) : true; draws.push({ y: p.y, f: () => this.drawLantern(sxp, syp, pal.accent, litState) }); break; }
        case "dock": draws.push({ y: p.y - 40, f: () => this.drawDock(sxp, syp, p) }); break;
        case "portal": draws.push({ y: p.y, f: () => this.drawPortal(sxp, syp, p) }); break;
        case "landmark": draws.push({ y: p.y, f: () => this.drawLandmark(sxp, syp, p) }); break;
        case "tablet": draws.push({ y: p.y, f: () => this.drawTablet(sxp, syp, this.near === p) }); break;
        case "rune": { const rl = !!p.id && this.lit.has(p.id); const rn = this.near === p; draws.push({ y: p.y, f: () => this.drawRune(sxp, syp, rl, rn) }); break; }
        case "shrine": draws.push({ y: p.y + 8, f: () => this.drawShrine(sxp, syp, this.puzzleSolved()) }); break;
        case "gathering": draws.push({ y: p.y, f: () => this.drawGathering(sxp, syp, p) }); break;
        case "theater": draws.push({ y: p.y + 6, f: () => this.drawTheater(sxp, syp, p) }); break;
        case "marker": { const isTarget = this.objTargetProp() === p; if (isTarget) draws.push({ y: p.y - 1, f: () => this.drawMarker(sxp, syp) }); break; }
        default: break;
      }
    }
    // Placed décor (CHR-259 / F) — your CIRQLSPACE pieces, your Home furniture, or a host's while visiting
    if (this.canDecorate()) {
      const list = this.curDecorList();
      const pacc = this.curRing.palette.accent;
      for (const d of list) {
        const def = decorById[d.item]; if (!def) continue;
        const sx = d.x - camX, sy = d.y - camY, r = def.render ?? "glyph";
        if (r === "path" || r === "pond") continue;                                             // ground pass
        else if (r === "stone") draws.push({ y: d.y, f: () => this.drawRock(sx, sy, def.big) });
        else if (r === "fence") draws.push({ y: d.y, f: () => this.drawFence(sx, sy, false) });
        else if (r === "tree") draws.push({ y: d.y, f: () => this.drawTree(sx, sy, def.big, this.canopyStyle(d.x, d.y), this.seedOf(d.x, d.y)) });
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

    // paired social gesture (I4) — a shared flourish blooms between you and your partner
    if (this.pair) {
      const r = this.remotes.get(this.pair.withId);
      if (r) this.drawPairFx((this.posX + r.x) / 2 - camX, (this.posY + r.y) / 2 - camY, this.pair.g);
    }

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
      // night fireflies/glowmoths drift out after dusk (J5 ambient expansion)
      if (dn.night > 0.25) for (let i = 0; i < 14; i++) {
        const fx = scx + Math.sin(this.t * 0.5 + i * 2.1) * R * 0.66 + Math.cos(i * 1.7) * 50;
        const fy = scy + Math.cos(this.t * 0.43 + i * 1.3) * R * 0.5 + Math.sin(i * 2) * 40;
        const bl = Math.sin(this.t * 2.4 + i * 1.9); if (bl <= 0.1) continue;
        this.glow(fx, fy, 5, "#c8ff9a", bl * 0.5 * dn.night); this.disc(fx, fy, 1, hexA("#eaffcf", dn.night));
      }
    }

    this.drawFx();
    this.drawAmbient();         // animals/particles INSIDE the zoom → they scale + track the
                               // world (fixes: zoomed out, animals stayed player-size + drifted)
    if (zoomed) b.restore();   // end the zoom transform — HUD/overlays draw in screen space
    this.uiZoom = false;       // HUD + chart labels are screen-space
    // day/night colour grade (J3) — a cool wash at night + a warm one at dawn/dusk. Screen-
    // space, over the world but under the HUD. Softened while building so ring 0 stays clear.
    if (dn.night > 0.01 || dn.twilight > 0.01) {
      const soft = (this.editDecor || this.editPaint) ? 0.5 : 1;
      if (dn.night > 0.01) { b.fillStyle = hexA("#141c40", Math.min(0.42, 0.42 * dn.night) * soft); b.fillRect(0, 0, W, H); }
      if (dn.twilight > 0.01) { b.fillStyle = hexA("#ff8a4a", 0.22 * dn.twilight * soft); b.fillRect(0, 0, W, H); }
    }
    // brightness pref (Settings) — dim or lift the world; HUD text stays crisp (drawn after)
    if (this.brightness < 0.995) { b.fillStyle = hexA("#000000", (1 - this.brightness) * 0.85); b.fillRect(0, 0, W, H); }
    else if (this.brightness > 1.005) { b.fillStyle = hexA("#ffffff", (this.brightness - 1) * 0.4); b.fillRect(0, 0, W, H); }
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
  /** The tornado sweep cinematic (F weather entry) — you're spun up into the sky realm. */
  private drawTornado() {
    const tn = this.tornado!; const W = this.LW, H = this.LH, s = this.SS, b = this.b, pr = tn.progress;
    // brooding stormy sky
    const g = b.createLinearGradient(0, 0, 0, H * s);
    g.addColorStop(0, "#141a2b"); g.addColorStop(0.6, "#212a41"); g.addColorStop(1, "#2c3656");
    b.fillStyle = g; b.fillRect(0, 0, W * s, H * s);
    const cxp = W / 2, vy = H * (0.86 - pr * 0.5);   // the vortex focus rises as you're lifted
    // swirling wind spiral toward the top
    if (!this.reduce) {
      b.strokeStyle = "rgba(200,214,240,0.16)"; b.lineWidth = 1 * s;
      for (let i = 0; i < 10; i++) {
        const ph = tn.t * 3 + i * 0.63, rad = 20 + i * 10 + Math.sin(ph) * 6;
        b.beginPath();
        for (let a = 0; a <= TAU; a += 0.3) { const rr = rad * (1 - a / (TAU * 1.6)); const x = cxp + Math.cos(a + ph) * rr, y = vy + a * 6 + Math.sin(a + ph) * rr * 0.35; if (a === 0) b.moveTo(x * s, y * s); else b.lineTo(x * s, y * s); }
        b.stroke();
      }
      // debris + icy flecks spiralling up the funnel
      for (let i = 0; i < 24; i++) { const ph = tn.t * 4 + i, rr = 8 + (i % 6) * 9, yy = vy + ((i * 37) % 160) - pr * 40, x = cxp + Math.cos(ph) * rr; this.px(Math.round(x), Math.round(yy), i % 4 ? "#dfeaff" : "#aebfe0"); }
      // occasional lightning
      if (Math.sin(tn.t * 6) > 0.7) { b.fillStyle = hexA("#eaf6ff", 0.5); b.fillRect((cxp - 1) * s, 0, 2 * s, vy * s); }
    }
    // you — lifted, spun, shrinking into the funnel (a small stand-in figure; the world hero is camera-bound)
    const hx = cxp + Math.sin(tn.t * 6) * (18 * (1 - pr)), hy = H * 0.82 - pr * (H * 0.52), sc = 1 - pr * 0.7;
    b.save(); b.translate(hx * s, hy * s); b.rotate(Math.sin(tn.t * 7) * 0.5 + pr * 6); b.scale(sc * s, sc * s);
    b.fillStyle = "#0a071440"; b.fillRect(-5, 7, 10, 2);
    b.fillStyle = this.hero.body || "#e2544f"; b.fillRect(-4, -2, 8, 9);
    b.fillStyle = this.hero.skin || "#f4c79a"; b.fillRect(-3, -9, 6, 6);
    b.fillStyle = this.hero.hat || "#33b0e0"; b.fillRect(-4, -11, 8, 2);
    b.restore();
    // whiteout as you burst up into the clouds
    if (pr > 0.8) { b.fillStyle = hexA("#eef4ff", (pr - 0.8) / 0.2); b.fillRect(0, 0, W * s, H * s); }
    // HUD
    this.q(W / 2, this.itop() + 8, "Swept into the storm!", "#eaf6ff", 1.2, "c", true);
    this.q(W / 2, H - this.ibot() - 12, `up to ${tn.destName} · tap to skip`, "#c8d4f0", 0.82, "c", false, 0.8);
  }

  // ---------- props ----------
  // A small folded-legs cushion drawn under a seated avatar so a lowered sprite clearly
  // reads as sitting (Phase H1). Kept neutral so it flatters any avatar's palette.
  private seatLegs(cx: number, feet: number) {
    this.rect(cx - 5, feet, 10, 2, "#241d38");     // crossed legs
    this.rect(cx - 4, feet + 2, 8, 1, "#1a1530");
  }
  private drawHero(cx: number, cy: number) {
    const walkBob = (!this.seated && this.walk > 0) ? Math.round(Math.sin(this.walk)) : 0;
    const z = Math.round(this.jumpZ);
    const sit = this.seated ? 3 : 0;   // settle the sprite down when seated (Phase H1)
    // idle life (I1): a gentle breath, a look-around/stretch fidget, a blink
    const idle = this.idleT > 0.5 && !this.seated && this.walk <= 0;
    const breath = (idle && !this.reduce) ? Math.round(Math.sin(this.t * 1.7) * 0.8) : 0;
    const stretch = this.fidget?.kind === "stretch" ? -Math.round(Math.sin((1 - Math.max(0, this.fidget.t) / 0.55) * Math.PI) * 2) : 0;
    const face: Facing = this.fidget?.kind === "lookL" ? "left" : this.fidget?.kind === "lookR" ? "right" : this.fidget?.kind === "lookU" ? "up" : this.facing;
    const presentBob = (this.presentPose && !this.reduce) ? -Math.abs(Math.round(Math.sin(this.t * 8) * 2)) : 0;   // item-get hop (I6)
    const bob = walkBob + this.emoteBob(this.myEmoteT > 0 ? this.myEmote : "") - z + sit + breath + stretch + presentBob;
    // biome movement flavor (I5): a shiver in the cold; an aura that flutters on the biome wind
    const shiver = (this.isCold() && !this.reduce && this.walk <= 0) ? Math.round(Math.sin(this.t * 22) * 0.5) : 0;
    const wind = this.windAmt();
    // aura glow (cosmetic) behind the figure — drifts downwind (I5)
    const aura = this.hero.aura && AURA_COLORS[this.hero.aura];
    if (aura) this.glow(cx + wind, cy - 12 - z, 20, aura, this.reduce ? 0.4 : 0.32 + 0.1 * Math.sin(this.t * 2.5));
    this.disc(cx, cy + 2, this.seated ? 6 : Math.max(2, 4 - this.jumpZ * 0.16), "#0a071460");   // wider contact seated; shrinks as you rise
    this.ring(cx, cy + 2, 6, "#35e0d0", 1.1);       // gentle "you" ring (grounded)
    if (this.seated) this.seatLegs(cx, cy);
    // land squash + collision bump (I2)
    const sq = this.squashT > 0 ? this.squashT / 0.18 : 0;
    const bump = this.bumpT > 0 ? Math.round((this.bumpT / 0.16) * 2) : 0;
    const bdx = bump * (this.facing === "left" ? 1 : this.facing === "right" ? -1 : 0) + shiver;
    const bdy = bump * (this.facing === "up" ? 1 : this.facing === "down" ? -1 : 0);
    // body-gesture transform (I3): bow/twirl/dance-sway tip or spin the whole sprite
    const gx = this.myEmoteT > 0 ? this.emoteXform(this.myEmote, this.myEmoteT) : null;
    const paintBody = () => this.avatar(cx + bdx, cy + bob + bdy, this.hero, face, this.blinking > 0);
    const drawBody = gx ? () => this.withXform(cx, cy, gx, paintBody) : paintBody;
    if (sq > 0) { const b = this.b, s = this.SS; b.save(); b.translate(cx * s, cy * s); b.scale(1 + 0.16 * sq, 1 - 0.24 * sq); b.translate(-cx * s, -cy * s); drawBody(); b.restore(); } else drawBody();
    this.nameTag(cx, cy, this.myName, "#ffd24a");
    if (this.dozing) this.drawZzz(cx + 7, cy - 30 + bob);
    if (this.myEmoteT > 0 && this.myEmote) { this.drawEmoteHands(cx, cy + bob, this.hero, this.myEmote, this.myEmoteT); this.drawEmote(cx, cy, this.myEmote, this.myEmoteT); }
    if (this.presentPose) this.drawPresent(cx, cy + bob, this.presentPose);
    // a carried parcel during a delivery quest (K3) — held in front, over the hands
    if (this.currentObjKind() === "deliver") { const py = cy + bob - 9; this.rect(cx - 3, py, 6, 5, "#b5834a"); this.rect(cx - 3, py, 6, 1, "#cf9c5e"); this.rect(cx - 1, py, 2, 5, "#7a5a30"); this.rect(cx - 3, py + 2, 6, 1, "#7a5a30"); }
    if (this.myChatT > 0 && this.myChat) this.drawBubble(cx, cy, this.myChat, this.myChatT);
  }
  // Item-get "present" pose (I6): both arms raised holding the item overhead, with sparkles.
  private drawPresent(cx: number, cy: number, pr: { glyph: string; color: string; t: number }) {
    const a = pr.t < 0.4 ? pr.t / 0.4 : 1;   // fade out at the end
    const rise = this.reduce ? 0 : Math.round(Math.abs(Math.sin(this.t * 8)) * 1.5);
    // raised arms + hands (like a cheer, reaching up to the item)
    this.rect(cx - 6, cy - 23 - rise, 2, 6, this.hero.body); this.disc(cx - 5, cy - 24 - rise, 2, this.hero.skin);
    this.rect(cx + 4, cy - 23 - rise, 2, 6, this.hero.body); this.disc(cx + 5, cy - 24 - rise, 2, this.hero.skin);
    // the item, glowing, held aloft
    if (!this.reduce) this.glow(cx, cy - 30 - rise, 10, pr.color, 0.35 * a);
    this.disc(cx, cy - 30 - rise, 4, hexA("#0a0714", 0.35 * a));
    this.q(cx, cy - 34 - rise, pr.glyph, "#ffffff", 1.7, "c", false, a);
    // sparkles
    if (!this.reduce) for (let i = 0; i < 3; i++) { const ang = this.t * 3 + i * (TAU / 3); this.q(cx + Math.cos(ang) * 8, cy - 30 - rise + Math.sin(ang) * 6, "✦", pr.color, 0.7, "c", false, a * 0.9); }
  }
  // Rising "z"s over a dozing avatar (I1 AFK doze).
  private drawZzz(cx: number, top: number) {
    const a = (this.t * 0.5) % 1;
    for (let i = 0; i < 3; i++) { const p = (a + i / 3) % 1; this.q(cx + p * 7, top - p * 14, "z", "#cfe6ff", 0.8 + p * 0.7, "c", true, (1 - p) * 0.9); }
  }
  // ---- biome movement profile (Phase I5) — derived from the current ring's signature critter ----
  /** Is this a cold, snowy scene? (winter → breath-puffs, shiver, slippery ice-slide) */
  private isCold() { return this.curRing.ambient === "snow"; }
  /** The ground a footstep marks on this ring: pale snow, tan sand, dark ash, or soft dust. */
  private groundKind(): "snow" | "sand" | "ash" | "grass" {
    const a = this.curRing.ambient;
    if (a === "snow") return "snow";
    if (a === "grasshopper" || a === "gull") return "sand";   // desert + coast
    if (a === "ember") return "ash";
    return "grass";
  }
  // Day/night cycle (Phase J3/J5): a smooth ~10-min loop. `night` (0..1) deepens toward
  // midnight; `twilight` (0..1) peaks at dawn/dusk. Sub-maps + set-piece screens keep their
  // own light. Drives a screen tint, stars, and night fireflies.
  private dayNight(): { night: number; twilight: number } {
    if (isSubMap(this.ringIdx) || this.diorama || this.voyage || this.tornado) return { night: 0, twilight: 0 };
    const ph = ((this.t / 600) + 0.28) % 1, sun = Math.sin(ph * TAU);
    return { night: Math.max(0, -sun), twilight: Math.max(0, 1 - Math.abs(sun) * 3) };
  }
  /** A gentle horizontal biome wind (px) that flutters the aura; stronger on open/hot scenes. */
  private windAmt(): number {
    if (this.reduce) return 0;
    const a = this.curRing.ambient;
    const amp = a === "ember" || a === "gull" || a === "grasshopper" ? 2.4 : 1.2;   // ember/coast/desert breezier
    return Math.round(Math.sin(this.t * 1.3) * amp);
  }
  // World-space ground FX (I2/I5): footstep dust/splash/prints/snow/ash + hop-land puffs + cold breath
  // (all scroll + zoom with the world).
  private spawnGroundFx(x: number, y: number, kind: "dust" | "splash" | "print" | "snow" | "ash" | "puff", foot = 1) {
    if (this.groundFx.length > 40) this.groundFx.shift();
    const max = kind === "snow" ? 2.4 : kind === "print" ? 1.5 : kind === "puff" ? 0.9 : kind === "splash" ? 0.5 : 0.4;
    this.groundFx.push({ x, y, life: max, max, kind, foot });
  }
  private drawGroundFx(camX: number, camY: number) {
    for (const f of this.groundFx) {
      const sx = f.x - camX, sy = f.y - camY, age = 1 - f.life / f.max;
      if (f.kind === "print") this.disc(sx, sy, 1.6, hexA("#5a3d22", Math.min(1, f.life / f.max) * 0.5));
      else if (f.kind === "snow") this.disc(sx, sy, 1.9, hexA("#e6f0ff", Math.min(1, f.life / f.max) * 0.65));   // pressed-snow print, lingers
      else if (f.kind === "ash") this.disc(sx, sy - age * 3, 1.4 + age * 2.6, hexA("#403833", (1 - age) * 0.5));   // dark volcanic dust
      else if (f.kind === "puff") this.disc(sx, sy - age * 11, 1.4 + age * 2, hexA("#dbe8ff", (1 - age) * 0.5));    // rising cold breath
      else if (f.kind === "splash") this.ring(sx, sy, 2 + age * 6, hexA("#bfe6ff", (1 - age) * 0.7), 1);
      else this.disc(sx, sy - age * 3, 1.5 + age * 3, hexA("#d8cdb8", (1 - age) * 0.4));
    }
  }
  private drawRemote(cx: number, cy: number, r: RemotePlayer, inParty = false) {
    const sit = r.seated ? 3 : 0;
    const breath = (!r.seated && r.walk <= 0 && !this.reduce) ? Math.round(Math.sin(this.t * 1.7 + cx * 0.05) * 0.8) : 0;   // idle breath (I1)
    const bob = (!r.seated && r.walk > 0 ? Math.round(Math.sin(r.walk)) : 0) + this.emoteBob(r.emoteT > 0 ? r.emote : "") + sit + breath;
    const aura = r.avatar.aura && AURA_COLORS[r.avatar.aura];
    if (aura) this.glow(cx, cy - 12, 18, aura, this.reduce ? 0.34 : 0.26);
    this.disc(cx, cy + 2, r.seated ? 6 : 4, "#0a071460");
    if (inParty) { this.glow(cx, cy + 2, 12, "#35e0d0", 0.3); this.ring(cx, cy + 2, 7, "#35e0d0", 1.2); }  // party-mate
    const share = this.nearPlayer?.id && this.remotes.get(this.nearPlayer.id) === r;
    if (share) this.ring(cx, cy + 2, 6, "#ffc46b", 1.1);          // highlight the "share a light" target
    if (r.seated) this.seatLegs(cx, cy);
    const gx = r.emoteT > 0 ? this.emoteXform(r.emote, r.emoteT, r.facing) : null;
    const paintBody = () => this.avatar(cx, cy + bob, r.avatar, r.facing, r.blinking > 0);
    if (gx) this.withXform(cx, cy, gx, paintBody); else paintBody();
    this.nameTag(cx, cy, r.name, inParty ? "#a8f5ea" : "#dfe6ff");
    if (r.emoteT > 0 && r.emote) { this.drawEmoteHands(cx, cy + bob, r.avatar, r.emote, r.emoteT); this.drawEmote(cx, cy, r.emote, r.emoteT); }
    if (r.chatT > 0 && r.chat) this.drawBubble(cx, cy, r.chat, r.chatT);
  }
  // The VERTICAL component of an emote's motion (px offset added to the sprite's bob).
  // Body gestures (wave/bow/clap/…) mostly move limbs via emoteXform/drawEmoteHands and
  // add little or no vertical bounce here. Glyph-only + reduced-motion return 0.
  private emoteBob(emote: string): number {
    if (!emote || this.reduce) return 0;
    const m = EMOTE_BY_ID[emote]?.motion;
    if (m === "bob" || m === "sway") return -Math.abs(Math.round(Math.sin(this.t * 9) * 2));   // dance/sing bounce
    if (m === "hop" || m === "cheer" || m === "twirl") { const j = Math.sin(this.t * 6); return j > 0 ? -Math.round(j * 5) : 0; }   // celebrate/flip/cheer/twirl hop
    if (m === "clap") return -Math.abs(Math.round(Math.sin(this.t * 12) * 1));  // tiny clap bob
    if (m === "sit") return 3;                                                  // settle down to rest
    return 0;
  }
  // The avatar TRANSFORM for a body gesture (Phase I3): bow tips forward, twirl spins the
  // sprite (scaleX through −1), dance sways side-to-side. Returns null (no transform) for
  // glyph/overlay-only emotes or reduced-motion. `life` is the emote's remaining seconds.
  private emoteXform(emote: string, life: number, facing: Facing = this.facing): { rot: number; sx: number; sy: number } | null {
    if (!emote || this.reduce) return null;
    const def = EMOTE_BY_ID[emote]; if (!def) return null;
    const total = def.hold ?? EMOTE_SECONDS, age = total - life, m = def.motion;
    if (m === "bow") {
      // one-shot: down over 0.4s, hold, back up — a nod/bow forward
      const d = age < 0.4 ? age / 0.4 : age < 0.9 ? 1 : age < 1.35 ? 1 - (age - 0.9) / 0.45 : 0;
      const lean = facing === "left" ? -0.34 : facing === "right" ? 0.34 : 0;
      return { rot: lean * d, sx: 1, sy: 1 - 0.2 * d };
    }
    if (m === "twirl") {
      // one-shot pirouette: ~2 spins over 1.4s via scaleX = cos(spin)
      const p = Math.min(1, age / 1.4);
      return p < 1 ? { rot: 0, sx: Math.cos(p * TAU * 2), sy: 1 } : null;
    }
    if (m === "sway") return { rot: Math.sin(this.t * 5) * 0.13, sx: 1, sy: 1 };   // dance lean
    return null;
  }
  // Run `fn` inside a transform pivoted about the sprite's feet (cx,cy) — used to tip/spin
  // the avatar for a body gesture without disturbing its ground shadow or name tag.
  private withXform(cx: number, cy: number, gx: { rot: number; sx: number; sy: number }, fn: () => void) {
    const b = this.b, s = this.SS;
    b.save(); b.translate(cx * s, cy * s);
    if (gx.rot) b.rotate(gx.rot);
    if (gx.sx !== 1 || gx.sy !== 1) b.scale(gx.sx, gx.sy);
    b.translate(-cx * s, -cy * s); fn(); b.restore();
  }
  // Painted limb overlays for gestures the transform can't do (Phase I3): a waving hand,
  // two clapping hands, both arms raised in a cheer, a hand-blown kiss + drifting heart.
  // Drawn over the body (feet at cx,cy). Reduced-motion shows a still pose (no oscillation).
  private drawEmoteHands(cx: number, cy: number, cfg: AvatarConfig, emote: string, life: number) {
    const def = EMOTE_BY_ID[emote]; if (!def) return;
    const m = def.motion, skin = cfg.skin, total = def.hold ?? EMOTE_SECONDS, age = total - life;
    const osc = this.reduce ? 0.5 : (Math.sin(this.t * 9) + 1) / 2;   // 0..1 wobble
    if (m === "wave") {
      // raised right forearm + waving hand
      const swing = this.reduce ? 1 : Math.sin(this.t * 9) * 2;
      this.rect(cx + 4, cy - 20, 2, 6, cfg.body);                 // forearm up along the side
      this.disc(cx + 5 + swing, cy - 21, 2, skin);               // hand
    } else if (m === "clap") {
      const gap = this.reduce ? 1 : Math.round(Math.abs(Math.sin(this.t * 12)) * 3);
      this.disc(cx - 1 - gap, cy - 11, 2, skin);
      this.disc(cx + 1 + gap, cy - 11, 2, skin);
      if (!this.reduce && gap <= 1) this.q(cx, cy - 14, "✦", "#fff1c0", 0.7, "c", false, 0.9);   // clap spark
    } else if (m === "cheer") {
      const up = this.reduce ? 0 : Math.round(osc * 2);
      this.rect(cx - 6, cy - 22 - up, 2, 6, cfg.body); this.disc(cx - 5, cy - 23 - up, 2, skin);   // left arm up
      this.rect(cx + 4, cy - 22 - up, 2, 6, cfg.body); this.disc(cx + 5, cy - 23 - up, 2, skin);   // right arm up
    } else if (m === "kiss") {
      this.disc(cx + 4, cy - 17, 2, skin);                       // hand at the mouth
      if (age > 0.35) {                                          // a small heart drifts out + up
        const t = Math.min(1, (age - 0.35) / 1.4), hx = cx + 6 + t * 10, hy = cy - 18 - t * 12, a = 1 - t;
        this.disc(hx - 1, hy, 1.4, hexA("#ff5d7d", a)); this.disc(hx + 1, hy, 1.4, hexA("#ff5d7d", a));
        this.rect(hx - 1, hy + 1, 3, 1, hexA("#ff5d7d", a)); this.px(hx, hy + 2, hexA("#ff5d7d", a));
      }
    }
  }
  // The shared flourish drawn at the midpoint between two paired travellers (Phase I4):
  // a spark for a high-five, drifting hearts for a hug, music notes for a dance.
  private drawPairFx(mx: number, my: number, g: string) {
    const def = PAIR_BY_ID[g]; if (!def) return;
    my -= 18;   // lift to head height between the two
    const glyph = def.fx === "hearts" ? "♥" : def.fx === "notes" ? "♪" : "✦";
    const col = def.fx === "hearts" ? "#ff5d7d" : def.fx === "notes" ? "#b6a0ff" : "#fff1c0";
    if (this.reduce) { this.q(mx, my, glyph, col, 1.4, "c", false, 0.9); return; }
    for (let i = 0; i < 3; i++) {
      const p = (this.t * 0.7 + i / 3) % 1;
      this.q(mx + Math.sin((this.t + i * 2) * 3) * 5, my - p * 13, glyph, col, 1.5 - p * 0.5, "c", false, (1 - p) * 0.95);
    }
  }
  // Painted terrain tiles (Phase C) — flat colour cells culled to the viewport; water gets
  // a faint shimmer line. Grass is the default and never painted.
  private drawTerrain(camX: number, camY: number) {
    const half = TILE / 2;
    // cull bounds widen as you zoom out (Phase H2) so the far tiles still draw
    const mx = this.LW / 2 * (1 / this.zoom - 1) + TILE, my = this.LH / 2 * (1 / this.zoom - 1) + TILE;
    for (const [key, t] of Array.from(this.curTerrain())) {
      const gx = (key % 1000) - 500, gy = ((key / 1000) | 0) - 500;
      const sx = gx * TILE - camX, sy = gy * TILE - camY;
      if (sx < -mx || sx > this.LW + mx || sy < -my || sy > this.LH + my) continue;   // cull
      const col = TILE_COL[t]; if (!col) continue;
      this.rect(sx - half, sy - half, TILE + 1, TILE + 1, col);
      if (t === "w" && !this.reduce) this.rect(sx - half + 4, sy - 3 + Math.round(Math.sin(this.t * 2 + gx) * 1.5), TILE - 8, 1, "rgba(255,255,255,0.12)");
    }
  }
  // ---- diorama beauty shot (Phase H3): a tilted 3/4 model of your whole CIRQLSPACE ----
  // Draw a sprite upright but scaled about its base — billboards stay unskewed on the tilted ground.
  private billboard(sx: number, sy: number, scale: number, fn: () => void) {
    const b = this.b, s = this.SS;
    b.save(); b.translate(sx * s, sy * s); b.scale(scale, scale); b.translate(-sx * s, -sy * s); fn(); b.restore();
  }
  private drawDiorama() {
    const b = this.b, s = this.SS, W = this.LW * s, H = this.LH * s, pal = this.curRing.palette;
    const ease = this.dioramaT * this.dioramaT * (3 - 2 * this.dioramaT);   // smoothstep sweep-in
    // graded golden-hour sky
    const g = b.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#2a1e42"); g.addColorStop(0.45, "#4a3358"); g.addColorStop(1, "#182a44");
    b.fillStyle = g; b.fillRect(0, 0, W, H);
    const gg = b.createRadialGradient(W * 0.5, H * 0.02, 0, W * 0.5, H * 0.02, W * 0.8);
    gg.addColorStop(0, "rgba(255,206,140,0.28)"); gg.addColorStop(1, "rgba(255,206,140,0)");
    b.fillStyle = gg; b.fillRect(0, 0, W, H);
    // drifting clouds (behind the model)
    if (!this.reduce) for (let i = 0; i < 5; i++) {
      const cxx = ((this.t * 6 + i * 150) % (this.LW + 200)) - 100, cyy = this.LH * (0.08 + (i % 3) * 0.06);
      b.fillStyle = hexA("#ffffff", 0.05); b.beginPath(); b.ellipse(cxx * s, cyy * s, (46 + i * 8) * s, 12 * s, 0, 0, TAU); b.fill();
    }
    // projection: rotate around island centre, squash Y (the tilt), scale to fit the frame
    const R = this.effR(), SQ = 0.56;
    const Z = Math.min((this.LW * 0.82) / (2 * R), (this.LH * 0.52) / (2 * R * SQ)) * (0.78 + 0.22 * ease);
    const cx = this.LW / 2, cy = this.LH * 0.47;
    const ca = Math.cos(this.dioramaAng), sa = Math.sin(this.dioramaAng);
    const proj = (wx: number, wy: number) => ({ sx: cx + (wx * ca - wy * sa) * Z, sy: cy + (wx * sa + wy * ca) * SQ * Z });
    const ell = (ccx: number, ccy: number, rx: number, ry: number, col: string) => { b.fillStyle = col; b.beginPath(); b.ellipse(ccx * s, ccy * s, rx * s, ry * s, 0, 0, TAU); b.fill(); };
    const rX = R * Z, rY = R * Z * SQ, TH = Math.max(8, R * Z * 0.16);
    // float shadow on the sea
    ell(cx, cy + TH + 10, rX * 1.04, rY * 0.5, "rgba(0,0,0,0.34)");
    // extruded island thickness — a floating chunk of land, dark below → shore up top
    const steps = Math.min(40, Math.max(1, Math.round(TH)));
    for (let k = steps; k >= 0; k--) { const f = k / steps; ell(cx, cy + TH * f, rX, rY, shade(mix(pal.sand, "#3a2413", 0.55), -0.12 * f)); }
    // top surfaces
    ell(cx, cy, rX, rY, pal.sand);
    ell(cx, cy, (R - 22) * Z, (R - 22) * Z * SQ, pal.land);
    for (let i = 0; i < 8; i++) { const a = i * 0.94, rr = (i * 53) % (R - 130); const p = proj(Math.cos(a) * rr, Math.sin(a) * rr); ell(p.sx, p.sy, (46 + (i % 4) * 12) * Z, (30 + (i % 3) * 10) * Z * SQ, pal.grass); }
    // painted terrain, projected as squashed cells
    if (this.ringIdx === 0) for (const [key, t] of Array.from(this.terrain)) {
      const col = TILE_COL[t]; if (!col) continue;
      const gx = (key % 1000) - 500, gy = ((key / 1000) | 0) - 500; const p = proj(gx * TILE, gy * TILE);
      this.rect(p.sx - TILE * Z / 2, p.sy - TILE * SQ * Z / 2, TILE * Z + 1, TILE * SQ * Z + 1, col);
    }
    // billboards — props, décor, you (+ friends): project the base, depth-sort, draw upright
    const spriteScale = Math.min(1, Z + 0.3);
    const items: { d: number; f: () => void }[] = [];
    for (const pr of this.curRing.props) {
      const p = proj(pr.x, pr.y);
      if (pr.t === "npc") items.push({ d: p.sy, f: () => this.billboard(p.sx, p.sy, spriteScale, () => this.drawNpc(p.sx, p.sy, pr)) });
      else if (pr.t === "dock") items.push({ d: p.sy, f: () => this.billboard(p.sx, p.sy, spriteScale, () => this.drawDock(p.sx, p.sy, pr)) });
    }
    for (const dd of this.decor) {
      const def = decorById[dd.item]; if (!def) continue; const r = def.render ?? "glyph"; const p = proj(dd.x, dd.y);
      const draw = () => {
        if (r === "path") this.drawPath(p.sx, p.sy);
        else if (r === "pond") this.drawPond(p.sx, p.sy, 20);
        else if (r === "stone") this.drawRock(p.sx, p.sy, def.big);
        else if (r === "fence") this.drawFence(p.sx, p.sy, false);
        else if (r === "tree") this.drawTree(p.sx, p.sy, def.big, this.canopyStyle(dd.x, dd.y), this.seedOf(dd.x, dd.y));
        else if (r === "bush") this.drawBush(p.sx, p.sy);
        else if (r === "flower") this.drawFlower(p.sx, p.sy, def.accent || "#ff8fbf");
        else if (r === "lantern") this.drawLantern(p.sx, p.sy, def.accent || pal.accent, true);
        else if (r === "crystal") this.drawCrystal(p.sx, p.sy, def.big, def.accent || pal.accent);
        else this.drawDecor(p.sx, p.sy, def.glyph, def.scale ?? 1);
      };
      items.push({ d: p.sy, f: () => this.billboard(p.sx, p.sy, spriteScale, draw) });
    }
    { const p = proj(this.posX, this.posY); items.push({ d: p.sy + 0.5, f: () => this.billboard(p.sx, p.sy, spriteScale, () => { this.disc(p.sx, p.sy + 2, 4, "#0a071460"); this.avatar(p.sx, p.sy, this.hero, this.facing); }) }); }
    for (const r of Array.from(this.remotes.values())) { const p = proj(r.x, r.y); items.push({ d: p.sy, f: () => this.billboard(p.sx, p.sy, spriteScale, () => { this.disc(p.sx, p.sy + 2, 4, "#0a071460"); this.avatar(p.sx, p.sy, r.avatar, r.facing); }) }); }
    items.sort((a, c) => a.d - c.d);
    for (const it of items) it.f();
    // vignette
    const vg = b.createRadialGradient(W * 0.5, H * 0.5, H * 0.18, W * 0.5, H * 0.5, H * 0.78);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(4,2,12,0.55)");
    b.fillStyle = vg; b.fillRect(0, 0, W, H);
    // postcard label
    const pieces = this.decor.length;
    this.q(this.LW / 2, this.LH * 0.06, "◆ DIORAMA", "#ffce8c", 1.0, "c", true, 0.7 * ease + 0.3);
    this.q(this.LW / 2, this.LH * 0.83, `${this.myName}'s CIRQLSPACE`, "#ffffff", 1.5, "c", true);
    this.q(this.LW / 2, this.LH * 0.83 + 18, `Tier ${this.landTier + 1}  ·  ${pieces} piece${pieces === 1 ? "" : "s"}`, "#ffd98a", 1.0, "c");
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
  // A Town storefront (Milestone F) — a cozy shop you walk into: warm walls, a striped
  // awning + sign in the shop's accent, glowing windows and a lit doorway. `p.accent`
  // tints the awning/sign so the five shops read apart at a glance.
  private drawShop(cx: number, cy: number, p: Prop) {
    const ac = p.accent || "#ffd98a";
    const near = this.near === p;
    this.glow(cx, cy - 6, 54, ac, 0.16 + (near ? 0.16 : 0));
    this.rect(cx - 24, cy + 14, 48, 6, "#0a071450");                 // ground shadow
    // walls
    this.rect(cx - 22, cy - 10, 44, 26, "#e7d8bd");
    this.rect(cx - 22, cy - 10, 44, 2, shade(ac, -0.2));        // eave line
    this.rectLine(cx - 22, cy - 10, 44, 26, shade(ac, -0.35));
    // pitched roof
    for (let i = 0; i < 12; i++) this.rect(cx - 26 + i, cy - 10 - i, (26 - i) * 2, 1, shade(ac, -0.15));
    // striped awning over the front
    for (let i = 0; i < 11; i++) this.rect(cx - 22 + i * 4, cy - 1, 4, 4, i % 2 ? ac : "#fff6e8");
    this.rect(cx - 22, cy + 3, 44, 1, shade(ac, -0.3));
    // sign board above the awning
    this.rect(cx - 14, cy - 20, 28, 6, shade(ac, -0.1)); this.rectLine(cx - 14, cy - 20, 28, 6, "#0a0714");
    // glowing windows + lit door
    this.disc(cx - 13, cy + 8, 3, "#ffe6a8"); this.disc(cx + 13, cy + 8, 3, "#ffe6a8");
    this.rect(cx - 5, cy + 4, 10, 12, shade(ac, 0.1)); this.rect(cx - 4, cy + 6, 8, 10, "#7a4a1e");
    this.px(cx + 2, cy + 11, "#ffd98a");                             // door knob
    this.labelPill(cx, cy - 30, p.label || "Shop", ac);
  }
  // A brooding storm you can brave (F weather entry) — dark churning cloud puffs, a hint of
  // a funnel, flickering lightning + icy flecks swirling. Interact → the tornado sweep.
  private drawStorm(cx: number, cy: number, p: Prop) {
    const ac = p.accent || "#dfeaff";
    const near = this.near === p;
    const spin = this.reduce ? 0 : this.t * 2.2;
    this.glow(cx, cy - 8, 48, "#5b6a8a", 0.26 + (near ? 0.14 : 0));
    this.rect(cx - 20, cy + 12, 40, 5, "#0a071455");                 // ground shadow
    // a funnel hint — stacked, wobbling ellipses narrowing to the ground
    for (let i = 0; i < 5; i++) { const w = 4 + i * 3.2, yy = cy + 8 - i * 5, off = Math.sin(spin + i * 0.9) * (i * 0.8); this.disc(cx + off, yy, w * 0.5, i < 2 ? "#3a465e" : "#4a5872"); }
    // churning cloud puffs on top
    const puff = (dx: number, dy: number, r: number, c: string) => this.disc(cx + dx, cy + dy, r, c);
    puff(-16, -11, 6, "#242a3a"); puff(-10, -14, 8, "#2b3346"); puff(0, -20, 10, "#3c4761"); puff(8, -16, 9, "#333c52"); puff(14, -12, 7, "#2b3346");
    puff(-4, -13, 5, "#46536f");   // a lit underside curl
    // flickering lightning
    if (!this.reduce && Math.sin(this.t * 9) > 0.62) {
      const lx = cx + Math.sin(this.t * 3) * 4;
      this.rect(lx, cy - 8, 1, 6, "#eaf6ff"); this.rect(lx - 2, cy - 2, 3, 1, "#bfe0ff"); this.rect(lx, cy + 1, 1, 5, "#eaf6ff");
      this.glow(lx, cy, 12, "#cfe6ff", 0.4);
    }
    // icy flecks swirling around the storm
    if (!this.reduce) for (let i = 0; i < 7; i++) { const a = spin + i * (TAU / 7), rr = 14 + (i % 3) * 4; this.px(Math.round(cx + Math.cos(a) * rr), Math.round(cy - 6 + Math.sin(a) * rr * 0.5), "#dfeaff"); }
    this.labelPill(cx, cy - 34, p.label || "the storm", ac);
  }
  // Your cottage on CIRQLSPACE (F) — a warm little home with a smoking chimney + lit windows.
  private drawHome(cx: number, cy: number, p: Prop) {
    const ac = p.accent || "#ffc46b";
    const near = this.near === p;
    this.glow(cx, cy - 4, 50, ac, 0.16 + (near ? 0.14 : 0));
    this.rect(cx - 24, cy + 14, 48, 6, "#0a071450");                 // ground shadow
    // walls
    this.rect(cx - 22, cy - 12, 44, 28, "#e6d3b0");
    this.rectLine(cx - 22, cy - 12, 44, 28, shade(ac, -0.4));
    // pitched thatch roof + chimney with a curl of smoke
    for (let i = 0; i < 15; i++) this.rect(cx - 27 + i, cy - 12 - i, (27 - i) * 2, 1, i % 2 ? "#b5662f" : "#a85a28");
    this.rect(cx + 12, cy - 26, 5, 10, "#7a3f28");                   // chimney
    if (!this.reduce) { for (let i = 0; i < 3; i++) { const yy = cy - 28 - i * 4 - (this.t * 6 % 4); this.disc(cx + 14 + Math.sin(this.t * 1.5 + i) * 2, yy, 1.5 + i * 0.4, "#c9bfb0"); } }
    // door + warm lit windows
    this.disc(cx - 12, cy - 2, 3, "#ffe6a8"); this.disc(cx + 12, cy - 2, 3, "#ffe6a8");
    this.rect(cx - 4, cy + 3, 9, 13, "#8a5a2e"); this.rect(cx - 3, cy + 4, 7, 11, "#a06a34");
    this.px(cx + 3, cy + 10, "#ffd98a");                             // door knob
    this.rect(cx - 4, cy + 3, 9, 1, shade(ac, -0.2));                // lintel
    this.labelPill(cx, cy - 32, p.label || "Your Home", ac);
  }
  // A tunnel/burrow mouth on the surface (F) — a dark opening in an earthy mound.
  private drawTunnel(cx: number, cy: number, p: Prop) {
    const near = this.near === p;
    if (near) this.glow(cx, cy - 4, 26, "#7fd8ff", 0.22);
    this.rect(cx - 14, cy + 6, 28, 4, "#0a071450");                  // ground shadow
    // earthen mound
    this.disc(cx, cy, 12, "#4a3b2c"); this.disc(cx, cy - 2, 11, "#5a4636");
    this.disc(cx - 6, cy - 4, 3, "#6b5642"); this.disc(cx + 7, cy - 3, 2, "#6b5642"); // clods
    // rocks framing the mouth
    this.disc(cx - 11, cy + 1, 3, "#6a6a72"); this.disc(cx + 11, cy + 1, 3, "#6a6a72");
    // the dark opening + a faint glimmer of the passage within
    this.disc(cx, cy + 1, 7, "#0b0a12"); this.disc(cx, cy + 2, 5, "#05040a");
    if (!this.reduce) { const g = 0.3 + 0.15 * Math.sin(this.t * 2); this.disc(cx, cy + 2, 1.5, `rgba(127,216,255,${g})`); }
    this.labelPill(cx, cy - 16, p.label || "burrow", "#9fd8e6");
  }
  private drawNpc(cx: number, cy: number, p: Prop) {
    const ac = p.accent || "#7fffe6";
    const L = npcLook(p.id, ac);
    const idle = this.reduce ? 0 : Math.round(Math.sin(this.t * 1.6 + cx * 0.05) * 0.6);   // gentle breathing
    if (L.aura && !this.reduce) this.glow(cx, cy - 12, 20, L.aura, 0.28 + 0.08 * Math.sin(this.t * 2.3));
    if (this.near === p) this.glow(cx, cy, 26, ac, 0.3);
    this.disc(cx, cy + 3, 4, "#0a071455");                              // grounding shadow
    const cyb = cy + idle;
    this.drawNpcFigure(cx, cyb, L);
    // a floating "talk to me" spark so NPCs read as interactable
    if (!this.reduce) { const yb = cy - 30 + Math.sin(this.t * 3) * 1.5; this.disc(cx, yb, 1.6, "#ffd24a"); this.ring(cx, yb, 3.5, "#ffd24a", 1); }
    this.nameTag(cx, cy, p.label || "Ferra", ac);
  }
  // A characterful little townsperson: outfit + trim, hair/headwear, and a signature
  // accessory — all from the NPC's stable look (cirql-npc-looks). Feet at (cx, cy).
  private drawNpcFigure(cx: number, cy: number, L: NpcLook) {
    const rimC = shade(L.robe, -0.5), hemC = shade(L.robe, -0.28), hiC = shade(L.robe, 0.26);
    // legs peek under the coat
    this.rect(cx - 3, cy - 4, 2, 4, "#38302a"); this.rect(cx + 1, cy - 4, 2, 4, "#38302a");
    // body/robe — dark rim silhouette, coloured coat, hem + sash trim, a lit edge
    this.rect(cx - 6, cy - 17, 12, 15, rimC);                           // rim
    this.rect(cx - 5, cy - 16, 10, 13, L.robe);                         // coat
    this.rect(cx - 5, cy - 16, 10, 1, hiC);                             // top light
    this.rect(cx - 5, cy - 4, 10, 1, hemC);                            // hem shadow
    this.rect(cx - 1, cy - 16, 2, 13, L.trim);                          // centre sash
    this.rect(cx - 5, cy - 12, 10, 1, L.trim);                          // belt
    // arms
    this.rect(cx - 7, cy - 15, 2, 8, L.robe); this.rect(cx + 5, cy - 15, 2, 8, L.robe);
    this.px(cx - 6, cy - 7, L.skin); this.px(cx + 6, cy - 7, L.skin);   // hands
    // head + hair + face
    this.drawNpcHead(cx, cy, L);
    // accessory
    this.drawNpcAccessory(cx, cy, L);
  }
  private drawNpcHead(cx: number, cy: number, L: NpcLook) {
    const hy = cy - 20;
    if (L.hat === "hood") this.disc(cx, hy - 1, 6, L.hatColor);          // hood drapes behind the head
    // hair behind the head (skipped under a full hood or when bald)
    if (L.hat !== "hood" && L.hairStyle !== "bald") {
      if (L.hairStyle === "long") { this.rect(cx - 5, hy - 2, 2, 8, L.hair); this.rect(cx + 3, hy - 2, 2, 8, L.hair); }
    }
    this.disc(cx, hy, 4, L.skin);
    this.px(cx - 4, hy + 1, shade(L.skin, -0.25)); this.px(cx + 4, hy + 1, shade(L.skin, -0.25));
    // face
    this.px(cx - 2, hy, "#1a1226"); this.px(cx + 2, hy, "#1a1226");
    this.rect(cx - 1, hy + 2, 3, 1, "#c26a58");
    // hair on top + headwear
    if (L.hat !== "hood" && L.hairStyle !== "bald") {
      this.rect(cx - 4, hy - 4, 8, 3, L.hair);
      if (L.hairStyle === "bun") this.disc(cx, hy - 6, 2, L.hair);
    }
    switch (L.hat) {
      case "wideBrim": this.rect(cx - 6, hy - 3, 12, 1.5, L.hatColor); this.rect(cx - 3, hy - 6, 6, 3, L.hatColor); this.px(cx, hy - 7, shade(L.hatColor, 0.4)); break;
      case "band": this.rect(cx - 4, hy - 3, 8, 1.5, L.hatColor); this.px(cx, hy - 4, "#fff1e8"); break;
      case "cap": this.rect(cx - 4, hy - 5, 8, 2, L.hatColor); this.rect(cx - 6, hy - 4, 4, 1, shade(L.hatColor, -0.25)); this.px(cx, hy - 6, "#ffd24a"); break;
      case "hood": this.rect(cx - 5, hy - 4, 10, 3, L.hatColor); this.px(cx - 4, hy - 2, shade(L.hatColor, 0.3)); break;
      default: break;
    }
  }
  private drawNpcAccessory(cx: number, cy: number, L: NpcLook) {
    switch (L.accessory) {
      case "staff": {
        this.rect(cx + 6, cy - 24, 1.5, 24, "#6b4b2c");                 // pole
        if (!this.reduce) this.glow(cx + 6.75, cy - 24, 9, L.accColor, 0.3 + 0.12 * Math.sin(this.t * 2.4));
        this.disc(cx + 6.75, cy - 24, 2.4, L.accColor); this.px(cx + 6, cy - 25, "#ffffff");
        break;
      }
      case "lantern": {
        this.rect(cx + 6, cy - 12, 1, 4, "#3a2a1e");                    // handle arm
        if (!this.reduce) this.glow(cx + 7, cy - 7, 7, "#ffcf6b", 0.35);
        this.rect(cx + 5.5, cy - 8, 3, 4, "#caa24a"); this.px(cx + 7, cy - 6, "#fff1c0");
        break;
      }
      case "book": this.rect(cx - 3, cy - 10, 6, 5, L.accColor); this.rect(cx, cy - 10, 1, 5, shade(L.accColor, -0.35)); this.px(cx - 2, cy - 9, "#fff"); break;
      case "satchel": this.rect(cx - 6, cy - 14, 12, 1, "#5a4028"); this.rect(cx + 3, cy - 8, 4, 4, L.accColor); this.px(cx + 4, cy - 7, shade(L.accColor, 0.3)); break;
      case "orb": if (!this.reduce) this.glow(cx + 7, cy - 15, 8, L.accColor, 0.35 + 0.12 * Math.sin(this.t * 3)); this.ball(cx + 7, cy - 15, 2.4, L.accColor); break;
      case "flower": this.rect(cx + 6, cy - 12, 1, 6, "#3a6a34"); for (let i = 0; i < 5; i++) { const a = i * (TAU / 5); this.px(cx + 6 + Math.cos(a) * 1.6, cy - 13 + Math.sin(a) * 1.6, L.accColor); } this.px(cx + 6, cy - 13, "#ffe58a"); break;
      default: break;
    }
  }
  // tree kind from a stable hash of world position → a mix of shapes per ring (CHR-259)
  // ---- per-object neon (biome kit): crisp edge + a TIGHT hug-glow, never a screen blur ----
  private nightAmt = 0;
  /** Glow strength that "breathes": present by day, stronger at night. */
  private glowN() { return 0.5 + 0.5 * this.nightAmt; }
  private neonEllipse(cx: number, cy: number, rx: number, ry: number, color: string, blur = 4, width = 1.4, alpha = 1, a0 = 0, a1 = TAU) {
    const b = this.b, s = this.SS;
    b.save(); b.strokeStyle = color; b.lineWidth = width * s; b.globalAlpha = alpha; b.shadowColor = color; b.shadowBlur = blur * s; b.lineCap = "round"; b.lineJoin = "round";
    b.beginPath(); b.ellipse(cx * s, cy * s, rx * s, ry * s, 0, a0, a1); b.stroke(); b.restore();
  }
  private neonPath(pts: [number, number][], color: string, blur = 4, width = 1.4, alpha = 1) {
    if (pts.length < 2) return; const b = this.b, s = this.SS;
    b.save(); b.strokeStyle = color; b.lineWidth = width * s; b.globalAlpha = alpha; b.shadowColor = color; b.shadowBlur = blur * s; b.lineCap = "round"; b.lineJoin = "round";
    b.beginPath(); b.moveTo(pts[0][0] * s, pts[0][1] * s);
    if (pts.length === 3) b.quadraticCurveTo(pts[1][0] * s, pts[1][1] * s, pts[2][0] * s, pts[2][1] * s);
    else for (let i = 1; i < pts.length; i++) b.lineTo(pts[i][0] * s, pts[i][1] * s);
    b.stroke(); b.restore();
  }
  private static readonly SHROOM_HUES = ["#ff5fe0", "#c8a2ff", "#54ffe0", "#ff7aa8"];
  /** Which canopy to draw for a tree at world (x,y). Species CLUSTER by region so a grove
   *  reads as one stand (ecological clumping), with light per-tree variation to avoid monotony. */
  private canopyStyle(x: number, y: number): "round" | "pine" | "mushroom" | "willow" {
    const rx = Math.round(x / 130), ry = Math.round(y / 130);
    const region = (Math.abs(rx * 92837 ^ ry * 689287) >>> 0) % 10;
    const jit = (Math.abs((x | 0) * 3 + (y | 0) * 7) | 0) % 10;
    if (this.curRing.biome === "woodland") {
      if (region < 4) return jit < 8 ? "mushroom" : "willow";   // a mushroom grove
      if (region < 7) return jit < 8 ? "willow" : "mushroom";   // a willow stand
      return jit < 2 ? "mushroom" : "round";                    // ordinary wood, a few shrooms
    }
    return jit < 3 ? "pine" : "round";
  }
  private seedOf(x: number, y: number) { return (Math.abs((x | 0) * 73856093 ^ (y | 0) * 19349663) >>> 0); }
  private triY(cx: number, apexY: number, halfW: number, h: number, color: string) {
    const b = this.b, s = this.SS;
    b.fillStyle = color; b.beginPath();
    b.moveTo(cx * s, apexY * s); b.lineTo((cx - halfW) * s, (apexY + h) * s); b.lineTo((cx + halfW) * s, (apexY + h) * s); b.closePath(); b.fill();
  }
  private drawTree(cx: number, cy: number, big?: boolean, kind: "round" | "pine" | "mushroom" | "willow" = "round", seed = 0) {
    if (kind === "mushroom") { this.drawMushroomTree(cx, cy, big, seed); return; }
    if (kind === "willow") { this.drawTentacleWillow(cx, cy, big, seed); return; }
    const s = big ? 1.4 : 1;
    // Foliage keyed to the ring's grass but pushed to READ against same-colour ground:
    // a deeper fill, a dark rim that outlines the silhouette, and a lit top (I-polish).
    const g = this.curRing.palette.grass, fill = shade(g, -0.18), rim = shade(g, -0.6), hi = shade(g, 0.34);
    this.disc(cx, cy + 3, 6 * s, "#0a071452");   // grounding contact shadow
    if (kind === "pine") {
      this.rect(cx - 1.5, cy - 6 * s, 3, 8 * s, "#4a3420");                        // trunk
      for (let i = 0; i < 3; i++) this.triY(cx, cy - 12 * s - i * 6 * s, (9 - i * 2.5) * s + 1, 9 * s + 1.5, rim);   // dark silhouette
      for (let i = 0; i < 3; i++) this.triY(cx, cy - 12 * s - i * 6 * s, (9 - i * 2.5) * s, 9 * s, i === 0 ? hi : fill);   // lit foliage
    } else {
      this.rect(cx - 2, cy - 8 * s, 4, 10 * s, "#3a2a1e");                          // trunk
      for (let i = 0; i < 3; i++) this.disc(cx, cy - 14 * s - i * 5 * s, (11 - i * 2) * s + 1.2, rim);   // dark rim silhouette
      for (let i = 0; i < 3; i++) this.disc(cx, cy - 14 * s - i * 5 * s, (11 - i * 2) * s, fill);        // foliage fill
      this.disc(cx - 3 * s, cy - 20 * s, 3.2 * s, hi);                              // top-left highlight (lit)
    }
  }
  private fillEll(cx: number, cy: number, rx: number, ry: number, color: string) {
    const b = this.b, s = this.SS; b.fillStyle = color; b.beginPath(); b.ellipse(cx * s, cy * s, rx * s, ry * s, 0, 0, TAU); b.fill();
  }
  // A fanciful cap-tree — the woodland signature. Rich colour + spots; the ONLY glow is a
  // tight neon arc under the cap (the "gills"), so it reads bioluminescent, not blurry.
  private drawMushroomTree(cx: number, cy: number, big: boolean | undefined, seed: number) {
    const k = big ? 1.3 : 1;
    const hue = CirqlWorldEngine.SHROOM_HUES[seed % CirqlWorldEngine.SHROOM_HUES.length];
    const capDk = shade(hue, -0.42), capHi = mix(hue, "#ffffff", 0.4);
    const sway = this.reduce ? 0 : Math.sin(this.t * 1.1 + cx * 0.05) * 0.6;
    this.disc(cx, cy + 2, 6 * k, "#0a071452");                                // contact shadow
    this.rect(cx - 3 * k + sway, cy - 40 * k, 6 * k, 40 * k, "#e8dcc0");      // stalk
    this.rect(cx + 1 * k + sway, cy - 40 * k, 2 * k, 40 * k, "#c9bda0");
    const cy2 = cy - 42 * k;
    this.fillEll(cx + sway, cy2 + 3 * k, 20 * k, 11 * k, capDk);              // cap underside
    this.fillEll(cx + sway, cy2, 19 * k, 10 * k, hue);                        // cap
    this.fillEll(cx - 4 * k + sway, cy2 - 3 * k, 10 * k, 5 * k, capHi);       // lit top-left
    for (let i = 0; i < 4; i++) this.disc(cx - 11 * k + i * 7 * k + sway, cy2 - 2 * k - ((i * 7) % 5) * k, 2 * k, mix(hue, "#fff", 0.5));   // spots
    this.neonEllipse(cx + sway, cy - 38 * k, 18 * k, 5 * k, hue, 5 * k, 1.5 * k, this.glowN(), 0, Math.PI);   // glowing gills
    this.glow(cx + sway, cy - 40 * k, 18 * k, hue, 0.08 + 0.2 * this.nightAmt);
  }
  // A drooping willow whose tendrils glow like forest-jellyfish — a woodland signature.
  private drawTentacleWillow(cx: number, cy: number, big: boolean | undefined, _seed: number) {
    const k = big ? 1.3 : 1, g = this.curRing.palette.grass, cyan = "#5ff2ff";
    this.disc(cx, cy + 2, 7 * k, "#0a071448");
    this.rect(cx - 4 * k, cy - 38 * k, 8 * k, 38 * k, "#6a4a2c");             // trunk
    this.rect(cx - 4 * k, cy - 38 * k, 2.5 * k, 38 * k, "#835a34");
    this.fillEll(cx, cy - 44 * k, 20 * k, 12 * k, mix(g, "#1c3f7a", 0.35));   // moody canopy
    this.fillEll(cx - 5 * k, cy - 48 * k, 13 * k, 8 * k, mix(g, "#2a5aa0", 0.3));
    for (let i = 0; i < 6; i++) {
      const bx = cx - 15 * k + i * 6 * k;
      const sw = this.reduce ? 0 : Math.sin(this.t * 1.4 + i + cx * 0.03) * 6 * k;
      this.neonPath([[bx, cy - 42 * k], [bx + sw * 0.5, cy - 18 * k], [bx + sw, cy + 4 * k]], cyan, 4 * k, 1.4 * k, 0.5 + 0.4 * this.nightAmt);
      this.glow(bx + sw, cy + 4 * k, 5 * k, cyan, 0.28 + 0.4 * this.nightAmt); this.disc(bx + sw, cy + 4 * k, 1.2 * k, "#e8ffff");
    }
  }
  // A cluster of fronds — a couple glow lime (woodland understory). Soft; walk through.
  private drawFern(cx: number, cy: number) {
    const g = this.curRing.palette.grass;
    for (let i = 0; i < 5; i++) {
      const a = -0.6 + i * 0.3, sw = this.reduce ? 0 : Math.sin(this.t * 1.6 + i + cx * 0.05) * 0.06;
      const ctrl: [number, number] = [cx + Math.cos(a + 1.5 + sw) * 6, cy - 9], tip: [number, number] = [cx + Math.cos(a + 1.5) * 12, cy - 18];
      if (i % 2) this.neonPath([[cx, cy], ctrl, tip], "#b6ff6a", 3, 1.1, 0.4 + 0.4 * this.nightAmt);
      else this.neonPath([[cx, cy], ctrl, tip], shade(g, 0.12), 0, 1.6, 1);
    }
  }
  // A ring of glowing toadstools with a soft ground glow (woodland). Soft; walk through.
  private drawFairyRing(cx: number, cy: number) {
    this.glow(cx, cy, 22, "#b6ff6a", 0.05 + 0.14 * this.nightAmt);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * TAU, rx = cx + Math.cos(a) * 18, ry = cy + Math.sin(a) * 10;
      this.disc(rx, ry + 2, 2.5, "#0a071430");
      this.rect(rx - 1, ry - 6, 2, 6, "#e8dcc0");                   // stalk
      this.fillEll(rx, ry - 7, 5, 3, "#ff7aa8");                    // cap
      this.neonEllipse(rx, ry - 5, 5, 1.6, "#ff7aa8", 3, 1, 0.5 + 0.4 * this.nightAmt, 0, Math.PI);   // glowing gill
    }
  }
  // A fanciful moss-deer — mossy back, glowing antlers. Grazes near the groves (woodland fauna).
  private drawMossDeer(cx: number, cy: number, t: number) {
    const bob = this.reduce ? 0 : Math.sin(t * 1.2) * 1, body = "#8a6a44", body2 = "#9a7a50", leg = "#5a4630";
    this.disc(cx, cy + 2, 8, "#0a071440");
    this.rect(cx - 11, cy - 16 + bob, 22, 10, body);               // body
    this.rect(cx + 8, cy - 22 + bob, 7, 9, body);                  // neck
    this.fillEll(cx + 13, cy - 24 + bob, 6, 5, body2);             // head
    this.rect(cx - 9, cy - 6 + bob, 2, 7, leg); this.rect(cx - 2, cy - 6 + bob, 2, 7, leg); this.rect(cx + 6, cy - 6 + bob, 2, 7, leg); this.rect(cx + 11, cy - 6 + bob, 2, 7, leg);
    this.fillEll(cx - 7, cy - 17 + bob, 7, 4, this.curRing.palette.grass);   // moss on the back
    this.neonPath([[cx + 14, cy - 27 + bob], [cx + 13, cy - 31 + bob], [cx + 12, cy - 34 + bob]], "#b6ff6a", 3, 1.2, 0.5 + 0.4 * this.nightAmt);
    this.neonPath([[cx + 16, cy - 27 + bob], [cx + 18, cy - 31 + bob], [cx + 19, cy - 33 + bob]], "#b6ff6a", 3, 1.2, 0.5 + 0.4 * this.nightAmt);
    this.glow(cx + 16, cy - 31 + bob, 5, "#b6ff6a", 0.2 + 0.3 * this.nightAmt);
    this.disc(cx + 15, cy - 24 + bob, 0.9, "#1a1208");             // eye
  }
  // ---- geography (density fill-in): a fallen log, a stump, a tall-grass clump ----
  private drawLog(cx: number, cy: number, seed: number) {
    const len = 16 + (seed % 6), moss = this.curRing.palette.grass;
    this.disc(cx, cy + 2, 8, "#0a071440");
    this.fillEll(cx, cy - 3, len, 6, "#5a3f24");                              // trunk
    this.fillEll(cx - len * 0.5, cy - 3, 5.5, 6, "#3c2a18"); this.fillEll(cx + len * 0.5, cy - 3, 5.5, 6, "#3c2a18");   // end rings
    this.disc(cx - len * 0.5, cy - 3, 2.6, "#6e4e2c"); this.disc(cx + len * 0.5, cy - 3, 2.6, "#6e4e2c");
    this.fillEll(cx, cy - 6, len * 0.8, 2.4, "#6e4e2c");                      // lit top
    this.fillEll(cx - 4, cy - 6, 5, 2, shade(moss, 0.05)); this.fillEll(cx + 5, cy - 5, 3, 1.6, moss);   // moss
    if (this.curRing.biome === "woodland") { this.disc(cx - 2, cy - 8, 1.4, "#ff7aa8"); this.glow(cx - 2, cy - 9, 4, "#ff7aa8", 0.14 + 0.24 * this.nightAmt); }   // a shelf mushroom
  }
  private drawStump(cx: number, cy: number) {
    this.disc(cx, cy + 2, 6, "#0a071440");
    this.rect(cx - 5, cy - 8, 10, 8, "#5a3f24"); this.rect(cx - 5, cy - 8, 2.5, 8, "#6e4e2c");
    this.fillEll(cx, cy - 8, 6, 3, "#7a5a34"); this.fillEll(cx, cy - 8, 3.5, 1.8, "#8a6a44");     // rings
    this.fillEll(cx - 1, cy - 6, 5, 1.6, shade(this.curRing.palette.grass, 0.05));                // moss
    if (this.curRing.biome === "woodland" && (cx | 0) % 2 === 0) { this.disc(cx + 4, cy - 9, 1.3, "#54ffe0"); this.glow(cx + 4, cy - 10, 4, "#54ffe0", 0.14 + 0.24 * this.nightAmt); }
  }
  private drawTallgrass(cx: number, cy: number, seed: number) {
    const g = this.curRing.palette.grass, hi = shade(g, 0.22), dk = shade(g, -0.22), n = 5 + (seed % 4);
    for (let i = 0; i < n; i++) {
      const bx = cx + (i - (n - 1) / 2) * 2.2 + (((seed >> i) % 3) - 1);
      const h = 8 + ((seed >> (i + 3)) % 6), sw = this.reduce ? 0 : Math.sin(this.t * 1.5 + i + cx * 0.05) * 1.4;
      this.neonPath([[bx, cy], [bx + sw * 0.5, cy - h * 0.6], [bx + sw, cy - h]], i % 3 ? g : (i % 2 ? hi : dk), 0, 1.2, 1);
    }
  }
  // ---- more animals (density fill-in): a hopping rabbit, a flitting bird ----
  private drawRabbit(cx: number, cy: number, hop: number) {
    const body = "#b8a890", bob = hop ? -Math.abs(Math.sin(hop)) * 3 : 0;
    this.disc(cx, cy + 1, 4, "#0a071438");
    this.fillEll(cx, cy - 3 + bob, 4, 3.5, body);                             // body
    this.disc(cx + 3, cy - 5 + bob, 2.2, body);                              // head
    this.rect(cx + 2, cy - 9 + bob, 1.2, 4, "#a89880"); this.rect(cx + 4, cy - 9 + bob, 1.2, 4, "#a89880");   // ears
    this.disc(cx - 3, cy - 2 + bob, 1.4, "#e8ddcf");                          // tail
    this.disc(cx + 4, cy - 5 + bob, 0.5, "#1a1208");                          // eye
  }
  private drawBird(cx: number, cy: number, ph: number) {
    const c = "#7fb0d8", w = 1.6 + Math.abs(Math.sin(ph * 7)) * 1.4;
    this.disc(cx, cy, 1.6, c); this.rect(cx - 1, cy - 2, 3, 1.2, shade(c, -0.2));   // body + head
    this.disc(cx - w, cy - 1, 1.3, c); this.disc(cx + w, cy - 1, 1.3, c);           // wings
  }

  // ---------- LIVING CREATURES: stateful woodland fauna that REACT to you ----------
  // Shy deer/rabbits flee when you rush them, then warm up if you hold still and let you pet
  // them; a curious fox trails you at a gap. Real walk-cycle sprites + facing.
  private creatures: { x: number; y: number; vx: number; vy: number; sp: "deer" | "rabbit" | "fox"; mode: string; trust: number; t: number; face: number; rest: number; wtx: number; wty: number; home: { x: number; y: number } }[] = [];
  private creaturesRing = -999;
  private ensureCreatures() {
    if (this.creaturesRing === this.ringIdx) return;
    this.creaturesRing = this.ringIdx; this.creatures = [];
    if (this.reduce || this.curRing.biome !== "woodland") return;   // hero fauna per biome (woodland first)
    const flora = this.curRing.props.filter((p) => p.t === "tree" || p.t === "fern" || p.t === "fairyring");
    const spawn = (sp: "deer" | "rabbit" | "fox", n: number, k: number) => {
      const edge = this.effR() * 0.82;
      for (let i = 0; i < n; i++) {
        const a = flora.length ? flora[(i * 7 + k) % flora.length] : { x: 0, y: 0 };
        let hx = a.x + Math.sin(i * 2.3 + k) * 44, hy = a.y + 30 + Math.cos(i * 1.7 + k) * 34;
        const hr = Math.hypot(hx, hy); if (hr > edge) { hx = hx / hr * edge; hy = hy / hr * edge; }
        this.creatures.push({ x: hx, y: hy, vx: 0, vy: 0, sp, mode: "graze", trust: 0, t: i * 1.3, face: 1, rest: 0, wtx: hx, wty: hy, home: { x: hx, y: hy } });
      }
    };
    spawn("deer", 2, 3); spawn("rabbit", 3, 5); spawn("fox", 1, 2);
  }
  private updateCreatures(dt: number) {
    if (!this.creatures.length) return;
    const px = this.posX, py = this.posY, calm = this.walk <= 0.05 && !this.dozing && !this.dialog;
    for (const c of this.creatures) {
      const dx = px - c.x, dy = py - c.y, dist = Math.hypot(dx, dy) || 1;
      const base = c.sp === "rabbit" ? 34 : c.sp === "fox" ? 30 : 26;
      let tx = c.wtx, ty = c.wty, spd = base * 0.45;
      if (c.sp === "fox") {                                   // curious — trails you at a gap
        if (dist < 240) { c.trust = Math.min(1, c.trust + dt * 0.15); c.mode = "curious"; const gap = 84;
          if (dist > gap + 14) { tx = px; ty = py; spd = base * (dist > 160 ? 1.2 : 0.8); }
          else if (dist < gap - 14) { tx = c.x - dx / dist * 30; ty = c.y - dy / dist * 30; spd = base * 0.9; }
          else { tx = c.x; ty = c.y; spd = 0; c.mode = "watch"; }
        } else { c.mode = "graze"; if (c.rest <= 0) { c.rest = 2 + Math.random() * 2.5; c.wtx = c.home.x + (Math.random() - 0.5) * 90; c.wty = c.home.y + (Math.random() - 0.5) * 70; } c.rest -= dt; tx = c.wtx; ty = c.wty; }
      } else {                                                // deer / rabbit — shy, then warm up
        const flee = c.sp === "rabbit" ? 54 : 66;
        if (dist < flee && !calm) { c.mode = "flee"; tx = c.x - dx / dist * 140; ty = c.y - dy / dist * 140; spd = base * 2.2; c.trust = Math.max(0, c.trust - dt * 0.6); }
        else if (dist < 130 && calm) { c.trust = Math.min(1, c.trust + dt * 0.32);
          if (dist <= 30 && c.trust > 0.5) { c.mode = "petted"; spd = 0; }
          else if (c.trust > 0.72) { c.mode = "approach"; tx = px; ty = py; spd = base * 0.5; }
          else { c.mode = "curious"; spd = 0; }
        } else { c.mode = "graze"; c.trust = Math.max(0, c.trust - dt * 0.08);
          if (c.rest <= 0) { c.rest = 1.6 + Math.random() * 2.4; c.wtx = c.home.x + (Math.random() - 0.5) * 84; c.wty = c.home.y + (Math.random() - 0.5) * 64; } c.rest -= dt; tx = c.wtx; ty = c.wty; }
      }
      // keep the TARGET — and the creature — on solid land (never wander/flee into the sea)
      const edge = this.effR() * 0.85;
      { const tr = Math.hypot(tx, ty); if (tr > edge) { tx = tx / tr * edge; ty = ty / tr * edge; } }
      const mdx = tx - c.x, mdy = ty - c.y, md = Math.hypot(mdx, mdy) || 1;
      const dvx = md < 5 ? 0 : (mdx / md) * spd, dvy = md < 5 ? 0 : (mdy / md) * spd;
      c.vx += (dvx - c.vx) * Math.min(1, dt * 6); c.vy += (dvy - c.vy) * Math.min(1, dt * 6);
      c.x += c.vx * dt; c.y += c.vy * dt;
      if (Math.abs(c.vx) > 3) c.face = c.vx > 0 ? 1 : -1;
      c.t += dt;
      const rr = Math.hypot(c.x, c.y); if (rr > edge) { c.x = c.x / rr * edge; c.y = c.y / rr * edge; c.vx *= 0.4; c.vy *= 0.4; }   // shore barrier
    }
  }
  private drawCreatures() {
    if (!this.creatures.length) return;
    const camX = this.camX, camY = this.camY, W = this.LW, H = this.LH;
    for (const c of [...this.creatures].sort((a, b) => a.y - b.y)) {
      const sx = c.x - camX, sy = c.y - camY;
      if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) continue;
      const moving = Math.hypot(c.vx, c.vy) > 6, ph = c.t * 7;
      if (c.sp === "deer") this.drawDeer(sx, sy, c.face, moving, ph, c.mode);
      else if (c.sp === "fox") this.drawFox(sx, sy, c.face, moving, ph);
      else this.drawBunny(sx, sy, c.face, moving, c.t, c.mode);
      if (c.mode === "flee") this.q(sx, sy - 26, "!", "#ffd24a", 0.85, "c", true);
      else if (c.mode === "curious" || c.mode === "watch") this.q(sx, sy - 26, "?", "#9fd0ff", 0.8, "c", true);
      else if (c.mode === "petted" || (c.mode === "approach" && c.trust > 0.85)) { const hy = sy - 24 - Math.abs(Math.sin(this.t * 3)) * 2; this.q(sx, hy, "♥", "#ff6b8f", 0.9, "c", false, 0.95); }
    }
  }
  private drawDeer(sx: number, sy: number, f: number, walk: boolean, ph: number, mode: string) {
    const body = "#8a6a44", body2 = "#9a7a50", leg = "#5a4630";
    const bob = walk ? Math.sin(ph) * 0.6 : Math.sin(this.t * 1.4) * 0.3;
    this.disc(sx, sy + 2, 9, "#0a071440");
    const ly = sy - 6 + bob, step = (i: number) => walk ? Math.max(0, Math.sin(ph + i * Math.PI)) * 2 : 0;
    this.rect(sx - 9 * f, ly, 2, 7 - step(0), leg); this.rect(sx - 3 * f, ly, 2, 7 - step(1), leg);
    this.rect(sx + 4 * f, ly, 2, 7 - step(1), leg); this.rect(sx + 9 * f, ly, 2, 7 - step(0), leg);
    this.fillEll(sx, sy - 15 + bob, 11, 6, body);
    this.fillEll(sx - 8 * f, sy - 15 + bob, 4, 3.5, this.curRing.palette.grass);   // moss on the back
    this.rect(sx + 7 * f - 1, sy - 22 + bob, 3, 8, body);                           // neck
    const headUp = mode !== "graze", hx = sx + 12 * f, hy = sy - (headUp ? 25 : 19) + bob;
    this.fillEll(hx, hy, 5, 4, body2);
    this.rect(hx - 2 * f, hy - 4, 1.6, 3, body);                                     // ear
    this.neonPath([[hx + 1 * f, hy - 3], [hx + 2 * f, hy - 7], [hx + 4 * f, hy - 10]], "#b6ff6a", 3, 1.2, 0.5 + 0.4 * this.nightAmt);
    this.neonPath([[hx + 3 * f, hy - 3], [hx + 5 * f, hy - 6], [hx + 6 * f, hy - 9]], "#b6ff6a", 3, 1.2, 0.5 + 0.4 * this.nightAmt);
    this.glow(hx + 3 * f, hy - 7, 5, "#b6ff6a", 0.2 + 0.3 * this.nightAmt);
    this.disc(hx + 2 * f, hy, 0.8, "#1a1208");                                       // eye
    this.rect(sx - 11 * f, sy - 16 + bob, 1.5, 3, "#e8ddcf");                        // tail
  }
  private drawFox(sx: number, sy: number, f: number, walk: boolean, ph: number) {
    const c = "#d87a3a", c2 = "#e89a54", dk = "#9a5024", leg = "#6a3a1c", white = "#f0e0d0";
    const bob = walk ? Math.sin(ph) * 0.5 : 0;
    this.disc(sx, sy + 2, 7, "#0a071440");
    const ly = sy - 5 + bob, step = (i: number) => walk ? Math.max(0, Math.sin(ph + i * Math.PI)) * 2 : 0;
    this.rect(sx - 7 * f, ly, 1.8, 6 - step(0), leg); this.rect(sx - 2 * f, ly, 1.8, 6 - step(1), leg);
    this.rect(sx + 3 * f, ly, 1.8, 6 - step(1), leg); this.rect(sx + 7 * f, ly, 1.8, 6 - step(0), leg);
    this.fillEll(sx - 10 * f, sy - 9 + bob, 5, 3.5, c); this.disc(sx - 13 * f, sy - 10 + bob, 2.2, white);   // bushy tail
    this.fillEll(sx, sy - 9 + bob, 9, 5, c);
    const hx = sx + 9 * f, hy = sy - 12 + bob;
    this.rect(hx - 3 * f, hy - 5, 2, 3, c); this.rect(hx + 1 * f, hy - 5, 2, 3, c);   // ears
    this.disc(hx - 2 * f, hy - 5, 0.9, dk); this.disc(hx + 2 * f, hy - 5, 0.9, dk);
    this.fillEll(hx, hy, 5, 4, c2);
    this.disc(hx + 5 * f, hy + 0.5, 1.4, dk);                                         // snout
    this.disc(hx + 1.5 * f, hy - 1, 0.6, "#1a1208");                                  // eye
  }
  private drawBunny(sx: number, sy: number, f: number, walk: boolean, t: number, mode: string) {
    const body = "#b8a890", ear = "#a89880";
    const hop = walk ? -Math.abs(Math.sin(t * 9)) * 3 : 0;
    this.disc(sx, sy + 1, 4, "#0a071438");
    this.fillEll(sx, sy - 3 + hop, 4, 3.4, body);
    this.disc(sx + 3 * f, sy - 5 + hop, 2.2, body);                                   // head
    if (mode === "flee") { this.rect(sx + 1 * f, sy - 7 + hop, 3.6, 1.4, ear); this.rect(sx + 2 * f, sy - 8.6 + hop, 3.6, 1.4, ear); }   // ears back
    else { this.rect(sx + 2 * f, sy - 9 + hop, 1.2, 4, ear); this.rect(sx + 4 * f, sy - 9 + hop, 1.2, 4, ear); }                          // ears up
    this.disc(sx - 3 * f, sy - 2 + hop, 1.4, "#e8ddcf");                              // tail
    this.disc(sx + 4 * f, sy - 5 + hop, 0.5, "#1a1208");                              // eye
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
    if (this.curRing.biome === "woodland") {                 // a mossy cap in the deep wood
      const g = this.curRing.palette.grass;
      this.disc(cx - 2 * s, cy - 4 * s, 4 * s, shade(g, 0.05)); this.disc(cx + 2.5 * s, cy - 3 * s, 2.5 * s, g);
    }
  }
  // A collectible wisp (Phase K3 gather quests): a bobbing glowing orb with a soft halo.
  private drawWisp(cx: number, cy: number, c: string) {
    const bob = this.reduce ? 0 : Math.sin(this.t * 2.4 + cx * 0.05) * 2;
    const y = cy - 6 + bob;
    this.disc(cx, cy + 2, 2.5, "#0a071440");                         // faint ground shadow
    if (!this.reduce) this.glow(cx, y, 9, c, 0.34 + 0.12 * Math.sin(this.t * 3 + cy));
    this.disc(cx, y, 2.2, c); this.disc(cx - 0.6, y - 0.6, 0.9, "#ffffff");
    if (!this.reduce) { const a = (this.t + cx) % 1.4; this.q(cx + Math.sin(this.t * 2 + cy) * 3, y - 4 - a * 5, "·", c, 0.8, "c", false, (1 - a / 1.4) * 0.8); }
  }
  private drawFlower(cx: number, cy: number, c: string) {
    // stem + a little leaf, then a rounded 5-petal bloom + centre (reads as a flower,
    // not a jewel — CHR-259 landscape pass)
    this.rect(cx, cy - 4, 1, 5, "#3a6a34");
    this.disc(cx - 1.5, cy - 1, 1.1, "#4c8a46");            // leaf
    const R = 2.1;
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * (TAU / 5); this.disc(cx + Math.cos(a) * R, cy - 5 + Math.sin(a) * R, 1.5, c); }
    // a glowing neon core (tight, pulsing) — the magical accent, breathes with night
    const pulse = this.reduce ? 0.7 : 0.6 + 0.4 * Math.sin(this.t * 2 + cx);
    this.glow(cx, cy - 5, 6, mix(c, "#ffffff", 0.35), (0.1 + 0.26 * this.nightAmt) * pulse + 0.05);
    this.disc(cx, cy - 5, 1.3, mix(c, "#ffffff", 0.6));    // neon core
  }
  private drawBush(cx: number, cy: number) {
    const g = this.curRing.palette.grass, fill = shade(g, -0.14), rim = shade(g, -0.56), hi = shade(g, 0.32);
    this.disc(cx, cy + 2, 7, "#0a071448");
    // dark rim silhouette (so the bush separates from same-colour grass), then lit foliage
    this.disc(cx, cy - 3.5, 6, rim); this.disc(cx - 3, cy - 1, 4.4, rim); this.disc(cx + 3, cy - 1, 4.4, rim);
    this.disc(cx, cy - 3.5, 5, fill); this.disc(cx - 3, cy - 1, 3.4, fill); this.disc(cx + 3, cy - 1, 3.4, fill);
    this.disc(cx - 1.5, cy - 4.5, 1.6, hi);                 // highlight
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
  // An ORGANIC body of water — a blob built from offset lobes (no more concentric
  // "trampoline" rings): deep centre → shallow edge, drifting ripples, and a tight
  // bioluminescent shoreline that breathes with night.
  private drawPond(cx: number, cy: number, r: number) {
    const sea = this.curRing.palette.sea, deep = shade(sea, -0.28), shallow = mix(sea, "#3fb0b8", 0.5);
    const edge = mix(this.curRing.palette.accent, "#5ff2ff", 0.4);
    // deterministic lobe shape (stable per pond via its x): [dx, dy, scale]
    const lobes: [number, number, number][] = [[0, 0, 1], [0.55, -0.12, 0.72], [-0.5, 0.14, 0.64], [0.28, 0.36, 0.5], [-0.28, -0.3, 0.46]];
    const el = (dx: number, dy: number, sc: number, ry: number, c: string) => this.fillEll(cx + dx * r * 0.72, cy + dy * r * 0.62, r * sc, r * sc * ry, c);
    for (const L of lobes) el(L[0], L[1] + 0.06, L[2], 0.62, "rgba(10,15,30,0.30)");   // damp shadow
    for (const L of lobes) el(L[0], L[1], L[2], 0.6, deep);                             // deep water
    for (const L of lobes) el(L[0], L[1], L[2] * 0.82, 0.5, sea);
    for (const L of lobes) this.fillEll(cx + L[0] * r * 0.72 - r * 0.08, cy + L[1] * r * 0.62 - r * 0.08, r * L[2] * 0.5, r * L[2] * 0.3, shallow);
    if (!this.reduce) for (let i = 0; i < 3; i++) { const yy = cy - r * 0.3 + i * r * 0.3 + Math.sin(this.t * 1.4 + i) * 1.4; this.rect(cx - r * 0.35, yy, r * 0.7, 1, "rgba(255,255,255,0.16)"); }   // ripples
    for (const L of lobes) this.neonEllipse(cx + L[0] * r * 0.72, cy + L[1] * r * 0.62, r * L[2] * 0.98, r * L[2] * 0.6, edge, 3, 1, 0.28 + 0.42 * this.nightAmt);   // bioluminescent shoreline
    // water's edge: reeds, grass tufts + the odd bloom (curated, not a full ring)
    const g = this.curRing.palette.grass;
    for (let i = 0; i < 9; i++) {
      const a = i * (TAU / 9) + (Math.abs(cx) % 5) * 0.13;
      const ex = cx + Math.cos(a) * (r * 1.15), ey = cy + Math.sin(a) * (r * 0.66 + 1);
      const k = (i * 7 + (Math.abs(cx) | 0)) % 4;
      if (k === 0) { this.rect(ex, ey - 7, 1, 7, "#3f6f36"); this.rect(ex - 0.5, ey - 8, 2, 2, "#8a6a2e"); }      // cattail reed
      else if (k === 1) this.drawFlower(ex, ey, i % 2 ? "#ff8fbf" : "#ffd24a");                                    // a bloom
      else { this.rect(ex - 1, ey - 3, 1, 4, g); this.rect(ex, ey - 4, 1, 5, g); }                                 // grass tuft
    }
  }

  // ---- groundcover (Phase J3): a static, deterministic scatter of tiny ground details
  //      (tufts/clover/pebbles · snow drifts/sparkles · sand pebbles/ripples · ash specks/
  //      embers) so no biome floor is a flat bald colour. World-space, culled + zoom-aware. ----
  private drawGroundcover(scx: number, scy: number, R: number) {
    const kind = this.groundKind(), pal = this.curRing.palette;
    const half = R - 26, N = Math.min(150, Math.round(R / 4.5));
    const mx = this.LW / 2 * (1 / this.zoom - 1) + 24, my = this.LH / 2 * (1 / this.zoom - 1) + 24;
    for (let i = 0; i < N; i++) {
      const h = (Math.imul(this.ringIdx + 7, 2246822519) + Math.imul(i + 1, 3266489917)) >>> 0;
      const ang = (h % 62831) / 10000, rr = half * (0.06 + ((h >>> 5) % 1000) / 1000 * 0.94);
      const sx = scx + Math.cos(ang) * rr, sy = scy + Math.sin(ang) * rr * 0.82;
      if (sx < -mx || sx > this.LW + mx || sy < -my || sy > this.LH + my) continue;
      this.drawCoverDetail(Math.round(sx), Math.round(sy), kind, (h >>> 12) % 3, pal);
    }
  }
  private drawCoverDetail(x: number, y: number, kind: "snow" | "sand" | "ash" | "grass", v: number, pal: RingPalette) {
    if (kind === "grass") {
      if (v === 0) { const c = shade(pal.grass, 0.22); this.px(x, y, c); this.px(x, y - 1, c); this.px(x + 1, y, shade(pal.grass, -0.18)); }   // grass tuft
      else if (v === 1) { const c = shade(pal.grass, -0.24); this.px(x - 1, y, c); this.px(x + 1, y - 1, c); this.px(x, y + 1, c); }             // clover speckle
      else this.px(x, y, "rgba(178,168,148,0.5)");                                                                                                // pebble
    } else if (kind === "snow") {
      if (v === 0) this.disc(x, y, 1.4, "rgba(255,255,255,0.5)"); else this.px(x, y, "rgba(202,226,255,0.6)");                                     // drift / sparkle
    } else if (kind === "sand") {
      if (v === 0) { this.px(x, y, "rgba(120,100,70,0.5)"); this.px(x + 1, y, "rgba(120,100,70,0.32)"); }                                          // pebble
      else if (v === 1) this.rect(x - 3, y, 6, 1, "rgba(255,240,200,0.16)");                                                                       // ripple
      else this.px(x, y, shade(pal.sand, -0.2));
    } else {   // ash
      if (v === 0) this.px(x, y, "rgba(40,34,30,0.6)");                                                                                            // dark speck
      else if (v === 1) this.rect(x - 1, y, 3, 1, "rgba(18,14,12,0.5)");                                                                           // crack
      else if (!this.reduce) this.disc(x, y, 1, hexA("#ff8c3c", 0.28 + 0.1 * Math.sin(this.t * 2 + x)));                                           // ember glow
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
    // pet-a-critter (I6): while you hold still (standing or sitting, but not AFK-dozing or
    // mid-dialog), the nearest critter warms to you → a little heart
    const still = this.walk <= 0 && !this.dozing && !this.dialog;
    let petX = 0, petY = 0, petD = 1e9;
    // ecological clumping: creatures (not weather particles) gather near their flora
    const creature = kind === "butterfly" || kind === "bee" || kind === "dragonfly" || kind === "firefly" || kind === "grasshopper";
    const anchors: { x: number; y: number }[] = [];
    if (creature) { const fl = this.curRing.props.filter((p) => p.t === "tree" || p.t === "fern" || p.t === "flower" || p.t === "fairyring"); const st = Math.max(1, Math.floor(fl.length / 6)); for (let k = 0; k < fl.length && anchors.length < 6; k += st) anchors.push(fl[k]); }
    for (let i = 0; i < N; i++) {
      // a deterministic world anchor spread across the island (stays with the ground)
      const h = this.ringIdx * 131 + i * 977 + 17;
      const ang = (h % 6283) / 1000, rad = R * (0.1 + ((h >> 3) % 82) / 100);
      let fx: number, fy: number;                                 // final world position
      if (anchors.length) { const an = anchors[i % anchors.length]; fx = an.x + Math.cos(ang) * 34; fy = an.y + Math.sin(ang) * 22; }   // orbit a flora clump
      else { fx = Math.cos(ang) * rad; fy = Math.sin(ang) * rad; }
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
      if (still) { const d = Math.hypot(fx - this.posX, fy - this.posY); if (d < 26 && d < petD) { petD = d; petX = sx; petY = sy; } }
    }
    // the nearby critter shows a little heart — it's being petted
    if (still && petD < 26) { const hy = petY - 7 - Math.abs(Math.sin(this.t * 3)) * 2; this.q(petX, hy, "♥", "#ff6b8f", 0.85, "c", false, 0.9); }
    // WOODLAND signature ambience: drifting spore-motes (day AND night) + grazing moss-deer
    if (this.curRing.biome === "woodland") {
      for (let i = 0; i < 16; i++) {
        const h2 = this.ringIdx * 57 + i * 131 + 9, ax = ((h2 % 2000) / 1000 - 1) * R * 0.85, span = R * 1.3;
        const ay = R * 0.6 - ((t * 8 + (h2 % 1000) * 0.13) % span), sx = ax + Math.sin(t * 0.6 + i) * 8 - camX, sy = ay - camY;
        if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
        const a = (0.1 + 0.22 * this.nightAmt) * (0.45 + 0.55 * Math.sin(t * 1.3 + i));
        this.glow(sx, sy, 3.5, "#a8ffe0", a); this.disc(sx, sy, 0.7, "#e8fff6");
      }
      // birds flitting around the canopies (deer/rabbits/fox are now the stateful creatures)
      const tr = this.curRing.props.filter((p) => p.t === "tree"), bEdge = R * 0.85;
      for (let d = 0; d < 4 && tr.length; d++) {
        const an = tr[(d * 17 + 2) % tr.length];
        let bx = an.x + Math.sin(t * 0.8 + d * 1.7) * 30, by = an.y - 30 + Math.cos(t * 0.7 + d) * 16;
        const br = Math.hypot(bx, by); if (br > bEdge) { bx = bx / br * bEdge; by = by / br * bEdge; }   // birds stay over the island
        const sx = bx - camX, sy = by - camY; if (sx > -20 && sx < W + 20 && sy > -20 && sy < H + 20) this.drawBird(sx, sy, t * 1.4 + d);
      }
    }
    this.drawCreatures();   // the stateful, reacting fauna (any biome that has them)
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
  // ---- focal landmarks (Phase J4): memorable set-pieces that anchor each biome ----
  private drawLandmark(cx: number, cy: number, p: Prop) {
    const near = this.near === p;
    switch (p.lm) {
      case "greattree": this.lmGreatTree(cx, cy); break;
      case "stonecircle": this.lmStoneCircle(cx, cy); break;
      case "lighthouse": this.lmLighthouse(cx, cy); break;
      case "crystal": this.lmCrystal(cx, cy); break;
      case "waterfall": this.lmWaterfall(cx, cy); break;
      case "ruin": this.lmRuin(cx, cy); break;
      default: break;
    }
    if (near || this.zoom < 0.6) this.labelPill(cx, cy - 74, p.label || "Landmark", p.accent || "#ffd24a");
  }
  private lmGreatTree(cx: number, cy: number) {
    const g = this.curRing.palette.grass, fill = shade(g, -0.2), rim = shade(g, -0.62), hi = shade(g, 0.34);
    this.disc(cx, cy + 4, 16, "#0a071452");
    this.rect(cx - 5, cy - 30, 10, 32, "#3a2a1a"); this.rect(cx - 5, cy - 30, 3, 32, "#4a3624");   // trunk
    this.rect(cx - 9, cy - 1, 4, 3, "#3a2a1a"); this.rect(cx + 5, cy - 1, 4, 3, "#3a2a1a");         // roots
    const clumps: [number, number, number][] = [[0, -52, 22], [-16, -44, 15], [16, -44, 15], [0, -66, 16]];
    for (const [dx, dy, r] of clumps) this.disc(cx + dx, cy + dy, r + 2, rim);
    for (const [dx, dy, r] of clumps) this.disc(cx + dx, cy + dy, r, fill);
    this.disc(cx - 8, cy - 62, 6, hi);
    if (!this.reduce) { this.glow(cx - 14, cy - 36, 8, "#ffcf6b", 0.3); this.glow(cx + 14, cy - 36, 8, "#ffcf6b", 0.3); }
    this.disc(cx - 14, cy - 36, 1.6, "#ffe0a0"); this.disc(cx + 14, cy - 36, 1.6, "#ffe0a0");        // hanging lanterns
  }
  private lmStoneCircle(cx: number, cy: number) {
    this.disc(cx, cy + 4, 24, "#0a071445");
    if (!this.reduce) this.glow(cx, cy - 6, 15, this.curRing.palette.accent, 0.18 + 0.08 * Math.sin(this.t * 1.5));
    this.rect(cx - 6, cy - 3, 12, 5, "#4a4652"); this.rect(cx - 6, cy - 3, 12, 1, "#605c6a");        // altar
    const n = 7, stones: [number, number][] = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU; stones.push([cx + Math.cos(a) * 26, cy + Math.sin(a) * 15]); }
    stones.sort((a, b) => a[1] - b[1]);
    for (const [sx, sy] of stones) { this.rect(sx - 3, sy - 17, 6, 19, "#5a5560"); this.rect(sx - 3, sy - 17, 6, 2, "#6e6878"); this.rect(sx - 2, sy - 15, 1, 13, "#797286"); }
  }
  private lmLighthouse(cx: number, cy: number) {
    const b = this.b, s = this.SS;
    this.disc(cx, cy + 4, 12, "#0a071452");
    this.rect(cx - 9, cy - 8, 18, 8, "#8a8078"); this.rect(cx - 2, cy - 6, 4, 6, "#3a3238");         // base + door
    for (let i = 0; i < 9; i++) { const yy = cy - 8 - i * 6, w = 9 - i * 0.45; this.rect(cx - w, yy - 6, w * 2, 6, i % 2 === 0 ? "#e8e2da" : "#c0392b"); this.rect(cx - w, yy - 6, w * 2, 1, "#ffffff30"); }
    const ly = cy - 8 - 9 * 6;
    this.rect(cx - 7, ly - 1, 14, 2, "#5a5560"); this.rect(cx - 6, ly - 6, 12, 6, "#3a3540");        // gallery + lamp room
    this.rect(cx - 4, ly - 4, 8, 4, "#ffe9a8"); this.triY(cx, ly - 13, 8, 7, "#b0362a");             // light + roof
    if (!this.reduce) {
      this.glow(cx, ly - 2, 20, "#fff0b0", 0.4 + 0.15 * Math.sin(this.t * 2));
      const dx = Math.cos(this.t * 0.7);                                                              // sweeping beam
      b.fillStyle = hexA("#fff0b0", 0.12); b.beginPath(); b.moveTo(cx * s, (ly - 2) * s); b.lineTo((cx + dx * 62) * s, (ly - 20) * s); b.lineTo((cx + dx * 62) * s, (ly + 16) * s); b.closePath(); b.fill();
    }
  }
  private lmCrystal(cx: number, cy: number) {
    const ac = this.curRing.palette.accent;
    this.disc(cx, cy + 4, 14, "#0a071452");
    if (!this.reduce) this.glow(cx, cy - 26, 40, ac, 0.26 + 0.12 * Math.sin(this.t * 1.4));
    this.triY(cx - 12, cy - 30, 6, 28, shade(ac, -0.18)); this.triY(cx + 12, cy - 34, 7, 32, shade(ac, 0.06));   // side shards
    this.triY(cx, cy - 54, 10, 42, ac); this.rect(cx - 8, cy - 14, 16, 14, shade(ac, -0.12));                    // main shard + base
    this.rect(cx - 2, cy - 48, 3, 46, "#ffffff");                                                                 // highlight
    this.triY(cx - 8, cy - 18, 5, 18, ac); this.triY(cx + 9, cy - 16, 5, 16, ac);
    if (!this.reduce) for (let i = 0; i < 3; i++) { const yy = cy - 44 - ((this.t * 8 + i * 14) % 30); this.px(cx - 10 + i * 10, Math.round(yy), "#ffffff"); }
  }
  private lmWaterfall(cx: number, cy: number) {
    const b = this.b, s = this.SS;
    this.disc(cx, cy + 3, 20, "#0a071440");
    this.rect(cx - 14, cy - 46, 28, 46, "#4a4652"); this.rect(cx - 14, cy - 46, 28, 3, "#5e5a68");   // cliff
    this.rect(cx - 14, cy - 46, 4, 46, "#565260"); this.rect(cx + 10, cy - 46, 4, 46, "#3e3a48");
    for (let i = 0; i < 3; i++) this.rect(cx - 6 + i * 6 - 1, cy - 44, 3, 42, "rgba(190,230,255,0.7)");   // water columns
    if (!this.reduce) for (let i = 0; i < 6; i++) { const yy = cy - 44 + ((this.t * 44 + i * 8) % 44); this.px(cx - 6 + ((i * 4) % 13), Math.round(yy), "rgba(255,255,255,0.85)"); }
    b.fillStyle = hexA("#7fd0e0", 0.5); b.beginPath(); b.ellipse(cx * s, cy * s, 16 * s, 5 * s, 0, 0, TAU); b.fill();   // pool
    if (!this.reduce) for (let i = 0; i < 4; i++) this.disc(cx - 8 + i * 5, cy - 2 - Math.sin(this.t * 2 + i) * 2, 2, "rgba(220,245,255,0.25)");   // mist
  }
  private lmRuin(cx: number, cy: number) {
    this.disc(cx, cy + 4, 18, "#0a071445");
    const st = "#6a5a48", st2 = "#54473a", st3 = "#7e6e56";
    const cols: [number, number][] = [[-16, -30], [0, -40], [16, -24]];
    for (const [dx, h] of cols) { const topY = cy + h, ht = -h; this.rect(cx + dx - 4, topY, 8, ht, st); this.rect(cx + dx - 4, topY, 8, 2, st3); this.rect(cx + dx - 4, topY, 2, ht, st2); }
    this.rect(cx - 20, cy - 42, 22, 5, st); this.rect(cx - 20, cy - 42, 22, 1, st3);                  // fallen lintel
    if (!this.reduce) this.glow(cx, cy - 16, 16, this.curRing.palette.accent, 0.15 + 0.06 * Math.sin(this.t * 1.5));
    this.px(cx - 1, cy - 16, this.curRing.palette.accent);
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
    const near = this.near === p;
    // The "up" exit themes itself to the sub-map it sits in — a rock hole in a cave,
    // but a bright cloud-stair on the all-white Cloud Reach (a grey cave there was
    // easy to miss / didn't read as the way out).
    let kind: string = p.sub || "cave";
    if (kind === "up" && subKindOf(this.ringIdx) === "cloud") kind = "cloud-exit";
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
    } else if (kind === "cloud-exit") {
      // the way DOWN off the Cloud Reach — a gap in the clouds onto the blue sky below.
      // Deliberately high-contrast (blues on white) so it reads as the exit on a white realm.
      this.disc(cx, cy, 15, "#2f6db0");                                   // sky-hole rim
      this.disc(cx, cy, 12, "#4f97dc");                                   // open sky below
      this.disc(cx, cy - 1, 9, "#8fc4f2");
      for (let i = 0; i < 4; i++) { const yy = cy + i * 5 - 6, w = 16 - i * 3; this.rect(cx - w / 2, yy, w, 3, i % 2 ? "#3f7fc0" : "#5aa0e0"); }   // steps descending
      this.rect(cx - 4, cy + 9, 8, 2, "#dff0ff"); this.rect(cx - 2, cy + 11, 4, 2, "#dff0ff");   // down chevron
      this.glow(cx, cy, 22, "#bfe0ff", 0.3 + (near ? 0.2 : 0));
      this.labelPill(cx, cy - 22, p.label || "↓ to the surface", "#dff0ff");
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
  // A floating name, drawn crisp with a dark outline (no box) and lifted clear of the
  // head + emotes so it never obscures the character (polish pass).
  private nameTag(cx: number, feet: number, name: string, c: string) {
    this.q(cx, feet - 34, name, c, 0.92, "c", true, 1, true);
  }
  // A place label (landmarks, docks, portals, gathering spots) — crisp outlined text, no
  // box, matching the character name tags (readability polish).
  private labelPill(cx: number, y: number, s: string, c: string) {
    this.q(cx, y, s, c, 0.95, "c", true, 1, true);
  }
  private drawHud() {
    const it = this.itop(), ib = this.ibot();
    // top row (below the floating header): online (left, tap → who's here) · sparks (right)
    this.ring(9, it + 6, 3, "#33e650", 1.3); this.q(15, it + 2, `${this.stats.online}`, "#c2fbe0", 1, "l");
    this.q(15 + this.textWidth(`${this.stats.online}`, 1) + 3, it + 2, "▾", "#7fe0b0", 0.8, "l", false, 0.7);
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
      const label = this.near.t === "shop" ? `Enter ${this.near.label || "the shop"}`
        : this.near.t === "home" ? "Enter your Home"
        : this.near.t === "tunnel" ? "Enter the burrow"
        : this.near.t === "storm" ? "Brave the storm"
        : this.near.t === "npc" && this.near.shopId ? `Browse ${this.near.label || "the"}'s wares`
        : this.near.t === "wonders" ? "Enter CirqlCade"
        : this.near.t === "npc" ? `Talk to ${this.near.label || ""}`
          : this.near.t === "lantern" ? "Light the lantern"
            : this.near.t === "dock" ? (this.near.label || "Set sail")
              : this.near.t === "tablet" ? "Read the runestone"
                : this.near.t === "rune" ? (this.near.id && this.lit.has(this.near.id) ? "Dim the rune" : "Wake the rune")
                  : this.near.t === "shrine" ? (this.puzzleSolved() ? "Enter the shrine" : "The shrine is sealed")
                    : this.near.t === "theater" ? "Watch the show"
                      : this.near.t === "gathering" ? "Rest a while"
                        : this.near.t === "landmark" ? `Visit ${this.near.label || "the landmark"}`
                        : this.near.t === "portal" ? (this.near.sub === "up" ? (isTunnel(this.ringIdx) ? (this.near.label || "Take the exit") : isHome(this.ringIdx) ? "Leave your home" : isShop(this.ringIdx) ? "Leave the shop" : "Return to the surface") : this.near.sub === "cave" ? "Descend into the cave" : this.near.sub === "tree" ? "Climb the great tree" : "Ascend the cloud stair")
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
    const subHint = isHome(this.ringIdx) ? "home · tap to leave" : isShop(this.ringIdx) ? "inside · tap to leave" : inSub ? (subKindOf(this.ringIdx) === "cave" ? "underground" : subKindOf(this.ringIdx) === "tree" ? "in the trees" : "in the clouds") : "tap · chart";
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
    const cx = W / 2, cy = H / 2 + 4, maxR = Math.min(W, H) * 0.40 * this.chartZoom, step = maxR / rings;
    this.chartGeom = { cx, cy, step, rings };   // remember the layout so a tap can fast-travel (once unlocked)
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
    // zoom +/− buttons (spread the rings to tap precisely / fit them all when many appear)
    for (const which of ["in", "out"] as const) {
      const btn = this.chartBtn(which);
      this.disc(btn.x, btn.y, btn.r, "rgba(20,34,60,0.92)"); this.ring(btn.x, btn.y, btn.r, "rgba(127,224,208,0.6)", 1.2);
      this.rect(btn.x - 4, btn.y - 0.5, 8, 1.5, "#7be0d0"); if (which === "in") this.rect(btn.x - 0.5, btn.y - 4, 1.5, 8, "#7be0d0");
    }
    // fast-travel affordance: mark charted rings tappable once unlocked (reached ring 5)
    if (this.fastTravelReady()) {
      for (let i = 0; i < this.knownRings(); i++) { if (i === homeRing) continue; const rad = step * (i + 1); this.disc(cx, cy + rad, 1.6, "rgba(127,224,208,0.8)"); }
      this.q(W / 2, H - this.ibot() - 12, "tap a ring to sail there · tap outside to close", "#7be0d0", 0.95, "c", true);
    } else {
      this.q(W / 2, H - this.ibot() - 20, "tap anywhere to close", "#8fa6c6", 0.95, "c");
      this.q(W / 2, H - this.ibot() - 10, "reach the 5th ring to unlock fast travel", "#6f86ad", 0.82, "c");
    }
  }
  private drawDialog() {
    this.dialogChoiceRects = [];
    if (!this.dialog) return;
    const d = this.dialog, node = this.dialogNode(); if (!node) return;
    const boxH = 40, boxY = this.LH - this.ibot() - boxH - 6;
    const atEnd = d.i >= node.lines.length - 1;
    const showChoices = atEnd && !!node.choices?.length;
    // branching choices (K1): tappable buttons stacked above the dialog box at the last line
    if (showChoices) {
      const ch = node.choices!;
      const cw = Math.min(this.LW - 12, 190), cx = 6, chH = 13;
      let cy = boxY - 4 - ch.length * (chH + 3);
      for (let i = 0; i < ch.length; i++) {
        const ry = cy + i * (chH + 3);
        this.rect(cx, ry, cw, chH, "#12172ef2"); this.rectLine(cx, ry, cw, chH, d.accent);
        this.q(cx + 6, ry + 3, ch[i].label, "#eaf6ff", 0.95, "l", true);
        this.dialogChoiceRects.push({ x: cx, y: ry, w: cw, h: chH });
      }
    }
    this.rect(6, boxY, this.LW - 12, boxH, "#0a0714ee");
    this.rectLine(6, boxY, this.LW - 12, boxH, d.accent);
    this.q(11, boxY + 4, d.name, d.accent, 1, "l", true);
    const line = node.lines[d.i] || "";
    const words = line.split(" "); const rows: string[] = []; let cur = "";
    for (const w of words) { const tryn = cur ? cur + " " + w : w; if (this.textWidth(tryn, 1) > this.LW - 34 && cur) { rows.push(cur); cur = w; } else cur = tryn; }
    if (cur) rows.push(cur);
    for (let i = 0; i < Math.min(3, rows.length); i++) this.q(11, boxY + 15 + i * 9, rows[i], "#eaf6ff", 1, "l");
    const hint = !atEnd ? "E ▸" : showChoices ? "▲ pick" : "E ✕";
    this.q(this.LW - 11, boxY + boxH - 10, hint, "#9fb0d0", 1, "r");
  }

  // ---------- smooth-text overlay (crisp UI at full display resolution) ----------
  protected onOverlay(g: CanvasRenderingContext2D) {
    if (!this.ui.length) return;
    const sc = this.dispW / this.LW;                       // logical → CSS px
    const q = this.SS;                                     // the pixel-buffer lattice
    g.textBaseline = "top";
    g.shadowColor = "rgba(0,0,0,0.85)"; g.shadowOffsetX = 0; g.shadowOffsetY = Math.max(1, sc);
    for (const it of this.ui) {
      const fs = Math.max(9, Math.round(it.sc * 7.4 * sc));
      g.font = `${it.bold ? 700 : 600} ${fs}px "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif`;
      g.textAlign = it.align === "c" ? "center" : it.align === "r" ? "right" : "left";
      g.globalAlpha = it.alpha ?? 1;
      // Match the label to its object: world labels (z) sit inside the live zoom transform,
      // so scale them around screen-centre by the same zoom (fixes labels drifting/tracking
      // your movement when zoomed). Then snap to the buffer-pixel lattice so they don't swim
      // sub-pixel against the nearest-neighbour world blit.
      const ix = it.z ? this.LW / 2 + (it.x - this.LW / 2) * this.zoom : it.x;
      const iy = it.z ? this.LH / 2 + (it.y - this.LH / 2) * this.zoom : it.y;
      const lx = Math.round(ix * q) / q * sc, ly = Math.round(iy * q) / q * sc;
      // haloed text (names) reads on ANY background via a thin dark outline instead of a box
      if (it.halo) {
        g.shadowBlur = 0;
        g.strokeStyle = "rgba(6,6,16,0.9)"; g.lineJoin = "round"; g.lineWidth = Math.max(1.5, fs * 0.18);
        g.strokeText(it.s, lx, ly);
        g.shadowColor = "rgba(0,0,0,0.9)"; g.shadowBlur = 3;
      } else g.shadowBlur = 2 * sc;
      g.fillStyle = it.c;
      g.fillText(it.s, lx, ly);
    }
    g.globalAlpha = 1; g.shadowBlur = 0; g.shadowOffsetY = 0; g.textAlign = "left";
  }
}
