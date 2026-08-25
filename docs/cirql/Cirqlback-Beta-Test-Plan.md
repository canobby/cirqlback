# Cirqlback Beta Test Plan

A complete beta-test plan for the whole Cirqlback platform, written for you as **administrator + creator** — test every detail, understand how it all fits together, and log what's broken. This is the printable copy of the Linear project "Cirqlback Beta Test." Tick the boxes as you verify; note anything off with a severity.

**Contents:** 1 Master Guide & Overview · 2 Accounts, Auth & Onboarding · 3 CirqlCade — Games & Arcade Systems · 4 Customer App & the Reward Bridge · 5 Business Dashboard · 6 Coordinator · 7 Admin Hub · 8 Billing, Payments & Payouts · 9 Messaging, Legal, AI Assistant & Cross-cutting.

# 1 · Master Guide & Overview — READ FIRST

You're testing the whole platform as its **administrator and creator**. This guide orients you: where to test, who to log in as, how everything connects, the vocabulary, and how to record what you find. The other sections are the area-by-area checklists.

## 1.1 Environments

- **Live (beta):** https://cirqlback.onrender.com — always-on (paid Render tier, no cold start). This is what testers use. Every push to the branch auto-deploys here in ~2–4 min.
- **Local dev (optional):** `npm run dev` → http://127.0.0.1:5000. Only needed if you want to poke at something before it's live.
- **Same database** backs both (a shared Neon dev DB), so test data you create is visible in both.
- **Not production-hardened:** test Stripe keys, shared dev DB, public URL. Fine for beta; rotate before a real launch.

**Tip:** most pages are mobile-first (the games especially). Test on a phone *and* desktop. In a desktop browser you can emulate mobile (DevTools → device toolbar) for quick checks.

## 1.2 Test accounts (all password `BetaTest123!`)

| Login | Role | Use it to test |
|---|---|---|
| `canobbs@hotmail.com` | Admin | The Admin Hub (`/admin-dashboard`). Admin API is gated to this account. |
| `coordinator@cirqlback.test` | Coordinator | Territories, prospects, pitch tools, earnings. Owns the Yakima Valley territory (70% share). |
| `pro@cirqlback.test` | Business (Pro) | Pat Merchant · "Yakima Coffee Company". Has the paid add-ons + hosted page. |
| `core@cirqlback.test` | Business (Core) | Cory Merchant · "Cowiche Canyon Kitchen". No add-ons — test the paid upgrade path. |
| `customer@cirqlback.test` | Customer | Casey. The tap/reward/games experience. |

**Important:** `/admin-dashboard` renders the admin UI for *any* logged-in user, but the `/api/admin/*` data is gated to real admins — so **always test the hub as `canobbs@hotmail.com`** or the numbers will be empty/blocked.

**Impersonation:** as admin you can impersonate any user (Admin Hub → People → Support 360). Stop via the banner. Handy for reproducing a tester's view.

## 1.3 The systems map — how it all connects

Read this once; it makes every checklist make sense.

**The reward loop (customer side):** a customer **taps** a partner's NFC tag (or scans the QR fallback) → earns **points** + streak progress, sometimes a **badge** or a **lucky/surprise reward** → points are the fuel for the **Reward Bridge**: spend them to **arm perks** (power-ups) in CirqlCade games and to charge CirqlBreak's Supernova. So real-world tapping literally powers the games — that's **the moat**.

**The money loop (business side):** a business subscribes (**Core $19.99 / Pro $49.99** + optional add-ons) → **billing enforcement** runs the calendar (charge on the 10th, lock at month-end if unpaid, suspend at 90 days) → shared-campaign rewards are funded by a **host business** and split fairly by tap-weight → **payouts** go out on the 15th to host businesses via **Stripe Connect**.

**The territory loop (coordinator side):** a **coordinator** owns a **territory** (a map circle) → recruits/onboards businesses in it → earns a **revenue share** (default 70/30, admin-adjustable) → gets paid via Connect.

**Oversight:** the **Admin Hub** sits above all of it — revenue/MRR, trust & safety, territories, the map heatmap, customers, support, platform config, and an audit log.

**Games:** the **CirqlCade** arcade (`/arcade`) is the engagement layer that the reward bridge plugs into; **CirqlBreak** (`/play`) is the flagship game.

## 1.4 How to use this plan

- Work through the area sections (2–9). Within each, **tick the boxes** as you verify them.
- Each check tells you **what to do**, the **expected result**, and a **link** where useful.
- **"Understand & learn"** callouts explain a concept so you know *why* you're checking it.
- When something's wrong, log it (see 1.6) with a **severity**.
- You don't have to do it all at once — the checklists are the durable record.

## 1.5 What "good" looks like (general expectations, every screen)

- [ ] Page loads without an error screen or spinner-that-never-ends.
- [ ] No broken links (every button/tab goes somewhere real).
- [ ] No obviously mock/placeholder data where real data should be.
- [ ] Works on a phone (tap targets big enough, nothing cut off, no horizontal scroll).
- [ ] Numbers reconcile (a total equals the sum of its parts; a rank matches the list).
- [ ] Money is formatted and correct; pricing is consistent screen-to-screen (Core $19.99 / Pro $49.99).
- [ ] Nothing leaks another user's private data.

## 1.6 Logging what you find (severity legend)

For each issue note: **where** (URL + which account), **what you did**, **what happened**, **what you expected**, and a severity:

- **Blocker** — can't proceed / broken flow / data loss / charged wrong.
- **Major** — a feature doesn't work or shows wrong data, but there's a workaround.
- **Minor** — small functional glitch.
- **Cosmetic** — visual/text/polish.
- **Question** — "is this intended?" / unclear.

Keep a running list. Ping me the list and I'll triage + fix.

## 1.7 Glossary — understand & learn

- **NFC tap / QR fallback** — a customer taps a partner's programmed NFC sticker with their phone (or scans a QR if NFC isn't available) to check in and earn.
- **Points — available vs lifetime** — *available* is your spendable balance (funds perks); *lifetime/total* is cumulative (leaderboards). Taps, daily rewards, streaks, referrals all add points.
- **Reward Bridge / the moat** — the connection between real taps and in-game power. Spend points to **arm perks**.
- **Perk / Arm** — a per-game power-up you buy with points before a run (e.g. Gunner "Fortify" = +2 shields). Armed perks apply at run start; a **perked run stays off the Daily board** so rankings stay fair.
- **Daily board** — each game's cross-player leaderboard for today (UTC day). First play of the day earns a small reward.
- **Daily Circle** — CirqlBreak's specific shared daily puzzle (a once-a-day bonus).
- **Streak** — consecutive-day tapping; keeps a multiplier/bonus alive.
- **Badge** — recognition (manual or achievement) shown on profiles / business pages.
- **Collection / passport** — sets of taps/places to complete.
- **Add-on & tier inclusion** — paid features. Some are *included free* on a tier (e.g. the hosted website is free on Pro, $14.99 on Core).
- **Territory** — a coordinator-owned map **circle** (centre + radius); a business belongs to exactly one.
- **Funding host / split ledger** — for shared multi-store campaigns, one business funds rewards and costs are split by tap-weight.
- **Stripe Connect payout** — how host businesses / coordinators actually receive money.
- **Dunning** — the reminder emails when a payment fails, before lock/suspend.
- **CirqlCade** — the 50-game arcade at `/arcade`. **CirqlBreak** — the flagship game at `/play` (a.k.a. "Cirql Bounce").

# 2 · Accounts, Auth & Onboarding

**What this area is:** how people get into the app and become the right kind of user. Everything else depends on this working. Test each role's sign-in and that roles only see what they should.

**Key routes:** `/` (home) · `/login` · `/register` · `/auth` · `/profile-setup` · `/account` · `/settings` · `/profile`

## 2.A Registration & first-run

- [ ] **Register a brand-new customer** at `/register` — pick a fresh email, complete it. **Expect:** you land logged-in (customer), no error, and a session persists on refresh.
- [ ] **Profile setup** (`/profile-setup`) appears/works for a new account — name, avatar, preferences save.
- [ ] **Validation** — try a bad email / blank required fields / weak password. **Expect:** clear inline errors, no crash.
- [ ] **Duplicate email** — register with an email that already exists. **Expect:** a helpful "already registered" message, not a 500.

> **Understand & learn:** new sign-ups are **customers** by default. Business/coordinator/admin roles are provisioned differently (a business is created when a merchant sets up; admin is a flag on the account). That's why you use the seeded test accounts for the non-customer roles.

## 2.B Login / logout / session

- [ ] **Log in** as each test account at `/login`. **Expect:** each lands on its correct home (customer → `/customer`, merchant → `/merchant`, coordinator → `/coordinator`, admin can reach `/admin-dashboard`).
- [ ] **Wrong password** → clear error, no lockout weirdness.
- [ ] **Refresh** while logged in → still logged in.
- [ ] **Log out** → session ends; protected pages bounce you to login.
- [ ] **Rate limiting** — the login endpoint is rate-limited; you shouldn't be able to brute-force. (Don't hammer it hard on the shared server.)

## 2.C Role gating (important — security)

- [ ] As a **customer**, try to open `/merchant`, `/coordinator`, `/admin-dashboard` directly. **Expect:** you're redirected or shown "no access" — you never see another role's real data.
- [ ] As **admin**, `/admin-dashboard` shows real numbers. As any other account, the admin data is blocked.
- [ ] **Business tier limits** — a Starter/Core business can own **1** business, Pro up to **3**. Confirm the limit is enforced when adding a business.

## 2.D Account, settings & profile

- [ ] `/account`, `/settings`, `/profile` each load for a logged-in user and show *that* user's info.
- [ ] **Edit + save** a profile field → persists on refresh.
- [ ] **Settings toggles** (notifications, preferences) save and take effect.
- [ ] **No PII leak** — you only ever see your own account details.

## 2.E Impersonation (admin power — learn this)

- [ ] As admin, go to **Admin Hub → People → Support 360**, pick a user, **Impersonate**. **Expect:** you now see the app *as them*; a banner shows you're impersonating.
- [ ] **Stop impersonating** from the banner → back to admin.

> **Understand & learn:** impersonation is the fastest way to reproduce a beta tester's bug report — become them, walk their steps, see what they see. Suspend/unsuspend also lives here (Trust & Safety).

## 2.F Cross-cutting for this area

- [ ] Auth pages look right on mobile.
- [ ] Password field masks input; there's a show/hide if expected.
- [ ] Any "forgot password" / email flows either work or are clearly not-in-beta (note which).
- [ ] The footer/nav links from logged-out pages (`/about`, `/how-it-works`, `/contact`, `/help-center`, `/user-guide`, `/platform-overview`) all resolve — no dead links.

# 3 · CirqlCade — Games & Arcade Systems

**What this area is:** the 50-game arcade and everything wrapped around it — the picker wheel, per-game Daily boards, Freestyle mode, the Perk shop (the moat), online multiplayer, how-to modals, and the shared controls. This folds in the *feel* checks from the CirqlCade Feel-Tuning Pass worksheet; here we care first about **does every system work**, then feel.

**Entry point:** `/arcade` (the spin-wheel). Each game is also at `/play/<id>`.

> **Understand & learn:** all 50 games share one engine base, one look, and one backend (progress + Daily keyed by gameId). Six are "flagship" bespoke pages (Bounce/Defender/Pop/Spin/Snake/Bloom); the other 44 run on a shared config-driven shell. So if a *system* (Daily/Freestyle/Perks) works on one shell game, it should work on all — but bespoke games are wired individually, so spot-check them separately.

## 3.A The "Game Circles" wheel (`/arcade`)

- [ ] Opens full-screen on a ring of **7 category Circles** (Classic · Blast · Puzzle · Reflex · Skill · Strategy · Zen).
- [ ] **Spin** it — flick / arrow keys / prev-next buttons all work; momentum + snap feels good.
- [ ] Tap **Open** on a Circle → it opens into a ring of just that category's games; a **Circles** button (or Esc) returns.
- [ ] The centre card shows the right name/tagline/count; **PLAY** launches the selected game.
- [ ] **Surprise me** launches a random game from anywhere.
- [ ] Looks right on a phone (immersive, no navbar squashing it).

## 3.B Per-game systems (test on ~3 shell games, e.g. Gunner, Invaders, Whack, + spot-check bespoke)

**How-to (every game):**
- [ ] Menu has a **How to play** button → modal with Goal / Controls / Tips in the game's colour. Content matches the game.

**Daily board (every game):**
- [ ] Menu has a **Daily** button → today's leaderboard for *that* game (rank, your row highlighted, day #, player count).
- [ ] Play a round while **logged in** → your score posts; open Daily again → you're on the board.
- [ ] **First play of the day** shows **Daily reward +10** on the game-over screen; a second play the same day does **not** (once per game per day).
- [ ] Logged out → Daily says "log in to compete."

**Freestyle (action games only — Classic/Blast/Skill):**
- [ ] Action games show a **Freestyle** button; puzzle/zen/reflex/strategy games do **not**.
- [ ] Opens a slider panel — **Game speed** always; some games add a knob (Gunner has **Enemy density**).
- [ ] "Play freestyle" starts a run at that speed/knobs; the game-over screen says **"Freestyle run — not ranked."**
- [ ] A normal Play-again after freestyle is back to normal speed/difficulty.

**Perks — the moat (games with a catalog: Gunner, Invaders so far):**
- [ ] Menu shows a **Perks** button → shop with your **points balance** + the game's perks (name, effect, cost).
- [ ] **Arm** a perk you can afford → points drop by its cost; it shows **Armed**. Try one you *can't* afford → "not enough points."
- [ ] **Play** → the perk takes effect (Gunner **Fortify** = start with extra shields; **Overdrive** = faster fire; **Twin Cannon** = two streams). Game-over says **"Perked run — off the Daily board."**
- [ ] After that run, the perk is **spent** (not still armed).
- [ ] Logged out → Perks says "log in and tap partner shops to earn points."

> **Understand & learn:** perks are funded by your **points** (mostly from real partner taps). Perked runs are deliberately kept **off the Daily leaderboard** so buying power-ups can't buy a top rank. This is the platform→game connection that makes CirqlCade unique.

## 3.C Online multiplayer (6 games: Pong, Sumo, Reflex, Tap, Command, Race)

Each has a **Play/Duel/Battle online** button on its menu → `/play/<id>/online`.

- [ ] Opening it shows **"Finding an opponent…"**; if no human joins in ~9s you're matched with a **bot** (never a dead-end).
- [ ] **Two real players:** open the online page on **two devices/tabs** at the same time → you match each other (opponent name shown, not "CPU"). *(On one computer, two browser tabs may each grab a bot instead — a dev quirk; use two real devices for true PvP.)*
- [ ] The match plays in real time, both sides see the same action, scores update, and it ends with a **win/lose + Rematch/Leave** screen.
- [ ] **Rematch** starts a fresh match; **Leave** returns to the game menu.
- [ ] If your opponent quits mid-match → you get "You win by default."
- [ ] Per-game controls work: Pong/Sumo/Reflex/Tap/Command are touch/drag; **Race** has an IN / BOOST / OUT button band.

## 3.D Controls — two-thumb / hold-to-fire

- [ ] On a **dial + fire** game (Invaders, Tunnel, Crawler, Defender): you can **hold the aim dial with one thumb AND hold FIRE with the other at the same time** — sustained fire while aiming. This is the key mobile-feel fix.
- [ ] Buttons respond instantly (on touch, not after a delay).

## 3.E The 50 games — per-game pass

For **each** game: it **loads**, the **controls respond**, a run **starts and ends** cleanly, the **score/HUD** is sensible, and (logged in) your **best + Daily** save. Deeper *feel* notes go in the CirqlCade Feel-Tuning Pass worksheet.

**Classic** — [ ] Bounce (`/play`) · [ ] Snake · [ ] Runner · [ ] Invaders · [ ] Pinball · [ ] Miner · [ ] Pong · [ ] Dash · [ ] Crawler

**Blast** — [ ] Defender · [ ] Tunnel · [ ] Orbit · [ ] Dodge · [ ] Gunner · [ ] Survivor · [ ] Coil

**Puzzle** — [ ] Pop · [ ] Spin · [ ] Maze · [ ] Link · [ ] Claim · [ ] Pairs · [ ] Flip · [ ] Gems · [ ] Sweep · [ ] Sort · [ ] Merge

**Reflex** — [ ] Reactor · [ ] Chain · [ ] Shift · [ ] Beat · [ ] Whack · [ ] Reflex · [ ] Stack · [ ] Slice · [ ] Tap

**Skill** — [ ] Drop · [ ] Ascent · [ ] Balance · [ ] Lander · [ ] Osmos · [ ] Sumo

**Strategy** — [ ] Race · [ ] Command · [ ] Keep

**Zen** — [ ] Bloom · [ ] Breathe · [ ] Spiro · [ ] Tide · [ ] Weave

**Flagship deep-dive (bespoke, check individually):**
- [ ] **CirqlBreak / Bounce** (`/play`) — full run; power-ups; the boss/core phase; **Daily Circle** (shared daily puzzle); **skins/awards/galaxy**; the **Supernova reward bridge** (perks from taps); the **Great Ring / Echoes** community counters. (This game has the most surface — give it a proper session.)
- [ ] **Defender / Pop / Spin / Snake / Bloom** — each loads, plays, saves best + Daily; how-to + Daily buttons present; Defender's hold-to-fire works.

## 3.F Arcade cross-cutting

- [ ] **Sound & haptics** toggles on each game menu work and persist.
- [ ] **Guests can play** (no login) — they just don't save best/Daily/perks.
- [ ] No console-breaking errors; nothing stutters badly on a mid-range phone.
- [ ] Leaving a game (Back / Arcade) cleanly returns; no stuck audio or frozen canvas.

# 4 · Customer App & the Reward Bridge

**What this area is:** the everyday customer experience — tapping partners, earning and spending points, streaks/badges/collections/leaderboards, and the bridge that turns those points into in-game power. This is the demand side of the whole platform.

**Log in as** `customer@cirqlback.test` (Casey). **Key routes:** `/customer` (home) · `/tap` (demo tap) · `/tap/:tagId` · `/reward` · `/community` · `/arcade` + `/play`.

> **Understand & learn:** the loop is **tap → earn points/streak/badges → spend points to arm game perks**. Test each stage and that the numbers flow through consistently.

## 4.A Customer home (`/customer`)

- [ ] Loads with **real** data for Casey — points balance, streak, recent activity, nearby partners. Nothing mock/placeholder.
- [ ] The headline numbers (points, streak, taps) match what you see elsewhere (e.g. the perk shop balance in games).
- [ ] Navigation to games (`/arcade`), rewards, map, community all work.
- [ ] Mobile layout is clean.

## 4.B The tap flow (the core action)

- [ ] **In-app demo tap** — go to `/tap`. There's a kept **"Demo Coffee Shop"** for exactly this. Trigger a tap. **Expect:** a success animation, points added, streak advanced, maybe a badge/surprise.
- [ ] **Tap a tag URL** — `/tap/:tagId` (what a real NFC sticker/QR opens). **Expect:** it recognises the tag → check-in → reward. An unknown/invalid tag id → a friendly "tag not found," not a crash.
- [ ] **Anti-abuse** — tapping the same place again immediately should be rate-limited/cooldowned (you can't farm points by spamming). Note the behaviour.
- [ ] **Points actually increment** — note your balance before/after; it should go up by the campaign's amount.

> **Understand & learn:** taps are the anti-abuse anchor for the whole reward economy — cooldown + device + location checks live here, and because perks ride on points which ride on taps, the perk economy is protected for free. If tap protection is weak, flag it **Major**.

## 4.C Points, rewards & redemption

- [ ] `/reward` — see available rewards; **redeem** one you've earned. **Expect:** balance decreases correctly, reward shows as claimed, no double-spend.
- [ ] **Available vs lifetime points** — spending reduces *available* but not *lifetime* (leaderboards keep counting lifetime). Confirm both behave.
- [ ] Try to redeem/spend **more than you have** → blocked cleanly.

## 4.D Gamification (test what's present)

- [ ] **Streak** — advances on a tap; a broken streak resets (confirm the mechanic/UX is coherent).
- [ ] **Badges** — you can earn/see badges; they show on your profile. A business's public page shows its "Recognized for" badges.
- [ ] **Collections / passports** — sets to complete show progress.
- [ ] **Leaderboards** — real ranks; you appear where expected.
- [ ] **Daily spin / lucky-tap / surprise rewards** — if a spin/lucky mechanic surfaces, it works and grants something.
- [ ] **Referrals** — invite/refer a friend; the referral is tracked and rewarded when they join (simulate with a second fresh account).
- [ ] **Seasonal/local events** — if any are live, they render and behave.

## 4.E The Reward Bridge → games (the moat, customer side)

- [ ] Earn some points (tap the demo a few times), then go to a game with a **Perk shop** (Gunner or Invaders → **Perks**). **Expect:** your points balance in the shop matches your customer balance.
- [ ] **Arm a perk**, then play — it applies, and the run is marked "off the Daily board."
- [ ] **CirqlBreak Supernova** — in `/play`, confirm banked partner taps translate into the in-game Supernova / power-ups (the original reward bridge).

## 4.F Community & discovery

- [ ] `/community` and `/map` show partners/activity; map pins are real (claimed businesses / nonprofits), not the seeded prospect list.
- [ ] Favorites/friends/social features (if surfaced) work without errors.

## 4.G Cross-cutting

- [ ] The whole customer flow is smooth on a **phone** (this is a phone-first audience).
- [ ] Notifications (in-app) appear and their links go somewhere real.
- [ ] No other customer's data is ever visible.

# 5 · Business Dashboard

**What this area is:** the merchant's control panel — analytics, campaigns, NFC tags & QR, add-ons/tiers, and the hosted business page. This is the supply side (the paying customer of the platform).

**Log in as** two businesses: `pro@cirqlback.test` (Pro, has add-ons + a **published** hosted page "Yakima Coffee Company") and `core@cirqlback.test` (Core, **no** add-ons — test the upgrade/paywall paths, "Cowiche Canyon Kitchen").

**Key routes:** `/merchant` · `/analytics` · `/campaign-builder` · `/campaign-setup-wizard` · `/nfc-setup-wizard` · `/nfc-writer` · `/business-settings` · `/website-preview` · `/biz/:slug` (public page).

## 5.A Dashboard home (`/merchant`)

- [ ] Loads with **real** analytics for the logged-in business (taps, customers, redemptions) — not mock data.
- [ ] Tiles/numbers reconcile with the Analytics page.
- [ ] Every card/CTA links somewhere real.
- [ ] The **AI Help Assistant** ("Need help?") opens and answers, grounded in this role's guide *(needs `OPENAI_API_KEY` on the server — a graceful "unavailable" means the key isn't set, not a bug).*

## 5.B Analytics (`/analytics`)

- [ ] Real metrics render (tap trends, top customers, repeat rate, campaign performance).
- [ ] Date ranges/filters work and change the data.
- [ ] AI insights (if shown) either produce output or degrade gracefully without the OpenAI key.
- [ ] Nothing shows another business's data.

## 5.C Campaigns

- [ ] **Create a campaign** via `/campaign-builder` (or `/campaign-setup-wizard`) — pick type, set points/value, save. **Expect:** it saves and appears in the campaign list.
- [ ] **Edit** and **deactivate** a campaign.
- [ ] A live campaign's rewards actually apply when a customer taps (cross-check with the Customer tap flow).
- [ ] Multi-store / group campaigns show the **funding host** and split (see Billing for the money split).

## 5.D NFC tags & QR (the physical bridge)

- [ ] **Set up a tag** via `/nfc-setup-wizard` — create/assign an NFC tag to a campaign. **Expect:** you get a tag + a **QR code** fallback + a tap URL (`/tap/:tagId`).
- [ ] **Write a tag** at `/nfc-writer` — the writer explains the flow (iPhone uses the free NFC Tools app; Android can write directly). It shouldn't error.
- [ ] **Read/scan** — the generated QR / tap URL opens the correct check-in.
- [ ] **NFC analytics** show tap counts per tag.

> **Understand & learn:** the NFC tag (or its QR) is the literal hardware bridge between the real shop and the reward economy. iPhone *reading* is native; iPhone *writing* uses a third-party app (by design — no custom native app).

## 5.E Add-ons & tiers (the paywall)

- [ ] As **Pro** (`pro@`): included/purchased add-ons are active (hosted website free on Pro). Pricing shown as **Pro $49.99**.
- [ ] As **Core** (`core@`): premium add-ons are locked/offered for purchase (hosted website **$14.99** on Core). Pricing shown as **Core $19.99**.
- [ ] **Buy an add-on** (Core account) → checkout (test Stripe) → add-on activates (see Billing for detail).
- [ ] Tier limits enforced (Starter/Core = 1 business, Pro = 3).
- [ ] Prices are **consistent** across dashboard, checkout, and marketing pages.

## 5.F Hosted business page

- [ ] **Owner editor** (merchant page / `/website-preview`) — brand colour, font, hero, sections, hours, gallery edit with a **live preview**.
- [ ] **Publish** → the public page at `/biz/:slug` renders (Pro's is live at `/biz/yakima-coffee-company`).
- [ ] Live campaigns auto-appear on the public page.
- [ ] The public page works logged-out and on mobile; input is sanitised (no broken/injected markup).

## 5.G Business settings

- [ ] `/business-settings` — edit business profile (name, category, address, hours). Saves + reflects on the public page/map.
- [ ] Address geocodes to the right map location and the correct **territory**.

## 5.H Cross-cutting

- [ ] Legible on desktop *and* tablet/phone.
- [ ] A Core business never sees Pro-only data/tools except as an upsell.
- [ ] Suspended/locked state (simulate via Admin/Billing) shows the right restricted UI.

# 6 · Coordinator

**What this area is:** the field-sales role. A coordinator owns a **territory** (a map circle), recruits and onboards the businesses inside it, and earns a **revenue share** on them.

**Log in as** `coordinator@cirqlback.test` — owns the **Yakima Valley** territory with a **70%** share. **Key route:** `/coordinator`.

> **Understand & learn:** a territory is an exclusive **circle** (centre + radius). A business belongs to exactly one territory, so coordinators never overlap. The share is 70/30 by default but **admin-adjustable (50–100%)** from the admin dashboard.

## 6.A Coordinator home (`/coordinator`)

- [ ] Loads with **real** data — their territory, businesses, earnings. No mock data.
- [ ] The territory map/circle renders in the right place (Yakima Valley).
- [ ] Every panel/CTA links somewhere real.
- [ ] The **AI Help Assistant** is present and role-appropriate.

## 6.B Territory & businesses

- [ ] **"Businesses in your territory"** table lists real businesses, with a **Category** column.
- [ ] Seeded **sales prospects** (~259 real Yakima businesses) to work — unclaimed, off the public map.
- [ ] **Remove a prospect** — deleting an *unclaimed* prospect works; deleting a *claimed* business is blocked (409). Confirm both.
- [ ] Prospects are ranked by category-fit (best leads first).

## 6.C Pitch tools

- [ ] **Pitch Assistant** — pick a prospect → tailored pitch by category, with a **printable one-pager**.
- [ ] **AI-personalised pitch** — the AI mode produces a customised pitch *(needs `OPENAI_API_KEY`; without it, falls back to the template — note which you see).*
- [ ] **Coordinator Sales Playbook** content is reachable and useful.

## 6.D Earnings

- [ ] **Earnings / goal card** shows a real projection based on their businesses and 70% share.
- [ ] The math checks out (share % × the businesses' revenue).
- [ ] If a payout mechanism is surfaced, it points at Stripe Connect.

## 6.E Onboarding a business (end-to-end, optional but valuable)

- [ ] Walk the flow of turning a prospect into a live business (claim/onboard). **Expect:** it moves out of prospects, gets an owner, appears on the public map, attributed to this coordinator's territory + share.

## 6.F Cross-cutting

- [ ] A coordinator only sees **their** territory's businesses and earnings — never another's or the whole platform's (admin-only).
- [ ] Works on desktop and tablet (field use).
- [ ] Any printable/exported collateral renders correctly.

# 7 · Admin Hub

**What this area is:** your operator console — the whole platform in one place. Every tab pulls from real `/api/admin/*` data, gated to real admins.

**Log in as** `canobbs@hotmail.com` and go to `/admin-dashboard`.

> **Understand & learn:** the hub renders its shell for anyone, but the **data** only loads for a real admin — so if numbers look empty, check you're on the admin account.

## 7.A Overview (command center)

- [ ] Loads with real platform-wide numbers (users, businesses, taps, activity).
- [ ] **Insights** — trends + an **activation funnel** render with real figures.
- [ ] **Retention / at-risk** — shows retained vs churning cohorts and flags at-risk accounts.
- [ ] Headline totals reconcile with the individual tabs.

## 7.B Revenue

- [ ] **MRR**, **liability** (outstanding points/rewards owed), and **trials** render with real values.
- [ ] Revenue reconciles with the businesses' tiers/add-ons (Core $19.99 / Pro $49.99 + add-ons).
- [ ] Cross-check one business's subscription here vs its own dashboard.

## 7.C Trust & Safety

- [ ] **Verification queue** — pending businesses to approve/reject; actions work.
- [ ] **Hosted-page kill-switch** — disable a business's public `/biz/:slug`; confirm it takes the page down.
- [ ] **Nonprofit revoke** — revoking nonprofit status works.
- [ ] **Suspend / unsuspend** a user — suspended users are gated; unsuspend restores access.

## 7.D Territories (the circular Territory Manager)

- [ ] Map shows territory **circles**; you can **create / edit** a territory (centre + radius).
- [ ] **Auto-assign leads** — unassigned businesses get bucketed into the right territory by location.
- [ ] **Reassign** a business between territories works and updates exclusivity.
- [ ] **Coordinator leaderboard** + share panel render.
- [ ] **Adjust a coordinator's share %** (50–100) here → cross-check it changes their earnings on the Coordinator dashboard.

## 7.E Map

- [ ] **Density heatmap** renders real business/tap density (Google Maps loads).
- [ ] Pins/overlays are real, not seeded prospects.

## 7.F Customers

- [ ] Real customer list with **redemption** and **repeat** metrics.
- [ ] Drill into a customer → their activity; matches what that customer sees.

## 7.G People / Support 360

- [ ] Search a user → **360 view** (account, activity, subscription).
- [ ] **Impersonate** → see the app as them; **stop** returns to admin.
- [ ] **Suspend** from here works (mirrors Trust & Safety).

## 7.H Platform

- [ ] **Integration / pricing config** renders and is editable.
- [ ] Changing a config value takes effect where it's used (careful — live-ish; note anything you change).

## 7.I Audit

- [ ] **Audit log** shows admin actions (suspends, config changes, territory edits) with who/what/when.
- [ ] Actions you just took appear in the log.

## 7.J Cross-cutting

- [ ] Every tab loads without errors and with real data (no stubs/placeholders).
- [ ] Destructive actions (suspend, kill-switch, revoke, config) have sensible confirmation and are logged.
- [ ] Usable on a laptop screen.

# 8 · Billing, Payments & Payouts

**What this area is:** the money — business subscriptions, add-on purchases, the enforcement calendar (charge / lock / suspend), dunning emails, and payouts to host businesses & coordinators via Stripe Connect. The highest-stakes area.

> **Test mode:** Stripe is in **test** mode. Use test cards (e.g. `4242 4242 4242 4242`, any future expiry/CVC). Never a real card. **Key routes:** `/checkout` · `/trial-discount`.

> **Understand & learn — the billing calendar:** charge on the **10th** → if unpaid, **lock** at month-end → **suspend** at **90 days** delinquent. Payouts to host businesses go out on the **15th**. Subscriptions are Stripe Subscriptions **anchored to the 10th**. Dunning = the reminder emails before lock/suspend.

## 8.A Subscribe / upgrade a business

- [ ] As **`core@`**, go through **checkout** (`/checkout`) to buy an **add-on** or upgrade. Use a test card. **Expect:** payment succeeds, the add-on/tier activates immediately, pricing correct (Core $19.99 / Pro $49.99 / add-ons $7.99–$14.99).
- [ ] **Decline card** (`4000 0000 0000 0002`) → clean failure, nothing activates, no partial charge.
- [ ] **Trial / discount** (`/trial-discount`), if applicable, applies the right price.
- [ ] After buying, the business dashboard + the admin **Revenue** tab both reflect the new subscription.

## 8.B Enforcement states (simulate via admin where possible)

- [ ] A business **in good standing** can tap-gate normally (customers can tap its tags).
- [ ] A **locked** business shows the **client lock screen** and its tap-gate is closed. *(Simulate through admin/billing rather than waiting a month.)*
- [ ] A **suspended** business (90d) is fully gated; unsuspending restores it.
- [ ] The state shown to the business matches the state the admin sees.

## 8.C Dunning (emails)

- [ ] On a failed payment, dunning reminder emails are scheduled/sent *(needs `SENDGRID_API_KEY` + `EMAIL_FROM`; if not set, the scheduler no-ops — note that rather than a bug).*
- [ ] The scheduler (node-cron, in-process) is running in the deployed app *(disabled in local dev unless `ENABLE_SCHEDULER=1`).*

## 8.D Payouts & Stripe Connect

- [ ] A **host business** / **coordinator** can connect a **Stripe Connect (Express)** account (onboarding completes in test mode).
- [ ] **15th-of-month payout** logic exists and targets the right recipients for the right amounts. *(Test-mode Connect has quirks — treat payout *math* as the primary check; note if a real transfer is hard to force.)*
- [ ] Payout amounts reconcile with what's owed (share % for coordinators; funded rewards for host businesses).

## 8.E Multi-store reward fairness (the split)

- [ ] Set up (or view) a **shared/group campaign** with a **funding host** business.
- [ ] Rewards earned across the shared campaign are **funded by the host** and cost is **split by tap-weight** across stores (the split ledger).
- [ ] **Settlements** reconcile — each store's share adds up to the total; the host isn't over/under-charged.

## 8.F Stripe webhooks (ops — mostly a config check)

- [ ] The live URL's Stripe webhook is subscribed to `invoice.paid` / `invoice.payment_failed` / `customer.subscription.deleted`. *(An ops step — if invoice states don't update after a test payment, the webhook likely isn't wired for this URL. Flag as ops, not code.)*
- [ ] `scripts/stripe-setup-products.ts` has been run so the products/prices exist.

## 8.G Cross-cutting (money must be exact)

- [ ] Every amount is formatted, correct, and consistent across dashboard / checkout / admin / marketing.
- [ ] No double-charges, no charge-then-fail-to-activate, no activate-without-charge.
- [ ] A business sees its own billing history; not anyone else's.
- [ ] Refund/cancel paths (if present) behave sanely.

# 9 · Messaging, Legal, AI Assistant & Cross-cutting

**What this area is:** the connective tissue (cross-role messaging), the compliance pack (legal docs), the in-app AI helper, and the platform-wide qualities (mobile, performance, security, links) you check *everywhere*.

**Key routes:** `/communication` (message center) · `/legal/:slug` · `/terms-of-service` · `/privacy-policy` · `/help-center` · `/user-guide`.

## 9.A Message Center (`/communication`)

- [ ] **Coordinator ↔ business** threads — a coordinator and one of their businesses can message each other.
- [ ] **Admin support + broadcasts** — admin can send a support reply and a broadcast; recipients receive it.
- [ ] **Customer updates feed** — a customer sees updates from businesses they follow/tapped.
- [ ] **Opt-in customer ↔ business** threads — only when the customer has opted in.
- [ ] Messages are **directional/scoped** — no one sees a thread they're not part of.
- [ ] New-message indicators/notifications work and link to the thread.

## 9.B Legal & compliance pack

- [ ] `/legal/:slug` renders each doc: **Terms**, **Privacy**, **FAQ**, **Merchant agreement**, **Coordinator IC agreement**, **1099 guide** (+ the internal insurance/security memo).
- [ ] `/terms-of-service` and `/privacy-policy` shortcuts work.
- [ ] Each legal doc has a working **Download PDF** button.
- [ ] The **billing calendar / dunning / payout terms** in the merchant/coordinator docs **match** what the product actually does.
- [ ] Footer legal links from any page resolve.

## 9.C AI Help Assistant

- [ ] It appears on the business / coordinator / admin dashboards (not for customers).
- [ ] Ask a how-to question → it answers, grounded in **that role's** guide, and **streams** the reply.
- [ ] It's **role-authorised server-side** — a customer/unauthorised user can't pull staff guides (should 403). Business grounding is **tier-scoped** (Pro gets the Pro guide).
- [ ] **Without `OPENAI_API_KEY`** it returns a graceful "unavailable" (503), not a crash *(an ops item; once the key is set, re-verify it answers).*

## 9.D Cross-cutting — check these EVERYWHERE

**Mobile / responsive**
- [ ] Every customer-facing page works on a phone; games are one-thumb playable; no horizontal scroll; tap targets big.
- [ ] Dashboards usable on tablet; admin fine on a laptop.

**Performance**
- [ ] Pages load in a couple of seconds on the live URL; no endless spinners.
- [ ] Games hold a smooth frame rate on a mid-range phone; no audio glitches.
- [ ] Big lists (prospects ~259, customers, taps) paginate/scroll without freezing.

**Security / privacy**
- [ ] Role gating holds (customer can't reach admin/merchant/coordinator data; admin API blocked for non-admins).
- [ ] No user ever sees another user's private data (accounts, billing, messages, points).
- [ ] Tap anti-abuse (cooldown/device/GPS) actually limits farming.
- [ ] Hosted-page input is sanitised; no injected markup renders.

**Links & navigation**
- [ ] Audit the nav/footer on each role's home — **every** link resolves (no 404/dead buttons).
- [ ] Back/forward and deep-linking to a route while logged in works.

**Errors & empty states**
- [ ] A bad URL / missing record shows a friendly message, not a raw 500 or blank page.
- [ ] Empty states (no campaigns yet, no taps yet) read sensibly, not "undefined."

**Consistency**
- [ ] Branding, pricing (Core $19.99 / Pro $49.99), copy, and terminology are consistent across the whole app and the legal/marketing pages.

## 9.E Wrap-up — the beta sign-off

When you've worked the areas, you should be able to say:
- [ ] I can complete the **core loop** end-to-end: business creates a campaign + tag → customer taps → earns points → spends them on a game perk → plays.
- [ ] I can complete the **money loop**: business subscribes/upgrades → billing reflects it → (host/coordinator) payout math is right.
- [ ] Every **role** works and stays in its lane.
- [ ] All **50 games** load and play; the arcade systems (wheel, Daily, Freestyle, Perks, online, how-to) work.
- [ ] I have a **logged list of issues** with severities to hand back.

That list is the beta's output — send it over and I'll triage and fix.
