import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Globe, MapPin, Lock, Store, Users, Zap, Gift, CheckCircle, Plus } from "lucide-react";

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
  taps: number;
  customers: number;
  rewardsIssued: number;
  rewardsRedeemed: number;
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Store className="h-5 w-5 text-purple-600" />
              Businesses in your territory
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview.stores.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No businesses assigned to your territory yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                      <th className="py-2 pr-4 font-medium">Business</th>
                      <th className="py-2 px-2 font-medium">Status</th>
                      <th className="py-2 px-2 font-medium text-right">Taps</th>
                      <th className="py-2 px-2 font-medium text-right">Customers</th>
                      <th className="py-2 px-2 font-medium text-right">Issued</th>
                      <th className="py-2 px-2 font-medium text-right">Redeemed</th>
                      <th className="py-2 pl-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.stores.map((s) => (
                      <tr key={s.id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">{s.name}</td>
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
