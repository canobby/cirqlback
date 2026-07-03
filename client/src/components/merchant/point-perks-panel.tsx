import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Coins, Plus } from "lucide-react";

// Business-funded point perks: customers spend points, redeem the perk in-store.
interface Biz { id: string; name: string }
interface Perk { id: string; title: string; emoji: string | null; pointsCost: number; quantity: number | null; redeemedCount: number; isActive: boolean }

export default function PointPerksPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: myBiz = [] } = useQuery<Biz[]>({ queryKey: ["/api/my/businesses"], retry: false });
  const businessId = myBiz[0]?.id;

  const { data: perks = [] } = useQuery<Perk[]>({
    queryKey: [`/api/points/rewards/manage?businessId=${businessId}`], enabled: !!businessId, retry: false,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: [`/api/points/rewards/manage?businessId=${businessId}`] });

  const [form, setForm] = useState({ title: "", emoji: "🎁", pointsCost: "200", quantity: "" });
  const create = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/points/rewards", {
      businessId, title: form.title.trim(), emoji: form.emoji,
      pointsCost: Number(form.pointsCost) || 0, quantity: form.quantity || undefined,
    }),
    onSuccess: () => { toast({ title: "Perk added" }); setForm({ title: "", emoji: "🎁", pointsCost: "200", quantity: "" }); refresh(); },
    onError: (e: any) => toast({ title: "Couldn't add perk", description: String(e?.message ?? "").slice(0, 120), variant: "destructive" }),
  });
  const deactivate = useMutation({
    mutationFn: async (id: string) => apiRequest("POST", `/api/points/rewards/${id}/deactivate`),
    onSuccess: () => { toast({ title: "Perk removed" }); refresh(); },
    onError: () => toast({ title: "Couldn't remove", variant: "destructive" }),
  });

  if (!businessId) return null;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900"><Coins className="h-5 w-5 text-purple-600" /> Point perks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-500">Let customers spend their loyalty points on a perk they redeem in your store — you set the perk and the price.</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className="w-16 text-center" maxLength={4} />
          <Input placeholder="Perk (e.g. Free pastry)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="flex-1" />
          <Input type="number" min={1} placeholder="Points" value={form.pointsCost} onChange={(e) => setForm({ ...form, pointsCost: e.target.value })} className="w-24" />
          <Input type="number" min={1} placeholder="Qty (∞)" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-24" />
          <Button onClick={() => create.mutate()} disabled={!form.title.trim() || create.isPending} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        {perks.length > 0 && (
          <div className="space-y-2">
            {perks.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 p-3">
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">{p.emoji} {p.title}</div>
                  <div className="text-xs text-gray-500">{p.pointsCost} pts · {p.redeemedCount} redeemed{p.quantity != null ? ` · ${Math.max(0, p.quantity - p.redeemedCount)} left` : ""}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {p.isActive ? <Badge className="bg-green-100 text-green-700 border-green-200">active</Badge> : <Badge variant="outline">off</Badge>}
                  {p.isActive && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deactivate.mutate(p.id)} disabled={deactivate.isPending}>Remove</Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
