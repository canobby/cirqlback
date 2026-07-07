// CIRQL — Hearth décor (CHR-259, M11 "Depth & Delight").
//
// Spark-bought decorations you place on your Hearth to make the home island yours
// (Stardew / Animal Crossing lineage). Each item is a charming emoji glyph drawn at a
// world position over a soft shadow — so new décor is pure data, no per-item pixel art.
// Owned items persist in the `cirql` save (`owned`, shared with cosmetics); placements
// persist as `decor: {item,x,y}[]`. Presence broadcasts your placements so friends can
// visit your Hearth.

export interface DecorDef {
  id: string;
  name: string;
  glyph: string;   // shown in the palette; also the in-world art for "glyph" render
  price: number;   // sparqs (0 = free starter)
  scale?: number;  // glyph size multiplier (default 1)
  // in-world render: "glyph" (emoji, default) or a pixel prop. path = walkable ground;
  // stone/fence = solid pixel props you build with (the start of "2D-Minecraft" building).
  render?: "glyph" | "path" | "stone" | "fence";
}

export const DECOR: DecorDef[] = [
  // building blocks (cheap, buy many) — the start of "build your world" (2D-Minecraft)
  { id: "pathbrick", name: "Path Bricks",   glyph: "🧱", price: 2, render: "path" },   // walkable ground
  { id: "stone",     name: "Stepping Stone", glyph: "🪨", price: 3, render: "stone" },  // solid
  { id: "fence",     name: "Fence",         glyph: "🚧", price: 3, render: "fence" },   // solid
  { id: "bench",    name: "Garden Bench",   glyph: "🪑", price: 0 },
  { id: "planter",  name: "Flower Planter", glyph: "🪴", price: 6 },
  { id: "toadstool", name: "Toadstools",    glyph: "🍄", price: 6 },
  { id: "lantern",  name: "Lantern Post",   glyph: "🏮", price: 8 },
  { id: "banner",   name: "Bright Banner",  glyph: "🚩", price: 8, scale: 1.1 },
  { id: "topiary",  name: "Topiary Tree",   glyph: "🌳", price: 10, scale: 1.2 },
  { id: "campfire", name: "Campfire",       glyph: "🔥", price: 10 },
  { id: "birdhouse", name: "Birdhouse",     glyph: "🐦", price: 12 },
  { id: "crystal",  name: "Wishing Crystal", glyph: "💎", price: 14 },
  { id: "arch",     name: "Rose Arch",      glyph: "⛩️", price: 16, scale: 1.2 },
  { id: "statue",   name: "Stone Statue",   glyph: "🗿", price: 18, scale: 1.2 },
  { id: "fountain", name: "Fountain",       glyph: "⛲", price: 24, scale: 1.3 },
];

export const decorById: Record<string, DecorDef> = Object.fromEntries(DECOR.map((d) => [d.id, d]));
export const decorPriceKey = (id: string) => `decor:${id}`;   // owned-key namespace (shares the `owned` set)
