# Main Street Arcade — Vision & Project Plan

A second, distinct line of CirqlCade games: **truly retro 8-bit pixel/CRT cabinets**, each an original homage to an arcade classic, themed to a **local shop** (coffee, pizza, thrift…). Unlike the 57 neon *circular* snacks, these use the **whole screen** so they can go long — levels, progression, bosses, a high-score chase — while keeping a **round object as the mascot** of every game (a mug, a pizza, a vinyl, a donut, a bubble).

---

# Part 1 — The Vision

## Why this exists

- **It ties the games to the platform's heart.** Cirqlback is about local shops; a little arcade of *cabinets themed to local shops* makes the games part of the story instead of a side attraction.
- **It's sponsor- and pack-ready.** A real coffee shop could hand out "Cuppa Rush" as a reward, or skin its own cabinet. This is exactly the game-pack / reward-bridge direction — themed cabinets are *made* to be sponsored.
- **It fixes the "too short" problem.** Confining every game to a circle caps depth — everything becomes a 30–60-second loop. Real arcade games go long because they use the whole rectangular screen. These will.
- **Two complementary lines.** The 57 circular games stay as quick one-thumb snacks; these 10 are the premium, longer, sponsor-ready cabinets.

## The retro look — how hard?

Moderate, and **mostly a one-time cost** — a `RetroEngine` foundation the 10 games share:

- **Chunky pixels** — render to a small internal buffer, scale up nearest-neighbor so everything is crisp blocky pixels.
- **Fixed palette** — a ~16-colour retro palette per cabinet (like a real console).
- **CRT feel** — scanlines + a subtle screen curve + vignette overlay. Cheap, and it *sells* the whole thing.
- **Pixel font + chiptune** — a bundled bitmap font for arcade text, and chiptune audio (square/triangle waves + a noise "drum" channel), extending the synth we already have.

Once that foundation exists, the aesthetic is automatic; the *games* are the bigger lift because they're proper level-based arcade games, not one-screen loops.

## Two principles

- **Round is the mascot, not the cage.** Full rectangular arcade playfields; every game has a signature round hero object tied to its theme. Round everywhere, circular nowhere.
- **Original, always — homage not clone.** Our own names, art, audio and themes. We pay homage to the *genre and mechanics* of the classics (which is fair game); we never copy their trademarked names, characters, art, or audio.

## The 10 cabinets — "Main Street Arcade"

| # | Game | Shop | Homage to | Round hero |
|---|---|---|---|---|
| 1 | **Cuppa Rush** | Coffee shop | Tapper | mugs / beans |
| 2 | **Slice Route** | Pizza shop | Paperboy | pizzas / wheels |
| 3 | **Rummage** | Thrift shop | Pac-Man | buttons / vinyl |
| 4 | **Dozen** | Donut shop | Q*bert | the donut |
| 5 | **Fresh Batch** | Bakery | Donkey Kong | pies / bagels |
| 6 | **Sundae Stack** | Ice-cream parlor | **Tetris** | the scoops |
| 7 | **Spin City** | Record shop | Marble Madness | the record |
| 8 | **Taco Stack** | Taqueria | BurgerTime | tomatoes / lime |
| 9 | **Fix-It** | Hardware store | Fix-It Felix Jr. | bolts / wrecking ball |
| 10 | **Spin Cycle** | Laundromat | Puzzle Bobble | soap bubbles |

*(Slot 6 swaps the earlier Kaboom idea for a Tetris cabinet, per direction.)*

## Branding decisions (recommended)

- **A separate "Main Street Arcade" section**, not mixed into the neon circular wheel — different look (pixel/CRT), different depth (long games). It reads as its own little arcade.
- **Adds to, doesn't replace,** the 57 circular games.
- **Sponsor hook (later):** a real business can sponsor/skin the cabinet matching its shop type, and hand it out as a reward.

---

# Part 2 — The Project Plan

## Phases

**Phase 0 · Foundation** — build once, reuse for all 10.
- [ ] `RetroEngine` base — internal pixel buffer + nearest-neighbor upscale, fixed-palette drawing helpers, sprite/tile blitter.
- [ ] CRT overlay — scanlines + subtle curvature + vignette (toggleable; must stay smooth on a mid-range phone).
- [ ] Bundled pixel bitmap font (drawn on canvas — no external font, CSP-safe).
- [ ] Chiptune audio kit — square/triangle lead, arpeggios, a noise "drum" channel (extends the existing synth).
- [ ] A "Main Street Arcade" section/shell — a pixel cabinet-select screen (separate from the circular wheel), with per-cabinet high-score + Daily wiring reused from the existing backend.
- [ ] **Proof-of-concept cabinet** to prove the whole stack (recommend **Cuppa Rush**).

**Phase 1 · Build the 10 cabinets** — in batches, each a real level-based game (win/lose, progression, high score, per-cabinet Daily). Suggested order:
1. **Cuppa Rush** (also the POC) · 2. **Slice Route** · 3. **Spin Cycle** (reuses bubble-match mechanics we've proven) · 4. **Rummage** · 5. **Dozen** · 6. **Sundae Stack** · 7. **Fresh Batch** · 8. **Taco Stack** · 9. **Spin City** · 10. **Fix-It**.

**Phase 2 · Polish & wire-up** — feel-tuning pass, per-cabinet Daily boards + best scores, and the **sponsorship/skin hooks** (a business can adopt its cabinet). Optional: a "Main Street Pack" as a reward.

## Foundation spec (what `RetroEngine` gives every cabinet)

- A logical pixel resolution (e.g. 240×216) that scales to fit; all drawing in pixel space.
- Palette + `px(x,y,color)`, `rect`, `sprite`, `text` (pixel font) helpers.
- Fixed-timestep update + input (d-pad-style + tap), so games feel arcade-tight.
- CRT post-process, chiptune SFX/music hooks, pause/menu/game-over chrome.
- Backend reuse: same `gameId`-keyed progress + Daily board as the circular games.

## The 10 cabinet specs (one per Linear issue)

1. **Cuppa Rush** (Coffee · Tapper) — Four counters run from your espresso bar to the door. Slide a coffee down the right counter to meet each incoming customer, and catch the empty mug it slides back or it shatters. Serve a whole rush to clear the shift; a customer reaching the bar (or a dropped mug) costs a life. Speeds up each shift; tip combos for back-to-back serves; a "regular" boss customer.
2. **Slice Route** (Pizza · Paperboy) — Ride the delivery scooter down a scrolling street; lob pizzas onto the porches that ordered (and NOT the ones that didn't) while dodging cars, dogs, hydrants and open manholes. A street = a day; end-of-street bonus obstacle course. Crash = a life; score by deliveries + streak.
3. **Rummage** (Thrift · Pac-Man) — A maze of clothing racks. Grab every vintage find to clear the floor while four snooty shoppers hunt you; grab a "50% OFF" tag to turn the tables and chase them. A designer handbag is the bonus. New floors get faster.
4. **Dozen** (Donut · Q*bert) — Hop your donut across a pyramid of crates, flipping each to "SOLD"; flip them all to clear the batch. The health inspector and a rolling coffee-cup chase you; a sprinkle-pad slides you to safety; falling off costs a life. Later batches need two hops per crate.
5. **Fresh Batch** (Bakery · Donkey Kong) — Climb ladders and oven racks to the top shelf while the grumpy baker hurls rolling pie-tins and bouncing bagels; grab a rolling-pin to smash them. Four rising stages per loaf.
6. **Sundae Stack** (Ice-cream · **Tetris**) — Tetromino trays of ice-cream scoops fall into the freezer; rotate and slot them to fill a shelf with no gaps — a full row ships and clears. Same-flavour rows score a combo; over when the freezer overflows. Speeds up.
7. **Spin City** (Record · Marble Madness) — Roll a vinyl through a tilting top-down course of grooves, gaps and speed-strips to the turntable before the needle drops; nudge it with tilt/drag, but too much speed and it flies off the edge. Courses get twistier.
8. **Taco Stack** (Taqueria · BurgerTime) — Walk platforms and ladders over stacked ingredients, dropping each layer onto the plate below to build every taco, while chili-peppers and onions chase you — stun them with a squeeze of lime.
9. **Fix-It** (Hardware · Fix-It Felix Jr.) — Climb a scaffold of apartment windows patching each broken pane with your hammer, while a wrecker up top hurls bricks and loose bolts to dodge or nudge off ledges; fix every window before the timer.
10. **Spin Cycle** (Laundromat · Puzzle Bobble) — Fire round soap-bubbles up into a descending grid of coloured laundry; match three to pop the load before it reaches the machine door. A "bleach" bubble clears a whole colour.

## Milestones

- [ ] **M0** — Foundation done + Cuppa Rush playable end-to-end (proves pixel/CRT/chiptune/section/backend).
- [ ] **M1** — First 3 cabinets live (Cuppa Rush, Slice Route, Spin Cycle).
- [ ] **M2** — All 10 cabinets live.
- [ ] **M3** — Polish pass + per-cabinet Daily/best + sponsorship/skin hooks.

## Open decisions for you

- **Separate "Main Street Arcade" section vs. the same wheel?** → recommend **separate** (own pixel look + longer games).
- **Add vs. replace?** → **add** (keep the 57 circular snacks).
- **Which 3 to prototype first?** → recommend **Cuppa Rush · Slice Route · Spin Cycle**.

## Risks & notes

- **Bigger builds than the circular games** — each is a real level-based arcade game, so a few per batch, not a full sweep.
- **CRT on mobile** — keep the post-process cheap; make it toggleable.
- **Stay original** — original names/art/audio/themes throughout; homage the mechanics, never the trademarked assets.

---

*Ready to roll: Phase 0 (the RetroEngine foundation + Cuppa Rush proof-of-concept) is the first build step.*
