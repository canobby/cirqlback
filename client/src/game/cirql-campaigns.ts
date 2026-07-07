// CIRQLVERSE — M9 co-op campaigns (CHR-251).
//
// Campaigns are multi-step co-op adventures a PARTY runs together, distinct from the
// solo onboarding quests (cirql-quests.ts). They reuse the same "objective label +
// world target" idea, but progress is shared across the party (tracked authoritatively
// on the server; see server/cirql-presence.ts) and the whole party sees one shared
// waypoint moving through the steps. Kept declarative so new campaigns are pure config.
//
// Steps carry an optional world target (tx,ty on CIRQLSPACE ring) so the engine can
// draw the shared waypoint + minimap marker. All current campaigns play out on ring 0.

export interface CampaignStep {
  label: string;         // what the party is doing right now
  ring?: number;         // which ring this step is on (default 0 = Hearth); off-ring the party waypoint points to the dock
  at?: string;           // a prop id resolved on `ring` (e.g. "commons", "theater") — the shared waypoint
  tx?: number;           // OR an explicit world target (Hearth ring coords) when `at` isn't used
  ty?: number;
}

export interface Campaign {
  id: string;
  title: string;
  blurb: string;
  minParty: number;
  maxParty: number;
  difficulty: "chill" | "quick" | "epic";
  newbie: boolean;       // adopts newcomers well (surfaced + filterable on the board)
  reward: number;        // sparks granted to EACH member on completion
  steps: CampaignStep[];
}

// Landmarks on CIRQLSPACE ring (mirrors cirql-world.ts prop positions) so steps can
// point the shared waypoint at real places.
const HEARTH = { x: 0, y: -70 };
const CADE = { x: 250, y: 40 };
const FERRA = { x: -60, y: 120 };
const SHORE = { x: -230, y: -20 };
const DOCK = { x: 0, y: 400 };
const LANTERNS = { x: 165, y: 55 };

export const CAMPAIGNS: Campaign[] = [
  {
    id: "lantern-vigil",
    title: "The Lantern Vigil",
    blurb: "Kindle the path together and wake CirqlCade's glow. A gentle first run for a new crew.",
    minParty: 2, maxParty: 4, difficulty: "chill", newbie: true, reward: 12,
    steps: [
      { label: "Gather at CIRQLSPACE", tx: HEARTH.x, ty: HEARTH.y },
      { label: "Light the path lanterns", tx: LANTERNS.x, ty: LANTERNS.y },
      { label: "Attune at CirqlCade", tx: CADE.x, ty: CADE.y },
      { label: "Return to Ferra together", tx: FERRA.x, ty: FERRA.y },
    ],
  },
  {
    id: "wonders-circuit",
    title: "The Wonders Circuit",
    blurb: "A quick loop of the isle — meet at the arcade, share a Wonder, regroup at home.",
    minParty: 2, maxParty: 4, difficulty: "quick", newbie: false, reward: 10,
    steps: [
      { label: "Meet at CirqlCade", tx: CADE.x, ty: CADE.y },
      { label: "Each play a Wonder", tx: CADE.x, ty: CADE.y },
      { label: "Regroup at CIRQLSPACE", tx: HEARTH.x, ty: HEARTH.y },
    ],
  },
  {
    id: "shoreline-wander",
    title: "Shoreline Wander",
    blurb: "A calm walk to the western shore and around to the dock — good for chatting and cloud-watching.",
    minParty: 2, maxParty: 5, difficulty: "chill", newbie: true, reward: 8,
    steps: [
      { label: "Walk to the western shore", tx: SHORE.x, ty: SHORE.y },
      { label: "Follow the coast to the dock", tx: DOCK.x, ty: DOCK.y },
      { label: "Wander home to CIRQLSPACE", tx: HEARTH.x, ty: HEARTH.y },
    ],
  },
  {
    id: "outer-passage",
    title: "The Outer Passage",
    blurb: "A voyage together — cross to the outer shores, catch a show at the Drive-In, and sail home. Bring a crew.",
    minParty: 2, maxParty: 5, difficulty: "epic", newbie: false, reward: 22,
    steps: [
      { label: "Gather at CIRQLSPACE Commons", ring: 0, at: "commons" },
      { label: "Sail to the next shore's Commons", ring: 1, at: "commons" },
      { label: "Catch a show at the Cirql Drive-In", ring: 2, at: "theater" },
      { label: "Sail home to CIRQLSPACE", ring: 0, at: "commons" },
    ],
  },
  {
    id: "wonders-marathon",
    title: "Wonders Marathon",
    blurb: "The long haul — circle every landmark of CIRQLSPACE ring as a full crew. Bragging rights.",
    minParty: 3, maxParty: 5, difficulty: "epic", newbie: false, reward: 20,
    steps: [
      { label: "Rally at CIRQLSPACE", tx: HEARTH.x, ty: HEARTH.y },
      { label: "March to the shore", tx: SHORE.x, ty: SHORE.y },
      { label: "On to the dock", tx: DOCK.x, ty: DOCK.y },
      { label: "Light the lantern path", tx: LANTERNS.x, ty: LANTERNS.y },
      { label: "Finish at CirqlCade", tx: CADE.x, ty: CADE.y },
    ],
  },
];

export const campaignById = (id: string): Campaign | undefined => CAMPAIGNS.find((c) => c.id === id);

// Structured, PII-free matchmaking descriptors for board posts (CHR-254 safety: no
// freeform text so nothing personal can be typed). Posters pick from these only.
export const MATCH_TAGS = ["Chill pace", "Quick run", "New players welcome", "Thorough", "No mic needed", "Friendly"] as const;
export type MatchTag = typeof MATCH_TAGS[number];

export const difficultyMeta: Record<Campaign["difficulty"], { label: string; color: string }> = {
  chill: { label: "Chill", color: "#5be89a" },
  quick: { label: "Quick", color: "#7be0ff" },
  epic: { label: "Epic", color: "#ff9d5c" },
};
