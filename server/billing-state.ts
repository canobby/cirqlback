// Billing-state resolver (Phase 1 enforcement).
//
// Policy (see docs/legal/merchant-agreement.md §2):
//   - Monthly plans are charged on the 10th of the service month.
//   - If payment isn't completed by the END of that month -> the dashboard and
//     taps are LOCKED.
//   - After 90 days unpaid -> the service is SUSPENDED.
//
// We drive this from two fields on `users`:
//   - pastDueSince: when the current delinquency began (null when current).
//   - paidThroughDate: end of the last paid service period (informational).
//
// In Phase 3 these are set from Stripe invoice webhooks; until then they're set
// by the admin billing control / the scheduler.
import type { User } from "@shared/schema";

export type BillingState = "active" | "grace" | "locked" | "suspended";

export const SUSPEND_AFTER_DAYS = 90;

function firstOfNextMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
}
function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

export interface BillingInfo {
  state: BillingState;
  pastDueSince: Date | null;
  paidThroughDate: Date | null;
  lockAt: Date | null; // when dashboard/taps lock (end of the past-due service month)
  suspendAt: Date | null; // when service is suspended (90 days after past due)
}

type BillingFields = Pick<User, "pastDueSince" | "paidThroughDate">;

export function resolveBilling(user: BillingFields, now: Date = new Date()): BillingInfo {
  const pastDueSince = user.pastDueSince ? new Date(user.pastDueSince as any) : null;
  const paidThroughDate = user.paidThroughDate ? new Date(user.paidThroughDate as any) : null;
  if (!pastDueSince) {
    return { state: "active", pastDueSince: null, paidThroughDate, lockAt: null, suspendAt: null };
  }
  const lockAt = firstOfNextMonth(pastDueSince); // "by the end of the month" -> locks once the next month starts
  const suspendAt = addDays(pastDueSince, SUSPEND_AFTER_DAYS);
  let state: BillingState = "grace";
  if (now >= suspendAt) state = "suspended";
  else if (now >= lockAt) state = "locked";
  return { state, pastDueSince, paidThroughDate, lockAt, suspendAt };
}

// Locked and suspended both block dashboard actions and taps. `grace` (past due
// but before month-end) only warns.
export function billingBlocksAccess(state: BillingState): boolean {
  return state === "locked" || state === "suspended";
}
