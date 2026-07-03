import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

// Seasonal + local leaderboard. Customer hub: All-time vs This month. Coordinator
// hub: pass a territoryId to show local top customers (with a monthly toggle).
interface Row { rank?: number; name: string; points: number }

export default function LeaderboardCard({ territoryId, title }: { territoryId?: string; title?: string }) {
  const [tab, setTab] = useState<"all" | "month">("month");
  const url = territoryId
    ? `/api/leaderboard/territory/${territoryId}${tab === "month" ? "?period=month" : ""}`
    : tab === "month" ? "/api/leaderboard/monthly" : "/api/leaderboard";
  const { data = [] } = useQuery<Row[]>({ queryKey: [url], retry: false });

  const medal = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`);

  return (
    <Card className="mb-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-gray-900 dark:text-gray-100">
          <span className="flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-500" /> {title || "Leaderboard"}</span>
          <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5 text-xs">
            <button onClick={() => setTab("month")} className={`px-2.5 py-1 rounded-md ${tab === "month" ? "bg-white dark:bg-gray-700 shadow-sm font-medium" : "text-gray-500"}`}>This month</button>
            <button onClick={() => setTab("all")} className={`px-2.5 py-1 rounded-md ${tab === "all" ? "bg-white dark:bg-gray-700 shadow-sm font-medium" : "text-gray-500"}`}>All-time</button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No ranked activity yet{tab === "month" ? " this month" : ""}.</p>
        ) : (
          <div className="space-y-1">
            {data.slice(0, 10).map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 dark:border-gray-900 last:border-0">
                <span className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                  <span className="w-6 text-center">{medal(i)}</span> {r.name}
                </span>
                <span className="font-medium text-purple-600">{r.points.toLocaleString()} pts</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
