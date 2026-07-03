import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Globe, MapPin, Lock, Store, Users, Zap, Gift, CheckCircle, Plus, Sparkles, Ticket, MessageSquare, Route, Star, DollarSign, Download, TrendingUp, Trash2, Search, Megaphone } from "lucide-react";
import PitchDialog from "@/components/coordinator/pitch-dialog";
import EarningsProjection from "@/components/coordinator/earnings-projection";
import MessageCenter from "@/components/messaging/message-center";
import AnnouncementsPanel from "@/components/messaging/announcements-panel";

interface Territory {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  isActive?: boolean | null;
}

interface CoordinatorMe {
  coordinator: { id: string; displayName?: string | null; planStatus?: string | null };
  territories: Territory[];
}

interface StoreRow {
  id: string;
  name: string;
  verificationStatus: string;
  isFeatured?: boolean;
  category?: string | null;
  address?: string | null;
  claimed?: boolean;
  taps: number;
  customers: number;
  rewardsIssued: number;
  rewardsRedeemed: number;
}

// CHR-54: a coordinator's multi-store group campaign + per-location performance.
interface CampaignStore {
  businessId: string;
  name: string;
  taps: number;
}
interface CoordinatorCampaign {
  id: string;
  name: string;
  ruleType: string;
  requiredStores: number;
  rewardTitle: string | null;
  isOpen: boolean;
  isFeatured: boolean;
  participants: number;
  completions: number;
  stores: CampaignStore[];
}

// CHR-63: coordinator revenue-share summary (amounts in cents).
interface EarningsTotal {
  grossCents: number;
  shareCents: number;
  count: number;
}
interface EarningsSummary {
  currency: string;
  sharePct: number;
  lifetime: EarningsTotal;
  currentMonth: { month: string } & EarningsTotal;
  trailing12Months: EarningsTotal;
  unpaid: EarningsTotal;
  bySource: { subscription: EarningsTotal; addon: EarningsTotal };
  monthly: ({ month: string } & EarningsTotal)[];
  recent: {
    id: string;
    createdAt: string | null;
    source: string;
    description: string | null;
    grossCents: number;
    sharePct: number;
    shareCents: number;
  }[];
}

// CHR-64: coordinator payout record (read-only in the dashboard).
interface Payout {
  id: string;
  periodMonth: string | null;
  totalShareCents: number;
  status: string;
  method: string;
  paidAt: string | null;
  createdAt: string | null;
}

interface TerritoryOverview {
  totals: {
    businesses: number;
    verifiedBusinesses: number;
    totalTaps: number;
    activeCustomers: number;
    rewardsIssued: number;
    rewardsRedeemed: number;
    pointsAwarded: number;
  };
  stores: StoreRow[];
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Store; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
          <Icon className="h-4 w-4 text-purple-600" />
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-950 dark:via-blue-950/30 dark:to-purple-950/30">
      <div className="container max-w-6xl mx-auto px-4 py-10">{children}</div>
    </div>
  );
}

function GateCard({ title, body, showLogin }: { title: string; body: string; showLogin?: boolean }) {
  return (
    <div className="max-w-md mx-auto mt-16">
      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-6 w-6 text-purple-600" />
          </div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{title}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{body}</p>
          {showLogin && (
            <Link href="/auth">
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">Log in</Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CoordinatorDashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data, isLoading, isError } = useQuery<CoordinatorMe>({
    queryKey: ["/api/coordinator/me"],
    enabled: isAuthenticated,
    retry: false,
  });
  const { data: overview } = useQuery<TerritoryOverview>({
    queryKey: ["/api/coordinator/territory/overview"],
    enabled: isAuthenticated && !isError,
    retry: false,
  });
  const { data: templates } = useQuery<{ key: string; label: string }[]>({
    queryKey: ["/api/coordinator/store-templates"],
    enabled: isAuthenticated && !isError,
    retry: false,
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", territoryId: "", templateKey: "" });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/coordinator/territory/overview"] });
    queryClient.invalidateQueries({ queryKey: ["/api/coordinator/businesses"] });
  };

  const onboard = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/coordinator/businesses", {
        name: form.name,
        territoryId: form.territoryId,
        templateKey: form.templateKey || undefined,
      }),
    onSuccess: () => {
      toast({ title: "Business onboarded", description: `${form.name} added to your territory.` });
      setForm({ name: "", territoryId: "", templateKey: "" });
      refresh();
    },
    onError: () => toast({ title: "Couldn't onboard business", variant: "destructive" }),
  });

  const verify = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/coordinator/businesses/${id}/verify`, { status }),
    onSuccess: () => {
      toast({ title: "Verification updated" });
      refresh();
    },
    onError: () => toast({ title: "Couldn't update verification", variant: "destructive" }),
  });

  // Remove a seeded sales prospect that isn't a fit (unclaimed businesses only).
  const removeBusiness = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/coordinator/businesses/${id}`),
    onSuccess: () => {
      toast({ title: "Prospect removed" });
      refresh();
    },
    onError: () => toast({ title: "Couldn't remove", variant: "destructive" }),
  });

  // CHR-55: templates library + regional admin tools
  const { data: campaignTemplates } = useQuery<{ key: string; label: string; type: string; pointsAwarded: number }[]>({
    queryKey: ["/api/coordinator/campaign-templates"],
    enabled: isAuthenticated && !isError,
    retry: false,
  });
  const { data: offers } = useQuery<
    { id: string; code: string; offerType: string; value: string | null; description: string | null }[]
  >({
    queryKey: ["/api/coordinator/offers"],
    enabled: isAuthenticated && !isError,
    retry: false,
  });

  const firstTerritory = data?.territories?.[0];
  const firstTerritoryId = firstTerritory?.id;

  // CHR-54: multi-store campaign builder + map placement
  const { data: groupCampaigns } = useQuery<CoordinatorCampaign[]>({
    queryKey: ["/api/coordinator/group-campaigns"],
    enabled: isAuthenticated && !isError,
    retry: false,
  });

  const [campaignForm, setCampaignForm] = useState<{
    name: string;
    ruleType: string;
    requiredStores: string;
    rewardTitle: string;
    rewardPoints: string;
    businessIds: string[];
  }>({ name: "", ruleType: "any_n", requiredStores: "2", rewardTitle: "", rewardPoints: "50", businessIds: [] });

  const toggleCampaignStore = (id: string) =>
    setCampaignForm((f) => ({
      ...f,
      businessIds: f.businessIds.includes(id)
        ? f.businessIds.filter((x) => x !== id)
        : [...f.businessIds, id],
    }));

  const refreshCampaigns = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/coordinator/group-campaigns"] });

  const createCampaign = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/coordinator/group-campaigns", {
        name: campaignForm.name,
        ruleType: campaignForm.ruleType,
        requiredStores: Number(campaignForm.requiredStores) || 1,
        rewardTitle: campaignForm.rewardTitle || undefined,
        rewardPoints: Number(campaignForm.rewardPoints) || 0,
        territoryId: firstTerritoryId,
        businessIds: campaignForm.businessIds,
      }),
    onSuccess: (r: any) => {
      toast({
        title: "Campaign created",
        description: `${r?.addedMembers ?? 0} store(s) added${r?.skippedMembers ? `, ${r.skippedMembers} skipped` : ""}.`,
      });
      setCampaignForm({ name: "", ruleType: "any_n", requiredStores: "2", rewardTitle: "", rewardPoints: "50", businessIds: [] });
      refreshCampaigns();
    },
    onError: () => toast({ title: "Couldn't create campaign", variant: "destructive" }),
  });

  const featureCampaign = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) =>
      apiRequest("PATCH", `/api/coordinator/group-campaigns/${id}/feature`, { featured }),
    onSuccess: () => {
      toast({ title: "Map placement updated" });
      refreshCampaigns();
    },
    onError: () => toast({ title: "Couldn't update placement", variant: "destructive" }),
  });

  const featureBusiness = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) =>
      apiRequest("PATCH", `/api/coordinator/businesses/${id}/feature`, { featured }),
    onSuccess: () => {
      toast({ title: "Map placement updated" });
      refresh();
    },
    onError: () => toast({ title: "Couldn't update placement", variant: "destructive" }),
  });

  // CHR-63: revenue & licensing
  const { data: earnings } = useQuery<EarningsSummary>({
    queryKey: ["/api/coordinator/earnings/summary"],
    enabled: isAuthenticated && !isError,
    retry: false,
  });
  // CHR-64: read-only payout history
  const { data: payouts } = useQuery<Payout[]>({
    queryKey: ["/api/coordinator/payouts"],
    enabled: isAuthenticated && !isError,
    retry: false,
  });
  const [exportMonth, setExportMonth] = useState(
    earnings?.currentMonth?.month || new Date().toISOString().slice(0, 7),
  );
  const [exporting, setExporting] = useState(false);
  const usd = (cents: number) =>
    ((cents || 0) / 100).toLocaleString(undefined, { style: "currency", currency: "USD" });

  const downloadCsv = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/coordinator/earnings/export?month=${exportMonth}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cirqlback-earnings-${exportMonth}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Couldn't export earnings", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const [welcome, setWelcome] = useState("");
  useEffect(() => {
    setWelcome((firstTerritory as any)?.welcomeMessage || "");
  }, [firstTerritory]);

  const [offerForm, setOfferForm] = useState({ code: "", offerType: "percent", value: "", description: "" });

  // Filter the territory business table by name / category / address.
  const [storeSearch, setStoreSearch] = useState("");
  // Pitch Assistant: the business a coordinator is drafting a pitch for.
  const [pitchTarget, setPitchTarget] = useState<{ name: string; category?: string | null; address?: string | null } | null>(null);
  const filteredStores = (() => {
    const q = storeSearch.trim().toLowerCase();
    const stores = overview?.stores || [];
    if (!q) return stores;
    return stores.filter((s) =>
      [s.name, s.category, s.address]
        .filter(Boolean)
        .some((field) => (field as string).toLowerCase().includes(q))
    );
  })();

  const applyTemplate = useMutation({
    mutationFn: async (key: string) =>
      apiRequest("POST", `/api/coordinator/campaign-templates/${key}/apply`, {
        businessIds: (overview?.stores || []).map((s) => s.id),
      }),
    onSuccess: (r: any) => {
      toast({ title: "Template applied", description: `Created ${r?.applied ?? 0} campaign(s).` });
      refresh();
    },
    onError: () => toast({ title: "Couldn't apply template", variant: "destructive" }),
  });

  const saveWelcome = useMutation({
    mutationFn: async () =>
      apiRequest("PATCH", `/api/coordinator/territories/${firstTerritory?.id}`, { welcomeMessage: welcome }),
    onSuccess: () => {
      toast({ title: "Regional welcome saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/coordinator/me"] });
    },
    onError: () => toast({ title: "Couldn't save welcome", variant: "destructive" }),
  });

  const createOffer = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/coordinator/offers", {
        code: offerForm.code,
        offerType: offerForm.offerType,
        value: offerForm.value || undefined,
        description: offerForm.description || undefined,
        territoryId: firstTerritory?.id,
      }),
    onSuccess: () => {
      toast({ title: "Offer created" });
      setOfferForm({ code: "", offerType: "percent", value: "", description: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/coordinator/offers"] });
    },
    onError: () => toast({ title: "Couldn't create offer (code may already exist)", variant: "destructive" }),
  });

  if (authLoading) return <Shell><p className="text-gray-500 text-center mt-16">Loading…</p></Shell>;
  if (!isAuthenticated)
    return <Shell><GateCard title="Sign in required" body="Log in as a Community Coordinator to manage your territory." showLogin /></Shell>;
  if (isLoading) return <Shell><p className="text-gray-500 text-center mt-16">Loading your territory…</p></Shell>;
  if (isError || !data)
    return (
      <Shell>
        <GateCard
          title="Coordinator access required"
          body="This area is for Community Coordinators. If you believe this is an error, contact your Cirqlback administrator."
        />
      </Shell>
    );

  const { coordinator, territories } = data;

  return (
    <Shell>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
            <Globe className="h-7 w-7 text-purple-600" />
            Coordinator Hub
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {coordinator.displayName ? `Welcome, ${coordinator.displayName}. ` : ""}
            Manage the businesses and campaigns in your territory.
          </p>
        </div>
        {coordinator.planStatus && (
          <Badge className="bg-purple-100 text-purple-700 border-purple-200 capitalize">
            {coordinator.planStatus}
          </Badge>
        )}
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Plus className="h-5 w-5 text-purple-600" />
            Onboard a business
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              placeholder="Business name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="md:flex-1"
            />
            <select
              value={form.territoryId}
              onChange={(e) => setForm({ ...form, territoryId: e.target.value })}
              className="h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
            >
              <option value="">Select territory…</option>
              {(data.territories || []).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <select
              value={form.templateKey}
              onChange={(e) => setForm({ ...form, templateKey: e.target.value })}
              className="h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
            >
              <option value="">No template</option>
              {(templates || []).map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
            <Button
              onClick={() => onboard.mutate()}
              disabled={!form.name || !form.territoryId || onboard.isPending}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
            >
              Onboard
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Admin announcements (Slice 2) */}
      <AnnouncementsPanel />

      {/* Cross-role messaging — talk to businesses in your territory + admin support */}
      <MessageCenter role="coordinator" />

      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <MetricCard icon={Store} label="Businesses" value={overview.totals.businesses} />
          <MetricCard icon={CheckCircle} label="Verified" value={overview.totals.verifiedBusinesses} />
          <MetricCard icon={Zap} label="Total Taps" value={overview.totals.totalTaps} />
          <MetricCard icon={Users} label="Customers" value={overview.totals.activeCustomers} />
          <MetricCard icon={Gift} label="Rewards Issued" value={overview.totals.rewardsIssued} />
          <MetricCard icon={Gift} label="Redeemed" value={overview.totals.rewardsRedeemed} />
        </div>
      )}

      {overview && (
        <Card className="mb-8">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Store className="h-5 w-5 text-purple-600" />
              Businesses in your territory
            </CardTitle>
            {overview.stores.length > 0 && (
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                  placeholder="Search businesses…"
                  className="pl-9"
                />
              </div>
            )}
          </CardHeader>
          <CardContent>
            {overview.stores.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No businesses assigned to your territory yet.
              </div>
            ) : filteredStores.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No businesses match "{storeSearch}".
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                      <th className="py-2 pr-4 font-medium">Business</th>
                      <th className="py-2 px-2 font-medium">Category</th>
                      <th className="py-2 px-2 font-medium">Status</th>
                      <th className="py-2 px-2 font-medium text-right">Taps</th>
                      <th className="py-2 px-2 font-medium text-right">Customers</th>
                      <th className="py-2 px-2 font-medium text-right">Issued</th>
                      <th className="py-2 px-2 font-medium text-right">Redeemed</th>
                      <th className="py-2 pl-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStores.map((s) => (
                      <tr key={s.id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">
                          {s.name}
                          {s.address ? <div className="text-xs text-gray-400 font-normal">{s.address}</div> : null}
                        </td>
                        <td className="py-2 px-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">{s.category || "—"}</td>
                        <td className="py-2 px-2">
                          <Badge
                            variant="outline"
                            className={`text-xs capitalize ${
                              s.verificationStatus === "verified"
                                ? "border-green-300 text-green-700"
                                : "border-gray-300 text-gray-500"
                            }`}
                          >
                            {s.verificationStatus}
                          </Badge>
                        </td>
                        <td className="py-2 px-2 text-right text-gray-900 dark:text-white">{s.taps.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">{s.customers.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">{s.rewardsIssued.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">{s.rewardsRedeemed.toLocaleString()}</td>
                        <td className="py-2 pl-2 text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              title="How to pitch this business"
                              className="h-7 px-2 text-xs text-purple-500 hover:text-purple-700"
                              onClick={() => setPitchTarget({ name: s.name, category: s.category, address: s.address })}
                            >
                              <Megaphone className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              title={s.isFeatured ? "Remove from featured map placement" : "Feature on the discovery map"}
                              className={`h-7 px-2 text-xs ${s.isFeatured ? "text-amber-500 hover:text-amber-600" : "text-gray-400 hover:text-amber-500"}`}
                              disabled={featureBusiness.isPending}
                              onClick={() => featureBusiness.mutate({ id: s.id, featured: !s.isFeatured })}
                            >
                              <Star className={`h-4 w-4 ${s.isFeatured ? "fill-current" : ""}`} />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              disabled={s.verificationStatus === "verified" || verify.isPending}
                              onClick={() => verify.mutate({ id: s.id, status: "verified" })}
                            >
                              Verify
                            </Button>
                            {s.verificationStatus !== "rejected" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                                disabled={verify.isPending}
                                onClick={() => verify.mutate({ id: s.id, status: "rejected" })}
                              >
                                Reject
                              </Button>
                            )}
                            {!s.claimed && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Remove this prospect from your list (unclaimed only)"
                                className="h-7 px-2 text-xs text-gray-400 hover:text-red-600"
                                disabled={removeBusiness.isPending}
                                onClick={() => { if (confirm(`Remove "${s.name}" from your prospect list?`)) removeBusiness.mutate(s.id); }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pitch Assistant dialog (opened from a business row's megaphone) */}
      <PitchDialog target={pitchTarget} onClose={() => setPitchTarget(null)} />

      {/* CHR-63: Revenue & licensing */}
      {earnings && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
              <span className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-purple-600" />
                Revenue & licensing
              </span>
              <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                {earnings.sharePct}% share
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { label: "This month", t: earnings.currentMonth },
                { label: "Last 12 months", t: earnings.trailing12Months },
                { label: "Lifetime", t: earnings.lifetime },
              ].map(({ label, t }) => (
                <div key={label} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{usd(t.shareCents)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    your share of {usd(t.grossCents)} · {t.count} charge{t.count === 1 ? "" : "s"}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subscriptions</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">{usd(earnings.bySource.subscription.shareCents)}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">of {usd(earnings.bySource.subscription.grossCents)} gross</div>
              </div>
              <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Add-ons</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">{usd(earnings.bySource.addon.shareCents)}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">of {usd(earnings.bySource.addon.grossCents)} gross</div>
              </div>
            </div>

            {(() => {
              const maxShare = Math.max(1, ...earnings.monthly.map((m) => m.shareCents));
              return (
                <div className="mb-6">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <TrendingUp className="h-4 w-4 text-purple-600" /> Monthly share (last 12 months)
                  </div>
                  <div className="space-y-1">
                    {earnings.monthly.map((m) => (
                      <div key={m.month} className="flex items-center gap-2 text-xs">
                        <span className="w-16 text-gray-500 dark:text-gray-400 tabular-nums">{m.month}</span>
                        <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded h-3 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                            style={{ width: `${Math.round((m.shareCents / maxShare) * 100)}%` }}
                          />
                        </div>
                        <span className="w-20 text-right text-gray-700 dark:text-gray-300 tabular-nums">{usd(m.shareCents)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Projection + goal tracker (motivational; computed from real share %) */}
            <EarningsProjection sharePct={earnings.sharePct} storageKey={data?.coordinator?.id || "me"} />

            {/* CHR-64: payout status (read-only; admins generate + mark paid) */}
            <div className="mb-6 border-t border-gray-100 dark:border-gray-800 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Payouts</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Pending (unpaid): <span className="font-semibold text-gray-900 dark:text-white">{usd(earnings.unpaid.shareCents)}</span>
                </span>
              </div>
              {(payouts || []).length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  No payouts yet. Your coordinator earnings are tracked above; payouts are issued by Cirqlback.
                </p>
              ) : (
                <div className="space-y-1">
                  {(payouts || []).map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm p-2 rounded bg-gray-50 dark:bg-gray-800">
                      <span className="text-gray-700 dark:text-gray-300">{p.periodMonth || "Ad-hoc"}</span>
                      <span className="text-gray-900 dark:text-white font-medium">{usd(p.totalShareCents)}</span>
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${
                          p.status === "paid"
                            ? "border-green-300 text-green-700"
                            : p.status === "void"
                            ? "border-gray-300 text-gray-400"
                            : "border-amber-300 text-amber-600"
                        }`}
                      >
                        {p.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-end gap-3 border-t border-gray-100 dark:border-gray-800 pt-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Export month</label>
                <Input
                  type="month"
                  value={exportMonth}
                  onChange={(e) => setExportMonth(e.target.value)}
                  className="w-44"
                />
              </div>
              <Button variant="outline" disabled={exporting} onClick={downloadCsv}>
                <Download className="h-4 w-4 mr-2" />
                {exporting ? "Exporting…" : "Download CSV"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CHR-54: Multi-store campaign builder + map placement */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Route className="h-5 w-5 text-purple-600" />
            Multi-store campaigns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Run a campaign across several stores in your territory (e.g. "Tap 3 shops for a prize").
            Customers make progress by tapping at each participating store.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <Input
              placeholder="Campaign name (e.g. Coffee Loop Challenge)"
              value={campaignForm.name}
              onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
            />
            <Input
              placeholder="Reward title (e.g. Free pastry)"
              value={campaignForm.rewardTitle}
              onChange={(e) => setCampaignForm({ ...campaignForm, rewardTitle: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <select
              value={campaignForm.ruleType}
              onChange={(e) => setCampaignForm({ ...campaignForm, ruleType: e.target.value })}
              className="h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
            >
              <option value="any_n">Tap N of the stores</option>
              <option value="all">Tap all stores</option>
            </select>
            {campaignForm.ruleType === "any_n" && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span>Required stores</span>
                <Input
                  type="number"
                  min={1}
                  value={campaignForm.requiredStores}
                  onChange={(e) => setCampaignForm({ ...campaignForm, requiredStores: e.target.value })}
                  className="w-20"
                />
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span>Reward points</span>
              <Input
                type="number"
                min={0}
                value={campaignForm.rewardPoints}
                onChange={(e) => setCampaignForm({ ...campaignForm, rewardPoints: e.target.value })}
                className="w-24"
              />
            </div>
          </div>

          <div className="mb-3">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Participating stores ({campaignForm.businessIds.length} selected)
            </div>
            {(overview?.stores || []).length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Onboard businesses into your territory first.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(overview?.stores || []).map((s) => {
                  const on = campaignForm.businessIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleCampaignStore(s.id)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        on
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700"
                      }`}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <Button
            onClick={() => createCampaign.mutate()}
            disabled={!campaignForm.name || campaignForm.businessIds.length < 2 || createCampaign.isPending}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
          >
            Create campaign
          </Button>

          {(groupCampaigns || []).length > 0 && (
            <div className="mt-6 space-y-3">
              {(groupCampaigns || []).map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        {c.name}
                        {c.isFeatured && (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Featured</Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {c.ruleType === "all" ? `Tap all ${c.stores.length}` : `Tap ${c.requiredStores} of ${c.stores.length}`} stores
                        {c.rewardTitle ? ` · ${c.rewardTitle}` : ""} · {c.participants} participant(s) · {c.completions} completed
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={c.isFeatured ? "default" : "outline"}
                      className={`h-7 px-2 text-xs ${c.isFeatured ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}`}
                      disabled={featureCampaign.isPending}
                      onClick={() => featureCampaign.mutate({ id: c.id, featured: !c.isFeatured })}
                    >
                      <Star className={`h-3.5 w-3.5 mr-1 ${c.isFeatured ? "fill-current" : ""}`} />
                      {c.isFeatured ? "Featured" : "Feature on map"}
                    </Button>
                  </div>
                  {c.stores.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                      {c.stores.map((s) => (
                        <span key={s.businessId}>
                          {s.name}: <span className="font-medium text-gray-900 dark:text-white">{s.taps} taps</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CHR-55: Templates library */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Campaign templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(campaignTemplates || []).map((t) => (
              <div
                key={t.key}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex flex-col"
              >
                <div className="font-semibold text-gray-900 dark:text-white">{t.label}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-3 capitalize">
                  {t.type} · {t.pointsAwarded} pts
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-auto"
                  disabled={!overview?.stores?.length || applyTemplate.isPending}
                  onClick={() => applyTemplate.mutate(t.key)}
                >
                  Apply to all my stores
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CHR-55: Regional admin tools */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <MessageSquare className="h-5 w-5 text-purple-600" />
              Regional welcome message
            </CardTitle>
          </CardHeader>
          <CardContent>
            {firstTerritory ? (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Shown to new businesses in <span className="font-medium">{firstTerritory.name}</span>.
                </p>
                <textarea
                  value={welcome}
                  onChange={(e) => setWelcome(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-sm"
                  placeholder="Welcome to the neighborhood! Here's how Cirqlback works in our region…"
                />
                <Button
                  size="sm"
                  className="mt-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                  disabled={saveWelcome.isPending}
                  onClick={() => saveWelcome.mutate()}
                >
                  Save welcome
                </Button>
              </>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No territory to configure yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Ticket className="h-5 w-5 text-purple-600" />
              Regional discount & trial codes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <Input
                placeholder="CODE"
                value={offerForm.code}
                onChange={(e) => setOfferForm({ ...offerForm, code: e.target.value.toUpperCase() })}
                className="sm:w-28"
              />
              <select
                value={offerForm.offerType}
                onChange={(e) => setOfferForm({ ...offerForm, offerType: e.target.value })}
                className="h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 text-sm"
              >
                <option value="percent">% off</option>
                <option value="fixed">$ off</option>
                <option value="trial">trial days</option>
              </select>
              <Input
                placeholder="Value"
                value={offerForm.value}
                onChange={(e) => setOfferForm({ ...offerForm, value: e.target.value })}
                className="sm:w-24"
              />
              <Button
                size="sm"
                disabled={!offerForm.code || createOffer.isPending}
                onClick={() => createOffer.mutate()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
              >
                Create
              </Button>
            </div>
            {(offers || []).length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No codes yet.</p>
            ) : (
              <div className="space-y-2">
                {(offers || []).map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between text-sm p-2 rounded bg-gray-50 dark:bg-gray-800"
                  >
                    <span className="font-mono font-semibold text-gray-900 dark:text-white">{o.code}</span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {o.value ?? ""} {o.offerType === "percent" ? "%" : o.offerType === "fixed" ? "$" : "days"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <MapPin className="h-5 w-5 text-purple-600" />
            Your Territories
          </CardTitle>
        </CardHeader>
        <CardContent>
          {territories.length === 0 ? (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              No territories assigned yet. Once a territory is set up for you, its businesses and
              campaigns will appear here.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {territories.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-gray-900 dark:text-white">{t.name}</div>
                    {t.isActive === false && (
                      <Badge variant="outline" className="text-xs">Inactive</Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {[t.city, t.state].filter(Boolean).join(", ") || "Region not set"}
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
