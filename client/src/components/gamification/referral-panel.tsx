import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Copy, Gift, Trophy } from "lucide-react";

// Rewarded referral loop: share your code (you earn 100 pts, they earn 50 when
// they take their first tap) + redeem a friend's code + a referrer leaderboard.
export default function ReferralPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data } = useQuery<{ code: string; completed: number; pending: number; pointsEarned: number }>({
    queryKey: ["/api/referrals/mine"], retry: false,
  });
  const { data: leaders = [] } = useQuery<{ name: string; referrals: number }[]>({
    queryKey: ["/api/referrals/leaderboard"], retry: false,
  });

  const [code, setCode] = useState("");
  const redeem = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/referrals/redeem", { code: code.trim() }),
    onSuccess: (_r: any) => {
      toast({ title: "Referral applied!", description: "You'll both earn points when you take your next tap." });
      setCode("");
      qc.invalidateQueries({ queryKey: ["/api/referrals/mine"] });
    },
    onError: (e: any) => toast({ title: "Couldn't apply code", description: String(e?.message ?? "").slice(0, 120), variant: "destructive" }),
  });

  const copy = () => {
    if (data?.code) { navigator.clipboard?.writeText(data.code); toast({ title: "Code copied" }); }
  };

  return (
    <Card className="mb-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <Users className="h-5 w-5 text-purple-600" /> Refer friends
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Share your code. When a friend redeems it and takes their first tap, <b>you get 100 pts</b> and <b>they get 50</b>.
        </p>

        {/* My code + stats */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <code className="text-lg font-bold tracking-wider bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-lg">{data?.code ?? "—"}</code>
            <Button size="sm" variant="outline" onClick={copy}><Copy className="h-4 w-4" /></Button>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1"><Gift className="h-4 w-4 text-green-600" /> {data?.completed ?? 0} joined</span>
            <span className="text-gray-500">{data?.pending ?? 0} pending</span>
            <span className="text-purple-600 font-medium">+{data?.pointsEarned ?? 0} pts earned</span>
          </div>
        </div>

        {/* Redeem a friend's code */}
        <div className="flex gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Enter a friend's code" className="flex-1" />
          <Button onClick={() => redeem.mutate()} disabled={!code.trim() || redeem.isPending} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">Apply</Button>
        </div>

        {/* Leaderboard */}
        {leaders.length > 0 && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1"><Trophy className="h-4 w-4 text-amber-500" /> Top referrers</div>
            <div className="space-y-1">
              {leaders.slice(0, 5).map((l, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{i + 1}. {l.name}</span>
                  <Badge variant="outline">{l.referrals} referred</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
