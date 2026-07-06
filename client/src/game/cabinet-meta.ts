// cabinet-meta — genre + a one-line "how to play" for every game, powering the lobby's
// category rail and the per-game info panel. Keyed by cabinet id (and "cirqlcity" for
// the flagship). Kept separate from cabinet-covers so the big cover painters stay tidy.

export interface Category { id: string; name: string; accent: string }
export const CATEGORIES: Category[] = [
  { id: "all", name: "All Games", accent: "#b79bff" },
  { id: "adventure", name: "Adventure", accent: "#ffd24a" },
  { id: "action", name: "Action", accent: "#ff5d7d" },
  { id: "puzzle", name: "Puzzle", accent: "#3bb6ff" },
  { id: "blast", name: "Blast", accent: "#33e650" },
  { id: "speed", name: "Speed", accent: "#ff8a3d" },
  { id: "carnival", name: "Carnival", accent: "#ff8ab5" },
  { id: "beat", name: "Beat", accent: "#7be0ff" },
];

// The top-level "shelf" — an ERA axis, orthogonal to the genre categories above.
// Existing cabinets are homages to CLASSIC arcade games; the incoming wave are modern
// hits retro-fitted to 16-bit. Favorites is the player's own pinned shelf.
export type Era = "classic" | "modern";
export interface EraTab { id: string; name: string; accent: string }
export const ERAS: EraTab[] = [
  { id: "all", name: "All", accent: "#b79bff" },
  { id: "classic", name: "Classic", accent: "#ffd24a" },
  { id: "modern", name: "Modern", accent: "#3bb6ff" },
  { id: "favorites", name: "Favorites", accent: "#ff8ab5" },
];

export interface Meta { cat: string; howto: string; era?: Era }
/** A cabinet's era; defaults to "classic" (every game built so far is a classic homage). */
export function eraFor(id: string): Era { return CABINET_META[id]?.era || "classic"; }
export const CABINET_META: Record<string, Meta> = {
  cirqlcity: { cat: "adventure", howto: "Run & jump through Main Street, light every shop by bonking its sign, then CLOSE THE CIRQL to blaze the whole street back to life. This is the flagship — your rewards and progress live here." },
  cuppa: { cat: "action", howto: "Serve coffee down the counters and catch the empties sliding back — clear each rush before a regular reaches the bar." },
  slice: { cat: "action", howto: "Ride the street lobbing pizzas at the matching porches; take the risky fork for double points and dodge the traffic." },
  rummage: { cat: "action", howto: "Grab every find in the reshuffling thrift maze; snag an outfit power-up to turn the tables on the shoppers." },
  dozen: { cat: "action", howto: "Arc-hop across the donut pyramid flipping each crate to SOLD; dodge the inspector and mix your glazes right." },
  batch: { cat: "action", howto: "Climb the oven girders and ladders to the top shelf, jumping the rolling pie-tins; grab a rolling pin to smash them." },
  sundae: { cat: "puzzle", howto: "Stack the falling scoops, clear lines, and match a full flavour row for a 2x combo while you fill the ship-N goal." },
  spincity: { cat: "action", howto: "Roll a record through the course to the turntable using momentum and speed-strips; beat the needle-drop timer." },
  taco: { cat: "action", howto: "Walk the platforms and ladders nudging ingredient layers down to build tacos; lime the chili foes for a fiesta." },
  fixit: { cat: "action", howto: "Climb the window grid patching broken panes while dodging the wrecker's bricks; grab the golden hammer for a cross-fix." },
  spincycle: { cat: "puzzle", howto: "Aim and fire bubbles to pop match-3 clusters before the drum descends; a rare bleach bomb clears a whole colour." },
  boba: { cat: "action", howto: "Fire a boba bubble to trap a sour-drop, then jump in to pop it for a pearl; chain pops for a flavour combo." },
  pill: { cat: "puzzle", howto: "Drop two-tone capsules and line up FOUR of a colour to clear them — germs of that colour pop too; chain for combos." },
  swatch: { cat: "puzzle", howto: "Cycle the falling paint-chip stack and match three in any direction; four different shades in one drop is a bonus." },
  deli: { cat: "carnival", howto: "Slide to a stool and SERVE the stacked orders before patience runs out; back-to-back finishes build a rush combo." },
  stackem: { cat: "carnival", howto: "Tap DROP to land each sliding pancake dead-centre; a perfect stack keeps the full width and builds a combo." },
  frost: { cat: "action", howto: "Shove blocks of ice so they slide and squash the crawling crabs; catch two in a line for a frost combo." },
  lastcall: { cat: "carnival", howto: "Tap to lock your aim, tap again for power, then roll into the target rings; two big rolls light the loyalty jackpot." },
  snip: { cat: "puzzle", howto: "Snip the thread at the right moment so the button arcs into the notions jar; sweep up the loose beads on the way." },
  cobbler: { cat: "action", howto: "Tunnel the leather stockroom and PUMP the moths three times till they pop, or undermine a shoe box to flatten them." },
  static: { cat: "action", howto: "Hop the device across the spark-belt counters, then ride the circuit-boards over the solder rivers to fill the fix-bays." },
  pedal: { cat: "speed", howto: "The bike auto-runs: HOP the cones and gaps, hit ramps for air, and hold BOOST inside the green SHIFT window for speed." },
  grease: { cat: "speed", howto: "Steer the winding highway, weave the traffic, blast the wax strips for a boost, and beat the clock to each checkpoint." },
  sudsy: { cat: "speed", howto: "Alternate the two SCRUB buttons as fast as you can to clean a car before it rolls out; a steady rhythm scrubs harder." },
  gumball: { cat: "carnival", howto: "Slide the jar to catch every falling gumball and DODGE the sour bombs; grab the rainbow jawbreaker for a fortune." },
  harvest: { cat: "blast", howto: "Hold FIRE to dust the weaving crop-pest swarms, weave their bombs, and pop a limited SPRAY to clear the screen." },
  greenthumb: { cat: "blast", howto: "Blast the caterpillar winding down the trellis; tag a middle segment and it SPLITS in two — clear every segment." },
  bloom: { cat: "action", howto: "Plant SEED-BOMBS that burst in a cross to clear weeds and pests; grab fertiliser for a bigger, chaining bloom." },
  bark: { cat: "action", howto: "Herd the fleeing pups into the pen — they run from you, so nudge them with your body and drop a TREAT to lure a cluster." },
  sprout: { cat: "carnival", howto: "TAP the veggie-thieving gophers before they duck back — but not the fluffy bunny; a gold gopher is worth double." },
  brick: { cat: "blast", howto: "Run the battlements laying BRICK to plug the gaps before a catapult rock gets through to your keep; sieges escalate." },
  mixtape: { cat: "beat", howto: "Tap the matching lane (left/mid/right) as each note hits the needle; keep the mix meter up and chain a hot streak." },
  claw: { cat: "carnival", howto: "Time the DROP so the claw lands dead-centre on a plush; the golden jackpot plush pays big, and streaks stack." },
  plink: { cat: "carnival", howto: "Aim the chute and DROP a token; it pinballs down the pegs into a slot — the centre and the lit JACKPOT pay big." },
  pinpals: { cat: "carnival", howto: "Work the two flippers to keep the ball alive off the bumpers; light every bumper for MULTIBALL and the jackpot." },
  punch: { cat: "beat", howto: "Read the tell and DODGE the way the arrow points, then JAB the opening; string clean dodges to charge a STAR punch." },
  // ---- modern wave ----
  nightshift: { cat: "action", era: "modern", howto: "You don't aim — just MOVE and your spatula auto-slings at the nearest gremlin. Grab the tips they drop to LEVEL UP and pick an upgrade; dodge with DASH and survive the swarm till the 6 AM dawn." },
  flutter: { cat: "action", era: "modern", howto: "Tap FLAP to give the escaped parakeet a little lift; gravity does the rest. Thread the gaps between the shop awnings — clip one (or the pavement) and the run's over. How far can you get?" },
  sugarswap: { cat: "puzzle", era: "modern", howto: "Swap two neighbouring candies to line up three or more of a colour — they pop, the rest tumble down, and fresh candies rain in, chaining any new matches into a COMBO. Longer lines pay more. Score big before your swaps run out. Pad + SWAP, or just tap two candies." },
};

export function metaFor(id: string): Meta { return CABINET_META[id] || { cat: "action", howto: "" }; }
