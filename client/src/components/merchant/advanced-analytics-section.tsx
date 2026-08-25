import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Sparkles, MapPin, Clock, TrendingUp } from "lucide-react";

interface Advanced {
  bestTagZones: { tagId: string; zone: string; taps: number; percentage: number }[];
  returnDelay: {
    buckets: { under1h: number; h1to24: number; d1to7: number; over7d: number };
    avgReturnHours: number;
    returningCustomers: number;
  };
  busiestHours: { hour: number; taps: number }[];
  busiestDays: { day: string; taps: number }[];
  redemptionFunnel: {
    taps: number;
    rewardsIssued: number;
    rewardsRedeemed: number;
    tapToRewardRate: number;
    redemptionRate: number;
  };
}

type State = { status: "ok"; data: Advanced } | { status: "locked" } | { status: "none" };

const fmtHour = (h: number) => {
  const am = h < 12;
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${am ? "am" : "pm"}`;
};

// CHR-67: advanced analytics pack (add-on). Self-contained: renders the metrics
// when the business holds the entitlement, an upsell when it doesn't (402).
export default function AdvancedAnalyticsSection() {
  const { data: state } = useQuery<State>({
    queryKey: ["/api/analytics/advanced"],
    retry: false,
    queryFn: async () => {
      const r = await fetch("/api/analytics/advanced", { credentials: "include" });
      if (r.status === 402) return { status: "locked" };
      if (!r.ok) return { status: "none" };
      return { status: "ok", data: await r.json() };
    },
  });

  if (!state || state.status === "none") return null;

  if (state.status === "locked") {
    return (
      <Card className="mb-8 border-dashed">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
            <Lock className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" /> Advanced Analytics Pack
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Unlock best-performing tag zones, return-delay insights, busiest-hour heatmaps, and the
              redemption funnel. Add it from your Business Hub.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const a = state.data;
  const maxHour = Math.max(1, ...a.busiestHours.map((h) => h.taps));

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <Sparkles className="h-5 w-5 text-purple-600" /> Advanced Analytics
          <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs">Add-on</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Redemption funnel */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Taps", value: a.redemptionFunnel.taps },
            { label: "Rewards issued", value: a.redemptionFunnel.rewardsIssued },
            { label: "Redeemed", value: a.redemptionFunnel.rewardsRedeemed },
            { label: "Tap→reward", value: `${a.redemptionFunnel.tapToRewardRate}%` },
            { label: "Redemption", value: `${a.redemptionFunnel.redemptionRate}%` },
          ].map((m) => (
            <div key={m.label} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400">{m.label}</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">{m.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Best tag zones */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <MapPin className="h-4 w-4 text-purple-600" /> Best-performing tag zones
            </div>
            {a.bestTagZones.length === 0 ? (
              <p className="text-sm text-gray-400">No tap data yet.</p>
            ) : (
              <div className="space-y-1">
                {a.bestTagZones.map((z) => (
                  <div key={z.tagId} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300 truncate">{z.zone}</span>
                    <span className="text-gray-900 dark:text-white font-medium">{z.taps} ({z.percentage}%)</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Return delay */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Clock className="h-4 w-4 text-purple-600" /> Return delay
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {a.returnDelay.returningCustomers} returning · avg {a.returnDelay.avgReturnHours}h between visits
            </p>
            <div className="space-y-1 text-sm">
              {[
                { label: "< 1 hour", v: a.returnDelay.buckets.under1h },
                { label: "1–24 hours", v: a.returnDelay.buckets.h1to24 },
                { label: "1–7 days", v: a.returnDelay.buckets.d1to7 },
                { label: "> 7 days", v: a.returnDelay.buckets.over7d },
              ].map((b) => (
                <div key={b.label} className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{b.label}</span>
                  <span className="text-gray-900 dark:text-white font-medium">{b.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Busiest hours */}
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <TrendingUp className="h-4 w-4 text-purple-600" /> Busiest hours
          </div>
          <div className="flex items-end gap-1 h-24">
            {a.busiestHours.map((h) => (
              <div key={h.hour} className="flex-1 flex flex-col items-center justify-end" title={`${fmtHour(h.hour)}: ${h.taps}`}>
                <div
                  className="w-full bg-gradient-to-t from-purple-500 to-pink-400 rounded-t"
                  style={{ height: `${Math.round((h.taps / maxHour) * 100)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
