// CIRQL — worlds as config (CHR-90).
//
// A "world" is just data: a palette, ring count, arc span, and difficulty. The
// same mechanic renders every world; the procedural engine (CHR-101) will later
// emit MORE objects of this exact shape for an endless tail. Crafted "signature"
// worlds live here as the anchors.

export interface WorldConfig {
  id: string;
  name: string;
  ringColors: string[]; // palette, cycled across the rings
  accent: string;       // hex — tints the life-bloom / core glow so worlds feel distinct
  ringCount: number;    // 3–6
  span: number;         // base arc width (radians)
  difficulty: number;   // 0..1 — scales idle-drift speed now; more axes later (CHR-101)
  shiny?: boolean;      // CHR-108 — a rare, extra-radiant variant (procedural only)
}

export const CRAFTED_WORLDS: WorldConfig[] = [
  {
    id: "forest",
    name: "Forest Loop",
    ringColors: ["#38e0a6", "#5eead4", "#a3e635", "#22c55e", "#4ade80", "#2dd4bf"],
    accent: "#34d399",
    ringCount: 3,
    span: 1.18,
    difficulty: 0.2,
  },
  {
    id: "ocean",
    name: "Ocean's Return",
    ringColors: ["#3bc9ff", "#38bdf8", "#818cf8", "#22d3ee", "#60a5fa", "#7dd3fc"],
    accent: "#3bc9ff",
    ringCount: 4,
    span: 1.12,
    difficulty: 0.45,
  },
  {
    id: "ember",
    name: "Ember Ring",
    ringColors: ["#f7a63b", "#fb923c", "#ef4444", "#f59e0b", "#fca5a5", "#fdba74"],
    accent: "#f97316",
    ringCount: 5,
    span: 1.06,
    difficulty: 0.65,
  },
];

// "r,g,b" string from a #rrggbb hex — used for canvas gradient stops.
export function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}
