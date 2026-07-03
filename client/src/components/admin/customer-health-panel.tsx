import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, Repeat, Users, Zap, Trophy } from "lucide-react";

interface Health {
  rewardsIssued: number; rewardsRedeemed: number; redemptionRate: number;
  customers: number; repeatCustomers: number; repeatRate: number;
  totalTaps: number; avgTapsPerCustomer: number; activeLast30d: number;
  topCustomers: Array<{ email: string; taps: number; points: number }>;
}

const pct = (f: number) => `${Math.round(f * 100)}%`;

// Admin customer-side health — is the tap-to-earn flywheel spinning? Redemption
// rate (are rewards compelling), repeat rate (do they come back), and who's most
// engaged.
export default function CustomerHealthPanel() {
  const { data } = useQuery<Health>({ queryKey: ["/api/admin/customer-health"], retry: false });
  if (!data) return <div className="py-12 text-center text-gray-400">Loading customer health…</div>;

  const kpis = [
    { icon: Gift, label: "Redemption rate", value: pct(data.redemptionRate), sub: `${data.rewardsRedeemed.toLocaleString()} of ${data.rewardsIssued.toLocaleString()} rewards`, tone: "text-pink-600" },
    { icon: Repeat, label: "Repeat-customer rate", value: pct(data.repeatRate), sub: `${data.repeatCustomers.toLocaleString()} of ${data.customers.toLocaleString()} came back`, tone: "text-green-600" },
    { icon: Users, label: "Active (30d)", value: data.activeLast30d.toLocaleString(), sub: `${data.customers.toLocaleString()} total customers`, tone: "text-blue-600" },
    { icon: Zap, label: "Avg taps / customer", value: data.avgTapsPerCustomer.toFixed(1), sub: `${data.totalTaps.toLocaleString()} taps total`, tone: "text-purple-600" },
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
              <div className="text-xs text-gray-400 mt-0.5">{k.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-amber-500" /> Top customers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.topCustomers.length === 0 ? (
            <p className="text-sm text-gray-500">No customer taps yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 pr-4 font-medium">#</th>
                    <th className="py-2 pr-4 font-medium">Customer</th>
                    <th className="py-2 px-2 font-medium text-right">Taps</th>
                    <th className="py-2 pl-2 font-medium text-right">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topCustomers.map((c, i) => (
                    <tr key={c.email} className="border-b border-gray-100">
                      <td className="py-2 pr-4 text-gray-400">{i + 1}</td>
                      <td className="py-2 pr-4 text-gray-900">{c.email}</td>
                      <td className="py-2 px-2 text-right font-semibold text-gray-900">{c.taps.toLocaleString()}</td>
                      <td className="py-2 pl-2 text-right text-gray-700">{c.points.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-3">
            Low redemption means rewards aren't compelling; low repeat means customers aren't coming back — both mean the flywheel needs attention.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
