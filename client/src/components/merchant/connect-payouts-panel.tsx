import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Landmark, CheckCircle2, ExternalLink } from "lucide-react";

// Stripe Connect (Express) onboarding for the merchant's business, so it can
// RECEIVE automated payouts (e.g. its owed share as a shared-campaign host).

interface Biz { id: string; name: string }
interface Status { connected: boolean; payoutsEnabled: boolean; detailsSubmitted: boolean }

export default function ConnectPayoutsPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: myBiz = [] } = useQuery<Biz[]>({ queryKey: ["/api/my/businesses"], retry: false });
  const businessId = myBiz[0]?.id;

  const { data: status } = useQuery<Status>({
    queryKey: [`/api/connect/status?businessId=${businessId}`],
    enabled: !!businessId,
    retry: false,
  });

  // When the merchant returns from Stripe onboarding (?connect=done|refresh),
  // refresh status and clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (businessId && (params.get("connect") === "done" || params.get("connect") === "refresh")) {
      qc.invalidateQueries({ queryKey: [`/api/connect/status?businessId=${businessId}`] });
      params.delete("connect");
      const q = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (q ? `?${q}` : ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const onboard = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/connect/onboard", { businessId });
      return (await res.json()) as { url: string };
    },
    onSuccess: (d) => { window.location.href = d.url; },
    onError: (e: any) => toast({ title: "Couldn't start payout setup", description: String(e?.message ?? "").slice(0, 120), variant: "destructive" }),
  });

  if (!businessId) return null;
  const enabled = status?.payoutsEnabled;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-gray-900">
          <span className="flex items-center gap-2"><Landmark className="h-5 w-5 text-purple-600" /> Payouts</span>
          {enabled
            ? <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Enabled</Badge>
            : status?.connected
              ? <Badge className="bg-amber-100 text-amber-700 border-amber-200">In progress</Badge>
              : <Badge variant="outline">Not set up</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {enabled ? (
          <p className="text-sm text-gray-600">
            Your business can receive automated payouts (via Stripe) — for example, your owed share when you host a shared multi-store campaign.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Connect a payout account (Stripe-hosted, a few minutes) to receive automated payouts — like your share when you host a shared campaign reward.
            </p>
            <Button onClick={() => onboard.mutate()} disabled={onboard.isPending} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              <ExternalLink className="h-4 w-4 mr-1" /> {status?.connected ? "Finish payout setup" : "Set up payouts"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
