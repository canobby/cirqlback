// Grounding knowledge for the CIRQL Fountain Oracle and the ring NPCs.
//
// The Oracle (the CIRQL Fountain, which lives in the Town / your home ring) is the
// world's information hub — a kind, mythic guide you can ask "anything about
// CIRQLSPHERE": how the world works AND its lore. Ring NPCs are AI-driven too but
// SCOPED — each only knows about ITS OWN island (plus vague rumours of neighbours)
// and refers the player back to the fountain for anything beyond their realm.
//
// Grounding sources: the canonical story bible (docs/cirql/CIRQLSPHERE-The-Rekindling.md,
// read + cached at first use) + a compact "what you can do right now" how-to + a
// per-ring registry authored here so scoping is exact.
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Who is speaking. The fountain Oracle knows everything; an NPC is scoped to a ring.
export type OracleSpeaker =
  | { kind: "oracle" }
  | { kind: "npc"; ring: RingId; name: string; role: string };

export type RingId = "meadow" | "shroom" | "desert" | "cirqlspace";

export function isRingId(v: unknown): v is RingId {
  return v === "meadow" || v === "shroom" || v === "desert" || v === "cirqlspace";
}

// ---- the ring registry: what each island IS, its cast, charm, and rumours ----
// Kept short and mythic. An NPC is grounded ONLY in its own ring entry (+ rumours);
// the Oracle sees all of them as the world map.
interface RingLore {
  id: RingId;
  island: string;        // the island's proper name
  route: string;         // where to walk to see it
  what: string;          // one-paragraph sense of the place
  cast: string;          // the folk who live there
  charm: string;         // what's lovely / worth noticing
  rumours: string[];     // vague, mythic hints an NPC here might have "heard" of elsewhere
}

const RINGS: Record<RingId, RingLore> = {
  meadow: {
    id: "meadow",
    island: "Cloverfield",
    route: "/tile-lab",
    what: "The first green meadow ring — rolling clover in the sea, a cozy hamlet with an inn, a windmill, and cottages. At its heart stands the CIRQL Fountain, the island's wellspring of light, with the spinning CIRQLBACK emblem turning above it. This is the friendly starter shore, mostly remembered and bright.",
    cast: "Bram, the farmer who works the open meadow; Finn, the fisher down by the water. Sheep and chickens wander the fields.",
    charm: "Clover and wildflowers, grazing sheep, the turning windmill, and the fountain's warm glow at the centre.",
    rumours: [
      "Sailors speak of a twilight wood on an outer ring where the mushrooms glow like lanterns.",
      "They say every island keeps its own wellspring, but only the Town and your own home ring hold a true CIRQL Fountain.",
    ],
  },
  shroom: {
    id: "shroom",
    island: "The Shroomwood",
    route: "/cirqlsphere  (or /tile-lab?biome=shroom)",
    what: "A twilight fungal grove ring — dusky teal moss underfoot, giant luminous mushrooms with soft neon halos, a glowing pool called Mistmere at its heart. A mushroom-cap village, Shroom Hollow, clusters around a rustic well, with a tended mushroom farm and a bonfire gathering-spot, the Ember Ring. Being a wild island, it has NO CIRQL Fountain — only the Town does.",
    cast: "Mycel, the village keeper at the plaza; Spora, the fisher out on the pond pier; Bramble, the forager at the grove edge. Ducks, frogs, snails and little shroomlings live here.",
    charm: "Glowing purple-and-red caps, the cyan shimmer of Mistmere, drifting spores, and the warm bonfire at the Ember Ring.",
    rumours: [
      "Travellers arrive by the southern dock, muttering about a bright green meadow ring closer to the centre.",
      "The elders say the fountain in the Town can answer questions no forager here could.",
    ],
  },
  desert: {
    id: "desert",
    island: "The Dunes",
    route: "/dunes  (or /tile-lab?biome=desert)",
    what: "A warm desert ring of rolling sand around a bright blue OASIS called Sunmere, ringed by a green halo of acacia and palms. An adobe caravan town, Sandreach, clusters near a paved well plaza; a nomad campfire (the Ember Camp) burns out on the open sand; and a rocky sandstone MESA rises to the northeast with a lookout on top and a cave at its foot. Being a wild island, it has NO CIRQL Fountain — only the Town does.",
    cast: "Sahra, the well-keeper at the plaza; Kesh, the camel-herder by the oasis; Tamm, the wayfarer at the campfire. Camels rest in the shade and scarab beetles cross the dunes.",
    charm: "The bright oasis against endless sand, the green acacia halo, camels dozing, the sandstone mesa catching the light, and the cave beckoning at its base.",
    rumours: [
      "Caravans passing through speak of a green meadow ring and a glowing mushroom wood nearer the world's heart.",
      "The well-keeper says the deep questions belong to the CIRQL Fountain in the Town, not to a desert well.",
    ],
  },
  cirqlspace: {
    id: "cirqlspace",
    island: "CIRQLSPACE",
    route: "/cirqlsphere is the Shroomwood; the home ring is /tile-lab?cirqlspace",
    what: "Your own island — the innermost ring, ring 0. It begins small and blank: just the ring, its beach, and your own small CIRQL Fountain (your personal spark) at the centre. It is a canvas you light and build, growing outward as you go.",
    cast: "It's yours — quiet for now, waiting to be filled.",
    charm: "The blank possibility of it, and your own little wellspring glowing at the heart.",
    rumours: [
      "Beyond your shore lie the relit islands — Cloverfield's green meadow, the Shroomwood's glow, and darker rings still lost to the grey.",
    ],
  },
};

// ---- how-to: what a player can actually DO in the world right now ----
// Kept honest to the built experience so the Oracle never over-promises. The wider
// story (combat, dungeons, sailing) lives in the bible as the vision/lore, which the
// Oracle may speak of as "the tale" while being clear about what you can do today.
const HOW_TO = `WHAT YOU CAN DO RIGHT NOW (the walkable world):
- MOVE with the arrow keys or WASD; you wander the island freely.
- TALK to a villager or the Fountain by standing close and pressing E (or Space), or tapping the Talk button.
- EXPLORE each ring-island: its village, its water, its groves and gathering-spots.
- Visit the islands by their routes: Cloverfield the meadow, the Shroomwood, your own CIRQLSPACE home ring.

HOW THE WORLD WORKS (plain terms, for a curious visitor):
- CIRQLSPHERE is a sea of ring-shaped islands rippling out from the First Spark at the centre.
- You are a newly-lit spark; your calling is The Rekindling — bringing light and colour back to islands the grey has forgotten.
- SPARQS are motes of the First Light — the world's currency; spending one shares a little creation.
- RENOWN is how brightly the world remembers you; it grows as you help.
- WORLD ENERGY is the shared light everyone feeds together.
- CIRQLBACK is the Bridge: light passed in the REAL world — a kindness, a visit to a neighbourhood shop, a tap — becomes light here. Real generosity helps relight the islands.
- The Fountain (this Oracle) is Mnemos's gift, the world remembering itself; ask it about the world, the story, or how to find your way.
- THE EVERTURN: the wordless spinning emblem turning above every true CIRQL Fountain — two curved arrows circling forever into each other. It is the world's holy sign, meaning "light given always comes back around" (the heart of "circling back"). If a traveller asks what that turning mark above the fountain is, tell them it's the Everturn.`;

// ---- resolve + cache the story bible markdown ----
function docsDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, "..", "docs", "cirql"),
    resolve(process.cwd(), "docs", "cirql"),
  ];
  return candidates.find((d) => existsSync(d)) || candidates[0];
}

// Strip the markdown tables/images/HR noise that costs tokens without adding meaning
// for the model, and collapse blank runs.
function trimBible(md: string): string {
  return md
    .replace(/^!\[[^\]]*\]\([^)]*\)\s*$/gm, "")
    .replace(/^\s*\|.*\|\s*$/gm, "")   // drop the "every mechanic is lore" table rows
    .replace(/^\s*-{3,}\s*$/gm, "")     // horizontal rules
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

let bibleCache: string | null = null;
function storyBible(): string {
  if (bibleCache !== null) return bibleCache;
  const p = resolve(docsDir(), "CIRQLSPHERE-The-Rekindling.md");
  try {
    bibleCache = existsSync(p) ? trimBible(readFileSync(p, "utf8")) : "";
  } catch (err) {
    console.error("cirql-oracle-knowledge: failed to read the story bible:", err);
    bibleCache = "";
  }
  return bibleCache;
}

function ringBlock(r: RingLore): string {
  return `ISLAND: ${r.island} (${r.route})
${r.what}
Who lives there: ${r.cast}
Worth noticing: ${r.charm}`;
}

// The Oracle's grounding: the whole world — story bible + how-to + every island.
export function oracleKnowledge(): string {
  const rings = (Object.values(RINGS) as RingLore[]).map(ringBlock).join("\n\n");
  return `=== THE WORLD OF CIRQLSPHERE (story bible) ===
${storyBible()}

=== HOW THINGS WORK ===
${HOW_TO}

=== THE ISLANDS (the sea-chart) ===
${rings}`;
}

// A ring NPC's grounding: ONLY their island, plus vague rumours of elsewhere, plus a
// tiny slice of world how-to so they can point a lost visitor at the basics.
export function npcKnowledge(ring: RingId): string {
  const r = RINGS[ring];
  return `=== YOUR ISLAND ===
${ringBlock(r)}

=== RUMOURS YOU'VE HEARD (vague, second-hand — you have NOT seen these places) ===
${r.rumours.map((x) => `- ${x}`).join("\n")}

=== A FEW THINGS EVERY VISITOR SHOULD KNOW ===
- You move with the arrow keys or WASD, and talk to folk by pressing E (or Space) nearby.
- CIRQLSPHERE is a sea of ring-islands; travellers are new-lit sparks bringing light back to the world.
- For anything beyond your own island — the wider story, the Makers, the grey, or another shore — send them to the CIRQL Fountain in the Town, whose Oracle knows all of it.`;
}

// The island's proper name for a ring (used to introduce a scoped NPC).
export function islandName(ring: RingId): string {
  return RINGS[ring].island;
}

export { RINGS };
