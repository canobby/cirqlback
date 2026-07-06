// avatar — the customizable "little people & toys" figure for CIRQLBACK · MAIN
// STREET ARCADE. One figure renders everywhere: the customizer, the lobby player
// card, leaderboards, and — re-skinned per shop — as the playable hero inside every
// cabinet. It's drawn through a tiny painter interface so the same routine works on
// a plain 2D canvas (customizer/lobby) and on a RetroEngine buffer (in-game hero).

export interface AvatarConfig {
  skin: string;   // face/hands hex
  eye: string;    // eye hex
  hat: string;    // cap colour hex
  body: string;   // shirt/outfit hex
  bib?: string;   // overalls/apron hex (optional)
  tool?: "none" | "mug" | "pizza" | "wrench" | "broom" | "spatula";
  sidekick?: "none" | "star" | "cat" | "bot";
}

export const DEFAULT_AVATAR: AvatarConfig = {
  skin: "#f4c79a", eye: "#1a1226", hat: "#33b0e0", body: "#e2544f", bib: "#3a6ad0",
  tool: "none", sidekick: "none",
};

// ---------- customizer catalogs ----------
export interface Swatch { c: string; lock?: string }
export interface Opt<T> { k: T; label: string; lock?: string }

export const SKINS: string[] = ["#f4c79a", "#e0a878", "#c68a5a", "#8a5a3a", "#5a3a28"];
export const EYES: string[] = ["#1a1226", "#2c2350", "#5a2f2f"];
export const HAT_COLORS: Swatch[] = [
  { c: "#33b0e0" }, { c: "#ff5d7d" }, { c: "#ffd24a" }, { c: "#33e650" }, { c: "#b79bff", lock: "Reach Level 5" },
];
export const BODY_COLORS: Swatch[] = [
  { c: "#e2544f" }, { c: "#3a6ad0" }, { c: "#33a06a" }, { c: "#ff77a8" },
  { c: "#7a4fd0", lock: "Play 5 cabinets" }, { c: "#ffb020", lock: "Reach 1,000 ★" },
];
export const SIDEKICKS: Opt<NonNullable<AvatarConfig["sidekick"]>>[] = [
  { k: "none", label: "None" }, { k: "star", label: "Star" }, { k: "cat", label: "Cat" }, { k: "bot", label: "Bot", lock: "Beat a boss" },
];

// Per-shop outfit overrides — the same figure, re-skinned as the cabinet's hero.
// Keeps the player's skin/eye; swaps hat/body/apron/tool. Unlocked by playing.
export const SHOP_OUTFITS: Record<string, Partial<AvatarConfig>> = {
  cuppa: { hat: "#33e650", body: "#e2544f", bib: "#f4efe6", tool: "mug" },      // barista
  slice: { hat: "#ff5d7d", body: "#3bb6ff", bib: "#2c5aa0", tool: "pizza" },    // courier
  fixit: { hat: "#ffd24a", body: "#ffb020", bib: "#a86a1a", tool: "wrench" },   // handy
  batch: { hat: "#fff1e8", body: "#c94f6c", bib: "#e2c08a", tool: "spatula" },  // baker
  spincycle: { hat: "#3bb6ff", body: "#7be0c2", bib: "#2c7fd6", tool: "broom" }, // laundry
};

/** Merge a shop outfit over the player's base avatar (skin/eye kept). */
export function avatarForShop(base: AvatarConfig, shop: string): AvatarConfig {
  return { ...base, ...(SHOP_OUTFITS[shop] || {}) };
}

// ---------- persistence (localStorage; the profile syncs via /api/game/progress) ----------
const LS_KEY = "cirql_avatar";
export function loadAvatarLS(): AvatarConfig {
  try { const raw = window.localStorage.getItem(LS_KEY); if (raw) return { ...DEFAULT_AVATAR, ...JSON.parse(raw) }; } catch { /* ignore */ }
  return { ...DEFAULT_AVATAR };
}
export function saveAvatarLS(cfg: AvatarConfig) {
  try { window.localStorage.setItem(LS_KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
}

// ---------- painter (shared by canvas + RetroEngine) ----------
export interface AvatarPainter {
  px(x: number, y: number, c: string): void;
  rect(x: number, y: number, w: number, h: number, c: string): void;
  disc(cx: number, cy: number, r: number, c: string): void;
  ball(cx: number, cy: number, r: number, base: string): void;
  shade(c: string, amt: number): string;
}

/**
 * Paint the toy figure with feet centred at (x, y); it stands ~27px tall and ~12px
 * wide. Draw shadow/scene first — this only paints the figure + tool + sidekick.
 */
export function paintAvatar(p: AvatarPainter, x: number, y: number, cfg: AvatarConfig) {
  const { skin, eye, hat, body } = cfg;
  const bib = cfg.bib;
  const legs = "#2f4a8a";
  // legs + shoes
  p.rect(x - 3, y - 6, 2, 6, legs); p.rect(x + 1, y - 6, 2, 6, legs);
  p.rect(x - 3, y - 1, 2, 1, "#e0b088"); p.rect(x + 1, y - 1, 2, 1, "#e0b088");
  // body
  p.rect(x - 4, y - 15, 8, 9, body); p.rect(x - 4, y - 15, 8, 1, p.shade(body, 0.4));
  if (bib) { p.rect(x - 2, y - 13, 4, 7, bib); p.px(x - 1, y - 11, "#ffd24a"); p.px(x + 1, y - 11, "#ffd24a"); }
  // arms
  p.rect(x - 6, y - 14, 2, 6, body); p.rect(x + 4, y - 14, 2, 6, body);
  p.px(x - 6, y - 8, skin); p.px(x + 5, y - 8, skin);
  // head
  p.disc(x, y - 19, 4, skin);
  p.px(x - 4, y - 18, p.shade(skin, -0.25)); p.px(x + 4, y - 18, p.shade(skin, -0.25));
  p.px(x - 2, y - 19, eye); p.px(x + 2, y - 19, eye);
  p.px(x - 2, y - 20, "#fff"); p.px(x + 2, y - 20, "#fff");
  p.rect(x - 1, y - 17, 3, 1, "#c65a4a"); p.px(x, y - 17, "#e07a68");
  p.px(x - 3, y - 17, p.shade(skin, -0.15)); p.px(x + 3, y - 17, p.shade(skin, -0.15)); // cheeks
  // cap: dome + brim + pom
  p.rect(x - 4, y - 23, 8, 2, hat); p.rect(x - 3, y - 25, 6, 2, hat); p.px(x - 3, y - 23, p.shade(hat, 0.25));
  p.rect(x - 6, y - 22, 5, 1, p.shade(hat, -0.25)); // brim
  p.px(x, y - 26, "#ffd24a");
  // tool in hand
  drawTool(p, x, y, cfg.tool);
  // sidekick toy
  drawSidekick(p, x, y, cfg.sidekick);
}

function drawTool(p: AvatarPainter, x: number, y: number, tool: AvatarConfig["tool"]) {
  switch (tool) {
    case "mug": p.ball(x + 7, y - 9, 3, "#e88a2a"); p.rect(x + 4, y - 11, 6, 3, "#f4efe6"); break;
    case "pizza": p.ball(x + 7, y - 12, 3, "#f0b429"); p.px(x + 6, y - 12, "#c0392b"); p.px(x + 8, y - 11, "#c0392b"); break;
    case "wrench": p.rect(x + 6, y - 12, 2, 5, "#9aa4b0"); p.px(x + 6, y - 13, "#c2ccd6"); p.px(x + 8, y - 13, "#c2ccd6"); break;
    case "broom": p.rect(x + 6, y - 13, 1, 7, "#a86a1a"); p.rect(x + 5, y - 7, 3, 2, "#ffd24a"); break;
    case "spatula": p.rect(x + 6, y - 12, 1, 5, "#9aa4b0"); p.rect(x + 5, y - 13, 3, 2, "#c2ccd6"); break;
    default: break;
  }
}

function drawSidekick(p: AvatarPainter, x: number, y: number, s: AvatarConfig["sidekick"]) {
  const sx = x + 9;
  switch (s) {
    case "star": p.ball(sx + 1, y - 3, 2, "#ffd24a"); break;
    case "cat": p.disc(sx, y - 2, 3, "#5f574f"); p.px(sx - 2, y - 5, "#5f574f"); p.px(sx + 2, y - 5, "#5f574f"); p.px(sx - 1, y - 2, "#33e650"); p.px(sx + 1, y - 2, "#33e650"); break;
    case "bot": p.rect(sx - 2, y - 5, 5, 5, "#83769c"); p.rect(sx - 2, y - 5, 5, 1, "#a89cc0"); p.px(sx, y - 3, "#29adff"); p.px(sx, y - 7, "#ff5d7d"); break;
    default: break;
  }
}

// ---------- canvas adapter (customizer / lobby / leaderboards) ----------
function toRGB(c: string): [number, number, number] { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function localShade(hex: string, amt: number): string {
  const [r, g, b] = toRGB(hex); const t = amt < 0 ? 0 : 255, k = Math.abs(amt);
  const f = (v: number) => Math.round(v + (t - v) * k);
  return "#" + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
}

/** Build a painter that draws into a 2D context at integer scale `S`, offset (ox,oy). */
export function canvasPainter(ctx: CanvasRenderingContext2D, S: number, ox = 0, oy = 0): AvatarPainter {
  const px = (x: number, y: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(ox + Math.round(x) * S, oy + Math.round(y) * S, S, S); };
  const rect = (x: number, y: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(ox + Math.round(x) * S, oy + Math.round(y) * S, w * S, h * S); };
  const disc = (cx: number, cy: number, r: number, c: string) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) px(cx + x, cy + y, c); };
  const ball = (cx: number, cy: number, r: number, base: string) => {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d2 = x * x + y * y; if (d2 > r * r) continue;
      const lx = x + r * 0.42, ly = y + r * 0.42, dl = Math.sqrt(lx * lx + ly * ly) / (r * 1.7);
      let c = dl < 0.32 ? localShade(base, 0.55) : dl < 0.62 ? localShade(base, 0.2) : dl < 0.85 ? base : localShade(base, -0.3);
      if (d2 > (r - 1) * (r - 1)) c = localShade(base, -0.55);
      px(cx + x, cy + y, c);
    }
    px(cx - Math.round(r * 0.38), cy - Math.round(r * 0.38), "#ffffff");
  };
  return { px, rect, disc, ball, shade: localShade };
}

/** Draw the avatar into a 2D canvas context. `S` = pixel size, feet at (feetX, feetY) in figure units. */
export function drawAvatarToCanvas(ctx: CanvasRenderingContext2D, cfg: AvatarConfig, S: number, feetX: number, feetY: number, shadow = true) {
  ctx.imageSmoothingEnabled = false;
  const p = canvasPainter(ctx, S);
  if (shadow) { ctx.globalAlpha = 0.3; p.disc(feetX, feetY + 1, 5, "#0a0714"); ctx.globalAlpha = 1; }
  paintAvatar(p, feetX, feetY, cfg);
}
