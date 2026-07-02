# Cirqlback — Business Guide (Basic / Core Plan)

**For:** single‑location local businesses running loyalty with Cirqlback on the **Core ($19.99/mo)** plan — or the free **Starter** 6‑month trial.
**Log in at:** `/auth`

> **Which plan am I on?** *Starter* = free 6‑month trial (great to get going). *Core* ("Basic") = $19.99/mo — everything you need to run loyalty at one location. Need more locations, unlimited taps, or priority support? See the **[Pro Guide](./business-pro-guide.md)**.

---

## 1. Getting started

1. Go to **`/auth`** and choose **Create an account** → sign up as a **Business**.
2. Verify you can sign in, then open your **Merchant Dashboard** at **`/merchant`**.
3. Fill in your business details (name, address, description, category). Your address puts you on the **Discovery Map** so customers can find you.

**Your plan at a glance (Core):**

| | Core |
|---|---|
| Business locations | 1 |
| Campaigns | Unlimited |
| Customer taps / month | 500 |
| Cirql tags included | 20 |
| Analytics | Tap & redemption analytics |
| Support | Email |
| Add‑ons | Available to purchase |

---

## 2. Core concepts

- **Cirql tag** — an NFC sticker/stand at your counter. Customers tap it to earn.
- **Campaign** — the rule behind the reward (e.g. "Buy 5, get 1 free" punch card, or a % discount).
- **Reward** — what the customer earns; each has a code they redeem in‑store.
- **Tap** — one customer interaction. Your plan includes a monthly tap allowance.

---

## 3. Create your first campaign

From the Merchant Dashboard:

1. Open **Campaigns → New campaign**.
2. Pick a **type**:
   - **Punch card / loyalty** — set a **tap goal** (e.g. 5). The reward unlocks every Nth tap.
   - **Discount** — a percentage or fixed value.
3. Give it a **name** and **reward** (e.g. "Free coffee"), set a value if relevant, and save.
4. Your campaign is now **live** and ready to attach to a tag.

> Only the business that owns a campaign can edit or delete it — your campaigns are private to you.

---

## 4. Set up your Cirql tags

1. Open **NFC Tags → New tag**.
2. Give the tag a **location label** (e.g. "Front counter," "Patio") so you can track where taps happen.
3. Link it to a **campaign**.
4. You'll get a **tap URL** and a **QR code** — write the URL to a physical NFC tag (from the dashboard's tag writer where supported) and/or print the QR as a backup.
5. Place the tag where customers can reach it. Test it with your own phone.

You can **rename, re‑point, or deactivate** your own tags anytime. Each tag tracks its own tap count.

---

## 5. Run the loyalty loop

Once tags are live:

- Customers **tap → earn** automatically. You don't have to do anything per‑tap.
- When a customer completes a punch card or earns a discount, they show you a **reward code**.
- **Redeem it:** open the reward (staff can look it up by code) and mark it redeemed. A redeemed code can't be reused.

**Group campaigns (optional):** you can **join open multi‑store campaigns** so your shop is part of a "tap at 3 shops" trail — a great way to share foot traffic with neighbors. Find joinable campaigns in the Merchant Dashboard's group‑campaigns panel.

---

## 6. Analytics

Open **Analytics** (`/analytics`) for real numbers from your taps and redemptions:

- **Total taps**, **active customers**, **rewards issued vs redeemed** (conversion rate)
- **Revenue** (from your entered sales data, or estimated from reward value)
- **Busiest hours** and your **peak window**
- **Top campaigns** and **top tag locations**
- A **recent‑activity** feed (latest taps and redemptions)

> Want deeper insights (best tag zones, return‑visit timing, heatmaps)? That's the **Advanced Analytics** add‑on (see §8).

**Sales data:** enter daily sales in the dashboard to unlock accurate revenue, average‑order, and Cirql‑driven‑sales metrics.

---

## 7. Customer relationships

- **Favorites & reminders:** customers can favorite your shop. From the dashboard's **Reminders** panel you can send them nudges ("Your card's almost full!").
- **Your tap screen:** by default it shows your business name and offer. Want your **colors, logo, slogan, and links** on it? That's the **Custom Branding** add‑on (§8).

---

## 8. Add‑ons (optional upgrades)

Add‑ons are per‑business monthly upgrades you can buy from the **Add‑ons** panel in your dashboard. Available on any paid plan:

| Add‑on | Price/mo | What it does |
|---|---|---|
| **Custom Tap‑Screen Branding** | $7.99 | Your colors, logo, slogan & links on the customer tap page. |
| **Advanced Analytics Pack** | $12.99 | Best‑performing tag zones, return‑visit timing, busiest‑hour heatmaps, redemption funnel. |
| **Map Priority Placement** | $14.99 | A boosted, highlighted pin on the discovery map. |
| **Contest & Scavenger‑Hunt Builder** | $14.99 | Build multi‑stop scavenger hunts and prize contests. |

Buying an add‑on takes you through secure checkout; it activates automatically once payment succeeds.

---

## 9. Billing & your account

- Manage your plan and see your current tier under **Account** (`/account`).
- **Upgrade** to Pro or add add‑ons via **Checkout** (`/checkout`) — payments are processed securely by Stripe; Cirqlback never sees your card number, and the price is set server‑side (you're always charged the correct plan price).
- On the **Starter** trial you may be offered a discounted rate to convert to a paid plan before the trial ends.

---

## 10. Tips & FAQ

**How do I get more taps or locations?** Upgrade to **Pro** (3 locations, unlimited taps, 50 tags, priority support).

**A customer says their reward won't work.** Check the reward code's status — it may already be **redeemed** or **expired**.

**Can customers cheat the punch card?** No — there's a per‑tag cool‑down, optional GPS proximity, and device fingerprinting to prevent rapid repeat taps.

**Do customers need an account?** No. They're anonymous unless they share an email to save progress.

**Where do I place tags?** Anywhere customers naturally pause — the register, the table, the exit. Label each one so your analytics show which spots perform best.

---

*Need the bigger toolkit? See the **[Pro Guide](./business-pro-guide.md)**.*
