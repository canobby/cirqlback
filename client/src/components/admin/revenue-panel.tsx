import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Clock, AlertCircle, Layers, UserCog } from "lucide-react";

interface Revenue {
  mrrCents: number; subscriptionMrrCents: number; addonMrrCents: number;
  subscriptions: { starter: number; core: number; pro: number };
  addonsByKey: Record<string, number>;
  coordinatorLiabilityCents: number; trialsExpiring30d: number; lapsedSubscriptions: number;
  thisMonth: { grossCents: number; shareCents: number; count: number };
}
interface AddonDef { key: string; name: string; priceCents: number }

const usd = (c: number) => "$" + (c / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });

// Admin Revenue tab — MRR from active subscriptions + paid add-ons, the
// subscription/add-on mix, coordinator payout liability, trials expiring, and
// this month's attributed gross vs coordinator share (= platform net).
export default function RevenuePanel() {
  const { data, isLoading } = useQuery<Revenue>({ queryKey: ["/api/admin/revenue"], retry: false });
  const { data: catalog = [] } = useQuery<AddonDef[]>({ queryKey: ["/api/addons/catalog"], retry: false });

  if (isLoading || !data) return <div className="py-12 text-center text-gray-400">Loading revenue…</div>;

  const nameFor = (key: string) => catalog.find((a) => a.key === key)?.name || key;
  const netThisMonth = data.thisMonth.grossCents - data.thisMonth.shareCents;

  const kpis = [
    { icon: DollarSign, label: "Monthly recurring (MRR)", value: usd(data.mrrCents), tone: "text-green-600" },
    { icon: UserCog, label: "Coordinator payout liability", value: usd(data.coordinatorLiabilityCents), tone: "text-amber-600" },
    { icon: Clock, label: "Trials expiring (30d)", value: data.trialsExpiring30d.toLocaleString(), tone: "text-blue-600" },
    { icon: AlertCircle, label: "Lapsed subscriptions", value: data.lapsedSubscriptions.toLocaleString(), tone: "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">{k.label}</span>
                <k.icon className={`h-4 w-4 ${k.tone}`} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Subscription mix */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-purple-600" /> Subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {([["Pro", data.subscriptions.pro, "$49.99"], ["Core", data.subscriptions.core, "$19.99"], ["Starter (free)", data.subscriptions.starter, "—"]] as const).map(
              ([label, n, price]) => (
                <div key={label} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                  <span className="text-gray-700">{label}</span>
                  <span className="text-gray-400">{price}/mo</span>
                  <span className="font-semibold text-gray-900 w-12 text-right">{n.toLocaleString()}</span>
                </div>
              ),
            )}
            <div className="flex items-center justify-between pt-1 text-sm">
              <span className="font-medium text-gray-700">Subscription MRR</span>
              <span className="font-bold text-green-600">{usd(data.subscriptionMrrCents)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Add-on attach */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-purple-600" /> Add-on attach
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.keys(data.addonsByKey).length === 0 ? (
              <p className="text-sm text-gray-500">No paid add-ons active yet.</p>
            ) : (
              Object.entries(data.addonsByKey).map(([key, n]) => (
                <div key={key} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                  <span className="text-gray-700">{nameFor(key)}</span>
                  <span className="font-semibold text-gray-900">{n.toLocaleString()}</span>
                </div>
              ))
            )}
            <div className="flex items-center justify-between pt-1 text-sm">
              <span className="font-medium text-gray-700">Add-on MRR</span>
              <span className="font-bold text-green-600">{usd(data.addonMrrCents)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* This month attributed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-purple-600" /> This month (attributed charges)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Charges" value={data.thisMonth.count.toLocaleString()} />
            <Stat label="Gross" value={usd(data.thisMonth.grossCents)} />
            <Stat label="Coordinator share" value={usd(data.thisMonth.shareCents)} />
            <Stat label="Platform net" value={usd(netThisMonth)} highlight />
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Attributed charges are subscription/add-on payments recorded with coordinator revenue-share.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-xl font-bold ${highlight ? "text-green-600" : "text-gray-900"}`}>{value}</div>
    </div>
  );
}
