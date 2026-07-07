// CIRQL — the named NPC cast (Phase K2).
//
// Personality + system-teaching for the world's authored characters. Each profile gives
// a keeper their own VOICE (greeting + lore) and a couple of "topics" — extra dialog
// branches that teach one system (building, quests, Renown, the sea chart / fast travel,
// emotes / social). The engine's openNpcDialog looks a profile up by NPC id and feeds it
// to npcConversation (cirql-dialog), so the branching-dialog framework (K1) renders it;
// generated wilderness keepers with no profile fall back to a generic conversation.

export interface NpcProfile {
  greeting: string[];
  lore: string[];
  loreLabel?: string;
  topics?: { label: string; lines: string[] }[];
}

export const NPC_PROFILES: Record<string, NpcProfile> = {
  // Cirqla — the ethereal first-circle guide on your CIRQLSPACE. Warm, unhurried, mentoring.
  guide: {
    greeting: ["Ah — you're awake. Welcome home, little light."],
    loreLabel: "Where am I?",
    lore: [
      "This whole island is yours to shape. Open your Inventory to build — place things, paint the ground, make it your own.",
      "Fill it with life and your land will grow: a cozy garden today, a grand estate in time.",
    ],
    topics: [
      { label: "Who are you?", lines: ["I am Cirqla — a keeper of the first circle.", "I light the way for new travellers, then let them wander free."] },
      { label: "Where do I go?", lines: ["Sail south to the Town — quests, the arcade, and fellow travellers wait there.", "Beyond it, the sea widens forever. Sail out as far as your heart dares."] },
    ],
  },
  // Ferra — the warm quest-giver of the Town. Bright, encouraging, a little motherly.
  keeper: {
    greeting: ["Welcome to the Town, traveller! Ferra's the name."],
    lore: [
      "CirqlCade waits east — every Wonder within. The Commons gathers folk to the south.",
      "Quests begin with me and the other keepers. Finish them for sparqs — and Renown.",
    ],
    topics: [
      { label: "What is Renown?", lines: ["Renown is your name in the world — earned by deeds, never spent.", "Climb its ranks and the grandest campaigns open only to you."] },
      { label: "What are sparqs?", lines: ["Sparqs are the little lights you spend — on décor for your CIRQLSPACE, on finery for yourself.", "Quests, dailies and the arcade all pay them out."] },
    ],
  },
  // Marin the Cartographer — worldly, wind-blown, delighted by the map. Teaches exploration + fast travel.
  cartographer: {
    greeting: ["Charts and currents! Marin here — I map the widening sea."],
    loreLabel: "Tell me about the sea",
    lore: [
      "Tap the little map, upper corner, to open your sea chart. Every ring you reach lights up on it.",
      "The farther out you sail, the older and stranger the shore — and the richer its rewards.",
    ],
    topics: [
      { label: "Can I travel faster?", lines: ["Aye! Once you've reached the fifth ring, your chart becomes a fast-travel map.", "Tap any charted ring to leap straight there — no more re-sailing every shore."] },
      { label: "The chart's too crowded", lines: ["Use the + and − on the chart to spread the rings out or fit them all in.", "Makes finding your mark a good deal easier."] },
    ],
  },
  // Lio the Bard — playful, generous, all about company. Teaches emotes + the social loop.
  bard: {
    greeting: ["Well met! Lio's the name — songs, dances, and fine company."],
    loreLabel: "Liven things up?",
    lore: [
      "Tap the smiling face to open your emotes — wave, bow, dance, blow a kiss.",
      "Stand beside a fellow traveller and you can share a gesture together — a high-five, a hug, a dance.",
    ],
    topics: [
      { label: "Feeling lonely?", lines: ["Never, here! Share a light with a passing traveller and a lantern kindles on your CIRQLSPACE.", "Gather a whole Cirql of friends and the shared world grows brighter for everyone."] },
    ],
  },
};

export const npcProfile = (id: string): NpcProfile | undefined => NPC_PROFILES[id];
