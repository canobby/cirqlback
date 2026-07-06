// CIRQL CITY — townsfolk & quests (Phase B depth).
//
// The town isn't just shops and gates: NPCs stand around Main Street and hand out
// simple quests that mirror REAL Cirqlback actions — play the shop mini-games, revive
// a district, collect Cirql Coins, and (the on-brand one) visit real local businesses.
// Progress is tracked from gameplay the player is already doing, persists in the save,
// and pays out Cirql Coins. This is the "living world" layer over the walkable hub.

export type QuestKind = "playShops" | "collectCoins" | "reviveDistrict" | "visitReal";

export interface QuestDef {
  id: string;
  giver: string;          // NPC display name
  title: string;
  ask: string[];          // dialog lines while active (kept short for the pixel font)
  done: string[];         // dialog lines once complete
  kind: QuestKind;
  goal: number;
  reward: number;         // Cirql Coins paid on claim
}

export interface NpcDef { cx: number; ty: number; name: string; color: string; questId: string }

export const QUESTS: QuestDef[] = [
  { id: "q_play", giver: "MAYOR PIP", title: "OPEN FOR BUSINESS", ask: ["PLAY 3 SHOP GAMES TO", "WAKE MAIN STREET UP!"], done: ["MAIN STREET IS BUZZING", "AGAIN - THANK YOU!"], kind: "playShops", goal: 3, reward: 50 },
  { id: "q_coins", giver: "LILA", title: "COIN HUNT", ask: ["GRAB 20 CIRQL COINS", "OUT IN THE DISTRICTS."], done: ["YOU FOUND THEM ALL!", "SHINY!"], kind: "collectCoins", goal: 20, reward: 40 },
  { id: "q_boss", giver: "ROSA", title: "PUSH BACK BLANDCO", ask: ["REVIVE A WHOLE DISTRICT", "BY BEATING ITS BOSS."], done: ["A DISTRICT REBORN!", "BLANDCO IS SHAKING."], kind: "reviveDistrict", goal: 1, reward: 100 },
  { id: "q_real", giver: "SAM", title: "SHOP LOCAL", ask: ["VISIT 2 REAL LOCAL", "SHOPS AROUND TOWN."], done: ["THANKS FOR SHOPPING", "LOCAL - IT MATTERS!"], kind: "visitReal", goal: 2, reward: 60 },
];

export const NPCS: NpcDef[] = [
  { cx: 13, ty: 12, name: "MAYOR PIP", color: "#ffd24a", questId: "q_play" },
  { cx: 35, ty: 10, name: "LILA", color: "#3bb6ff", questId: "q_coins" },
  { cx: 52, ty: 13, name: "ROSA", color: "#ff5d7d", questId: "q_boss" },
  { cx: 70, ty: 11, name: "SAM", color: "#33e650", questId: "q_real" },
];

export const questById = (id: string): QuestDef | undefined => QUESTS.find((q) => q.id === id);
