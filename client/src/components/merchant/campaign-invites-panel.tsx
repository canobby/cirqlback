import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Handshake, Check, X, UserPlus, Search, Send } from "lucide-react";

// Campaign initiation/acceptance handshake for a merchant: pending invites to
// accept/decline (with cost-share consent for funded campaigns), join-requests
// to approve/deny for campaigns they created, plus initiating an invite or a
// request-to-join.

interface Invite {
  businessId: string; campaignId: string; name: string; myBusinessName: string;
  rewardTitle: string | null; rewardType: string | null; rewardValue: string | null; rewardPoints: number | null;
  funded: boolean; hostName: string | null; isHost: boolean;
}
interface Request { campaignId: string; campaignName: string; businessId: string; businessName: string }
interface MyCampaign { id: string; name: string; funded: boolean }
interface Inbox { invites: Invite[]; requests: Request[]; myCampaigns: MyCampaign[] }
interface Biz { id: string; name: string }

export default function CampaignInvitesPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: myBiz = [] } = useQuery<Biz[]>({ queryKey: ["/api/my/businesses"], retry: false });
  const businessId = myBiz[0]?.id;
  const { data } = useQuery<Inbox>({ queryKey: ["/api/my/campaign-inbox"], retry: false });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["/api/my/campaign-inbox"] });
    if (businessId) qc.invalidateQueries({ queryKey: [`/api/group-campaigns/joined/${businessId}`] });
  };

  const [consented, setConsented] = useState<Record<string, boolean>>({});

  const respond = useMutation({
    mutationFn: async ({ i, accept }: { i: Invite; accept: boolean }) =>
      apiRequest("POST", `/api/group-campaigns/${i.campaignId}/respond`, {
        businessId: i.businessId, accept, consent: consented[i.campaignId + i.businessId] === true,
      }),
    onSuccess: (_r, v) => { toast({ title: v.accept ? "Joined campaign" : "Invite declined" }); refresh(); },
    onError: (e: any) => toast({ title: "Couldn't respond", description: String(e?.message ?? "").slice(0, 140), variant: "destructive" }),
  });

  const decide = useMutation({
    mutationFn: async ({ r, approve }: { r: Request; approve: boolean }) =>
      apiRequest("POST", `/api/group-campaigns/${r.campaignId}/approve`, { businessId: r.businessId, approve }),
    onSuccess: (_x, v) => { toast({ title: v.approve ? "Request approved" : "Request denied" }); refresh(); },
    onError: () => toast({ title: "Couldn't update request", variant: "destructive" }),
  });

  const invites = data?.invites ?? [];
  const requests = data?.requests ?? [];
  const myCampaigns = data?.myCampaigns ?? [];

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Handshake className="h-5 w-5 text-purple-600" />
          Campaign invites & requests
          {(invites.length + requests.length) > 0 && <Badge className="bg-rose-500 text-white border-0">{invites.length + requests.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Invites TO me */}
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-2">Invitations to your business</div>
          {invites.length === 0 ? (
            <p className="text-sm text-gray-500">No pending invitations.</p>
          ) : (
            <div className="space-y-2">
              {invites.map((i) => {
                const key = i.campaignId + i.businessId;
                const needsConsent = i.funded && !i.isHost;
                return (
                  <div key={key} className="rounded-lg border border-gray-100 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{i.name}</div>
                        <div className="text-xs text-gray-500">
                          for {i.myBusinessName} · reward: {i.rewardTitle || (i.funded ? "funded prize" : `${i.rewardPoints ?? 0} pts`)}
                          {i.funded && i.hostName ? ` · hosted by ${i.hostName}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" disabled={respond.isPending || (needsConsent && !consented[key])} onClick={() => respond.mutate({ i, accept: true })}>
                          <Check className="h-4 w-4 mr-1" /> Accept
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-600" disabled={respond.isPending} onClick={() => respond.mutate({ i, accept: false })}>
                          <X className="h-4 w-4 mr-1" /> Decline
                        </Button>
                      </div>
                    </div>
                    {needsConsent && (
                      <label className="mt-2 flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 cursor-pointer">
                        <input type="checkbox" className="mt-0.5" checked={!!consented[key]} onChange={(e) => setConsented((c) => ({ ...c, [key]: e.target.checked }))} />
                        <span>This is a <b>funded</b> reward. By joining, I agree that when a customer completes the trail via my store, my store owes {i.hostName} a tap-weighted share of the reward cost (settled monthly).</span>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Requests to MY campaigns */}
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-2">Requests to join your campaigns</div>
          {requests.length === 0 ? (
            <p className="text-sm text-gray-500">No pending requests.</p>
          ) : (
            <div className="space-y-2">
              {requests.map((r) => (
                <div key={r.campaignId + r.businessId} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 p-3">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">{r.businessName}</div>
                    <div className="text-xs text-gray-500">wants to join “{r.campaignName}”</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" disabled={decide.isPending} onClick={() => decide.mutate({ r, approve: true })}>Approve</Button>
                    <Button size="sm" variant="ghost" className="text-red-600" disabled={decide.isPending} onClick={() => decide.mutate({ r, approve: false })}>Deny</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Initiation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
          <InviteForm myCampaigns={myCampaigns} onDone={refresh} />
          <RequestForm businessId={businessId} onDone={refresh} />
        </div>
      </CardContent>
    </Card>
  );
}

// Invite a specific business to one of my campaigns.
function InviteForm({ myCampaigns, onDone }: { myCampaigns: MyCampaign[]; onDone: () => void }) {
  const { toast } = useToast();
  const [campaignId, setCampaignId] = useState("");
  const [q, setQ] = useState("");
  const { data: results = [] } = useQuery<Biz[]>({
    queryKey: [`/api/group-campaigns/business-search?q=${encodeURIComponent(q)}`],
    enabled: q.trim().length >= 2,
    retry: false,
  });
  const invite = useMutation({
    mutationFn: async (businessId: string) => apiRequest("POST", `/api/group-campaigns/${campaignId}/invite`, { businessId }),
    onSuccess: () => { toast({ title: "Invite sent" }); setQ(""); onDone(); },
    onError: (e: any) => toast({ title: "Couldn't invite", description: String(e?.message ?? "").slice(0, 120), variant: "destructive" }),
  });

  if (myCampaigns.length === 0) {
    return <div className="text-sm text-gray-500"><UserPlus className="h-4 w-4 inline mr-1 text-purple-600" />Create a campaign to invite other businesses.</div>;
  }
  return (
    <div>
      <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1"><UserPlus className="h-4 w-4 text-purple-600" /> Invite a business</div>
      <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="w-full h-9 rounded-md border border-gray-300 bg-white px-2 text-sm mb-2">
        <option value="">Choose your campaign…</option>
        {myCampaigns.map((c) => <option key={c.id} value={c.id}>{c.name}{c.funded ? " (funded)" : ""}</option>)}
      </select>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a business by name…" className="pl-9" disabled={!campaignId} />
      </div>
      {campaignId && q.trim().length >= 2 && (
        <div className="mt-1 space-y-1">
          {results.length === 0 ? <div className="text-xs text-gray-400 px-1">No matches.</div> : results.map((b) => (
            <button key={b.id} onClick={() => invite.mutate(b.id)} disabled={invite.isPending} className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-purple-50 flex items-center justify-between">
              <span className="text-gray-800">{b.name}</span>
              <Send className="h-3.5 w-3.5 text-purple-600" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Request to join an active campaign my business isn't in.
function RequestForm({ businessId, onDone }: { businessId?: string; onDone: () => void }) {
  const { toast } = useToast();
  const [campaignId, setCampaignId] = useState("");
  const { data: joinable = [] } = useQuery<{ id: string; name: string; isOpen: boolean }[]>({
    queryKey: [`/api/group-campaigns/joinable?businessId=${businessId}`],
    enabled: !!businessId,
    retry: false,
  });
  const request = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/group-campaigns/${campaignId}/request`, { businessId }),
    onSuccess: () => { toast({ title: "Request sent" }); setCampaignId(""); onDone(); },
    onError: (e: any) => toast({ title: "Couldn't request", description: String(e?.message ?? "").slice(0, 120), variant: "destructive" }),
  });
  if (!businessId) return null;
  return (
    <div>
      <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1"><Handshake className="h-4 w-4 text-purple-600" /> Request to join a campaign</div>
      {joinable.length === 0 ? (
        <p className="text-sm text-gray-500">No other campaigns to join right now.</p>
      ) : (
        <div className="flex gap-2">
          <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="flex-1 h-9 rounded-md border border-gray-300 bg-white px-2 text-sm">
            <option value="">Choose a campaign…</option>
            {joinable.map((c) => <option key={c.id} value={c.id}>{c.name}{c.isOpen ? " (open)" : ""}</option>)}
          </select>
          <Button size="sm" onClick={() => request.mutate()} disabled={!campaignId || request.isPending} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">Request</Button>
        </div>
      )}
    </div>
  );
}
