import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Heart, Lock, Gift, HandCoins, Plus } from "lucide-react";

interface Biz { id: string; name: string; isNonprofit?: boolean; ein?: string | null; nonprofitMission?: string | null }
interface Totals {
  lifetimeCents: number;
  totalDonations: number;
  byCampaign: { id: string; name: string; isActive: boolean; donationPerTapCents: number; raisedCents: number; taps: number }[];
  byStore: { businessId: string; name: string; raisedCents: number; taps: number }[];
}

const usd = (c: number) => `$${((c || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50/40 via-purple-50/30 to-blue-50/30 pt-20 pb-8">
      <div className="container max-w-5xl mx-auto px-4">{children}</div>
    </div>
  );
}

export default function NonprofitDashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: myBiz = [] } = useQuery<Biz[]>({ queryKey: ["/api/my/businesses"], enabled: isAuthenticated, retry: false });
  const nonprofit = myBiz.find((b) => b.isNonprofit);
  const npId = nonprofit?.id;
  const stores = myBiz.filter((b) => !b.isNonprofit);

  const { data: totals } = useQuery<Totals>({
    queryKey: [`/api/nonprofits/${npId}/donations`],
    enabled: !!npId,
    retry: false,
  });

  const [form, setForm] = useState({ name: "", perTap: "1.00", storeIds: [] as string[] });
  const toggleStore = (id: string) =>
    setForm((f) => ({ ...f, storeIds: f.storeIds.includes(id) ? f.storeIds.filter((x) => x !== id) : [...f.storeIds, id] }));

  const create = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/donation-campaigns", {
        nonprofitId: npId,
        name: form.name,
        donationPerTapCents: Math.round((parseFloat(form.perTap) || 0) * 100),
        businessIds: form.storeIds,
      }),
    onSuccess: () => {
      toast({ title: "Donation campaign created" });
      setForm({ name: "", perTap: "1.00", storeIds: [] });
      queryClient.invalidateQueries({ queryKey: [`/api/nonprofits/${npId}/donations`] });
    },
    onError: () => toast({ title: "Couldn't create campaign", variant: "destructive" }),
  });

  if (authLoading) return <Shell><p className="text-gray-500 text-center mt-16">Loading…</p></Shell>;
  if (!isAuthenticated)
    return (
      <Shell>
        <div className="max-w-md mx-auto mt-16">
          <Card><CardContent className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4"><Lock className="h-6 w-6 text-rose-600" /></div>
            <h2 className="text-xl font-semibold mb-2">Sign in required</h2>
            <p className="text-gray-600 mb-6">Log in to manage your nonprofit.</p>
            <Link href="/auth"><Button className="bg-gradient-to-r from-rose-600 to-purple-600 text-white">Log in</Button></Link>
          </CardContent></Card>
        </div>
      </Shell>
    );
  if (!nonprofit)
    return (
      <Shell>
        <div className="max-w-md mx-auto mt-16">
          <Card><CardContent className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4"><Heart className="h-6 w-6 text-rose-600" /></div>
            <h2 className="text-xl font-semibold mb-2">No nonprofit yet</h2>
            <p className="text-gray-600">This area is for registered 501(c)(3) nonprofits. Once your organization is onboarded, its donation campaigns and totals appear here.</p>
          </CardContent></Card>
        </div>
      </Shell>
    );

  return (
    <Shell>
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-600 via-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
          <Heart className="h-7 w-7 text-rose-600" /> {nonprofit.name}
        </h1>
        <p className="text-gray-600">{nonprofit.nonprofitMission || "Nonprofit donation dashboard"}</p>
        {nonprofit.ein && <p className="text-xs text-gray-400 mt-1">EIN {nonprofit.ein}</p>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <Card><CardContent className="p-5">
          <div className="flex items-center justify-between mb-1"><span className="text-sm text-gray-500">Total raised</span><HandCoins className="h-4 w-4 text-rose-600" /></div>
          <div className="text-2xl font-bold text-gray-900">{usd(totals?.lifetimeCents || 0)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center justify-between mb-1"><span className="text-sm text-gray-500">Donation taps</span><Gift className="h-4 w-4 text-rose-600" /></div>
          <div className="text-2xl font-bold text-gray-900">{(totals?.totalDonations || 0).toLocaleString()}</div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center justify-between mb-1"><span className="text-sm text-gray-500">Campaigns</span><Heart className="h-4 w-4 text-rose-600" /></div>
          <div className="text-2xl font-bold text-gray-900">{(totals?.byCampaign?.length || 0).toLocaleString()}</div>
        </CardContent></Card>
      </div>

      <Card className="mb-8">
        <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-rose-600" /> New donation-per-tap campaign</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <Input placeholder="Campaign name (e.g. Yakima Food Drive)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <span className="flex items-center gap-2 text-sm text-gray-600">Donation per tap $
              <Input value={form.perTap} onChange={(e) => setForm({ ...form, perTap: e.target.value })} className="w-24" />
            </span>
          </div>
          {stores.length > 0 && (
            <div className="mb-3">
              <div className="text-sm font-medium text-gray-700 mb-2">Participating stores ({form.storeIds.length})</div>
              <div className="flex flex-wrap gap-2">
                {stores.map((s) => {
                  const on = form.storeIds.includes(s.id);
                  return (
                    <button key={s.id} type="button" onClick={() => toggleStore(s.id)}
                      className={`px-3 py-1.5 rounded-full text-sm border ${on ? "bg-rose-600 text-white border-rose-600" : "bg-white text-gray-700 border-gray-300"}`}>
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <Button onClick={() => create.mutate()} disabled={!form.name || create.isPending} className="bg-gradient-to-r from-rose-600 to-purple-600 text-white">
            Create campaign
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><HandCoins className="h-5 w-5 text-rose-600" /> Your campaigns</CardTitle></CardHeader>
        <CardContent>
          {(totals?.byCampaign || []).length === 0 ? (
            <p className="text-sm text-gray-500">No donation campaigns yet.</p>
          ) : (
            <div className="space-y-2">
              {(totals?.byCampaign || []).map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div>
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      {c.name}
                      {c.isActive ? <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Active</Badge> : <Badge variant="outline" className="text-xs">Ended</Badge>}
                    </div>
                    <div className="text-xs text-gray-500">{usd(c.donationPerTapCents)} per tap · {c.taps} taps</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-rose-700">{usd(c.raisedCents)}</div>
                    <div className="text-[10px] text-gray-500 uppercase">raised</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Shell>
  );
}
