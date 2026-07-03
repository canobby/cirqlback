import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Split, FileText, CheckCircle2, Landmark } from "lucide-react";

// Operator view of shared-campaign reward settlements (admin = platform-wide,
// coordinator = their territory's hosts). Roll a host's owed contributions into
// a monthly statement, then settle it — automatically via Stripe to the host's
// connected account, or manually (mark paid) if the host hasn't connected one.

type Scope = "admin" | "coordinator";

interface Pending { hostBusinessId: string; hostName: string; periodMonth: string; totalCents: number; total: string; count: number; hostPayoutsEnabled: boolean }
interface Settlement { id: string; hostName: string; periodMonth: string; total: string; totalCents: number; status: string; method?: string; reference: string | null; hostPayoutsEnabled: boolean; createdAt: string | null }

export default function RewardSettlementsPanel({ scope }: { scope: Scope }) {
  const base = scope === "admin" ? "/api/admin" : "/api/coordinator";
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data } = useQuery<{ pending: Pending[]; settlements: Settlement[] }>({
    queryKey: [`${base}/reward-settlements`],
    retry: false,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: [`${base}/reward-settlements`] });

  const generate = useMutation({
    mutationFn: async (p: Pending) =>
      apiRequest("POST", `${base}/reward-settlements/generate`, { hostBusinessId: p.hostBusinessId, periodMonth: p.periodMonth }),
    onSuccess: () => { toast({ title: "Statement created" }); refresh(); },
    onError: () => toast({ title: "Couldn't create statement", variant: "destructive" }),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "paid" | "void" }) => {
      const reference = status === "paid" ? (window.prompt("Payment reference (optional):") ?? "") : "";
      return apiRequest("POST", `${base}/reward-settlements/${id}/status`, { status, reference });
    },
    onSuccess: () => { toast({ title: "Settlement updated" }); refresh(); },
    onError: () => toast({ title: "Couldn't update settlement", variant: "destructive" }),
  });

  const payout = useMutation({
    mutationFn: async (id: string) => apiRequest("POST", `${base}/reward-settlements/${id}/payout`),
    onSuccess: () => { toast({ title: "Paid out via Stripe" }); refresh(); },
    onError: (e: any) => toast({ title: "Payout failed", description: String(e?.message ?? "").slice(0, 140), variant: "destructive" }),
  });

  const pending = data?.pending ?? [];
  const settlements = data?.settlements ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <Split className="h-5 w-5 text-purple-600" />
          Shared-campaign settlements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          When a funded multi-store reward is redeemed, each participating store owes the host its tap-weighted share.
          Roll a host’s owed shares into a monthly statement, then mark it settled once paid.
        </p>

        <div>
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Pending (owed to hosts)</div>
          {pending.length === 0 ? (
            <p className="text-sm text-gray-500">Nothing outstanding.</p>
          ) : (
            <div className="space-y-2">
              {pending.map((p) => (
                <div key={`${p.hostBusinessId}-${p.periodMonth}`} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 dark:border-gray-800 p-3">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">{p.hostName}</div>
                    <div className="text-xs text-gray-500">{p.periodMonth} · {p.count} contribution(s)</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-semibold text-purple-600">${p.total}</span>
                    <Button size="sm" onClick={() => generate.mutate(p)} disabled={generate.isPending} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                      <FileText className="h-4 w-4 mr-1" /> Create statement
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {settlements.length > 0 && (
          <div>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Statements</div>
            <div className="space-y-2">
              {settlements.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 dark:border-gray-800 p-3">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">{s.hostName}</div>
                    <div className="text-xs text-gray-500">
                      {s.periodMonth} · ${s.total}
                      {s.method === "stripe_connect" ? " · via Stripe" : ""}
                      {s.reference ? ` · ref ${s.reference}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {s.status === "paid" ? <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />paid</Badge>
                      : s.status === "void" ? <Badge className="bg-gray-200 text-gray-600 border-0">void</Badge>
                      : <Badge className="bg-amber-100 text-amber-700 border-amber-200">pending</Badge>}
                    {s.status === "pending" && (
                      <>
                        {s.hostPayoutsEnabled && (
                          <Button size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white" onClick={() => payout.mutate(s.id)} disabled={payout.isPending}>
                            <Landmark className="h-4 w-4 mr-1" /> Pay out via Stripe
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="text-green-700" onClick={() => setStatus.mutate({ id: s.id, status: "paid" })} disabled={setStatus.isPending}>Mark paid</Button>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setStatus.mutate({ id: s.id, status: "void" })} disabled={setStatus.isPending}>Void</Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
