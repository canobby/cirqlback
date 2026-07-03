import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Gift, Ticket, Plus, Trophy } from "lucide-react";

// Admin: platform-wide perks + prize draws (spend points to enter; draw a winner).
interface Reward { id: string; title: string; emoji: string | null; pointsCost: number; type: string; businessId: string | null; redeemedCount: number; isActive: boolean; winnerRedemptionId: string | null }

export default function PointsAdminPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: rewards = [] } = useQuery<Reward[]>({ queryKey: ["/api/admin/points/rewards"], retry: false });
  const refresh = () => qc.invalidateQueries({ queryKey: ["/api/admin/points/rewards"] });

  const [form, setForm] = useState({ title: "", emoji: "🎁", pointsCost: "500", type: "platform_perk", quantity: "" });
  const create = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/admin/points/rewards", {
      title: form.title.trim(), emoji: form.emoji, pointsCost: Number(form.pointsCost) || 0, type: form.type, quantity: form.quantity || undefined,
    }),
    onSuccess: () => { toast({ title: "Reward created" }); setForm({ title: "", emoji: "🎁", pointsCost: "500", type: "platform_perk", quantity: "" }); refresh(); },
    onError: (e: any) => toast({ title: "Couldn't create", description: String(e?.message ?? "").slice(0, 120), variant: "destructive" }),
  });
  const draw = useMutation({
    mutationFn: async (id: string) => { const res = await apiRequest("POST", `/api/admin/points/draws/${id}/draw`); return res.json(); },
    onSuccess: (d: any) => { toast({ title: "Winner drawn 🏆", description: d?.winner?.email || d?.winner?.name || "See entries" }); refresh(); },
    onError: (e: any) => toast({ title: "Couldn't draw", description: String(e?.message ?? "").slice(0, 120), variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white"><Gift className="h-5 w-5 text-purple-600" /> Points rewards & prize draws</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className="w-16 text-center" maxLength={4} />
          <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="flex-1" />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 text-sm">
            <option value="platform_perk">Platform perk</option>
            <option value="prize_draw">Prize draw</option>
          </select>
          <Input type="number" min={1} placeholder="Points" value={form.pointsCost} onChange={(e) => setForm({ ...form, pointsCost: e.target.value })} className="w-24" />
          <Button onClick={() => create.mutate()} disabled={!form.title.trim() || create.isPending} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"><Plus className="h-4 w-4 mr-1" /> Create</Button>
        </div>
        {rewards.length > 0 && (
          <div className="space-y-2">
            {rewards.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 dark:border-gray-800 p-3">
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white truncate">{r.emoji} {r.title}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    {r.type === "prize_draw" ? <Ticket className="h-3 w-3" /> : <Gift className="h-3 w-3" />}
                    {r.type === "prize_draw" ? "Prize draw" : r.businessId ? "Business" : "Platform"} · {r.pointsCost} pts · {r.redeemedCount} {r.type === "prize_draw" ? "entries" : "redeemed"}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!r.isActive && <Badge variant="outline">closed</Badge>}
                  {r.type === "prize_draw" && !r.winnerRedemptionId && (
                    <Button size="sm" variant="outline" onClick={() => draw.mutate(r.id)} disabled={draw.isPending}><Trophy className="h-4 w-4 mr-1" /> Draw winner</Button>
                  )}
                  {r.winnerRedemptionId && <Badge className="bg-amber-100 text-amber-700 border-amber-200">winner drawn</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
