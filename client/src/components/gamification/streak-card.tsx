import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Flame } from "lucide-react";

// Daily tap-streak display + "keep it going" nudge. Streak milestones (3/7/14/30)
// pay bonus points, awarded server-side on the tap that hits the milestone.
const MILESTONES = [3, 7, 14, 30];

export default function StreakCard() {
  const { data: stats } = useQuery<any>({ queryKey: ["/api/user-stats"], retry: false });
  const current = stats?.currentStreak ?? 0;
  const longest = stats?.longestStreak ?? 0;
  const next = MILESTONES.find((m) => m > current);

  return (
    <Card className="mb-6 bg-gradient-to-br from-orange-500 to-rose-500 border-0 text-white">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <Flame className="h-12 w-12" />
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{current}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-bold">{current === 0 ? "Start a streak!" : `${current}-day streak`}</div>
          <div className="text-sm text-orange-50">
            {current === 0
              ? "Tap somewhere today to begin your daily streak."
              : next
                ? `Tap daily — ${next - current} more day${next - current === 1 ? "" : "s"} to a bonus at ${next}.`
                : "You're on fire — keep the chain alive!"}
          </div>
          {longest > 0 && <div className="text-xs text-orange-100 mt-0.5">Best streak: {longest} days</div>}
        </div>
      </CardContent>
    </Card>
  );
}
