import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Map, Lock, Trophy } from "lucide-react";

interface Biz { id: string; name: string }
interface Entitlement { addonKey: string; status: string }
interface Hunt { id: string; name: string; requiredStores: number; isActive: boolean }

// CHR-69: contest & scavenger-hunt builder (add-on). Self-contained. Builds a
// multi-store group campaign (CHR-33) gated on the scavenger_builder entitlement.
export default function ScavengerBuilder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: myBiz = [] } = useQuery<Biz[]>({ queryKey: ["/api/my/businesses"], retry: false });
  const hostId = myBiz[0]?.id;

  const { data: entitlements = [] } = useQuery<Entitlement[]>({
    queryKey: [`/api/businesses/${hostId}/addons`],
    enabled: !!hostId,
    retry: false,
  });
  const entitled = entitlements.some((e) => e.addonKey === "scavenger_builder" && e.status === "active");

  const { data: hunts = [] } = useQuery<Hunt[]>({
    queryKey: [`/api/group-campaigns/joined/${hostId}`],
    enabled: !!hostId && entitled,
    retry: false,
  });

  const [form, setForm] = useState({ name: "", rewardTitle: "", rewardPoints: "100", requiredStores: "3", storeIds: [] as string[] });
  const toggleStore = (id: string) =>
    setForm((f) => ({ ...f, storeIds: f.storeIds.includes(id) ? f.storeIds.filter((x) => x !== id) : [...f.storeIds, id] }));

  const create = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/scavenger-hunts", {
        businessId: hostId,
        name: form.name,
        rewardTitle: form.rewardTitle || undefined,
        rewardPoints: Number(form.rewardPoints) || 0,
        requiredStores: Number(form.requiredStores) || 1,
        storeIds: form.storeIds,
      }),
    onSuccess: () => {
      toast({ title: "Scavenger hunt created" });
      setForm({ name: "", rewardTitle: "", rewardPoints: "100", requiredStores: "3", storeIds: [] });
      queryClient.invalidateQueries({ queryKey: [`/api/group-campaigns/joined/${hostId}`] });
    },
    onError: () => toast({ title: "Couldn't create hunt", variant: "destructive" }),
  });

  if (!hostId) return null;

  if (!entitled) {
    return (
      <Card className="mb-8 border-dashed">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Lock className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Map className="h-4 w-4 text-purple-600" /> Contest & Scavenger Hunt Builder
            </h3>
            <p className="text-sm text-gray-600">
              Build multi-stop scavenger hunts and prize contests across your stores. Enable it from Add-ons above.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Map className="h-5 w-5 text-purple-600" /> Scavenger hunt builder
          <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs">Add-on</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input placeholder="Hunt name (e.g. Downtown Coffee Trail)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Prize (e.g. Free drink)" value={form.rewardTitle} onChange={(e) => setForm({ ...form, rewardTitle: e.target.value })} />
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <span className="flex items-center gap-2">Required stops
            <Input type="number" min={1} value={form.requiredStores} onChange={(e) => setForm({ ...form, requiredStores: e.target.value })} className="w-20" />
          </span>
          <span className="flex items-center gap-2">Prize points
            <Input type="number" min={0} value={form.rewardPoints} onChange={(e) => setForm({ ...form, rewardPoints: e.target.value })} className="w-24" />
          </span>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">Include your stores ({form.storeIds.length} selected)</div>
          <div className="flex flex-wrap gap-2">
            {myBiz.map((b) => {
              const on = form.storeIds.includes(b.id);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggleStore(b.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border ${on ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-700 border-gray-300"}`}
                >
                  {b.name}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-1">Your host business is always included.</p>
        </div>
        <Button onClick={() => create.mutate()} disabled={!form.name || create.isPending} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          Create hunt
        </Button>

        {hunts.length > 0 && (
          <div className="pt-4 border-t border-gray-100 space-y-2">
            {hunts.map((h) => (
              <div key={h.id} className="flex items-center justify-between text-sm p-2 rounded bg-gray-50">
                <span className="flex items-center gap-2 text-gray-900">
                  <Trophy className="h-4 w-4 text-amber-500" /> {h.name}
                </span>
                <Badge variant="outline" className="text-xs">Tap {h.requiredStores}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
