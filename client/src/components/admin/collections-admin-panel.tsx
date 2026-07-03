import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Search, X } from "lucide-react";

// Admin/coordinator: build a passport (curated set of businesses) with a
// completion point reward.
interface Coll { id: string; name: string; emoji: string | null; rewardPoints: number; isActive: boolean }
interface Biz { id: string; name: string }

export default function CollectionsAdminPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: list = [] } = useQuery<Coll[]>({ queryKey: ["/api/admin/collections"], retry: false });

  const [form, setForm] = useState({ name: "", emoji: "🗺️", rewardPoints: "150" });
  const [picked, setPicked] = useState<Biz[]>([]);
  const [q, setQ] = useState("");
  const { data: results = [] } = useQuery<Biz[]>({
    queryKey: [`/api/group-campaigns/business-search?q=${encodeURIComponent(q)}`],
    enabled: q.trim().length >= 2, retry: false,
  });
  const add = (b: Biz) => { if (!picked.find((p) => p.id === b.id)) setPicked([...picked, b]); setQ(""); };

  const create = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/collections", {
      name: form.name.trim(), emoji: form.emoji, rewardPoints: Number(form.rewardPoints) || 0,
      businessIds: picked.map((p) => p.id),
    }),
    onSuccess: () => {
      toast({ title: "Passport created" });
      setForm({ name: "", emoji: "🗺️", rewardPoints: "150" }); setPicked([]);
      qc.invalidateQueries({ queryKey: ["/api/admin/collections"] });
    },
    onError: (e: any) => toast({ title: "Couldn't create", description: String(e?.message ?? "").slice(0, 120), variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white"><MapPin className="h-5 w-5 text-purple-600" /> Passports / collections</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className="w-16 text-center" maxLength={4} />
          <Input placeholder="Passport name (e.g. Yakima Coffee Trail)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="flex-1" />
          <Input type="number" min={0} placeholder="Reward pts" value={form.rewardPoints} onChange={(e) => setForm({ ...form, rewardPoints: e.target.value })} className="w-28" />
        </div>
        <div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Add businesses by name…" className="pl-9" />
          </div>
          {q.trim().length >= 2 && (
            <div className="mt-1 space-y-1">
              {results.map((b) => (
                <button key={b.id} onClick={() => add(b)} className="w-full text-left text-sm px-2 py-1 rounded hover:bg-purple-50">{b.name}</button>
              ))}
            </div>
          )}
          {picked.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {picked.map((b) => (
                <span key={b.id} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  {b.name}
                  <button onClick={() => setPicked(picked.filter((p) => p.id !== b.id))}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>
        <Button onClick={() => create.mutate()} disabled={!form.name.trim() || picked.length < 2 || create.isPending} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <Plus className="h-4 w-4 mr-1" /> Create passport ({picked.length} stores)
        </Button>

        {list.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            {list.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-800 dark:text-gray-200">{c.emoji} {c.name}</span>
                <Badge variant="outline">+{c.rewardPoints} pts</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
