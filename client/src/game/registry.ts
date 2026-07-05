// CirqlCade — the game registry. One entry per game; the /arcade picker renders
// tiles from this list. Adding a game = one entry here + its code-split route.
// All games share the neon language, the gameId-keyed backend (progress + Daily
// board), and the arcade-core engine base.
//
// Games are grouped into themed "Circles" (categories) — the /arcade wheel is
// two-tier: pick a Circle, then spin its games. A game's `category` must be one
// of the ARCADE_CIRCLES ids below.

export type CircleId = "classic" | "blast" | "puzzle" | "reflex" | "skill" | "strategy" | "zen";

export interface ArcadeCircle {
  id: CircleId;
  name: string;         // display name ("Classic")
  tagline: string;      // one line shown in the wheel centre
  accent: string;       // ring glow / accent hex
  glyph: string;        // emoji/geometric marker
}

// The seven Game Circles. Order = order on the category ring.
export const ARCADE_CIRCLES: ArcadeCircle[] = [
  { id: "classic",  name: "Classic",  tagline: "Retro icons, reimagined round.", accent: "#fbbf24", glyph: "◉" },
  { id: "blast",    name: "Blast",    tagline: "Aim, fire, survive.",            accent: "#fb7185", glyph: "✦" },
  { id: "puzzle",   name: "Puzzle",   tagline: "Think it through.",              accent: "#a78bfa", glyph: "▦" },
  { id: "reflex",   name: "Reflex",   tagline: "Tap on the beat.",               accent: "#ec4899", glyph: "◈" },
  { id: "skill",    name: "Skill",    tagline: "Physics, balance, nerve.",       accent: "#38bdf8", glyph: "◎" },
  { id: "strategy", name: "Strategy", tagline: "Plan and conquer.",              accent: "#34d399", glyph: "⬡" },
  { id: "zen",      name: "Zen",      tagline: "Calm and flow.",                 accent: "#f9a8d4", glyph: "❀" },
];

export interface ArcadeGame {
  id: string;            // stable gameId (matches the backend key)
  name: string;         // display name
  genre: string;        // the classic it riffs on
  category: CircleId;   // which Game Circle it belongs to
  tagline: string;      // one line for the tile
  route: string;        // wouter path
  accent: string;       // tile glow / accent hex
  glyph: string;        // emoji marker
  status: "live" | "soon";
}

export const ARCADE_GAMES: ArcadeGame[] = [
  {
    id: "cirqlbreak",
    name: "Cirql Bounce",
    genre: "Breakout",
    category: "classic",
    tagline: "Rally the spark, shatter the rings, out-time the boss core.",
    route: "/play",
    accent: "#ec4899",
    glyph: "◐",
    status: "live",
  },
  {
    id: "defender",
    name: "Cirql Defender",
    genre: "Missile Command",
    category: "blast",
    tagline: "Rotate your shield, deflect the swarm, guard the sleeping core.",
    route: "/play/defender",
    accent: "#67e8f9",
    glyph: "🛡️",
    status: "live",
  },
  {
    id: "pop",
    name: "Cirql Pop",
    genre: "Bubble shooter",
    category: "puzzle",
    tagline: "Shoot from the centre, match three around the rings.",
    route: "/play/pop",
    accent: "#a78bfa",
    glyph: "⬤",
    status: "live",
  },
  {
    id: "spin",
    name: "Cirql Spin",
    genre: "Tetris",
    category: "puzzle",
    tagline: "Spin falling pieces into place and complete whole rings.",
    route: "/play/spin",
    accent: "#38bdf8",
    glyph: "◱",
    status: "live",
  },
  {
    id: "snake",
    name: "Cirql Snake",
    genre: "Snake",
    category: "classic",
    tagline: "Glide the neon snake across the lanes; eat, grow, don't bite yourself.",
    route: "/play/snake",
    accent: "#34d399",
    glyph: "⟿",
    status: "live",
  },
  {
    id: "bloom",
    name: "Cirql Bloom",
    genre: "Zen garden",
    category: "zen",
    tagline: "Gather light, grow a living garden of rings. No enemies. Just calm.",
    route: "/play/bloom",
    accent: "#f9a8d4",
    glyph: "❀",
    status: "live",
  },
  { id: "reactor", name: "Cirql Reactor", genre: "Simon", category: "reflex", tagline: "Watch the ring light up, then tap the pattern back. One more each round.", route: "/play/reactor", accent: "#a78bfa", glyph: "◉", status: "live" },
  { id: "chain", name: "Cirql Chain", genre: "Chain reaction", category: "reflex", tagline: "One tap sets off a cascade of light. Chain enough to clear the round.", route: "/play/chain", accent: "#fbbf24", glyph: "✸", status: "live" },
  { id: "shift", name: "Cirql Shift", genre: "Color Switch", category: "reflex", tagline: "Tap to match your colour to the next gate before you reach it.", route: "/play/shift", accent: "#34d399", glyph: "◑", status: "live" },
  { id: "dash", name: "Cirql Dash", genre: "Frogger", category: "classic", tagline: "Hop inward across spinning hazard rings to reach the centre.", route: "/play/dash", accent: "#38bdf8", glyph: "⤞", status: "live" },
  { id: "runner", name: "Cirql Runner", genre: "Endless runner", category: "classic", tagline: "Race the loop, hop the spikes and gaps. It only gets faster.", route: "/play/runner", accent: "#fb7185", glyph: "➤", status: "live" },
  { id: "invaders", name: "Cirql Invaders", genre: "Space Invaders", category: "classic", tagline: "Rotate your cannon, fire outward, clear the spiraling waves.", route: "/play/invaders", accent: "#34d399", glyph: "❋", status: "live" },
  { id: "tunnel", name: "Cirql Tunnel", genre: "Tempest", category: "blast", tagline: "Slide the rim and shoot down the lanes before they surface.", route: "/play/tunnel", accent: "#38bdf8", glyph: "◈", status: "live" },
  { id: "maze", name: "Cirql Maze", genre: "Brain game", category: "puzzle", tagline: "Rotate the rings to line up the gaps and drop the orb to the centre.", route: "/play/maze", accent: "#a78bfa", glyph: "◎", status: "live" },
  { id: "link", name: "Cirql Link", genre: "Flow", category: "puzzle", tagline: "Connect matching nodes with paths that never cross. Relaxing.", route: "/play/link", accent: "#38bdf8", glyph: "∞", status: "live" },
  { id: "orbit", name: "Cirql Orbit", genre: "Asteroids", category: "blast", tagline: "Thrust between orbits, scoop energy, dodge the black holes.", route: "/play/orbit", accent: "#a78bfa", glyph: "☄", status: "live" },
  { id: "pinball", name: "Cirql Pinball", genre: "Pinball", category: "classic", tagline: "One flipper, a round table. Keep the ball off the drain.", route: "/play/pinball", accent: "#fb7185", glyph: "⦿", status: "live" },
  { id: "race", name: "Cirql Race", genre: "Slot-car", category: "strategy", tagline: "Four racers, concentric lanes. Dive inside and boost to win.", route: "/play/race", accent: "#fbbf24", glyph: "⚑", status: "live" },
  { id: "miner", name: "Cirql Miner", genre: "Dig Dug", category: "classic", tagline: "Gobble gems on the rings, dodge the cave monsters.", route: "/play/miner", accent: "#fbbf24", glyph: "◇", status: "live" },
  { id: "claim", name: "Cirql Claim", genre: "Qix", category: "puzzle", tagline: "Claim wedges of the disc while a spark hunts the open ground.", route: "/play/claim", accent: "#38bdf8", glyph: "◔", status: "live" },
  { id: "beat", name: "Cirql Beat", genre: "Rhythm", category: "reflex", tagline: "Notes ride inward — tap the pulse the instant they hit the ring.", route: "/play/beat", accent: "#ec4899", glyph: "♪", status: "live" },
  { id: "pong", name: "Cirql Pong", genre: "Pong", category: "classic", tagline: "Guard your half, volley the ball, slip it past the AI.", route: "/play/pong", accent: "#67e8f9", glyph: "◖", status: "live" },
  { id: "whack", name: "Cirql Whack", genre: "Whack-a-mole", category: "reflex", tagline: "Tap the critters as they pop; dodge the bombs. 30 seconds.", route: "/play/whack", accent: "#34d399", glyph: "✜", status: "live" },
  { id: "reflex", name: "Cirql Reflex", genre: "Reaction", category: "reflex", tagline: "Tap the instant the ring flares. Five rounds, fastest wins.", route: "/play/reflex", accent: "#67e8f9", glyph: "⚡", status: "live" },
  { id: "pairs", name: "Cirql Pairs", genre: "Memory", category: "puzzle", tagline: "Flip the cards, find the matching pairs against the clock.", route: "/play/pairs", accent: "#a78bfa", glyph: "❒", status: "live" },
  { id: "flip", name: "Cirql Flip", genre: "Lights-Out", category: "puzzle", tagline: "Flip a segment and its neighbours; light the whole ring.", route: "/play/flip", accent: "#34d399", glyph: "◍", status: "live" },
  { id: "stack", name: "Cirql Stack", genre: "Stacker", category: "reflex", tagline: "Lock the sweeping arc; keep the overlap; stack to the centre.", route: "/play/stack", accent: "#38bdf8", glyph: "▤", status: "live" },
  { id: "gems", name: "Cirql Gems", genre: "Match-3", category: "puzzle", tagline: "Swap neighbours to line up three; chain the cascades.", route: "/play/gems", accent: "#f472b6", glyph: "◆", status: "live" },
  { id: "sweep", name: "Cirql Sweep", genre: "Minesweeper", category: "puzzle", tagline: "Read the numbers, flag the sparks, clear the disc.", route: "/play/sweep", accent: "#38bdf8", glyph: "⚑", status: "live" },
  { id: "sort", name: "Cirql Sort", genre: "Ball sort", category: "puzzle", tagline: "Pour the balls between tubes until each is one colour.", route: "/play/sort", accent: "#38bdf8", glyph: "⊚", status: "live" },
  { id: "merge", name: "Cirql Merge", genre: "2048", category: "puzzle", tagline: "Slide to merge, spin to line up. How high can you climb?", route: "/play/merge", accent: "#fbbf24", glyph: "⊞", status: "live" },
  { id: "drop", name: "Cirql Drop", genre: "Plinko", category: "skill", tagline: "Aim and drop; tumble through the pegs to the middle.", route: "/play/drop", accent: "#a78bfa", glyph: "⁙", status: "live" },
  { id: "ascent", name: "Cirql Ascent", genre: "Doodle Jump", category: "skill", tagline: "Bounce outward, steer onto platforms, don't fall.", route: "/play/ascent", accent: "#34d399", glyph: "⇡", status: "live" },
  { id: "balance", name: "Cirql Balance", genre: "Balance", category: "skill", tagline: "Nudge the marble to hold it at the top of the ring.", route: "/play/balance", accent: "#fbbf24", glyph: "⊙", status: "live" },
  { id: "breathe", name: "Cirql Breathe", genre: "Calm", category: "zen", tagline: "Breathe with the ring. Nothing to lose. Just calm.", route: "/play/breathe", accent: "#f9a8d4", glyph: "❍", status: "live" },
  { id: "lander", name: "Cirql Lander", genre: "Lunar Lander", category: "skill", tagline: "Thrust against gravity and set down soft on the pad.", route: "/play/lander", accent: "#67e8f9", glyph: "⏛", status: "live" },
  { id: "slice", name: "Cirql Slice", genre: "Fruit Ninja", category: "reflex", tagline: "Swipe to slash the orbs; never touch a spark.", route: "/play/slice", accent: "#f472b6", glyph: "✕", status: "live" },
  { id: "osmos", name: "Cirql Osmos", genre: "Agar", category: "skill", tagline: "Absorb the smaller motes, flee the bigger ones, grow.", route: "/play/osmos", accent: "#67e8f9", glyph: "◯", status: "live" },
  { id: "crawler", name: "Cirql Crawler", genre: "Centipede", category: "classic", tagline: "Split the winding crawler before it reaches the centre.", route: "/play/crawler", accent: "#34d399", glyph: "∿", status: "live" },
  { id: "spiro", name: "Cirql Spiro", genre: "Zen draw", category: "zen", tagline: "A self-drawing spirograph. Reshape the gears. Relax.", route: "/play/spiro", accent: "#a78bfa", glyph: "✻", status: "live" },
  { id: "tide", name: "Cirql Tide", genre: "Zen sandbox", category: "zen", tagline: "Sweep a sea of light into slow, glowing currents.", route: "/play/tide", accent: "#38bdf8", glyph: "≈", status: "live" },
  { id: "dodge", name: "Cirql Dodge", genre: "Bullet-hell", category: "blast", tagline: "Weave your spark through blooming storms of light.", route: "/play/dodge", accent: "#f472b6", glyph: "❖", status: "live" },
  { id: "gunner", name: "Cirql Gunner", genre: "Twin-stick", category: "blast", tagline: "Hold the centre, rotate, and mow down the swarm.", route: "/play/gunner", accent: "#67e8f9", glyph: "⌖", status: "live" },
  { id: "tap", name: "Cirql Tap", genre: "osu!", category: "reflex", tagline: "Tap the dots the instant their ring closes in.", route: "/play/tap", accent: "#ec4899", glyph: "◎", status: "live" },
  { id: "survivor", name: "Cirql Survivor", genre: "Roguelite", category: "blast", tagline: "Auto-fire, hoover the XP, level up, outlast the swarm.", route: "/play/survivor", accent: "#67e8f9", glyph: "✴", status: "live" },
  { id: "sumo", name: "Cirql Sumo", genre: "Ring-out", category: "skill", tagline: "Dash to shove rivals off the ring; keep your footing.", route: "/play/sumo", accent: "#fbbf24", glyph: "●", status: "live" },
  { id: "command", name: "Cirql Command", genre: "Galcon", category: "strategy", tagline: "Fling troops between nodes and conquer the board.", route: "/play/command", accent: "#34d399", glyph: "⬡", status: "live" },
  { id: "coil", name: "Cirql Coil", genre: "Zuma", category: "blast", tagline: "Fire marbles into the inward-winding chain; match three.", route: "/play/coil", accent: "#38bdf8", glyph: "◠", status: "live" },
  { id: "keep", name: "Cirql Keep", genre: "Tower defense", category: "strategy", tagline: "Build turrets along the spiral and hold the core.", route: "/play/keep", accent: "#a78bfa", glyph: "⌂", status: "live" },
  { id: "weave", name: "Cirql Weave", genre: "Zen draw", category: "zen", tagline: "Tune two pendulums into looping harmonograph figures.", route: "/play/weave", accent: "#67e8f9", glyph: "∾", status: "live" },
  // --- Round two (evening out the Circles) ---
  { id: "aurora", name: "Cirql Aurora", genre: "Zen sandbox", category: "zen", tagline: "Sweep shimmering northern-lights ribbons across the sky.", route: "/play/aurora", accent: "#a78bfa", glyph: "≋", status: "live" },
  { id: "kaleido", name: "Cirql Kaleido", genre: "Kaleidoscope", category: "zen", tagline: "Tune a living kaleidoscope into ever-shifting symmetry.", route: "/play/kaleido", accent: "#f472b6", glyph: "❈", status: "live" },
  { id: "ember", name: "Cirql Ember", genre: "Zen sandbox", category: "zen", tagline: "Tend a campfire, feed it sparks, watch the embers drift up.", route: "/play/ember", accent: "#fb7185", glyph: "✶", status: "live" },
  { id: "mancala", name: "Cirql Mancala", genre: "Mancala", category: "strategy", tagline: "Sow stones around the pits and capture the rim.", route: "/play/mancala", accent: "#fbbf24", glyph: "⦾", status: "live" },
];

// Games in a Circle (live only), in registry order.
export const gamesInCircle = (id: CircleId) =>
  ARCADE_GAMES.filter((g) => g.status === "live" && g.category === id);
