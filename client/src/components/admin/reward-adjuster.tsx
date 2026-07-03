import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Coins, Gift, Search, Plus, Minus, History } from "lucide-react";

// Manual reward / balance fixer. Admin uses it on a known user (from the Support
// 360 dialog); a coordinator looks a customer up by email and is limited to
// their territory server-side. Every action requires a reason and is audited.

type Scope = "admin" | "coordinator";

interface RewardRow {
  id: string; businessId: string | null; businessName: string; title: string;
  type: string; value: string | null; isRedeemed: boolean; redeemedAt: string | null; createdAt: string | null;
}
interface Adjustment {
  id: string; actorRole: string; kind: string; pointsDelta: number | null;
  reason: string | null; createdAt: string | null;
}
interface CustomerView {
  notFound?: boolean;
  user: { id: string; email: string | null; name: string; availablePoints: number; totalPoints: number; totalPointsEarned: number };
  canAdjustPoints: boolean;
  rewards: RewardRow[];
  relatedBusinesses: { id: string; name: string }[];
  adjustments: Adjustment[];
}

const REWARD_TYPES = [
  { value: "free_item", label: "Free item" },
  { value: "discount", label: "Discount" },
  { value: "points", label: "Points" },
  { value: "cashback", label: "Cashback" },
];

function timeLabel(ts: string | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function RewardAdjuster({ scope, userId }: { scope: Scope; userId?: string }) {
  const base = scope === "admin" ? "/api/admin" : "/api/coordinator";
  const { toast } = useToast();
  const [emailInput, setEmailInput] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");

  const lookupUrl = userId
    ? `${base}/customers/rewards?userId=${userId}`
    : submittedEmail
      ? `${base}/customers/rewards?email=${encodeURIComponent(submittedEmail)}`
      : null;

  const { data, refetch, isFetching } = useQuery<CustomerView>({
    queryKey: [lookupUrl],
    enabled: !!lookupUrl,
    retry: false,
    queryFn: async () => {
      const res = await fetch(lookupUrl!, { credentials: "include" });
      if (res.status === 404) return { notFound: true } as CustomerView;
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  // ── mutations ──
  const [delta, setDelta] = useState("");
  const [pointsReason, setPointsReason] = useState("");
  const adjustPoints = useMutation({
    mutationFn: async (signedDelta: number) =>
      apiRequest("POST", `${base}/customers/points`, {
        userId: data!.user.id, delta: signedDelta, reason: pointsReason.trim(),
      }),
    onSuccess: () => { toast({ title: "Points adjusted" }); setDelta(""); setPointsReason(""); refetch(); },
    onError: (e: any) => toast({ title: "Couldn't adjust points", description: String(e?.message ?? "").slice(0, 120), variant: "destructive" }),
  });

  const [grantBiz, setGrantBiz] = useState("");
  const [grantTitle, setGrantTitle] = useState("");
  const [grantType, setGrantType] = useState("free_item");
  const [grantValue, setGrantValue] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const grant = useMutation({
    mutationFn: async () =>
      apiRequest("POST", `${base}/rewards/grant`, {
        userId: data!.user.id, businessId: grantBiz, title: grantTitle.trim(),
        type: grantType, value: grantValue.trim() || null, reason: grantReason.trim(),
      }),
    onSuccess: () => { toast({ title: "Reward granted" }); setGrantTitle(""); setGrantValue(""); setGrantReason(""); refetch(); },
    onError: (e: any) => toast({ title: "Couldn't grant reward", description: String(e?.message ?? "").slice(0, 120), variant: "destructive" }),
  });

  const toggleRedeem = useMutation({
    mutationFn: async (r: RewardRow) => {
      const reason = window.prompt(`Reason for marking "${r.title}" as ${r.isRedeemed ? "NOT redeemed" : "redeemed"}:`);
      if (!reason || !reason.trim()) throw new Error("cancelled");
      return apiRequest("POST", `${base}/rewards/redeem`, { rewardId: r.id, redeemed: !r.isRedeemed, reason: reason.trim() });
    },
    onSuccess: () => { toast({ title: "Reward updated" }); refetch(); },
    onError: (e: any) => { if (String(e?.message) !== "Error: cancelled") toast({ title: "Couldn't update reward", variant: "destructive" }); },
  });

  const applyDelta = (sign: 1 | -1) => {
    const n = parseInt(delta, 10);
    if (!Number.isFinite(n) || n <= 0) return toast({ title: "Enter a positive number", variant: "destructive" });
    if (!pointsReason.trim()) return toast({ title: "A reason is required", variant: "destructive" });
    adjustPoints.mutate(sign * n);
  };

  const view = data;
  const cust = view && !view.notFound ? view.user : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <Coins className="h-5 w-5 text-purple-600" />
          Reward & balance fixer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {scope === "coordinator"
            ? "Look up a customer by email to correct points or rewards for businesses in your territory. Every change is logged."
            : "Adjust this customer's points or rewards. Every change is logged."}
        </p>

        {/* Coordinator lookup */}
        {!userId && (
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") setSubmittedEmail(emailInput.trim().toLowerCase()); }}
                placeholder="Customer email…"
                className="pl-9"
              />
            </div>
            <Button onClick={() => setSubmittedEmail(emailInput.trim().toLowerCase())} disabled={!emailInput.trim()}>
              Look up
            </Button>
          </div>
        )}

        {lookupUrl && view?.notFound && (
          <p className="text-sm text-gray-500">No registered customer for that email. Balances only exist for customers with an account.</p>
        )}
        {isFetching && !cust && <p className="text-sm text-gray-400">Loading…</p>}

        {cust && (
          <div className="space-y-5">
            {/* Balance summary */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{cust.name}</div>
                  <div className="text-xs text-gray-500">{cust.email}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-600">{cust.availablePoints.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">available pts · {cust.totalPoints.toLocaleString()} total</div>
                </div>
              </div>
            </div>

            {/* Points adjuster */}
            <div>
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Adjust points</div>
              {!view!.canAdjustPoints ? (
                <p className="text-sm text-gray-500">
                  You can’t adjust this customer’s points — they have no activity in your territory.
                </p>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="number" min="1" value={delta}
                    onChange={(e) => setDelta(e.target.value)}
                    placeholder="Amount" className="sm:w-28"
                  />
                  <Input
                    value={pointsReason} onChange={(e) => setPointsReason(e.target.value)}
                    placeholder="Reason (required)" className="flex-1"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => applyDelta(1)} disabled={adjustPoints.isPending} className="text-green-700">
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                    <Button variant="outline" onClick={() => applyDelta(-1)} disabled={adjustPoints.isPending} className="text-red-700">
                      <Minus className="h-4 w-4 mr-1" /> Remove
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Rewards */}
            <div>
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Gift className="h-4 w-4 text-purple-600" /> Rewards ({view!.rewards.length})
              </div>
              {view!.rewards.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No rewards{scope === "coordinator" ? " at your territory businesses" : ""} yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {view!.rewards.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 dark:border-gray-800 p-3">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">{r.title}</div>
                        <div className="text-xs text-gray-500">{r.businessName} · {r.type}{r.value ? ` · ${r.value}` : ""}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {r.isRedeemed
                          ? <Badge className="bg-gray-200 text-gray-700 border-0">Redeemed</Badge>
                          : <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>}
                        <Button size="sm" variant="outline" onClick={() => toggleRedeem.mutate(r)} disabled={toggleRedeem.isPending}>
                          {r.isRedeemed ? "Un-redeem" : "Mark redeemed"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Grant a reward */}
            <div>
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Grant a reward</div>
              {view!.relatedBusinesses.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No {scope === "coordinator" ? "territory " : ""}businesses this customer has visited — can’t grant a reward.
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={grantBiz} onChange={(e) => setGrantBiz(e.target.value)}
                      className="h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm sm:w-48"
                    >
                      <option value="">Business…</option>
                      {view!.relatedBusinesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <Input value={grantTitle} onChange={(e) => setGrantTitle(e.target.value)} placeholder="Reward title" className="flex-1" />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={grantType} onChange={(e) => setGrantType(e.target.value)}
                      className="h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm sm:w-40"
                    >
                      {REWARD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <Input value={grantValue} onChange={(e) => setGrantValue(e.target.value)} placeholder="Value (optional)" className="sm:w-40" />
                    <Input value={grantReason} onChange={(e) => setGrantReason(e.target.value)} placeholder="Reason (required)" className="flex-1" />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => grant.mutate()}
                      disabled={!grantBiz || !grantTitle.trim() || !grantReason.trim() || grant.isPending}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                    >
                      <Gift className="h-4 w-4 mr-1" /> Grant reward
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Audit history */}
            {view!.adjustments.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <History className="h-4 w-4 text-gray-500" /> Recent adjustments
                </div>
                <div className="space-y-1">
                  {view!.adjustments.slice(0, 8).map((a) => (
                    <div key={a.id} className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between gap-2 border-b border-gray-50 dark:border-gray-900 py-1">
                      <span className="truncate">
                        <Badge variant="outline" className="mr-2 capitalize">{a.kind}{a.pointsDelta != null ? ` ${a.pointsDelta > 0 ? "+" : ""}${a.pointsDelta}` : ""}</Badge>
                        <span className="text-gray-500">{a.actorRole}</span> — {a.reason}
                      </span>
                      <span className="text-gray-400 flex-shrink-0">{timeLabel(a.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
