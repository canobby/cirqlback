// Render the CirqlCade playtest deliverables to branded, print-ready PDFs in
// docs/cirql/pdf/:
//   1. CirqlCade-Playtest-Notes.pdf  — a fill-in worksheet, one card per game
//   2. CirqlCade-Feel-Tuning-Plan.pdf — the Linear plan (guide + CHR-130..179 table)
//     npm run playtest
// Hand-authored HTML (no generic Markdown parser — the worksheet's dense score
// rows / boxes / emoji need reliable layout) + the same headless-Chromium print
// as gen-legal.mjs. Game data mirrors client/src/game/registry.ts plus the
// per-game watch-for / knobs used in the Linear issues.
import { writeFileSync, existsSync, mkdirSync, rmSync } from "fs";
import { execFileSync } from "child_process";
import { tmpdir } from "os";
import { join, resolve } from "path";

// n = game number (worksheet order) · chr = Linear issue · star = deep game · prio
const GAMES = [
  { n: 1, chr: 136, name: "Cirql Bounce", genre: "Breakout", route: "/play", prio: "Med", star: false,
    what: "Orbital Breakout — rally the spark, shatter the rings, out-time the boss core.", controls: "spin dial + Pulse/Nova",
    watch: "Dial responsiveness at speed; ball never gets stuck in a boring loop; boss phase is a spike not a wall; reward-bridge perks feel earned.",
    knobs: "Ball speed & speed-up rate, dial sensitivity, brick HP/rows, boss HP & timer, Pulse/Nova cooldowns." },
  { n: 2, chr: 137, name: "Cirql Defender", genre: "Missile Command", route: "/play/defender", prio: "Med", star: false,
    what: "Rotate a rim shield to deflect the swarm; Fire outward; Pulse clears. Guard a 5-HP core.", controls: "Pulse · dial · Fire",
    watch: "Shield arc width (can you actually catch things?); enemy fall speed vs dial speed; is deflect-chain satisfying; boss-every-5th readable.",
    knobs: "Shield arc width, enemy speed & spawn rate, wave scaling, Fire range/rate, Pulse cooldown, core HP." },
  { n: 3, chr: 138, name: "Cirql Pop", genre: "Bubble shooter", route: "/play/pop", prio: "Med", star: false,
    what: "Shoot bubbles outward; match-3 in slowly-rotating rings; floating clusters drop.", controls: "Swap · dial · Shoot",
    watch: "Ring rotation speed (aiming fair?); add-row interval (pressure right?); lose-ring distance; is Swap useful.",
    knobs: "Ring rotation speed, add-row interval, colour count, lose-ring threshold, bubble speed." },
  { n: 4, chr: 139, name: "Cirql Spin", genre: "Tetris", route: "/play/spin", prio: "", star: false,
    what: "Circular Tetris — domino pieces fall inward; complete a full ring to clear + collapse.", controls: "Flip · dial · Drop",
    watch: "Fall speed vs how fast you can aim+flip; ring-clear feels good; overflow (lose) is fair; column readability.",
    knobs: "Fall speed & ramp, piece variety, ring size, max-ring lose height, drop lock delay." },
  { n: 5, chr: 140, name: "Cirql Snake", genre: "Snake", route: "/play/snake", prio: "", star: false,
    what: "Head circles at constant speed on 5 lanes; hop lanes, eat orbs, don't hit your tail.", controls: "In · Boost · Out",
    watch: "Lane-hop feel (snappy? mushy?); angular speed; self-collision fairness (gap tolerance); boost usefulness/cooldown.",
    knobs: "Angular speed & growth-per-orb, lane count, boost power & cooldown, self-collision gap, orb spawn rate." },
  { n: 6, chr: 141, name: "Cirql Bloom", genre: "Zen garden", route: "/play/bloom", prio: "", star: false,
    what: "No enemies, no lose. Sweep to gather light; grow petal rings; Finish to end.", controls: "sweep field · Finish",
    watch: "Is it genuinely calming; sweep responsiveness; grow cost curve (rewarding, not grindy); does Finish feel right.",
    knobs: "Mote drift speed & density, energy-per-gather, grow cost curve, petal visuals, palette." },
  { n: 7, chr: 142, name: "Cirql Reactor", genre: "Simon", route: "/play/reactor", prio: "", star: false,
    what: "Watch the ring light a pattern, tap it back; +1 each round.", controls: "tap segments",
    watch: "Playback speed (too fast to memorize?); tap targets big enough; clear win/lose feedback; how long before it gets hard.",
    knobs: "Playback speed, segment count, +N growth per round, input timeout, tone pitches." },
  { n: 8, chr: 143, name: "Cirql Chain", genre: "Chain reaction", route: "/play/chain", prio: "", star: false,
    what: "One tap sets off a cascade; chain enough to clear the round.", controls: "tap to detonate",
    watch: "Is the cascade satisfying to watch; does one tap feel impactful; clear target fair; downtime between rounds.",
    knobs: "Node density & speed, blast radius, chain threshold per round, cascade timing/visuals." },
  { n: 9, chr: 144, name: "Cirql Shift", genre: "Color Switch", route: "/play/shift", prio: "", star: false,
    what: "Tap to change your colour to match the next gate before you reach it.", controls: "tap to switch",
    watch: "Timing window fairness; gate approach speed; colour readability (colourblind?); frustration spikes.",
    knobs: "Approach speed & ramp, colour count, gate spacing, switch responsiveness." },
  { n: 10, chr: 145, name: "Cirql Dash", genre: "Frogger", route: "/play/dash", prio: "", star: false,
    what: "Hop inward across spinning hazard rings to reach the centre.", controls: "tap to hop inward",
    watch: "Gap timing readability; ring speeds fair; is progress toward centre satisfying; death feels earned not random.",
    knobs: "Ring rotation speeds & directions, gap size, ring count, hop cooldown, hazard density." },
  { n: 11, chr: 146, name: "Cirql Runner", genre: "Endless runner", route: "/play/runner", prio: "", star: false,
    what: "Race the loop; hop spikes and gaps; it only gets faster.", controls: "tap to jump",
    watch: "Jump feel (float/weight); obstacle telegraphing; speed ramp fair; does it get impossible too fast.",
    knobs: "Run speed & ramp rate, jump height/gravity, obstacle spacing & mix, spawn randomness." },
  { n: 12, chr: 147, name: "Cirql Invaders", genre: "Space Invaders", route: "/play/invaders", prio: "", star: false,
    what: "Rotate a cannon, fire outward, clear spiraling waves.", controls: "dial · Fire",
    watch: "Fire rate vs enemy speed; wave descent pressure; aiming precision with the dial; clear feels achievable.",
    knobs: "Enemy speed & descent rate, fire rate, wave size/formation, enemy fire frequency." },
  { n: 13, chr: 148, name: "Cirql Tunnel", genre: "Tempest", route: "/play/tunnel", prio: "", star: false,
    what: "Slide the rim, shoot down the lanes before they surface.", controls: "dial · Fire",
    watch: "Lane readability (depth perception); movement snappiness; enemy surface speed; overwhelm point.",
    knobs: "Enemy climb speed, lane count, fire rate, spawn rate, zap/super cooldown." },
  { n: 14, chr: 149, name: "Cirql Maze", genre: "Brain game", route: "/play/maze", prio: "", star: false,
    what: "Rotate rings to line up gaps; drop the orb to the centre. Timed.", controls: "rotate rings",
    watch: "Puzzle clarity (can you see the gaps?); rotation feel; timer pressure fair; satisfying drop.",
    knobs: "Ring count, gap alignment difficulty, timer length, rotation snap, orb drop speed." },
  { n: 15, chr: 150, name: "Cirql Link", genre: "Flow", route: "/play/link", prio: "", star: false,
    what: "Connect matching nodes with paths that never cross. Relaxing, timed.", controls: "drag paths",
    watch: "Drag accuracy; puzzle always solvable & feels so; is it actually relaxing; timer needed or not.",
    knobs: "Grid size, node-pair count, timer (or remove), path-draw forgiveness, palette." },
  { n: 16, chr: 151, name: "Cirql Orbit", genre: "Asteroids", route: "/play/orbit", prio: "", star: false,
    what: "Thrust between orbits, scoop energy, dodge black holes.", controls: "thrust / steer",
    watch: "Physics feel (drifty vs tight); black-hole danger readable; is scooping rewarding; motion sickness.",
    knobs: "Thrust power, drag/inertia, gravity-well strength, energy spawn, hazard count." },
  { n: 17, chr: 152, name: "Cirql Pinball", genre: "Pinball", route: "/play/pinball", prio: "", star: false,
    what: "One flipper on a round table; keep the ball off the drain.", controls: "flip",
    watch: "Flipper timing/power; ball physics fun; drain fair; enough targets/scoring interest.",
    knobs: "Flipper power & size, gravity, ball speed, bumper count & payout, drain gap." },
  { n: 18, chr: 153, name: "Cirql Race", genre: "Slot-car", route: "/play/race", prio: "", star: false,
    what: "Four racers, concentric lanes; dive inside and boost to win.", controls: "lane change · boost",
    watch: "AI competitiveness (winnable but not trivial); boost timing matters; lane-change feel; race length.",
    knobs: "AI speed & aggression, boost power/cooldown, lap count, lane-change speed, corner physics." },
  { n: 19, chr: 154, name: "Cirql Miner", genre: "Dig Dug", route: "/play/miner", prio: "", star: false,
    what: "Gobble gems on the rings, dodge cave monsters.", controls: "move",
    watch: "Monster AI (fair chase?); movement responsiveness; gem layout interesting; tension level.",
    knobs: "Player & monster speed, monster count/AI, gem density, level clear target." },
  { n: 20, chr: 155, name: "Cirql Claim", genre: "Qix", route: "/play/claim", prio: "", star: false,
    what: "Claim wedges of the disc while a spark hunts the open ground.", controls: "tap wedge to claim",
    watch: "Is wedge-tap satisfying (note: not true area-fill — flag if it feels thin); spark threat fair; % target good.",
    knobs: "Wedge size, spark speed & count, claim % target, claim animation speed." },
  { n: 21, chr: 130, name: "Cirql Beat", genre: "Rhythm", route: "/play/beat", prio: "High", star: true,
    what: "Notes ride inward; tap the pulse the instant they hit the ring. Groove-meter = health; tempo climbs.", controls: "tap on beat",
    watch: "★ the standout to polish — audio-visual sync (critical!), timing-window fairness, tempo ramp, is the beat actually musical.",
    knobs: "Hit-window tolerance, note speed & tempo climb, groove drain/gain, note density, track/BPM." },
  { n: 22, chr: 156, name: "Cirql Pong", genre: "Pong", route: "/play/pong", prio: "", star: false,
    what: "Guard your half with the dial; volley; slip it past the AI.", controls: "dial paddle",
    watch: "AI beatable but not trivial; paddle speed keeps up with ball; ball speed-up fair; rallies fun.",
    knobs: "AI reaction speed, ball speed & speed-up, paddle size/speed, lives." },
  { n: 23, chr: 157, name: "Cirql Whack", genre: "Whack-a-mole", route: "/play/whack", prio: "", star: false,
    what: "Tap critters as they pop; dodge bombs; 30 seconds.", controls: "tap",
    watch: "Pop rate (enough action?); bomb penalty fair; 30s the right length; tap hit-targets forgiving.",
    knobs: "Pop rate & lifetime, bomb frequency & penalty, timer length, target size, score curve." },
  { n: 24, chr: 158, name: "Cirql Reflex", genre: "Reaction", route: "/play/reflex", prio: "", star: false,
    what: "Tap the instant the ring flares; 5 rounds, fastest wins; false-starts punished.", controls: "tap",
    watch: "Flare is unmistakable; false-start rule feels fair; 5 rounds right; result/score meaningful.",
    knobs: "Wait-time randomness range, false-start penalty, round count, flare visuals." },
  { n: 25, chr: 159, name: "Cirql Pairs", genre: "Memory", route: "/play/pairs", prio: "", star: false,
    what: "Flip cards, find matching pairs against the clock.", controls: "tap cards",
    watch: "Card count right; flip animation speed; timer pressure fair; symbols distinct.",
    knobs: "Pair count, timer length, flip/peek speed, symbol set, mismatch delay." },
  { n: 26, chr: 160, name: "Cirql Flip", genre: "Lights-Out", route: "/play/flip", prio: "", star: false,
    what: "Flip a segment + its neighbours; light the whole ring. Timed.", controls: "tap segment",
    watch: "Puzzle solvable & feels fair; tap targets clear; timer needed?; win is satisfying.",
    knobs: "Segment count, scramble depth, timer (or remove), flip animation, neighbour rule." },
  { n: 27, chr: 161, name: "Cirql Stack", genre: "Stacker", route: "/play/stack", prio: "", star: false,
    what: "Lock the sweeping arc; keep the overlap; stack to the centre.", controls: "tap to lock",
    watch: "Sweep speed vs reaction; overlap-trim tension; ramp fair; near-top nail-biter feel.",
    knobs: "Sweep speed & ramp, starting arc width, trim strictness, rings-to-win." },
  { n: 28, chr: 162, name: "Cirql Gems", genre: "Match-3", route: "/play/gems", prio: "", star: false,
    what: "Swap neighbours to line up three; chain cascades (wrap + spoke lines).", controls: "swap",
    watch: "Swap feel; cascade payoff; board never dead-locks; is there a goal/timer or endless.",
    knobs: "Gem colour count, board size, cascade scoring, refill speed, move limit/timer." },
  { n: 29, chr: 163, name: "Cirql Sweep", genre: "Minesweeper", route: "/play/sweep", prio: "", star: false,
    what: "Read numbers, flag sparks, clear the disc (wedges). FLAG/DIG toggle, 3 lives.", controls: "flag/dig toggle · tap",
    watch: "Flag/dig toggle intuitive; numbers legible on wedges; 3 lives right; first-tap safe.",
    knobs: "Grid size, mine density, lives, first-click safety radius, number colours." },
  { n: 30, chr: 164, name: "Cirql Sort", genre: "Ball sort", route: "/play/sort", prio: "", star: false,
    what: "Pour balls between tubes until each is one colour (2 empties kept).", controls: "tap tube → tube",
    watch: "Always solvable & feels so; pour animation speed; tube count right; undo needed?",
    knobs: "Colour count, tube count, balls-per-tube, pour speed, add undo?" },
  { n: 31, chr: 165, name: "Cirql Merge", genre: "2048", route: "/play/merge", prio: "", star: false,
    what: "Slide to merge along spokes; spin to reposition; climb high.", controls: "In/Out slide · CW/CCW spin",
    watch: "Does the spin mechanic click (or confuse?); merge feel; soft-lock never happens; high-value payoff.",
    knobs: "Ring size, spawn value distribution, merge scoring, spin-vs-slide clarity, target tile." },
  { n: 32, chr: 166, name: "Cirql Drop", genre: "Plinko", route: "/play/drop", prio: "", star: false,
    what: "Aim and drop; tumble through pegs to the middle; 8 balls.", controls: "dial aim · drop",
    watch: "Aim matters (not pure luck?); bounce physics satisfying; 8 balls right; scoring zones clear.",
    knobs: "Peg layout & bounciness, ball count, gravity, scoring zones, aim range." },
  { n: 33, chr: 167, name: "Cirql Ascent", genre: "Doodle Jump", route: "/play/ascent", prio: "", star: false,
    what: "Bounce outward, steer onto platforms, don't fall.", controls: "tilt / steer",
    watch: "Steer feel (tilt vs tap?); platform spacing fair; fall death fair; how high feels good.",
    knobs: "Bounce height/gravity, platform spacing & movement, scroll speed, steer sensitivity." },
  { n: 34, chr: 168, name: "Cirql Balance", genre: "Balance", route: "/play/balance", prio: "", star: false,
    what: "Nudge the marble to hold it at the top of the ring; gusts grow.", controls: "tap L / R",
    watch: "Control sensitivity (tippy vs sluggish); gust escalation fair; tension satisfying; run length.",
    knobs: "Nudge force, gravity/instability, gust frequency & strength, balance tolerance." },
  { n: 35, chr: 169, name: "Cirql Breathe", genre: "Calm", route: "/play/breathe", prio: "", star: false,
    what: "Breathe with the ring; nothing to lose; Finish ends.", controls: "follow pacer · Finish",
    watch: "Pacing genuinely calming; ring expand/contract smooth; session length; audio/visual soothing.",
    knobs: "Breath cycle timing (in/hold/out), visual smoothness, colours, optional sound." },
  { n: 36, chr: 170, name: "Cirql Lander", genre: "Lunar Lander", route: "/play/lander", prio: "", star: false,
    what: "Thrust against inward gravity; set down soft on the pad.", controls: "touch field = thrust + steer",
    watch: "Thrust/gravity balance; landing tolerance (too strict/loose?); control scheme intuitive; fuel tension.",
    knobs: "Gravity, thrust power, safe-landing speed threshold, pad size, fuel amount." },
  { n: 37, chr: 171, name: "Cirql Slice", genre: "Fruit Ninja", route: "/play/slice", prio: "", star: false,
    what: "Swipe to slash orbs; never touch a spark (bomb). Timed.", controls: "swipe",
    watch: "Swipe detection crisp; orb spawn rate; bomb fair; slash juice satisfying.",
    knobs: "Orb spawn rate & speed, bomb frequency, timer, swipe hit-width, combo scoring." },
  { n: 38, chr: 172, name: "Cirql Osmos", genre: "Agar", route: "/play/osmos", prio: "", star: false,
    what: "Drag to drift; absorb smaller motes, flee bigger; grow.", controls: "drag to propel",
    watch: "Propulsion feel (eject-to-move?); growth pace; threat readability (who's bigger); drifty control fun or annoying.",
    knobs: "Propulsion force, mote size distribution & count, growth rate, drift/drag." },
  { n: 39, chr: 173, name: "Cirql Crawler", genre: "Centipede", route: "/play/crawler", prio: "", star: false,
    what: "Centre cannon; shoot a segment to split the chain; reach centre = life lost.", controls: "dial · Fire",
    watch: "Split mechanic satisfying; crawler speed vs fire rate; aiming precision; overwhelm point.",
    knobs: "Crawler speed & length, fire rate, split behaviour, spawn rate, lives." },
  { n: 40, chr: 174, name: "Cirql Spiro", genre: "Zen draw", route: "/play/spiro", prio: "", star: false,
    what: "A self-drawing spirograph; drag reshapes the gears; Finish.", controls: "drag gears · Finish",
    watch: "Is it mesmerizing; drag→shape responsiveness; colours beautiful; when to Finish clear.",
    knobs: "Draw speed, gear ratio range, line colours/glow, trail persistence." },
  { n: 41, chr: 175, name: "Cirql Tide", genre: "Zen sandbox", route: "/play/tide", prio: "", star: false,
    what: "Sweep a sea of light into slow glowing currents; Finish.", controls: "sweep · Finish",
    watch: "Particle response satisfying; genuinely relaxing; performance (lots of particles) smooth on phone; visual payoff.",
    knobs: "Particle count, sweep force & falloff, current decay, glow/colours." },
  { n: 42, chr: 135, name: "Cirql Dodge", genre: "Bullet-hell", route: "/play/dodge", prio: "High", star: true,
    what: "Weave your spark through blooming storms of light.", controls: "drag to move",
    watch: "★ deep one — hitbox fairness (is the hitbox small?), pattern readability, does drag feel precise, difficulty ramp.",
    knobs: "Bullet speed & density, pattern variety, hitbox size, spawn ramp, player speed." },
  { n: 43, chr: 176, name: "Cirql Gunner", genre: "Twin-stick", route: "/play/gunner", prio: "", star: false,
    what: "Hold the centre, rotate, mow down the swarm.", controls: "dial aim · auto/fire",
    watch: "Aim control tight; swarm pressure fair; fire feel punchy; overwhelm curve.",
    knobs: "Enemy spawn rate & speed, fire rate & damage, aim sensitivity, enemy HP." },
  { n: 44, chr: 177, name: "Cirql Tap", genre: "osu!", route: "/play/tap", prio: "", star: false,
    what: "Tap the dots the instant their ring closes in.", controls: "tap",
    watch: "Timing window fair; ring-close visual clear; dot spawn pace; combo satisfying; audio sync.",
    knobs: "Hit-window, ring-close speed, spawn rate & pattern, combo scoring." },
  { n: 45, chr: 131, name: "Cirql Survivor", genre: "Roguelite", route: "/play/survivor", prio: "High", star: true,
    what: "Drag to move; auto-fire; hoover XP; level up fire/shots/damage; outlast the swarm.", controls: "drag",
    watch: "★ the deepest one — auto-upgrade has NO choice UI (flag if you want to pick upgrades); XP/level pace; swarm scaling; run length; power fantasy. Likely REWORK: add an upgrade-choice screen on level-up.",
    knobs: "XP curve, upgrade values (fire rate/shots/damage), enemy spawn & scaling, pickup radius, move speed." },
  { n: 46, chr: 178, name: "Cirql Sumo", genre: "Ring-out", route: "/play/sumo", prio: "", star: false,
    what: "Dash to shove rivals off the ring; keep your footing.", controls: "dash",
    watch: "Knockback physics satisfying; AI competitiveness; dash cooldown/feel; ring-out threshold fair.",
    knobs: "Dash force & cooldown, knockback strength, friction, AI aggression, ring size." },
  { n: 47, chr: 134, name: "Cirql Command", genre: "Galcon", route: "/play/command", prio: "High", star: true,
    what: "Tap a node → target; fleets fly out and capture.", controls: "tap-drag node to node",
    watch: "★ RTS — the AI is simple (flag if too easy/dumb), fleet-send feel, match length, is a comeback possible.",
    knobs: "Production rate, fleet speed, AI aggression/smarts, node count/layout, starting balance." },
  { n: 48, chr: 132, name: "Cirql Coil", genre: "Zuma", route: "/play/coil", prio: "High", star: true,
    what: "Fire marbles into the inward-winding chain; match three; front reaching the core = over.", controls: "dial · fire",
    watch: "★ aiming precision, chain-speed pressure, is the match-3 burst satisfying, does insertion feel right.",
    knobs: "Chain advance speed, colour count, fire speed, match-burst chaining, spawn rate, core distance." },
  { n: 49, chr: 133, name: "Cirql Keep", genre: "Tower defense", route: "/play/keep", prio: "High", star: true,
    what: "Build turrets off the spiral path; hold the core.", controls: "tap to place turrets",
    watch: "★ economy balance (can you afford defense?), turret placement clarity, wave pressure, is it too easy/hard.",
    knobs: "Turret cost/damage/range, enemy HP & wave scaling, income rate, path length, core HP." },
  { n: 50, chr: 179, name: "Cirql Weave", genre: "Zen draw", route: "/play/weave", prio: "", star: false,
    what: "Tune two decaying pendulums into looping harmonograph figures; Finish.", controls: "tune pendulums · Finish",
    watch: "Distinct enough from Spiro?; tuning intuitive; figures beautiful; relaxing.",
    knobs: "Pendulum frequency/decay ranges, line colours/glow, draw speed, trail length." },
];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const CSS = `
  @page { size:A4; margin:12mm; }
  * { box-sizing:border-box; }
  body { font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif; color:#1f2430; font-size:11px; line-height:1.5; }
  .doc-title { font-size:24px; font-weight:800; color:#0f1220; border-bottom:3px solid #ec4899; padding-bottom:8px; margin:0 0 6px; }
  .lede { color:#565d70; margin:0 0 14px; font-size:11px; }
  h2 { font-size:14px; color:#5b21b6; margin:18px 0 6px; }
  a { color:#7c3aed; text-decoration:none; }
  code { background:#f3f0fb; color:#5b21b6; padding:1px 5px; border-radius:4px; font-size:0.92em; }
  .rubric { background:#faf9ff; border:1px solid #e7e2f5; border-radius:8px; padding:10px 14px; margin:10px 0 4px; font-size:10.5px; }
  .rubric ul { margin:6px 0 0 16px; padding:0; } .rubric li { margin:3px 0; }
  .pill { display:inline-block; border:1px solid #cfc7ec; border-radius:999px; padding:1px 8px; font-size:9.5px; color:#5b21b6; background:#f6f4fc; }
  .box { display:inline-block; width:12px; height:12px; border:1.5px solid #8b90a0; border-radius:3px; vertical-align:-2px; margin-right:5px; }
  /* game card */
  .card { border:1px solid #e3e0ee; border-radius:10px; padding:10px 12px 12px; margin:9px 0; page-break-inside:avoid; }
  .card.star { border-color:#f0abcf; box-shadow:inset 3px 0 0 #ec4899; }
  .chead { display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; margin-bottom:3px; }
  .num { display:inline-flex; align-items:center; justify-content:center; min-width:22px; height:22px; padding:0 5px; border-radius:6px; background:#0f1220; color:#fff; font-weight:800; font-size:11px; }
  .gname { font-weight:800; font-size:13px; color:#0f1220; }
  .genre { color:#7c3aed; font-weight:600; font-size:10.5px; }
  .route { color:#8b90a0; font-size:10px; }
  .chr { margin-left:auto; color:#8b90a0; font-size:9.5px; }
  .what { margin:2px 0; color:#2b3040; }
  .ctrl { color:#565d70; }
  .meta { margin:5px 0; font-size:10.5px; }
  .meta b { color:#0f1220; }
  .watch b { color:#b4237a; } .knobs b { color:#0e7490; }
  .scorerow { margin:8px 0 2px; padding-top:7px; border-top:1px dashed #ddd8ef; font-size:10.5px; }
  .fld { display:inline-block; margin:2px 10px 2px 0; white-space:nowrap; }
  .blank { display:inline-block; border-bottom:1.4px solid #9aa0b0; min-width:26px; height:12px; vertical-align:-1px; }
  .opt { display:inline-block; border:1px solid #cfc7ec; border-radius:999px; padding:0 7px; margin:0 2px; color:#3a3550; font-size:10px; }
  .verdict .opt { border-color:#f0abcf; color:#b4237a; font-weight:700; }
  .note { margin:5px 0 0; }
  .note .lbl { display:inline-block; min-width:74px; color:#0f1220; font-weight:700; }
  .writeline { display:inline-block; border-bottom:1px solid #c9cdda; width:74%; height:13px; vertical-align:-2px; }
  /* plan table */
  table { width:100%; border-collapse:collapse; margin:8px 0; font-size:9.5px; }
  th,td { border:1px solid #e5e7eb; padding:5px 7px; text-align:left; vertical-align:top; }
  th { background:#f6f4fc; color:#5b21b6; }
  tr.star td { background:#fdf2f8; }
  .verdict-legend b { color:#0f1220; }
`;

const page = (title, body) =>
  `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${body}</body></html>`;

// A blank score field: label + underline
const blank = (label, suffix = "") => `<span class="fld">${label} <span class="blank"></span>${suffix}</span>`;
const opts = (cls, arr) => `<span class="${cls}">${arr.map((o) => `<span class="opt">${o}</span>`).join(" ")}</span>`;

function card(g) {
  return `<div class="card${g.star ? " star" : ""}">
    <div class="chead">
      <span class="num">${g.n}</span>
      <span class="gname">${g.star ? "★ " : ""}${esc(g.name)}</span>
      <span class="genre">${esc(g.genre)}</span>
      <span class="route"><code>${esc(g.route)}</code></span>
      <span class="chr">CHR-${g.chr}${g.prio ? " · " + g.prio : ""}</span>
    </div>
    <div class="what">${esc(g.what)} <span class="ctrl">— <b>Controls:</b> ${esc(g.controls)}</span></div>
    <div class="meta watch"><b>Watch for:</b> ${esc(g.watch)}</div>
    <div class="meta knobs"><b>Knobs I can tune:</b> ${esc(g.knobs)}</div>
    <div class="scorerow">
      ${blank("Fun ⭐", " /5")} ${blank("Controls", " /5")} ${blank("Readability", " /5")} ${blank("Juice", " /5")}
      <span class="fld">Speed ${opts("", ["slow", "ok", "fast"])}</span>
      <span class="fld">Difficulty ${opts("", ["easy", "ok", "hard"])}</span>
      <span class="fld">Length ${opts("", ["short", "ok", "long"])}</span>
    </div>
    <div class="scorerow" style="border-top:none;padding-top:0;">
      <span class="fld"><b>Verdict:</b> ${opts("verdict", ["KEEP", "TUNE", "REWORK", "CUT"])}</span>
    </div>
    <div class="note"><span class="lbl">➕ Add</span><span class="writeline"></span></div>
    <div class="note"><span class="lbl">➖ Cut</span><span class="writeline"></span></div>
    <div class="note"><span class="lbl">✎ Feel</span><span class="writeline"></span></div>
  </div>`;
}

function worksheetHTML() {
  const intro = `
    <div class="doc-title">CirqlCade — Playtest &amp; Tuning Worksheet</div>
    <p class="lede">Play each game on your phone, then fill its card. Gut reaction is the point — 30–60s per game is plenty.
    Live at <a href="https://cirqlback.onrender.com/arcade">cirqlback.onrender.com/arcade</a> (spin wheel) or go straight to each route.
    Dictate the notes back to me and I turn every ✎ Feel note into an engine-constant change.</p>
    <div class="rubric">
      <b>How to score (same axes every game):</b>
      <ul>
        <li><b>Fun</b> — did you want to play again? (the score that matters most) &nbsp;·&nbsp; <b>Controls</b> — responsive + intuitive scheme?</li>
        <li><b>Speed</b> — overall pace &nbsp;·&nbsp; <b>Difficulty</b> — round 1 fair + ramps right? &nbsp;·&nbsp; <b>Readability</b> — always clear what to do?</li>
        <li><b>Juice</b> — do hits/scores/deaths feel good (fx, sound, haptics)? &nbsp;·&nbsp; <b>Length</b> — right size for one-thumb play?</li>
        <li><b>Verdict</b> — <b>KEEP</b> ship as-is · <b>TUNE</b> number tweaks · <b>REWORK</b> right idea wrong execution · <b>CUT</b> drop it</li>
      </ul>
      <b>Knobs</b> under each game = what I can turn without a redesign. If your note maps to a knob, tuning is a same-day change; if not, it's a REWORK.
    </div>
    <div class="rubric">
      <b>Global questions (answer once for the whole set):</b>
      <ul>
        <li>Top 3–5 favourites? &nbsp; Weakest / most cuttable? &nbsp; Is the <code>/arcade</code> spin-wheel fun to use?</li>
        <li>Is the shared neon look consistent &amp; appealing? &nbsp; Do controls feel consistent game-to-game?</li>
        <li>Sound: on by default &amp; not annoying? &nbsp; Haptics right? &nbsp; Anything that confused you on first load?</li>
        <li>Which games should get the reward-bridge perk catalog first (the moat)?</li>
      </ul>
    </div>
    <h2>Priority — play these first (deepest / highest tuning leverage)</h2>
    <p class="lede" style="margin-bottom:8px;">★ games: <b>21 Beat</b> · <b>45 Survivor</b> · <b>48 Coil</b> · <b>49 Keep</b> · <b>47 Command</b> · <b>42 Dodge</b> — then the flagship trio <b>1 Bounce / 2 Defender / 3 Pop</b>. Then sweep the rest in any order.</p>
    <h2>The 50 games</h2>`;
  const cards = GAMES.map(card).join("");
  return page("CirqlCade Playtest Worksheet", intro + cards);
}

function planHTML() {
  const rows = [...GAMES]
    .sort((a, b) => a.chr - b.chr)
    .map((g) => `<tr class="${g.star ? "star" : ""}">
      <td>CHR-${g.chr}</td>
      <td>${g.star ? "★ " : ""}${esc(g.name)}</td>
      <td>${esc(g.genre)}</td>
      <td>${g.prio || "—"}</td>
      <td>${esc(g.watch)}</td>
      <td>${esc(g.knobs)}</td>
    </tr>`).join("");
  const body = `
    <div class="doc-title">CirqlCade Feel-Tuning Pass — Plan</div>
    <p class="lede">The Linear project mirrored to print. All 50 games are built, live, and mechanically verified — but none are feel-tuned yet.
    This plan captures owner + tester feel notes per game and turns them into engine-constant changes.
    Project: <a href="https://linear.app/cirqlback/project/cirqlcade-feel-tuning-pass-b3d8e84e2c9e">CirqlCade Feel-Tuning Pass</a> ·
    issues <b>CHR-130 … CHR-179</b> (one per game) · worksheet: <code>docs/cirql/CirqlCade-Playtest-Notes.pdf</code>.</p>

    <div class="rubric">
      <b>Workflow:</b>
      <ul>
        <li>Play a game → open its issue → fill the scorecard (Fun / Controls / Speed / Difficulty / Readability / Juice / Length + Verdict).</li>
        <li>Jot <b>➕ Add</b> (missing), <b>➖ Cut</b> (annoying), <b>✎ Feel</b> (speed/weight/timing/sound/colour/spikes).</li>
        <li>Move the issue Todo → In Review when scored. I map each ✎ Feel note to a <b>Knob</b> → tuning commit; queue <b>REWORK</b> games as tasks; action <b>CUT</b> calls; then Done.</li>
      </ul>
      <span class="verdict-legend"><b>Verdicts:</b> <b>KEEP</b> ship as-is · <b>TUNE</b> number tweaks · <b>REWORK</b> right idea wrong execution · <b>CUT</b> drop it.
      <b>Knob</b> = a constant I can turn without a redesign (a Feel note that maps to one is a same-day change).</span>
    </div>

    <h2>Priority order (deepest first — highest leverage)</h2>
    <p class="lede">★ <b>Beat</b> (CHR-130, audio-sync) · <b>Survivor</b> (CHR-131, needs an upgrade-choice decision) · <b>Coil</b> (CHR-132) · <b>Keep</b> (CHR-133) · <b>Command</b> (CHR-134) · <b>Dodge</b> (CHR-135) — then flagship trio Bounce/Defender/Pop (CHR-136/137/138), then the rest.</p>

    <h2>All 50 issues</h2>
    <table>
      <thead><tr><th>Issue</th><th>Game</th><th>Genre</th><th>Prio</th><th>Watch for</th><th>Knobs I can tune</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  return page("CirqlCade Feel-Tuning Plan", body);
}

// ---- render both via headless Chrome ----
function findBrowser() {
  const cands = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
  ].filter(Boolean);
  return cands.find((p) => existsSync(p));
}

const OUT_DIR = "docs/cirql/pdf";
const browser = findBrowser();
if (!browser) { console.error("No Chrome/Edge found. Set CHROME_PATH."); process.exit(1); }
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const tmp = tmpdir();

function render(name, html) {
  const htmlPath = join(tmp, `cirq-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}.html`);
  writeFileSync(htmlPath, html);
  const pdf = resolve(OUT_DIR, name + ".pdf").replace(/\\/g, "/");
  const profile = join(tmp, `cirq-chrome-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  execFileSync(browser, [
    "--headless", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    `--user-data-dir=${profile}`, "--no-pdf-header-footer",
    `--print-to-pdf=${pdf}`, "file:///" + htmlPath.replace(/\\/g, "/"),
  ], { stdio: "ignore" });
  rmSync(htmlPath, { force: true });
  if (!existsSync(pdf)) throw new Error("Chrome did not write " + pdf);
  console.log("rendered", pdf);
}

render("CirqlCade-Playtest-Notes", worksheetHTML());
render("CirqlCade-Feel-Tuning-Plan", planHTML());
console.log("Done. PDFs in " + OUT_DIR);
