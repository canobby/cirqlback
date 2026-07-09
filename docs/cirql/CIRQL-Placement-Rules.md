# CIRQL — Ring Placement Rulebook

*How to lay out every ring-island so it reads as a thought-out, full-fledged RPG area (The Mana World / Stardew / Zelda quality) — not random scatter.*

Researched from real practice: The Mana World's own mapping tutorial, the official RPG Maker town-mapping guide, and level-design composition theory (see **References**). This is the doc we build ring-generators against. Pairs with the locked art direction in the world-redesign memory + `CIRQL-World-Redesign-Build-Plan.md`.

---

## The core idea

**A ring is a designed map, not a bucket of random props.** Real RPG areas feel organized because everything is placed for a *reason* — either **function** (this village grew here because of that water/road/resource) or **composition** (this cluster frames that focal point). Randomly sprinkling one plant species across a band is the #1 thing that makes a map read as "computer-generated."

So the build order is always **STRUCTURE → PATHS → FILL**, never "scatter then hope":

1. **Anchors first.** Pick 3–5 focal points (the pond, the plaza/well, a landmark, the dock, one big grove). Place *those*.
2. **Connect them.** Run a path/road between the anchors the way people would actually walk.
3. **Grow the settlement** around one anchor (buildings facing in, clustered, short sensible paths).
4. **Fill** the rest with nature that has *land-use logic* + composition clustering.
5. **Leave clearings.** Negative space is a feature, not a gap to fill.

---

## 1. Structure & focal points

**DO**
- Give every ring **3–5 focal points** where the player naturally stops (RPG Maker: "3–4 anchor points"; TMW: "set aside points where players stop and spend time, make them memorable in a small window").
- Make the focal point **stand out** — brighter, more contrast, framed by negative space and clustered props pointing at it (composition: the dominant element must not merge with the scene).
- Use **leading lines** — a road, a river/shore, a row of trees, the way a fence runs — to pull the eye toward the focal point.
- Make sure **every screen-sized frame is pleasing on its own** ("that is what players actually see in game").

**DON'T**
- Don't make a ring with no hierarchy where every area is equally busy — the eye has nowhere to rest and nothing to head toward.
- Don't bury the focal point in clutter or let it blend into the surrounding density.

## 2. Village / settlement layout

**DO**
- **Decide why the village exists first** (RPG Maker: "think about the purpose of the town and how it came to exist"). Fishing hamlet → by the water. Mushroom-farmers → around the fungal grove. That single decision drives *everything*.
- **Cluster buildings around a center** (a well, plaza, market, or shrine) so foot-traffic and sightlines converge.
- **Face entrances toward the action** (the plaza / road) so "ways are short and make sense."
- **Vary building size by role/wealth** — the inn/chief's house is bigger and prominent; a single villager's hut is small. Same-size houses in a row = fake.
- **Keep material consistent** with the biome/economy ("where do they get their building materials?") — one coherent building set per settlement.
- Position **work-buildings near their resource** (fisher's hut by the cove, mill by the river, farm by the open field).

**DON'T**
- **No grid / no straight rows of identical houses** ("the map is very square-y" is the classic failure). Stagger position, rotation, and spacing.
- Don't spread the village evenly across the whole ring — a settlement is a *dense cluster*, with wilderness between it and the next pocket.
- Don't put every door facing the same way — some variety reads as organic.

## 3. Roads & paths

**DO**
- **A path exists to connect anchors** (dock → village → pond → landmark). It has a job; it's not decoration.
- Route it **where people would actually walk** — mostly direct, with gentle bends around obstacles.
- **Line the road** with the things that belong beside a road (fences, signposts, lamp-posts, a bench, worn grass, the odd cart) so it feels travelled.

**DON'T**
- **No hard 90° corners** where a real path would curve, and no needless S-curves where people would walk straight (TMW + RPG Maker both call this out).
- Don't let a path dead-end for no reason, or run parallel-hugging a river the whole way (a nit we already hit).

## 4. Nature & biome (the part that's been reading as random)

**DO**
- **Break up every straight line and grid.** "Trees don't grow in grid patterns; rivers, ridges and shores should never be perfectly straight" (TMW). Our SDF pond/shore already does this — keep props off grids too.
- **Cluster plants in odd-numbered groups** (rule of threes) with varied spacing — a copse of 3–5 trees, then open ground, then a clump of 7 mushrooms. Clusters read far better than an even scatter (composition rule: "small groups are more pleasing than randomly scattered props").
- **Three tiers of flora, spread by threes** (RPG Maker "balance by threes"): a **signature** plant (the giant mushrooms), a **secondary** (bushes/small mushrooms), and a **tertiary** ground detail (tufts, flowers, pebbles, fallen leaves). Never one species alone.
- **Density gradients, not uniform coverage** — dense near water/village/landmark, thinning to open meadow, denser again at the wild rim. Outward rings get *more* pockets, never emptier.
- **Land-use logic — each thing near what it "wants":** trees form a *grove on one side* (a forest has an edge), cattails/reeds/lilypads only at the water, rocks/boulders on higher/rougher ground, mushrooms thickest in shade near the grove, flowers in sunny open meadow and around homes.
- **Eye-catching tiles used sparingly** (TMW) — the rare bright flower, the one big boulder, a glowing mushroom. If everything is loud, nothing is.

**DON'T**
- **Don't ring the whole shore evenly with one prop** (our current "grove band at radius 4.5–8" is exactly the random-looking thing to kill — it's a uniform annulus of one species).
- **Don't scatter a single species uniformly** across a band — that's the signature "generated" look.
- Don't place canopy props so they overhang water, paths, or the ring edge (keep the edgepoint margin).

## 5. Density, variety & negative space

**DO**
- **Vary the ground** so open areas don't read as flat fill (TMW/RPG Maker: ground variation is the single biggest fix for empty-looking space) — our procedural moss shading covers this; add scattered tufts/detail props too.
- **Leave deliberate clearings** — a clean patch of meadow, the open ring around the pond, a village square. Negative space frames the busy bits and gives the eye rest.
- **Balance clutter by threes, spread over the map** — small storytelling details (firewood by a hut, a basket, a signpost, worn stones) that imply life.

**DON'T**
- Don't fill every tile. "If you have empty space you can't fill, the map is too large" — shrink the ring or add a *pocket*, don't carpet it.
- Don't repeat the same object dozens of times on one screen; don't line things up evenly.

## 6. Believability & story

**DO**
- Every placed thing should answer "**why is it here?**" — a person, a purpose, or a natural cause put it there.
- **Put NPCs where their function is** — the fisher at the pond bank/cove, the farmer in the field, the keeper at the plaza — not floating at random coordinates.
- **Imply daily life** with clutter that tells a micro-story (tools by a workshop, laundry line, a campfire, tracks).
- **Make things interactive** where you can (TMW/RPG Maker) — a sign that reads, a bush that rustles, a critter you can pet — even tiny reactions sell the world.

**DON'T**
- Don't place a landmark/prop with no reason or relationship to its surroundings.

## 7. Borders (already handled — keep it)

- A ring needs a **designed, non-walkable border** (TMW: ~20-tile designed border). Our **procedural beach → sea void** rim *is* that border. Keep the wild rim framed (fauna fringe, the shore) rather than props running to the water's edge.

---

## Applying it to the Shroomwood (the fix)

**What's random now:** giant mushrooms placed by `placeShroomGrove` as a *uniform ring band* + small mushrooms/rocks scattered around arbitrary `centers[]` + houses at hand-typed coords not organized as a village. One species dominates; no path; no clear focal hierarchy; NPCs near-arbitrary.

**The redesign (STRUCTURE → PATHS → FILL):**
1. **Anchors:** the **pond** (rest/beauty focal), a **village plaza** (a small clearing with a shared well/fire), one **great glowing mushroom** as a landmark, the **dock** (entry).
2. **Village = a real cluster:** 4–5 shroom houses grouped around the plaza on *one side* of the ring, entrances facing in, staggered (no row), sizes varied (a big inn-cap + small huts), a short lane linking plaza → dock and plaza → pond.
3. **The "mushroom forest" as a grove with an edge:** mass the giant mushrooms into **one dense stand** (a corner/arc), thinning outward — not an even ring. Odd-numbered clumps, varied scale.
4. **Three flora tiers:** giant mushrooms (signature) → bushes + small mushrooms (secondary) → tufts/pebbles/fallen-caps (tertiary), clustered by threes with gaps.
5. **Land-use:** cattails/lilypads only at the pond (done), rocks on a rise, mushrooms thickest in the grove's shade, a few flower/bush clumps by the houses.
6. **Clearings:** keep the open ring around the pond, an open plaza, and a clean meadow stretch — breathing room between pockets.
7. **NPCs by function:** fisher at the pond bank, a forager in the grove, a keeper at the plaza.

Net effect: you arrive at the dock, a path leads you past the pond to a real little mushroom village, with a fungal forest massed beyond it and quiet meadow between — an area that was *designed*, not sprinkled.

---

## References
- **The Mana World — Development:Mapping Tutorial** (break up grids/straight lines, sparse eye-catching tiles, memorable focal points, designed 20-tile border, fill the ground layer): https://wiki.themanaworld.org/wiki/Development:Mapping_Tutorial and **Maps**: https://wiki.themanaworld.org/wiki/Maps
- **RPG Maker — official "Mapping: Towns" guide** (town purpose first, cluster around anchors, entrances face activity, vary building size/role, avoid grid/square maps, every frame pleasing): https://www.rpgmakerweb.com/blog/mapping-towns
- **RPG Maker forums — Mapping & Map Design tips** (avoid empty space / start small, ground variation, balance clutter by threes, interactivity): https://forums.rpgmakerweb.com/threads/mapping-and-map-design-tips.140273/
- **Composition in Level Design** (leading lines, focal point/dominant, negative space, cluster > scatter): https://www.gamedeveloper.com/design/composition-in-level-design and http://level-design.org/?page_id=2274
- **How To Design a Town** (settlement grows from its resources/economy; logical building placement; ≥1 point of interest): https://2minutetabletop.com/how-to-design-a-town/
