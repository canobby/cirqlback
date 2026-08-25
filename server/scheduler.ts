// In-process scheduled jobs (Phase 2). Runs on the always-on Render web service.
// Jobs are idempotent so a restart mid-run is safe.
//
//   - Daily dunning sweep: send the lock / suspension email at the right
//     transition for past-due accounts (enforcement itself is real-time via
//     resolveBilling; this only handles the notifications).
//   - Monthly on the 15th: generate coordinator payouts for unpaid earnings.
//
// Note: this does NOT decide who becomes past-due — that comes from the admin
// billing control today and from Stripe invoice webhooks in Phase 3. The sweep
// only processes existing delinquencies, so it can never lock a paying customer.
import cron from "node-cron";
import { storage } from "./storage";
import { resolveBilling } from "./billing-state";
import { sendBillingLockedEmail, sendBillingSuspendedEmail } from "./email";

const TZ = process.env.SCHEDULER_TZ || "America/Los_Angeles";

export async function runBillingSweep(now: Date = new Date()): Promise<{
  scanned: number;
  lockEmails: number;
  suspendEmails: number;
}> {
  const users = await storage.listPastDueUsers();
  let lockEmails = 0;
  let suspendEmails = 0;
  for (const u of users) {
    const { state } = resolveBilling(u, now);
    const email = u.email || undefined;
    const name = u.firstName || undefined;
    if (state === "suspended") {
      if (!u.billingSuspendNotifiedAt) {
        if (email) await sendBillingSuspendedEmail(email, name);
        await storage.markBillingNotified(u.id, "suspend");
        suspendEmails++;
      }
    } else if (state === "locked") {
      if (!u.billingLockNotifiedAt) {
        if (email) await sendBillingLockedEmail(email, name);
        await storage.markBillingNotified(u.id, "lock");
        lockEmails++;
      }
    }
    // grace: no email (the policy notice goes out at month-end lock).
  }
  return { scanned: users.length, lockEmails, suspendEmails };
}

export async function runMonthlyPayouts(periodMonth?: string): Promise<{
  coordinators: number;
  payoutsCreated: number;
  totalCents: number;
}> {
  const coords = await storage.listCoordinators();
  let payoutsCreated = 0;
  let totalCents = 0;
  for (const c of coords) {
    if (c.isActive === false) continue;
    const payout = await storage.generateCoordinatorPayout(c.id, periodMonth);
    if (payout) {
      payoutsCreated++;
      totalCents += payout.totalShareCents ?? 0;
    }
  }
  return { coordinators: coords.length, payoutsCreated, totalCents };
}

export function startScheduler(): void {
  const enabled = process.env.NODE_ENV === "production" || process.env.ENABLE_SCHEDULER === "1";
  if (!enabled) {
    console.log("[scheduler] disabled in dev (set ENABLE_SCHEDULER=1 to run locally)");
    return;
  }
  // Daily 08:00 (TZ): dunning sweep.
  cron.schedule(
    "0 8 * * *",
    () => {
      runBillingSweep()
        .then((s) => console.log("[scheduler] billing sweep:", s))
        .catch((e) => console.error("[scheduler] billing sweep failed:", e));
    },
    { timezone: TZ },
  );
  // Monthly on the 15th at 09:00 (TZ): coordinator payouts.
  cron.schedule(
    "0 9 15 * *",
    () => {
      runMonthlyPayouts()
        .then((s) => console.log("[scheduler] monthly payouts:", s))
        .catch((e) => console.error("[scheduler] monthly payouts failed:", e));
    },
    { timezone: TZ },
  );
  console.log(`[scheduler] started (dunning daily 08:00 ${TZ}, payouts 15th 09:00 ${TZ})`);
}
