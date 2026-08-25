import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, CheckCircle2 } from "lucide-react";

// Customer passports: progress toward completing a curated collection of
// businesses. Advancement happens on tap; completing grants bonus points.
interface Passport {
  id: string; name: string; emoji: string | null; color: string | null; rewardPoints: number;
  total: number; visitedCount: number; completed: boolean;
  businesses: { id: string; name: string; visited: boolean }[];
}

export default function PassportsPanel() {
  const { data = [] } = useQuery<Passport[]>({ queryKey: ["/api/collections/mine"], retry: false });
  if (data.length === 0) return null;

  return (
    <Card className="mb-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <MapPin className="h-5 w-5 text-purple-600" /> Passports
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((p) => {
          const pct = p.total > 0 ? Math.round((p.visitedCount / p.total) * 100) : 0;
          return (
            <div key={p.id} className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="text-xl">{p.emoji || "🗺️"}</span> {p.name}
                </div>
                {p.completed
                  ? <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Complete</Badge>
                  : <Badge variant="outline">+{p.rewardPoints} pts</Badge>}
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-2">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.color || "#7c3aed" }} />
              </div>
              <div className="text-xs text-gray-500 mb-2">{p.visitedCount} of {p.total} visited</div>
              <div className="flex flex-wrap gap-1">
                {p.businesses.map((b) => (
                  <span key={b.id} className={`text-[11px] px-2 py-0.5 rounded-full border ${b.visited ? "bg-purple-600 text-white border-purple-600" : "bg-white dark:bg-gray-900 text-gray-500 border-gray-300 dark:border-gray-700"}`}>
                    {b.visited ? "✓ " : ""}{b.name}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
