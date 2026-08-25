import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Filter } from "lucide-react";

interface Insights {
  trends: Array<{ month: string; signups: number; businesses: number; taps: number; revenueCents: number }>;
  funnel: { signed: number; configured: number; live: number; active: number };
}

const shortMonth = (m: string) => {
  const [, mm] = m.split("-");
  return ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(mm)] || m;
};

// Admin Insights — 6-month growth trends + the business activation funnel.
export default function AdminInsights() {
  const { data, isLoading } = useQuery<Insights>({ queryKey: ["/api/admin/insights"], retry: false });
  if (isLoading || !data) return null;

  const { trends, funnel } = data;
  const series = [
    { key: "signups", label: "Signups", fmt: (v: number) => v.toLocaleString(), color: "from-blue-500 to-blue-400" },
    { key: "businesses", label: "New businesses", fmt: (v: number) => v.toLocaleString(), color: "from-purple-500 to-purple-400" },
    { key: "taps", label: "Taps", fmt: (v: number) => v.toLocaleString(), color: "from-pink-500 to-pink-400" },
    { key: "revenueCents", label: "Attributed revenue", fmt: (v: number) => "$" + Math.round(v / 100).toLocaleString(), color: "from-green-500 to-green-400" },
  ] as const;

  const stages = [
    { label: "Signed up", value: funnel.signed },
    { label: "Configured (has a campaign)", value: funnel.configured },
    { label: "Live (has a tag)", value: funnel.live },
    { label: "Getting taps", value: funnel.active },
  ];
  const activationRate = funnel.signed > 0 ? Math.round((funnel.active / funnel.signed) * 100) : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-purple-600" /> Last 6 months
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {series.map((s) => {
            const vals = trends.map((t) => (t as any)[s.key] as number);
            const max = Math.max(1, ...vals);
            return (
              <div key={s.key}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-gray-600">{s.label}</span>
                  <span className="text-gray-400">latest: {s.fmt(vals[vals.length - 1])}</span>
                </div>
                <div className="flex items-end gap-1 h-16">
                  {trends.map((t, i) => (
                    <div key={t.month} className="flex-1 flex flex-col items-center justify-end h-full" title={`${t.month}: ${s.fmt(vals[i])}`}>
                      <div className={`w-full rounded-t bg-gradient-to-t ${s.color}`} style={{ height: `${Math.max(2, (vals[i] / max) * 100)}%` }} />
                      <span className="text-[9px] text-gray-400 mt-0.5">{shortMonth(t.month)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Activation funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4 text-purple-600" /> Business activation
            <span className="ml-auto text-sm font-normal text-gray-500">{activationRate}% activated</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stages.map((st, i) => {
            const pct = funnel.signed > 0 ? Math.round((st.value / funnel.signed) * 100) : 0;
            return (
              <div key={st.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700">{st.label}</span>
                  <span className="font-semibold text-gray-900">{st.value.toLocaleString()}{i > 0 && ` · ${pct}%`}</span>
                </div>
                <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: `${Math.max(2, pct)}%` }} />
                </div>
              </div>
            );
          })}
          <p className="text-xs text-gray-400 pt-1">
            Of businesses with an owner, how many set up a campaign, went live with a tag, and are getting taps. A big drop means onboarding or support gaps.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
