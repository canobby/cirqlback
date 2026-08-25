import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Split } from "lucide-react";

// Merchant-facing view of shared-campaign cost splits: what my business owes to
// hosts (for funded rewards my customers completed elsewhere) and what I'm owed
// as a host. Read-only — statements are settled by admin/coordinator.

interface Contrib { id: string; businessName: string; hostName: string; share: string; periodMonth: string; settled: boolean }
interface Settlement { id: string; hostName: string; periodMonth: string; total: string; status: string }
interface Data {
  owedByMe: Contrib[]; owedToMe: Contrib[]; settlements: Settlement[];
  summary: { owing: string; owed: string; owingCents: number; owedCents: number };
}

export default function CampaignSettlementsPanel() {
  const { data } = useQuery<Data>({ queryKey: ["/api/my/reward-settlements"], retry: false });
  if (!data) return null;
  const { owedByMe, owedToMe, summary } = data;
  // Only render once there's something to show.
  if (owedByMe.length === 0 && owedToMe.length === 0) return null;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Split className="h-5 w-5 text-purple-600" />
          Shared campaign settlements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-xs text-gray-500">You owe hosts (unsettled)</div>
            <div className="text-2xl font-bold text-red-600">${summary.owing}</div>
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-xs text-gray-500">Owed to you as host (unsettled)</div>
            <div className="text-2xl font-bold text-green-600">${summary.owed}</div>
          </div>
        </div>

        {owedByMe.length > 0 && (
          <div className="mb-3">
            <div className="text-sm font-semibold text-gray-700 mb-1">You owe</div>
            <div className="space-y-1">
              {owedByMe.slice(0, 8).map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm border-b border-gray-50 py-1">
                  <span className="text-gray-700">To {c.hostName} · {c.periodMonth}</span>
                  <span className="flex items-center gap-2"><span className="font-medium">${c.share}</span>{c.settled && <Badge variant="outline" className="text-xs">settled</Badge>}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {owedToMe.length > 0 && (
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-1">Owed to you (as host)</div>
            <div className="space-y-1">
              {owedToMe.slice(0, 8).map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm border-b border-gray-50 py-1">
                  <span className="text-gray-700">From {c.businessName} · {c.periodMonth}</span>
                  <span className="flex items-center gap-2"><span className="font-medium">${c.share}</span>{c.settled && <Badge variant="outline" className="text-xs">settled</Badge>}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
