// CIRQLSPACE — the build catalog (CHR-259 → CHR-272, Phase B).
//
// Everything you place on YOUR CIRQLSPACE to make it yours (Stardew / Animal-Crossing /
// 2D-Minecraft lineage). Items are bought with SPARQS and placed by tap; nature/structure
// items render as real pixel props (reusing the engine's drawTree/drawPond/… so they look
// like the world), the rest as charming emoji glyphs — so new items are cheap to add.
// Placements persist in the `cirql` save; presence broadcasts them so friends can visit.
// Décor is CIRQLSPACE-only (ring 0) and can't be placed anywhere else.

// How an item draws in-world. "glyph" = emoji (default, non-solid). The others reuse the
// engine's pixel art; solids are walked-around (see the engine's decor collision).
export type DecorRender =
  | "glyph" | "path" | "flower" | "lantern" | "crystal"   // non-solid
  | "stone" | "fence" | "tree" | "bush" | "pond";         // solid (or walk-around)

export type DecorCategory = "nature" | "paths" | "structures" | "furniture" | "lights" | "special";

export interface DecorDef {
  id: string;
  name: string;
  glyph: string;             // palette icon; also the in-world art when render = "glyph"
  price: number;             // sparqs (0 = free starter)
  category: DecorCategory;
  render?: DecorRender;      // default "glyph"
  scale?: number;            // glyph size multiplier
  big?: boolean;             // larger tree / rock / crystal
  accent?: string;           // tint for flower / lantern / crystal
}

export const CATEGORIES: { key: DecorCategory; label: string; icon: string }[] = [
  { key: "nature", label: "Nature", icon: "🌿" },
  { key: "paths", label: "Paths", icon: "🧱" },
  { key: "structures", label: "Build", icon: "🚧" },
  { key: "furniture", label: "Decor", icon: "🪑" },
  { key: "lights", label: "Lights", icon: "🏮" },
  { key: "special", label: "Special", icon: "✨" },
];

export const DECOR: DecorDef[] = [
  // ---- Nature (real pixel props) ----
  { id: "tree",      name: "Tree",           glyph: "🌳", price: 8,  category: "nature", render: "tree" },
  { id: "bigtree",   name: "Great Tree",     glyph: "🌲", price: 12, category: "nature", render: "tree", big: true },
  { id: "bush",      name: "Bush",           glyph: "🌿", price: 5,  category: "nature", render: "bush" },
  { id: "boulder",   name: "Boulder",        glyph: "🪨", price: 6,  category: "nature", render: "stone", big: true },
  { id: "stone",     name: "Stone",          glyph: "🪨", price: 3,  category: "nature", render: "stone" },   // (kept id — building block)
  { id: "pond",      name: "Pond",           glyph: "💧", price: 20, category: "nature", render: "pond" },
  { id: "flower",    name: "Pink Flowers",   glyph: "🌸", price: 4,  category: "nature", render: "flower", accent: "#ff8fbf" },
  { id: "flower-gold", name: "Gold Flowers", glyph: "🌼", price: 4,  category: "nature", render: "flower", accent: "#ffd24a" },
  { id: "flower-blue", name: "Blue Flowers", glyph: "🪻", price: 4,  category: "nature", render: "flower", accent: "#8fd0ff" },
  { id: "toadstool", name: "Toadstools",     glyph: "🍄", price: 5,  category: "nature", render: "glyph" },
  { id: "topiary",   name: "Topiary",        glyph: "🌳", price: 10, category: "nature", render: "glyph", scale: 1.2 },

  // ---- Paths & ground (walkable) ----
  { id: "pathbrick", name: "Path Bricks",    glyph: "🧱", price: 2,  category: "paths", render: "path" },

  // ---- Structures (solid build pieces) ----
  { id: "fence",     name: "Fence",          glyph: "🚧", price: 3,  category: "structures", render: "fence" },
  { id: "arch",      name: "Rose Arch",      glyph: "⛩️", price: 16, category: "structures", render: "glyph", scale: 1.2 },
  { id: "bridge",    name: "Bridge",         glyph: "🌉", price: 18, category: "structures", render: "glyph", scale: 1.3 },
  { id: "gate",      name: "Garden Gate",    glyph: "🚪", price: 10, category: "structures", render: "glyph" },
  { id: "tower",     name: "Little Tower",   glyph: "🏰", price: 30, category: "structures", render: "glyph", scale: 1.4 },
  { id: "windmill",  name: "Windmill",       glyph: "🌾", price: 26, category: "structures", render: "glyph", scale: 1.3 },

  // ---- Furniture & décor ----
  { id: "bench",     name: "Garden Bench",   glyph: "🪑", price: 0,  category: "furniture", render: "glyph" },
  { id: "planter",   name: "Flower Planter", glyph: "🪴", price: 6,  category: "furniture", render: "glyph" },
  { id: "picnic",    name: "Picnic Set",     glyph: "🧺", price: 8,  category: "furniture", render: "glyph" },
  { id: "birdhouse", name: "Birdhouse",      glyph: "🐦", price: 12, category: "furniture", render: "glyph" },
  { id: "banner",    name: "Bright Banner",  glyph: "🚩", price: 8,  category: "furniture", render: "glyph", scale: 1.1 },
  { id: "statue",    name: "Stone Statue",   glyph: "🗿", price: 18, category: "furniture", render: "glyph", scale: 1.2 },
  { id: "fountain",  name: "Fountain",       glyph: "⛲", price: 24, category: "furniture", render: "glyph", scale: 1.3 },
  { id: "mailbox",   name: "Mailbox",        glyph: "📮", price: 6,  category: "furniture", render: "glyph" },

  // ---- Lights ----
  { id: "lantern",   name: "Lantern Post",   glyph: "🏮", price: 8,  category: "lights", render: "lantern", accent: "#ffc46b" },
  { id: "campfire",  name: "Campfire",       glyph: "🔥", price: 10, category: "lights", render: "glyph" },
  { id: "fairylights", name: "Fairy Lights", glyph: "✨", price: 8,  category: "lights", render: "glyph" },
  { id: "torch",     name: "Torch",          glyph: "🕯️", price: 4,  category: "lights", render: "glyph" },

  // ---- Special (fun SPARQS sinks) ----
  { id: "crystal",   name: "Wishing Crystal", glyph: "💎", price: 14, category: "special", render: "crystal", accent: "#b26cff" },
  { id: "rainbow",   name: "Rainbow",        glyph: "🌈", price: 40, category: "special", render: "glyph", scale: 1.5 },
  { id: "star",      name: "Fallen Star",    glyph: "⭐", price: 30, category: "special", render: "glyph", scale: 1.3 },
  { id: "portal-deco", name: "Mystic Ring",  glyph: "🌀", price: 35, category: "special", render: "glyph", scale: 1.3 },

  // ---- Milestone F: per-shop EXCLUSIVES (sold only by their shopkeeper) ----
  // Garden & Grove
  { id: "sunflower", name: "Sunflowers",     glyph: "🌻", price: 6,  category: "nature", render: "glyph", scale: 1.1 },
  { id: "beehive",   name: "Bee Skep",       glyph: "🐝", price: 18, category: "nature", render: "glyph", scale: 1.1 },
  // Timber & Stone
  { id: "signpost",  name: "Signpost",       glyph: "🪧", price: 8,  category: "structures", render: "glyph" },
  { id: "watchtower", name: "Watchtower",    glyph: "🗼", price: 34, category: "structures", render: "glyph", scale: 1.5 },
  // The General Store
  { id: "clock",     name: "Town Clock",     glyph: "🕰️", price: 22, category: "furniture", render: "glyph", scale: 1.2 },
  { id: "streetlamp", name: "Street Lamp",   glyph: "💡", price: 12, category: "lights", render: "glyph" },
  // Curios & Wonders (rare; some Renown-gated — see cirql-shops SHOP_GATE)
  { id: "moon",      name: "Crescent Moon",  glyph: "🌙", price: 45, category: "special", render: "glyph", scale: 1.4 },
  { id: "comet",     name: "Comet",          glyph: "☄️", price: 50, category: "special", render: "glyph", scale: 1.4 },
  { id: "hourglass", name: "Hourglass",      glyph: "⏳", price: 28, category: "special", render: "glyph", scale: 1.1 },
  { id: "snowglobe", name: "Snow Globe",     glyph: "🔮", price: 24, category: "special", render: "glyph", scale: 1.2 },
  { id: "wishlantern", name: "Wish Lantern", glyph: "🏮", price: 20, category: "special", render: "lantern", accent: "#ff8fbf" },
  { id: "royalcrown", name: "Royal Crown",   glyph: "👑", price: 80, category: "special", render: "glyph", scale: 1.3 },
];

export const decorById: Record<string, DecorDef> = Object.fromEntries(DECOR.map((d) => [d.id, d]));
export const decorPriceKey = (id: string) => `decor:${id}`;   // owned-key namespace (shares the `owned` set)
// solid render kinds (walked around); the rest are walk-through / ground
export const DECOR_SOLID: Record<string, boolean> = { stone: true, fence: true, tree: true, bush: true, pond: true };
