import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HeartPulse, CheckCircle2 } from "lucide-react";

interface Flag { reason: string; detail: string; severity: "high" | "medium" }
interface Row {
  id: string; name: string; ownerEmail: string | null;
  signedUpAt: string | null; lastTapAt: string | null; totalTaps: number; flags: Flag[];
}

const toneCls: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
};

// Retention watch — a worklist of businesses that need a nudge before they churn.
export default function AtRiskPanel() {
  const { data = [], isLoading } = useQuery<Row[]>({ queryKey: ["/api/admin/at-risk"], retry: false });
  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HeartPulse className="h-4 w-4 text-red-500" /> Retention watch
          {data.length > 0 && <Badge className="bg-red-100 text-red-700 border-red-200">{data.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-gray-500">
            <CheckCircle2 className="h-4 w-4 text-green-600" /> No businesses at risk right now — nothing dormant, stalled, or expiring.
          </p>
        ) : (
          <div className="space-y-2">
            {data.map((b) => (
              <div key={b.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">{b.name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {b.ownerEmail || "—"} · {b.totalTaps.toLocaleString()} taps all-time
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                  {b.flags.map((f, i) => (
                    <Badge key={i} variant="outline" className={`text-xs ${toneCls[f.severity]}`} title={f.detail}>
                      {f.reason}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3">
          Businesses that were active and went quiet (30d), signed up but never got a tap, or have a trial ending within 30 days.
        </p>
      </CardContent>
    </Card>
  );
}
