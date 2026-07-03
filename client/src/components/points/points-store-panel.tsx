import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, Gift, Ticket, Coins } from "lucide-react";

// Customer-facing rewards store: spend loyalty points on business perks,
// platform perks, or prize-draw entries. This is what makes points matter.

interface Reward {
  id: string; title: string; description: string | null; emoji: string | null;
  pointsCost: number; type: string; businessName: string | null;
  quantity: number | null; redeemedCount: number;
}
interface Redemption { id: string; title: string; emoji: string | null; type: string; pointsSpent: number; code: string | null; status: string; createdAt: string | null }

const typeIcon = (t: string) => t === "prize_draw" ? Ticket : t === "business_perk" ? Store : Gift;

export default function PointsStorePanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data } = useQuery<{ rewards: Reward[]; availablePoints: number }>({ queryKey: ["/api/points/rewards"], retry: false });
  const { data: history = [] } = useQuery<Redemption[]>({ queryKey: ["/api/points/my-redemptions"], retry: false });

  const redeem = useMutation({
    mutationFn: async (r: Reward) => {
      const res = await apiRequest("POST", "/api/points/redeem", { pointRewardId: r.id });
      return { data: await res.json(), reward: r };
    },
    onSuccess: ({ reward }) => {
      toast({
        title: reward.type === "prize_draw" ? "You're entered! 🎟️" : "Redeemed! 🎉",
        description: reward.type === "business_perk" ? `Show it at ${reward.businessName} to claim.` : reward.type === "prize_draw" ? "Good luck in the draw." : "Check your redemptions for the code.",
      });
      qc.invalidateQueries({ queryKey: ["/api/points/rewards"] });
      qc.invalidateQueries({ queryKey: ["/api/points/my-redemptions"] });
      qc.invalidateQueries({ queryKey: ["/api/user-stats"] });
    },
    onError: (e: any) => toast({ title: "Couldn't redeem", description: String(e?.message ?? "").slice(0, 120), variant: "destructive" }),
  });

  const points = data?.availablePoints ?? 0;
  const rewards = data?.rewards ?? [];

  return (
    <Card className="mb-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-gray-900 dark:text-gray-100">
          <span className="flex items-center gap-2"><Gift className="h-5 w-5 text-purple-600" /> Rewards store</span>
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 flex items-center gap-1"><Coins className="h-4 w-4" /> {points.toLocaleString()} pts</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rewards.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No rewards to redeem yet — check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rewards.map((r) => {
              const Icon = typeIcon(r.type);
              const affordable = points >= r.pointsCost;
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-lg border border-gray-100 dark:border-gray-800 p-3">
                  <div className="text-2xl w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center flex-shrink-0">
                    {r.emoji || <Icon className="h-5 w-5 text-purple-600" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900 dark:text-white truncate">{r.title}</div>
                    <div className="text-xs text-gray-500">
                      {r.type === "prize_draw" ? "Prize draw" : r.businessName || "Platform perk"}
                      {r.quantity != null ? ` · ${Math.max(0, r.quantity - r.redeemedCount)} left` : ""}
                    </div>
                  </div>
                  <Button size="sm" disabled={!affordable || redeem.isPending} onClick={() => redeem.mutate(r)} className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white disabled:opacity-50">
                    {r.pointsCost} pts
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Your redemptions</div>
            <div className="space-y-1">
              {history.slice(0, 6).map((h) => (
                <div key={h.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{h.emoji ? h.emoji + " " : ""}{h.title}</span>
                  <span className="flex items-center gap-2 text-xs">
                    {h.code && <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{h.code}</code>}
                    <Badge variant="outline" className="capitalize">{h.status}</Badge>
                    <span className="text-gray-400">-{h.pointsSpent}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
