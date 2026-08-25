// avatar — the customizable "little people & toys" figure for CIRQLBACK · MAIN
// STREET ARCADE. One figure renders everywhere: the customizer, the lobby player
// card, leaderboards, and — re-skinned per shop — as the playable hero inside every
// cabinet. It's drawn through a tiny painter interface so the same routine works on
// a plain 2D canvas (customizer/lobby) and on a RetroEngine buffer (in-game hero).

export type HatStyle = "cap" | "crown" | "band" | "beanie" | "witch" | "none";
export type HairStyle = "none" | "short" | "buzz" | "bob" | "long" | "curly" | "afro" | "mohawk" | "ponytail" | "bun" | "pigtails";
export type AvatarAura = "none" | "teal" | "violet" | "gold" | "rose" | "mint" | "sky";
export type AvatarWings = "none" | "fairy" | "bat" | "angel";
/** Facing direction for top-down worlds. "down" = front (default, arcade look). */
export type AvatarDir = "down" | "up" | "left" | "right";

export interface AvatarConfig {
  skin: string;   // face/hands hex
  eye: string;    // eye hex
  hat: string;    // hat colour hex
  body: string;   // shirt/outfit hex
  bib?: string;   // overalls/apron hex (optional)
  tool?: "none" | "mug" | "pizza" | "wrench" | "broom" | "spatula" | "staff" | "wand";
  sidekick?: "none" | "star" | "cat" | "bot" | "donut" | "vinyl" | "taco" | "moth" | "sprite";
  // --- CIRQL additions (CHR-243): all optional so existing arcade avatars are unchanged ---
  hatStyle?: HatStyle;   // shape of the headwear (defaults to the classic cap)
  aura?: AvatarAura;     // a soft glow the world/preview paints behind the figure (on-brand light)
  wings?: AvatarWings;   // a back-worn wing pair (Boutique special — drawn behind the figure)
  hair?: HairStyle;      // hairstyle drawn on the head, under the hat (Barber / chooser)
  hairColor?: string;    // hair colour hex
}

export const DEFAULT_AVATAR: AvatarConfig = {
  skin: "#f4c79a", eye: "#1a1226", hat: "#33b0e0", body: "#e2544f", bib: "#3a6ad0",
  tool: "none", sidekick: "none", hatStyle: "cap", aura: "none", wings: "none",
  hair: "short", hairColor: "#4a3222",
};

// The soft-glow palette for auras (hex per aura id). "none" → no glow. Rendered by
// the host (RetroEngine.glow / a canvas radial), NOT by paintAvatar.
export const AURA_COLORS: Record<AvatarAura, string | null> = {
  none: null, teal: "#35e0d0", violet: "#b26cff", gold: "#ffc46b", rose: "#ff7ea8", mint: "#5be89a", sky: "#78b4ff",
};

// ---------- customizer catalogs ----------
export interface Swatch { c: string; lock?: string }
export interface Opt<T> { k: T; label: string; lock?: string }

export const SKINS: string[] = ["#f9dcc0", "#f4c79a", "#e0a878", "#c68a5a", "#a06a42", "#8a5a3a", "#5a3a28", "#3d2817"];
export const EYES: string[] = ["#1a1226", "#2c2350", "#5a2f2f", "#2f5a4a", "#3a4d6b", "#6b3a5a"];
export const HAT_COLORS: Swatch[] = [
  { c: "#33b0e0" }, { c: "#ff5d7d" }, { c: "#ffd24a" }, { c: "#33e650" }, { c: "#b79bff" },
  { c: "#35e0d0" }, { c: "#ff7ea8" }, { c: "#ffc46b" }, { c: "#78b4ff" }, { c: "#f4efe6" },
];
// Headwear shapes (CIRQL). "cap" is the classic arcade look = the default.
export const HAT_STYLES: Opt<HatStyle>[] = [
  { k: "cap", label: "Cap" }, { k: "beanie", label: "Beanie" }, { k: "band", label: "Band" }, { k: "crown", label: "Crown" }, { k: "witch", label: "Witch" }, { k: "none", label: "Bare" },
];
// Hairstyles (chooser: the basics free; the Barber sells the fancy ones).
export const HAIR_STYLES: Opt<HairStyle>[] = [
  { k: "none", label: "Bald" }, { k: "buzz", label: "Buzz" }, { k: "short", label: "Short" }, { k: "bob", label: "Bob" },
  { k: "long", label: "Long" }, { k: "curly", label: "Curly" }, { k: "afro", label: "Afro" }, { k: "ponytail", label: "Ponytail" },
  { k: "bun", label: "Top Bun" }, { k: "pigtails", label: "Pigtails" }, { k: "mohawk", label: "Mohawk" },
];
// Hair colours — naturals first, then fun dyes (the dyes are Barber premiums).
export const HAIR_COLORS: Swatch[] = [
  { c: "#2a2028" }, { c: "#4a3222" }, { c: "#6a4a2c" }, { c: "#b5814a" }, { c: "#d8a860" }, { c: "#8a8f98" }, { c: "#e8e6e2" }, { c: "#8a3a2a" },
  { c: "#ff7ea8" }, { c: "#78b4ff" }, { c: "#35e0d0" }, { c: "#b26cff" }, { c: "#5be89a" }, { c: "#ffd24a" },
];
// Boutique "super-special" wearables (Milestone F) — wings worn on the back + a held item.
export const WINGS: Opt<AvatarWings>[] = [
  { k: "none", label: "None" }, { k: "fairy", label: "Fairy" }, { k: "bat", label: "Bat" }, { k: "angel", label: "Angel" },
];
export const HELD_ITEMS: Opt<NonNullable<AvatarConfig["tool"]>>[] = [
  { k: "none", label: "None" }, { k: "staff", label: "Staff" }, { k: "wand", label: "Wand" },
];
export const BODY_COLORS: Swatch[] = [
  { c: "#e2544f" }, { c: "#3a6ad0" }, { c: "#33a06a" }, { c: "#ff77a8" }, { c: "#7a4fd0" },
  { c: "#ffb020" }, { c: "#35e0d0" }, { c: "#b26cff" }, { c: "#5be89a" }, { c: "#20242e" },
];
export const SIDEKICKS: Opt<NonNullable<AvatarConfig["sidekick"]>>[] = [
  { k: "none", label: "None" }, { k: "star", label: "Star" }, { k: "cat", label: "Cat" }, { k: "bot", label: "Bot" },
  { k: "moth", label: "Moth" }, { k: "sprite", label: "Sprite" },
  { k: "donut", label: "Donut" }, { k: "vinyl", label: "Vinyl" }, { k: "taco", label: "Taco" },
];
// Aura glows — the on-brand "light" cosmetic. "none" = no glow.
export const AURAS: Opt<AvatarAura>[] = [
  { k: "none", label: "None" }, { k: "teal", label: "Teal" }, { k: "violet", label: "Violet" }, { k: "gold", label: "Gold" },
  { k: "rose", label: "Rose" }, { k: "mint", label: "Mint" }, { k: "sky", label: "Sky" },
];

// Spark prices for the premium cosmetics (CHR-246). Keys are `${category}:${optionId}`.
// Anything not listed is FREE at character creation (skin/eyes/hat-colour/body are
// always free — identity, not flair). "none"/first options stay free too.
export const COSMETIC_PRICES: Record<string, number> = {
  "aura:violet": 20, "aura:gold": 25, "aura:rose": 20, "aura:mint": 20, "aura:sky": 20,
  "hat:beanie": 15, "hat:band": 15, "hat:crown": 40, "hat:witch": 50,
  // hairstyles + fancy dyes (also sold at the Barber). Naturals free; these are flair.
  "hair:bob": 10, "hair:long": 15, "hair:curly": 15, "hair:afro": 18, "hair:ponytail": 15, "hair:bun": 18, "hair:pigtails": 18, "hair:mohawk": 20,
  "haircolor:#ff7ea8": 12, "haircolor:#78b4ff": 12, "haircolor:#35e0d0": 12, "haircolor:#b26cff": 12, "haircolor:#5be89a": 12, "haircolor:#ffd24a": 12,
  "companion:cat": 20, "companion:bot": 30, "companion:moth": 25, "companion:sprite": 30, "companion:donut": 20, "companion:vinyl": 25, "companion:taco": 20,
  // Boutique super-specials (Milestone F)
  "wings:fairy": 60, "wings:bat": 55, "wings:angel": 70, "tool:staff": 45, "tool:wand": 40,
};
export const cosmeticCost = (id: string): number => COSMETIC_PRICES[id] ?? 0; // 0 = free

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
export function paintAvatar(p: AvatarPainter, x: number, y: number, cfg: AvatarConfig, dir: AvatarDir = "down", blink = false) {
  const { skin, eye, hat, body } = cfg;
  const lid = p.shade(skin, -0.32);   // closed-eye colour for the blink frame (I1)
  const bib = cfg.bib;
  const legs = "#2f4a8a";
  // wings first (behind everything) — a Boutique special (F). Hidden from the back view.
  if (dir !== "up") drawWings(p, x, y, cfg.wings);
  // legs + shoes
  p.rect(x - 3, y - 6, 2, 6, legs); p.rect(x + 1, y - 6, 2, 6, legs);
  p.rect(x - 3, y - 1, 2, 1, "#e0b088"); p.rect(x + 1, y - 1, 2, 1, "#e0b088");
  // body
  p.rect(x - 4, y - 15, 8, 9, body); p.rect(x - 4, y - 15, 8, 1, p.shade(body, 0.4));
  if (bib && dir !== "up") { p.rect(x - 2, y - 13, 4, 7, bib); p.px(x - 1, y - 11, "#ffd24a"); p.px(x + 1, y - 11, "#ffd24a"); }
  // arms
  p.rect(x - 6, y - 14, 2, 6, body); p.rect(x + 4, y - 14, 2, 6, body);
  p.px(x - 6, y - 8, skin); p.px(x + 5, y - 8, skin);
  // head
  p.disc(x, y - 19, 4, skin);
  p.px(x - 4, y - 18, p.shade(skin, -0.25)); p.px(x + 4, y - 18, p.shade(skin, -0.25));
  // face — varies with facing direction
  if (dir === "up") {
    p.rect(x - 3, y - 17, 6, 2, p.shade(skin, -0.38));          // back of head: no face, hint of hair
  } else if (dir === "left") {
    if (blink) p.px(x - 2, y - 19, lid); else { p.px(x - 2, y - 19, eye); p.px(x - 2, y - 20, "#fff"); }
    p.rect(x - 2, y - 17, 2, 1, "#c65a4a");
    p.px(x - 4, y - 18, skin); p.px(x - 3, y - 17, p.shade(skin, -0.15)); // nose + cheek
  } else if (dir === "right") {
    if (blink) p.px(x + 2, y - 19, lid); else { p.px(x + 2, y - 19, eye); p.px(x + 2, y - 20, "#fff"); }
    p.rect(x, y - 17, 2, 1, "#c65a4a");
    p.px(x + 4, y - 18, skin); p.px(x + 3, y - 17, p.shade(skin, -0.15));
  } else { // down / front
    if (blink) { p.px(x - 2, y - 19, lid); p.px(x + 2, y - 19, lid); }
    else { p.px(x - 2, y - 19, eye); p.px(x + 2, y - 19, eye); p.px(x - 2, y - 20, "#fff"); p.px(x + 2, y - 20, "#fff"); }
    p.rect(x - 1, y - 17, 3, 1, "#c65a4a"); p.px(x, y - 17, "#e07a68");
    p.px(x - 3, y - 17, p.shade(skin, -0.15)); p.px(x + 3, y - 17, p.shade(skin, -0.15)); // cheeks
  }
  // hair (on the head, framing the face — drawn under the hat so a hat sits over it)
  drawHair(p, x, y, cfg.hair ?? "none", cfg.hairColor ?? "#4a3222", dir);
  // headwear (shape chosen by hatStyle; "cap" is the classic default)
  drawHat(p, x, y, hat, cfg.hatStyle ?? "cap");
  // tool in hand (hidden from the back)
  if (dir !== "up") drawTool(p, x, y, cfg.tool);
  // sidekick toy
  drawSidekick(p, x, y, cfg.sidekick);
}

// Hair drawn on the head (head centre ~x,y-19, r4; crown ~y-23). Framing only — never over
// the eyes (y-19) or mouth (y-17). Drawn before the hat so a hat covers the crown.
function drawHair(p: AvatarPainter, x: number, y: number, style: HairStyle, color: string, dir: AvatarDir) {
  if (style === "none") return;
  const dk = p.shade(color, -0.22), hi = p.shade(color, 0.28);
  if (style === "buzz") { p.rect(x - 4, y - 23, 8, 1, color); p.px(x - 4, y - 21, dk); p.px(x + 3, y - 21, dk); return; }
  // crown cap (top of the head) — shared by all the longer styles
  p.rect(x - 4, y - 23, 8, 2, color); p.rect(x - 3, y - 24, 6, 1, color); p.px(x - 3, y - 23, hi);
  if (dir === "up") {   // back of the head — hair covers the whole back
    p.rect(x - 4, y - 22, 8, 3, color);
    if (style === "long") p.rect(x - 4, y - 19, 8, 7, color);
    else if (style === "bob") p.rect(x - 4, y - 19, 8, 3, color);
    else if (style === "ponytail") { p.rect(x - 1, y - 20, 2, 9, color); p.px(x - 2, y - 12, dk); p.px(x + 1, y - 12, dk); }
    else if (style === "pigtails") { p.disc(x - 5, y - 19, 2, color); p.disc(x + 5, y - 19, 2, color); }
    else if (style === "bun") { p.disc(x, y - 26, 2, color); }
    else if (style === "mohawk") { p.rect(x - 1, y - 26, 2, 5, color); }
    else if (style === "afro" || style === "curly") { p.disc(x, y - 22, style === "afro" ? 5 : 4, color); }
    return;
  }
  // front / side styles — fringe on the forehead (above the eyes) + side framing
  const fringe = () => { p.rect(x - 4, y - 22, 8, 1, dk); p.px(x - 3, y - 21, color); p.px(x + 2, y - 21, color); };
  if (style === "short") { fringe(); p.px(x - 4, y - 21, color); p.px(x + 3, y - 21, color); }
  else if (style === "bob") { fringe(); p.rect(x - 5, y - 22, 1, 6, color); p.rect(x + 4, y - 22, 1, 6, color); }
  else if (style === "long") { fringe(); p.rect(x - 5, y - 22, 1, 10, color); p.rect(x + 4, y - 22, 1, 10, color); }
  else if (style === "ponytail") { fringe(); const s = dir === "left" ? 1 : -1; p.rect(x + 5 * s, y - 22, 1, 6, color); p.px(x + 6 * s, y - 21, hi); }
  else if (style === "bun") { fringe(); p.disc(x, y - 26, 2, color); }
  else if (style === "pigtails") { fringe(); p.disc(x - 5, y - 20, 2, color); p.disc(x + 5, y - 20, 2, color); }
  else if (style === "mohawk") { p.rect(x - 1, y - 27, 2, 6, color); p.px(x, y - 28, hi); }
  else if (style === "afro") { p.disc(x - 4, y - 22, 2.4, color); p.disc(x + 4, y - 22, 2.4, color); p.disc(x, y - 24, 3, color); }
  else if (style === "curly") { p.disc(x - 4, y - 22, 2, color); p.disc(x + 4, y - 22, 2, color); p.disc(x, y - 24, 2.4, color); p.px(x - 3, y - 24, hi); }
}
function drawHat(p: AvatarPainter, x: number, y: number, hat: string, style: HatStyle) {
  switch (style) {
    case "none":
      break;
    case "band": // thin headband + a little gem
      p.rect(x - 4, y - 22, 8, 1, hat); p.px(x, y - 23, "#fff1e8");
      break;
    case "beanie": // rounded dome, no brim, folded band
      p.rect(x - 4, y - 23, 8, 2, hat); p.rect(x - 3, y - 25, 6, 2, hat); p.px(x - 3, y - 23, p.shade(hat, 0.25));
      p.rect(x - 4, y - 22, 8, 1, p.shade(hat, -0.2)); p.px(x, y - 26, p.shade(hat, 0.4));
      break;
    case "crown": // gold-ish band with three points (uses the hat colour)
      p.rect(x - 4, y - 22, 8, 2, hat);
      p.rect(x - 4, y - 24, 2, 2, hat); p.rect(x - 1, y - 25, 2, 3, hat); p.rect(x + 2, y - 24, 2, 2, hat);
      p.px(x - 3, y - 24, "#fff1e8"); p.px(x, y - 25, "#fff1e8"); p.px(x + 3, y - 24, "#fff1e8");
      break;
    case "witch": // wide brim + a tall, slightly leaning point + a band & buckle gem
      p.rect(x - 6, y - 22, 12, 1, p.shade(hat, -0.35)); p.rect(x - 5, y - 21, 10, 1, p.shade(hat, -0.2)); // brim
      p.rect(x - 4, y - 24, 8, 2, hat); p.rect(x - 3, y - 26, 6, 2, hat); p.rect(x - 1, y - 29, 3, 3, hat); p.px(x + 1, y - 30, hat);
      p.rect(x - 4, y - 23, 8, 1, "#ffd24a"); p.px(x + 2, y - 23, "#7fffe6");   // band + buckle
      p.px(x - 2, y - 25, p.shade(hat, 0.3));
      break;
    case "cap":
    default: // dome + brim + pom (the classic arcade cap)
      p.rect(x - 4, y - 23, 8, 2, hat); p.rect(x - 3, y - 25, 6, 2, hat); p.px(x - 3, y - 23, p.shade(hat, 0.25));
      p.rect(x - 6, y - 22, 5, 1, p.shade(hat, -0.25)); // brim
      p.px(x, y - 26, "#ffd24a");
      break;
  }
}

function drawTool(p: AvatarPainter, x: number, y: number, tool: AvatarConfig["tool"]) {
  switch (tool) {
    case "mug": p.ball(x + 7, y - 9, 3, "#e88a2a"); p.rect(x + 4, y - 11, 6, 3, "#f4efe6"); break;
    case "pizza": p.ball(x + 7, y - 12, 3, "#f0b429"); p.px(x + 6, y - 12, "#c0392b"); p.px(x + 8, y - 11, "#c0392b"); break;
    case "wrench": p.rect(x + 6, y - 12, 2, 5, "#9aa4b0"); p.px(x + 6, y - 13, "#c2ccd6"); p.px(x + 8, y - 13, "#c2ccd6"); break;
    case "broom": p.rect(x + 6, y - 13, 1, 7, "#a86a1a"); p.rect(x + 5, y - 7, 3, 2, "#ffd24a"); break;
    case "spatula": p.rect(x + 6, y - 12, 1, 5, "#9aa4b0"); p.rect(x + 5, y - 13, 3, 2, "#c2ccd6"); break;
    case "staff": // a tall wooden staff crowned with a glowing orb (Boutique special, F)
      p.rect(x + 6, y - 16, 1, 12, "#8a5a2a"); p.px(x + 6, y - 5, "#6a4420");
      p.ball(x + 6, y - 18, 2, "#b26cff"); p.px(x + 6, y - 18, "#e6ccff"); p.px(x + 5, y - 19, "#fff");
      break;
    case "wand": // a short wand with a twinkling star tip (Boutique special, F)
      p.rect(x + 6, y - 13, 1, 7, "#5a3f1a");
      p.px(x + 6, y - 15, "#ffd24a"); p.px(x + 5, y - 14, "#ffe98a"); p.px(x + 7, y - 14, "#ffe98a"); p.px(x + 6, y - 16, "#fff");
      break;
    default: break;
  }
}

// Back-worn wings (Boutique special, F) — drawn behind the figure at the shoulders.
function drawWings(p: AvatarPainter, x: number, y: number, w: AvatarWings | undefined) {
  if (!w || w === "none") return;
  const b = y - 12;   // wing anchor, behind the shoulders
  if (w === "fairy") {
    const c = "#bfe6ff", e = "#7fc4ee";
    p.disc(x - 7, b - 2, 3, c); p.disc(x - 8, b + 2, 2, c); p.px(x - 10, b - 2, e); p.px(x - 10, b + 3, e); p.px(x - 8, b - 4, "#ffffff");
    p.disc(x + 7, b - 2, 3, c); p.disc(x + 8, b + 2, 2, c); p.px(x + 10, b - 2, e); p.px(x + 10, b + 3, e); p.px(x + 8, b - 4, "#ffffff");
  } else if (w === "bat") {
    const c = "#3a2a4a", e = "#5a3f6e";
    p.disc(x - 7, b, 3, c); p.rect(x - 10, b - 1, 3, 4, c); p.px(x - 10, b + 3, e); p.px(x - 7, b + 3, e); p.px(x - 8, b - 3, e);
    p.disc(x + 7, b, 3, c); p.rect(x + 7, b - 1, 3, 4, c); p.px(x + 9, b + 3, e); p.px(x + 6, b + 3, e); p.px(x + 7, b - 3, e);
  } else { // angel — soft feathered white
    const c = "#f4efe6", e = "#cfd6e2";
    p.disc(x - 7, b - 1, 3, c); p.disc(x - 8, b + 2, 2, c); p.px(x - 10, b - 1, e); p.px(x - 10, b + 2, e); p.px(x - 9, b - 3, "#ffffff");
    p.disc(x + 7, b - 1, 3, c); p.disc(x + 8, b + 2, 2, c); p.px(x + 10, b - 1, e); p.px(x + 10, b + 2, e); p.px(x + 9, b - 3, "#ffffff");
  }
}

function drawSidekick(p: AvatarPainter, x: number, y: number, s: AvatarConfig["sidekick"]) {
  const sx = x + 9;
  switch (s) {
    case "star": p.ball(sx + 1, y - 3, 2, "#ffd24a"); break;
    case "cat": p.disc(sx, y - 2, 3, "#5f574f"); p.px(sx - 2, y - 5, "#5f574f"); p.px(sx + 2, y - 5, "#5f574f"); p.px(sx - 1, y - 2, "#33e650"); p.px(sx + 1, y - 2, "#33e650"); break;
    case "bot": p.rect(sx - 2, y - 5, 5, 5, "#83769c"); p.rect(sx - 2, y - 5, 5, 1, "#a89cc0"); p.px(sx, y - 3, "#29adff"); p.px(sx, y - 7, "#ff5d7d"); break;
    case "donut": p.disc(sx, y - 3, 3, "#ff9ec2"); p.px(sx, y - 3, "#0c0820"); p.px(sx - 1, y - 5, "#33e650"); p.px(sx + 1, y - 4, "#3bb6ff"); break;
    case "vinyl": p.disc(sx, y - 3, 3, "#181818"); p.px(sx, y - 3, "#e23b4e"); p.px(sx - 2, y - 3, "#3a3a3a"); break;
    case "taco": p.rect(sx - 3, y - 4, 6, 3, "#e2b06a"); p.rect(sx - 3, y - 2, 6, 1, "#c0392b"); p.px(sx - 2, y - 3, "#33e650"); p.px(sx + 1, y - 3, "#33e650"); break;
    case "moth": p.disc(sx, y - 4, 2, "#d9c48a"); p.px(sx - 2, y - 5, "#f0e6c0"); p.px(sx + 2, y - 5, "#f0e6c0"); p.px(sx - 2, y - 3, "#c9b070"); p.px(sx + 2, y - 3, "#c9b070"); break;
    case "sprite": p.ball(sx, y - 4, 2, "#7fffe6"); p.px(sx - 2, y - 4, "#bafff2"); p.px(sx + 2, y - 5, "#bafff2"); break;
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
