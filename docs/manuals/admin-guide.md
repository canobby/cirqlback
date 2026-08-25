# Cirqlback — Administrator Guide

**For:** platform administrators who oversee the whole Cirqlback system — users, businesses, coordinators, revenue share, and payouts.
**Log in at:** `/auth` → **Admin Dashboard** at **`/admin-dashboard`**

---

## 1. How admin access works

- An admin is a **normal user account** that has been granted an **admin record** — there is **no separate admin sign‑up page**. You register/log in at `/auth` like anyone else; your account is elevated to admin behind the scenes.
- Admins have a **level**: **master**, **platform**, or **support**. A **master** admin can invite and manage other admins.
- Every admin action is protected — the admin area and its APIs require a valid, active admin account. Non‑admins simply can't reach it.

> **Provisioning the first admin:** the very first admin is created directly in the database (register the account, then add its admin record). After that, a master admin can invite others from the dashboard.

---

## 2. The Admin Dashboard (`/admin-dashboard`)

The dashboard is organized into tabs:

| Tab | What you do there |
|---|---|
| **Overview** | Command center, insights, retention / at‑risk businesses. |
| **Messages** | Broadcast announcements to any audience + support threads with coordinators/businesses. |
| **Revenue** | MRR, coordinator liability, trials — plus **shared‑campaign settlements** (see §10). |
| **Trust & Safety** | Verification queue, hosted‑page kill‑switch, nonprofit revoke. |
| **Territories** | Circular territory manager, coordinator leaderboard, share %. |
| **Map** | Discovery‑density heatmap + territory coverage. |
| **Customers** | Redemption / repeat‑rate health. |
| **People** | **Support 360** — impersonate, suspend, and the **reward & balance fixer** + award **badges** (see §9). |
| **Platform** | Settings, add‑on catalog, pricing, **points rewards & prize draws**, **passports/collections**, **seasonal events** (see §11). |
| **Audit** | Log of privileged admin actions. |

Your **admin level** (e.g. "Admin Access Level: Master") is shown at the top.

---

## 3. Managing admins (master only)

If you're a **master** admin:

- **Invite an admin** — send an invitation and set their admin level. Invited admins accept and gain access.
- **Manage status** — activate/deactivate admin accounts.
- Non‑master admins can use the dashboard but can't invite or elevate others.

---

## 4. Coordinator revenue share (Coordinators tab)

This is where you control what each Community Coordinator earns.

1. Open the **Coordinators** tab.
2. You'll see each coordinator with their **name/email**, plan status, current **share %**, and a live **"platform keeps X%"** readout.
3. Type a new share in the box (a whole number **between 50 and 100**) and click **Save**.
   - The **default** is **70%** (coordinator) / **30%** (platform).
   - Values outside 50–100 (or non‑whole numbers) are rejected — you'll see an error and nothing changes.
4. **Important:** a change applies to **future earnings only**. Each past charge already recorded keeps the rate it was charged at, so payouts stay accurate.

Use higher shares (toward 100%) for founding or high‑performing coordinators, and lower shares (toward 50%) where the platform carries more of the load.

---

## 5. Coordinator payouts

Payouts are **reporting‑based** — Cirqlback records what each coordinator has earned; you confirm when money is actually sent.

- **Generate a payout** for a coordinator (optionally for a specific month). This rolls up their **unpaid** earnings into a single **pending** payout and links those earnings to it. If there's nothing unpaid, you'll get a "nothing to pay out" message.
- **Mark a payout paid** (record a reference/notes) once you've sent the funds — or **void** it to release its earnings back to the unpaid pool.
- Coordinators see their pending and paid amounts in their own Revenue panel.

> *Automated payouts (e.g. Stripe Connect transfers) are a documented future enhancement; today the ledger is reporting‑only and you settle out‑of‑band.*

---

## 6. Pricing (how charges are set)

- Subscription and add‑on prices are **defined server‑side** — the amount a customer is charged never comes from the browser, so no one can pay the wrong price.
- Current plans: **Starter** (free trial), **Core** $19.99/mo, **Pro** $49.99/mo. Add‑ons: Custom Branding $7.99, Advanced Analytics $12.99, Map Priority $14.99, Scavenger Builder $14.99.
- Changing a price is a code/config change (in the server price catalog), not something set through the UI — coordinate that with your engineering contact.

---

## 7. Payments & Stripe

- Payments run through **Stripe**. When a payment succeeds, Stripe notifies Cirqlback via a **signed webhook**, and the platform then **activates** the subscription or add‑on and **attributes** the coordinator's revenue share — all automatically and verified server‑side.
- For this to work in a live environment, the deployment needs valid Stripe keys and a configured webhook endpoint (an engineering/deploy task).

---

## 8. Security & good practice

- **Least privilege:** grant **master** only to those who need to manage other admins; use **platform/support** otherwise.
- **Admin accounts are real logins** — protect passwords, don't share accounts, and deactivate admins who leave.
- **Money‑affecting actions** (revenue share, payouts) are logged by the changes they make; review the Coordinators tab and payout history when reconciling.
- Customer data is minimal by design — customers are anonymous unless they opt in with an email.

---

## 9. Support, recognition & the reward fixer (People tab)

- **Support 360** — open any user to see their profile and businesses, **impersonate** ("view as") for support, and **suspend/unsuspend**.
- **Reward & balance fixer** — correct a customer's **loyalty points** (add/remove, floored at 0) or their **rewards** (grant one, or flip a redemption). Every change requires a reason and is written to an audit ledger. Admins can fix any customer; coordinators are limited to their territory.
- **Badges** — award a recognition **badge** to any person or business (custom art or a preset). Businesses' badges show publicly on their hosted page.
- **Messages tab** — **broadcast** an announcement to Everyone / Businesses / Coordinators / Customers, and run **support threads** with any coordinator or business.

---

## 10. Shared‑campaign settlements & payouts (Revenue tab)

When a **funded** multi‑store reward is redeemed, its cost is split across the stores the customer visited (tap‑weighted); the **host** fronts it and the others owe their share.

- The Revenue tab shows **pending amounts owed to each host**. **Create a statement** to roll a host's owed contributions for a period into one bill.
- **Pay it out via Stripe** to the host's connected account (if they've onboarded payouts), or **mark it paid** manually with a reference. Coordinators can do the same for their territory's hosts.
- Automated payouts use **Stripe Connect** — a business connects a payout account from its hub. (Going live needs Connect enabled on the live Stripe account — an engineering/deploy task.)

---

## 11. Platform gamification (Platform tab)

- **Points rewards & prize draws** — create **platform perks** customers redeem with points, or **prize draws** (customers spend points to enter). **Draw a winner** with one click. Businesses add their own in‑store perks from their hubs.
- **Passports / collections** — build a curated "visit all these shops" set with a completion point reward. Coordinators can build territory passports.
- **Seasonal events** — schedule a **time‑boxed event** (e.g. *First Fridays*) that **multiplies tap points** (2×–5×) while it's live. Customers see a limited‑time banner.

---

## 12. FAQ

**How do I create another admin?** As a master admin, invite them from the dashboard and set their level; the first admin is seeded in the database.

**I changed a coordinator's share — did it change past payouts?** No. Only future earnings use the new rate; historical earnings keep their snapshotted rate.

**A coordinator says they weren't paid.** Check their payout list — earnings may still be **unpaid/pending** until you **generate** and **mark paid** a payout.

**Can I set a coordinator to keep 100%?** Yes — the band allows 50–100 for special deals (the platform then keeps 0% on that coordinator's charges).

**Where do I change a plan's price?** In the server‑side price catalog (an engineering change), not the admin UI — this keeps pricing tamper‑proof.

---

*Coordinator‑side details are in the **[Coordinator Guide](./coordinator-guide.md)**; business features are in the **[Basic](./business-basic-guide.md)** and **[Pro](./business-pro-guide.md)** guides.*
