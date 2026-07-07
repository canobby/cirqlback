// CIRQLVERSE — the Cirql Drive-In roster (fake movie posters).
//
// The outdoor screen on ring 2 cycles through these tongue-in-cheek "now showing"
// posters — a big emoji as the poster art over a genre-coloured backdrop + a punny
// title and tagline. Purely cosmetic ambience for the social gathering spot; add more
// freely. Rendered by the world engine (drawTheater).

export interface Movie {
  title: string;
  tagline: string;
  emoji: string;     // stand-in "poster art"
  bg1: string;       // backdrop gradient (top → bottom)
  bg2: string;
}

export const MOVIES: Movie[] = [
  { title: "Attack of the 50-Foot Lantern", tagline: "It's lit. Dangerously lit.", emoji: "🏮", bg1: "#3a0f14", bg2: "#120507" },
  { title: "The Sparks Awaken", tagline: "This time, it's luminous.", emoji: "✨", bg1: "#241645", bg2: "#0b0820" },
  { title: "Jurassic Dock", tagline: "Life finds a pier.", emoji: "🦖", bg1: "#123322", bg2: "#04140c" },
  { title: "Honey, I Shrunk the Ring", tagline: "Size isn't everything. Now it is.", emoji: "💍", bg1: "#3a2f0c", bg2: "#141005" },
  { title: "A Fistful of Sparks", tagline: "One traveller. No mercy.", emoji: "🤠", bg1: "#3a1e08", bg2: "#160b03" },
  { title: "Revenge of the Rune", tagline: "The stones remember everything.", emoji: "🗿", bg1: "#10302f", bg2: "#04110f" },
  { title: "Tide and Prejudice", tagline: "A truth universally a-shored.", emoji: "🌊", bg1: "#0d2748", bg2: "#040f1e" },
  { title: "The Codfather", tagline: "An offer you can't refute-fish.", emoji: "🐟", bg1: "#22262e", bg2: "#0a0c10" },
  { title: "Moonrise Over Cirql", tagline: "Two moons. One heart.", emoji: "🌙", bg1: "#1a1640", bg2: "#08061c" },
  { title: "Fast & Ferrious", tagline: "A quarter-knot at a time.", emoji: "🚤", bg1: "#0a2e3a", bg2: "#031015" },
  { title: "Night of the Living Lanterns", tagline: "They only come out at dusk.", emoji: "👻", bg1: "#2a1040", bg2: "#0d0520" },
  { title: "Bounce: The Final Rebound", tagline: "He bounced back. Again.", emoji: "🏀", bg1: "#3a2408", bg2: "#160d03" },
  { title: "The Great Cascadia", tagline: "Everyone's invited to the party.", emoji: "🎭", bg1: "#331033", bg2: "#120512" },
  { title: "Sail Hard", tagline: "Yippee-ki-yay, landlubber.", emoji: "⛵", bg1: "#0d2a2e", bg2: "#041012" },
];

/** How long each poster stays up (seconds). */
export const REEL_SECONDS = 5;
