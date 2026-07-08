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
import { isShop, shopIdAt } from "./cirql-shops";
import { isHome } from "./cirql-home";
import { CirqlOrchestra } from "./cirql-orchestra";
import { tracksForContext } from "./cirql-music";
import { cirqlSfx, type SfxKind } from "./cirql-sfx";
import { activeEvent } from "./cirql-daily";
import { MOVIES, REEL_SECONDS } from "./cirql-theater";
import {
  allQuests, questById, offerableQuest, repeatableQuest, questStatusList, registerQuest,
  type QuestDef, type QuestProgress, type ObjectiveKind, type QuestStatus, type Objective,
} from "./cirql-quests";
import { generateRingQuests } from "./cirql-quest-gen";
import { EMOTE_BY_ID, EMOTE_SECONDS, PAIR_BY_ID } from "./cirql-emotes";
import { arrivalCutscene, BEAT_SECONDS, type Cutscene, type CutsceneBeat, type CutsceneFx } from "./cirql-cutscenes";
import { decorById, DECOR_SOLID } from "./cirql-decor";
import { npcLook, type NpcLook } from "./cirql-npc-looks";
import { simpleDialog, npcConversation, choiceDialog, type DialogTree, type DialogChoice } from "./cirql-dialog";
import { npcProfile } from "./cirql-npc-cast";

export type InteractKind = "wonders" | "npc" | "dock" | "shop" | "shopkeeper" | "barber";
export interface CirqlStats { sparks: number; cirqlLit: number; cirqlTotal: number; online: number; energy: number; }
export interface QuestLogRow { id: string; name: string; status: QuestStatus; objective: string; tier?: number; reward?: number; renownReward?: number; steps?: number; }

const TAU = Math.PI * 2;
// per-biome tree silhouettes (canopyStyle → drawTree dispatch)
type CanopyKind = "round" | "pine" | "mushroom" | "willow" | "palm" | "maple" | "blossom" | "acacia" | "frostpine" | "toadstool";
// stateful hero fauna sprites (per biome, some recoloured via a `variant`) + pet-only species (cat/dog)
type Species = "deer" | "rabbit" | "fox" | "salamander" | "crab" | "frog" | "squirrel" | "moth" | "cat" | "dog";
// Pet roster (P1): cozy classics + CIRQL natives. `sp` = which sprite to draw; cost in sparqs.
const PET_CATALOG: { type: string; label: string; cost: number; sp: Species; variant?: string }[] = [
  { type: "cat", label: "Cat", cost: 30, sp: "cat" },
  { type: "dog", label: "Dog", cost: 40, sp: "dog" },
  { type: "bunny", label: "Bunny", cost: 28, sp: "rabbit" },
  { type: "salamander", label: "Salamander", cost: 25, sp: "salamander" },
  { type: "moth", label: "Glow-moth", cost: 35, sp: "moth" },
];
const PET_NAMES = ["Pip", "Mochi", "Biscuit", "Nova", "Clover", "Sunny", "Pepper", "Waffle", "Ziggy", "Luna", "Bramble", "Tofu"];
const petSpec = (type: string) => PET_CATALOG.find((p) => p.type === type);

// SPACE STYLES (home customization): reskin your CIRQLSPACE (ring 0) with a biome's palette +
// its atmosphere (the floating critter). Two free starters; the rest cost sparqs (then owned).
type SpaceAmbient = "butterfly" | "firefly" | "ember" | "snow" | "dragonfly" | "grasshopper";
const SPACE_STYLES: { id: string; label: string; cost: number; ambient: SpaceAmbient; palette: RingPalette }[] = [
  { id: "hearth", label: "Hearth (default)", cost: 0, ambient: "butterfly", palette: { sky: ["#241640", "#12163a"], sea: "#0c2036", land: "#243a2f", grass: "#2f5340", sand: "#c9ad74", accent: "#ffc46b", mote: "#ffd98a" } },
  { id: "meadow", label: "Spring Meadow", cost: 0, ambient: "butterfly", palette: { sky: ["#20331f", "#12241a"], sea: "#0e2c33", land: "#2a5a30", grass: "#43884a", sand: "#cdb87a", accent: "#a6f06a", mote: "#e0ffb0" } },
  { id: "woodland", label: "Enchanted Wood", cost: 40, ambient: "firefly", palette: { sky: ["#18402a", "#0d2114"], sea: "#0c2036", land: "#245e3a", grass: "#38975c", sand: "#a89060", accent: "#8ef0a0", mote: "#c8ffd6" } },
  { id: "tropical", label: "Tropical Lagoon", cost: 50, ambient: "dragonfly", palette: { sky: ["#0e3040", "#0a2233"], sea: "#0a5f70", land: "#1f5a52", grass: "#2f8a6a", sand: "#f0e0a0", accent: "#4fe0d0", mote: "#bafff0" } },
  { id: "winter", label: "Winter Frost", cost: 40, ambient: "snow", palette: { sky: ["#1b2740", "#101a30"], sea: "#173a56", land: "#3a4a60", grass: "#5a6f88", sand: "#dfeaf6", accent: "#bfe6ff", mote: "#eef7ff" } },
  { id: "ember", label: "Ember Reach", cost: 60, ambient: "ember", palette: { sky: ["#2a1410", "#160a08"], sea: "#1a0c08", land: "#3a2620", grass: "#4a342c", sand: "#6a4a3a", accent: "#ff6a1a", mote: "#ffab3a" } },
  { id: "aurora", label: "Aurora Night", cost: 60, ambient: "snow", palette: { sky: ["#101a34", "#0a1024"], sea: "#122844", land: "#26324e", grass: "#3a5270", sand: "#dfeaf6", accent: "#5cffb0", mote: "#b0ffd8" } },
  { id: "marsh", label: "Mushroom Marsh", cost: 50, ambient: "firefly", palette: { sky: ["#12242e", "#0a151c"], sea: "#0c2a2e", land: "#1c3a34", grass: "#2c6656", sand: "#7a7a5a", accent: "#c85cff", mote: "#ff9ae0" } },
  { id: "desert", label: "Golden Desert", cost: 50, ambient: "grasshopper", palette: { sky: ["#3a2414", "#20140c"], sea: "#243026", land: "#6a4526", grass: "#8a6a34", sand: "#e8c485", accent: "#ffb058", mote: "#ffe0a8" } },
];
const spaceStyleById = (id: string) => SPACE_STYLES.find((s) => s.id === id);
// SPACE PATTERNS — a decorative motif tiled over your home ground (a second style axis).
const SPACE_PATTERNS: { id: string; label: string; cost: number }[] = [
  { id: "none", label: "Plain", cost: 0 }, { id: "checker", label: "Checkerboard", cost: 0 },
  { id: "dots", label: "Polka Dots", cost: 30 }, { id: "stripes", label: "Stripes", cost: 30 },
  { id: "grid", label: "Tile Grid", cost: 30 }, { id: "waves", label: "Ripples", cost: 40 },
  { id: "petals", label: "Petals", cost: 40 }, { id: "stars", label: "Starfield", cost: 50 },
];

// A four-legged animal's build — fed to drawQuadruped, which renders it in ANY of the 4
// facings (toward you / away / left / right) with articulated, swinging legs.
interface QuadSpec {
  body: string; body2: string; leg: string; belly?: string; patch?: string;
  bodyLen: number; bodyH: number; legLen: number; legW: number; neckLen: number; headR: number;
  ear: "up" | "flop" | "cat" | "tuft"; tail: "deer" | "bushy" | "curl" | "flick"; tailCol: string;
  antlers?: string;   // glow colour for deer-style antlers
}
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
  private lean = 0;      // eased body lean into movement (emotive locomotion) — radians
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
  /** Fired when a quest grants a décor/cosmetic item — host adds it to the owned set (free). */
  onGrant?: (itemId: string) => void;
  // ---- Phase K7 delivery/reward state ----
  private playerRank = 0;                  // Renown rank index (host keeps it in sync) — for require.minRenownRank
  private codex = new Set<string>();       // recorded lore/collection entries
  private healed = new Set<string>();      // curio ids "healed" by an emergent quest (drawn as mended)
  // Phase 2 verbs
  private escortee: { x: number; y: number; vx: number; vy: number; destId: string } | null = null;   // a follower being led to a place
  private questTimer: { id: string; left: number } | null = null;   // a timed RACE's countdown
  private pendingRiddle: string | null = null;   // a riddle awaiting an answer
  private censusSeen = new Set<string>();  // distinct creature keys spotted for the active census
  // ---- Pets (P1): companions that live at your CIRQLSPACE ----
  private pets: { id: string; type: string; name: string; sp?: Species; variant?: string; bond?: number }[] = [];
  private petStarter = false;              // granted the free starter pet yet?
  private petTalk: string | null = null;   // the pet id you're currently interacting with
  private wildTalk: (typeof this.creatures)[number] | null = null;   // the wild critter you're taming
  private treats = 3;                       // pet treats — feed to bond, offer wild critters to tame them
  /** Host wiring: buy a pet (host checks/deducts sparqs, then calls addPet) · rename via a prompt · persist. */
  onBuyPet?: (type: string, cost: number) => void;
  onBuyTreats?: (count: number, cost: number) => void;   // buy a bag of treats (host deducts, calls addTreats)
  onPetGift?: (n: number) => void;                        // a well-bonded pet finds you a sparq or two
  onRenamePet?: (id: string, current: string) => void;
  onPetsChange?: () => void;
  getPets() { return this.pets.map((p) => ({ ...p })); }
  getTreats() { return this.treats; }
  addTreats(n: number) { this.treats = Math.max(0, this.treats + n); this.onPetsChange?.(); if (n > 0) this.toast(`🍬 +${n} treats (${this.treats} total).`); }
  private petBond(id: string | null | undefined) { const p = this.pets.find((x) => x.id === id); return p ? (p.bond ?? 20) : 0; }
  private raiseBond(id: string | null | undefined, amt: number) { const p = this.pets.find((x) => x.id === id); if (!p) return; p.bond = Math.max(0, Math.min(100, (p.bond ?? 20) + amt)); this.onPetsChange?.(); }
  // ---- Space styles + patterns: customize your CIRQLSPACE (home customization) ----
  private spaceStyle = "hearth";
  private spacePattern = "none";
  onSelectStyle?: (id: string, cost: number) => void;     // host checks owned/sparqs, then calls setSpaceStyle
  onSelectPattern?: (id: string, cost: number) => void;   // ditto for a ground pattern
  getSpaceStyle() { return this.spaceStyle; }
  getSpacePattern() { return this.spacePattern; }
  /** Apply a space style (host cleared the cost): re-skins CIRQLSPACE's palette + atmosphere live. */
  setSpaceStyle(id: string) {
    if (!spaceStyleById(id)) return;
    this.spaceStyle = id;
    if (this.ringIdx === 0) { this.curRing = this.styleRing(getRing(0)); this.creaturesRing = -999; }   // refresh ambient/pets
    this.toast(`Your CIRQLSPACE now wears "${spaceStyleById(id)?.label}".`);
    this.onPetsChange?.();
  }
  setSpacePattern(id: string) {
    if (!SPACE_PATTERNS.some((p) => p.id === id)) return;
    this.spacePattern = id; this.toast(`Ground pattern: ${SPACE_PATTERNS.find((p) => p.id === id)?.label}.`); this.onPetsChange?.();
  }
  /** Ring 0 gets the chosen style's palette + atmosphere (a clone; never mutates the shared ring). */
  private styleRing(r: Ring): Ring {
    if (r.index === 0 && this.spaceStyle && this.spaceStyle !== "hearth") {
      const st = spaceStyleById(this.spaceStyle); if (st) return { ...r, palette: st.palette, ambient: st.ambient };
    }
    return r;
  }
  /** Adopt a pet (called by the host after it takes the sparqs). Appears at your CIRQLSPACE. */
  addPet(type: string, name?: string) {
    const spec = petSpec(type); if (!spec) return;
    const n = this.pets.reduce((m, p) => Math.max(m, parseInt(p.id.replace("pet-", "")) || 0), 0) + 1;
    const nm = name || PET_NAMES[(this.pets.length * 7 + type.length) % PET_NAMES.length];
    const pet = { id: "pet-" + n, type, name: nm, bond: 25 };
    this.pets.push(pet);
    if (this.ringIdx === 0 && !this.reduce) this.spawnOnePet(pet);   // pop into your space right away
    this.sfx("quest"); this.present("🐾", "#ffd24a");
    this.toast(`🐾 ${nm} the ${spec.label.toLowerCase()} joined your Cirql!`);
    this.onPetsChange?.();
  }
  /** Tame + adopt a WILD creature you've befriended (any species — the further out, the rarer). It
   *  becomes your companion in place AND lives at your CIRQLSPACE. Records its exact species/variant. */
  private adoptWild(c: (typeof this.creatures)[number]) {
    if (c.pet) return;
    const n = this.pets.reduce((m, p) => Math.max(m, parseInt(p.id.replace("pet-", "")) || 0), 0) + 1;
    const nm = PET_NAMES[(this.pets.length * 7 + (c.sp.length)) % PET_NAMES.length];
    const id = "pet-" + n;
    const label = this.creatureLabel(c.sp, c.variant);
    this.pets.push({ id, type: "wild:" + c.sp, name: nm, sp: c.sp, variant: c.variant, bond: 40 });   // starts loyal — you earned it
    c.pet = id; c.name = nm; c.trust = 1; c.joy = 2; c.mode = "approach";   // befriended right here
    this.sfx("quest"); this.present("🐾", "#ffd24a");
    this.toast(`🐾 ${nm} the ${label} trusts you now — a companion for life!`);
    this.onPetsChange?.();
  }
  private creatureLabel(sp: Species, variant?: string) {
    const cat = PET_CATALOG.find((p) => p.sp === sp && p.variant === variant) || PET_CATALOG.find((p) => p.sp === sp);
    if (cat) return cat.label.toLowerCase();
    return (variant ? variant + " " : "") + sp;
  }
  renamePet(id: string, name: string) {
    const p = this.pets.find((x) => x.id === id); if (!p || !name.trim()) return;
    p.name = name.trim().slice(0, 16);
    for (const c of this.creatures) if (c.pet === id) c.name = p.name;
    this.toast(`Your pet is now ${p.name}.`); this.onPetsChange?.();
  }
  private spawnOnePet(pet: { id: string; type: string; name: string; sp?: Species; variant?: string }) {
    const spec = petSpec(pet.type);
    const sp = pet.sp ?? spec?.sp, variant = pet.variant ?? spec?.variant;   // wild adoptees carry their own sp/variant
    if (!sp) return;
    const i = Math.max(0, this.pets.indexOf(pet)), a = i * 1.9, r = 60 + (i % 3) * 26;
    const hx = Math.cos(a) * r, hy = 40 + Math.sin(a) * r * 0.7;
    this.creatures.push({ x: hx, y: hy, vx: 0, vy: 0, sp, variant, mode: "graze", act: "walk", trust: 1, t: i * 1.3, face: 1, dir: "d", rest: 0, wtx: hx, wty: hy, home: { x: hx, y: hy }, pet: pet.id, name: pet.name });
  }
  private spawnPets() { for (const p of this.pets) this.spawnOnePet(p); }
  private nearestPet() { let best = 34, found: (typeof this.creatures)[number] | null = null; for (const c of this.creatures) if (c.pet) { const d = Math.hypot(c.x - this.posX, c.y - this.posY); if (d < best) { best = d; found = c; } } return found; }
  // a wild creature standing close enough to befriend (not already a pet, not the escort follower)
  private nearestWild() { let best = 40, found: (typeof this.creatures)[number] | null = null; for (const c of this.creatures) if (!c.pet) { const d = Math.hypot(c.x - this.posX, c.y - this.posY); if (d < best) { best = d; found = c; } } return found; }
  /** Host pushes the player's Renown rank index so time/rank-gated quests can evaluate. */
  setRenownRank(i: number) { this.playerRank = Math.max(0, i | 0); }
  /** Recorded codex entry ids (for a future codex panel). */
  getCodex() { return Array.from(this.codex); }
  private lastSent = 0; private lastX = 1e9; private lastY = 1e9;

  // ---- M8 live presence (host wires these to the /ws/cirql socket) ----
  private remotes = new Map<string, RemotePlayer>();
  private myChat = ""; private myChatT = 0;                 // your own chat bubble
  private myEmote = ""; private myEmoteT = 0;               // your own active emote (CHR-260)
  private nearPlayer: { id: string; name: string } | null = null;  // remote in "share a light" range
  private lastNearId: string | null = null;                        // last announced nearPlayer (fire onNearPlayer on change)
  private pair: { withId: string; g: string; t: number } | null = null;   // active paired social gesture (Phase I4)
  // ---- Commons Festival: a multiplayer synced-emote crowd goal (lane #2 of the actions work) ----
  // Raise one at a gathering spot; a caller announces an emote, everyone near who matches it in the
  // window fills a shared meter. Fill it → participation-scaled sparqs + a boost to the town spirit
  // (World Energy). Solo-playable; livelier with travellers, whose emotes also count.
  private festival: { at: string; call: string; callT: number; window: number; meter: number; goal: number; combo: number; calls: number; maxCalls: number; matched: boolean; away: number; remoteMatched: Set<string>; parts: Set<string> } | null = null;
  private static readonly FEST_CALLS = ["wave", "clap", "cheer", "dance", "twirl", "celebrate", "bow"];
  onFestival?: (sparks: number) => void;   // host: award sparqs + feed World Energy + persist
  isFestival() { return !!this.festival; }
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
  private musicKey = ""; private musicIdx = 0; private musicT = 0;   // rotation state (auto-rotate every ~minute)
  /** Begin (or resume) the adaptive soundtrack — call from a user gesture (start picker / confirm). */
  startAudio() { this.musicStarted = true; cirqlSfx.resume(); this.updateMusic(); }
  private musicCtx() { return { shop: isShop(this.ringIdx) || isHome(this.ringIdx), sub: isSubMap(this.ringIdx) && !isHome(this.ringIdx) }; }
  /** On a context change (new ring/shop/sub): crossfade to that context's first theme + reset
   *  the ~minute rotation. Same context → no-op (the rotation keeps it fresh). */
  private updateMusic() {
    if (!this.musicStarted || !this.orchestra || this.musicVol <= 0) return;
    const { shop, sub } = this.musicCtx();
    const key = `${shop ? 1 : 0}|${sub ? 1 : 0}|${this.ringIdx}`;
    if (key === this.musicKey && this.orchestra.playing) return;   // already in this context
    this.musicKey = key; this.musicIdx = 0; this.musicT = 0;
    this.orchestra.crossfadeTo(tracksForContext(this.ringIdx, this.curRing.ambient, shop, sub)[0]);
    this.orchestra.setIntensity(this.ringIdx <= 0 ? 0.55 : shop ? 0.5 : sub ? 0.6 : this.ringIdx === 1 ? 0.8 : 0.9);
  }
  /** Every ~minute on the same context, crossfade to the next theme in the pool so no single
   *  tune wears out. Called from the sim loop once the timer trips. */
  private rotateMusic() {
    this.musicT = 0;
    if (!this.musicStarted || !this.orchestra || this.musicVol <= 0) return;
    const { shop, sub } = this.musicCtx();
    const pool = tracksForContext(this.ringIdx, this.curRing.ambient, shop, sub);
    if (pool.length <= 1) return;
    this.musicIdx = (this.musicIdx + 1) % pool.length;
    this.orchestra.crossfadeTo(pool[this.musicIdx]);
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
  jump() { if (this.cs || this.voyage || this.ride || this.dialog || this.mapOpen) return; this.standUp(); if (this.jumpZ <= 0.01 && this.jumpVel <= 0) { this.jumpVel = 66; this.sfx("hop"); this.fireAction("hop"); } }
  /** Free-sit (Phase H1) — plop down where you stand; any movement stands you back up. */
  onSeatChange?: (seated: boolean) => void;
  toggleSit() { if (this.cs || this.voyage || this.ride || this.dialog || this.mapOpen) return; this.seated = !this.seated; this.poseDirty = true; this.dozing = false; this.idleT = 0; if (this.seated) { this.vx = 0; this.vy = 0; this.moveTarget = null; this.fireAction("sit"); } this.onSeatChange?.(this.seated); }
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
      this.ringIdx = 0; this.curRing = this.styleRing(getRing(0));
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
  getState() { return { ring: this.ringIdx, maxRing: this.maxRing, x: Math.round(this.posX), y: Math.round(this.posY), quests: this.quests, lit: Array.from(this.lit), litForQuest: Array.from(this.litForQuest), gatheredWisps: Array.from(this.gatheredWisps), doneOnce: Array.from(this.doneOnce), decor: this.decor.slice(), homeDecor: this.homeDecor.slice(), terrain: this.getTerrain(), landTier: this.landTier, codex: Array.from(this.codex), healed: Array.from(this.healed), pets: this.pets.slice(), petStarter: this.petStarter, treats: this.treats, spaceStyle: this.spaceStyle, spacePattern: this.spacePattern, homeShape: this.homeShape }; }
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
    if (typeof s.spaceStyle === "string") this.spaceStyle = s.spaceStyle;
    if (typeof s.spacePattern === "string") this.spacePattern = s.spacePattern;
    if (typeof s.ring === "number" && s.ring >= 0) { this.ringIdx = s.ring; this.curRing = this.styleRing(getRing(s.ring)); this.maxRing = Math.max(this.maxRing, s.ring); this.ensureRingQuest(); }
    if (typeof s.x === "number" && typeof s.y === "number") { this.posX = s.x; this.posY = s.y; }
    if (s.quests && typeof s.quests === "object") this.quests = s.quests;
    if (Array.isArray(s.lit)) this.lit = new Set(s.lit);
    if (Array.isArray(s.codex)) this.codex = new Set(s.codex);
    if (Array.isArray(s.healed)) this.healed = new Set(s.healed);
    if (Array.isArray(s.pets)) this.pets = s.pets;
    if (typeof s.petStarter === "boolean") this.petStarter = s.petStarter;
    if (typeof s.treats === "number") this.treats = Math.max(0, s.treats | 0);
    if (s.homeShape === "round" || s.homeShape === "square") this.homeShape = s.homeShape;
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
    this.festival = null;   // a festival belongs to the shore you raised it on
    const from = this.ringIdx;
    // a brand-new outer shore (not a sub-map, never reached before) earns a full arrival cutscene
    const firstShore = !isSubMap(dest) && dest > this.maxRing;
    const wasFT = this.fastTravelReady();
    this.ringIdx = dest;
    this.curRing = this.styleRing(getRing(dest));
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
  emoteRemote(id: string, emote: string) { const r = this.remotes.get(id); const def = EMOTE_BY_ID[emote]; if (r && def) { r.emote = emote; r.emoteT = def.hold ?? EMOTE_SECONDS; this.festMatch(id, emote, r.x, r.y); } }
  /** Show your own chat bubble over your avatar. */
  sayLocal(text: string) { this.myChat = text; this.myChatT = 5.5; }
  /** Play an emote locally + broadcast it (called by the emote wheel). */
  playEmote(emote: string) { const def = EMOTE_BY_ID[emote]; if (!def) return; this.myEmote = emote; this.myEmoteT = def.hold ?? EMOTE_SECONDS; this.sfx("emote"); this.onEmote?.(emote); this.fireAction(emote); }
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
    if (q.objectives.some((o) => o.kind === "census")) this.censusSeen = new Set();   // fresh naturalist tally
    if (q.objectives.some((o) => o.kind === "escort")) this.escortee = null;           // (re)spawns from update
    if (q.timeLimit) this.questTimer = { id, left: q.timeLimit };                       // start the race clock
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
  /** Is the player standing near the prop with this id on the current ring? (for `act` objectives) */
  private nearProp(id: string): boolean {
    const p = this.curRing.props.find((x) => x.id === id);
    return !!p && Math.hypot(this.posX - p.x, this.posY - p.y) < ((p.r ?? 30) + 30);
  }
  /** An avatar ACTION was performed (hop / run / sit / an emote id). The action-verb primitive:
   *  advances any active quest whose current objective is `act` and matches (+ optional prop range).
   *  Mini-games can subscribe by watching the same call. */
  private fireAction(actId: string) { this.advanceObjective("act", actId); this.onAction?.(actId); this.festMatch("me", actId, this.posX, this.posY); }
  /** Fired on every avatar action — hop/run/sit/emote id — so the host (and future mini-games) can react. */
  onAction?: (actId: string) => void;
  private runT = 0; private runFired = false;   // edge-detect a sustained run for the `run` action
  /** True if (x,y) is within festival range of the prop `id` on the current ring. */
  private nearPropXY(id: string, x: number, y: number): boolean {
    const p = this.curRing.props.find((q) => q.id === id);
    return !!p && Math.hypot(x - p.x, y - p.y) < ((p.r ?? 30) + 70);   // a generous gathering radius
  }
  /** Raise a festival at a gathering spot: pick the first call + open the meter. */
  raiseFestival(p: Prop) {
    if (this.festival) { this.toast("The festival's already in full swing — match the call!"); return; }
    if (this.cs || this.voyage || this.dialog) return;
    this.festival = { at: p.id || "commons", call: "wave", callT: 4.6, window: 4.6, meter: 0, goal: 12, combo: 0, calls: 0, maxCalls: 18, matched: false, away: 0, remoteMatched: new Set(), parts: new Set() };
    this.nextFestivalCall();
    this.sfx("quest"); this.present("🎉", "#ffd24a");
    this.toast("🎉 You raise a festival! Match each call with your feelings wheel (🙂).");
  }
  private nextFestivalCall() {
    const f = this.festival; if (!f) return;
    const pool = CirqlWorldEngine.FEST_CALLS;
    let c = pool[Math.floor(Math.random() * pool.length)];
    if (c === f.call) c = pool[(pool.indexOf(c) + 1) % pool.length];   // never repeat back-to-back
    f.call = c; f.callT = f.window; f.matched = false; f.remoteMatched.clear(); f.calls++;
    this.sfx("emote");
  }
  /** A player (local "me" or a remote id) performed an emote — count it toward the festival if it
   *  matches the current call and they're near the gathering spot. Once per call per player. */
  private festMatch(id: string, emote: string, x: number, y: number) {
    const f = this.festival; if (!f || emote !== f.call) return;
    if (!this.nearPropXY(f.at, x, y)) return;
    if (id === "me") { if (f.matched) return; f.matched = true; }
    else { if (f.remoteMatched.has(id)) return; f.remoteMatched.add(id); }
    f.meter++; f.combo++; f.parts.add(id);
    if (!this.reduce) { const pr = this.curRing.props.find((q) => q.id === f.at); if (pr) { this.fxRing(pr.x - this.camX, pr.y - this.camY, "#ffd24a", 10); this.fxPop(pr.x - this.camX, pr.y - this.camY - 8, "+♪", "#ffe9a0", 0.8); } }
    if (f.meter >= f.goal) this.completeFestival();
  }
  private completeFestival() {
    const f = this.festival; if (!f) return;
    const parts = Math.max(1, f.parts.size);
    const sparks = Math.min(80, 10 + parts * 6 + Math.floor(f.combo / 2));   // scales with who showed up
    this.festival = null;
    this.sfx("quest"); this.present("🎉", "#ffd24a");
    this.onFestival?.(sparks);
    this.toast(parts > 1 ? `🎉 Festival! ${parts} travellers, spirits soaring — +${sparks} sparqs to all.` : `🎉 Festival! The town's spirits soar — +${sparks} sparqs.`);
  }
  private endFestival(reason: string) { if (!this.festival) return; this.festival = null; this.toast(reason); }
  // ---- Attraction rides (a ride you actually ride) — a self-contained scenic cutscene ----
  private ride: { kind: string; t: number; dur: number; accent: string; ringName: string; bx: number; gathered: number; motes: { x: number; y: number; vy: number; got: boolean }[] } | null = null;
  onRideDone?: (kind: string, bonus: number) => void;   // host: sparq reward (scaled by bonus) + persist
  rideActive() { return !!this.ride; }
  private startRide(p: Prop) {
    if (this.ride) return;
    this.sfx("enter");
    const kind = p.rideKind || "ferris";
    // the mine-cart is a STEERED descent (reuses the voyage's steer + gather): crystals drift down
    // the track; steer the cart under them to scoop them for a bigger reward.
    const motes = kind === "minecart" ? Array.from({ length: 8 }, (_, i) => ({ x: 0.32 + ((i * 97) % 36) / 100, y: 0.05 + ((i * 53) % 85) / 100, vy: 0.03 + ((i * 29) % 30) / 1000, got: false })) : [];
    this.ride = { kind, t: 0, dur: kind === "minecart" ? 18 : 15, accent: p.accent || "#7fd8ff", ringName: this.curRing.name, bx: 0, gathered: 0, motes };
    this.vx = this.vy = 0; this.moveTarget = null; this.dialog = null; this.near = null; this.mapOpen = false;
  }
  private endRide() {
    const r = this.ride; this.ride = null; if (!r) return;
    const key = "ride-" + r.kind + "-" + this.ringIdx, first = !this.doneOnce.has(key);
    if (first) { this.doneOnce.add(key); this.codex.add("codex-" + r.kind); this.toast(`📖 Codex — "${r.kind === "minecart" ? "A Rush Through the Canyon" : "The View From the Top"}" recorded`); }
    this.sfx("quest"); this.present(r.kind === "minecart" ? "⛏️" : "🎡", "#7fd8ff");
    this.onRideDone?.(r.kind, r.gathered);
  }
  private drawRideProp(cx: number, cy: number, p: Prop) {
    if ((p.rideKind || "ferris") === "minecart") { this.drawMinecartProp(cx, cy, p); return; }
    const ac = p.accent || "#7fd8ff", near = this.near === p, R = 20, s = this.SS, b = this.b;
    this.glow(cx, cy - R + 4, R * 2.2, ac, 0.14 + (near ? 0.1 : 0));
    this.rect(cx - 20, cy + 12, 40, 5, "#0a071450");
    const hy = cy - 6;   // hub y
    b.strokeStyle = hexA("#6a6488", 0.9); b.lineWidth = 1.4 * s;
    b.beginPath(); b.moveTo((cx - 12) * s, (cy + 12) * s); b.lineTo(cx * s, hy * s); b.lineTo((cx + 12) * s, (cy + 12) * s); b.stroke();   // A-frame legs
    const base = this.reduce ? 0.6 : this.t * 0.55;
    this.ring(cx, hy, R, ac, 1.6); this.ring(cx, hy, R - 2.5, shade(ac, -0.3), 1);
    b.strokeStyle = hexA(ac, 0.6); b.lineWidth = 1 * s;
    for (let i = 0; i < 8; i++) { const a = base + i * TAU / 8; b.beginPath(); b.moveTo(cx * s, hy * s); b.lineTo((cx + Math.cos(a) * R) * s, (hy + Math.sin(a) * R) * s); b.stroke(); }
    for (let i = 0; i < 8; i++) { const a = base + i * TAU / 8, gx = cx + Math.cos(a) * R, gy = hy + Math.sin(a) * R; this.rect(gx - 2, gy + 0.5, 4, 3, i % 3 ? "#c9c3d6" : ac); }
    if (!this.reduce) for (let i = 0; i < 8; i++) { const a = base * 0.7 + i * TAU / 8; if (Math.sin(this.t * 5 + i) > 0) this.px(Math.round(cx + Math.cos(a) * R), Math.round(hy + Math.sin(a) * R), "#fff2c8"); }
    this.disc(cx, hy, 2.5, shade(ac, -0.2)); this.ring(cx, hy, 2.5, ac, 1);
    this.labelPill(cx, cy - 34, p.label || "The Wheel", ac);
  }
  // The mine-cart's world prop: a timbered mine mouth with rails leading out + a cart parked at it.
  private drawMinecartProp(cx: number, cy: number, p: Prop) {
    const ac = p.accent || "#ffb454", near = this.near === p;
    this.glow(cx, cy - 2, 34, ac, 0.12 + (near ? 0.1 : 0));
    this.rect(cx - 22, cy + 14, 44, 5, "#0a071450");
    this.fillEll(cx, cy - 3, 22, 15, "#5a3a30"); this.fillEll(cx, cy - 5, 17, 11, "#4a2e26");   // rock mound
    this.disc(cx, cy, 10, "#150b09"); this.rect(cx - 10, cy, 20, 12, "#150b09");                // tunnel mouth
    this.rect(cx - 12, cy - 6, 3, 18, "#6a4a2a"); this.rect(cx + 9, cy - 6, 3, 18, "#6a4a2a"); this.rect(cx - 13, cy - 7, 27, 3, "#7a5530");   // timber frame
    for (let i = 0; i < 4; i++) this.rect(cx - 8, cy + 8 + i * 3.5, 16, 1, "#5a4326");           // ties out the mouth
    this.rect(cx - 6, cy + 8, 1.5, 14, "#8a6a42"); this.rect(cx + 4.5, cy + 8, 1.5, 14, "#8a6a42");   // rails
    this.drawCart(cx, cy + 15, ac);
    if (!this.reduce) { const gl = 0.4 + 0.3 * Math.sin(this.t * 2); this.disc(cx, cy + 1, 2, mix(ac, "#fff", 0.3)); this.glow(cx, cy + 1, 7, ac, 0.1 + 0.12 * gl); }   // a lantern glow deep in the mine
    this.labelPill(cx, cy - 26, p.label || "Mine-Cart Run", ac);
  }
  private drawRide() {
    if (this.ride!.kind === "minecart") { this.drawMinecart(); return; }
    const r = this.ride!; const W = this.LW, H = this.LH, s = this.SS, b = this.b, ac = r.accent, t = r.t;
    const speed = 1.4 * TAU / r.dur, carA = Math.PI / 2 + t * speed;
    const cx = W / 2, cyW = H * 0.47, R = Math.min(W, H) * 0.30;
    const carY = cyW + Math.sin(carA) * R, height = Math.max(0, Math.min(1, (cyW + R - carY) / (2 * R)));   // 0 bottom → 1 top
    // sky — deepens toward starry night as you rise
    const g = b.createLinearGradient(0, 0, 0, H * s);
    g.addColorStop(0, mix("#241b4a", "#0a0a24", height)); g.addColorStop(0.6, "#2a1f52"); g.addColorStop(1, "#3c2c5e");
    b.fillStyle = g; b.fillRect(0, 0, W * s, H * s);
    if (!this.reduce) for (let i = 0; i < 46; i++) { const sxp = (i * 71) % W, syp = (i * 43) % (H * 0.62); if (Math.sin(t * 3 + i * 1.3) > 0.1 - height) this.px(Math.round(sxp), Math.round(syp), i % 4 ? "#ffffff" : "#ffd24a"); }
    // the shore spread below — a horizon that sinks as you climb
    const horizon = H * (0.80 + height * 0.13);
    this.glow(cx, horizon, W * 0.7, "#1c5540", 0.2 + height * 0.1);
    this.rect(0, horizon, W, H - horizon + 2, "#14331f");
    for (let i = 0; i < 11; i++) { const lx = W * 0.14 + i * (W * 0.72 / 10); this.disc(lx, horizon + 3, Math.max(0.5, 1.8 - height * 1.1), i % 3 ? "#ffd98a" : ac); }   // town lights
    // ---- ferris wheel ----
    b.strokeStyle = hexA("#2a2540", 1); b.lineWidth = 4 * s;
    b.beginPath(); b.moveTo((cx - R * 0.5) * s, horizon * s); b.lineTo(cx * s, cyW * s); b.lineTo((cx + R * 0.5) * s, horizon * s); b.stroke();   // A-frame
    this.ring(cx, cyW, R, ac, 2.4); this.ring(cx, cyW, R - 4, shade(ac, -0.3), 1.2);
    b.strokeStyle = hexA(ac, 0.7); b.lineWidth = 1.2 * s;
    for (let i = 0; i < 8; i++) { const a = t * speed + i * TAU / 8; b.beginPath(); b.moveTo(cx * s, cyW * s); b.lineTo((cx + Math.cos(a) * R) * s, (cyW + Math.sin(a) * R) * s); b.stroke(); }
    this.disc(cx, cyW, 5, shade(ac, -0.2)); this.ring(cx, cyW, 5, ac, 1.4);
    for (let i = 0; i < 8; i++) { const a = t * speed + i * TAU / 8, gx = cx + Math.cos(a) * R, gy = cyW + Math.sin(a) * R, mine = i === 0;
      this.rect(gx - 4, gy + 1, 8, 6, mine ? ac : "#c9c3d6"); this.rect(gx - 4, gy + 1, 8, 1.4, shade(mine ? ac : "#c9c3d6", 0.22));
      if (mine) { this.disc(gx, gy + 3, 1.8, "#ffd0a0"); this.glow(gx, gy + 3, 10, ac, 0.34); } else this.disc(gx, gy + 4, 1.2, "#5a5570"); }
    if (!this.reduce) for (let i = 0; i < 16; i++) { const a = t * speed * 0.6 + i * TAU / 16; if (Math.sin(t * 6 + i) > 0) this.px(Math.round(cx + Math.cos(a) * R), Math.round(cyW + Math.sin(a) * R), "#fff2c8"); }
    // letterbox + captions
    const bar = H * 0.09; this.rect(0, 0, W, bar, "#000000"); this.rect(0, H - bar, W, bar, "#000000");
    this.q(W / 2, bar + 5, r.kind === "ferris" ? "The Wheel" : "A ride", "#eaf6ff", 1.2, "c", true);
    if (height > 0.7) this.q(W / 2, H * 0.22, `${r.ringName}, spread out below…`, ac, 1.05, "c", true);
    this.q(W / 2, H - bar - 8, "tap to step off", "#9fb0d0", 0.82, "c", false, 0.72);
  }
  // A STEERED downhill mine-cart: rush down a winding rail through the canyon, steer the cart under
  // the drifting crystals to scoop them. Reuses the voyage's steer/gather structure.
  private drawMinecart() {
    const r = this.ride!; const W = this.LW, H = this.LH, s = this.SS, b = this.b, ac = r.accent, t = r.t;
    const prog = Math.min(1, t / r.dur);
    // canyon sky
    const g = b.createLinearGradient(0, 0, 0, H * s);
    g.addColorStop(0, "#2a1418"); g.addColorStop(0.5, "#4a2418"); g.addColorStop(1, "#160c0a");
    b.fillStyle = g; b.fillRect(0, 0, W * s, H * s);
    // parallax mesa layers scrolling past (speed)
    for (let layer = 0; layer < 2; layer++) {
      const yy = H * 0.22 + layer * 16, col = layer === 0 ? "#3a1e1a" : "#5a2e20", sp = t * (50 + layer * 40);
      for (let i = -1; i < 9; i++) { const mx = (((i * 96 - sp) % (W + 200)) + W + 200) % (W + 200) - 100; this.rect(mx, yy, 64 - layer * 12, 46, col); this.rect(mx + 10, yy - 8, 30, 12, col); }
    }
    // enclosing rock walls (perspective — narrow at the top)
    b.fillStyle = "#241210";
    b.beginPath(); b.moveTo(0, H * 0.2 * s); b.lineTo(W * 0.30 * s, H * 0.2 * s); b.lineTo(W * 0.10 * s, H * s); b.lineTo(0, H * s); b.closePath(); b.fill();
    b.beginPath(); b.moveTo(W * s, H * 0.2 * s); b.lineTo(W * 0.70 * s, H * 0.2 * s); b.lineTo(W * 0.90 * s, H * s); b.lineTo(W * s, H * s); b.closePath(); b.fill();
    // the winding track — ties + rails from the vanishing point down toward you
    const sway = (p: number) => Math.sin(p * 5.5 + t * 0.5) * 0.13;
    const vy = H * 0.2;
    for (let i = 0; i < 18; i++) {
      const f = i / 18, fy = vy + (H - vy) * (f * f), cxn = 0.5 + sway(prog + (1 - f) * 0.45), cxp = cxn * W, hw = 3 + f * 44, th = Math.max(1, f * 3.4);
      this.rect(cxp - hw, fy, hw * 2, th, "#3a2418");                                             // tie
      this.rect(cxp - hw, fy - th * 0.3, 2.2, th * 1.6, "#8a6a42"); this.rect(cxp + hw - 2.2, fy - th * 0.3, 2.2, th * 1.6, "#8a6a42");   // rails
    }
    // crystals drifting down the track
    for (const m of r.motes) if (!m.got) { const mx = m.x * W, my = m.y * H, sc = 1 + m.y * 2.2; this.glow(mx, my, 5 * sc * 0.5, ac, 0.5); this.triY(mx, my - 2 * sc, 2 * sc, 4 * sc, ac); this.disc(mx, my, 1 * sc, "#eaffff"); }
    // motion streaks
    if (!this.reduce) for (let i = 0; i < 12; i++) { const sx = (i * 127) % W, sy = ((i * 89 + t * 620) % H); b.fillStyle = hexA("#ffd0a0", 0.1); b.fillRect(sx * s, sy * s, 1 * s, 7 * s); }
    // your cart at the bottom, steered
    this.drawCart(W * (0.5 + r.bx * 0.34), H * 0.82, ac);
    // letterbox + HUD
    const bar = H * 0.09; this.rect(0, 0, W, bar, "#000000"); this.rect(0, H - bar, W, bar, "#000000");
    this.q(W / 2, bar + 5, "Mine-Cart Run", "#ffe0b0", 1.2, "c", true);
    const pw = W * 0.5, px = (W - pw) / 2, py = bar + 15; this.rect(px, py, pw, 2, "#0a0714aa"); this.rect(px, py, pw * prog, 2, ac);
    if (r.gathered > 0) this.q(W / 2, py + 6, `✦ ${r.gathered} crystals`, ac, 0.92, "c");
    this.q(W / 2, H - bar - 8, "steer with the stick · tap E to finish", "#d0a890", 0.82, "c", false, 0.72);
  }
  private drawCart(cx: number, cy: number, ac: string) {
    this.disc(cx, cy + 5, 7, "#0a071450");
    this.disc(cx - 5, cy + 4, 2.6, "#241a12"); this.disc(cx + 5, cy + 4, 2.6, "#241a12"); this.ring(cx - 5, cy + 4, 2.6, "#6a5038", 1); this.ring(cx + 5, cy + 4, 2.6, "#6a5038", 1);   // wheels
    this.rect(cx - 8, cy - 4, 16, 8, "#5a3a22"); this.rect(cx - 8, cy - 4, 16, 2, "#7a5030"); this.rectLine(cx - 8, cy - 4, 16, 8, "#241206");   // body
    this.rect(cx - 6, cy - 2, 12, 4, "#2e1c10");
    this.disc(cx, cy - 6, 2.2, "#ffd0a0"); this.rect(cx - 2, cy - 4, 4, 3, "#c0504a");   // you, peeking
    this.glow(cx, cy - 2, 12, ac, 0.16);
  }
  private updateFestival(dt: number) {
    const f = this.festival; if (!f) return;
    if (!this.nearProp(f.at)) { f.away += dt; if (f.away > 6) { this.endFestival("You drift away; the festival winds down."); return; } } else f.away = 0;
    f.callT -= dt;
    if (f.callT <= 0) { if (f.calls >= f.maxCalls) { this.endFestival("The festival winds down for the day."); return; } this.nextFestivalCall(); }
  }
  /** The active quest's current (first unfinished) objective index, or -1. */
  private currentObjIndex(q: QuestDef): number {
    const p = this.quests[q.id]; if (!p) return -1;
    return q.objectives.findIndex((o, i) => (p.obj[i] || 0) < (o.count ?? 1));
  }
  /** Advance the FIRST active quest whose CURRENT objective matches (kind, targetId) on this ring.
   *  (Scans all active quests, not just the tracked one, so a ring quest can't shadow an authored
   *  quest that needs the same event.) Completes / offers the choice fork when the quest is done. */
  private advanceObjective(kind: ObjectiveKind, targetId?: string) {
    for (const q of allQuests()) {
      const p = this.quests[q.id]; if (!p || p.status !== "active") continue;
      const oi = this.currentObjIndex(q); if (oi < 0) continue;
      const o = q.objectives[oi];
      if (o.kind !== kind) continue;
      if (o.ring != null && o.ring !== this.ringIdx) continue;   // cross-ring: advance only on the objective's ring
      if ((kind === "reach" || kind === "interact" || kind === "deliver" || kind === "escort") && o.target && o.target !== targetId) continue;
      if (kind === "act") {
        if (o.act && o.act !== targetId) continue;               // targetId carries the action id for `act` events
        if (o.target && !this.nearProp(o.target)) continue;      // optional: the action must be performed near this prop
      }
      p.obj[oi] = Math.min(o.count ?? 1, (p.obj[oi] || 0) + 1);
      this.onQuestChange?.();
      if (this.currentObjIndex(q) < 0) {
        if (q.choice && !p.pick) this.presentQuestChoice(q);   // mystery/choice: the clue-trail is done → offer the fork
        else this.completeQuest(q);
      }
      return;   // one match per event
    }
  }
  // ---- mystery/choice quests (K7): once the clues are gathered, offer the branching fork ----
  private pendingChoice: string | null = null;
  /** Show the quest's fork as a dialog (reuses the branching-dialog UI). */
  private presentQuestChoice(q: QuestDef) {
    if (!q.choice) { this.completeQuest(q); return; }
    this.pendingChoice = q.id;
    this.setDialog(q.name, "#c9a0ff", choiceDialog(q.choice.prompt, q.choice.options));
  }
  /** The player picked an option: record the choice, grant THAT option's reward, finish. */
  private resolveQuestChoice(optionId: string) {
    const qid = this.pendingChoice; if (!qid) return;
    const q = questById(qid); const p = this.quests[qid]; if (!q || !q.choice || !p) { this.pendingChoice = null; return; }
    const opt = q.choice.options.find((o) => o.id === optionId) ?? q.choice.options[0];
    p.pick = opt.id;
    this.pendingChoice = null; this.dialog = null;
    const first = !this.doneOnce.has(q.id);
    this.completeQuest(q, opt.reward);
    if (first && opt.grants) { this.onGrant?.(opt.grants); this.toast(`✦ Unlocked for your Cirql: ${opt.grants}`); }   // the chosen fork's own décor/cosmetic
    if (opt.toast) this.toast(opt.toast);
  }
  private completeQuest(q: QuestDef, rewardOverride?: { sparks: number; renown?: number }) {
    const p = this.quests[q.id]; if (!p || p.status === "done") return;
    p.status = "done";
    if (this.questTimer?.id === q.id) this.questTimer = null;   // beat the race clock
    this.escortee = null;                                       // the follower's home safe
    // a chosen fork pays that option's reward instead of the base (the host reads q.reward)
    const effective: QuestDef = rewardOverride ? { ...q, reward: rewardOverride } : q;
    q = effective;
    const first = !this.doneOnce.has(q.id);
    this.doneOnce.add(q.id);
    // lanterns lit for this quest become permanently lit (the path stays glowing)
    if (this.litForQuest.size) { for (const id of Array.from(this.litForQuest)) this.lit.add(id); this.litForQuest.clear(); }
    this.sfx("quest");
    this.onQuestComplete?.(q, first);   // page grants the reward (reduced on repeat) + toast
    if (first) {
      // Phase K7 reward grants (first completion only): a free décor/cosmetic, a codex entry,
      // and — for emergent quests — the world visibly mends where the problem was.
      if (q.grants) { this.onGrant?.(q.grants); this.toast(`✦ Unlocked for your Cirql: ${q.grants}`); }
      if (q.codex && !this.codex.has(q.codex.id)) { this.codex.add(q.codex.id); this.toast(`📖 Codex — "${q.codex.title}" recorded`); }
      if (q.heals) { this.healed.add(q.heals); }
      this.present("✦", "#ffd24a");   // item-get: raise the reward overhead (I6)
    }
    this.onQuestChange?.();
    if (q.next) this.acceptQuest(q.next);   // chain onward (re-accepting resets a repeated chain)
  }
  // ---- Phase K7: delivery-condition evaluation (time / rank / holiday / choice flags) ----
  /** Is a flag set? "<questId>" → that quest is done; "<questId>:<pick>" → that fork was chosen. */
  private hasFlag(flag: string): boolean {
    const [qid, pick] = flag.split(":");
    const p = this.quests[qid]; if (!p) return false;
    return pick ? p.pick === pick : p.status === "done";
  }
  /** Does the world currently satisfy a quest's availability condition? */
  private meetsRequire(q: QuestDef): boolean {
    const r = q.require; if (!r) return true;
    if (r.timeOfDay === "night" && this.nightAmt < 0.5) return false;
    if (r.timeOfDay === "day" && this.nightAmt >= 0.5) return false;
    if (r.minRenownRank != null && this.playerRank < r.minRenownRank) return false;
    if (r.holiday && !activeEvent()) return false;
    if (r.flag && !this.hasFlag(r.flag)) return false;
    if (r.notFlag && this.hasFlag(r.notFlag)) return false;
    return true;
  }
  /** DISCOVERED / EMERGENT delivery: inspecting a curio grants the quest tied to it. */
  private tryDiscover(p: Prop) {
    const cid = p.id || "", kind = p.curio || "relic";
    const flavor = kind === "blight" ? "A sickness has taken this ground." : kind === "star" ? "A fallen star, still faintly warm." : kind === "cache" ? "A hidden cache, half-buried in the earth." : "An old relic, humming with something unspoken.";
    const q = allQuests().find((x) => x.discover && x.discover.at === cid && (x.discover.ring == null || x.discover.ring === this.ringIdx));
    if (!q) { this.toast(flavor); return; }
    const pr = this.quests[q.id];
    if (pr?.status === "done") { this.toast(kind === "blight" && this.healed.has(cid) ? "The ground has mended — green returns." : "You've already unravelled this one."); return; }
    if (pr?.status === "active") { this.toast(`${flavor} — your task here is underway.`); return; }
    if (!this.meetsRequire(q)) { this.toast(q.require?.timeOfDay === "night" ? `${flavor} Something more may show once it's dark…` : `${flavor} It isn't the moment yet.`); return; }
    // RIDDLE quests pose their question here (answer to solve) instead of a plain accept
    if (q.riddle) {
      this.pendingRiddle = q.id;
      const choices: DialogChoice[] = q.riddle.options.map((o) => ({ label: o.label, answer: o.id }));
      this.setDialog(p.label || "A riddle", p.accent || "#c9a0ff", { nodes: { start: { lines: q.intro, choices } }, start: "start" });
      return;
    }
    this.setDialog(p.label || (kind === "blight" ? "Blighted ground" : "A discovery"), p.accent || "#c9a0ff", simpleDialog(q.intro, q.id));
  }
  /** RIDDLE: check the picked answer; correct → complete the quest, wrong → try again. */
  private resolveRiddle(answerId: string) {
    const qid = this.pendingRiddle; this.pendingRiddle = null; this.dialog = null;
    const q = qid ? questById(qid) : undefined; if (!q || !q.riddle) return;
    if (answerId === q.riddle.answer) {
      this.quests[qid!] = { status: "active", obj: q.objectives.map((o) => o.count ?? 1) };   // fill in so it completes
      this.completeQuest(q);
      this.toast("The stone warms — you've answered true.");
    } else {
      this.toast("The stone stays silent. That wasn't the answer.");
    }
  }
  /** CHOSEN delivery: a bounty board offers a rotating pool of tasks (repeatable, refresh daily). */
  private openBounty(p: Prop) {
    const pool = allQuests().filter((q) => q.bounty && this.meetsRequire(q) && this.quests[q.id]?.status !== "active");
    let choices: DialogChoice[]; let lines: string[];
    if (pool.length) {
      const day = Math.floor(Date.now() / 86400000), n = pool.length;
      const shown = n <= 3 ? pool : [0, 1, 2].map((i) => pool[(((day % n) + n) % n + i) % n]);
      choices = shown.map((q) => ({ label: `✦ ${q.name}  (+${q.reward.sparks})`, accept: q.id }));
      choices.push({ label: "Leave the board" });
      lines = ["The bounty board — tasks posted by the wilds.", "Take what suits you; new bounties are pinned each day."];
    } else {
      choices = [{ label: "Leave the board" }];
      lines = ["The bounty board is quiet just now.", "Sail on — the wilds always need something."];
    }
    this.setDialog(p.label || "Bounty Board", p.accent || "#ffd24a", { nodes: { start: { lines, choices } }, start: "start" });
  }
  /** Rows for the quest-log panel (available/active/done, with the current objective). */
  getQuestLog(): QuestLogRow[] {
    const curGiver = `keeper-${this.ringIdx}`;
    return questStatusList(this.quests)
      .filter((s) => s.status !== "locked")
      // keep authored quests + any you've started/finished + the current ring's offer;
      // hide stale "available" ring quests from rings you've sailed past
      .filter((s) => !s.quest.id.startsWith("ring-") || this.quests[s.quest.id] || s.quest.id.startsWith(`ring-${this.ringIdx}-`) || s.quest.giver === curGiver)
      // Phase K7: discover/bounty-delivered quests stay hidden until you actually take them
      .filter((s) => this.quests[s.quest.id] || !(s.quest.discover || s.quest.bounty))
      .map(({ quest, status }) => {
        const p = this.quests[quest.id];
        let objective = quest.objectives[0]?.label ?? "";
        if (status === "active" && p) { const oi = this.currentObjIndex(quest);
          if (oi >= 0) { const o = quest.objectives[oi];
            let lbl = o.kind === "census" ? `${o.label} (${p.obj[oi] || 0}/${o.count ?? 1})` : o.label;
            objective = (o.ring != null && o.ring !== this.ringIdx) ? `Sail to ${ringName(o.ring)} — ${lbl}` : lbl;
            if (this.questTimer && this.questTimer.id === quest.id) { const s = Math.max(0, Math.ceil(this.questTimer.left)); objective = `⌛ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} — ${objective}`; }
          } else objective = (quest.choice && !p.pick) ? "◆ A choice awaits — speak to the keeper" : "Return complete"; }
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
    else if (c.pick) { this.resolveQuestChoice(c.pick); }   // resolve a mystery/choice fork
    else if (c.answer) { this.resolveRiddle(c.answer); }    // answer a riddle
    else if (c.buy) {   // adopt a pet — or buy a bag of treats
      const [type, cost, count] = c.buy.split(":"); this.dialog = null;
      if (type === "treats") this.onBuyTreats?.(parseInt(count || "5", 10), parseInt(cost, 10));
      else this.onBuyPet?.(type, parseInt(cost, 10));
    }
    else if (c.petact) { this.resolvePetAction(c.petact); }   // pet / play / feed / trick / tame / adopt / rename
    else if (c.style) { const [id, cost] = c.style.split(":"); this.dialog = null; this.onSelectStyle?.(id, parseInt(cost, 10)); }   // restyle your space
    else if (c.pattern) { const [id, cost] = c.pattern.split(":"); this.dialog = null; this.onSelectPattern?.(id, parseInt(cost, 10)); }   // ground pattern
    else if (c.goto && d.tree.nodes[c.goto]) { d.nodeId = c.goto; d.i = 0; }
    else this.dialog = null;   // plain choice → end the chat
  }
  // ---- Pets (P1): the stall (buy) + a companion interaction (pet / play / rename) ----
  private openPetShop() {
    const choices: DialogChoice[] = PET_CATALOG.map((p) => ({ label: `${p.label} — ${p.cost}✦`, buy: `${p.type}:${p.cost}` }));
    choices.push({ label: `🍬 Bag of treats ×5 — 8✦`, buy: `treats:8:5` });
    choices.push({ label: "Maybe later" });
    const owned = this.pets.length;
    this.setDialog("Pet Stall", "#ffd24a", { nodes: { start: { lines: ["Welcome to the Pet Stall!", "A companion to share your CIRQLSPACE — pick a friend.", `Treats bond your pets and coax wild critters home. You hold ${this.treats}.`, owned ? `You've ${owned} already; room for more!` : "Take one home today."], choices } }, start: "start" });
  }
  private openStyleStudio() {
    const cur = this.spaceStyle, curP = this.spacePattern;
    const styleChoices: DialogChoice[] = SPACE_STYLES.map((s) => ({ label: `${s.id === cur ? "✓ " : ""}${s.label}${s.cost ? `  (${s.cost}✦)` : "  (free)"}`, style: `${s.id}:${s.cost}` }));
    styleChoices.push({ label: "◂ Back", goto: "start" });
    const patChoices: DialogChoice[] = SPACE_PATTERNS.map((p) => ({ label: `${p.id === curP ? "✓ " : ""}${p.label}${p.cost ? `  (${p.cost}✦)` : "  (free)"}`, pattern: `${p.id}:${p.cost}` }));
    patChoices.push({ label: "◂ Back", goto: "start" });
    this.setDialog("Style Studio", "#c9a0ff", {
      nodes: {
        start: { lines: ["Make your CIRQLSPACE your own.", "What shall we change today?"], choices: [
          { label: "🎨 Biome look (colours + air)", goto: "biomes" }, { label: "▦ Ground pattern", goto: "patterns" }, { label: "Leave" },
        ] },
        biomes: { lines: ["A whole biome's colours + atmosphere for your shore.", "Owned looks switch back free anytime."], choices: styleChoices },
        patterns: { lines: ["A motif tiled across your home turf."], choices: patChoices },
      }, start: "start",
    });
  }
  private openPetDialog(c: (typeof this.creatures)[number]) {
    this.petTalk = c.pet || null; this.wildTalk = null;
    const kind = this.creatureLabel(c.sp, c.variant);
    const bond = this.petBond(c.pet), tier = bond >= 80 ? "inseparable" : bond >= 55 ? "devoted" : bond >= 30 ? "warming up" : "still shy";
    const bar = "♥".repeat(Math.max(1, Math.round(bond / 20))) + "·".repeat(5 - Math.max(1, Math.round(bond / 20)));
    const choices: DialogChoice[] = [{ label: "Pet ♥", petact: "pet" }, { label: "Play", petact: "play" }];
    choices.push({ label: `Feed 🍬  (${this.treats})`, petact: "feed" });
    if (bond >= 60) choices.push({ label: "Ask for a trick ✦", petact: "trick" });
    choices.push({ label: "Rename", petact: "rename" }, { label: "Bye" });
    this.setDialog(c.name || "Your pet", "#ffd24a", { nodes: { start: { lines: [`${c.name}, your ${kind}.`, `Bond ${bar}  — ${tier}.`, "What shall we do?"], choices } }, start: "start" });
  }
  // A WILD creature you're standing beside: offer treats to earn its trust, then invite it home.
  private openWildDialog(c: (typeof this.creatures)[number]) {
    this.wildTalk = c; this.petTalk = null;
    const kind = this.creatureLabel(c.sp, c.variant), tr = Math.round(c.trust * 100);
    const near = c.trust >= 0.8;
    const lines = near
      ? [`This ${kind} lets you right up close now.`, `Trust ${tr}% — it's ready to come home with you.`]
      : this.treats > 0
        ? [`A wary ${kind}.`, `Trust ${tr}%. A treat might win it over. (You hold ${this.treats}.)`]
        : [`A wary ${kind}.`, `Trust ${tr}%. It won't come closer without a treat to offer.`];
    const choices: DialogChoice[] = [];
    if (this.treats > 0 && !near) choices.push({ label: "Offer a treat 🍬", petact: "tame" });
    if (near) choices.push({ label: "Invite it home 🐾", petact: "adopt" });
    if (this.treats > 0 && near) choices.push({ label: "Give a treat 🍬", petact: "tame" });
    choices.push({ label: "Leave it be" });
    this.setDialog(kind.replace(/^\w/, (m) => m.toUpperCase()), "#b6ff6a", { nodes: { start: { lines, choices } }, start: "start" });
  }
  private resolvePetAction(action: string) {
    // wild-taming actions operate on wildTalk; home-care actions on petTalk
    if (action === "tame" || action === "adopt") {
      const c = this.wildTalk;
      if (action === "tame" && c) {
        if (this.treats <= 0) { this.dialog = null; this.wildTalk = null; return; }
        this.treats--; c.trust = Math.min(1, c.trust + 0.34); c.joy = 1.4; c.rest = 0.6; c.mode = "curious";
        this.present("♥", "#ff6b8f"); this.sfx("talk"); this.onPetsChange?.();
        if (c.trust >= 0.8) this.toast(`It trusts you now — invite it home! ♥`); else this.toast(`It edges closer… (trust ${Math.round(c.trust * 100)}%)`);
        this.openWildDialog(c); return;   // re-open with updated trust
      }
      if (action === "adopt" && c) { this.dialog = null; this.wildTalk = null; this.adoptWild(c); return; }
      this.dialog = null; this.wildTalk = null; return;
    }
    const id = this.petTalk; this.petTalk = null; this.dialog = null;
    const c = this.creatures.find((x) => x.pet === id);
    if (action === "pet" && c) {
      c.joy = 1.2; c.trust = 1; this.raiseBond(id, 4); this.present("♥", "#ff6b8f"); this.toast(`${c.name} loves the attention! ♥`);
      if (this.petBond(id) >= 70 && ((this.t | 0) % 3 === 0)) { this.onPetGift?.(1); this.toast(`${c.name} nudges a stray sparq your way. ✦`); }
    }
    else if (action === "play" && c) { c.joy = 1.9; c.rest = 0; c.act = "walk"; this.raiseBond(id, 6); this.present("✦", "#b6ff6a"); this.toast(`${c.name} zooms around, delighted!`); }
    else if (action === "feed" && c) {
      if (this.treats <= 0) { this.toast(`No treats left — grab a bag at the Pet Stall.`); return; }
      this.treats--; c.joy = 1.5; this.raiseBond(id, 12); this.present("🍬", "#ffd24a"); this.sfx("talk"); this.onPetsChange?.();
      this.toast(`${c.name} gobbles the treat — bond ${this.petBond(id)}. ♥`);
    }
    else if (action === "trick" && c) { c.joy = 2.2; c.rest = 0; c.act = "walk"; this.raiseBond(id, 2); this.present("✦", "#ffd24a"); this.sfx("quest"); this.toast(`${c.name} does a happy spin for you! ✦`); if (this.petBond(id) >= 80) { this.onPetGift?.(2); } }
    else if (action === "rename" && id) { const p = this.pets.find((x) => x.id === id); this.onRenamePet?.(id, p?.name || ""); }
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
    if (!this.near) { const petC = this.nearestPet(); if (petC) { this.openPetDialog(petC); return; } }   // pet a companion you're standing by
    if (!this.near) { const wild = this.nearestWild(); if (wild) { this.openWildDialog(wild); return; } }   // befriend a wild critter you're standing by
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
    if (p.t === "curio") { this.tryDiscover(p); return; }        // inspect a discoverable → grant its hidden/emergent quest
    if (p.t === "bounty") { this.openBounty(p); return; }         // a bounty board → pick a task
    if (p.t === "ride") { this.startRide(p); return; }            // an attraction → hop on the ride
    if (p.t === "petshop") { this.openPetShop(); return; }        // the Pet Stall → adopt a companion
    if (p.t === "stylist") { this.openStyleStudio(); return; }    // the Style Studio → restyle your space
    if (p.t === "barber") { this.sfx("talk"); this.onInteract?.("barber", p); return; }   // the Barber → host opens the look editor on hair
    if (p.t === "gathering") { if (this.festival) this.toast("The festival's on — match each call with your feelings wheel (🙂)!"); else this.raiseFestival(p); return; }
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
    if (this.pendingChoice) return;   // that talk just completed the clue-trail → keep the fork on screen
    // re-present a dismissed fork this NPC owns (clue-trail done, choice not yet made)
    for (const q of allQuests()) {
      if (q.giver !== npcId || !q.choice) continue;
      const pr = this.quests[q.id];
      if (pr && pr.status === "active" && !pr.pick && this.currentObjIndex(q) < 0) { this.presentQuestChoice(q); return; }
    }
    // a quest this keeper can offer (fresh, or a repeatable re-offer for a slighter reward);
    // gated quests (require: night / rank / holiday / flag) only offer when their condition is met
    const freshRaw = offerableQuest(npcId, this.quests);
    const fresh = freshRaw && this.meetsRequire(freshRaw) ? freshRaw : undefined;
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
    if (this.festival) this.updateFestival(dt);   // Commons Festival call-and-response clock
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
    if (this.ride) {
      const rd = this.ride;
      if (rd.kind === "minecart") {
        // steer the cart (stick / arrows / drag) — mirrors the sailing voyage's steering
        let steer = (this.btn.right ? 1 : 0) - (this.btn.left ? 1 : 0);
        if (this.pointer.down) steer += Math.max(-1, Math.min(1, ((this.pointer.x - this.LW / 2) / (this.LW * 0.36)) - rd.bx)) * 1.2;
        rd.bx = Math.max(-1, Math.min(1, rd.bx + steer * dt * 2.0));
        const cartN = 0.5 + rd.bx * 0.34;
        for (const m of rd.motes) {
          m.y += (0.5 + m.vy) * dt;                    // scroll down the track toward the cart
          if (!m.got && Math.abs(m.y - 0.82) < 0.06 && Math.abs(m.x - cartN) < 0.08) { m.got = true; rd.gathered++; this.fxRing(cartN * this.LW, 0.82 * this.LH, rd.accent, 12); this.fxPop(cartN * this.LW, 0.76 * this.LH, "+✦", rd.accent, 0.9); this.sfx("wisp"); }
          if (m.y > 1.08) { m.y = -0.08; m.x = ((m.x * 7.13 + rd.t * 0.37) % 0.62) + 0.19; m.got = false; }   // recycle from the top
        }
      }
      rd.t += dt; this.updateFx(dt);
      // ferris (passive): a tap/E steps off. minecart (steered): only the E button exits, so drags steer freely.
      const exit = rd.kind === "minecart" ? this.pressed.a : (justDown || this.pressed.a);
      if (exit || rd.t >= rd.dur) { this.endRide(); return; }
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
      // `run` action: fire once per sustained running burst (holding RUN while moving for ~0.5s)
      if (moving && this.btn.b) { this.runT += dt; if (this.runT > 0.5 && !this.runFired) { this.runFired = true; this.fireAction("run"); } }
      else { this.runT = 0; this.runFired = false; }
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

      if (this.isInterior()) {
        if (isHome(this.ringIdx)) {
          // square home: the obstacles are your own placed décor (circle push-out)
          for (const s of this.solids()) { const ox = this.posX - s.x, oy = this.posY - s.y, d = Math.hypot(ox, oy), min = s.r + 5; if (d < min && d > 0.001) { const k = min / d; this.posX = s.x + ox * k; this.posY = s.y + oy * k; } }
        } else {
          // shop furniture collision (AABB push-out along the shallowest axis)
          for (const rct of this.roomSolids()) {
            const pr = 7;
            if (this.posX > rct.x0 - pr && this.posX < rct.x1 + pr && this.posY > rct.y0 - pr && this.posY < rct.y1 + pr) {
              const dl = this.posX - (rct.x0 - pr), dR = (rct.x1 + pr) - this.posX, dU = this.posY - (rct.y0 - pr), dD = (rct.y1 + pr) - this.posY;
              const m = Math.min(dl, dR, dU, dD);
              if (m === dl) this.posX = rct.x0 - pr; else if (m === dR) this.posX = rct.x1 + pr; else if (m === dU) this.posY = rct.y0 - pr; else this.posY = rct.y1 + pr;
            }
          }
        }
        const rm = this.roomBounds();
        this.posX = Math.max(rm.x0, Math.min(rm.x1, this.posX)); this.posY = Math.max(rm.y0, Math.min(rm.y1, this.posY));
      } else if (this.isMazeRealm()) {
        // maze wall collision — resolve per-axis so you slide along walls (border cells keep you in)
        const pr = 11;
        if (this.mazeBlocked(this.posX, preY, pr)) this.posX = preX;
        if (this.mazeBlocked(preX, this.posY, pr)) this.posY = preY;
        if (this.mazeBlocked(this.posX, this.posY, pr)) { this.posX = preX; this.posY = preY; }
      } else {
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
      }

      this.walk = Math.hypot(this.vx, this.vy) > 8 ? this.walk + dt * 10 : 0;
      // emotive locomotion: lean the body into the direction of travel, ease back on stop (I7)
      const leanTgt = (this.walk > 0 && !this.seated) ? Math.max(-1, Math.min(1, this.vx / 90)) * 0.17 : 0;
      this.lean += (leanTgt - this.lean) * Math.min(1, dt * 8);

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
        const discover = p.t === "curio" || p.t === "bounty" || p.t === "petshop" || p.t === "stylist" || p.t === "barber" || p.t === "ride";   // K7 discoverable / bounty / pet stall / style studio / barber / ride
        if (p.t !== "wonders" && p.t !== "shop" && p.t !== "home" && p.t !== "storm" && p.t !== "tunnel" && p.t !== "npc" && p.t !== "dock" && p.t !== "portal" && !isQL && !puzzle && !social && !discover) continue;
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
    this.updateQuestVerbs(dt);   // Phase 2: escort follower / race clock / naturalist census

    // auto-rotate the soundtrack every ~minute so no tune wears out (crossfaded)
    if (this.musicStarted && this.orchestra && this.musicVol > 0) { this.musicT += dt; if (this.musicT >= 60) this.rotateMusic(); }

    // camera easing — indoors the camera locks on the room centre (a fixed-camera room)
    const camTX = (this.isInterior() ? 0 : this.posX) - this.LW / 2;
    const camTY = (this.isInterior() ? 6 : this.posY) - this.LH / 2;
    this.camX += (camTX - this.camX) * Math.min(1, dt * 8);
    this.camY += (camTY - this.camY) * Math.min(1, dt * 8);

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
  // ================= INTERIOR ROOMS =================
  // Indoors we drop the circular-island world and draw a bounded, furnished RECTANGULAR room
  // (TMW-style): a tiled plank floor, walls with height, a doorway, and shop-specific furniture with
  // collision. Only active for shop/home ring indices; the outdoor world is untouched.
  // Home can be a ROUND island (classic) or a SQUARE room (player's choice, Settings). Shops are
  // always square rooms. Default round preserves the existing home.
  private homeShape: "round" | "square" = "round";
  getHomeShape() { return this.homeShape; }
  setHomeShape(s: "round" | "square") { if (s !== "round" && s !== "square") return; this.homeShape = s; if (isHome(this.ringIdx)) { this.posX = Math.max(-260, Math.min(260, this.posX)); this.posY = Math.max(0, Math.min(160, this.posY)); } this.onLocalMove?.(this.ringIdx, Math.round(this.posX), Math.round(this.posY)); }
  private isInterior() { return isShop(this.ringIdx) || (isHome(this.ringIdx) && this.homeShape === "square"); }
  private roomBounds() { return { x0: -300, y0: -58, x1: 300, y1: 200 }; }   // walkable floor rect (in front of the counter)
  private static readonly ROOM_SOLID: Record<string, { hw: number; hh: number }> = {
    counter: { hw: 150, hh: 11 }, backshelf: { hw: 52, hh: 10 }, arcaneshelf: { hw: 52, hh: 10 }, plantshelf: { hw: 52, hh: 10 }, toolrack: { hw: 52, hh: 10 },
    barrel: { hw: 11, hh: 11 }, crate: { hw: 12, hh: 11 }, crateSm: { hw: 8, hh: 8 }, sacks: { hw: 24, hh: 13 },
    mannequin: { hw: 9, hh: 11 }, wardrobe: { hw: 22, hh: 11 }, mirror: { hw: 10, hh: 7 },
    bigplant: { hw: 13, hh: 13 }, indoorpond: { hw: 26, hh: 16 }, crystalball: { hw: 12, hh: 13 }, telescope: { hw: 13, hh: 13 },
    workbench: { hw: 36, hh: 12 }, lumberstack: { hw: 28, hh: 13 },
  };
  private roomItems(): { kind: string; x: number; y: number }[] {
    // your home (square): just soft light — you fill the room with your own décor
    if (isHome(this.ringIdx)) return [{ kind: "hanglamp", x: -150, y: -182 }, { kind: "hanglamp", x: 150, y: -182 }];
    const id = shopIdAt(this.ringIdx);
    const F: { kind: string; x: number; y: number }[] = [{ kind: "hanglamp", x: -150, y: -182 }, { kind: "hanglamp", x: 150, y: -182 }, { kind: "counter", x: 0, y: -80 }, { kind: "rug", x: 0, y: 110 }];
    switch (id) {
      case "general":
        F.push({ kind: "backshelf", x: -100, y: -170 }, { kind: "backshelf", x: 100, y: -170 });
        F.push({ kind: "crate", x: -250, y: 178 }, { kind: "crate", x: -214, y: 190 }, { kind: "crateSm", x: -250, y: 140 });
        F.push({ kind: "barrel", x: 250, y: 174 }, { kind: "barrel", x: 214, y: 188 }, { kind: "barrel", x: 268, y: 138 }, { kind: "sacks", x: -258, y: 78 }); break;
      case "boutique":
        F.push({ kind: "backshelf", x: -100, y: -170 }, { kind: "backshelf", x: 100, y: -170 });
        F.push({ kind: "mannequin", x: -246, y: 46 }, { kind: "mannequin", x: -200, y: 96 }, { kind: "mannequin", x: 250, y: 150 });
        F.push({ kind: "wardrobe", x: 236, y: 34 }, { kind: "mirror", x: -244, y: 158 }); break;
      case "garden":
        F.push({ kind: "plantshelf", x: -100, y: -170 }, { kind: "plantshelf", x: 100, y: -170 });
        F.push({ kind: "bigplant", x: -252, y: 58 }, { kind: "bigplant", x: 252, y: 50 }, { kind: "bigplant", x: 208, y: 156 });
        F.push({ kind: "indoorpond", x: -232, y: 156 }, { kind: "crate", x: 258, y: 172 }); break;
      case "curios":
        F.push({ kind: "arcaneshelf", x: -100, y: -170 }, { kind: "arcaneshelf", x: 100, y: -170 });
        F.push({ kind: "crystalball", x: 0, y: 60 }, { kind: "telescope", x: 244, y: 66 });
        F.push({ kind: "crate", x: -252, y: 168 }, { kind: "crate", x: -216, y: 180 }); break;
      case "building":
        F.push({ kind: "toolrack", x: -100, y: -170 }, { kind: "toolrack", x: 100, y: -170 });
        F.push({ kind: "workbench", x: -196, y: 60 }, { kind: "lumberstack", x: 238, y: 80 });
        F.push({ kind: "barrel", x: 250, y: 176 }, { kind: "barrel", x: 214, y: 188 }, { kind: "crate", x: -252, y: 176 }); break;
      default:
        F.push({ kind: "backshelf", x: -100, y: -170 }, { kind: "barrel", x: 250, y: 174 }, { kind: "crate", x: -250, y: 178 });
    }
    return F;
  }
  private roomSolids() {
    const out: { x0: number; y0: number; x1: number; y1: number }[] = [];
    for (const it of this.roomItems()) { const s = CirqlWorldEngine.ROOM_SOLID[it.kind]; if (s) out.push({ x0: it.x - s.hw, y0: it.y - s.hh, x1: it.x + s.hw, y1: it.y + s.hh }); }
    return out;
  }
  private drawRoom(camX: number, camY: number) {
    const id = shopIdAt(this.ringIdx), pal = this.curRing.palette;
    const fx0 = -312, fx1 = 312, fyTop = -140, fy1 = 220, wx0 = -340, wx1 = 340, wyTop = -200;
    const plank = pal.sand || "#6b4e30", plank2 = shade(plank, -0.12), seam = shade(plank, -0.32);
    const wall = shade(pal.land || "#3a2a1c", -0.05), wallHi = shade(wall, 0.16), wallLo = shade(wall, -0.24);
    this.rect(wx0 - camX, wyTop - camY, wx1 - wx0, fy1 - wyTop, wallLo);                                   // wall backdrop
    this.rect(wx0 - camX, wyTop - camY, wx1 - wx0, fyTop - wyTop, wall);                                   // back wall
    for (let x = wx0 + 4; x < wx1; x += 30) this.rect(x - camX, wyTop - camY + 4, 1, (fyTop - wyTop) - 8, wallHi);   // panel seams
    this.rect(wx0 - camX, wyTop - camY, wx1 - wx0, 4, shade(wall, 0.22));                                  // crown molding
    this.rect(wx0 - camX, fyTop - camY - 4, wx1 - wx0, 5, shade(wall, -0.4));                              // wall-foot shadow
    this.rect(fx0 - camX, fyTop - camY, fx1 - fx0, fy1 - fyTop, plank);                                    // floor base
    for (let y = fyTop; y < fy1; y += 15) this.rect(fx0 - camX, y - camY, fx1 - fx0, 1, seam);             // plank rows
    for (let y = fyTop, row = 0; y < fy1; y += 15, row++) { const off = (row % 2) * 26; for (let x = fx0 + off; x < fx1; x += 52) this.rect(x - camX, y - camY, 1, 15, seam); }   // staggered board ends
    this.rect(fx0 - camX, fyTop - camY, fx1 - fx0, 5, shade(plank, 0.08));                                 // floor sheen
    this.rect(wx0 - camX, fyTop - camY, fx0 - wx0, fy1 - fyTop, wallLo); this.rect(fx0 - camX - 2, fyTop - camY, 2, fy1 - fyTop, wallHi);   // left wall
    this.rect(fx1 - camX, fyTop - camY, wx1 - fx1, fy1 - fyTop, wallLo); this.rect(fx1 - camX, fyTop - camY, 2, fy1 - fyTop, wallHi);       // right wall
    this.rect(-34 - camX, fy1 - camY - 8, 68, 10, shade(plank, -0.42)); this.rect(-30 - camX, fy1 - camY - 6, 60, 3, shade(plank, 0.12));   // doorway threshold
    for (const it of this.roomItems().slice().sort((a, b) => a.y - b.y)) this.drawFurniture(it.kind, it.x - camX, it.y - camY, pal.accent, id);
  }
  private drawFurniture(kind: string, sx: number, sy: number, ac: string, shopId: string | null) {
    const dk = "#241609";
    switch (kind) {
      case "hanglamp":
        this.rect(sx - 0.5, sy - 20, 1, 18, "#3a2a1a"); this.disc(sx, sy, 5, "#6a4a2a"); this.disc(sx, sy + 1, 3.5, "#ffe6a8");
        if (!this.reduce) this.glow(sx, sy + 3, 30, "#ffcf7a", 0.16 + 0.05 * Math.sin(this.t * 2 + sx)); return;
      case "rug":
        this.fillEll(sx, sy, 104, 58, shade(ac, -0.2)); this.fillEll(sx, sy, 92, 48, ac); this.fillEll(sx, sy, 66, 32, shade(ac, 0.14)); this.fillEll(sx, sy, 40, 18, shade(ac, -0.1)); return;
      case "barrel":
        this.fillEll(sx, sy + 15, 12, 4, "#0a071440"); this.rect(sx - 11, sy - 14, 22, 28, "#7a4a24"); this.fillEll(sx, sy - 14, 11, 4, "#8a5a2e"); this.fillEll(sx, sy + 14, 11, 4, "#5a3418");
        this.rect(sx - 11, sy - 8, 22, 2.5, "#4a2e18"); this.rect(sx - 11, sy + 5, 22, 2.5, "#4a2e18"); this.rect(sx - 11, sy - 14, 4, 28, shade("#7a4a24", 0.16)); return;
      case "crate": case "crateSm": {
        const h = kind === "crate" ? 22 : 15;
        this.fillEll(sx, sy + h / 2 + 2, h * 0.6, 3, "#0a071440"); this.rect(sx - h / 2, sy - h / 2, h, h, "#8a5a30"); this.rectLine(sx - h / 2, sy - h / 2, h, h, dk);
        this.rect(sx - h / 2, sy - 1, h, 2, "#5a3a1e"); this.rect(sx - 1, sy - h / 2, 2, h, "#5a3a1e"); this.rect(sx - h / 2, sy - h / 2, h, 2.5, shade("#8a5a30", 0.22)); return;
      }
      case "sacks":
        for (const o of [[-11, 4], [9, 1], [-1, -9]]) { const x = sx + o[0], y = sy + o[1]; this.fillEll(x, y + 8, 11, 3.5, "#0a071440"); this.fillEll(x, y, 11, 13, "#b89a5c"); this.fillEll(x, y - 9, 5, 4, "#a88a4c"); } return;
      case "backshelf": {
        this.rect(sx - 52, sy - 18, 104, 38, "#5a3c22"); this.rectLine(sx - 52, sy - 18, 104, 38, dk);
        this.rect(sx - 52, sy - 1, 104, 2.5, "#4a2e18"); this.rect(sx - 52, sy - 18, 104, 2.5, shade("#5a3c22", 0.22));
        const jars = ["#8fd0ff", "#ff9dd6", "#8fe6a0", "#ffd24a", "#c79dff", "#ffab6a"];
        for (let i = 0; i < 11; i++) { const jx = sx - 46 + i * 9, row = i % 2, jy = sy - 8 + row * 17; this.rect(jx, jy - 6, 6, 9, jars[(i + (shopId?.length || 0)) % jars.length]); this.rect(jx, jy - 7, 6, 2, "#eee4d2"); } return;
      }
      case "counter":
        this.rect(sx - 150, sy - 8, 300, 10, "#8a5c32"); this.rect(sx - 150, sy + 2, 300, 22, "#6a4424"); this.rectLine(sx - 150, sy - 8, 300, 32, dk); this.rect(sx - 150, sy - 8, 300, 2.5, "#a06e3c");
        for (let x = sx - 130; x < sx + 140; x += 50) this.rect(x, sy + 2, 2, 22, "#4a2e18");
        this.rect(sx - 96, sy - 16, 9, 8, "#ffd24a"); this.disc(sx + 70, sy - 12, 4, "#8fd0ff"); this.rect(sx + 6, sy - 15, 6, 7, "#ff9dd6"); this.disc(sx - 40, sy - 12, 3.5, ac);
        this.rect(sx + 110, sy - 18, 3, 10, "#c9c3d6"); this.rect(sx + 104, sy - 20, 15, 3, "#c9c3d6"); return;
      case "plantshelf": {
        this.rect(sx - 52, sy - 18, 104, 38, "#4a3a24"); this.rectLine(sx - 52, sy - 18, 104, 38, dk); this.rect(sx - 52, sy - 1, 104, 2.5, "#3a2c1a"); this.rect(sx - 52, sy - 18, 104, 2.5, shade("#4a3a24", 0.22));
        for (let i = 0; i < 6; i++) { const px = sx - 42 + i * 17, row = i % 2, py = sy - 8 + row * 17; this.rect(px - 3, py, 6, 5, "#8a5a30"); this.fillEll(px, py - 2, 5, 4, i % 2 ? "#3fae5a" : "#59c46f"); this.disc(px + 1, py - 4, 2, "#7fd88a"); } return;
      }
      case "arcaneshelf": {
        this.rect(sx - 52, sy - 18, 104, 38, "#3a2e50"); this.rectLine(sx - 52, sy - 18, 104, 38, dk); this.rect(sx - 52, sy - 1, 104, 2.5, "#2a2040"); this.rect(sx - 52, sy - 18, 104, 2.5, shade("#3a2e50", 0.24));
        this.disc(sx - 42, sy - 6, 3, "#e8e0d0"); this.disc(sx - 43, sy - 7, 0.8, "#3a2e50"); this.disc(sx - 41, sy - 7, 0.8, "#3a2e50");
        this.rect(sx - 26, sy - 10, 4, 8, "#8fe6a0"); this.rect(sx - 27, sy - 12, 6, 2, "#5a8a6a"); this.rect(sx - 8, sy - 8, 7, 5, "#d8c090");
        this.rect(sx + 12, sy - 7, 5, 4, "#c79dff"); this.glow(sx + 14, sy - 5, 6, "#c79dff", 0.2); this.rect(sx + 30, sy - 12, 2, 8, "#e8e0d0"); this.disc(sx + 31, sy - 13, 1.4, "#ffd24a");
        this.disc(sx - 30, sy + 11, 3, "#7fd8ff"); this.rect(sx - 6, sy + 7, 6, 6, "#ff9dd6"); this.disc(sx + 26, sy + 10, 2.5, "#ffab6a"); return;
      }
      case "toolrack": {
        this.rect(sx - 52, sy - 16, 104, 34, "#5a4326"); this.rectLine(sx - 52, sy - 16, 104, 34, dk); this.rect(sx - 52, sy - 16, 104, 2.5, shade("#5a4326", 0.2));
        this.rect(sx - 44, sy - 12, 2, 16, "#8a6a44"); this.triY(sx - 43, sy + 4, 8, 5, "#c9c3d6"); this.rect(sx - 20, sy - 12, 2, 14, "#6a4a24"); this.rect(sx - 24, sy - 12, 10, 4, "#4a4656");
        this.rect(sx + 4, sy - 12, 2, 14, "#8a8a94"); this.disc(sx + 5, sy - 12, 3, "#8a8a94"); this.disc(sx + 5, sy - 12, 1.4, "#5a4326"); this.rect(sx + 24, sy - 6, 22, 4, "#ffd24a"); this.rect(sx + 33, sy - 5, 3, 2, "#7fd88a"); return;
      }
      case "mannequin":
        this.rect(sx - 1, sy + 2, 2, 10, "#5a4632"); this.fillEll(sx, sy + 12, 6, 2.5, "#0a071440"); this.fillEll(sx, sy - 2, 8, 11, shade(ac, -0.1)); this.fillEll(sx, sy - 8, 5, 4, shade(ac, -0.2)); this.fillEll(sx, sy - 4, 6, 7, mix(ac, "#ffffff", 0.25)); return;
      case "wardrobe":
        this.rect(sx - 22, sy - 20, 44, 40, "#6a4a30"); this.rectLine(sx - 22, sy - 20, 44, 40, dk); this.rect(sx - 22, sy - 20, 44, 3, shade("#6a4a30", 0.2));
        this.rect(sx - 21, sy - 18, 20, 36, "#7a5636"); this.rect(sx + 1, sy - 18, 20, 36, "#7a5636"); this.rect(sx - 0.5, sy - 18, 1, 36, dk); this.disc(sx - 4, sy, 1.4, "#ffd98a"); this.disc(sx + 4, sy, 1.4, "#ffd98a"); return;
      case "mirror":
        this.fillEll(sx, sy - 2, 10, 15, "#c99a5a"); this.fillEll(sx, sy - 2, 8, 13, mix(ac, "#eaf6ff", 0.7)); if (!this.reduce) this.rect(sx - 4, sy - 8, 2, 8, "#ffffff40"); this.rect(sx - 8, sy + 12, 16, 2, "#8a6a44"); return;
      case "bigplant": {
        this.fillEll(sx, sy + 12, 12, 3.5, "#0a071440"); this.rect(sx - 9, sy + 4, 18, 10, "#a86a3a"); this.rect(sx - 9, sy + 4, 18, 2, "#c08a4a"); this.fillEll(sx, sy + 4, 9, 2.5, "#7a4a26");
        for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.5; this.fillEll(sx + Math.cos(a) * 8, sy - 6 + Math.sin(a) * 8, 4, 8, i % 2 ? "#3fae5a" : "#59c46f"); } this.disc(sx, sy - 12, 5, "#7fd88a"); return;
      }
      case "indoorpond":
        this.fillEll(sx, sy, 26, 15, "#3a5a4a"); this.fillEll(sx, sy, 22, 12, "#2f7a6a"); this.fillEll(sx, sy - 1, 16, 8, "#4fe0d0");
        if (!this.reduce) { this.fillEll(sx - 5, sy - 2, 4, 2, "#bff0ff80"); this.ring(sx, sy, 6 + (this.t * 6 % 10), "#bff0ff30", 1); } return;
      case "crystalball": {
        this.rect(sx - 8, sy + 6, 16, 8, "#4a3a5a"); this.rect(sx - 5, sy - 2, 10, 10, "#3a2e50"); this.fillEll(sx, sy + 14, 9, 3, "#0a071440");
        const cp = this.reduce ? 0.6 : 0.5 + 0.5 * Math.sin(this.t * 2); this.disc(sx, sy - 6, 8, "#1a1030"); this.disc(sx, sy - 6, 7, mix(ac, "#ffffff", 0.2)); this.disc(sx - 2, sy - 8, 2.5, "#ffffff80"); this.glow(sx, sy - 6, 16, ac, 0.2 + 0.16 * cp); return;
      }
      case "telescope":
        this.rect(sx - 8, sy + 2, 4, 12, "#6a5038"); this.rect(sx + 4, sy + 2, 4, 12, "#6a5038"); this.fillEll(sx, sy + 14, 8, 2.5, "#0a071440");
        this.rect(sx - 12, sy - 10, 22, 6, "#b8863a"); this.rect(sx - 12, sy - 10, 22, 2, "#e0b060"); this.disc(sx + 11, sy - 7, 4, "#8a6a30"); this.disc(sx - 13, sy - 7, 3, "#3a2e18"); this.glow(sx + 11, sy - 7, 6, ac, 0.14); return;
      case "workbench":
        this.rect(sx - 36, sy - 8, 72, 8, "#8a6038"); this.rect(sx - 36, sy, 72, 14, "#5a3f22"); this.rectLine(sx - 36, sy - 8, 72, 22, dk); this.rect(sx - 36, sy - 8, 72, 2.5, "#a4763e");
        this.rect(sx - 32, sy + 2, 4, 12, "#4a3218"); this.rect(sx + 28, sy + 2, 4, 12, "#4a3218"); this.rect(sx - 30, sy - 16, 10, 8, "#8a8a94"); this.rect(sx - 30, sy - 12, 10, 3, "#5a5a64"); this.rect(sx + 6, sy - 13, 12, 3, "#c9a060"); this.rect(sx + 16, sy - 15, 3, 5, "#6a4a24"); return;
      case "lumberstack":
        this.fillEll(sx, sy + 14, 26, 4, "#0a071440");
        for (let i = 0; i < 5; i++) { const yy = sy + 10 - i * 5, off = (i % 2) * 4; this.rect(sx - 26 + off, yy, 52, 4.5, i % 2 ? "#a9793f" : "#b98a4a"); this.rect(sx - 26 + off, yy, 52, 1, shade("#b98a4a", 0.2)); this.rect(sx + 24 + off, yy, 2, 4.5, "#6a4a24"); } return;
    }
  }
  // ---- MAZE sub-realms (caves/dungeons/canopy/clouds) — drawn as a TMW top-down maze, not a circle ----
  private isMazeRealm() { return !!this.curRing.maze; }
  /** Does an axis-aligned player box (half-size pr) at (x,y) overlap any WALL cell? */
  private mazeBlocked(x: number, y: number, pr: number): boolean {
    const mz = this.curRing.maze; if (!mz) return false;
    const cw = (mz.cols - 1) / 2, ch = (mz.rows - 1) / 2;
    for (const ox of [-pr, pr]) for (const oy of [-pr, pr]) {
      const c = Math.round((x + ox) / mz.cell + cw), r = Math.round((y + oy) / mz.cell + ch);
      if (c < 0 || r < 0 || c >= mz.cols || r >= mz.rows) return true;
      if (mz.grid[r * mz.cols + c]) return true;
    }
    return false;
  }
  private drawMaze(camX: number, camY: number) {
    const mz = this.curRing.maze!; const pal = this.curRing.palette;
    const { cols, rows, cell, grid } = mz, cw = (cols - 1) / 2, ch = (rows - 1) / 2, W = this.LW, H = this.LH;
    const floorA = shade(pal.land, 0.08), floorB = shade(pal.land, -0.02), seam = shade(pal.land, -0.22);
    const wallTop = shade(pal.grass, 0.06), wallFace = shade(pal.land, -0.42), wallEdge = shade(pal.land, -0.6), wallHi = shade(pal.grass, 0.2);
    // floors first
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (grid[r * cols + c]) continue;
      const sx = (c - cw) * cell - camX, sy = (r - ch) * cell - camY;
      if (sx < -cell || sx > W + cell || sy < -cell || sy > H + cell) continue;
      this.rect(sx - cell / 2, sy - cell / 2, cell, cell, (c + r) % 2 ? floorA : floorB);
      this.rect(sx - cell / 2, sy - cell / 2, cell, 1, seam); this.rect(sx - cell / 2, sy - cell / 2, 1, cell, seam);
    }
    // walls after (their raised top overlaps the floor to the south → height)
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (!grid[r * cols + c]) continue;
      const sx = (c - cw) * cell - camX, sy = (r - ch) * cell - camY;
      if (sx < -cell || sx > W + cell || sy < -cell * 2 || sy > H + cell) continue;
      if (r + 1 < rows && !grid[(r + 1) * cols + c]) this.rect(sx - cell / 2, sy + cell / 2 - 6, cell, cell * 0.28, wallFace);   // front face
      this.rect(sx - cell / 2, sy - cell / 2 - 4, cell, cell, wallTop); this.rectLine(sx - cell / 2, sy - cell / 2 - 4, cell, cell, wallEdge); this.rect(sx - cell / 2, sy - cell / 2 - 4, cell, 3, wallHi);
      if (!this.reduce && ((c * 7 + r * 3) % 5 === 0)) { this.glow(sx, sy - 8, 10, pal.accent, 0.14 + 0.06 * Math.sin(this.t * 2 + c)); this.disc(sx, sy - 8, 1.6, mix(pal.accent, "#ffffff", 0.3)); }   // vein/moss glimmer
    }
  }
  protected render() {
    this.ui.length = 0; this.uiZoom = false;   // reset the smooth-text queue for this frame
    if (this.tornado) { this.drawTornado(); this.drawFx(); return; }   // the storm sweep owns the screen (F)
    if (this.voyage) { this.drawVoyage(); this.drawFx(); return; }   // the sailing crossing owns the screen
    if (this.ride) { this.drawRide(); this.drawFx(); return; }        // an attraction ride owns the screen
    if (this.diorama) { this.drawDiorama(); this.drawFx(); return; }   // the beauty shot owns the screen (Phase H3)
    const b = this.b, s = this.SS, W = this.LW * s, H = this.LH * s, pal = this.curRing.palette;
    const dn = this.dayNight();   // day/night cycle (J3/J5)
    this.nightAmt = dn.night;     // per-object neon glow "breathes" up at night (biome kit)
    // backdrop — outdoors is sky/sea; indoors a dark surround; a maze fills gaps with its own gloom
    if (this.isInterior() || this.isMazeRealm()) { b.fillStyle = this.isMazeRealm() ? pal.sky[1] : "#0a0806"; b.fillRect(0, 0, W, H); } else {
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
    }

    const camX = this.camX, camY = this.camY;
    const scx = -camX, scy = -camY; // island centre (world 0,0) on screen

    // live zoom (Phase H2): scale the whole world pass around screen-centre; the sky/sea
    // backdrop above stays full-frame. Restored before the HUD/overlays (screen space).
    const zoomed = this.zoom !== 1;
    if (zoomed) { const fx = this.LW / 2 * s, fy = this.LH / 2 * s; b.save(); b.translate(fx, fy); b.scale(this.zoom, this.zoom); b.translate(-fx, -fy); }
    this.uiZoom = true;   // labels queued now are inside the zoom → onOverlay scales them to match

    // island landmass — grows with the land tier on CIRQLSPACE (Phase D). Indoors: a room instead.
    const R = this.effR();
    if (this.isInterior()) { this.drawRoom(camX, camY); } else if (this.isMazeRealm()) { this.drawMaze(camX, camY); } else {
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
    // your chosen ground PATTERN, tiled over the home turf (Style Studio)
    else if (this.spacePattern && this.spacePattern !== "none") this.drawGroundPattern(scx, scy, R);
    // faint path ring
    b.strokeStyle = "rgba(255,220,150,0.10)"; b.lineWidth = 20 * s;
    b.beginPath(); b.arc(scx * s, scy * s, R * 0.42 * s, 0, TAU); b.stroke();
    }

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
        case "curio": draws.push({ y: p.y, f: () => this.drawCurio(sxp, syp, p) }); break;
        case "bounty": draws.push({ y: p.y, f: () => this.drawBounty(sxp, syp, p) }); break;
        case "petshop": draws.push({ y: p.y, f: () => this.drawPetShop(sxp, syp, p) }); break;
        case "stylist": draws.push({ y: p.y, f: () => this.drawStylist(sxp, syp, p) }); break;
        case "barber": draws.push({ y: p.y + 6, f: () => this.drawBarber(sxp, syp, p) }); break;
        case "ride": draws.push({ y: p.y + 10, f: () => this.drawRideProp(sxp, syp, p) }); break;
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
    const walkBob = (!this.seated && this.walk > 0) ? -Math.round(Math.abs(Math.sin(this.walk)) * 2) : 0;   // a livelier bounce each stride
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
    // emotive locomotion (I7): tip the body into the direction of travel + a gentle step wobble
    const wobble = (this.walk > 0 && !this.reduce && !this.seated) ? Math.sin(this.walk * 0.5) * 0.025 : 0;
    const leanX = this.reduce ? 0 : this.lean + wobble;
    const paintBody = () => this.avatar(cx + bdx, cy + bob + bdy, this.hero, face, this.blinking > 0);
    const drawBody = gx ? () => this.withXform(cx, cy, gx, paintBody)
      : (leanX ? () => this.withXform(cx, cy, { rot: leanX, sx: 1, sy: 1 }, paintBody) : paintBody);
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
  // The Town Hall — a GRAND civic building (the one hearth prop): broad stone steps, a fluted
  // portico, a triangular pediment in the town accent, and a domed cupola with a clock + a flag
  // that waves. Meant to read as the stately centrepiece the plain box never did.
  private drawHearth(cx: number, cy: number, p: Prop) {
    const ac = p.accent || "#ffd98a";
    const near = this.near === p, t = this.t;
    this.glow(cx, cy - 8, 90, "#ffe0a0", 0.2 + (near ? 0.12 : 0));
    this.rect(cx - 36, cy + 16, 72, 6, "#0a071455");                          // ground shadow
    // broad stone steps
    this.rect(cx - 32, cy + 12, 64, 5, "#a8a294"); this.rect(cx - 28, cy + 8, 56, 5, "#bcb6a6"); this.rect(cx - 24, cy + 5, 48, 4, "#cdc7b6");
    // hall body (pale stone) + glowing arched windows
    this.rect(cx - 26, cy - 12, 52, 20, "#efe7d4"); this.rect(cx - 26, cy - 12, 52, 2, "#f6f0e2");
    for (const wx of [cx - 15, cx + 15]) { this.rect(wx - 2, cy - 8, 4, 10, "#ffe6a8"); this.disc(wx, cy - 8, 2, "#fff2c8"); if (!this.reduce) this.glow(wx, cy - 4, 7, "#ffd98a", 0.18); }
    // portico: fluted columns across the front
    for (let i = 0; i < 6; i++) { const xx = cx - 24 + i * 9; this.rect(xx, cy - 6, 3.5, 16, "#f8f2e4"); this.rect(xx, cy - 6, 1, 16, "#d6cdb8"); this.rect(xx - 0.5, cy - 7, 4.5, 1.5, "#e6ddca"); this.rect(xx - 0.5, cy + 9, 4.5, 1.5, "#d0c7b2"); }
    this.rect(cx - 27, cy - 8, 54, 2.5, "#e2d9c4");                           // architrave
    // triangular pediment in the town accent
    for (let i = 0; i < 15; i++) this.rect(cx - 28 + i, cy - 8 - i, (28 - i) * 2, 1, i % 2 ? shade(ac, -0.08) : ac);
    this.rect(cx - 28, cy - 8, 56, 1.5, shade(ac, -0.25)); this.disc(cx, cy - 15, 2, "#fff6e0");
    // domed cupola with a clock face + a flag that waves
    const dy = cy - 26;
    this.rect(cx - 7, dy + 2, 14, 6, "#e6ddca");
    this.disc(cx, dy, 8, mix(ac, "#ffffff", 0.25)); this.ring(cx, dy, 8, shade(ac, -0.3), 1.2);
    this.disc(cx, dy, 4.5, "#fff6e0"); this.ring(cx, dy, 4.5, shade(ac, -0.4), 0.8);
    this.rect(cx - 0.5, dy - 3, 1, 3.5, "#3a2f1a"); this.rect(cx, dy - 0.5, 3, 1, "#3a2f1a");   // clock hands (~3 o'clock)
    this.rect(cx - 0.5, dy - 15, 1, 8, "#8a7a5a");                            // flagpole
    if (!this.reduce) { for (let i = 0; i < 5; i++) { const fx = cx + 1 + Math.sin(t * 3 + i * 0.6) * 1.2; this.rect(fx, dy - 15 + i, 5, 1, i % 2 ? ac : shade(ac, 0.15)); } }
    else this.rect(cx + 1, dy - 15, 5, 4, ac);
    // grand double doors + hanging banners
    this.rect(cx - 6, cy + 1, 12, 11, shade(ac, -0.25)); this.rect(cx - 5, cy + 2, 5, 10, "#7a4a1e"); this.rect(cx + 0.5, cy + 2, 5, 10, "#7a4a1e");
    this.px(cx - 1, cy + 7, "#ffd98a"); this.px(cx + 1, cy + 7, "#ffd98a");
    for (const bx of [cx - 24, cx + 20]) { this.rect(bx, cy - 6, 3.5, 14, ac); this.rect(bx, cy - 6, 3.5, 1.5, shade(ac, -0.3)); this.rect(bx, cy + 8, 3.5, 1, shade(ac, -0.2)); }
    this.labelPill(cx, cy - 42, p.label || "Town Hall", ac);
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
  // A Town storefront (Milestone F). Each of the five shops now has its own SILHOUETTE + a
  // signature animated motif (dispatched by shopId), so the Town reads as bespoke rather than
  // one recoloured box. Unknown shopIds fall back to the cozy generic storefront.
  private drawShop(cx: number, cy: number, p: Prop) {
    const near = this.near === p, ac = p.accent || "#ffd98a";
    this.glow(cx, cy - 6, 56, ac, 0.16 + (near ? 0.16 : 0));
    this.rect(cx - 24, cy + 14, 48, 6, "#0a071450");                 // shared ground shadow
    switch (p.shopId) {
      case "boutique": this.shopBoutique(cx, cy, ac); break;
      case "garden": this.shopGarden(cx, cy, ac); break;
      case "curios": this.shopCurios(cx, cy, ac); break;
      case "building": this.shopBuilding(cx, cy, ac); break;
      case "general": this.shopGeneral(cx, cy, ac); break;
      default: this.shopGeneric(cx, cy, ac); break;
    }
    this.labelPill(cx, cy - 38, p.label || "Shop", ac);
  }
  private shopGeneric(cx: number, cy: number, ac: string) {
    this.rect(cx - 22, cy - 10, 44, 26, "#e7d8bd"); this.rect(cx - 22, cy - 10, 44, 2, shade(ac, -0.2)); this.rectLine(cx - 22, cy - 10, 44, 26, shade(ac, -0.35));
    for (let i = 0; i < 12; i++) this.rect(cx - 26 + i, cy - 10 - i, (26 - i) * 2, 1, shade(ac, -0.15));
    for (let i = 0; i < 11; i++) this.rect(cx - 22 + i * 4, cy - 1, 4, 4, i % 2 ? ac : "#fff6e8");
    this.rect(cx - 14, cy - 20, 28, 6, shade(ac, -0.1)); this.rectLine(cx - 14, cy - 20, 28, 6, "#0a0714");
    this.disc(cx - 13, cy + 8, 3, "#ffe6a8"); this.disc(cx + 13, cy + 8, 3, "#ffe6a8");
    this.rect(cx - 5, cy + 4, 10, 12, shade(ac, 0.1)); this.rect(cx - 4, cy + 6, 8, 10, "#7a4a1e"); this.px(cx + 2, cy + 11, "#ffd98a");
  }
  // General Store — a western false-front trading post: plank walls, barrels & crates, a swaying sign.
  private shopGeneral(cx: number, cy: number, ac: string) {
    const wood = "#c2914e", dk = "#6a4a24";
    this.rect(cx - 23, cy - 22, 46, 14, shade(wood, 0.08)); this.rectLine(cx - 23, cy - 22, 46, 14, dk); this.rect(cx - 23, cy - 22, 46, 2, shade(wood, 0.22));   // false-front parapet
    this.rect(cx - 16, cy - 19, 32, 7, shade(ac, -0.12)); this.rectLine(cx - 16, cy - 19, 32, 7, "#2a1c0c"); this.rect(cx - 13, cy - 17, 26, 1, shade(ac, 0.3));   // sign
    this.rect(cx - 22, cy - 8, 44, 24, wood); for (let i = 1; i < 4; i++) this.rect(cx - 22, cy - 8 + i * 6, 44, 0.7, shade(wood, -0.18)); this.rectLine(cx - 22, cy - 8, 44, 24, dk);   // plank walls
    this.rect(cx + 2, cy + 2, 10, 14, "#5a3a1e"); this.rect(cx + 3, cy + 3, 8, 13, "#7a4a1e"); this.px(cx + 4, cy + 9, "#ffd98a");   // door
    this.rect(cx - 15, cy - 3, 11, 9, "#ffe6a8"); this.rectLine(cx - 15, cy - 3, 11, 9, dk); this.rect(cx - 10, cy - 3, 1, 9, dk); this.rect(cx - 15, cy + 1, 11, 1, dk);   // paned window
    this.rect(cx - 21, cy + 7, 8, 9, "#8a5a2e"); this.rect(cx - 21, cy + 9, 8, 1, "#5a3a1e"); this.rect(cx - 21, cy + 13, 8, 1, "#5a3a1e"); this.rect(cx - 21, cy + 7, 3, 9, shade("#8a5a2e", 0.15));   // barrel
    this.rect(cx + 14, cy - 11, 9, 1.4, dk);   // sign arm
    const sw = Math.sin(this.t * 1.7) * 1.6;
    this.rect(cx + 18 + sw, cy - 8, 8, 6, shade(ac, -0.05)); this.rectLine(cx + 18 + sw, cy - 8, 8, 6, dk);   // swaying hung sign
  }
  // The Looking Glass — an elegant atelier: a mansard roof, a tall arched display window with a
  // dress-form, a scalloped awning, and a gleam sweeping across the glass.
  private shopBoutique(cx: number, cy: number, ac: string) {
    const wall = "#f2dfe8", dk = shade(ac, -0.4);
    for (let i = 0; i < 10; i++) { const w = 22 - i * 1.5; this.rect(cx - w, cy - 10 - i, w * 2, 1, i < 3 ? shade(ac, -0.1) : shade(ac, -0.24)); }   // mansard roof
    this.disc(cx, cy - 21, 1.8, mix(ac, "#ffffff", 0.4));   // finial
    this.rect(cx - 20, cy - 10, 40, 26, wall); this.rectLine(cx - 20, cy - 10, 40, 26, dk);
    this.rect(cx - 15, cy - 4, 13, 20, mix(ac, "#ffffff", 0.5)); this.disc(cx - 8.5, cy - 4, 6.5, mix(ac, "#ffffff", 0.5)); this.rectLine(cx - 15, cy - 4, 13, 20, dk);   // arched display window
    this.rect(cx - 10, cy + 3, 4, 9, shade(ac, -0.15)); this.disc(cx - 8, cy + 1, 2, shade(ac, -0.08));   // dress form
    for (let i = 0; i < 5; i++) this.disc(cx - 16 + i * 8, cy + 1, 4, i % 2 ? ac : "#fff2f7"); this.rect(cx - 20, cy - 2, 40, 2, shade(ac, -0.05));   // scalloped awning
    this.rect(cx + 6, cy + 3, 10, 13, mix(ac, "#ffffff", 0.3)); this.rectLine(cx + 6, cy + 3, 10, 13, dk); this.px(cx + 8, cy + 9, dk);   // door
    if (!this.reduce) { const g = Math.sin(this.t * 1.2) * 0.5 + 0.5; this.px(Math.round(cx - 14 + g * 11), cy - 2, "#ffffff"); this.px(Math.round(cx - 14 + g * 11), cy - 1, "#ffffff"); }   // gleam
  }
  // Garden & Grove — a glass greenhouse: a glazed gable roof, greenery crowding the panes, and a
  // glowing bloom on the ridge with drifting pollen.
  private shopGarden(cx: number, cy: number, ac: string) {
    const glass = "#bfeccf", bar = "#e8f6ee", frame = shade(ac, -0.35);
    for (let i = 0; i < 14; i++) this.rect(cx - 22 + i * 1.57, cy - 6 - i, (22 - i * 1.57) * 2, 1, i % 3 === 0 ? bar : glass);   // glazed gable
    this.rect(cx - 20, cy - 6, 40, 22, glass); this.rectLine(cx - 20, cy - 6, 40, 22, frame);
    for (let i = -2; i <= 2; i++) this.rect(cx + i * 8, cy - 6, 0.8, 22, bar); this.rect(cx - 20, cy + 4, 40, 0.8, bar);   // glazing bars
    for (let i = 0; i < 6; i++) { const gx = cx - 16 + i * 6.4; this.disc(gx, cy + 8 - (i % 2) * 3, 3, i % 2 ? "#3fae5a" : "#59c46f"); this.disc(gx + 1, cy + 5 - (i % 2) * 3, 2, "#7fd88a"); }   // plants
    const pulse = this.reduce ? 0.6 : 0.5 + 0.5 * Math.sin(this.t * 2);
    this.glow(cx, cy - 20, 10, ac, 0.2 + 0.2 * pulse); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; this.disc(cx + Math.cos(a) * 2.4, cy - 20 + Math.sin(a) * 2.4, 2, mix(ac, "#fff", 0.3)); } this.disc(cx, cy - 20, 1.6, "#ffe9a0");   // ridge bloom
    this.rect(cx - 5, cy + 3, 10, 13, mix(glass, "#ffffff", 0.3)); this.rectLine(cx - 5, cy + 3, 10, 13, frame); this.rect(cx, cy + 3, 0.8, 13, frame);   // door
    if (!this.reduce) for (let i = 0; i < 3; i++) this.px(Math.round(cx - 10 + i * 9), Math.round(cy - 10 + Math.sin(this.t * 0.5 + i * 2) * 6), "#fff2a0");   // pollen
  }
  // Curios & Wonders — a crooked wizard's shop: a starry conical roof with a star finial, a round
  // window holding a glowing crystal ball, and trinkets orbiting it.
  private shopCurios(cx: number, cy: number, ac: string) {
    const wall = "#3a2f5a", dk = shade(ac, -0.3);
    for (let i = 0; i < 16; i++) { const w = 16 - i; if (w <= 0) break; this.rect(cx - w, cy - 12 - i, w * 2, 1, i < 4 ? shade(ac, -0.05) : "#241a44"); }   // conical roof
    for (let i = 0; i < 5; i++) { const sx = cx - 8 + (i * 7) % 16, sy = cy - 14 - (i * 5) % 12; if (this.reduce || Math.sin(this.t * 3 + i) > -0.2) this.px(sx, sy, i % 2 ? "#ffd24a" : "#ffffff"); }   // roof stars
    this.disc(cx, cy - 28, 1.6, "#ffd24a"); this.glow(cx, cy - 28, 6, "#ffd24a", 0.3);   // star finial
    this.rect(cx - 15, cy - 12, 30, 28, wall); this.rectLine(cx - 15, cy - 12, 30, 28, dk); this.rect(cx - 15, cy - 12, 30, 2, shade(wall, 0.2));
    this.disc(cx, cy - 2, 6, "#120e26"); this.ring(cx, cy - 2, 6, dk, 1.2);   // round window
    const cp = this.reduce ? 0.6 : 0.5 + 0.5 * Math.sin(this.t * 2.2);
    this.disc(cx, cy - 2, 3.5, mix(ac, "#ffffff", 0.3)); this.glow(cx, cy - 2, 8, ac, 0.18 + 0.16 * cp);   // crystal ball
    if (!this.reduce) for (let i = 0; i < 3; i++) { const a = this.t * 1.4 + i * TAU / 3; this.disc(cx + Math.cos(a) * 12, cy - 2 + Math.sin(a) * 6, 1.3, i === 0 ? "#ffd24a" : i === 1 ? "#7fe0ff" : "#ff9dd6"); }   // orbiting trinkets
    this.rect(cx - 4, cy + 6, 8, 10, "#160f2e"); this.disc(cx, cy + 6, 4, "#160f2e"); this.rectLine(cx - 4, cy + 6, 8, 10, dk); this.px(cx + 2, cy + 11, ac);   // arched door
  }
  // Timber & Stone — a stout workshop: a stone base + timbered upper, a smoking chimney, and a
  // water wheel that turns on the side.
  private shopBuilding(cx: number, cy: number, ac: string) {
    const stone = "#8f8a80", timber = "#a9793f", dk = "#4a3a22";
    for (let i = 0; i < 13; i++) this.rect(cx - 24 + i * 1.7, cy - 8 - i, (24 - i * 1.7) * 2, 1, i % 2 ? shade(timber, -0.2) : shade(timber, -0.08)); this.rect(cx - 24, cy - 8, 48, 1.5, dk);   // roof
    this.rect(cx - 20, cy + 2, 40, 14, stone); for (let i = 0; i < 5; i++) this.rect(cx - 20 + i * 8, cy + 2, 0.6, 14, shade(stone, -0.2)); this.rect(cx - 20, cy + 8, 40, 0.6, shade(stone, -0.2));   // stone base
    this.rect(cx - 20, cy - 8, 40, 10, timber); this.rectLine(cx - 20, cy - 8, 40, 10, dk);
    this.rect(cx - 20, cy - 8, 40, 1.5, shade(timber, 0.15)); this.rect(cx - 20, cy - 8, 2, 10, dk); this.rect(cx - 2, cy - 8, 2, 10, dk); this.rect(cx + 18, cy - 8, 2, 10, dk);   // beams
    this.rect(cx + 12, cy - 20, 5, 12, "#6a5a4a");
    if (!this.reduce) for (let i = 0; i < 3; i++) { const yy = cy - 22 - i * 4 - (this.t * 6 % 4); this.disc(cx + 14 + Math.sin(this.t * 1.4 + i) * 2, yy, 1.5 + i * 0.4, "#b8b0a4"); }   // smoke
    this.rect(cx - 14, cy + 4, 8, 8, "#ffe6a8"); this.rectLine(cx - 14, cy + 4, 8, 8, dk);   // window
    this.rect(cx + 2, cy + 4, 10, 12, "#5a3a1e"); this.rect(cx + 3, cy + 5, 8, 11, "#7a4a1e");   // door
    const wx = cx - 24, wy = cy + 6, r = 7;
    this.disc(wx, wy, r + 0.5, "#3a2f22"); this.ring(wx, wy, r, "#7a5a34", 1.4);
    for (let i = 0; i < 8; i++) { const a = this.t * 1.2 + i * TAU / 8; this.rect(wx + Math.cos(a) * (r - 1) - 1, wy + Math.sin(a) * (r - 1) - 1, 2, 2, "#8a6a44"); }   // turning wheel paddles
    this.disc(wx, wy, 1.6, "#5a4326");
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
  // Which tree silhouette to draw at (x,y). Species cluster by REGION (a 130u grid) so a clump
  // reads as one grove/stand, not salt-and-pepper — and each biome has its own signature canopy.
  private canopyStyle(x: number, y: number): CanopyKind {
    const rx = Math.round(x / 130), ry = Math.round(y / 130);
    const region = (Math.abs(rx * 92837 ^ ry * 689287) >>> 0) % 10;
    const jit = (Math.abs((x | 0) * 3 + (y | 0) * 7) | 0) % 10;
    switch (this.curRing.biome) {
      case "woodland":
        if (region < 4) return jit < 8 ? "mushroom" : "willow";   // a mushroom grove
        if (region < 7) return jit < 8 ? "willow" : "mushroom";   // a willow stand
        return jit < 2 ? "mushroom" : "round";                    // ordinary wood, a few shrooms
      case "winter": case "aurora": return jit < 8 ? "frostpine" : "round";   // snow-laden conifers
      case "coast": return jit < 9 ? "palm" : "round";                        // a palm-lined shore
      case "tropical": return region < 6 ? "palm" : (jit < 6 ? "palm" : "round");   // palms + jungle broadleaf
      case "autumn": return jit < 2 ? "pine" : "maple";                       // amber maples, a few firs
      case "meadow": return region < 5 ? (jit < 6 ? "blossom" : "round") : (jit < 3 ? "blossom" : "round");   // blossom orchard
      case "savanna": return "acacia";                                        // flat-top acacias
      case "marsh": return region < 6 ? (jit < 7 ? "toadstool" : "willow") : (jit < 4 ? "toadstool" : "round");   // giant toadstools + willows
      default: return jit < 3 ? "pine" : "round";
    }
  }
  private seedOf(x: number, y: number) { return (Math.abs((x | 0) * 73856093 ^ (y | 0) * 19349663) >>> 0); }
  private triY(cx: number, apexY: number, halfW: number, h: number, color: string) {
    const b = this.b, s = this.SS;
    b.fillStyle = color; b.beginPath();
    b.moveTo(cx * s, apexY * s); b.lineTo((cx - halfW) * s, (apexY + h) * s); b.lineTo((cx + halfW) * s, (apexY + h) * s); b.closePath(); b.fill();
  }
  private drawTree(cx: number, cy: number, big?: boolean, kind: CanopyKind = "round", seed = 0) {
    if (kind === "mushroom") { this.drawMushroomTree(cx, cy, big, seed); return; }
    if (kind === "willow") { this.drawTentacleWillow(cx, cy, big, seed); return; }
    if (kind === "palm") { this.drawPalm(cx, cy, big, seed); return; }
    if (kind === "maple") { this.drawMaple(cx, cy, big, seed); return; }
    if (kind === "blossom") { this.drawBlossom(cx, cy, big, seed); return; }
    if (kind === "acacia") { this.drawAcacia(cx, cy, big); return; }
    if (kind === "frostpine") { this.drawFrostPine(cx, cy, big); return; }
    if (kind === "toadstool") { this.drawGiantToadstool(cx, cy, big, seed); return; }
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
  // ---- per-biome tree silhouettes (each biome its own signature canopy) ----
  // A snow-laden conifer with a cool glowing tip — winter / aurora tundra.
  private drawFrostPine(cx: number, cy: number, big?: boolean) {
    const s = big ? 1.4 : 1, g = this.curRing.palette.grass, acc = this.curRing.palette.accent;
    const dk = shade(mix(g, "#2a4a6a", 0.5), -0.2), fill = mix(g, "#3a6a8a", 0.4), snow = "#eaf4ff";
    this.disc(cx, cy + 3, 6 * s, "#0a071452");
    this.rect(cx - 1.5, cy - 6 * s, 3, 8 * s, "#3a3140");
    for (let i = 0; i < 3; i++) { const ty = cy - 12 * s - i * 6 * s, hw = (9 - i * 2.5) * s + 1;
      this.triY(cx, ty, hw, 9 * s + 1.5, dk); this.triY(cx, ty, hw - 1, 9 * s, fill); this.triY(cx, ty, (hw - 1) * 0.66, 4 * s, snow); }
    this.disc(cx, cy - 30 * s, 1.6 * s, acc); this.glow(cx, cy - 30 * s, 5 * s, acc, 0.1 + 0.24 * this.nightAmt);
  }
  // A leaning palm with radiating fronds + coconuts — coast / tropical.
  private drawPalm(cx: number, cy: number, big: boolean | undefined, seed: number) {
    const s = big ? 1.35 : 1, lean = (seed % 2) ? 1 : -1, b = this.b, ss = this.SS;
    const g = this.curRing.palette.grass, frond = mix(g, "#2f9a54", 0.5), frondDk = shade(frond, -0.32);
    this.disc(cx, cy + 3, 6 * s, "#0a071452");
    b.strokeStyle = "#8a6a44"; b.lineWidth = 4 * s * ss; b.lineCap = "round"; b.beginPath();
    b.moveTo(cx * ss, cy * ss); b.quadraticCurveTo((cx + lean * 6 * s) * ss, (cy - 18 * s) * ss, (cx + lean * 10 * s) * ss, (cy - 34 * s) * ss); b.stroke();
    b.lineCap = "butt";
    const tx = cx + lean * 10 * s, ty = cy - 34 * s, sway = this.reduce ? 0 : Math.sin(this.t * 1.2 + cx * 0.05) * 2;
    for (let i = 0; i < 7; i++) { const a = Math.PI + (i / 6) * Math.PI, ex = tx + Math.cos(a) * 16 * s + sway, ey = ty + Math.sin(a) * 10 * s - 2;
      this.neonPath([[tx, ty], [tx + Math.cos(a) * 9 * s, ty + Math.sin(a) * 6 * s - 3], [ex, ey]], i % 3 ? frond : frondDk, 0, 2 * s, 1); }
    this.disc(tx - 2 * s, ty + 2, 1.8 * s, "#6a4a2c"); this.disc(tx + 2 * s, ty + 3, 1.6 * s, "#6a4a2c");
  }
  // An amber maple with a slow-falling leaf — autumn wood.
  private drawMaple(cx: number, cy: number, big: boolean | undefined, seed: number) {
    const s = big ? 1.4 : 1, cols = ["#e07a2a", "#d24a2a", "#e8a83a", "#c23a5a"], c = cols[seed % cols.length];
    const fill = shade(c, -0.12), rim = shade(c, -0.5), hi = shade(c, 0.3);
    this.disc(cx, cy + 3, 6 * s, "#0a071452");
    this.rect(cx - 2, cy - 8 * s, 4, 10 * s, "#4a3222");
    for (let i = 0; i < 3; i++) this.disc(cx, cy - 14 * s - i * 5 * s, (11 - i * 2) * s + 1.2, rim);
    for (let i = 0; i < 3; i++) this.disc(cx, cy - 14 * s - i * 5 * s, (11 - i * 2) * s, fill);
    this.disc(cx - 3 * s, cy - 20 * s, 3.2 * s, hi);
    if (!this.reduce) { const fp = (this.t * 0.4 + cx * 0.1) % 1; this.disc(cx + 7 * s + Math.sin(this.t + cx) * 4, cy - 24 * s + fp * 30, 1.3, c); }
  }
  // A blossom orchard tree (pink/white) — spring meadow.
  private drawBlossom(cx: number, cy: number, big: boolean | undefined, seed: number) {
    const s = big ? 1.35 : 1, pink = (seed % 2) ? "#ffb3d9" : "#ffd1e8", g = this.curRing.palette.grass;
    const rim = shade(g, -0.55);
    this.disc(cx, cy + 3, 6 * s, "#0a071452");
    this.rect(cx - 2, cy - 8 * s, 4, 10 * s, "#5a4432");
    for (let i = 0; i < 3; i++) this.disc(cx, cy - 14 * s - i * 5 * s, (11 - i * 2) * s + 1.2, rim);
    for (let i = 0; i < 3; i++) this.disc(cx, cy - 14 * s - i * 5 * s, (11 - i * 2) * s, mix(g, pink, 0.35));
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; this.disc(cx + Math.cos(a) * 8 * s, cy - 18 * s + Math.sin(a) * 7 * s, 2.2 * s, pink); }
    this.disc(cx - 3 * s, cy - 20 * s, 2.4 * s, "#ffffff");
  }
  // A flat-topped umbrella acacia — golden savanna.
  private drawAcacia(cx: number, cy: number, big?: boolean) {
    const s = big ? 1.4 : 1, g = this.curRing.palette.grass, b = this.b, ss = this.SS;
    const fill = mix(g, "#5a6a2a", 0.4), rim = shade(fill, -0.5), hi = shade(fill, 0.28);
    this.disc(cx, cy + 3, 7 * s, "#0a071452");
    this.rect(cx - 1.5, cy - 16 * s, 3, 18 * s, "#6a5030");
    b.strokeStyle = "#6a5030"; b.lineWidth = 2 * s * ss; b.beginPath();
    b.moveTo(cx * ss, (cy - 14 * s) * ss); b.lineTo((cx - 7 * s) * ss, (cy - 20 * s) * ss);
    b.moveTo(cx * ss, (cy - 14 * s) * ss); b.lineTo((cx + 7 * s) * ss, (cy - 20 * s) * ss); b.stroke();
    this.fillEll(cx, cy - 22 * s, 18 * s, 5 * s, rim); this.fillEll(cx, cy - 23 * s, 17 * s, 4 * s, fill); this.fillEll(cx - 6 * s, cy - 24 * s, 8 * s, 2.4 * s, hi);
  }
  // A giant glowing toadstool — the mushroom-marsh signature (taller/bolder than the woodland cap).
  private drawGiantToadstool(cx: number, cy: number, big: boolean | undefined, seed: number) {
    const k = big ? 1.4 : 1.1, hues = ["#c85cff", "#5ff2c0", "#ff7ad0", "#7a9cff"], hue = hues[seed % hues.length];
    const capDk = shade(hue, -0.45), capHi = mix(hue, "#ffffff", 0.4), sway = this.reduce ? 0 : Math.sin(this.t * 1.0 + cx * 0.05) * 0.7;
    this.disc(cx, cy + 2, 7 * k, "#0a071452");
    this.rect(cx - 3.5 * k + sway, cy - 46 * k, 7 * k, 46 * k, "#d8e0d0"); this.rect(cx + 1 * k + sway, cy - 46 * k, 2.5 * k, 46 * k, "#aeb8a8");
    const cy2 = cy - 48 * k;
    this.fillEll(cx + sway, cy2 + 3 * k, 24 * k, 13 * k, capDk); this.fillEll(cx + sway, cy2, 23 * k, 12 * k, hue); this.fillEll(cx - 5 * k + sway, cy2 - 4 * k, 12 * k, 6 * k, capHi);
    for (let i = 0; i < 5; i++) this.disc(cx - 13 * k + i * 7 * k + sway, cy2 - 2 * k - ((i * 7) % 5) * k, 2.2 * k, mix(hue, "#fff", 0.55));
    this.neonEllipse(cx + sway, cy - 44 * k, 22 * k, 6 * k, hue, 6 * k, 1.6 * k, this.glowN(), 0, Math.PI);
    this.glow(cx + sway, cy - 46 * k, 22 * k, hue, 0.1 + 0.22 * this.nightAmt);
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
  // ---- Phase K7 discoverables + bounty board ----
  // A discoverable curio: a relic / a fallen star / a buried cache / a blight (mends when healed).
  private drawCurio(cx: number, cy: number, p: Prop) {
    const kind = p.curio || "relic", near = this.near === p;
    const healed = kind === "blight" && !!p.id && this.healed.has(p.id);
    const ac = p.accent || (kind === "blight" ? (healed ? "#8ef0a0" : "#a05cff") : kind === "star" ? "#bfe6ff" : kind === "cache" ? "#ffd24a" : "#c9a0ff");
    this.disc(cx, cy + 2, 7, "#0a071440");
    if (kind === "star") {
      this.glow(cx, cy - 5, 16, ac, 0.28 + 0.14 * Math.sin(this.t * 2));
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * (TAU / 5); this.triY(cx + Math.cos(a) * 2, cy - 6 + Math.sin(a) * 2, 2, 6, ac); }
      this.disc(cx, cy - 6, 2, "#ffffff");
    } else if (kind === "cache") {
      this.fillEll(cx, cy, 9, 4, "#4a3320"); this.rect(cx - 7, cy - 6, 14, 6, "#7a5a34"); this.rect(cx - 7, cy - 6, 14, 2, "#96703f");
      this.rect(cx - 1, cy - 6, 2, 6, "#5a3f24"); this.disc(cx, cy - 3, 1.3, ac); this.glow(cx, cy - 3, 8, ac, 0.14 + 0.12 * Math.sin(this.t * 2));
    } else if (kind === "blight") {
      if (healed) { for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; this.disc(cx + Math.cos(a) * 4, cy - 3 + Math.sin(a) * 3, 2, "#8ef0a0"); } this.disc(cx, cy - 3, 2, "#eaffd0"); this.glow(cx, cy - 3, 9, "#8ef0a0", 0.12 + 0.1 * this.nightAmt); }
      else { this.fillEll(cx, cy - 1, 11, 6, "#241a2e"); this.fillEll(cx, cy - 2, 7, 4, "#3a2450"); for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + this.t * 0.3; this.disc(cx + Math.cos(a) * 6, cy - 2 + Math.sin(a) * 3, 1.2, ac); } this.glow(cx, cy - 3, 13, ac, 0.14 + 0.12 * Math.sin(this.t * 1.6)); }
    } else {   // relic — a small standing stone with a glowing glyph
      this.rect(cx - 4, cy - 14, 8, 15, "#5a5566"); this.rect(cx - 4, cy - 14, 3, 15, "#6a6577"); this.triY(cx, cy - 17, 4, 3, "#4a4656");
      this.neonEllipse(cx, cy - 8, 3, 4, ac, 4, 1.2, 0.5 + 0.4 * this.nightAmt); this.glow(cx, cy - 8, 9, ac, 0.1 + 0.2 * this.nightAmt);
    }
    if (near) this.q(cx, cy - 24, "?", ac, 0.9, "c", true);
  }
  // A bounty board — a pinned notice board you inspect to pick a task.
  private drawBounty(cx: number, cy: number, p: Prop) {
    const near = this.near === p, ac = p.accent || "#ffd24a";
    this.disc(cx, cy + 3, 9, "#0a071440");
    this.rect(cx - 13, cy - 8, 4, 10, "#5a3f24"); this.rect(cx + 9, cy - 8, 4, 10, "#5a3f24");   // legs
    this.rect(cx - 13, cy - 26, 26, 20, "#6a4a2c"); this.rect(cx - 13, cy - 26, 26, 3, "#835a34"); this.rect(cx - 13, cy - 26, 3, 20, "#7a5230");   // board frame
    for (let i = 0; i < 3; i++) { const px = cx - 9 + i * 8, py = cy - 23 + (i % 2) * 3; this.rect(px, py, 6, 8, "#efe6d0"); this.rect(px, py, 6, 2, "#d8c9a8"); this.disc(px + 3, py, 0.8, "#b03a3a"); }   // pinned papers
    this.glow(cx, cy - 16, 12, ac, 0.08 + 0.12 * this.nightAmt);
    if (near) this.q(cx, cy - 34, "✦", ac, 0.9, "c", true);
  }
  // The Pet Stall — a striped-awning market stall with a glowing pawprint sign (Pets P1).
  private drawPetShop(cx: number, cy: number, p: Prop) {
    const near = this.near === p, ac = p.accent || "#ffd24a";
    this.disc(cx, cy + 3, 11, "#0a071440");
    this.rect(cx - 14, cy - 4, 3, 9, "#6a4a2c"); this.rect(cx + 11, cy - 4, 3, 9, "#6a4a2c");   // posts
    this.rect(cx - 16, cy - 6, 32, 4, "#5a3f24");                                                // counter
    for (let i = 0; i < 6; i++) this.rect(cx - 15 + i * 5, cy - 22, 5, 8, i % 2 ? "#e85a5a" : "#f0e6d0");   // striped awning
    this.rect(cx - 16, cy - 22, 32, 2, "#d8c9a8");
    this.disc(cx, cy - 31, 2.6, ac); this.glow(cx, cy - 31, 9, ac, 0.1 + 0.14 * this.nightAmt);   // pawprint sign
    this.disc(cx - 1.4, cy - 33.4, 0.9, "#3a2410"); this.disc(cx + 1.4, cy - 33.4, 0.9, "#3a2410"); this.disc(cx - 0.6, cy - 34, 0.8, "#3a2410"); this.disc(cx + 0.6, cy - 34, 0.8, "#3a2410");
    if (near) this.q(cx, cy - 42, "✦", ac, 0.9, "c", true);
  }
  // The Style Studio — a painter's easel with a palette (restyle your CIRQLSPACE).
  private drawStylist(cx: number, cy: number, p: Prop) {
    const near = this.near === p, ac = p.accent || "#c9a0ff", b = this.b, s = this.SS;
    this.disc(cx, cy + 3, 9, "#0a071440");
    // tripod legs
    b.strokeStyle = "#6a4a2c"; b.lineWidth = 2 * s; b.lineCap = "round"; b.beginPath();
    b.moveTo(cx * s, (cy - 18) * s); b.lineTo((cx - 6) * s, (cy + 3) * s); b.moveTo(cx * s, (cy - 18) * s); b.lineTo((cx + 6) * s, (cy + 3) * s); b.moveTo(cx * s, (cy - 18) * s); b.lineTo(cx * s, (cy + 4) * s); b.stroke(); b.lineCap = "butt";
    // canvas board with a few colour swatches
    this.rect(cx - 8, cy - 30, 16, 16, "#efe6d0"); this.rect(cx - 8, cy - 30, 16, 16, "#efe6d0");
    this.rect(cx - 8, cy - 30, 16, 2, "#d8c9a8");
    const sw = ["#8ef0a0", "#ff6a1a", "#bfe6ff", "#c85cff"]; for (let i = 0; i < 4; i++) this.disc(cx - 5 + (i % 2) * 6, cy - 26 + Math.floor(i / 2) * 6, 1.8, sw[i]);
    this.glow(cx, cy - 22, 12, ac, 0.08 + 0.12 * this.nightAmt);
    if (near) this.q(cx, cy - 40, "✦", ac, 0.9, "c", true);
  }
  // The Barber ("The Snip & Sparq") — a little shopfront with a spinning barber pole.
  private drawBarber(cx: number, cy: number, p: Prop) {
    const near = this.near === p, ac = p.accent || "#ff7ea8";
    this.disc(cx, cy + 4, 14, "#0a071440");
    // shop body + awning + door
    this.rect(cx - 15, cy - 26, 30, 30, "#3a4a66"); this.rect(cx - 15, cy - 26, 30, 3, "#4a5a78");
    for (let i = 0; i < 6; i++) this.rect(cx - 15 + i * 5, cy - 30, 5, 5, i % 2 ? "#e85a8a" : "#f0e6ee");   // striped awning
    this.rect(cx - 5, cy - 14, 10, 18, "#2a2440"); this.rect(cx - 5, cy - 14, 10, 2, "#3a3458");            // door
    this.rect(cx - 12, cy - 22, 6, 6, "#9fd0ff"); this.rect(cx + 6, cy - 22, 6, 6, "#9fd0ff");              // windows
    // spinning barber pole (right of the door)
    const px = cx + 12, top = cy - 20, h = 18;
    this.rect(px - 1.5, top, 3, h, "#f0eae0");
    for (let i = 0; i < 6; i++) { const yy = top + ((i * 3 + this.t * 6) % h); this.rect(px - 1.5, yy, 3, 1.4, i % 2 ? "#e0403a" : "#3a6ad0"); }
    this.disc(px, top - 1, 1.4, "#c8c8d0"); this.disc(px, top + h + 1, 1.4, "#c8c8d0");
    this.glow(cx, cy - 20, 12, ac, 0.08 + 0.12 * this.nightAmt);
    if (near) this.q(cx, cy - 38, "✦", ac, 0.9, "c", true);
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
  private creatures: { x: number; y: number; vx: number; vy: number; sp: Species; variant?: string; mode: string; act: string; trust: number; t: number; face: number; dir: string; rest: number; wtx: number; wty: number; home: { x: number; y: number }; pet?: string; name?: string; joy?: number }[] = [];
  private creaturesRing = -999;
  private ensureCreatures() {
    if (this.creaturesRing === this.ringIdx) return;
    this.creaturesRing = this.ringIdx; this.creatures = [];
    if (this.reduce) return;
    // CIRQLSPACE (ring 0): your PETS live here, not wild fauna. Grant the free starter once.
    if (this.ringIdx === 0) {
      if (!this.petStarter) { this.petStarter = true; this.pets.push({ id: "pet-1", type: "cat", name: "Buddy" }); this.onPetsChange?.(); }
      this.spawnPets(); return;
    }
    const biome = this.curRing.biome, edge = this.effR() * 0.82;
    // anchor the herd near landscape features (groves/rocks/water) so critters gather, not scatter
    const anchors = this.curRing.props.filter((p) => ["tree", "fern", "fairyring", "flower", "rock", "crystal", "pond"].includes(p.t));
    const spawn = (sp: Species, n: number, k: number, variant?: string) => {
      for (let i = 0; i < n; i++) {
        const a = anchors.length ? anchors[(i * 7 + k) % anchors.length] : { x: 0, y: 0 };
        let hx = a.x + Math.sin(i * 2.3 + k) * 44, hy = a.y + 30 + Math.cos(i * 1.7 + k) * 34;
        const hr = Math.hypot(hx, hy); if (hr > edge) { hx = hx / hr * edge; hy = hy / hr * edge; }
        this.creatures.push({ x: hx, y: hy, vx: 0, vy: 0, sp, variant, mode: "graze", act: "walk", trust: 0, t: i * 1.3, face: 1, dir: "d", rest: 0, wtx: hx, wty: hy, home: { x: hx, y: hy } });
      }
    };
    switch (biome) {
      case "woodland": spawn("deer", 2, 3); spawn("rabbit", 3, 5); spawn("fox", 1, 2); break;
      case "ember": spawn("salamander", 3, 4); break;
      case "winter": spawn("fox", 2, 2, "snow"); spawn("rabbit", 3, 5, "snow"); break;
      case "aurora": spawn("deer", 2, 3, "caribou"); spawn("rabbit", 2, 5, "snow"); break;
      case "coast": spawn("crab", 4, 3); break;
      case "tropical": spawn("frog", 3, 4); break;
      case "meadow": spawn("deer", 1, 2); spawn("rabbit", 3, 5, "hare"); break;
      case "desert": spawn("fox", 2, 3, "fennec"); break;
      case "autumn": spawn("squirrel", 3, 4); spawn("deer", 1, 2); break;
      case "marsh": spawn("salamander", 3, 4, "newt"); break;
      case "savanna": spawn("deer", 2, 3, "gazelle"); break;
      case "canyon": spawn("moth", 3, 4); break;
    }
  }
  // Autonomous idle: while grazing, a creature alternates between ambling to a new spot and
  // DOING an animal thing — graze (head down), sit, lay/nap, look around, bask — so the world
  // feels lived-in even when you're nowhere near.
  private idleWander(c: (typeof this.creatures)[number], dt: number) {
    c.rest -= dt; if (c.rest > 0) return;
    const mammal = c.sp === "deer" || c.sp === "rabbit" || c.sp === "fox" || c.sp === "squirrel";
    if (c.act === "walk") {   // arrived → settle into a behaviour
      const r = Math.random();
      if (c.sp === "moth") c.act = "look";                                           // moths never rest on the ground
      else if (mammal) c.act = r < 0.38 ? "graze" : r < 0.6 ? "sit" : r < 0.8 ? "look" : "lay";
      else c.act = r < 0.5 ? "sit" : r < 0.8 ? "look" : "bask";                       // frog/crab/salamander
      c.rest = c.act === "lay" ? 5 + Math.random() * 7 : (c.act === "sit" || c.act === "bask") ? 3 + Math.random() * 4 : c.act === "graze" ? 2.5 + Math.random() * 3 : 1.4 + Math.random() * 1.8;
      c.wtx = c.x; c.wty = c.y;                                                       // hold position while idling
    } else {                  // idle done → amble somewhere new
      c.act = "walk"; c.rest = 2 + Math.random() * 3;
      c.wtx = c.home.x + (Math.random() - 0.5) * 90; c.wty = c.home.y + (Math.random() - 0.5) * 70;
    }
  }
  private updateCreatures(dt: number) {
    if (!this.creatures.length) return;
    const px = this.posX, py = this.posY, calm = this.walk <= 0.05 && !this.dozing && !this.dialog;
    for (const c of this.creatures) {
      const dx = px - c.x, dy = py - c.y, dist = Math.hypot(dx, dy) || 1;
      const base = c.sp === "rabbit" ? 34 : c.sp === "squirrel" ? 40 : c.sp === "fox" || c.sp === "moth" ? 30 : c.sp === "crab" ? 22 : c.sp === "salamander" || c.sp === "frog" ? 18 : 26;
      let tx = c.wtx, ty = c.wty, spd = base * 0.45;
      if (c.joy && c.joy > 0) c.joy -= dt;
      if (c.pet) {                                            // a PET — friendly companion, never flees, comes to you
        const bond = this.petBond(c.pet);
        if (dist < 240) { c.trust = 1; const gap = 38 - Math.min(16, bond * 0.16);   // devoted pets stick closer
          if (dist > gap + 16) { tx = px; ty = py; spd = base * (dist > 130 ? 1.15 : 0.7); c.act = "walk"; c.mode = "approach"; }
          else { tx = c.x; ty = c.y; spd = 0; c.mode = dist < 30 ? "petted" : "watch"; c.act = (c.joy ?? 0) > 0 ? "walk" : dist < 30 ? "sit" : "look";
            if (bond >= 55 && (c.joy ?? 0) <= 0 && Math.sin(c.t * 0.7 + c.x) > 0.9993) c.joy = 1.1;   // a devoted pet emotes just to be near you
          }
        } else { c.mode = "graze"; this.idleWander(c, dt); tx = c.wtx; ty = c.wty; }
      } else if (c.sp === "fox" || c.sp === "salamander" || c.sp === "moth") {   // curious — trails you at a gap (salamander/moth linger closer)
        if (dist < 240) { c.trust = Math.min(1, c.trust + dt * 0.15); c.mode = "curious"; c.act = "walk"; const gap = 84;
          if (dist > gap + 14) { tx = px; ty = py; spd = base * (dist > 160 ? 1.2 : 0.8); }
          else if (dist < gap - 14) { tx = c.x - dx / dist * 30; ty = c.y - dy / dist * 30; spd = base * 0.9; }
          else { tx = c.x; ty = c.y; spd = 0; c.mode = "watch"; c.act = "look"; }
        } else { c.mode = "graze"; this.idleWander(c, dt); tx = c.wtx; ty = c.wty; }
      } else {                                                // deer / rabbit / squirrel — shy, then warm up
        const flee = c.sp === "rabbit" ? 54 : 66;
        if (dist < flee && !calm) { c.mode = "flee"; c.act = "run"; tx = c.x - dx / dist * 140; ty = c.y - dy / dist * 140; spd = base * 2.2; c.trust = Math.max(0, c.trust - dt * 0.6); }
        else if (dist < 130 && calm) { c.trust = Math.min(1, c.trust + dt * 0.32);
          if (dist <= 30 && c.trust > 0.5) { c.mode = "petted"; spd = 0; c.act = "sit"; }
          else if (c.trust > 0.72) { c.mode = "approach"; c.act = "walk"; tx = px; ty = py; spd = base * 0.5; }
          else { c.mode = "curious"; spd = 0; c.act = "look"; }
        } else { c.mode = "graze"; c.trust = Math.max(0, c.trust - dt * 0.08); this.idleWander(c, dt); tx = c.wtx; ty = c.wty; }
      }
      // keep the TARGET — and the creature — on solid land (never wander/flee into the sea)
      const edge = this.effR() * 0.85;
      { const tr = Math.hypot(tx, ty); if (tr > edge) { tx = tx / tr * edge; ty = ty / tr * edge; } }
      const mdx = tx - c.x, mdy = ty - c.y, md = Math.hypot(mdx, mdy) || 1;
      const dvx = md < 5 ? 0 : (mdx / md) * spd, dvy = md < 5 ? 0 : (mdy / md) * spd;
      c.vx += (dvx - c.vx) * Math.min(1, dt * 6); c.vy += (dvy - c.vy) * Math.min(1, dt * 6);
      c.x += c.vx * dt; c.y += c.vy * dt;
      // 4-directional facing from the HEADING: side view moving horizontally, front view (toward
      // you) moving down-screen, back view moving up-screen. Idle holds the last facing.
      if (md >= 5) {
        if (Math.abs(mdx) > Math.abs(mdy)) { c.dir = mdx > 0 ? "r" : "l"; c.face = mdx > 0 ? 1 : -1; }
        else c.dir = mdy > 0 ? "d" : "u";
      }
      c.t += dt;
      const rr = Math.hypot(c.x, c.y); if (rr > edge) { c.x = c.x / rr * edge; c.y = c.y / rr * edge; c.vx *= 0.4; c.vy *= 0.4; }   // shore barrier
    }
  }
  // ---- Phase 2 quest verbs: escort follower · timed race clock · naturalist census ----
  private updateQuestVerbs(dt: number) {
    // RACE: count the timed quest's clock down; fail + reset if it hits zero
    if (this.questTimer) {
      const tp = this.quests[this.questTimer.id];
      if (!tp || tp.status !== "active") this.questTimer = null;
      else { this.questTimer.left -= dt; if (this.questTimer.left <= 0) { const id = this.questTimer.id; this.questTimer = null; delete this.quests[id]; this.escortee = null; this.toast("⌛ Out of time — the trail's gone cold. Try again."); this.onQuestChange?.(); } }
    }
    // find the current escort / census objective across ALL active quests on this ring
    let esc: { q: QuestDef; oi: number; o: Objective } | null = null, cen: { q: QuestDef; oi: number; o: Objective } | null = null;
    for (const q of allQuests()) {
      const p = this.quests[q.id]; if (!p || p.status !== "active") continue;
      const oi = this.currentObjIndex(q); if (oi < 0) continue;
      const o = q.objectives[oi];
      if (o.ring != null && o.ring !== this.ringIdx) continue;
      if (o.kind === "escort" && !esc) esc = { q, oi, o };
      if (o.kind === "census" && !cen) cen = { q, oi, o };
    }
    // ESCORT: a follower spawns, trails you at a gap, and arrives at the destination prop
    if (esc) {
      if (!this.escortee) { const s = esc.o.from ? this.curRing.props.find((pp) => pp.id === esc.o.from) : null; this.escortee = { x: s ? s.x : this.posX, y: s ? s.y + 20 : this.posY + 26, vx: 0, vy: 0, destId: esc.o.target || "" }; }
      const e = this.escortee, dx = this.posX - e.x, dy = this.posY - e.y, d = Math.hypot(dx, dy) || 1, gap = 42;
      const spd = d > gap ? 82 * Math.min(1.7, d / gap) : 0, tvx = d > gap ? (dx / d) * spd : 0, tvy = d > gap ? (dy / d) * spd : 0;
      e.vx += (tvx - e.vx) * Math.min(1, dt * 6); e.vy += (tvy - e.vy) * Math.min(1, dt * 6); e.x += e.vx * dt; e.y += e.vy * dt;
      const dest = this.curRing.props.find((pp) => pp.id === e.destId);
      if (dest && Math.hypot(dest.x - e.x, dest.y - e.y) < (dest.r ?? 46)) this.advanceObjective("escort", e.destId);
    } else if (this.escortee) { this.escortee = null; }
    // CENSUS: log each distinct creature variant you get close to
    if (cen) {
      const p = this.quests[cen.q.id];
      for (const c of this.creatures) if (Math.hypot(c.x - this.posX, c.y - this.posY) < 120) this.censusSeen.add(c.sp + (c.variant ? ":" + c.variant : ""));
      const want = cen.o.count ?? 1, have = Math.min(want, this.censusSeen.size);
      if (have > (p.obj[cen.oi] || 0)) { p.obj[cen.oi] = have; this.onQuestChange?.(); if (this.currentObjIndex(cen.q) < 0) this.completeQuest(cen.q); }
    }
  }
  private drawCreatures() {
    const camX = this.camX, camY = this.camY, W = this.LW, H = this.LH;
    // the escorted follower — a little lantern-bearer trailing you to safety
    if (this.escortee) {
      const sx = this.escortee.x - camX, sy = this.escortee.y - camY, bob = this.reduce ? 0 : Math.sin(this.t * 3) * 1;
      this.disc(sx, sy + 2, 5, "#0a071440");
      this.rect(sx - 3, sy - 10 + bob, 6, 10, "#6a5a8a"); this.rect(sx - 3, sy - 10 + bob, 2, 10, "#7a6aa0");   // cloak
      this.disc(sx, sy - 12 + bob, 3, "#e8c9a0");                                                                // head
      this.disc(sx + 4.5, sy - 6 + bob, 1.6, "#ffd24a"); this.glow(sx + 4.5, sy - 6 + bob, 6, "#ffd24a", 0.28 + 0.14 * this.nightAmt);   // their lantern
      this.q(sx, sy - 20 + bob, "♥", "#ff6b8f", 0.8, "c", false, 0.9);
    }
    if (!this.creatures.length) return;
    for (const c of [...this.creatures].sort((a, b) => a.y - b.y)) {
      const sx = c.x - camX, sy = c.y - camY;
      if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) continue;
      const moving = Math.hypot(c.vx, c.vy) > 6;
      const jb = (c.joy ?? 0) > 0 ? -Math.abs(Math.sin((c.joy ?? 0) * 12)) * 4 : 0;   // a happy hop when petted/playing
      const sy2 = sy + jb;
      if (c.sp === "deer") this.drawDeer(sx, sy2, c.dir, moving, c.t, c.mode, c.variant, c.act);
      else if (c.sp === "fox") this.drawFox(sx, sy2, c.dir, moving, c.t, c.variant, c.act);
      else if (c.sp === "cat") this.drawCat(sx, sy2, c.dir, moving, c.t, c.act);
      else if (c.sp === "dog") this.drawDog(sx, sy2, c.dir, moving, c.t, c.act);
      else if (c.sp === "salamander") this.drawSalamander(sx, sy2, c.dir, moving, c.t, c.variant, c.act);
      else if (c.sp === "crab") this.drawCrab(sx, sy2, c.face, moving, c.t, c.act);
      else if (c.sp === "frog") this.drawFrog(sx, sy2, c.dir, moving, c.t, c.act);
      else if (c.sp === "squirrel") this.drawSquirrel(sx, sy2, c.dir, moving, c.t, c.act);
      else if (c.sp === "moth") this.drawMoth(sx, sy2, c.t);
      else this.drawBunny(sx, sy2, c.dir, moving, c.t, c.mode, c.variant, c.act);
      // a pet shows its NAME + extra love when joyful
      if (c.pet && c.name) { this.q(sx, sy - 30, c.name, "#ffe9a0", 0.62, "c", false, 0.9); if ((c.joy ?? 0) > 0) { this.q(sx - 6, sy2 - 26, "♥", "#ff6b8f", 0.7, "c", false, 0.9); this.q(sx + 7, sy2 - 30, "♥", "#ff9ab0", 0.55, "c", false, 0.8); } }
      // emotes: startle · napping · curious · content
      if (c.mode === "flee") this.q(sx, sy - 26, "!", "#ffd24a", 0.85, "c", true);
      else if (c.act === "lay") this.q(sx + 6, sy - 22 - Math.sin(this.t * 1.5) * 1.5, "z", "#bfd0ff", 0.7, "c", false, 0.7);
      else if (c.mode === "curious" || c.mode === "watch") this.q(sx, sy - 26, "?", "#9fd0ff", 0.8, "c", true);
      else if (c.mode === "petted" || (c.mode === "approach" && c.trust > 0.85)) { const hy = sy - 24 - Math.abs(Math.sin(this.t * 3)) * 2; this.q(sx, hy, "♥", "#ff6b8f", 0.9, "c", false, 0.95); }
      else if (c.act === "graze" && ((c.x | 0) % 3 === 0)) this.q(sx, sy - 22, "♪", "#b6ff6a", 0.6, "c", false, 0.5);   // a content little note
    }
  }
  // ---- Creature Animation Kit: 4-directional, articulated-leg quadrupeds ----
  // One 2-bone leg whose foot swings forward/back and lifts on the forward stroke (a real gait).
  private drawLimb(hx: number, hy: number, ph: number, len: number, w: number, color: string, moving: boolean, reach = 1) {
    const b = this.b, s = this.SS;
    const stride = moving ? Math.cos(ph) * len * 0.5 * reach : 0;
    const lift = moving ? Math.max(0, Math.sin(ph)) * len * 0.4 : 0;
    const footX = hx + stride, footY = hy + len - lift;
    const kneeX = (hx + footX) / 2 + len * 0.1, kneeY = hy + len * 0.5 - lift * 0.3;
    b.strokeStyle = color; b.lineWidth = w * s; b.lineCap = "round";
    b.beginPath(); b.moveTo(hx * s, hy * s); b.lineTo(kneeX * s, kneeY * s); b.lineTo(footX * s, footY * s); b.stroke();
    b.lineCap = "butt";
  }
  private quadEars(spec: QuadSpec, hx: number, hy: number, f: number, dir: string) {
    const c = spec.body, dk = shade(spec.body, -0.3), r = spec.headR;
    if (dir === "u" || dir === "d") {   // front/back — a pair, left + right
      if (spec.ear === "flop") { this.fillEll(hx - r * 0.7, hy - r * 0.1, 1.8, 3, dk); this.fillEll(hx + r * 0.7, hy - r * 0.1, 1.8, 3, dk); }
      else if (spec.ear === "cat" || spec.ear === "tuft") { this.triY(hx - r * 0.6, hy - r * 1.3, 1.8, 3, c); this.triY(hx + r * 0.6, hy - r * 1.3, 1.8, 3, c); }
      else { this.rect(hx - r * 0.7, hy - r * 1.5, 1.6, r, c); this.rect(hx + r * 0.7 - 1.6, hy - r * 1.5, 1.6, r, c); }
    } else {                            // side — toward the back of the head
      if (spec.ear === "flop") this.fillEll(hx - 1.6 * f, hy - 0.6, 1.6, 3, dk);
      else if (spec.ear === "cat" || spec.ear === "tuft") this.triY(hx - 0.6 * f, hy - r - 1, 1.7, 3, c);
      else this.rect(hx - 2 * f, hy - r - 2, 1.5, r * 0.9, c);
    }
  }
  private quadTail(spec: QuadSpec, tx: number, ty: number, f: number, dir: string) {
    const c = spec.tailCol;
    if (dir === "u") {                  // back view — tail up behind
      if (spec.tail === "bushy") { this.fillEll(tx, ty - 3, 3.4, 5, c); this.fillEll(tx, ty - 4, 2, 3, shade(c, 0.18)); }
      else if (spec.tail === "curl") this.neonPath([[tx, ty], [tx, ty - 4], [tx - 2, ty - 7]], c, 0, 2.4, 1);
      else this.rect(tx - 1, ty - 5, 2, 5, c);
    } else if (dir === "l" || dir === "r") {   // side — off the rump
      if (spec.tail === "bushy") { this.fillEll(tx, ty, 4.4, 3.2, c); this.fillEll(tx - 1 * f, ty - 1, 2.4, 1.8, shade(c, 0.18)); }
      else if (spec.tail === "curl") this.neonPath([[tx, ty], [tx - 3 * f, ty - 3], [tx - 4 * f, ty - 7]], c, 0, 2.4, 1);
      else if (spec.tail === "deer") this.rect(tx, ty - 1, 1.6, 3.4, c);
      else this.rect(tx, ty - 1, 1.5, 3, c);
    }                                   // front view — tail hidden behind the body
  }
  // Draw a quadruped in the given facing (u=away · d=toward · l/r=side) with a moving gait.
  private drawQuadruped(sx: number, sy: number, spec: QuadSpec, dir: string, act: string, t: number, moving: boolean, run: boolean) {
    const lay = act === "lay", sit = act === "sit", graze = act === "graze", idle = lay || sit;
    const mv = moving && !idle, ph = t * (run ? 12 : 7);
    const bl = spec.bodyLen, bh = spec.bodyH, lw = spec.legW, dkLeg = shade(spec.leg, -0.28);
    const bob = mv ? Math.abs(Math.sin(ph)) * 0.5 : Math.sin(t * 1.4) * 0.2;
    const drop = lay ? spec.legLen * 0.9 : sit ? spec.legLen * 0.5 : 0;
    const bodyY = sy - spec.legLen - bh * 0.35 + bob + drop;  // body a leg above the ground
    const hipY = bodyY + bh * 0.2;                            // hips INSIDE the lower body (so the body hides the leg tops)
    const ll = Math.max(3, sy - hipY);                        // legs reach the ground (feet at ~sy)
    const lwF = Math.max(1, lw * 0.82);                        // far legs a touch thinner (depth)
    this.disc(sx, sy + 2, bl * (lay ? 0.95 : 0.7), "#0a071440");
    if (dir === "u" || dir === "d") {                 // FRONT (toward) / BACK (away)
      const front = dir === "d";
      if (!front && !lay) this.quadTail(spec, sx, bodyY - bh * 0.6, 1, "u");
      if (!lay) {   // ALL legs first, then the body over their tops → clean, connected join
        this.drawLimb(sx - bl * 0.42, hipY, ph + Math.PI, ll, lwF, dkLeg, mv, 0.3); this.drawLimb(sx + bl * 0.42, hipY, ph, ll, lwF, dkLeg, mv, 0.3);
        this.drawLimb(sx - bl * 0.3, hipY, ph, ll, lw, spec.leg, mv, 0.3); this.drawLimb(sx + bl * 0.3, hipY, ph + Math.PI, ll, lw, spec.leg, mv, 0.3);
      }
      this.fillEll(sx, bodyY, bl * 0.72, bh * 1.08, spec.body);
      if (spec.belly && front) this.fillEll(sx, bodyY + bh * 0.32, bl * 0.42, bh * 0.66, spec.belly);
      const hy = bodyY - bh * (spec.neckLen > 4 ? 1.1 : 0.7) + (lay ? bh * 0.7 : 0);
      if (spec.neckLen > 4 && !lay) { const b = this.b, s = this.SS; b.strokeStyle = spec.body; b.lineWidth = 3.2 * s; b.lineCap = "round"; b.beginPath(); b.moveTo(sx * s, (bodyY - bh * 0.4) * s); b.lineTo(sx * s, (hy + spec.headR * 0.6) * s); b.stroke(); b.lineCap = "butt"; }
      this.fillEll(sx, hy, spec.headR * 1.05, spec.headR, spec.body2);
      this.quadEars(spec, sx, hy, 1, dir);
      if (front && !lay) { this.disc(sx - spec.headR * 0.42, hy, 0.7, "#1a1208"); this.disc(sx + spec.headR * 0.42, hy, 0.7, "#1a1208"); this.disc(sx, hy + spec.headR * 0.42, 0.9, shade(spec.body, -0.3)); }
      if (spec.antlers && !lay) { this.neonPath([[sx - 1.5, hy - spec.headR * 0.6], [sx - 3, hy - spec.headR - 2], [sx - 4.5, hy - spec.headR - 5]], spec.antlers, 3, 1.2, 0.5 + 0.4 * this.nightAmt); this.neonPath([[sx + 1.5, hy - spec.headR * 0.6], [sx + 3, hy - spec.headR - 2], [sx + 4.5, hy - spec.headR - 5]], spec.antlers, 3, 1.2, 0.5 + 0.4 * this.nightAmt); this.glow(sx, hy - spec.headR - 3, 5, spec.antlers, 0.2 + 0.3 * this.nightAmt); }
    } else {                                          // SIDE (l / r)
      const f = dir === "r" ? 1 : -1, backHipX = sx - bl * 0.5 * f, frontHipX = sx + bl * 0.42 * f;
      if (!lay) this.quadTail(spec, backHipX - 1 * f, bodyY, f, dir);
      if (!lay) {   // ALL legs first (far pair darker/thinner), then the body over their tops
        this.drawLimb(frontHipX - 1.5 * f, hipY, ph + Math.PI, ll, lwF, dkLeg, mv); this.drawLimb(backHipX - 1.5 * f, hipY, ph, ll, lwF, dkLeg, mv);
        this.drawLimb(frontHipX, hipY, ph, ll, lw, spec.leg, mv); this.drawLimb(backHipX, hipY, ph + Math.PI, ll, lw, spec.leg, mv);
      }
      this.fillEll(sx, bodyY, bl, bh, spec.body);
      if (spec.patch) this.fillEll(sx - bl * 0.45 * f, bodyY, bl * 0.34, bh * 0.6, spec.patch);
      const headUp = !graze && !lay, neck = spec.neckLen > 4 ? (headUp ? spec.neckLen : spec.neckLen * 0.45) : 1;
      const hx = sx + bl * 0.62 * f, hy = bodyY - neck + (lay ? bh * 0.5 : 0);
      if (spec.neckLen > 4 && !lay) { const b = this.b, s = this.SS; b.strokeStyle = spec.body; b.lineWidth = 3 * s; b.lineCap = "round"; b.beginPath(); b.moveTo((sx + bl * 0.4 * f) * s, bodyY * s); b.lineTo(hx * s, (hy + spec.headR * 0.5) * s); b.stroke(); b.lineCap = "butt"; }
      this.fillEll(hx, hy, spec.headR, spec.headR * 0.84, spec.body2);
      this.quadEars(spec, hx, hy, f, dir);
      this.disc(hx + spec.headR * 0.7 * f, hy + 0.4, 0.9, shade(spec.body, -0.3));   // snout
      if (lay) this.rect(hx + spec.headR * 0.2 * f, hy - 0.5, 1.5, 0.6, "#1a1208"); else this.disc(hx + spec.headR * 0.35 * f, hy - 0.3, 0.6, "#1a1208");
      if (spec.antlers && !lay) { this.neonPath([[hx + 1 * f, hy - 2], [hx + 2 * f, hy - 6], [hx + 4 * f, hy - 9]], spec.antlers, 3, 1.2, 0.5 + 0.4 * this.nightAmt); this.neonPath([[hx + 3 * f, hy - 2], [hx + 5 * f, hy - 5], [hx + 6 * f, hy - 8]], spec.antlers, 3, 1.2, 0.5 + 0.4 * this.nightAmt); this.glow(hx + 3 * f, hy - 6, 5, spec.antlers, 0.2 + 0.3 * this.nightAmt); }
    }
  }
  // deer + its variants: caribou (aurora, cool grey + icy antlers) and gazelle (savanna, tan + amber horns).
  private drawDeer(sx: number, sy: number, dir: string, moving: boolean, t: number, mode: string, variant?: string, act = "walk") {
    const cb = variant === "caribou" ? { body: "#7a7284", body2: "#8a84a0", leg: "#4a4658", patch: "#dfeaf6", ant: "#bfe6ff", tail: "#eef6ff" }
      : variant === "gazelle" ? { body: "#c89a5a", body2: "#d8aa66", leg: "#8a6a3a", patch: "", ant: "#ffcf4a", tail: "#f0e0c0" }
      : { body: "#8a6a44", body2: "#9a7a50", leg: "#5a4630", patch: this.curRing.palette.grass, ant: "#b6ff6a", tail: "#e8ddcf" };
    this.drawQuadruped(sx, sy, { body: cb.body, body2: cb.body2, leg: cb.leg, patch: cb.patch || undefined, bodyLen: 11, bodyH: 6, legLen: 10, legW: 2, neckLen: 9, headR: 5, ear: "up", tail: "deer", tailCol: cb.tail, antlers: cb.ant }, dir, act, t, moving, act === "run");
  }
  // fox + its variants: snow-fox (winter, pale) and fennec (desert, sandy + big ears).
  private drawFox(sx: number, sy: number, dir: string, moving: boolean, t: number, variant?: string, act = "walk") {
    const snow = variant === "snow", fennec = variant === "fennec";
    const c = snow ? "#dfe6ee" : fennec ? "#e0c088" : "#d87a3a";
    const c2 = snow ? "#f0f4fa" : fennec ? "#f0d8a8" : "#e89a54";
    const leg = snow ? "#aab4c2" : fennec ? "#c8a86a" : "#6a3a1c";
    this.drawQuadruped(sx, sy, { body: c, body2: c2, leg, bodyLen: 9, bodyH: 4.6, legLen: 6, legW: 1.9, neckLen: 1, headR: 4, ear: "cat", tail: "bushy", tailCol: c }, dir, act, t, moving, act === "run");
  }
  // A salamander (ember, fiery) or its newt variant (marsh, teal + violet glow-spots).
  private drawSalamander(sx: number, sy: number, dir: string, moving: boolean, t: number, variant?: string, act = "walk") {
    const newt = variant === "newt";
    const body = newt ? "#2c8a6a" : "#c2401a", body2 = newt ? "#3faa84" : "#e05a24", dk = newt ? "#1a5a44" : "#7a2410";
    const spotGlow = newt ? "#c85cff" : "#ffab3a", spotCore = newt ? "#e0a8ff" : "#ffe27a";
    const resting = act === "lay" || act === "bask";
    this.disc(sx, sy + 2, 8, "#0a071440");
    if (dir === "u" || dir === "d") {   // toward / away — a foreshortened crawl (legs splay, spots down the spine)
      const front = dir === "d", cr = moving && !resting ? Math.sin(t * 6) : 0;
      this.rect(sx - 6, sy - 3 + cr, 1.4, 3, dk); this.rect(sx + 5, sy - 3 - cr, 1.4, 3, dk);   // fore legs
      if (!front) this.fillEll(sx, sy - 1, 2.4, 1.6, body);                                      // tail toward you (back view)
      this.fillEll(sx, sy - 4, 5, 4, body); this.fillEll(sx, sy - 5, 3.4, 2.6, body2);
      for (let i = 0; i < 3; i++) { this.glow(sx, sy - 6 + i * 1.6, 3, spotGlow, 0.3 + 0.4 * this.nightAmt); this.disc(sx, sy - 6 + i * 1.6, 1, spotCore); }
      if (front) { this.fillEll(sx, sy - 7.5, 3, 2.2, body2); this.disc(sx - 1, sy - 7.5, 0.5, "#1a0a06"); this.disc(sx + 1, sy - 7.5, 0.5, "#1a0a06"); }   // head + eyes toward you
      return;
    }
    const f = dir === "r" ? 1 : -1;
    const sway = moving ? Math.sin(t * 4) * 1 : resting ? 0 : Math.sin(t * 1.2) * 0.4;
    this.fillEll(sx - 8 * f, sy - 2 + sway * 0.3, 4, 2.4, body);            // tail base
    this.fillEll(sx - 13 * f, sy - 1 + sway * 0.5, 2.6, 1.6, body);         // tail tip
    this.fillEll(sx, sy - 3, 9, 3.6, body);                                 // body
    this.fillEll(sx - 2 * f, sy - 4, 6, 2.4, body2);
    this.fillEll(sx + 8 * f, sy - 3.5, 4, 3, body2);                        // head
    const lp = moving ? Math.sin(t * 4) * 2 : 0;
    this.rect(sx - 5 * f, sy - 1, 1.4, 3 + lp * 0.3, dk); this.rect(sx + 4 * f, sy - 1, 1.4, 3 - lp * 0.3, dk);
    for (let i = 0; i < 4; i++) { const dx = sx - 8 * f + i * 5 * f; this.glow(dx, sy - 6, 3.5, spotGlow, 0.3 + 0.4 * this.nightAmt); this.disc(dx, sy - 6, 1.1, spotCore); }
    if (resting) this.rect(sx + 9 * f, sy - 4, 1.4, 0.5, "#1a0a06"); else this.disc(sx + 10 * f, sy - 4, 0.6, "#1a0a06");   // eye
  }
  // rabbit + variants (snow-hare / hare) — a 4-directional HOPPER: bounds toward you, away, or to the side.
  private drawBunny(sx: number, sy: number, dir: string, moving: boolean, t: number, mode: string, variant?: string, act = "walk") {
    const body = variant === "snow" ? "#eef4fb" : variant === "hare" ? "#c8a878" : "#b8a890";
    const ear = variant === "snow" ? "#dce6f2" : variant === "hare" ? "#b89868" : "#a89880";
    const lay = act === "lay", sit = act === "sit", run = mode === "flee";
    const hop = (moving && !lay && !sit) ? -Math.abs(Math.sin(t * (run ? 12 : 9))) * (run ? 4.2 : 3) : 0;   // bounding arc
    this.disc(sx, sy + 1, lay ? 5 : 4, "#0a071438");
    const by = sy - (lay ? 2 : 3) + hop;
    if (dir === "u" || dir === "d") {                 // front (toward) / back (away)
      const front = dir === "d";
      if (!front && !lay) this.disc(sx, by, 1.7, "#f4efe6");                             // fluffy tail (rear)
      this.fillEll(sx, by, 4, lay ? 2.4 : 3.4, body);                                    // body
      this.disc(sx, by - (lay ? 2 : 4), 2.2, body);                                      // head
      if (!lay && !(run && !front)) { const eh = sit ? 5.5 : run ? 3 : 4.5; this.rect(sx - 1.7, by - 4 - eh, 1.3, eh, ear); this.rect(sx + 0.4, by - 4 - eh, 1.3, eh, ear); }
      else if (!lay) { this.rect(sx - 2, by - 6, 3.4, 1.3, ear); this.rect(sx + 0.4, by - 6, 3.4, 1.3, ear); }   // ears back (fleeing away)
      if (front) { this.disc(sx - 0.9, by - 4, 0.5, "#1a1208"); this.disc(sx + 0.9, by - 4, 0.5, "#1a1208"); this.disc(sx, by - 3, 0.5, "#e8a0a8"); }   // eyes + nose
    } else {                                          // side (l / r)
      const f = dir === "r" ? 1 : -1;
      this.fillEll(sx, by, lay ? 5 : 4, lay ? 2.4 : 3.4, body);
      this.disc(sx + 3 * f, by - (lay ? 1 : 2), 2.2, body);                              // head
      if (run || lay) { this.rect(sx + 1 * f, by - (lay ? 2 : 4), 3.6, 1.4, ear); this.rect(sx + 2 * f, by - (lay ? 3.4 : 5.6), 3.6, 1.4, ear); }   // ears back
      else { const eh = sit ? 5 : 4; this.rect(sx + 2 * f, by - 2 - eh, 1.2, eh, ear); this.rect(sx + 4 * f, by - 2 - eh, 1.2, eh, ear); }   // ears up
      this.disc(sx - 3 * f, by + 1, 1.4, "#e8ddcf");                                     // tail
      if (lay) this.rect(sx + 4 * f, by - 2, 1.2, 0.5, "#1a1208"); else this.disc(sx + 4 * f, by - 2, 0.5, "#1a1208");   // eye
    }
  }
  // A sidestepping crab — coast hero fauna.
  private drawCrab(sx: number, sy: number, f: number, walk: boolean, t: number, act = "walk") {
    const c = "#e0603a", c2 = "#f07a4a", dk = "#a83a1a", tuck = act !== "walk" ? 1.5 : 0;   // pulls in when resting
    const bob = walk ? Math.sin(t * 8) * 0.6 : 0, b = this.b, s = this.SS;
    this.disc(sx, sy + 2, 6, "#0a071440");
    b.strokeStyle = dk; b.lineWidth = 1.2 * s; b.lineCap = "round"; b.beginPath();   // legs
    for (let i = 0; i < 3; i++) { const ly = sy - 4 + i * 2 + bob; b.moveTo((sx - 4) * s, (ly) * s); b.lineTo((sx - 9) * s, (ly + 2) * s); b.moveTo((sx + 4) * s, (ly) * s); b.lineTo((sx + 9) * s, (ly + 2) * s); }
    b.stroke(); b.lineCap = "butt";
    this.fillEll(sx, sy - 4 + bob, 7, 4.5, c); this.fillEll(sx - 1, sy - 5 + bob, 5, 2.6, c2);   // shell
    this.rect(sx - 2, sy - 10 + bob, 0.8, 3, dk); this.rect(sx + 2, sy - 10 + bob, 0.8, 3, dk);  // eye stalks
    this.disc(sx - 2, sy - 10 + bob, 1, "#1a1208"); this.disc(sx + 2, sy - 10 + bob, 1, "#1a1208");
    this.fillEll(sx - (9 - tuck) * f, sy - 4 + bob, 2.6, 2.2, c); this.fillEll(sx + (9 - tuck) * f, sy - 4 + bob, 2.6, 2.2, c);   // claws (tucked when resting)
  }
  // A tree-frog with a glowing throat — a 4-directional HOPPER (bounds toward you, away, or sideways).
  private drawFrog(sx: number, sy: number, dir: string, moving: boolean, t: number, act = "walk") {
    const c = "#4ac06a", c2 = "#6ad088", dk = "#2a8a4a";
    const hop = (moving && act !== "lay") ? -Math.abs(Math.sin(t * 9)) * 3 : 0, flat = act === "lay" ? 1 : 0;
    this.disc(sx, sy + 1, 4 + flat, "#0a071438");
    const front = dir === "d", back = dir === "u", side = !front && !back, f = dir === "r" ? 1 : -1;
    // splayed back legs (kick out further mid-hop)
    const kick = hop < -1 ? 1.5 : 0;
    this.rect(sx - 5 - kick, sy - 2 + hop, 2, 3, dk); this.rect(sx + 3 + kick, sy - 2 + hop, 2, 3, dk);
    this.fillEll(sx, sy - 3 + hop, 5, 3.4, c); this.fillEll(sx, sy - 4 + hop, 3.4, 2, c2);
    if (!back) {   // eye bulges — both toward you (front) or leading + trailing (side)
      const ex = side ? [1.6 * f, -1.6 * f] : [-2, 2], er = side ? [1.5, 1.1] : [1.4, 1.4];
      this.disc(sx + ex[0], sy - 6 + hop, er[0], c2); this.disc(sx + ex[1], sy - 6 + hop, er[1], c2);
      this.disc(sx + ex[0], sy - 6 + hop, 0.7, "#1a1208"); if (front) this.disc(sx + ex[1], sy - 6 + hop, 0.7, "#1a1208");
      else this.disc(sx + ex[1], sy - 6 + hop, 0.5, "#1a1208");
    } else { this.fillEll(sx, sy - 5 + hop, 3, 1.6, dk); }   // hunched back toward you
    const pulse = this.reduce ? 0.7 : 0.5 + 0.5 * Math.sin(t * 3);
    if (!back) { this.glow(sx, sy - 2 + hop, 4, "#ffe27a", 0.14 * pulse + 0.05); this.disc(sx, sy - 2 + hop, 1, "#ffe9a0"); }   // throat
  }
  // A darting squirrel with a bushy tail — autumn hero fauna.
  private drawSquirrel(sx: number, sy: number, dir: string, moving: boolean, t: number, act = "walk") {
    this.drawQuadruped(sx, sy, { body: "#b5642c", body2: "#c87a3c", leg: "#7a3e18", belly: "#e8cba0", bodyLen: 5, bodyH: 3.4, legLen: 4.4, legW: 1.4, neckLen: 1, headR: 2.8, ear: "tuft", tail: "bushy", tailCol: "#b5642c" }, dir, act, t, moving, act === "run");
  }
  // A house-cat pet — grey tabby with a curling tail.
  private drawCat(sx: number, sy: number, dir: string, moving: boolean, t: number, act = "walk") {
    this.drawQuadruped(sx, sy, { body: "#8a8f98", body2: "#a6abb4", leg: "#5a5f68", belly: "#c2c6cc", bodyLen: 7, bodyH: 4.2, legLen: 6, legW: 1.6, neckLen: 1, headR: 3.4, ear: "cat", tail: "curl", tailCol: "#8a8f98" }, dir, act, t, moving, act === "run");
  }
  // A friendly dog pet — floppy-eared, tan, with a wagging tail.
  private drawDog(sx: number, sy: number, dir: string, moving: boolean, t: number, act = "walk") {
    this.drawQuadruped(sx, sy, { body: "#b98a54", body2: "#ca9a64", leg: "#8a5f34", belly: "#e0c8a0", bodyLen: 7.5, bodyH: 4.4, legLen: 6, legW: 1.9, neckLen: 1, headR: 3.6, ear: "flop", tail: "bushy", tailCol: "#b98a54" }, dir, act, t, moving, act === "run");
  }
  // A hovering crystal-moth — canyon hero fauna (floats above the ground, wings flapping).
  private drawMoth(sx: number, sy: number, t: number) {
    const acc = this.curRing.palette.accent, fy = sy - 14 + Math.sin(t * 2) * 4, flap = Math.abs(Math.sin(t * 12)), wc = mix(acc, "#ffffff", 0.3);
    this.disc(sx, sy + 2, 2, "#0a071430");
    this.fillEll(sx - 3, fy, 3 + flap * 1.5, 4 - flap * 1.5, wc); this.fillEll(sx + 3, fy, 3 + flap * 1.5, 4 - flap * 1.5, wc);   // wings
    this.fillEll(sx, fy, 1.4, 3, "#3a2c3a");                                  // body
    this.glow(sx, fy, 7, acc, 0.16 + 0.2 * this.nightAmt); this.disc(sx, fy - 3, 0.8, mix(acc, "#fff", 0.5));
  }
  // An obsidian spire — the ember biome's "crystal": dark angular shards with a magenta sheen.
  private drawObsidianSpire(cx: number, cy: number, big: boolean | undefined) {
    const k = big ? 1.3 : 1, dk = "#160f16", ob = "#26182a", hi = "#3c2842", mag = "#ff4fd8", b = this.b, s = this.SS;
    this.disc(cx, cy + 2, 6 * k, "#0a071440");
    const tri = (x: number, w: number, h: number, col: string) => { b.fillStyle = col; b.beginPath(); b.moveTo(x * s, (cy - h) * s); b.lineTo((x - w) * s, cy * s); b.lineTo((x + w) * s, cy * s); b.closePath(); b.fill(); };
    tri(cx - 6 * k, 5 * k, 26 * k, dk); tri(cx + 7 * k, 5 * k, 30 * k, ob); tri(cx, 7 * k, 40 * k, ob); tri(cx - 2 * k, 4 * k, 44 * k, hi);
    this.neonPath([[cx - 2 * k, cy - 44 * k], [cx + 7 * k, cy]], mag, 4 * k, 1.2 * k, 0.5 + 0.4 * this.nightAmt);
    this.neonPath([[cx - 2 * k, cy - 44 * k], [cx - 7 * k, cy - 2 * k]], mag, 4 * k, 1.2 * k, 0.5 + 0.4 * this.nightAmt);
    this.glow(cx, cy - 30 * k, 14 * k, mag, 0.08 + 0.18 * this.nightAmt);
  }
  // A stack of hexagonal basalt columns — the ember biome's "rock".
  private drawBasaltColumn(cx: number, cy: number, big: boolean | undefined) {
    const k = big ? 1.3 : 1;
    this.disc(cx, cy + 2, 8 * k, "#0a071440");
    for (let i = 0; i < 3; i++) {
      const cw = 6 * k, x = cx + (i - 1) * 7 * k, h = (18 + (i === 1 ? 8 : 0)) * k;
      this.rect(x - cw / 2, cy - h, cw, h, "#3a2c26"); this.rect(x - cw / 2, cy - h, 2 * k, h, "#4a3a30"); this.rect(x - cw / 2, cy - h, cw, 3 * k, "#2a201c");
      this.triY(x, cy - h - 3 * k, cw / 2, 3 * k, "#52413a");
    }
  }
  // An ember-poppy — the ember flower: charred petals with a molten glowing core.
  private drawEmberPoppy(cx: number, cy: number) {
    this.rect(cx, cy - 4, 1, 5, "#3a241c");
    const R = 2.1; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * (TAU / 5); this.disc(cx + Math.cos(a) * R, cy - 5 + Math.sin(a) * R, 1.5, "#2a1810"); }
    const pulse = this.reduce ? 0.7 : 0.6 + 0.4 * Math.sin(this.t * 2.2 + cx);
    this.glow(cx, cy - 5, 7, "#ff6a1a", (0.18 + 0.34 * this.nightAmt) * pulse + 0.12); this.disc(cx, cy - 5, 1.4, "#ffe27a");
  }
  // A lava pool — the ember biome's "pond": organic magma, molten core, glowing edge (solid).
  private drawLavaPool(cx: number, cy: number, r: number) {
    const lobes: [number, number, number][] = [[0, 0, 1], [0.55, -0.12, 0.72], [-0.5, 0.14, 0.64], [0.28, 0.36, 0.5]];
    const el = (dx: number, dy: number, sc: number, ry: number, col: string) => this.fillEll(cx + dx * r * 0.72, cy + dy * r * 0.62, r * sc, r * sc * ry, col);
    for (const L of lobes) el(L[0], L[1] + 0.06, L[2] * 1.05, 0.66, "#241611");
    for (const L of lobes) el(L[0], L[1], L[2], 0.6, "#c23a08");
    for (const L of lobes) el(L[0], L[1], L[2] * 0.8, 0.5, "#ff6a1a");
    for (const L of lobes) this.fillEll(cx + L[0] * r * 0.72 - r * 0.08, cy + L[1] * r * 0.62 - r * 0.06, r * L[2] * 0.45, r * L[2] * 0.28, "#ffe27a");
    if (!this.reduce) for (let i = 0; i < 5; i++) { const L = lobes[i % lobes.length], bx = cx + L[0] * r * 0.72 + Math.sin(this.t * 1.3 + i) * r * 0.3, by = cy + L[1] * r * 0.62 + Math.cos(this.t * 1.1 + i * 2) * r * 0.2, bl = 0.5 + 0.5 * Math.sin(this.t * 3 + i * 2); this.glow(bx, by, 3 + bl * 3, "#ffe27a", 0.35 * bl); }
    this.glow(cx, cy, r * 1.6, "#ff6a1a", 0.12 + 0.14 * this.nightAmt);
    for (const L of lobes) this.neonEllipse(cx + L[0] * r * 0.72, cy + L[1] * r * 0.62, r * L[2], r * L[2] * 0.62, "#ffab3a", 3, 1.2, 0.4 + 0.4 * this.nightAmt);
  }
  // The crystal-canyon signature: a cluster of tall faceted shards in the ring's accent hue.
  private drawCrystalSpire(cx: number, cy: number, big: boolean | undefined, c: string) {
    const k = big ? 1.35 : 1, b = this.b, s = this.SS, hi = mix(c, "#ffffff", 0.55), dk = shade(c, -0.42);
    this.disc(cx, cy + 2, 6 * k, "#0a071440");
    this.glow(cx, cy - 16 * k, 18 * k, c, 0.1 + 0.2 * this.nightAmt);
    const shard = (ox: number, w: number, h: number, col: string) => { b.fillStyle = col; b.beginPath(); b.moveTo((cx + ox) * s, (cy - h) * s); b.lineTo((cx + ox - w) * s, cy * s); b.lineTo((cx + ox + w) * s, cy * s); b.closePath(); b.fill(); };
    shard(-7 * k, 4 * k, 20 * k, dk); shard(6 * k, 4.5 * k, 24 * k, dk);
    shard(0, 5.5 * k, 34 * k, c); shard(-1.5 * k, 2 * k, 34 * k, hi);
    shard(6 * k, 3 * k, 24 * k, mix(c, "#fff", 0.3)); shard(-7 * k, 2.5 * k, 20 * k, mix(c, "#fff", 0.25));
    this.neonPath([[cx - 1.5 * k, cy - 34 * k], [cx + 6 * k, cy]], hi, 3 * k, 1 * k, 0.4 + 0.4 * this.nightAmt);
  }
  // Murky peat water — the mushroom-marsh "pond": deep green-brown with a violet glowing rim
  // and slow rising bubbles.
  private drawBogWater(cx: number, cy: number, r: number) {
    const acc = mix(this.curRing.palette.accent, "#7a4fd0", 0.4);
    const lobes: [number, number, number][] = [[0, 0, 1], [0.55, -0.12, 0.72], [-0.5, 0.14, 0.64], [0.28, 0.36, 0.5]];
    const el = (dx: number, dy: number, sc: number, ry: number, col: string) => this.fillEll(cx + dx * r * 0.72, cy + dy * r * 0.62, r * sc, r * sc * ry, col);
    for (const L of lobes) el(L[0], L[1] + 0.06, L[2] * 1.04, 0.64, "#0e1e18");
    for (const L of lobes) el(L[0], L[1], L[2], 0.6, "#1c3a2c");
    for (const L of lobes) el(L[0], L[1], L[2] * 0.8, 0.5, "#2c5240");
    for (const L of lobes) this.fillEll(cx + L[0] * r * 0.72 - r * 0.06, cy + L[1] * r * 0.62 - r * 0.06, r * L[2] * 0.4, r * L[2] * 0.24, "#3f6a4e");
    if (!this.reduce) for (let i = 0; i < 4; i++) { const L = lobes[i % lobes.length], bx = cx + L[0] * r * 0.72 + Math.sin(this.t * 0.8 + i * 2) * r * 0.3, by = cy + L[1] * r * 0.62 - ((this.t * 0.4 + i * 0.5) % 1) * r * 0.4; this.disc(bx, by, 0.9, "#8affc8"); }
    this.glow(cx, cy, r * 1.4, acc, 0.08 + 0.14 * this.nightAmt);
    for (const L of lobes) this.neonEllipse(cx + L[0] * r * 0.72, cy + L[1] * r * 0.62, r * L[2], r * L[2] * 0.62, acc, 3, 1.1, 0.32 + 0.42 * this.nightAmt);
  }
  // Lily-pads with the odd bloom — laid over a tropical lagoon.
  private drawLilyPads(cx: number, cy: number, r: number) {
    for (let i = 0; i < 4; i++) { const a = i * (TAU / 4) + (Math.abs(cx) % 5) * 0.2, px = cx + Math.cos(a) * r * 0.5, py = cy + Math.sin(a) * r * 0.4;
      this.fillEll(px, py, 4.5, 2.6, "#2f8a5a"); this.fillEll(px, py, 3.4, 1.9, "#3fa86a");
      const b = this.b, s = this.SS; b.strokeStyle = "#1c5a38"; b.lineWidth = 0.8 * s; b.beginPath(); b.moveTo(px * s, py * s); b.lineTo((px + 3) * s, (py - 1.4) * s); b.stroke();
      if (i % 2) { this.disc(px + 1, py - 2, 1.3, "#ffd1e8"); this.disc(px + 1, py - 2, 0.7, "#ffffff"); }
    }
  }
  private drawCrystal(cx: number, cy: number, big: boolean | undefined, c: string) {
    if (this.curRing.biome === "ember") { this.drawObsidianSpire(cx, cy, big); return; }
    if (this.curRing.biome === "canyon") { this.drawCrystalSpire(cx, cy, big, c); return; }
    const s = big ? 1.35 : 1;
    this.disc(cx, cy + 2, 5 * s, "#0a071440");
    this.glow(cx, cy - 6 * s, 16 * s, c, this.reduce ? 0.35 : 0.28 + 0.12 * Math.sin(this.t * 1.7 + cx));
    // faceted shard
    this.rect(cx - 2 * s, cy - 6 * s, 4 * s, 8 * s, c);
    this.rect(cx - 1 * s, cy - 12 * s, 2 * s, 8 * s, c);
    this.rect(cx - 1 * s, cy - 6 * s, 1, 6 * s, "#ffffff");
    if (big) { this.rect(cx + 3 * s, cy - 3 * s, 2 * s, 5 * s, c); this.rect(cx - 5 * s, cy - 2 * s, 2 * s, 4 * s, c); }
  }
  // A wind-carved sandstone mesa — the desert signature "rock" (banded, warm, with a notch).
  private drawSandstone(cx: number, cy: number, big?: boolean) {
    const s = big ? 1.5 : 1, bands = ["#b57a44", "#c98d50", "#d8a05e", "#c07a42"];
    this.disc(cx, cy + 2, 8 * s, "#0a071440");
    for (let i = 0; i < 4; i++) { const h = (16 - i * 3.4) * s; this.fillEll(cx, cy - i * 3.6 * s, (9 - i * 1.2) * s, (5 - i * 0.5) * s, bands[i]); this.rect(cx - (9 - i * 1.2) * s, cy - i * 3.6 * s - h * 0.05, (18 - i * 2.4) * s, 1, "#8a5a34"); }
    this.fillEll(cx - 2 * s, cy - 13 * s, 4 * s, 2.2 * s, "#e6b86e");   // sunlit top
    this.rect(cx + 3 * s, cy - 6 * s, 2 * s, 6 * s, "#7a4e2c");         // shadowed notch
  }
  // A flat-topped butte studded with a couple of glowing crystals — the crystal-canyon "rock".
  private drawMesa(cx: number, cy: number, big?: boolean) {
    const s = big ? 1.5 : 1, acc = this.curRing.palette.accent;
    this.disc(cx, cy + 2, 8 * s, "#0a071440");
    this.rect(cx - 8 * s, cy - 12 * s, 16 * s, 12 * s, "#7a4030"); this.rect(cx - 8 * s, cy - 12 * s, 16 * s, 2.4 * s, "#9a5a3e");
    this.rect(cx - 8 * s, cy - 12 * s, 3 * s, 12 * s, "#63321f");
    this.fillEll(cx, cy - 12 * s, 8 * s, 2.6 * s, "#a86a48");
    this.rect(cx + 2 * s, cy - 18 * s, 1.6 * s, 6 * s, acc); this.glow(cx + 2.8 * s, cy - 17 * s, 5 * s, acc, 0.12 + 0.22 * this.nightAmt);
    this.rect(cx - 4 * s, cy - 16 * s, 1.3 * s, 4 * s, acc); this.glow(cx - 3.4 * s, cy - 15 * s, 4 * s, acc, 0.1 + 0.2 * this.nightAmt);
  }
  // ---- landscape: rocks + ponds ----
  private drawRock(cx: number, cy: number, big?: boolean) {
    const biome = this.curRing.biome;
    if (biome === "ember") { this.drawBasaltColumn(cx, cy, big); return; }
    if (biome === "desert") { this.drawSandstone(cx, cy, big); return; }
    if (biome === "canyon") { this.drawMesa(cx, cy, big); return; }
    const s = big ? 1.5 : 1;
    this.disc(cx, cy + 2, 6 * s, "#0a071440");
    this.disc(cx, cy - 2 * s, 6 * s, "#565663");
    this.disc(cx - 2 * s, cy - 1 * s, 4 * s, "#6a6a77");
    this.disc(cx + 2 * s, cy, 3.5 * s, "#474753");
    this.rect(cx - 6 * s, cy + 1 * s, 12 * s, 2 * s, "#38384352");
    this.disc(cx - 2 * s, cy - 4 * s, 1.5 * s, "#8a8a97");   // highlight
    if (biome === "woodland" || biome === "marsh") {         // a mossy cap (teal-ish in the marsh)
      const g = this.curRing.palette.grass;
      this.disc(cx - 2 * s, cy - 4 * s, 4 * s, shade(g, 0.05)); this.disc(cx + 2.5 * s, cy - 3 * s, 2.5 * s, g);
    } else if (biome === "winter" || biome === "aurora") {   // a snow cap
      this.disc(cx - 1 * s, cy - 5 * s, 4.4 * s, "#eef6ff"); this.disc(cx + 2.5 * s, cy - 3.5 * s, 2.6 * s, "#dce8f6");
    } else if (biome === "coast") {                          // barnacles + a pink coral tuft
      this.disc(cx + 2 * s, cy - 1 * s, 1.2 * s, "#e8e0d0"); this.disc(cx - 3 * s, cy - 1 * s, 1 * s, "#e8e0d0");
      this.rect(cx - 1 * s, cy - 8 * s, 1.4, 4 * s, "#ff8fae"); this.disc(cx - 0.4 * s, cy - 8 * s, 1.4 * s, "#ff8fae");
    } else if (biome === "autumn") {                         // a few fallen leaves
      this.disc(cx - 4 * s, cy + 2 * s, 1.2, "#d24a2a"); this.disc(cx + 4 * s, cy + 1.5 * s, 1.2, "#e8a83a");
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
  // ---- per-biome blooms (each biome its own flower; default = the cheerful pastal bloom) ----
  private drawIceLotus(cx: number, cy: number) {          // winter: pale crystalline star + cold glow
    const c = "#bfe6ff", hi = "#eaf7ff";
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * (TAU / 6); this.triY(cx + Math.cos(a) * 1.2, cy - 6 + Math.sin(a) * 1.2, 1.4, 3.2, i % 2 ? c : hi); }
    const pulse = this.reduce ? 0.7 : 0.6 + 0.4 * Math.sin(this.t * 1.8 + cx);
    this.glow(cx, cy - 5, 6, c, (0.1 + 0.26 * this.nightAmt) * pulse + 0.06); this.disc(cx, cy - 5, 1.2, "#ffffff");
  }
  private drawHibiscus(cx: number, cy: number, c: string) {   // tropical: bold 5-petal bloom + stamen
    const col = mix(c, "#ff5a6a", 0.4);
    this.rect(cx, cy - 4, 1, 5, "#2f8a4a");
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * (TAU / 5); this.fillEll(cx + Math.cos(a) * 2.6, cy - 6 + Math.sin(a) * 2.6, 2.6, 1.8, col); }
    this.disc(cx, cy - 6, 1.4, "#ffe27a"); this.rect(cx - 0.4, cy - 10, 0.8, 3, "#ffd24a"); this.disc(cx, cy - 10, 0.9, "#ff9a3c");
  }
  private drawBogBloom(cx: number, cy: number) {          // marsh: drooping violet bell, glowing lip
    const c = mix(this.curRing.palette.accent, "#c85cff", 0.5);
    this.rect(cx, cy - 6, 1, 7, "#2c6656");
    this.fillEll(cx, cy - 7, 2.6, 3.2, shade(c, -0.2)); this.fillEll(cx, cy - 6, 2.4, 2, c);
    this.neonEllipse(cx, cy - 5, 2.4, 1, c, 3, 0.9, 0.5 + 0.4 * this.nightAmt, 0, Math.PI);
    this.glow(cx, cy - 6, 5, c, 0.1 + 0.22 * this.nightAmt);
  }
  private drawCactusBloom(cx: number, cy: number) {       // desert: barrel cactus + night-bloom
    const g = "#4a8a4a", gd = "#3a6a3a";
    this.disc(cx, cy + 1, 3, "#0a071438");
    this.rect(cx - 2.4, cy - 8, 4.8, 9, gd); this.fillEll(cx, cy - 8, 2.6, 3, g);
    for (let i = -1; i <= 1; i++) this.rect(cx + i * 1.6, cy - 7, 0.5, 7, shade(g, 0.2));   // ribs
    const pulse = this.reduce ? 0.8 : 0.6 + 0.4 * Math.sin(this.t * 2 + cx);
    this.disc(cx, cy - 9, 1.6, "#ff8fbf"); this.glow(cx, cy - 9, 5, "#ff8fbf", (0.12 + 0.24 * this.nightAmt) * pulse);
  }
  private drawCrystalBloom(cx: number, cy: number, c: string) {   // canyon: a geode sprouting a shard
    this.fillEll(cx, cy - 1, 3, 2, "#7a4030"); this.fillEll(cx, cy - 1, 2, 1.3, shade(c, -0.2));
    this.triY(cx, cy - 8, 1.4, 7, c); this.rect(cx - 0.4, cy - 8, 0.8, 7, mix(c, "#fff", 0.5));
    this.glow(cx, cy - 5, 5, c, 0.1 + 0.22 * this.nightAmt);
  }
  private drawFlower(cx: number, cy: number, c: string) {
    const biome = this.curRing.biome;
    if (biome === "ember") { this.drawEmberPoppy(cx, cy); return; }
    if (biome === "winter" || biome === "aurora") { this.drawIceLotus(cx, cy); return; }
    if (biome === "tropical") { this.drawHibiscus(cx, cy, c); return; }
    if (biome === "marsh") { this.drawBogBloom(cx, cy); return; }
    if (biome === "desert") { this.drawCactusBloom(cx, cy); return; }
    if (biome === "canyon") { this.drawCrystalBloom(cx, cy, c); return; }
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
    if (this.curRing.biome === "ember") { this.drawLavaPool(cx, cy, r); return; }
    if (this.curRing.biome === "marsh") { this.drawBogWater(cx, cy, r); return; }
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
    if (this.curRing.biome === "tropical") this.drawLilyPads(cx, cy, r);   // lagoon lily-pads
  }

  // ---- groundcover (Phase J3): a static, deterministic scatter of tiny ground details
  //      (tufts/clover/pebbles · snow drifts/sparkles · sand pebbles/ripples · ash specks/
  //      embers) so no biome floor is a flat bald colour. World-space, culled + zoom-aware. ----
  // A decorative motif tiled over the home ground (Style Studio patterns). World-anchored,
  // clipped to the land, tinted by the current style's palette.
  private drawGroundPattern(scx: number, scy: number, R: number) {
    const b = this.b, s = this.SS, pal = this.curRing.palette, pat = this.spacePattern;
    const rad = R - 24, step = 44, tint = shade(pal.land, 0.12), acc = pal.accent;
    b.save(); b.beginPath(); b.arc(scx * s, scy * s, rad * s, 0, TAU); b.clip();
    if (pat === "checker") {
      b.fillStyle = hexA(tint, 0.55);
      for (let wy = -rad; wy < rad; wy += step) for (let wx = -rad; wx < rad; wx += step)
        if (((Math.round(wx / step) + Math.round(wy / step)) & 1) === 0) b.fillRect((scx + wx) * s, (scy + wy) * s, step * s, step * s);
    } else if (pat === "grid") {
      b.strokeStyle = hexA(acc, 0.14); b.lineWidth = 1.4 * s;
      for (let wy = -rad; wy < rad; wy += step) { const y = (scy + wy) * s; b.beginPath(); b.moveTo((scx - rad) * s, y); b.lineTo((scx + rad) * s, y); b.stroke(); }
      for (let wx = -rad; wx < rad; wx += step) { const x = (scx + wx) * s; b.beginPath(); b.moveTo(x, (scy - rad) * s); b.lineTo(x, (scy + rad) * s); b.stroke(); }
    } else if (pat === "stripes") {
      b.fillStyle = hexA(tint, 0.5);
      for (let wy = -rad; wy < rad; wy += step) if ((Math.round(wy / step) & 1) === 0) b.fillRect((scx - rad) * s, (scy + wy) * s, 2 * rad * s, step * 0.5 * s);
    } else if (pat === "dots" || pat === "petals") {
      for (let wy = -rad; wy < rad; wy += step) for (let wx = -rad; wx < rad; wx += step) {
        const x = (scx + wx + step / 2) * s, y = (scy + wy + step / 2) * s;
        if (pat === "dots") { b.fillStyle = hexA(acc, 0.18); b.beginPath(); b.arc(x, y, 3.2 * s, 0, TAU); b.fill(); }
        else { b.fillStyle = hexA(acc, 0.15); for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; b.beginPath(); b.ellipse(x + Math.cos(a) * 3 * s, y + Math.sin(a) * 3 * s, 2 * s, 1.1 * s, a, 0, TAU); b.fill(); } }
      }
    } else if (pat === "waves") {
      b.strokeStyle = hexA(acc, 0.13); b.lineWidth = 1.5 * s;
      for (let wy = -rad; wy < rad; wy += step * 0.7) { b.beginPath(); for (let wx = -rad; wx <= rad; wx += 6) { const xx = (scx + wx) * s, yy = (scy + wy + Math.sin((wx + wy) / 20) * 4) * s; if (wx === -rad) b.moveTo(xx, yy); else b.lineTo(xx, yy); } b.stroke(); }
    } else if (pat === "stars") {
      b.fillStyle = hexA(acc, 0.5);
      for (let wy = -rad; wy < rad; wy += step) for (let wx = -rad; wx < rad; wx += step) {
        const jx = (Math.abs(wx * 73 ^ wy * 91) % step) - step / 2, jy = (Math.abs(wx * 13 ^ wy * 57) % step) - step / 2;
        b.beginPath(); b.arc((scx + wx + jx) * s, (scy + wy + jy) * s, 1.2 * s, 0, TAU); b.fill();
      }
    }
    b.restore();
  }
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
  // Festival call-and-response banner — centred below the header while a Commons Festival runs.
  private drawFestivalHud(it: number) {
    const f = this.festival!; const def = EMOTE_BY_ID[f.call];
    const cx = this.LW / 2, y = it + 26, w = 158;
    this.rect(cx - w / 2, y - 12, w, 40, "#160f2ed9"); this.rect(cx - w / 2, y - 12, w, 1, "#ffd24a55");
    this.q(cx, y - 7, "🎉 FESTIVAL — MATCH THE CALL", "#ffd7a0", 0.66, "c", true);
    this.q(cx, y + 4, `${(def?.label ?? f.call).toUpperCase()}!`, "#fff2c8", 1.25, "c", true);
    // countdown for the current call
    const cw = w - 22, cf = Math.round(cw * Math.max(0, Math.min(1, f.callT / f.window)));
    this.rect(cx - cw / 2, y + 17, cw, 2.5, "#0a0714aa"); if (cf > 0) this.rect(cx - cw / 2, y + 17, cf, 2.5, "#ffb454");
    // the shared meter
    const mf = Math.round(cw * Math.min(1, f.meter / f.goal));
    this.rect(cx - cw / 2, y + 22, cw, 4, "#0a0714aa"); if (mf > 0) { this.rect(cx - cw / 2, y + 22, mf, 4, "#35e0d0"); this.rect(cx - cw / 2, y + 22, mf, 1, "#bafff2"); }
  }
  private drawHud() {
    const it = this.itop(), ib = this.ibot();
    // top row (below the floating header): online (left, tap → who's here) · sparks (right)
    this.ring(9, it + 6, 3, "#33e650", 1.3); this.q(15, it + 2, `${this.stats.online}`, "#c2fbe0", 1, "l");
    this.q(15 + this.textWidth(`${this.stats.online}`, 1) + 3, it + 2, "▾", "#7fe0b0", 0.8, "l", false, 0.7);
    this.q(this.LW - 4, it + 2, `${this.stats.sparks} SPARQS`, "#ffc46b", 1, "r", true);

    this.drawQuestTracker(it);
    this.drawMinimap(it);
    if (this.festival) this.drawFestivalHud(it);

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
                      : this.near.t === "ride" ? `Ride ${this.near.label || "the ride"}`
                      : this.near.t === "gathering" ? (this.festival ? "Join the festival" : "Raise a festival")
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
