// CirqlArcade — the game registry. One entry per game; the /arcade picker renders
// tiles from this list. Adding a game = one entry here + its code-split route.
// All games share the neon language, the gameId-keyed backend (progress + Daily
// board), and the arcade-core engine base.

export interface ArcadeGame {
  id: string;            // stable gameId (matches the backend key)
  name: string;         // display name
  genre: string;        // the classic it riffs on
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
    tagline: "Gather light, grow a living garden of rings. No enemies. Just calm.",
    route: "/play/bloom",
    accent: "#f9a8d4",
    glyph: "❀",
    status: "live",
  },
  { id: "reactor", name: "Cirql Reactor", genre: "Simon", tagline: "Watch the ring light up, then tap the pattern back. One more each round.", route: "/play/reactor", accent: "#a78bfa", glyph: "◉", status: "live" },
  { id: "chain", name: "Cirql Chain", genre: "Chain reaction", tagline: "One tap sets off a cascade of light. Chain enough to clear the round.", route: "/play/chain", accent: "#fbbf24", glyph: "✸", status: "live" },
  { id: "shift", name: "Cirql Shift", genre: "Color Switch", tagline: "Tap to match your colour to the next gate before you reach it.", route: "/play/shift", accent: "#34d399", glyph: "◑", status: "live" },
  { id: "dash", name: "Cirql Dash", genre: "Frogger", tagline: "Hop inward across spinning hazard rings to reach the centre.", route: "/play/dash", accent: "#38bdf8", glyph: "⤞", status: "live" },
  { id: "runner", name: "Cirql Runner", genre: "Endless runner", tagline: "Race the loop, hop the spikes and gaps. It only gets faster.", route: "/play/runner", accent: "#fb7185", glyph: "➤", status: "live" },
  { id: "invaders", name: "Cirql Invaders", genre: "Space Invaders", tagline: "Rotate your cannon, fire outward, clear the spiraling waves.", route: "/play/invaders", accent: "#34d399", glyph: "❋", status: "live" },
  { id: "tunnel", name: "Cirql Tunnel", genre: "Tempest", tagline: "Slide the rim and shoot down the lanes before they surface.", route: "/play/tunnel", accent: "#38bdf8", glyph: "◈", status: "live" },
  { id: "maze", name: "Cirql Maze", genre: "Brain game", tagline: "Rotate the rings to line up the gaps and drop the orb to the centre.", route: "/play/maze", accent: "#a78bfa", glyph: "◎", status: "live" },
  { id: "link", name: "Cirql Link", genre: "Flow", tagline: "Connect matching nodes with paths that never cross. Relaxing.", route: "/play/link", accent: "#38bdf8", glyph: "∞", status: "live" },
  { id: "orbit", name: "Cirql Orbit", genre: "Asteroids", tagline: "Thrust between orbits, scoop energy, dodge the black holes.", route: "/play/orbit", accent: "#a78bfa", glyph: "☄", status: "live" },
  { id: "pinball", name: "Cirql Pinball", genre: "Pinball", tagline: "One flipper, a round table. Keep the ball off the drain.", route: "/play/pinball", accent: "#fb7185", glyph: "⦿", status: "live" },
  { id: "race", name: "Cirql Race", genre: "Slot-car", tagline: "Four racers, concentric lanes. Dive inside and boost to win.", route: "/play/race", accent: "#fbbf24", glyph: "⚑", status: "live" },
  { id: "miner", name: "Cirql Miner", genre: "Dig Dug", tagline: "Gobble gems on the rings, dodge the cave monsters.", route: "/play/miner", accent: "#fbbf24", glyph: "◇", status: "live" },
  { id: "claim", name: "Cirql Claim", genre: "Qix", tagline: "Claim wedges of the disc while a spark hunts the open ground.", route: "/play/claim", accent: "#38bdf8", glyph: "◔", status: "live" },
];
