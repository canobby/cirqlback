import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users, Store, Zap, MapPin, Heart, Globe, DollarSign,
  UserCog, AlertTriangle, Clock, ShieldCheck, CheckCircle2, ArrowRight,
} from "lucide-react";

interface Overview {
  kpis: {
    users: number; businesses: number; activeCampaigns: number; coordinators: number;
    territories: number; nonprofits: number; livePages: number; grossProcessedCents: number;
  };
  attention: {
    pendingAdminInvites: number; businessesAwaitingVerification: number;
    coordinatorsWithUnpaid: number; unpaidLiabilityCents: number;
  };
}

const usd = (cents: number) => "$" + (cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });

// Admin command center — headline KPIs + a "needs attention" queue. onGo jumps
// to another admin tab so an item can route the admin to where they act.
export default function CommandCenter({ onGo }: { onGo?: (tab: string) => void }) {
  const { data, isLoading } = useQuery<Overview>({ queryKey: ["/api/admin/overview"], retry: false });

  if (isLoading || !data) {
    return <div className="py-12 text-center text-gray-400">Loading overview…</div>;
  }
  const { kpis, attention } = data;

  const tiles = [
    { icon: Users, label: "Users", value: kpis.users.toLocaleString() },
    { icon: Store, label: "Businesses", value: kpis.businesses.toLocaleString() },
    { icon: Zap, label: "Active campaigns", value: kpis.activeCampaigns.toLocaleString() },
    { icon: UserCog, label: "Coordinators", value: kpis.coordinators.toLocaleString() },
    { icon: MapPin, label: "Territories", value: kpis.territories.toLocaleString() },
    { icon: Heart, label: "Nonprofits", value: kpis.nonprofits.toLocaleString() },
    { icon: Globe, label: "Live pages", value: kpis.livePages.toLocaleString() },
    { icon: DollarSign, label: "Gross processed", value: usd(kpis.grossProcessedCents) },
  ];

  // Attention items — only those with a nonzero count surface.
  const items = [
    attention.coordinatorsWithUnpaid > 0 && {
      key: "payouts",
      icon: DollarSign,
      tone: "amber",
      title: `${usd(attention.unpaidLiabilityCents)} in coordinator payouts pending`,
      detail: `Across ${attention.coordinatorsWithUnpaid} coordinator${attention.coordinatorsWithUnpaid === 1 ? "" : "s"} — generate and mark payouts.`,
      action: onGo ? { label: "Manage payouts", go: "coordinators" } : undefined,
    },
    attention.businessesAwaitingVerification > 0 && {
      key: "verify",
      icon: ShieldCheck,
      tone: "blue",
      title: `${attention.businessesAwaitingVerification} business${attention.businessesAwaitingVerification === 1 ? "" : "es"} awaiting verification`,
      detail: "Claimed businesses pending review.",
      action: undefined,
    },
    attention.pendingAdminInvites > 0 && {
      key: "invites",
      icon: Clock,
      tone: "gray",
      title: `${attention.pendingAdminInvites} pending admin invitation${attention.pendingAdminInvites === 1 ? "" : "s"}`,
      detail: "Awaiting acceptance.",
      action: undefined,
    },
  ].filter(Boolean) as Array<{ key: string; icon: any; tone: string; title: string; detail: string; action?: { label: string; go: string } }>;

  const toneCls: Record<string, string> = {
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    gray: "border-gray-200 bg-gray-50 text-gray-600",
  };

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">{t.label}</span>
                <t.icon className="h-4 w-4 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{t.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Needs attention */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-gray-900">Needs attention</h2>
        </div>
        {items.length === 0 ? (
          <Card>
            <CardContent className="p-6 flex items-center gap-3 text-gray-600">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              All clear — nothing needs your attention right now.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((it) => (
              <div key={it.key} className={`flex items-center gap-4 rounded-lg border p-4 ${toneCls[it.tone]}`}>
                <it.icon className="h-5 w-5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">{it.title}</div>
                  <div className="text-sm text-gray-600">{it.detail}</div>
                </div>
                {it.action && (
                  <Button size="sm" variant="outline" onClick={() => onGo?.(it.action!.go)}>
                    {it.action.label} <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
