import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Lock, AlertTriangle } from "lucide-react";

type BillingStatus = {
  state: "active" | "grace" | "locked" | "suspended";
  lockAt?: string | null;
  suspendAt?: string | null;
  pastDueSince?: string | null;
};

// Wraps a paid dashboard. When the account is locked/suspended for non-payment
// it replaces the content with an "update billing" screen; in the grace window
// (past due, before month-end) it shows a dismissable-free warning banner.
export default function BillingGate({ children }: { children: ReactNode }) {
  const { data } = useQuery<BillingStatus>({ queryKey: ["/api/billing/status"], retry: false });
  const state = data?.state;

  if (state === "locked" || state === "suspended") {
    const suspended = state === "suspended";
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-purple-50 px-4 pt-20 pb-10">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg ring-1 ring-purple-100">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <Lock className="h-7 w-7 text-red-600" />
          </div>
          <h1 className="mb-2 text-xl font-bold text-gray-900">
            {suspended ? "Your account is suspended" : "Your account is locked"}
          </h1>
          <p className="mb-6 text-sm text-gray-600">
            {suspended
              ? "Your Cirqlback service has been suspended for non-payment. Your taps are paused and your dashboard is locked. Update your billing to restore service."
              : "Your payment is past due, so your dashboard is locked and your Cirqlback taps have stopped working. Update your billing to restore service."}
          </p>
          <Link
            href="/checkout"
            data-testid="link-update-billing"
            className="inline-flex w-full items-center justify-center rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700"
          >
            Update billing
          </Link>
          <div className="mt-3 text-xs text-gray-400">Need help? Contact support.</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {state === "grace" && (
        <div className="fixed inset-x-0 top-16 z-40 flex justify-center px-4">
          <div className="flex max-w-2xl items-center gap-2 rounded-b-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 shadow-sm" data-testid="banner-billing-pastdue">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Your payment is past due. Please pay before month-end to avoid your dashboard and taps being locked.{" "}
              <Link href="/checkout" className="font-semibold underline">Update billing</Link>
            </span>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
