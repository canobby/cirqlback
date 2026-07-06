// CIRQL CITY — the walkable town hub (Phase B pivot).
//
// The flagship's front is no longer a menu: it's a top-down, Zelda-style Main Street
// you walk around. Shop fronts are doors that launch the arcade's cabinet mini-games
// (the café is Cuppa Rush, the record store is Spin City…), and archways along the
// street are GATES into the five side-scroller districts where you fight BLANDCO and
// revive the town. This module is the town's data: its collision map, its shops
// (mapped to real cabinet routes) and its district gates. The engine paints + walks it.

import { DISTRICTS } from "./cirql-city-levels";

export const TT = 16;                  // town tile size
export const TOWN_W = 84;              // tiles wide
export const TOWN_H = 22;              // tiles tall
export const TOP_B = 7;                // rows 0..6 = top buildings; walkable band starts here
export const BOT_B = 16;               // rows 16..21 = bottom buildings; walkable band ends at 15

export interface TownShop { cx: number; side: "top" | "bottom"; label: string; route: string; accent: string }
export interface TownGate { cx: number; index: number }
export interface TownDoor { tx: number; ty: number; kind: "shop" | "gate"; label: string; route?: string; index?: number; accent: string }
export interface BuiltTown { W: number; H: number; solids: Uint8Array[]; shops: TownShop[]; gates: TownGate[]; doors: TownDoor[]; spawnTx: number; spawnTy: number }

// shop fronts → real cabinet mini-games (walk into the door to play)
const SHOPS: TownShop[] = [
  { cx: 16, side: "top", label: "CAFE", route: "/play/cuppa", accent: "#ffb020" },
  { cx: 32, side: "top", label: "PIZZA", route: "/play/slice-route", accent: "#ff5d7d" },
  { cx: 48, side: "top", label: "DONUTS", route: "/play/dozen", accent: "#ffa300" },
  { cx: 64, side: "top", label: "RECORDS", route: "/play/spin-city", accent: "#b79bff" },
  { cx: 8, side: "bottom", label: "THRIFT", route: "/play/rummage", accent: "#ffd24a" },
  { cx: 18, side: "bottom", label: "WASH", route: "/play/spin-cycle", accent: "#ff8ab5" },
  { cx: 28, side: "bottom", label: "BAKERY", route: "/play/fresh-batch", accent: "#ff5d7d" },
  { cx: 38, side: "bottom", label: "SCOOPS", route: "/play/sundae-stack", accent: "#3bb6ff" },
  { cx: 48, side: "bottom", label: "TACOS", route: "/play/taco-stack", accent: "#33e650" },
  { cx: 58, side: "bottom", label: "TOOLS", route: "/play/fix-it", accent: "#3bb6ff" },
  { cx: 68, side: "bottom", label: "CANDY", route: "/play/gumball", accent: "#ff8ab5" },
  { cx: 78, side: "bottom", label: "TOYS", route: "/play/claw", accent: "#ffd24a" },
];

// gates → the five side-scroller districts
const GATES: TownGate[] = [
  { cx: 8, index: 0 }, { cx: 24, index: 1 }, { cx: 40, index: 2 }, { cx: 56, index: 3 }, { cx: 72, index: 4 },
];

export function buildTown(): BuiltTown {
  const W = TOWN_W, H = TOWN_H;
  const solids = Array.from({ length: H }, () => new Uint8Array(W));
  for (let y = 0; y < TOP_B; y++) for (let x = 0; x < W; x++) solids[y][x] = 1;      // top building block
  for (let y = BOT_B; y < H; y++) for (let x = 0; x < W; x++) solids[y][x] = 1;      // bottom building block
  for (let y = 0; y < H; y++) { solids[y][0] = 1; solids[y][W - 1] = 1; }            // side walls

  const doors: TownDoor[] = [];
  for (const g of GATES) {
    for (let y = 0; y < TOP_B; y++) for (let x = g.cx - 1; x <= g.cx + 1; x++) if (x > 0 && x < W - 1) solids[y][x] = 0;   // carve a channel north
    doors.push({ tx: g.cx, ty: TOP_B, kind: "gate", label: DISTRICTS[g.index].name, index: g.index, accent: DISTRICTS[g.index].accent });
  }
  for (const s of SHOPS) doors.push({ tx: s.cx, ty: s.side === "top" ? TOP_B : BOT_B - 1, kind: "shop", label: s.label, route: s.route, accent: s.accent });

  return { W, H, solids, shops: SHOPS, gates: GATES, doors, spawnTx: 5, spawnTy: 11 };
}
