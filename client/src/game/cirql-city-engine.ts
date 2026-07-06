// CIRQL CITY — the flagship (Phase B: deep game).
//
// A SNES-style side-scroller where you revive a drained Main Street by running and
// jumping through it: bonk shop signs to light them, stomp BLANDCO's grey drones,
// grab a Spark perk, collect Cirql Coins, and reach the marquee to "CLOSE THE CIRQL".
//
// Phase B turns the single feel-slice into a whole game: an OVERWORLD MAP of five
// districts (choose where to go — "worlds within worlds"), each a run of levels that
// ends in a BLANDCO BOSS, with SAVE/RESUME so you keep your unlocks and never
// restart from the top. Levels are data-driven (see cirql-city-levels.ts); the
// player physics, camera, juice and neon-sweep finale are unchanged — it felt great.
//
// Built on RetroEngine (256×224, SNES-native): scrolling camera, tilemap and parallax
// all live at this subclass level — no base-engine changes.

import { RetroEngine, shade, mix, type RetroHooks } from "./retro-engine";
import { loadAvatarLS, type AvatarConfig } from "./avatar";
import { MusicKit, MAIN_STREET_THEME } from "./musickit";
import { DISTRICTS, buildLevel, TILE, GROUND_ROW, LEVEL_H, type BuiltLevel, type DistrictDef, type LevelDef } from "./cirql-city-levels";
import { loadProgress, saveProgress, type CityProgress } from "./cirql-city-save";
import { buildTown, TT, TOWN_W, TOWN_H, TOP_B, BOT_B, type BuiltTown, type TownDoor } from "./cirql-city-town";

const SHOP_ACCENTS = ["#ff8a3d", "#ff5d7d", "#3bb6ff", "#ffd24a", "#33e650", "#b79bff"];
const SHOP_NAMES = ["CAFE", "SLCE", "WASH", "SWTS", "MKT", "RECS", "DELI", "BOOK"];

// physics — tuned for an expressive, forgiving, SNES-ish feel (unchanged from the slice)
const GRAV = 620;
const JUMP_V = -212;
const JUMP_SUSTAIN = 300;
const MAX_SUSTAIN = 0.28;
const WALK = 74, RUN = 120;
const ACCEL = 640, FRICTION = 760, AIR_ACCEL = 440;
const COYOTE = 0.09, BUFFER = 0.11;
const GLIDE_FALL = 42;

interface Shop { x: number; y: number; lit: boolean; accent: string; name: string }
interface Coin { x: number; y: number; got: boolean }
interface Perk { x: number; y: number; got: boolean }
interface Bot { x: number; y: number; vx: number; dead: boolean; t: number }
interface Cust { x: number; y: number; vx: number; body: string; t: number }
interface Boss { x: number; y: number; w: number; h: number; vx: number; hp: number; maxHp: number; t: number; hurt: number; dead: boolean; charge: number; deadT: number }

type State = "map" | "play" | "cirql" | "clear" | "over";
type Mode = "town" | "run";

export class CirqlCityEngine extends RetroEngine {
  private hero: AvatarConfig;
  private cam = 0;
  private worldW = 0;

  // ---- top-down town hub ----
  private mode: Mode = "town";
  private town: BuiltTown;
  private tcamX = 0; private tcamY = 0;
  private tvx = 0; private tvy = 0;                 // town walk velocity
  private tface = 1;                                // -1/1 facing for the avatar
  private tWalk = 0;                                // walk-cycle phase
  private nearDoor: TownDoor | null = null;
  private townT = 0;
  private readonly tpw = 10; private readonly tph = 8;   // top-down footprint
  private townShopBiz: (string | undefined)[] = [];      // real visited-business name per town shop

  // progress / place in the game
  private progress: CityProgress;
  private di = 0;                 // district index
  private li = 0;                 // level index within district

  // player (hx/hy = collision-box top-left; NOT px/py — inherited draw methods)
  private hx = 0; private hy = 0;
  private readonly pw = 10; private readonly ph = 13;
  private vx = 0; private vy = 0;
  private onGround = false; private facing = 1;
  private coyote = 0; private buffer = 0; private sustain = 0; private jumpHeld = false;
  private squash = 0; private runBob = 0; private landDust = 0;
  private glideMeter = 0; private gliding = false;

  // world (rebuilt per level)
  private solids: Uint8Array[] = [];
  private W = 0; private readonly H = LEVEL_H;
  private shops: Shop[] = [];
  private coins: Coin[] = [];
  private perks: Perk[] = [];
  private bots: Bot[] = [];
  private custs: Cust[] = [];
  private boss: Boss | null = null;
  private finishX = 0;
  private spawnX = 0; private spawnY = 0;

  // run state
  private state: State = "map";
  private sparks = 0; private gotCoins = 0; private stomps = 0;
  private tPlay = 0; private sweepX = 0; private cirqlT = 0; private score = 0;
  private best = 0; private died = false;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, 256, 224);
    this.hero = loadAvatarLS();
    this.music = new MusicKit();
    this.progress = loadProgress();
    this.best = this.progress.best;
    // build a placeholder level so the side-scroller render never touches an empty grid
    this.loadLevel(0, 0, false);
    // the walkable town is the front door
    this.town = buildTown();
    this.mode = "town";
    this.placeInTown(this.town.spawnTx, this.town.spawnTy);
    this.running = true;           // self-run so the town animates & takes input
    this.emit();
  }

  protected onGesture() { this.music?.play(MAIN_STREET_THEME); this.music?.setIntensity(0.4); }

  // ---------- progress helpers ----------
  private district(i = this.di): DistrictDef { return DISTRICTS[i]; }
  private level(i = this.li): LevelDef { return this.district().levels[i]; }
  private isUnlocked(i: number) { return this.progress.unlocked.includes(DISTRICTS[i].key); }
  private lastUnlockedIndex() { let n = 0; for (let i = 0; i < DISTRICTS.length; i++) if (this.isUnlocked(i)) n = i; return n; }
  private clearedCount(di: number) { const d = DISTRICTS[di]; return d.levels.filter((l) => this.progress.cleared.includes(l.key)).length; }
  private firstUncleared(di: number) { const d = DISTRICTS[di]; for (let i = 0; i < d.levels.length; i++) if (!this.progress.cleared.includes(d.levels[i].key)) return i; return 0; }

  /** Re-apply progress that arrived from the server after construction. */
  applyProgress(p: CityProgress) {
    this.progress = { ...p };
    this.best = Math.max(this.best, p.best);
    this.emit();
  }

  /** Personalize the town: name shop fronts after the real businesses this player
   * has actually tapped (café sign becomes "Maria's Taqueria", etc). Display-only. */
  applyBusinesses(names: string[]) {
    const clean = Array.from(new Set((names || []).map((n) => n.trim()).filter(Boolean))).slice(0, this.town.shops.length);
    this.townShopBiz = this.town.shops.map((_, i) => clean[i]);
    this.emit();
  }
  private shopIndexForDoor(d: TownDoor): number {
    return this.town.shops.findIndex((s) => s.cx === d.tx && ((d.ty === TOP_B && s.side === "top") || (d.ty === BOT_B - 1 && s.side === "bottom")));
  }
  private townLabel(i: number, fallback: string): string {
    const n = i >= 0 ? this.townShopBiz[i] : undefined;
    if (!n) return fallback;
    return n.length > 12 ? n.slice(0, 11) + "." : n;
  }

  // ---------- level building ----------
  private loadLevel(di: number, li: number, resetRun: boolean) {
    this.di = di; this.li = li;
    const lv = this.level();
    const b: BuiltLevel = buildLevel(lv);
    this.W = b.W; this.worldW = b.W * TILE;
    this.solids = b.solids;
    this.shops = b.shops.map((s, i) => ({ x: s.tx * TILE, y: s.ty * TILE, lit: false, accent: SHOP_ACCENTS[i % SHOP_ACCENTS.length], name: SHOP_NAMES[i % SHOP_NAMES.length] }));
    this.coins = b.coins.map((c) => ({ x: c.x, y: c.y, got: false }));
    this.perks = b.perks.map((p) => ({ x: p.x, y: p.y, got: false }));
    this.bots = b.bots.map((bt) => ({ x: bt.tx * TILE, y: bt.ty * TILE, vx: bt.speed, dead: false, t: 0 }));
    this.custs = [];
    this.finishX = b.finishTx * TILE;
    this.spawnX = b.spawnTx * TILE; this.spawnY = (GROUND_ROW - 1) * TILE;
    this.boss = null;
    if (b.boss) {
      const maxHp = 3 + Math.round(this.district().accent === "#ffd24a" ? 2 : this.di); // CEO tankier
      this.boss = { x: b.boss.tx * TILE, y: GROUND_ROW * TILE - 24, w: 24, h: 24, vx: 30 + this.di * 6, hp: maxHp, maxHp, t: 0, hurt: 0, dead: false, charge: 0, deadT: 0 };
    }
    if (resetRun) { this.sparks = this.gotCoins = this.stomps = 0; this.died = false; this.glideMeter = 0; this.tPlay = 0; this.clearFx(); }
    this.resetPlayer();
  }

  private resetPlayer() { this.hx = this.spawnX; this.hy = this.spawnY; this.vx = this.vy = 0; this.onGround = false; this.facing = 1; this.cam = 0; }

  private startLevel() {
    this.loadLevel(this.di, this.li, true);
    this.state = "play";
    this.music?.setIntensity(this.level().boss ? 0.9 : 0.7);
    this.emit();
  }

  private enterDistrict(di: number) {
    if (!this.isUnlocked(di)) { this.tone(140, 0.1, "square", 0.05); return; }
    this.mode = "run"; this.di = di; this.li = this.firstUncleared(di);
    this.startLevel();
    this.tone(523, 0.06, "square", 0.05); this.tone(784, 0.1, "square", 0.05);
  }

  /** Return from a district run to the town, standing at that district's gate. */
  private returnToTown(gateIndex: number) {
    this.mode = "town"; this.clearFx();
    const g = this.town.gates.find((x) => x.index === gateIndex) || this.town.gates[0];
    this.placeInTown(g.cx, TOP_B + 1); this.tface = 1;
    this.music?.setIntensity(0.4);
    this.emit();
  }
  private placeInTown(tx: number, ty: number) { this.hx = tx * TT + (TT - this.tpw) / 2; this.hy = ty * TT + (TT - this.tph) / 2; this.tvx = this.tvy = 0; }

  protected onStart() { if (this.mode === "town") { if (this.nearDoor) this.triggerDoor(this.nearDoor); } else this.startLevel(); }
  protected onMenu() { this.returnToTown(this.di); }

  private emit() {
    this.hooks.onHud?.({
      mode: this.mode, state: this.state, district: this.district().name, level: this.level().name,
      sparks: this.sparks, shopsTotal: this.shops.length, coins: this.gotCoins, coinsTotal: this.coins.length,
      glide: this.glideMeter, best: this.best, score: this.score, totalCoins: this.progress.coins,
      near: this.nearDoor ? { kind: this.nearDoor.kind, label: this.nearDoor.label } : null,
      boss: this.boss ? { hp: this.boss.hp, maxHp: this.boss.maxHp } : null,
    });
  }

  // ---------- collision ----------
  private solidAt(wx: number, wy: number): boolean {
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    if (tx < 0 || ty < 0 || ty >= this.H || tx >= this.W) return false;
    return this.solids[ty][tx] === 1;
  }
  private boxHits(x: number, y: number): boolean {
    return this.solidAt(x, y) || this.solidAt(x + this.pw - 1, y) || this.solidAt(x, y + this.ph - 1) || this.solidAt(x + this.pw - 1, y + this.ph - 1) || this.solidAt(x + this.pw / 2, y + this.ph - 1);
  }

  protected update(dt: number) {
    if (this.mode === "town") { this.updateTown(dt); return; }
    if (this.state === "clear") { this.tPlay += dt; if (this.pressed.a) this.advanceFromClear(); return; }
    if (this.state === "over") { this.tPlay += dt; if (this.pressed.a) this.startLevel(); else if (this.pressed.b) this.returnToTown(this.di); return; }
    if (this.state === "cirql") { this.updateCirql(dt); return; }
    // ---- play ----
    this.tPlay += dt;

    const dir = (this.btn.right ? 1 : 0) - (this.btn.left ? 1 : 0);
    const target = dir * (this.btn.b ? RUN : WALK);
    const a = this.onGround ? (dir !== 0 ? ACCEL : FRICTION) : AIR_ACCEL;
    if (dir !== 0) this.facing = dir;
    if (this.vx < target) this.vx = Math.min(target, this.vx + a * dt);
    else if (this.vx > target) this.vx = Math.max(target, this.vx - a * dt);

    if (this.pressed.a) this.buffer = BUFFER;
    this.buffer = Math.max(0, this.buffer - dt);
    this.coyote = this.onGround ? COYOTE : Math.max(0, this.coyote - dt);
    if (this.buffer > 0 && this.coyote > 0) {
      this.vy = JUMP_V; this.sustain = MAX_SUSTAIN; this.jumpHeld = true; this.buffer = this.coyote = 0; this.onGround = false; this.squash = -1;
      this.tone(360, 0.08, "square", 0.05); this.buzz(8);
    }
    if (!this.btn.a) this.jumpHeld = false;
    this.gliding = false;
    if (!this.onGround && this.vy > 0 && this.btn.a && this.glideMeter > 0) { this.gliding = true; this.glideMeter = Math.max(0, this.glideMeter - dt); if (this.vy > GLIDE_FALL) this.vy = GLIDE_FALL; }
    if (this.jumpHeld && this.vy < 0 && this.sustain > 0) { this.vy += (GRAV - JUMP_SUSTAIN) * dt; this.sustain -= dt; }
    else this.vy += GRAV * dt;
    if (this.vy > 340) this.vy = 340;

    let nx = this.hx + this.vx * dt;
    if (this.boxHits(nx, this.hy)) { const step = this.vx > 0 ? 1 : -1; while (!this.boxHits(this.hx + step, this.hy) && Math.abs(this.hx - nx) > 0.5) this.hx += step; this.vx = 0; nx = this.hx; }
    this.hx = nx;
    const wasAir = !this.onGround; this.onGround = false;
    let ny = this.hy + this.vy * dt;
    if (this.boxHits(this.hx, ny)) {
      const step = this.vy > 0 ? 1 : -1;
      while (!this.boxHits(this.hx, this.hy + step) && Math.abs(this.hy - ny) > 0.5) this.hy += step;
      if (this.vy > 0) { this.onGround = true; if (wasAir && this.vy > 150) { this.squash = 1; this.landDust = 1; this.addShake(this.vy > 280 ? 1.4 : 0.7); this.noise(0.05, 0.03); } }
      this.vy = 0; ny = this.hy;
    }
    this.hy = ny;

    if (this.vy < 0) this.bonkSigns();

    if (this.hx < 0) { this.hx = 0; this.vx = 0; }
    if (this.hx + this.pw > this.worldW) { this.hx = this.worldW - this.pw; this.vx = 0; }
    if (this.hy > this.H * TILE + 30) { this.die(); return; }

    this.squash += (0 - this.squash) * Math.min(1, dt * 14);
    this.runBob = this.onGround && Math.abs(this.vx) > 20 ? this.runBob + dt * Math.abs(this.vx) * 0.09 : 0;
    this.landDust = Math.max(0, this.landDust - dt * 4);

    this.pickups(); this.updateBots(dt); if (this.boss) this.updateBoss(dt); this.updateCam(dt);
    if (!this.level().boss && this.hx + this.pw > this.finishX && this.state === "play") this.startCirql();
    this.emit();
  }

  // ---------- top-down town hub ----------
  private townSolidAt(wx: number, wy: number): boolean {
    const tx = Math.floor(wx / TT), ty = Math.floor(wy / TT);
    if (tx < 0 || ty < 0 || tx >= this.town.W || ty >= this.town.H) return true;
    return this.town.solids[ty][tx] === 1;
  }
  private townBoxHits(x: number, y: number): boolean {
    return this.townSolidAt(x, y) || this.townSolidAt(x + this.tpw - 1, y) || this.townSolidAt(x, y + this.tph - 1) || this.townSolidAt(x + this.tpw - 1, y + this.tph - 1);
  }

  private updateTown(dt: number) {
    this.townT += dt;
    const dx = (this.btn.right ? 1 : 0) - (this.btn.left ? 1 : 0);
    const dy = (this.btn.down ? 1 : 0) - (this.btn.up ? 1 : 0);
    const spd = this.btn.b ? 118 : 74;
    let tvx = dx * spd, tvy = dy * spd;
    if (dx !== 0 && dy !== 0) { tvx *= 0.707; tvy *= 0.707; }
    this.tvx += (tvx - this.tvx) * Math.min(1, dt * 16);
    this.tvy += (tvy - this.tvy) * Math.min(1, dt * 16);
    if (dx !== 0) this.tface = dx;

    let nx = this.hx + this.tvx * dt;
    if (this.townBoxHits(nx, this.hy)) { const s = this.tvx > 0 ? 1 : -1; while (!this.townBoxHits(this.hx + s, this.hy) && Math.abs(this.hx - nx) > 0.5) this.hx += s; this.tvx = 0; nx = this.hx; }
    this.hx = nx;
    let ny = this.hy + this.tvy * dt;
    if (this.townBoxHits(this.hx, ny)) { const s = this.tvy > 0 ? 1 : -1; while (!this.townBoxHits(this.hx, this.hy + s) && Math.abs(this.hy - ny) > 0.5) this.hy += s; this.tvy = 0; ny = this.hy; }
    this.hy = ny;
    this.tWalk = (Math.abs(this.tvx) + Math.abs(this.tvy)) > 6 ? this.tWalk + dt * 10 : 0;

    // nearest interactable door
    const cx = this.hx + this.tpw / 2, cy = this.hy + this.tph / 2;
    let best: TownDoor | null = null, bd = 1e9;
    for (const d of this.town.doors) {
      const ddx = (d.tx + 0.5) * TT - cx, ddy = (d.ty + 0.5) * TT - cy, dist = ddx * ddx + ddy * ddy;
      if (dist < 22 * 22 && dist < bd) { bd = dist; best = d; }
    }
    this.nearDoor = best;

    // gate auto-enter: walking north into an unlocked channel
    if (cy < TOP_B * TT) { const g = this.town.gates.find((gg) => Math.abs((gg.cx + 0.5) * TT - cx) < TT); if (g) { if (this.isUnlocked(g.index)) this.enterDistrict(g.index); else { this.placeInTown(g.cx, TOP_B + 1); this.tone(140, 0.1, "square", 0.05); } return; } }

    if (this.pressed.a && this.nearDoor) this.triggerDoor(this.nearDoor);

    // camera follows, clamped to town bounds
    const tw = this.town.W * TT, th = this.town.H * TT;
    this.tcamX += (Math.max(0, Math.min(tw - this.LW, cx - this.LW / 2)) - this.tcamX) * Math.min(1, dt * 8);
    this.tcamY += (Math.max(0, Math.min(th - this.LH, cy - this.LH / 2)) - this.tcamY) * Math.min(1, dt * 8);
    if (th <= this.LH) this.tcamY = (th - this.LH) / 2;
    this.emit();
  }

  private triggerDoor(d: TownDoor) {
    if (d.kind === "shop" && d.route) { this.tone(660, 0.06, "square", 0.05); this.tone(990, 0.1, "square", 0.05); this.hooks.onEnterShop?.(d.route); }
    else if (d.kind === "gate" && d.index != null) { if (this.isUnlocked(d.index)) this.enterDistrict(d.index); else this.tone(140, 0.1, "square", 0.05); }
  }

  private overlapSign(s: Shop): boolean { return this.hx + this.pw > s.x && this.hx < s.x + TILE && this.hy < s.y + TILE && this.hy + this.ph > s.y; }
  private bonkSigns() { for (const s of this.shops) if (!s.lit && this.overlapSign(s)) this.lightShop(s); }
  private lightShop(s: Shop) {
    s.lit = true; this.sparks++;
    this.fxBurst(s.x + TILE / 2, s.y + TILE / 2, s.accent, 16, 120); this.fxRing(s.x + TILE / 2, s.y + TILE / 2, s.accent, 22); this.fxPop(s.x + TILE / 2, s.y - 4, "+100", s.accent, 1);
    this.addShake(0.8); this.hitstop(0.04); this.tone(520, 0.06, "square", 0.05); this.tone(780, 0.09, "square", 0.04); this.buzz(12);
    this.music?.setIntensity(Math.min(1, 0.7 + this.sparks * 0.03));
  }

  private pickups() {
    const cx = this.hx + this.pw / 2, cy = this.hy + this.ph / 2;
    for (const c of this.coins) if (!c.got && Math.abs(c.x - cx) < 11 && Math.abs(c.y - cy) < 12) { c.got = true; this.gotCoins++; this.fxBurst(c.x, c.y, "#ffd24a", 10, 90); this.fxPop(c.x, c.y - 4, "COIN", "#ffd24a", 1); this.tone(880, 0.05, "square", 0.05); this.tone(1174, 0.07, "square", 0.04); this.buzz(8); }
    for (const p of this.perks) if (!p.got && Math.abs(p.x - cx) < 12 && Math.abs(p.y - cy) < 13) { p.got = true; this.glideMeter = 4; this.fxBurst(p.x, p.y, "#7be0ff", 20, 130); this.fxRing(p.x, p.y, "#7be0ff", 20); this.fxPop(p.x, p.y - 6, "GLIDE!", "#7be0ff", 1); this.addShake(1); this.hitstop(0.05); this.tone(440, 0.05, "square", .05); this.tone(660, 0.05, "square", .05); this.tone(880, 0.12, "square", .05); }
  }

  private updateBots(dt: number) {
    for (const b of this.bots) {
      if (b.dead) { b.t += dt; continue; }
      b.t += dt;
      const nx = b.x + b.vx * dt;
      const footAhead = this.solidAt(nx + (b.vx > 0 ? TILE : 0), b.y + TILE + 2);
      const wallAhead = this.solidAt(nx + (b.vx > 0 ? TILE - 1 : 0), b.y + TILE / 2);
      if (!footAhead || wallAhead) b.vx = -b.vx; else b.x = nx;
      if (!this.solidAt(b.x + TILE / 2, b.y + TILE + 1)) b.y += 80 * dt;
      if (this.hx + this.pw > b.x + 2 && this.hx < b.x + TILE - 2 && this.hy + this.ph > b.y + 2 && this.hy < b.y + TILE) {
        if (this.vy > 40 && this.hy + this.ph < b.y + TILE * 0.7) {
          b.dead = true; b.t = 0; this.stomps++; this.vy = JUMP_V * 0.72; this.buffer = 0;
          this.fxBurst(b.x + TILE / 2, b.y + TILE / 2, "#9aa4b8", 14, 110); this.fxPop(b.x + TILE / 2, b.y - 4, "BONK!", "#c2c3c7", 1);
          this.addShake(1.1); this.hitstop(0.05); this.noise(0.06, 0.05); this.tone(300, 0.08, "square", 0.05); this.buzz(14);
        } else if (this.state === "play") { this.die(); return; }
      }
    }
  }

  // ---------- BLANDCO boss ----------
  private updateBoss(dt: number) {
    const bo = this.boss!;
    if (bo.dead) { bo.deadT += dt; return; }
    bo.t += dt; bo.hurt = Math.max(0, bo.hurt - dt);
    // charge telegraph: wind up then lunge toward the player
    bo.charge -= dt;
    if (bo.charge <= -1.6) { bo.charge = 0.5; this.tone(180, 0.18, "square", 0.05); }     // start wind-up
    const chargingNow = bo.charge > 0 && bo.charge < 0.5 - 0.28;                            // after wind-up window
    const dirToPlayer = this.hx > bo.x ? 1 : -1;
    let speed = bo.vx;
    if (bo.charge > 0.22) speed = 0;                                                        // freeze during wind-up
    else if (chargingNow) { bo.vx = Math.abs(bo.vx) * dirToPlayer; speed = Math.abs(bo.vx) * 2.4; }
    const nx = bo.x + Math.sign(speed || bo.vx) * Math.abs(speed) * dt * (speed === 0 ? 0 : 1);
    // patrol turn at walls / arena bounds
    if (nx < TILE || nx + bo.w > this.worldW - TILE) bo.vx = -bo.vx; else if (speed !== 0) bo.x = nx;
    // player contact
    const hit = this.hx + this.pw > bo.x + 2 && this.hx < bo.x + bo.w - 2 && this.hy + this.ph > bo.y + 2 && this.hy < bo.y + bo.h;
    if (hit) {
      if (this.vy > 40 && this.hy + this.ph < bo.y + bo.h * 0.55 && bo.hurt <= 0) {
        bo.hp--; bo.hurt = 0.9; this.vy = JUMP_V * 0.85; this.buffer = 0; bo.vx = Math.abs(bo.vx) * -dirToPlayer;
        this.fxBurst(bo.x + bo.w / 2, bo.y + 4, "#ff5d7d", 18, 130); this.fxRing(bo.x + bo.w / 2, bo.y + bo.h / 2, "#ffd24a", 20); this.fxPop(bo.x + bo.w / 2, bo.y - 6, bo.hp > 0 ? "HIT!" : "DOWN!", "#ffd24a", 1);
        this.addShake(1.8); this.hitstop(0.07); this.noise(0.08, 0.06); this.tone(280, 0.12, "square", 0.05); this.buzz(18);
        if (bo.hp <= 0) { bo.dead = true; bo.deadT = 0; this.stomps += 3; this.tone(523, 0.1, "square", .05); this.tone(659, 0.1, "square", .05); this.tone(880, 0.2, "square", .05); this.startCirql(); }
      } else if (bo.hurt <= 0 && this.state === "play") { this.die(); return; }
    }
  }

  private die() { this.died = true; this.state = "over"; this.score = this.tally(); this.addShake(2.4); this.hitstop(0.08); this.noise(0.2, 0.06); this.tone(200, 0.3, "square", 0.05); this.music?.setIntensity(0.2); this.finishRun(); this.emit(); }
  private tally() { return this.sparks * 100 + this.gotCoins * 250 + this.stomps * 60 + (this.died ? 0 : Math.max(0, 600 - Math.floor(this.tPlay * 10))); }

  // ---------- neon-sweep finale ----------
  private startCirql() { this.state = "cirql"; this.cirqlT = 0; this.sweepX = this.cam; this.vx = this.vy = 0; this.music?.setIntensity(1); this.tone(523, 0.1, "square", 0.05); this.tone(659, 0.1, "square", 0.05); this.tone(784, 0.16, "square", 0.05); }
  private updateCirql(dt: number) {
    this.cirqlT += dt;
    const prev = this.sweepX;
    this.sweepX = Math.min(this.worldW, this.sweepX + 150 * dt);
    for (const s of this.shops) if (!s.lit && s.x < this.sweepX) this.lightShop(s);
    if (Math.floor(prev / 26) !== Math.floor(this.sweepX / 26)) {
      this.fxBurst(this.sweepX, 20 + Math.random() * 50, ["#ff5d7d", "#ffd24a", "#3bb6ff", "#33e650"][Math.floor(Math.random() * 4)], 12, 150, 20);
      if (this.custs.length < 40) this.custs.push({ x: this.sweepX - 10 - Math.random() * 20, y: GROUND_ROW * TILE, vx: 10 + Math.random() * 14, body: ["#ff5d7d", "#3bb6ff", "#ffd24a", "#33e650", "#ff77a8"][Math.floor(Math.random() * 5)], t: 0 });
    }
    for (const c of this.custs) { c.x += c.vx * dt; c.t += dt; }
    this.cam += (Math.max(0, Math.min(this.worldW - this.LW, this.sweepX - this.LW * 0.5)) - this.cam) * Math.min(1, dt * 3);
    if (this.cam < 0) this.cam = 0;
    if (this.sweepX >= this.worldW && this.cirqlT > 2.6) this.completeLevel();
    this.emit();
  }

  private completeLevel() {
    this.state = "clear";
    this.tPlay = 0;
    this.score = this.tally();
    const lv = this.level();
    if (!this.progress.cleared.includes(lv.key)) this.progress.cleared.push(lv.key);
    this.progress.coins += this.gotCoins;
    this.progress.bestByLevel[lv.key] = Math.max(this.progress.bestByLevel[lv.key] || 0, this.score);
    if (this.score > this.progress.best) this.progress.best = this.score;
    if (this.score > this.best) this.best = this.score;
    // clearing the boss (last level) unlocks the next district
    if (this.li === this.district().levels.length - 1 && this.di < DISTRICTS.length - 1) {
      const nk = DISTRICTS[this.di + 1].key;
      if (!this.progress.unlocked.includes(nk)) this.progress.unlocked.push(nk);
    }
    saveProgress(this.progress);
    this.finishRun();
    this.emit();
  }

  private advanceFromClear() {
    const wasBoss = this.li === this.district().levels.length - 1;
    if (!wasBoss) { this.li++; this.startLevel(); }
    else this.returnToTown(this.di);
  }

  private finishRun() { if (this.score > this.best) this.best = this.score; this.hooks.onRunEnd?.({ score: this.score, shift: this.sparks, sparks: this.sparks, coins: this.gotCoins, revived: !this.died, district: this.district().key, level: this.level().key }); }

  private updateCam(dt: number) { const lead = this.facing * 26; const target = Math.max(0, Math.min(this.worldW - this.LW, this.hx + this.pw / 2 - this.LW / 2 + lead)); this.cam += (target - this.cam) * Math.min(1, dt * 6); }

  // ---------- render ----------
  protected render() {
    if (this.mode === "town") { this.renderTown(); this.drawFx(); return; }
    const cam = Math.round(this.cam);
    const swept = this.state === "cirql" || (this.state === "clear" && !this.died) ? this.sweepX : -1;
    const vibAt = (wx: number) => (swept < 0 ? 0 : wx < swept ? 1 : 0);
    const overallVib = swept < 0 ? 0 : Math.min(1, this.sweepX / this.worldW);

    this.drawSky(overallVib);
    this.drawParallax(cam, overallVib);
    this.drawTiles(cam, vibAt);
    this.drawShops(cam, vibAt);
    this.drawCoinsPerks(cam);
    this.drawBots(cam);
    if (this.boss) this.drawBoss(cam);
    if (this.custs.length) this.drawCusts(cam);
    if (!this.level().boss) this.drawFinish(cam, vibAt);
    if (this.state !== "over" || !this.died) this.drawPlayer(cam);
    this.drawFx();
    this.drawHudBar();

    if (this.state === "play" && this.tPlay < 2.2) this.drawTitleCard();
    if (this.state === "cirql") this.drawCirqlBanner();
    if (this.state === "clear") this.drawClear();
    if (this.state === "over") this.drawOver();
  }

  private drawSky(v: number) { const [t, bt] = this.district().sky; this.vgrad(0, 0, this.LW, this.LH, mix(t, "#3aa0e0", v), mix(bt, "#bfe8ff", v)); this.disc(210, 34, 12, mix("#ffd9a0", "#fff6d0", v)); }
  private drawParallax(cam: number, v: number) {
    const far = mix("#3a3062", "#7a9ad0", v), ox = -((cam * 0.25) % 64);
    for (let x = ox; x < this.LW; x += 64) { this.rect(x, 120, 26, 60, far); this.rect(x + 30, 100, 20, 80, shade(far, -0.08)); this.rect(x + 52, 128, 14, 52, far); }
    const mid = mix("#4a3f74", "#8a7ad0", v), ox2 = -((cam * 0.5) % 48);
    for (let x = ox2; x < this.LW; x += 48) { this.rect(x, 138, 34, 46, mid); for (let wy = 144; wy < 180; wy += 8) for (let wx = x + 3; wx < x + 30; wx += 8) this.rect(wx, wy, 4, 4, mix("#2a2450", "#ffe9a0", v * 0.8)); }
  }
  private drawTiles(cam: number, vibAt: (x: number) => number) {
    const t0 = Math.floor(cam / TILE), t1 = Math.ceil((cam + this.LW) / TILE);
    for (let ty = 0; ty < this.H; ty++) for (let tx = t0; tx <= t1; tx++) {
      if (tx < 0 || tx >= this.W || this.solids[ty][tx] !== 1) continue;
      const sx = tx * TILE - cam, v = vibAt(tx * TILE), base = mix("#4a4560", "#8a90a8", v), isTop = ty === 0 || this.solids[ty - 1]?.[tx] !== 1;
      this.shelf(sx, ty * TILE, TILE, TILE, base);
      if (isTop) { this.rect(sx, ty * TILE, TILE, 3, mix("#6a6a86", "#c8d0e0", v)); this.rect(sx, ty * TILE, TILE, 1, mix("#8a8aa6", "#eef4ff", v)); }
      this.rect(sx, ty * TILE + 8, TILE, 1, shade(base, -0.25));
    }
  }
  private drawShops(cam: number, vibAt: (x: number) => number) {
    const groundY = GROUND_ROW * TILE;
    for (const s of this.shops) {
      const sx = s.x - cam; if (sx < -TILE * 3 || sx > this.LW + TILE) continue;
      const lit = s.lit || vibAt(s.x) > 0;
      this.rect(sx - TILE, groundY - 34, TILE * 3, 34, mix("#3a3648", "#e9e2d6", lit ? 0.55 : 0.1));
      this.shelf(sx - TILE, groundY - 34, TILE * 3, 4, lit ? s.accent : "#5a5568");
      this.rect(sx - TILE + 3, groundY - 26, TILE * 3 - 6, 14, lit ? shade(s.accent, 0.4) : "#2a2838");
      this.rect(sx + 2, groundY - 12, 8, 12, lit ? shade(s.accent, -0.2) : "#20202e");
      this.rect(sx + TILE / 2 - 1, s.y + TILE, 2, groundY - 34 - (s.y + TILE), lit ? shade(s.accent, -0.2) : "#3a3648");
      this.shelf(sx, s.y, TILE, TILE, lit ? s.accent : "#5a5568");
      this.rectLine(sx, s.y, TILE, TILE, lit ? shade(s.accent, 0.4) : "#6a6578");
      this.textCenterAt(sx + TILE / 2, s.y + 5, s.name, lit ? "#0a0714" : "#8a8598");
      if (lit) this.ring(sx + TILE / 2, s.y + TILE / 2, 10 + Math.round(Math.sin(this.tPlay * 6) * 1.5), s.accent, 1.4);
    }
  }
  private textCenterAt(cx: number, y: number, s: string, c: string) { this.text(Math.round(cx - this.textWidth(s, 1) / 2), y, s, c, 1, false); }

  private drawCoinsPerks(cam: number) {
    for (const c of this.coins) { if (c.got) continue; const sx = c.x - cam; if (sx < -8 || sx > this.LW + 8) continue; const bob = Math.sin(this.tPlay * 4 + c.x) * 2; this.ring(sx, c.y + bob, 5, "#ffd24a", 1.6); this.disc(sx, c.y + bob, 2, "#ffec9a"); this.px(sx - 1, c.y + bob - 2, "#fff"); }
    for (const p of this.perks) { if (p.got) continue; const sx = p.x - cam; if (sx < -8 || sx > this.LW + 8) continue; const bob = Math.sin(this.tPlay * 5 + p.x) * 2; this.ball(sx, p.y + bob, 6, "#3bb6ff"); this.ring(sx, p.y + bob, 8 + Math.round(Math.sin(this.tPlay * 8) * 1.5), "#7be0ff", 1.2); this.text(sx - 2, p.y + bob - 2, "S", "#fff", 1, false); }
  }
  private drawBots(cam: number) {
    for (const b of this.bots) {
      const sx = b.x - cam; if (sx < -TILE || sx > this.LW + TILE) continue;
      if (b.dead) { if (b.t < 0.5) this.rect(sx + 2, b.y + TILE - 4, TILE - 4, 4, "#5a5568"); continue; }
      this.shelf(sx + 2, b.y + 3, TILE - 4, TILE - 4, "#6a6f82");
      this.rect(sx + 3, b.y + 4, TILE - 6, 3, "#8a90a4");
      const ex = sx + TILE / 2 + (b.vx > 0 ? 2 : -2);
      this.rect(ex - 2, b.y + 7, 5, 3, "#20242e"); this.px(ex + (b.vx > 0 ? 1 : -1), b.y + 8, "#ff4d6d");
      this.rect(sx + 3, b.y + TILE - 1, 3, 2, "#3a3f4c"); this.rect(sx + TILE - 6, b.y + TILE - 1, 3, 2, "#3a3f4c");
    }
  }
  private drawBoss(cam: number) {
    const bo = this.boss!; const sx = bo.x - cam;
    if (bo.dead && bo.deadT > 0.6) return;
    const winding = bo.charge > 0.22;
    const flash = bo.hurt > 0 && Math.floor(bo.hurt * 20) % 2 === 0;
    const body = bo.dead ? "#5a5568" : flash ? "#fff1e8" : winding ? "#ff8a3d" : "#6a6f82";
    const y = bo.y - (bo.dead ? 0 : 0);
    this.shelf(sx + 1, y + 2, bo.w - 2, bo.h - 3, body);
    this.rect(sx + 3, y + 3, bo.w - 6, 4, shade(body, 0.25));
    // menacing eye visor
    const eye = winding ? "#fff1e8" : "#ff4d6d";
    this.rect(sx + 4, y + 9, bo.w - 8, 4, "#141420");
    this.rect(sx + (this.hx > bo.x ? bo.w - 9 : 5), y + 10, 4, 2, eye);
    // BLANDCO badge
    this.textCenterAt(sx + bo.w / 2, y + 16, "BC", flash ? "#141420" : "#c2c3c7");
    // treads
    this.rect(sx + 2, y + bo.h - 2, bo.w - 4, 2, "#3a3f4c");
    // hp pips above
    if (!bo.dead) for (let i = 0; i < bo.maxHp; i++) this.rect(sx + 2 + i * 6, y - 6, 4, 3, i < bo.hp ? "#ff5d7d" : "#3a3648");
  }
  private drawCusts(cam: number) {
    for (const c of this.custs) { const sx = c.x - cam; if (sx < -6 || sx > this.LW + 6) continue; const step = Math.sin(c.t * 10) > 0 ? 1 : 0; this.rect(sx - 1, c.y - 6, 4, 4, c.body); this.px(sx, c.y - 7, "#f4c79a"); this.rect(sx - 1, c.y - 2, 1, 2 + step, shade(c.body, -0.3)); this.rect(sx + 1, c.y - 2, 1, 3 - step, shade(c.body, -0.3)); }
  }
  private drawFinish(cam: number, vibAt: (x: number) => number) {
    const sx = this.finishX - cam; if (sx < -30 || sx > this.LW + 30) return;
    const top = GROUND_ROW * TILE - 60, v = vibAt(this.finishX);
    this.rect(sx + 6, top, 3, 60, "#8a8276");
    this.shelf(sx - 14, top, 40, 16, mix("#5a5568", "#ffd24a", v));
    this.textCenterAt(sx + 6, top + 5, "CIRQL", mix("#c2c3c7", "#0a0714", v));
  }
  private drawPlayer(cam: number) {
    const cx = Math.round(this.hx + this.pw / 2 - cam), feet = Math.round(this.hy + this.ph);
    const bob = this.onGround ? Math.round(Math.sin(this.runBob) * 1.2) : 0;
    if (this.landDust > 0.02 && this.onGround) { const n = Math.round(this.landDust * 4); for (let i = 0; i < n; i++) this.px(cx - 6 + i * 3, feet - 1, "#c8d0e0"); }
    if (this.gliding) { this.ring(cx, feet - 8, 11, "#7be0ff", 1.2); }
    const lean = Math.round(this.facing * Math.min(2, Math.abs(this.vx) / 60));
    this.avatar(cx + lean, feet + bob, this.hero);
    if (this.onGround && Math.abs(this.vx) > 90 && Math.random() < 0.4) this.fxBurst(this.hx + this.pw / 2 - this.facing * 6, this.hy + this.ph - 1, "#7be0ff", 1, 30, 10);
  }

  // ---------- top-down town render ----------
  private renderTown() {
    const camX = Math.round(this.tcamX), camY = Math.round(this.tcamY);
    const revived = this.districtsCleared() / DISTRICTS.length;   // 0..1 → grey dusk to neon
    // ground: sidewalks + road, dusk-to-day as the town revives
    this.vgrad(0, 0, this.LW, this.LH, mix("#1a1630", "#2a3a6a", revived), mix("#241f38", "#3a4a7a", revived));
    const bandY0 = TOP_B * TT - camY, bandY1 = BOT_B * TT - camY;
    // sidewalks
    this.rect(0, bandY0, this.LW, TT, mix("#3a3550", "#8a86a0", revived));
    this.rect(0, bandY1 - TT, this.LW, TT, mix("#3a3550", "#8a86a0", revived));
    // road
    this.rect(0, bandY0 + TT, this.LW, bandY1 - bandY0 - TT * 2, mix("#20202e", "#33384a", revived));
    const midY = Math.round((bandY0 + bandY1) / 2) - 1;
    for (let x = -((camX) % 24); x < this.LW; x += 24) this.rect(x, midY, 12, 2, mix("#4a4560", "#ffd24a", revived * 0.8));

    this.drawTownBuildings(camX, camY, revived);
    this.drawTownGates(camX, camY);
    this.drawTownAvatar(camX, camY);

    // HUD + prompt
    this.rect(0, 0, this.LW, 14, "#0a071488");
    this.textCenter(3, "CIRQL CITY - MAIN STREET", "#ffd24a", 1);
    this.ring(10, 8, 3, "#ffd24a", 1.3); this.text(16, 4, `${this.progress.coins}`, "#fff1e8", 1, false);
    this.text(this.LW - 60, 4, `REVIVED ${this.districtsCleared()}/${DISTRICTS.length}`, "#c2c3c7", 1, false);
    if (this.nearDoor) {
      const shopName = this.nearDoor.kind === "shop" ? this.townLabel(this.shopIndexForDoor(this.nearDoor), this.nearDoor.label) : this.nearDoor.label;
      const label = this.nearDoor.kind === "gate" && !this.isUnlocked(this.nearDoor.index!) ? "LOCKED" : shopName;
      const col = this.nearDoor.kind === "gate" && !this.isUnlocked(this.nearDoor.index!) ? "#ff8a6a" : this.nearDoor.accent;
      const px = Math.round(this.hx + this.tpw / 2 - camX), py = Math.round(this.hy - camY) - 14 + Math.round(Math.sin(this.townT * 6) * 1.5);
      this.textCenterAt(px, py, (this.nearDoor.kind === "gate" ? "> " : "* ") + label, col);
      this.textCenter(this.LH - 12, this.nearDoor.kind === "gate" ? "WALK IN OR PRESS JUMP" : "PRESS JUMP TO PLAY", "#7be0ff", 1);
    } else {
      this.textCenter(this.LH - 12, "MOVE: PAD   ENTER SHOPS + GATES", "#5f574f", 1);
    }
  }
  private districtsCleared() { let n = 0; for (let i = 0; i < DISTRICTS.length; i++) if (this.clearedCount(i) >= DISTRICTS[i].levels.length) n++; return n; }

  private drawTownBuildings(camX: number, camY: number, rev: number) {
    for (let si = 0; si < this.town.shops.length; si++) {
      const s = this.town.shops[si];
      const label = this.townLabel(si, s.label);
      const bx = (s.cx - 2) * TT - camX, bw = TT * 5;
      const top = s.side === "top";
      const by = top ? 0 - camY : BOT_B * TT - camY;
      const bh = top ? TOP_B * TT : (TOWN_H - BOT_B) * TT;
      if (bx > this.LW || bx + bw < 0) continue;
      const wall = mix("#332f47", "#6a6480", rev);
      this.rect(bx, by, bw, bh, wall);
      this.rect(bx, by, bw, 2, shade(wall, 0.3)); this.rect(bx, by + bh - 2, bw, 2, shade(wall, -0.3));
      // windows
      for (let wy = by + 6; wy < by + bh - 10; wy += 10) for (let wx = bx + 4; wx < bx + bw - 4; wx += 8) this.rect(wx, wy, 4, 5, mix("#20202e", "#ffe9a0", rev * 0.7 + 0.1));
      // awning + neon sign on the street-facing edge
      const edgeY = top ? by + bh - 8 : by;
      this.shelf(bx + 2, edgeY, bw - 4, 6, mix("#4a4560", s.accent, 0.5 + rev * 0.5));
      // door
      const doorY = top ? by + bh - 8 : by + 2;
      this.rect(bx + bw / 2 - 4, doorY, 8, 8, shade(s.accent, -0.35));
      this.rectLine(bx + bw / 2 - 4, doorY, 8, 8, s.accent);
      // hanging sign label — the real business name when the player has visited one
      const sy = top ? by + bh + 1 : by - 8;
      this.rect(bx + bw / 2 - this.textWidth(label, 1) / 2 - 2, sy - 1, this.textWidth(label, 1) + 4, 8, "#0a0714c0");
      this.textCenterAt(bx + bw / 2, sy, label, mix("#8a8598", s.accent, 0.4 + rev * 0.6));
    }
  }
  private drawTownGates(camX: number, camY: number) {
    for (const g of this.town.gates) {
      const gx = (g.cx - 1) * TT - camX, gw = TT * 3, gy = 0 - camY, gh = TOP_B * TT;
      if (gx > this.LW || gx + gw < 0) continue;
      const d = DISTRICTS[g.index]; const unlocked = this.isUnlocked(g.index);
      const done = this.clearedCount(g.index) >= d.levels.length;
      // arch posts
      const post = unlocked ? d.accent : "#4a4560";
      this.rect(gx, gy, 3, gh, shade(post, -0.2)); this.rect(gx + gw - 3, gy, 3, gh, shade(post, -0.2));
      this.shelf(gx - 2, gy + gh - 14, gw + 4, 6, post);
      // banner
      this.rect(gx - 2, gy + gh - 26, gw + 4, 10, "#0a0714cc");
      this.textCenterAt(gx + gw / 2, gy + gh - 24, `D${g.index + 1}`, unlocked ? d.accent : "#6a6578");
      // channel glow / lock
      if (unlocked) { for (let i = 0; i < gh - 14; i += 6) this.rect(gx + 3, gy + i, gw - 6, 2, mix("#1a1630", d.accent, 0.25)); if (done) { this.line(gx + gw / 2 - 4, gy + gh - 34, gx + gw / 2 - 1, gy + gh - 31, "#ffd24a"); this.line(gx + gw / 2 - 1, gy + gh - 31, gx + gw / 2 + 4, gy + gh - 37, "#ffd24a"); } }
      else { this.rect(gx + 3, gy + gh - 14, gw - 6, 4, "#3a3648"); this.rect(gx + gw / 2 - 2, gy + gh - 30, 5, 4, "#8a8598"); this.rect(gx + gw / 2 - 1, gy + gh - 33, 3, 3, "#8a8598"); }
    }
  }
  private drawTownAvatar(camX: number, camY: number) {
    const px = Math.round(this.hx + this.tpw / 2 - camX);
    const feet = Math.round(this.hy + this.tph - camY);
    const bob = this.tWalk > 0 ? Math.round(Math.sin(this.tWalk) * 1) : 0;
    // shadow
    this.disc(px, feet, 4, "#0a071460");
    this.avatar(px, feet + bob, this.hero);
  }

  // ---------- HUD + overlays ----------
  private drawHudBar() {
    this.rect(0, 0, this.LW, 12, "#0a071288");
    this.text(4, 3, "SPARK", "#ffd24a", 1, false); this.text(34, 3, `${this.sparks}/${this.shops.length}`, "#fff1e8", 1, false);
    this.text(70, 3, "COIN", "#ffec27", 1, false); this.text(96, 3, `${this.gotCoins}`, "#fff1e8", 1, false);
    if (this.glideMeter > 0) { this.text(120, 3, "GLIDE", "#7be0ff", 1, false); this.rect(152, 4, 24, 4, "#1a2b53"); this.rect(152, 4, Math.round(24 * this.glideMeter / 4), 4, "#7be0ff"); }
    else if (this.boss && !this.boss.dead) { this.text(120, 3, "BOSS", "#ff5d7d", 1, false); this.rect(148, 4, 40, 4, "#3a1622"); this.rect(148, 4, Math.round(40 * this.boss.hp / this.boss.maxHp), 4, "#ff5d7d"); }
    this.textCenterAt(this.LW - 26, 3, `${this.tally()}`.padStart(5, "0"), "#c2c3c7");
  }
  private drawTitleCard() {
    const a = this.tPlay < 1.7 ? 1 : Math.max(0, (2.2 - this.tPlay) / 0.5);
    this.b.globalAlpha = a;
    this.rect(0, 92, this.LW, 40, "#0a0714c0");
    this.textCenter(98, this.district().name, this.district().accent, 1);
    this.textCenter(110, this.level().name, "#fff1e8", 2);
    if (this.level().boss) this.textCenter(126, "! BLANDCO BOSS !", "#ff5d7d", 1);
    this.b.globalAlpha = 1;
  }
  private drawCirqlBanner() {
    this.rect(0, 22, this.LW, 18, "#0a0714aa");
    this.textCenter(26, this.level().boss ? "DISTRICT REVIVED!" : "CLOSE THE CIRQL!", "#ffd24a", 2);
    if (this.sweepX >= this.worldW) { this.rect(0, 92, this.LW, 44, "#0a0714c8"); this.textCenter(98, "MAIN STREET REVIVED", "#33e650", 2); this.textCenter(120, `SCORE  ${this.tally()}`, "#fff1e8", 1); }
  }
  private drawClear() {
    this.rect(0, 0, this.LW, this.LH, "#0a0714b4");
    const wasBoss = this.li === this.district().levels.length - 1;
    this.textCenter(60, wasBoss ? "DISTRICT CLEARED" : "AREA REVIVED", "#33e650", 2);
    this.textCenter(84, `${this.district().name} - ${this.level().name}`, "#c2c3c7", 1);
    this.textCenter(104, `SCORE ${this.score}    COINS +${this.gotCoins}`, "#fff1e8", 1);
    if (wasBoss && this.di < DISTRICTS.length - 1) this.textCenter(122, `${DISTRICTS[this.di + 1].name} UNLOCKED!`, "#ffd24a", 1);
    if (Math.floor(this.tPlay * 2) % 2 === 0) this.textCenter(150, wasBoss ? "PRESS JUMP - TO THE MAP" : "PRESS JUMP - NEXT AREA", "#7be0ff", 1);
  }
  private drawOver() {
    this.rect(0, 0, this.LW, this.LH, "#0a0714b4");
    this.textCenter(72, "BLANDCO WINS", "#ff4d6d", 2);
    this.textCenter(96, "THE STREET DIMS...", "#c2c3c7", 1);
    this.textCenter(116, `SCORE  ${this.score}    BEST  ${this.best}`, "#fff1e8", 1);
    if (Math.floor(this.tPlay * 2) % 2 === 0) this.textCenter(144, "JUMP: RETRY     RUN: MAP", "#7be0ff", 1);
  }
}
