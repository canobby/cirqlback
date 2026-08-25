// NIGHT SHIFT — a Vampire-Survivors homage, the first MODERN cabinet (CHR-196).
//
// You're closing the 24-hr diner alone when grease gremlins pour in from the dark.
// You don't aim — you just MOVE; your spatula auto-slings at whatever's nearest.
// Downed gremlins drop tips (XP); bank enough and you LEVEL UP, picking one of three
// upgrades (more spatulas, faster slinging, spread, pierce, speed, magnet, a heart).
// Waves escalate, a Grease Blob mini-boss crashes in on the hour, and you're trying
// to survive till the 6 AM dawn. This build is the reusable ACTION TOOLKIT (entity/
// enemy system, auto-targeting projectiles, wave spawner, XP pickups + level-up menu,
// i-frames, difficulty scaling) that the rest of the action cluster will reuse.

import { RetroEngine, shade, mix, type RetroHooks } from "./retro-engine";
import { loadAvatarLS, avatarForShop, type AvatarConfig } from "./avatar";
import { MusicKit, MAIN_STREET_THEME } from "./musickit";

const SHIFT_LEN = 180;          // seconds to survive → 6 AM dawn
const HUD_H = 16;

interface Enemy { x: number; y: number; hp: number; maxHp: number; spd: number; r: number; type: number; hurt: number; t: number }
interface Shot { x: number; y: number; vx: number; vy: number; life: number; dmg: number; pierce: number; hit: Set<Enemy> }
interface Gem { x: number; y: number; val: number; vx: number; vy: number; t: number }

interface Upgrade { id: string; name: string; desc: string; apply: () => void }

export class NightShiftEngine extends RetroEngine {
  private hero: AvatarConfig;

  // player (center)
  private hx = 0; private hy = 0; private vx = 0; private vy = 0;
  private face = { x: 1, y: 0 };
  private readonly pr = 5;
  private hp = 5; private maxHp = 5; private iframe = 0;
  private moveSpd = 78; private dash = 0; private dashCd = 0;

  // weapon
  private fireCd = 0; private fireRate = 0.62; private projN = 1; private projSpd = 150; private dmg = 1; private pierce = 0; private projR = 2;
  private magnet = 26;

  // world
  private enemies: Enemy[] = [];
  private shots: Shot[] = [];
  private gems: Gem[] = [];
  private spawnCd = 0;
  private elapsed = 0; private kills = 0;
  private level = 1; private xp = 0; private xpNext = 5;
  private nextBoss = 55;

  // state
  private state: "ready" | "play" | "levelup" | "over" = "ready";
  private choices: Upgrade[] = []; private sel = 0;
  private tAnim = 0; private score = 0; private best = 0; private won = false; private flash = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, 256, 224);
    this.hero = avatarForShop(loadAvatarLS(), "cuppa");
    this.music = new MusicKit();
    try { this.best = +(window.localStorage.getItem("nightshift_best") || 0); } catch { /* ignore */ }
    this.running = true;
    this.reset();
    this.emit();
  }

  protected onGesture() { this.music?.play(MAIN_STREET_THEME); this.music?.setIntensity(0.5); }

  private reset() {
    this.hx = this.LW / 2; this.hy = (this.LH + HUD_H) / 2; this.vx = this.vy = 0;
    this.hp = this.maxHp = 5; this.iframe = 0; this.dash = this.dashCd = 0;
    this.moveSpd = 78; this.fireRate = 0.62; this.fireCd = 0; this.projN = 1; this.projSpd = 150; this.dmg = 1; this.pierce = 0; this.projR = 2; this.magnet = 26;
    this.enemies = []; this.shots = []; this.gems = []; this.spawnCd = 0.5;
    this.elapsed = 0; this.kills = 0; this.level = 1; this.xp = 0; this.xpNext = 5; this.nextBoss = 55;
    this.won = false; this.flash = 0; this.clearFx();
  }
  private beginPlay() { this.reset(); this.state = "play"; this.music?.setIntensity(0.8); this.emit(); }
  protected onStart() { this.beginPlay(); }
  protected onMenu() { this.state = "ready"; this.reset(); this.emit(); }

  private emit() { this.hooks.onHud?.({ state: this.state, hp: this.hp, maxHp: this.maxHp, level: this.level, kills: this.kills, elapsed: this.elapsed, score: this.tally(), best: this.best }); }

  protected update(dt: number) {
    this.tAnim += dt;
    if (this.state === "ready" || this.state === "over") { if (this.pressed.a) this.beginPlay(); return; }
    if (this.state === "levelup") { this.updateLevelup(); return; }
    // ---- play ----
    this.elapsed += dt; this.flash = Math.max(0, this.flash - dt);
    this.movePlayer(dt);
    this.fireCd -= dt; if (this.fireCd <= 0) { this.fireWeapon(); this.fireCd = this.fireRate; }
    this.updateShots(dt); this.updateEnemies(dt); this.updateGems(dt); this.spawns(dt);
    if (this.iframe > 0) this.iframe -= dt;
    if (this.elapsed >= SHIFT_LEN) { this.win(); return; }
    this.emit();
  }

  // ---------- player ----------
  private movePlayer(dt: number) {
    const dx = (this.btn.right ? 1 : 0) - (this.btn.left ? 1 : 0);
    const dy = (this.btn.down ? 1 : 0) - (this.btn.up ? 1 : 0);
    let tx = dx, ty = dy; if (dx && dy) { tx *= 0.707; ty *= 0.707; }
    if (dx || dy) { this.face = { x: tx, y: ty }; }
    // dash
    this.dashCd = Math.max(0, this.dashCd - dt);
    if (this.pressed.a && this.dashCd <= 0 && (dx || dy)) { this.dash = 0.16; this.dashCd = 1.4; this.iframe = Math.max(this.iframe, 0.22); this.tone(520, 0.06, "square", 0.05); this.buzz(10); this.fxBurst(this.hx, this.hy, "#7be0ff", 8, 90); }
    const spd = this.moveSpd * (this.dash > 0 ? 3.1 : 1);
    if (this.dash > 0) this.dash -= dt;
    this.vx = tx * spd; this.vy = ty * spd;
    this.hx = Math.max(this.pr + 2, Math.min(this.LW - this.pr - 2, this.hx + this.vx * dt));
    this.hy = Math.max(HUD_H + this.pr, Math.min(this.LH - this.pr - 2, this.hy + this.vy * dt));
  }

  private fireWeapon() {
    // aim at nearest enemy, else facing
    let target: Enemy | null = null, bd = 1e9;
    for (const e of this.enemies) { const d = (e.x - this.hx) ** 2 + (e.y - this.hy) ** 2; if (d < bd) { bd = d; target = e; } }
    let ax: number, ay: number;
    if (target) { const d = Math.hypot(target.x - this.hx, target.y - this.hy) || 1; ax = (target.x - this.hx) / d; ay = (target.y - this.hy) / d; }
    else { ax = this.face.x || 1; ay = this.face.y; const m = Math.hypot(ax, ay) || 1; ax /= m; ay /= m; }
    const base = Math.atan2(ay, ax);
    const spread = this.projN > 1 ? 0.26 : 0;
    for (let i = 0; i < this.projN; i++) {
      const a = base + (this.projN > 1 ? (-spread * (this.projN - 1) / 2 + spread * i) : 0);
      this.shots.push({ x: this.hx, y: this.hy, vx: Math.cos(a) * this.projSpd, vy: Math.sin(a) * this.projSpd, life: 1.3, dmg: this.dmg, pierce: this.pierce, hit: new Set() });
    }
    this.tone(660, 0.03, "square", 0.03);
  }

  private updateShots(dt: number) {
    for (const s of this.shots) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      for (const e of this.enemies) {
        if (e.hp <= 0 || s.hit.has(e)) continue;
        if ((e.x - s.x) ** 2 + (e.y - s.y) ** 2 < (e.r + this.projR) ** 2) {
          e.hp -= s.dmg; e.hurt = 0.12; s.hit.add(e);
          this.fxBurst(s.x, s.y, "#ffd24a", 3, 60); this.tone(880, 0.02, "square", 0.03);
          if (e.hp <= 0) this.killEnemy(e);
          if (s.pierce-- <= 0) { s.life = 0; break; }
        }
      }
    }
    this.shots = this.shots.filter((s) => s.life > 0 && s.x > -8 && s.x < this.LW + 8 && s.y > -8 && s.y < this.LH + 8);
  }

  // ---------- enemies ----------
  private spawns(dt: number) {
    this.spawnCd -= dt;
    const p = Math.min(1, this.elapsed / SHIFT_LEN);
    const interval = Math.max(0.26, 1.15 - p * 0.9);
    if (this.spawnCd <= 0) { this.spawnCd = interval; const n = 1 + Math.floor(p * 2); for (let i = 0; i < n; i++) this.spawnEnemy(p); }
    if (this.elapsed >= this.nextBoss) { this.nextBoss += 55; this.spawnEnemy(p, 3); this.flash = 0.5; this.addShake(2); this.tone(120, 0.4, "square", 0.06); }
  }
  private spawnEnemy(p: number, forceType = -1) {
    // pick an edge just off-screen
    const side = Math.floor(Math.random() * 4); let x = 0, y = 0;
    if (side === 0) { x = Math.random() * this.LW; y = HUD_H - 8; }
    else if (side === 1) { x = Math.random() * this.LW; y = this.LH + 8; }
    else if (side === 2) { x = -8; y = HUD_H + Math.random() * (this.LH - HUD_H); }
    else { x = this.LW + 8; y = HUD_H + Math.random() * (this.LH - HUD_H); }
    let type = forceType;
    if (type < 0) { const r = Math.random(); type = r < 0.2 + p * 0.2 ? 1 : r > 0.85 && p > 0.3 ? 2 : 0; }
    const hpBase = 2 + Math.floor(p * 5);
    const spec = type === 3 ? { hp: 26 + Math.floor(p * 40), spd: 20, r: 11 } : type === 2 ? { hp: hpBase + 5, spd: 16, r: 7 } : type === 1 ? { hp: Math.max(1, hpBase - 1), spd: 42 + p * 20, r: 4 } : { hp: hpBase, spd: 26 + p * 12, r: 5 };
    this.enemies.push({ x, y, hp: spec.hp, maxHp: spec.hp, spd: spec.spd, r: spec.r, type, hurt: 0, t: 0 });
  }
  private updateEnemies(dt: number) {
    for (const e of this.enemies) {
      e.t += dt; if (e.hurt > 0) e.hurt -= dt;
      const d = Math.hypot(this.hx - e.x, this.hy - e.y) || 1;
      e.x += ((this.hx - e.x) / d) * e.spd * dt; e.y += ((this.hy - e.y) / d) * e.spd * dt;
      // separation so they don't perfectly stack
      if (d < e.r + this.pr && this.iframe <= 0 && this.state === "play") { this.hurtPlayer(e.type === 3 ? 2 : 1); }
    }
    this.enemies = this.enemies.filter((e) => e.hp > 0);
  }
  private killEnemy(e: Enemy) {
    e.hp = 0; this.kills++;
    const val = e.type === 3 ? 12 : e.type === 2 ? 3 : 1;
    for (let i = 0; i < (e.type === 3 ? 6 : 1); i++) this.gems.push({ x: e.x + (Math.random() - 0.5) * 8, y: e.y + (Math.random() - 0.5) * 8, val, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, t: 0 });
    this.fxBurst(e.x, e.y, e.type === 3 ? "#ff5d7d" : "#9aa4b8", e.type === 3 ? 22 : 8, 100);
    if (e.type === 3) { this.fxRing(e.x, e.y, "#ffd24a", 26); this.addShake(1.6); this.hitstop(0.05); this.fxPop(e.x, e.y - 8, "BLOB DOWN!", "#ffd24a", 1); this.tone(200, 0.16, "square", 0.06); }
    else this.tone(180, 0.05, "square", 0.04);
  }
  private hurtPlayer(n: number) {
    this.hp -= n; this.iframe = 0.9; this.flash = 0.25; this.addShake(1.8); this.hitstop(0.04); this.noise(0.1, 0.05); this.tone(160, 0.18, "square", 0.06); this.buzz(20);
    if (this.hp <= 0) this.die();
  }

  // ---------- pickups / XP ----------
  private updateGems(dt: number) {
    for (const g of this.gems) {
      g.t += dt; g.vx *= 0.9; g.vy *= 0.9; g.x += g.vx * dt; g.y += g.vy * dt;
      const d = Math.hypot(this.hx - g.x, this.hy - g.y);
      if (d < this.magnet) { const s = 120 + (this.magnet - d) * 6; g.x += ((this.hx - g.x) / (d || 1)) * s * dt; g.y += ((this.hy - g.y) / (d || 1)) * s * dt; }
      if (d < this.pr + 3) { this.xp += g.val; g.t = -1; this.tone(1046, 0.03, "square", 0.03); if (this.xp >= this.xpNext) this.levelUp(); }
    }
    this.gems = this.gems.filter((g) => g.t >= 0);
  }

  private levelUp() {
    this.level++; this.xp -= this.xpNext; this.xpNext = Math.round(this.xpNext * 1.4 + 3);
    this.choices = this.rollUpgrades(); this.sel = 0; this.state = "levelup";
    this.fxRing(this.hx, this.hy, "#33e650", 30); this.addShake(0.8); this.tone(523, 0.06, "square", .05); this.tone(784, 0.1, "square", .05); this.music?.setIntensity(0.5); this.emit();
  }
  private rollUpgrades(): Upgrade[] {
    const pool: Upgrade[] = [
      { id: "proj", name: "EXTRA SPATULA", desc: "+1 projectile", apply: () => { this.projN++; } },
      { id: "rate", name: "QUICK HANDS", desc: "Sling 18% faster", apply: () => { this.fireRate *= 0.82; } },
      { id: "dmg", name: "CAST IRON", desc: "+1 damage", apply: () => { this.dmg += 1; } },
      { id: "pierce", name: "SHARP EDGE", desc: "+1 pierce", apply: () => { this.pierce += 1; } },
      { id: "spd", name: "FRESH LEGS", desc: "+14% move speed", apply: () => { this.moveSpd *= 1.14; } },
      { id: "mag", name: "TIP JAR", desc: "+60% pickup range", apply: () => { this.magnet *= 1.6; } },
      { id: "proj2", name: "HOT PLATE", desc: "Faster, bigger shots", apply: () => { this.projSpd *= 1.2; this.projR += 1; } },
      { id: "heart", name: "SECOND WIND", desc: "+1 max heart, heal", apply: () => { this.maxHp += 1; this.hp = Math.min(this.maxHp, this.hp + 1); } },
    ];
    // shuffle + take 3
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    return pool.slice(0, 3);
  }
  private updateLevelup() {
    if (this.pressed.left) { this.sel = (this.sel + this.choices.length - 1) % this.choices.length; this.tone(520, 0.03, "square", 0.04); }
    if (this.pressed.right) { this.sel = (this.sel + 1) % this.choices.length; this.tone(620, 0.03, "square", 0.04); }
    if (this.pressed.a) { this.choices[this.sel].apply(); this.state = "play"; this.music?.setIntensity(0.85); this.fxPop(this.hx, this.hy - 10, "LEVEL " + this.level, "#33e650", 1); this.tone(880, 0.1, "square", 0.05); this.emit(); }
  }

  private die() { this.won = false; this.state = "over"; this.score = this.tally(); this.addShake(3); this.hitstop(0.1); this.noise(0.3, 0.06); this.music?.setIntensity(0.2); this.finishRun(); this.emit(); }
  private win() { this.won = true; this.state = "over"; this.score = this.tally() + 2000; this.addShake(1); this.music?.setIntensity(1); this.finishRun(); this.emit(); }
  private tally() { return this.kills * 12 + this.level * 60 + Math.floor(this.elapsed) * 5 + (this.won ? 2000 : 0); }
  private finishRun() { if (this.score > this.best) { this.best = this.score; try { window.localStorage.setItem("nightshift_best", String(this.best)); } catch { /* ignore */ } } this.hooks.onRunEnd?.({ score: this.score, shift: this.level, kills: this.kills, survived: Math.floor(this.elapsed) }); }

  private clock(): string {
    const p = Math.min(1, this.elapsed / SHIFT_LEN); const totalMin = 6 * 60 * p; const h = Math.floor(totalMin / 60); const m = Math.floor(totalMin % 60);
    return `${(h === 0 ? 12 : h)}:${m.toString().padStart(2, "0")} AM`;
  }

  // ---------- render ----------
  protected render() {
    this.drawFloor();
    for (const g of this.gems) { const bob = Math.sin(this.tAnim * 8 + g.x) * 1; this.disc(g.x | 0, (g.y + bob) | 0, g.val > 4 ? 3 : 2, g.val > 4 ? "#ffd24a" : "#33e650"); this.px(g.x | 0, (g.y + bob - 1) | 0, "#fff"); }
    for (const e of this.enemies) this.drawEnemy(e);
    for (const s of this.shots) { this.rect((s.x - this.projR) | 0, (s.y - 1) | 0, this.projR * 2, 2, "#ffe9a0"); this.px(s.x | 0, s.y | 0, "#fff"); }
    this.drawPlayer();
    this.drawFx();
    if (this.flash > 0) { this.b.globalAlpha = this.flash; this.rect(0, 0, this.LW, this.LH, this.won ? "#33e65033" : "#ff4d6d55"); this.b.globalAlpha = 1; }
    this.drawHud();
    if (this.state === "ready") this.drawReady();
    if (this.state === "levelup") this.drawLevelup();
    if (this.state === "over") this.drawOver();
  }

  private drawFloor() {
    this.vgrad(0, 0, this.LW, this.LH, "#141020", "#0c0a16");
    // checker diner tiles
    for (let y = HUD_H; y < this.LH; y += 16) for (let x = 0; x < this.LW; x += 16) if (((x + y) / 16) % 2 === 0) this.rect(x, y, 16, 16, "#181428");
    // subtle wall border
    this.rect(0, HUD_H, this.LW, 2, "#2a2440"); this.rect(0, this.LH - 2, this.LW, 2, "#2a2440");
  }
  private drawEnemy(e: Enemy) {
    const c = e.hurt > 0 ? "#fff1e8" : e.type === 3 ? "#8a5a4a" : e.type === 2 ? "#5a6f82" : e.type === 1 ? "#9a7ac0" : "#6a6f82";
    this.disc(e.x | 0, e.y | 0, e.r, c);
    this.disc(e.x | 0, (e.y - 1) | 0, Math.max(1, e.r - 2), shade(c, 0.18));
    // eyes
    const ex = e.x + (this.hx > e.x ? 1 : -1);
    this.px(ex - 1 | 0, e.y - 1 | 0, "#ff4d6d"); this.px(ex + 1 | 0, e.y - 1 | 0, "#ff4d6d");
    if (e.type === 3) { this.ring(e.x | 0, e.y | 0, e.r + 2, "#ff5d7d", 1.2); this.rect((e.x - e.r) | 0, (e.y - e.r - 4) | 0, e.r * 2, 2, "#3a1622"); this.rect((e.x - e.r) | 0, (e.y - e.r - 4) | 0, Math.round(e.r * 2 * e.hp / e.maxHp), 2, "#ff5d7d"); }
  }
  private drawPlayer() {
    if (this.iframe > 0 && Math.floor(this.tAnim * 20) % 2 === 0 && this.state === "play") return; // blink
    if (this.dash > 0) this.ring(this.hx | 0, this.hy | 0, 9, "#7be0ff", 1.4);
    this.avatar(this.hx | 0, (this.hy + this.pr + 2) | 0, this.hero);
  }

  private drawHud() {
    this.rect(0, 0, this.LW, HUD_H, "#0a0714c8");
    for (let i = 0; i < this.maxHp; i++) { const on = i < this.hp; this.disc(8 + i * 9, 8, 3, on ? "#ff4d6d" : "#3a2430"); if (on) this.px(7 + i * 9, 7, "#ff9db0"); }
    // XP bar
    const bx = this.maxHp * 9 + 12, bw = 60;
    this.rect(bx, 5, bw, 6, "#1a2b53"); this.rect(bx, 5, Math.round(bw * this.xp / this.xpNext), 6, "#33e650"); this.rectLine(bx, 5, bw, 6, "#2a3f6a");
    this.text(bx + 2, 6, "LV" + this.level, "#dfeff0", 1, false);
    this.textCenterAt(this.LW - 70, 5, this.clock(), "#ffd24a");
    this.text(this.LW - 34, 5, `${this.tally()}`.padStart(5, "0"), "#c2c3c7", 1, false);
    // dawn progress
    this.rect(0, HUD_H - 2, Math.round(this.LW * Math.min(1, this.elapsed / SHIFT_LEN)), 2, "#7be0ff");
  }
  private textCenterAt(cx: number, y: number, s: string, c: string) { this.text(Math.round(cx - this.textWidth(s, 1) / 2), y, s, c, 1, false); }

  private drawReady() {
    this.rect(0, 0, this.LW, this.LH, "#0a0714c0");
    this.textCenter(52, "NIGHT SHIFT", "#ff5d7d", 3);
    this.textCenter(82, "THE DINER'S CROWDING WITH GREMLINS", "#c2c3c7", 1);
    this.textCenter(96, "MOVE TO SURVIVE - YOU AUTO-SLING", "#83769c", 1);
    this.textCenter(120, "MOVE: PAD    DASH: JUMP", "#7be0ff", 1);
    this.textCenter(140, "GRAB TIPS TO LEVEL UP - LAST TILL 6 AM", "#5f574f", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(166, "PRESS JUMP TO CLOCK IN", "#fff1e8", 1);
  }
  private drawLevelup() {
    this.rect(0, 0, this.LW, this.LH, "#0a0714d8");
    this.textCenter(30, "LEVEL UP!", "#33e650", 2);
    this.textCenter(48, "PICK AN UPGRADE", "#c2c3c7", 1);
    const cw = 74, gap = 6, total = this.choices.length * cw + (this.choices.length - 1) * gap, x0 = (this.LW - total) / 2;
    for (let i = 0; i < this.choices.length; i++) {
      const u = this.choices[i], x = x0 + i * (cw + gap), on = i === this.sel;
      this.rect(x, 66, cw, 84, on ? "#1c2b1e" : "#141026"); this.rectLine(x, 66, cw, 84, on ? "#33e650" : "#3a3550");
      if (on) this.rectLine(x - 1, 65, cw + 2, 86, "#7be08a");
      this.disc(x + cw / 2, 88, 9, on ? "#33e650" : "#5a5568"); this.text(x + cw / 2 - 2, 84, `${i + 1}`, "#0a0714", 1, false);
      this.wrapText(u.name, x + 4, 104, cw - 8, on ? "#fff1e8" : "#c2c3c7");
      this.wrapText(u.desc, x + 4, 126, cw - 8, "#83b0c8");
    }
    if (Math.floor(this.tAnim * 3) % 2 === 0) this.textCenter(162, "< >  CHOOSE     JUMP  TAKE IT", "#7be0ff", 1);
  }
  private wrapText(s: string, x: number, y: number, w: number, c: string) {
    const words = s.split(" "); let line = "", yy = y;
    for (const wd of words) { const test = line ? line + " " + wd : wd; if (this.textWidth(test, 1) > w && line) { this.text(x, yy, line, c, 1, false); line = wd; yy += 8; } else line = test; }
    if (line) this.text(x, yy, line, c, 1, false);
  }
  private drawOver() {
    this.rect(0, 0, this.LW, this.LH, "#0a0714cc");
    if (this.won) { this.textCenter(60, "SHIFT COMPLETE!", "#33e650", 2); this.textCenter(84, "YOU MADE IT TO DAWN", "#ffd24a", 1); }
    else { this.textCenter(60, "SHIFT'S OVER", "#ff4d6d", 2); this.textCenter(84, `SURVIVED TILL ${this.clock()}`, "#c2c3c7", 1); }
    this.textCenter(104, `LEVEL ${this.level}   ${this.kills} DOWNED`, "#fff1e8", 1);
    this.textCenter(122, `SCORE ${this.score}    BEST ${this.best}`, "#fff1e8", 1);
    if (Math.floor(this.tAnim * 2) % 2 === 0) this.textCenter(150, "PRESS JUMP TO CLOCK IN AGAIN", "#7be0ff", 1);
  }
}
