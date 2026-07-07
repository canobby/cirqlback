// CIRQL — NPC looks (world-population polish).
//
// Every NPC used to be one accent-coloured rectangle with a skin dot. This gives each
// townsperson a real look: a coloured outfit with trim, hair + headwear, and a signature
// accessory (staff / lantern / book / satchel / orb / flower) that hints at who they are.
//
// The named cast (Cirqla the guide, Ferra the quest-giver) is hand-authored below; every
// other keeper derives a STABLE look from a hash of their id, so the keeper on a given
// ring always dresses the same. The engine's drawNpc() paints whatever this returns.

export type NpcHair = "short" | "long" | "bun" | "bald";
export type NpcHat = "none" | "hood" | "wideBrim" | "band" | "cap";
export type NpcAccessory = "none" | "staff" | "lantern" | "book" | "satchel" | "orb" | "flower";

export interface NpcLook {
  robe: string;                 // main outfit colour
  trim: string;                 // sash / collar / hem accent
  skin: string;
  hair: string;
  hairStyle: NpcHair;
  hat: NpcHat;
  hatColor: string;
  accessory: NpcAccessory;
  accColor: string;
  aura?: string;                // optional soft glow (special NPCs only)
}

// ---- derivation palettes (indexed by a hash of the NPC id) ----
const SKINS = ["#f4c79a", "#e8b48a", "#d29b6a", "#b47a4c", "#8a5a3a", "#f9dcc0", "#6a4630"];
const HAIRS = ["#2a1c12", "#4a3420", "#6b4a2c", "#8a6a3a", "#b6b6c4", "#d7d7e2", "#3a2a4a", "#6a2a2a", "#2a3a5a"];
const ROBES = ["#3a5aa0", "#8a3a5a", "#2f7a5a", "#7a4fd0", "#b0562a", "#2a6a8a", "#6a2a4a", "#4a6a2a", "#8a6a2a", "#3a3a5a", "#2a7a6a", "#a04a3a"];
const HAIR_STYLES: NpcHair[] = ["short", "long", "bun", "short", "long", "bald"];
const HATS: NpcHat[] = ["none", "band", "wideBrim", "cap", "none", "hood", "band"];
const ACCS: NpcAccessory[] = ["staff", "lantern", "book", "satchel", "orb", "flower", "none", "book", "lantern"];

// A tiny stable string hash → non-negative int.
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h | 0);
}
const pickAt = <T>(arr: T[], h: number, salt: number): T => arr[(Math.floor(h / (salt || 1)) % arr.length + arr.length) % arr.length];

// Hand-authored looks for the named cast (keyed by prop id).
const AUTHORED: Record<string, NpcLook> = {
  // Cirqla — the ethereal guide of CIRQLSPACE: hooded teal robe, silver hair, a glowing staff + aura.
  guide: {
    robe: "#238a86", trim: "#bafff2", skin: "#f4c79a", hair: "#cfe6ff", hairStyle: "long",
    hat: "hood", hatColor: "#1d6f6b", accessory: "staff", accColor: "#7fffe6", aura: "#35e0d0",
  },
  // Ferra — the warm quest-giver of the Town: terracotta coat with a gold band, a book of tales, a satchel-ish trim.
  keeper: {
    robe: "#b0562a", trim: "#ffd24a", skin: "#e0a878", hair: "#4a3420", hairStyle: "bun",
    hat: "band", hatColor: "#ffd24a", accessory: "book", accColor: "#f0d9a0",
  },
};

/** Resolve an NPC's look: hand-authored where we have one, else a stable hashed look.
 *  `accent` (the biome/prop accent) becomes the outfit trim so keepers nod to their ring. */
export function npcLook(id: string | undefined, accent: string): NpcLook {
  if (id && AUTHORED[id]) return AUTHORED[id];
  const h = hash(id || "npc");
  const hairStyle = pickAt(HAIR_STYLES, h, 7);
  return {
    robe: pickAt(ROBES, h, 1),
    trim: accent || "#ffd24a",
    skin: pickAt(SKINS, h, 3),
    hair: pickAt(HAIRS, h, 5),
    hairStyle,
    hat: pickAt(HATS, h, 11),
    hatColor: pickAt(ROBES, h, 13),
    accessory: pickAt(ACCS, h, 17),
    accColor: accent || "#ffd24a",
  };
}
