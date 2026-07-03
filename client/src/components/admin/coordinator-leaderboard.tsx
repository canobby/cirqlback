import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

interface Row {
  id: string; name: string; email: string | null; sharePct: number;
  businesses: number; verified: number; lifetimeShareCents: number; unpaidCents: number;
}
const usd = (c: number) => "$" + (c / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });

// Territories tab: coordinator leaderboard, ranked by lifetime earnings.
export default function CoordinatorLeaderboard() {
  const { data = [], isLoading } = useQuery<Row[]>({ queryKey: ["/api/admin/coordinator-leaderboard"], retry: false });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-4 w-4 text-amber-500" /> Coordinator leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-6 text-center text-gray-400">Loading…</div>
        ) : data.length === 0 ? (
          <p className="text-sm text-gray-500">No coordinators yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4 font-medium">#</th>
                  <th className="py-2 pr-4 font-medium">Coordinator</th>
                  <th className="py-2 px-2 font-medium text-right">Share</th>
                  <th className="py-2 px-2 font-medium text-right">Businesses</th>
                  <th className="py-2 px-2 font-medium text-right">Verified</th>
                  <th className="py-2 px-2 font-medium text-right">Lifetime earned</th>
                  <th className="py-2 pl-2 font-medium text-right">Unpaid</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r, i) => (
                  <tr key={r.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-gray-400">{i + 1}</td>
                    <td className="py-2 pr-4">
                      <div className="font-medium text-gray-900">{r.name}</div>
                      <div className="text-xs text-gray-400">{r.email}</div>
                    </td>
                    <td className="py-2 px-2 text-right text-gray-700">{r.sharePct}%</td>
                    <td className="py-2 px-2 text-right text-gray-900">{r.businesses.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right text-gray-700">{r.verified.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right font-semibold text-green-600">{usd(r.lifetimeShareCents)}</td>
                    <td className="py-2 pl-2 text-right text-amber-600">{usd(r.unpaidCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
