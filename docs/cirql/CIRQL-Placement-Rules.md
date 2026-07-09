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

## 0. The GROUND is tiles, not a flat fill (the "placed vs. part of" fix)

The biggest thing that makes our maps read as "everything is *placed on* the ground instead of *part of* it" is that the ground is one flat colour with props sitting on top. **TMW/Zelda/Stardew build the ground itself out of tiles** — textured grass, dirt, sand, tilled soil, cobble, forest-floor — with blended transitions. The ground becomes a rich *surface*, and props are fewer and purposeful. This is the fix for "flat / placed / lifeless."

**DO (TMW ground rules)**
- **Fill the ground layer completely, with real tiles.** TMW: *"Ground1, the lowest ground layer, has to be filled completely before the map is finished"* — never leave raw fill showing. Our textured grass tile IS that layer; don't hide it under a flat colour.
- **Use several GROUND TYPES, not one.** Grass **and** dirt paths **and** tilled farm soil **and** cobble plaza **and** a darker forest-floor under the trees. Varying the ground *type* (not just scattering props) is what reads as a real place.
- **Blend terrain edges with autotiles.** Where two ground types meet, use the pack's border/blob autotile so the edge feathers (grass fringing into dirt), never a hard blocky seam. TMW: plain ground tiles "make the ways even more blocky than they have to be" — use the grass-border autotiles. (Options: 47-piece bitmask, or the compact **dual-grid**/Wang approach.)
- **Layer it (TMW layer model):** *Ground1/2/3* (terrain) → *Fringe* (oversized props drawn relative to sprites, depth-sorted) → *Over* (treetops/roofs above the player) → *Collision* (invisible walk/block). Depth = richness.
- **A fence or wall can hide a hard edge.** Where a soil field meets grass, a fence around it hides the seam — no perfect autotile needed.
- **Paths are tiles too.** A dirt/cobble path is a *ground type* laid into the terrain (blended edges), not a prop strip — that's what makes it feel walked-on and "part of" the map.

**DON'T**
- Don't paint one flat colour over the whole ground and rely on props for all detail — that's the exact "placed, not part of" look.
- Don't leave a terrain type as a hard rectangle — feather it (autotile) or hide the edge (fence/wall/prop line).

### Reference looks — what real TMW maps actually look like (studied their good/bad examples)
Compared TMW's own **Goodmap** vs **Badmap**:
- **Both** have **textured grass TILES** as the ground — never a flat colour. That's the baseline; our old flat-fill was below even their *bad* example.
- **Good** = trees **clustered organically** (not a grid), a **winding dirt path** with soft blended edges, an **organic water shore**, and **lighter tall-grass patches laid in as tiles** to break up the base grass.
- **Bad** = trees in a **perfect grid**, a **straight path with a hard 90° corner**, a **straight water edge**, and **uniform grass** with no tile variation.
- **The bar:** every time we build an area, ask **"is this better than The Mana World?"** — if not, fix it. Study a reference for *that specific biome* (forest/desert/rainforest/etc.) before building it, don't build from memory.
- **Mix biomes on one ring.** A ring doesn't have to be one biome — blend e.g. meadow → wetland → woodland across it (with tiled transitions). More visual interest, and it scales as rings get bigger.
- **Colour must FLOW and match the biome.** Each biome gets a cohesive palette that *matches and enhances* it (enchanted forest = lush sunlit green → deep cool teal-green shade; desert = warm sand→ochre; ember = ash→ember-glow). Flow it as **soft tonal patches** over the textured ground tiles — never a flat single colour, never hard-edged tone tiles (those fight the natural flow). Ease terrain-to-terrain colour transitions (sand greens into grass at the shore) so nothing has a hard seam.
- **Round the tile grid to the ring with a MASK.** Since the ring is a curved disk but tiles are a square grid, clip the tile ground to the true shoreline curve and let the procedural beach paint around it, colour-matched to the ground it meets — so tiles never poke past the edge and the coast reads smooth. Keep all props inside the edgepoint so none hang over the mask (a dock/reeds at the water is a deliberate exception).

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

## 5b. Density & detail — never leave the ground bare (the anti-empty rules)

The #1 reason a map feels "lifeless / dull / bare" (even a well-structured one) is **empty ground**. TMW, Zelda and Stardew maps are *densely textured everywhere* — open areas are still full of low ground-detail. "A clean green field of grass is empty walking space in a game." Negative space means *lower detail + no big props*, **not** blank ground.

**DO**
- **Carpet the ground with a fine DETAIL layer** — grass tufts, sprouts, pebbles, tiny flowers, fallen leaves, small mushrooms — everywhere the player walks. This is the single biggest fix for "empty."
- **Cluster the detail big-medium-small** — a dense patch, a medium sprinkle, a lone tuft, then a gap. An *even* coating of detail is as boring as bare ground; vary the density in waves.
- **Layer it** — ground detail (tufts/pebbles) UNDER mid props (bushes/rocks) UNDER tall props (trees/giant mushrooms, overhead). Depth reads as richness.
- **Storytelling clutter** — a few objects that say what a place *is*: a farm has tilled rows + a scarecrow + a basket; a home has a garden + laundry + firewood; a forest floor has logs, stumps, mushrooms, ferns.
- **Match density to the biome** — a *rainforest/grove* is thick (overlapping canopy, dense undergrowth); a *meadow* is medium (tufts + flower clumps); a *desert* is sparse-but-still-detailed (dunes, dry shrubs, bones, rocks). "Bare" is never the answer — thin biomes still have texture.
- **Give big props breathing room** — don't shove a house/tree flush against a wall or another big prop, or it reads as a flat cardboard cutout; let ground detail fill the gap around it.

**DON'T**
- Don't leave wide stretches of untouched base ground — that's the "empty" the owner is reacting to.
- Don't carpet detail perfectly evenly (looks like wallpaper) — cluster it.
- Don't over-detail with loud/eye-catching tiles everywhere — those stay rare; the carpet is *quiet* detail.

## 5c. Enclosures, farms & crops (what makes a village read as lived-in)

**DO**
- **Fence the yards.** Real village houses have a fenced garden/yard. Enclose a bit of ground by each home (or a shared plot) with a fence — instantly reads as "someone lives and works here."
- **Grow crops in neat rows.** A farm = **tilled soil with furrow rows + a fence + regular rows of the same crop** (here: cultivated mushrooms in rows on dark soil). Rows are the one place *regularity is correct* — crops are planted deliberately.
- **Tie the farm to the village economy** — mushroom-farmers → a mushroom field beside the hamlet; fishers → drying racks by the water. The clutter should explain how these people live.
- **Gardens & window-boxes** — flower beds inside the fences, a well/trough, benches, a cart, barrels, a stump for chopping.

## 5d. Breadcrumb trails — guide the player with flora & landmarks

**DO**
- **Lead the eye with a trail.** Line the path with flowers, lanterns, stepping-stones, tufts — a *breadcrumb trail* the player subconsciously follows from one anchor to the next (plaza → pond → grove).
- **Landmarks create "gravity."** A tall bright focal (a great glowing mushroom, a lighthouse) pulls the player toward it; place them so the player naturally orbits between anchors.
- **The triangle rule** — arrange your 3 big anchors so sightlines form triangles; the player always sees the next point of interest, never a dead flat expanse.

## 5e. Water features — juice the pond (never leave it bare)

A focal pond should be *lush*, not a flat puddle (researched pond design):
- **Lush shore ring** — cattails/reeds + tall water-grass + **encircling smooth stones** around the whole bank.
- **Lily pads afloat** (some with a flower) + the odd rock breaking the surface.
- **Life** — a duck swimming, a frog on the bank, fish shadows gliding *under* the surface, dragonflies/fireflies darting above.
- **Animated surface** — concentric ripple rings + sun-sparkle glints; deep-teal water with warm highlights.
- **Palette** — deep teal water + sage-green reeds + a warm accent; keep it cohesive with the biome.

## 5f. Keep objects WELL inside the ring

Nothing sits near the shoreline. Every placement gate uses a generous **edgepoint margin (~4+ tiles)** so props/NPCs/detail read as *on the land*, not teetering on the coast. No "rim band" of props hugging the beach. (Water-edge exceptions like a dock are deliberate.)

## 5g. Water clearance & no bad overlaps

- **Only water things go near water.** Animals (duck/frog) and *intended* water plants (reeds, cattails, lily pads, encircling stones, overhanging bushes) may sit in/near a pond. **Every other object keeps ~3 tiles clear of the water** — no random mushroom/tree/detail crowding the shore.
- **No prop-on-prop overlaps.** Small ground detail (pebbles, tufts, flowers) must not land on top of a cap/trunk/house — gate it against nearby big props (a rock on a mushroom's head reads as a bug).

## 5h. One gathering spot + a dock per ring

- **A gathering spot** — one communal **Commons** per ring (a bonfire clearing with seats, or biome equivalent), placed in an open clearing kept clear of clutter. It's where festivals / the Welcome Dance / crowd moments happen.
- **A dock** — a little jetty at the shore as the ring's departure point (a deliberate water-edge exception). Ring-to-ring sailing wires up when the world is assembled.

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
