import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface Biz { id: string; name: string }
interface OpenGC { id: string; name: string; requiredStores: number; memberCount: number; ruleType: string }
interface JoinedGC { id: string; name: string; requiredStores: number; status: string }

// CHR-58: real multi-store group-campaign membership for the signed-in
// merchant's business. Self-contained so it can drop into the (otherwise
// mock) merchant page without depending on its state.
export default function GroupCampaignsPanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: myBiz } = useQuery<Biz[]>({ queryKey: ["/api/my/businesses"], retry: false });
  const businessId = myBiz?.[0]?.id;

  const { data: open = [] } = useQuery<OpenGC[]>({ queryKey: ["/api/group-campaigns/open"], retry: false });
  const { data: joined = [] } = useQuery<JoinedGC[]>({
    queryKey: [`/api/group-campaigns/joined/${businessId}`],
    enabled: !!businessId,
    retry: false,
  });

  const joinedIds = new Set((joined || []).map((j) => j.id));
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/group-campaigns/open"] });
    if (businessId) queryClient.invalidateQueries({ queryKey: [`/api/group-campaigns/joined/${businessId}`] });
  };
  const join = useMutation({
    mutationFn: async (id: string) => apiRequest("POST", `/api/group-campaigns/${id}/join`, { businessId }),
    onSuccess: () => { toast({ title: "Joined group campaign" }); refresh(); },
    onError: () => toast({ title: "Couldn't join campaign", variant: "destructive" }),
  });
  const leave = useMutation({
    mutationFn: async (id: string) => apiRequest("POST", `/api/group-campaigns/${id}/leave`, { businessId }),
    onSuccess: () => { toast({ title: "Left group campaign" }); refresh(); },
    onError: () => toast({ title: "Couldn't leave campaign", variant: "destructive" }),
  });

  if (!businessId) return null; // only render for a signed-in merchant with a business

  const openToJoin = open.filter((o) => !joinedIds.has(o.id));

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Users className="h-5 w-5 text-purple-600" />
          Group campaigns
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-gray-500 mb-2">Open to join</h4>
            {openToJoin.length === 0 ? (
              <p className="text-sm text-gray-400">No open campaigns right now.</p>
            ) : (
              openToJoin.map((o) => (
                <div key={o.id} className="flex items-center justify-between p-3 mb-2 rounded-lg bg-gray-50">
                  <div>
                    <div className="font-medium text-gray-900">{o.name}</div>
                    <div className="text-xs text-gray-500">Tap {o.requiredStores} · {o.memberCount} stores</div>
                  </div>
                  <Button size="sm" variant="outline" disabled={join.isPending} onClick={() => join.mutate(o.id)}>
                    Join
                  </Button>
                </div>
              ))
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-500 mb-2">Joined</h4>
            {joined.length === 0 ? (
              <p className="text-sm text-gray-400">You haven't joined any yet.</p>
            ) : (
              joined.map((j) => (
                <div key={j.id} className="flex items-center justify-between p-3 mb-2 rounded-lg bg-purple-50">
                  <div>
                    <div className="font-medium text-gray-900">{j.name}</div>
                    <Badge variant="outline" className="text-xs capitalize">{j.status}</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                    disabled={leave.isPending}
                    onClick={() => leave.mutate(j.id)}
                  >
                    Leave
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
