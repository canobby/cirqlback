# CirqlCade — 50 More Games (brainstorm)

Wild round two. Fifty fresh circular/neon game ideas to build rough, playtest, and cull down to the keepers — then perfect the ones we love. Chosen to **even out the categories** (see the table) and to stretch into new mechanics we haven't touched. Some will be hits, some won't; that's the point.

**Category evening** — additions bring every Circle to ~14–15:

| Circle | Now | Add | Target |
|---|---|---|---|
| Classic | 9 | +5 | 14 |
| Blast | 7 | +7 | 14 |
| Puzzle | 11 | +4 | 15 |
| Reflex | 9 | +6 | 15 |
| Skill | 6 | +8 | 14 |
| Strategy | 3 | +11 | 14 |
| Zen | 5 | +9 | 14 |

Legend: **★** = I think it's a standout worth prototyping first. Each line is `name — one-line hook`.

---

## Classic (+5 → 14) — retro icons, reimagined round

1. **Cirql Chomp** ★ — Pac-Man on a ring-maze: gobble the pips, flee the ghosts, grab a power-pellet to turn hunter.
2. **Cirql Hop** — Q*bert: hop tile-to-tile flipping them all to the target colour before the bouncer catches you.
3. **Cirql Climb** — Donkey Kong: scale the ring-ladders as barrels tumble; reach the top core.
4. **Cirql Joust** — flap to hover and lance rivals from above around the rim.
5. **Cirql Bowl** — skee-ball: roll the orb across the disc into the scoring rings.

## Blast (+7 → 14) — aim, fire, survive

6. **Cirql Swarm** ★ — Galaga: dive-bombing formations you shoot and dodge; rescue a captured spark for double-fire.
7. **Cirql Nova** — charge a rotating star and unleash radial beams to vaporise the wave.
8. **Cirql Vortex** ★ — aim a black-hole to swallow enemies; don't get pulled in yourself.
9. **Cirql Ricochet** — one shot: bounce it off the rim to nail shielded foes (puzzle-shooter).
10. **Cirql Flak** — anti-air: lead the spiraling raiders and burst them before they land.
11. **Cirql Lance** — charge a beam-lance and thread your thrust through the gaps into the core.
12. **Cirql Hydra** — boss rush: sever the heads of a writhing neon core, one phase at a time.

## Puzzle (+4 → 15) — think it through

13. **Cirql Loop** ★ — rotate ring-segments to complete an unbroken circuit for the current to flow.
14. **Cirql Hue** — split and mix light beams to match each gate's target colour.
15. **Cirql Slide** — a 15-puzzle on rings: slide the arcs into order.
16. **Cirql Grid** — radial picross: read the clues, fill the true cells, reveal the glyph.

## Reflex (+6 → 15) — tap on the beat

17. **Cirql Parry** ★ — attacks flash from the rim; flick a parry the instant each strikes.
18. **Cirql Catch** — sweep a basket around the rim to catch the falling orbs (miss the bombs).
19. **Cirql Keys** — piano-tiles: tap the lit lane exactly on the beat as they stream in.
20. **Cirql Swipe** — obey the arrow prompts, faster and faster (Simon-swipe).
21. **Cirql Trace** — a glyph flashes; redraw it before it fades.
22. **Cirql Blink** — a pattern flashes for a heartbeat; tap it back from memory, against the clock.

## Skill (+8 → 14) — physics, balance, nerve

23. **Cirql Yo** — yo-yo physics: extend and snap a weighted string to clip targets and return.
24. **Cirql Kite** — hold a kite aloft in shifting wind and thread it through rings.
25. **Cirql Rope** ★ — grapple-swing between anchors, build momentum, don't fall.
26. **Cirql Curl** — curling: slide the stone with weight and curve into the house.
27. **Cirql Darts** — aim and feather your power to land the treble on a spinning board.
28. **Cirql Lob** — trebuchet: dial angle and force to arc payloads onto the targets.
29. **Cirql Skip** — skip a stone across the water, timing each bounce for distance.
30. **Cirql Coaster** — carry momentum through loops and hills without stalling or flying off.

## Strategy (+11 → 14) — plan and conquer

31. **Cirql Reign** ★ — paper.io on a disc: loop out to claim territory; get cut and you're out.
32. **Cirql Mancala** ★ — sow stones around the pits and capture the rim (a perfect circular fit).
33. **Cirql Othello** — flip discs to own the majority of the ring.
34. **Cirql Five** — five-in-a-row on the radial grid against a scheming AI.
35. **Cirql Hive** — grow cells, hatch drones, and smother the rival colony.
36. **Cirql Tactics** — move and flank a small squad across wedge-tiles.
37. **Cirql Checkers** — jump, chain and king your way around the ring.
38. **Cirql Deck** ★ — a bite-size deckbuilder: draft cards, chain combos, crack the core.
39. **Cirql Market** — buy low and sell high as prices spin around the wheel.
40. **Cirql Fortress** — lay walls to funnel the horde into your guns (maze + defense).
41. **Cirql Domino** — chain dominoes around the loop for escalating combos.

## Zen (+9 → 14) — calm and flow

42. **Cirql Aurora** ★ — sweep shimmering northern-lights ribbons across the sky.
43. **Cirql Kaleido** — tune a living kaleidoscope into ever-shifting symmetry.
44. **Cirql Ember** — tend a campfire, feed it sparks, watch the embers drift up.
45. **Cirql Koi** — trail your finger to guide koi through a rippling pond.
46. **Cirql Constellation** — connect the stars into constellations of your own.
47. **Cirql Lotus** — bloom and refold a breathing mandala with your sweeps.
48. **Cirql Drift** — set paper lanterns adrift down a slow river of light.
49. **Cirql Sand** — rake a zen sand-garden into calm concentric patterns.
50. **Cirql Chime** — brush the air to ring generative wind-chimes into a melody.

---

## The game-pack reward vision (platform side — future)

Once we have a big library (100 games), we can hand games out **as platform rewards**:
- **~20 games free** to everyone (the base arcade).
- **Single games** unlocked as small rewards (tap milestones, streaks, spins).
- **5-packs** and **themed packs** (e.g. "Zen Pack", "Retro Pack", "Brain Pack") as bigger rewards or perks bought with points.
- Ties straight into the existing points economy + reward bridge — another reason real-world tapping is worth it.

This is a separate platform feature to build *after* the library exists (needs an ownership/unlock model + a pack catalog + gating in the wheel). Building these 50 is what makes it possible. Noted for later.

## Build approach

Same proven pipeline as the first 50: each game = an engine (`extends ArcadeEngine`) + a ~15-line `GameConfig` (or bespoke for the richest) + a registry line + a lazy route, verified via the dev `window.__game` handle. Built in **batches** (Zen builds fastest; Strategy games are meatier — AI). Veto/redirect any idea before we get to it; narrow to favourites after playtesting.
