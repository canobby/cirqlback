# CirqlCade — Playtest & Tuning Notes

A fill-in-the-blanks worksheet for playtesting all 50 games. Play each on your phone, then fill the blanks (or just dictate the notes to me and I'll transcribe + turn them into tuning changes). Every game is **mechanically** verified but **nothing is feel-tuned yet** — these notes are how we fix that.

Live at **cirqlback.onrender.com** — open `/arcade` (the spin wheel) or go straight to each game's route below.

---

## How to score each game (shared rubric)

Fill this line for every game. Keep it fast — gut reaction is the point.

```
Fun ⭐ __/5   Controls __/5   Speed [ slow · ok · fast ]   Difficulty [ easy · ok · hard ]
Readability __/5   Juice __/5   Length [ short · ok · long ]   Verdict [ KEEP · TUNE · REWORK · CUT ]
```

**What each axis means:**
- **Fun** — did you want to play again? (the only score that really matters)
- **Controls** — responsive + intuitive? Right control scheme (dial vs drag vs tap)?
- **Speed** — overall pace. Too slow = boring, too fast = unfair/unreadable.
- **Difficulty** — is round 1 fair and does it ramp at the right rate?
- **Readability** — can you always tell what's happening / what to do? Clutter?
- **Juice** — do hits/scores/deaths feel good? (particles, sound, haptics, screen shake)
- **Length** — is a single run the right size for one-thumb phone play?
- **Verdict** — **KEEP** (ship as-is) · **TUNE** (good, needs number tweaks) · **REWORK** (right idea, wrong execution) · **CUT** (drop it).

**Then three quick lists per game:**
- ➕ **Add** — what's missing / would make it better
- ➖ **Cut** — what's annoying / should go
- ✎ **Feel** — anything about speed, weight, timing, sound, colors, difficulty spikes

**Knobs** under each game = the things I can turn without a redesign (speeds, spawn rates, sizes, timers, cooldowns). If your note maps to a knob, tuning is fast; if not, it's a rework.

---

## Global questions (answer once, across the whole set)

- Which **3–5 games are your favorites** (lead with these)? → ________________________________
- Which feel **weakest / most cuttable**? → ________________________________
- Is the **spin-wheel `/arcade` picker** fun to use? Too slow / just right? → ________________________________
- Is the **shared look** (neon, colors, fonts) consistent and appealing across all of them? → ________________________________
- Do the **controls feel the same** game-to-game where they should (dial, buttons, tap)? → ________________________________
- **Sound** overall — on by default? too much / too little / annoying? → ________________________________
- **Haptics** (vibration) — good, overdone, or missing where you want it? → ________________________________
- Right **difficulty** for the audience (casual shop customers, one-handed)? → ________________________________
- Any game that **confused you on first load** (didn't know what to do)? → ________________________________
- Which deserve the **reward-bridge perk catalog** first (the moat)? → ________________________________

---

## The 50 games

Legend: each card = **# Name — Genre** · `route` · one-line what-it-is · controls · **Watch for** (game-specific) · **Knobs** (what I can tune) · then your blanks.

---

### Batch 1 — Flagship six (bespoke hosts)

#### 1. Cirql Bounce — Breakout · `/play`
Orbital Breakout: rally the spark, shatter the rings, out-time the boss core. **Controls:** spin dial + Pulse/Nova.
- **Watch for:** paddle/dial responsiveness at speed; ball never gets stuck in a boring loop; boss phase is a spike not a wall; reward-bridge perks feel earned.
- **Knobs:** ball speed & speed-up rate, dial sensitivity, brick HP/rows, boss HP & timer, Pulse/Nova cooldowns.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 2. Cirql Defender — Missile Command · `/play/defender`
Rotate a rim shield to deflect the falling swarm; Fire outward; Pulse clears. Guard a 5-HP core. **Controls:** Pulse · spin-dial · Fire.
- **Watch for:** shield arc width (can you actually catch things?); enemy fall speed vs dial speed; is deflect-chain satisfying; boss-every-5th readable.
- **Knobs:** shield arc width, enemy speed & spawn rate, wave scaling, Fire range/rate, Pulse cooldown, core HP.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 3. Cirql Pop — Bubble shooter · `/play/pop`
Shoot bubbles outward from center; match-3 in slowly-rotating rings; floating clusters drop. **Controls:** Swap · spin-dial · Shoot.
- **Watch for:** ring rotation speed (aiming feels fair?); add-row interval (pressure right?); lose-ring distance; is Swap useful.
- **Knobs:** ring rotation speed, add-row interval, colour count, lose-ring threshold, bubble speed.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 4. Cirql Spin — Tetris · `/play/spin`
Circular Tetris: domino pieces fall inward; complete a full ring to clear + collapse. **Controls:** Flip · spin-dial · Drop.
- **Watch for:** fall speed vs how fast you can aim+flip; ring-clear feels good; overflow (lose) is fair; column readability.
- **Knobs:** fall speed & ramp, piece variety, ring size (SEG=12), max-ring lose height, drop lock delay.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 5. Cirql Snake — Snake · `/play/snake`
Head circles at constant speed on 5 lanes; hop lanes, eat orbs, don't hit your tail. **Controls:** In · Boost · Out.
- **Watch for:** lane-hop feel (snappy? mushy?); angular speed; self-collision fairness (gap tolerance); boost usefulness/cooldown.
- **Knobs:** angular speed & growth-per-orb, lane count, boost power & cooldown, self-collision gap, orb spawn rate.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 6. Cirql Bloom — Zen garden · `/play/bloom`
No enemies, no lose. Sweep to gather light; grow petal rings; Finish to end. **Controls:** sweep the field · Finish.
- **Watch for:** is it genuinely calming; sweep responsiveness; grow cost curve (rewarding, not grindy); does Finish feel right.
- **Knobs:** mote drift speed & density, energy-per-gather, grow cost curve, petal visuals, palette.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

---

### Batch 2 — First shell wave (Reactor → Claim)

#### 7. Cirql Reactor — Simon · `/play/reactor`
Watch the ring light a pattern, tap it back; +1 each round. **Controls:** tap segments.
- **Watch for:** playback speed (too fast to memorize?); tap targets big enough; clear win/lose feedback; how long before it gets hard.
- **Knobs:** playback speed, segment count, +N growth per round, input timeout, tone pitches.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 8. Cirql Chain — Chain reaction · `/play/chain`
One tap sets off a cascade; chain enough to clear the round. **Controls:** tap to detonate.
- **Watch for:** is the cascade satisfying to watch; does one tap feel impactful; clear target fair; downtime between rounds.
- **Knobs:** node density & speed, blast radius, chain threshold per round, cascade timing/visuals.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 9. Cirql Shift — Color Switch · `/play/shift`
Tap to change your colour to match the next gate before you reach it. **Controls:** tap to switch.
- **Watch for:** timing window fairness; gate approach speed; colour readability (colourblind?); frustration spikes.
- **Knobs:** approach speed & ramp, colour count, gate spacing, switch responsiveness.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 10. Cirql Dash — Frogger · `/play/dash`
Hop inward across spinning hazard rings to reach the centre. **Controls:** tap to hop inward.
- **Watch for:** gap timing readability; ring speeds fair; is progress toward centre satisfying; death feels earned not random.
- **Knobs:** ring rotation speeds & directions, gap size, ring count, hop cooldown, hazard density.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 11. Cirql Runner — Endless runner · `/play/runner`
Race the loop; hop spikes and gaps; it only gets faster. **Controls:** tap to jump.
- **Watch for:** jump feel (float/weight); obstacle telegraphing; speed ramp fair; does it get impossible too fast.
- **Knobs:** run speed & ramp rate, jump height/gravity, obstacle spacing & mix, spawn randomness.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 12. Cirql Invaders — Space Invaders · `/play/invaders`
Rotate a cannon, fire outward, clear spiraling waves. **Controls:** spin-dial · Fire.
- **Watch for:** fire rate vs enemy speed; wave descent pressure; aiming precision with the dial; clear feels achievable.
- **Knobs:** enemy speed & descent rate, fire rate, wave size/formation, enemy fire frequency.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 13. Cirql Tunnel — Tempest · `/play/tunnel`
Slide the rim, shoot down the lanes before they surface. **Controls:** spin-dial · Fire.
- **Watch for:** lane readability (depth perception); movement snappiness; enemy surface speed; overwhelm point.
- **Knobs:** enemy climb speed, lane count, fire rate, spawn rate, zap/super cooldown.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 14. Cirql Maze — Brain game · `/play/maze`
Rotate rings to line up gaps; drop the orb to the centre. Timed. **Controls:** rotate rings.
- **Watch for:** puzzle clarity (can you see the gaps?); rotation feel; timer pressure fair; satisfying drop.
- **Knobs:** ring count, gap alignment difficulty, timer length, rotation snap, orb drop speed.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 15. Cirql Link — Flow · `/play/link`
Connect matching nodes with paths that never cross. Relaxing, timed. **Controls:** drag paths.
- **Watch for:** drag accuracy; puzzle always solvable & feels so; is it actually relaxing; timer needed or not.
- **Knobs:** grid size, node-pair count, timer (or remove), path-draw forgiveness, palette.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 16. Cirql Orbit — Asteroids · `/play/orbit`
Thrust between orbits, scoop energy, dodge black holes. **Controls:** thrust/steer.
- **Watch for:** physics feel (drifty vs tight); black-hole danger readable; is scooping rewarding; motion sickness.
- **Knobs:** thrust power, drag/inertia, gravity-well strength, energy spawn, hazard count.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 17. Cirql Pinball — Pinball · `/play/pinball`
One flipper on a round table; keep the ball off the drain. **Controls:** flip.
- **Watch for:** flipper timing/power; ball physics fun; drain fair; enough targets/scoring interest.
- **Knobs:** flipper power & size, gravity, ball speed, bumper count & payout, drain gap.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 18. Cirql Race — Slot-car · `/play/race`
Four racers, concentric lanes; dive inside and boost to win. **Controls:** lane change · boost.
- **Watch for:** AI competitiveness (winnable but not trivial); boost timing matters; lane-change feel; race length.
- **Knobs:** AI speed & aggression, boost power/cooldown, lap count, lane-change speed, corner physics.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 19. Cirql Miner — Dig Dug · `/play/miner`
Gobble gems on the rings, dodge cave monsters. **Controls:** move.
- **Watch for:** monster AI (fair chase?); movement responsiveness; gem layout interesting; tension level.
- **Knobs:** player & monster speed, monster count/AI, gem density, level clear target.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 20. Cirql Claim — Qix · `/play/claim`
Claim wedges of the disc while a spark hunts the open ground. **Controls:** tap wedge to claim.
- **Watch for:** is wedge-tap satisfying (note: not true area-fill — flag if it feels thin); spark threat fair; % target good.
- **Knobs:** wedge size, spark speed & count, claim % target, claim animation speed.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

---

### Batch 3 — Arcade classics (Beat → Stack)

#### 21. Cirql Beat — Rhythm ★ · `/play/beat`
Notes ride inward; tap the pulse the instant they hit the ring. Groove-meter = health. **Controls:** tap on beat.
- **Watch for:** ★ the standout to polish — timing window fairness; audio-visual sync (critical!); tempo ramp; is the beat actually musical.
- **Knobs:** hit-window tolerance, note speed & tempo climb, groove drain/gain, note density, track/BPM.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 22. Cirql Pong — Pong · `/play/pong`
Guard your half with the dial; volley; slip it past the AI. **Controls:** spin-dial paddle.
- **Watch for:** AI beatable but not trivial; paddle speed keeps up with ball; ball speed-up fair; rallies fun.
- **Knobs:** AI reaction speed, ball speed & speed-up, paddle size/speed, lives.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 23. Cirql Whack — Whack-a-mole · `/play/whack`
Tap critters as they pop; dodge bombs; 30 seconds. **Controls:** tap.
- **Watch for:** pop rate (enough action?); bomb penalty fair; 30s the right length; tap hit-targets forgiving.
- **Knobs:** pop rate & lifetime, bomb frequency & penalty, timer length, target size, score curve.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 24. Cirql Reflex — Reaction · `/play/reflex`
Tap the instant the ring flares; 5 rounds, fastest wins; false-starts punished. **Controls:** tap.
- **Watch for:** flare is unmistakable; false-start rule feels fair; 5 rounds right; result/score meaningful.
- **Knobs:** wait-time randomness range, false-start penalty, round count, flare visuals.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 25. Cirql Pairs — Memory · `/play/pairs`
Flip cards, find matching pairs against the clock. **Controls:** tap cards.
- **Watch for:** card count right; flip animation speed; timer pressure fair; symbols distinct.
- **Knobs:** pair count, timer length, flip/peek speed, symbol set, mismatch delay.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 26. Cirql Flip — Lights-Out · `/play/flip`
Flip a segment + its neighbours; light the whole ring. Timed. **Controls:** tap segment.
- **Watch for:** puzzle solvable & feels fair; tap targets clear; timer needed?; win is satisfying.
- **Knobs:** segment count, scramble depth, timer (or remove), flip animation, neighbour rule.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 27. Cirql Stack — Stacker · `/play/stack`
Lock the sweeping arc; keep the overlap; stack to the centre. **Controls:** tap to lock.
- **Watch for:** sweep speed vs reaction; overlap-trim tension; ramp fair; near-top nail-biter feel.
- **Knobs:** sweep speed & ramp, starting arc width, trim strictness, rings-to-win.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

---

### Batch 4 — Puzzle & casual (Gems → Breathe)

#### 28. Cirql Gems — Match-3 · `/play/gems`
Swap neighbours to line up three; chain cascades (wrap + spoke lines). **Controls:** swap.
- **Watch for:** swap feel; cascade payoff; board never dead-locks; is there a goal/timer or endless.
- **Knobs:** gem colour count, board size, cascade scoring, refill speed, move limit/timer.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 29. Cirql Sweep — Minesweeper · `/play/sweep`
Read numbers, flag sparks, clear the disc (wedges). FLAG/DIG toggle, 3 lives. **Controls:** flag/dig toggle · tap.
- **Watch for:** flag/dig toggle intuitive; numbers legible on wedges; 3 lives right; first-tap safe.
- **Knobs:** grid size, mine density, lives, first-click safety radius, number colours.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 30. Cirql Sort — Ball sort · `/play/sort`
Pour balls between tubes until each is one colour (2 empties kept). **Controls:** tap tube → tube.
- **Watch for:** always solvable & feels so; pour animation speed; tube count right; undo needed?
- **Knobs:** colour count, tube count, balls-per-tube, pour speed, add undo?
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 31. Cirql Merge — 2048 · `/play/merge`
Slide to merge along spokes; spin to reposition; climb high. **Controls:** In/Out slide · CW/CCW spin.
- **Watch for:** does the spin mechanic click (or confuse?); merge feel; soft-lock never happens; high-value payoff.
- **Knobs:** ring size, spawn value distribution, merge scoring, spin-vs-slide clarity, target tile.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 32. Cirql Drop — Plinko · `/play/drop`
Aim and drop; tumble through pegs to the middle; 8 balls. **Controls:** dial aim · drop.
- **Watch for:** aim matters (not pure luck?); bounce physics satisfying; 8 balls right; scoring zones clear.
- **Knobs:** peg layout & bounciness, ball count, gravity, scoring zones, aim range.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 33. Cirql Ascent — Doodle Jump · `/play/ascent`
Bounce outward, steer onto platforms, don't fall. **Controls:** tilt/steer.
- **Watch for:** steer feel (tilt vs tap?); platform spacing fair; fall death fair; how high feels good.
- **Knobs:** bounce height/gravity, platform spacing & movement, scroll speed, steer sensitivity.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 34. Cirql Balance — Balance · `/play/balance`
Nudge the marble to hold it at the top of the ring; gusts grow. **Controls:** tap L/R.
- **Watch for:** control sensitivity (tippy vs sluggish); gust escalation fair; tension satisfying; run length.
- **Knobs:** nudge force, gravity/instability, gust frequency & strength, balance tolerance.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 35. Cirql Breathe — Calm · `/play/breathe`
Breathe with the ring; nothing to lose; Finish ends. **Controls:** follow the pacer · Finish.
- **Watch for:** pacing genuinely calming; ring expand/contract smooth; session length; audio/visual soothing.
- **Knobs:** breath cycle timing (in/hold/out), visual smoothness, colours, optional sound.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

---

### Batch 5 — Physics & zen (Lander → Tide)

#### 36. Cirql Lander — Lunar Lander · `/play/lander`
Thrust against inward gravity; set down soft on the pad. **Controls:** touch field = thrust + steer.
- **Watch for:** thrust/gravity balance; landing tolerance (too strict/loose?); control scheme intuitive; fuel tension.
- **Knobs:** gravity, thrust power, safe-landing speed threshold, pad size, fuel amount.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 37. Cirql Slice — Fruit Ninja · `/play/slice`
Swipe to slash orbs; never touch a spark (bomb). Timed. **Controls:** swipe.
- **Watch for:** swipe detection crisp; orb spawn rate; bomb fair; slash juice satisfying.
- **Knobs:** orb spawn rate & speed, bomb frequency, timer, swipe hit-width, combo scoring.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 38. Cirql Osmos — Agar · `/play/osmos`
Drag to drift; absorb smaller motes, flee bigger; grow. **Controls:** drag to propel.
- **Watch for:** propulsion feel (eject-to-move?); growth pace; threat readability (who's bigger); drifty control fun or annoying.
- **Knobs:** propulsion force, mote size distribution & count, growth rate, drift/drag.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 39. Cirql Crawler — Centipede · `/play/crawler`
Centre cannon; shoot a segment to split the chain; reach centre = life lost. **Controls:** dial · Fire.
- **Watch for:** split mechanic satisfying; crawler speed vs fire rate; aiming precision; overwhelm point.
- **Knobs:** crawler speed & length, fire rate, split behaviour, spawn rate, lives.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 40. Cirql Spiro — Zen draw · `/play/spiro`
A self-drawing spirograph; drag reshapes the gears; Finish. **Controls:** drag gears · Finish.
- **Watch for:** is it mesmerizing; drag→shape responsiveness; colours beautiful; when to Finish clear.
- **Knobs:** draw speed, gear ratio range, line colours/glow, trail persistence.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 41. Cirql Tide — Zen sandbox · `/play/tide`
Sweep a sea of light into slow glowing currents; Finish. **Controls:** sweep · Finish.
- **Watch for:** particle response satisfying; genuinely relaxing; performance (lots of particles) smooth on phone; visual payoff.
- **Knobs:** particle count, sweep force & falloff, current decay, glow/colours.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

---

### Batch 6 — The final nine (Dodge → Weave)

#### 42. Cirql Dodge — Bullet-hell ★ · `/play/dodge`
Weave your spark through blooming storms of light. **Controls:** drag to move.
- **Watch for:** ★ deep one — hitbox fairness (small hitbox?); pattern readability; drag feels precise; difficulty ramp.
- **Knobs:** bullet speed & density, pattern variety, hitbox size, spawn ramp, player speed.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 43. Cirql Gunner — Twin-stick · `/play/gunner`
Hold the centre, rotate, mow down the swarm. **Controls:** dial aim · auto/fire.
- **Watch for:** aim control tight; swarm pressure fair; fire feel punchy; overwhelm curve.
- **Knobs:** enemy spawn rate & speed, fire rate & damage, aim sensitivity, enemy HP.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 44. Cirql Tap — osu! · `/play/tap`
Tap the dots the instant their ring closes in. **Controls:** tap.
- **Watch for:** timing window fair; ring-close visual clear; dot spawn pace; combo satisfying; audio sync.
- **Knobs:** hit-window, ring-close speed, spawn rate & pattern, combo scoring.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 45. Cirql Survivor — Roguelite ★ · `/play/survivor`
Drag to move; auto-fire; hoover XP; level up fire/shots/damage; outlast the swarm. **Controls:** drag.
- **Watch for:** ★ deepest one — auto-upgrade currently has **no choice UI** (flag if you want to pick upgrades); XP/level pace; swarm scaling; run length; power fantasy.
- **Knobs:** XP curve, upgrade values (fire rate/shots/damage), enemy spawn & scaling, pickup radius, move speed. **Possible rework:** add an upgrade-choice screen on level-up.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 46. Cirql Sumo — Ring-out · `/play/sumo`
Dash to shove rivals off the ring; keep your footing. **Controls:** dash.
- **Watch for:** knockback physics satisfying; AI competitiveness; dash cooldown/feel; ring-out threshold fair.
- **Knobs:** dash force & cooldown, knockback strength, friction, AI aggression, ring size.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 47. Cirql Command — Galcon ★ · `/play/command`
Tap a node → target; fleets fly out and capture. **Controls:** tap-drag node to node.
- **Watch for:** ★ RTS — AI is simple (flag if too easy/dumb); fleet-send feel; match length; comeback possible.
- **Knobs:** production rate, fleet speed, AI aggression/smarts, node count/layout, starting balance.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 48. Cirql Coil — Zuma ★ · `/play/coil`
Fire marbles into the inward-winding chain; match three; front reaching core = over. **Controls:** dial · fire.
- **Watch for:** ★ aiming precision; chain speed pressure; match-3 burst satisfying; insertion feels right.
- **Knobs:** chain advance speed, colour count, fire speed, match-burst chaining, spawn rate, core distance.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 49. Cirql Keep — Tower defense ★ · `/play/keep`
Build turrets off the spiral path; hold the core. **Controls:** tap to place turrets.
- **Watch for:** ★ economy balance (can you afford defense?); turret placement clear; wave pressure; is it too easy/hard.
- **Knobs:** turret cost/damage/range, enemy HP & wave scaling, income rate, path length, core HP.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

#### 50. Cirql Weave — Zen draw · `/play/weave`
Tune two decaying pendulums into looping harmonograph figures; Finish. **Controls:** tune pendulums · Finish.
- **Watch for:** distinct enough from Spiro?; tuning intuitive; figures beautiful; relaxing.
- **Knobs:** pendulum frequency/decay ranges, line colours/glow, draw speed, trail length.
- `Fun __/5  Controls __/5  Speed [slow·ok·fast]  Difficulty [easy·ok·hard]  Read __/5  Juice __/5  Length [short·ok·long]  Verdict [KEEP·TUNE·REWORK·CUT]`
- ➕ Add: ____________________  ➖ Cut: ____________________  ✎ Feel: ____________________

---

## Priority playtest order (suggested)

Play these **first** — they're the deepest / most likely to need tuning, so your notes here have the highest leverage:

1. **Beat** (#21) ★ rhythm — the standout; audio-sync is make-or-break
2. **Survivor** (#45) ★ — needs an upgrade-choice decision from you
3. **Coil** (#48) ★ — Zuma aiming feel
4. **Keep** (#49) ★ — TD economy balance
5. **Command** (#47) ★ — RTS AI difficulty
6. **Dodge** (#42) ★ — bullet-hell hitbox fairness
7. **Bounce / Defender / Pop** (#1–3) — the flagship trio customers hit first

Then sweep the rest in any order. The zen shelf (Bloom, Breathe, Spiro, Tide, Weave) mostly needs a "is it actually calming + beautiful?" yes/no.

---

## After you fill this in

Hand it back (or dictate) and I'll:
1. Turn every ✎ Feel note into a specific engine-constant change (the **Knobs** map notes → code).
2. Batch the **TUNE** games into tuning commits; queue **REWORK** games as their own tasks.
3. Action any **CUT** calls (pull from registry).
4. Optionally mirror this as **Linear issues** (one per game, or one "Tuning pass" project with sub-issues) if you'd rather track it there.
