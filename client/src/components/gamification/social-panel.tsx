import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Check, X, Trophy, Shield, Copy, LogOut } from "lucide-react";

interface Friend { userId: string; name: string; points: number }
interface FriendsData { friends: Friend[]; incoming: Friend[]; outgoing: Friend[] }
interface Lb { rank: number; name: string; points: number; isMe?: boolean }
interface Team { id: string; name: string; description: string | null; isLeader: boolean; maxMembers: number; points: number; roster: { userId: string; name: string; role: string; points: number }[] }
interface DiscoverTeam { id: string; name: string; description: string | null; members: number; maxMembers: number; points: number }
interface TeamLb { rank: number; name: string; members: number; points: number }

export default function SocialPanel() {
  const [tab, setTab] = useState<"friends" | "teams">("friends");
  return (
    <Card className="mb-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-gray-900 dark:text-gray-100">
          <span className="flex items-center gap-2"><Users className="h-5 w-5 text-purple-600" /> Friends & teams</span>
          <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5 text-xs">
            <button onClick={() => setTab("friends")} className={`px-3 py-1 rounded-md ${tab === "friends" ? "bg-white dark:bg-gray-700 shadow-sm font-medium" : "text-gray-500"}`}>Friends</button>
            <button onClick={() => setTab("teams")} className={`px-3 py-1 rounded-md ${tab === "teams" ? "bg-white dark:bg-gray-700 shadow-sm font-medium" : "text-gray-500"}`}>Teams</button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>{tab === "friends" ? <FriendsTab /> : <TeamsTab />}</CardContent>
    </Card>
  );
}

function FriendsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data } = useQuery<FriendsData>({ queryKey: ["/api/social/friends"], retry: false });
  const { data: lb = [] } = useQuery<Lb[]>({ queryKey: ["/api/social/friends/leaderboard"], retry: false });
  const { data: me } = useQuery<{ code: string }>({ queryKey: ["/api/referrals/mine"], retry: false });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["/api/social/friends"] }); qc.invalidateQueries({ queryKey: ["/api/social/friends/leaderboard"] }); };

  const [code, setCode] = useState("");
  const add = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/social/friends/request", { code: code.trim() }),
    onSuccess: () => { toast({ title: "Friend request sent" }); setCode(""); refresh(); },
    onError: (e: any) => toast({ title: "Couldn't send", description: String(e?.message ?? "").slice(0, 120), variant: "destructive" }),
  });
  const respond = useMutation({
    mutationFn: async (v: { userId: string; accept: boolean }) => apiRequest("POST", "/api/social/friends/respond", v),
    onSuccess: (_r, v) => { toast({ title: v.accept ? "Friend added" : "Declined" }); refresh(); },
  });
  const remove = useMutation({
    mutationFn: async (userId: string) => apiRequest("POST", "/api/social/friends/remove", { userId }),
    onSuccess: () => { toast({ title: "Removed" }); refresh(); },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Add by friend code or email" className="flex-1" />
        <Button onClick={() => add.mutate()} disabled={!code.trim() || add.isPending} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"><UserPlus className="h-4 w-4 mr-1" /> Add</Button>
      </div>
      {me?.code && (
        <div className="text-xs text-gray-500 flex items-center gap-2">Your code: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{me.code}</code>
          <button onClick={() => { navigator.clipboard?.writeText(me.code); toast({ title: "Copied" }); }}><Copy className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {(data?.incoming?.length ?? 0) > 0 && (
        <div>
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Requests</div>
          {data!.incoming.map((f) => (
            <div key={f.userId} className="flex items-center justify-between text-sm py-1">
              <span>{f.name}</span>
              <span className="flex gap-1">
                <Button size="sm" className="bg-green-600 text-white h-7" onClick={() => respond.mutate({ userId: f.userId, accept: true })}><Check className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" className="text-red-600 h-7" onClick={() => respond.mutate({ userId: f.userId, accept: false })}><X className="h-4 w-4" /></Button>
              </span>
            </div>
          ))}
        </div>
      )}

      <div>
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1"><Trophy className="h-4 w-4 text-amber-500" /> Friends leaderboard</div>
        {lb.length <= 1 ? (
          <p className="text-sm text-gray-500">Add friends to compete on points.</p>
        ) : (
          <div className="space-y-1">
            {lb.map((r) => (
              <div key={r.rank} className={`flex items-center justify-between text-sm py-1 ${r.isMe ? "font-semibold text-purple-700 dark:text-purple-300" : ""}`}>
                <span className="flex items-center gap-2"><span className="w-5 text-center">{r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : r.rank + "."}</span>{r.name}</span>
                <span className="flex items-center gap-2"><span>{r.points.toLocaleString()} pts</span>
                  {!r.isMe && <button onClick={() => remove.mutate(r.rank && (data?.friends.find((f) => f.name === r.name)?.userId) || "")} className="text-gray-300 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {(data?.outgoing?.length ?? 0) > 0 && <div className="text-xs text-gray-400">{data!.outgoing.length} pending sent</div>}
    </div>
  );
}

function TeamsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: team, isLoading } = useQuery<Team | null>({ queryKey: ["/api/social/teams/mine"], retry: false });
  const { data: discover = [] } = useQuery<DiscoverTeam[]>({ queryKey: ["/api/social/teams/discover"], enabled: !team, retry: false });
  const { data: lb = [] } = useQuery<TeamLb[]>({ queryKey: ["/api/social/teams/leaderboard"], retry: false });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["/api/social/teams/mine"] }); qc.invalidateQueries({ queryKey: ["/api/social/teams/discover"] }); qc.invalidateQueries({ queryKey: ["/api/social/teams/leaderboard"] }); };

  const [name, setName] = useState("");
  const create = useMutation({ mutationFn: async () => apiRequest("POST", "/api/social/teams", { name: name.trim() }), onSuccess: () => { toast({ title: "Team created" }); setName(""); refresh(); }, onError: (e: any) => toast({ title: "Couldn't create", description: String(e?.message ?? "").slice(0, 120), variant: "destructive" }) });
  const join = useMutation({ mutationFn: async (id: string) => apiRequest("POST", `/api/social/teams/${id}/join`), onSuccess: () => { toast({ title: "Joined team" }); refresh(); }, onError: (e: any) => toast({ title: "Couldn't join", description: String(e?.message ?? "").slice(0, 120), variant: "destructive" }) });
  const leave = useMutation({ mutationFn: async () => apiRequest("POST", `/api/social/teams/${team!.id}/leave`), onSuccess: () => { toast({ title: "Left team" }); refresh(); } });

  if (isLoading) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div className="space-y-4">
      {team ? (
        <div className="rounded-lg border border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 p-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Shield className="h-4 w-4 text-purple-600" /> {team.name} {team.isLeader && <Badge variant="outline" className="text-xs">leader</Badge>}</div>
            <span className="text-sm font-bold text-purple-600">{team.points.toLocaleString()} pts</span>
          </div>
          <div className="mt-2 space-y-1">
            {team.roster.map((m) => (
              <div key={m.userId} className="flex items-center justify-between text-sm">
                <span>{m.name} {m.role === "leader" && "👑"}</span><span className="text-gray-500">{m.points.toLocaleString()} pts</span>
              </div>
            ))}
          </div>
          <Button size="sm" variant="ghost" className="text-red-600 mt-2" onClick={() => leave.mutate()} disabled={leave.isPending}><LogOut className="h-4 w-4 mr-1" /> Leave team</Button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Start a team…" className="flex-1" />
            <Button onClick={() => create.mutate()} disabled={!name.trim() || create.isPending} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">Create</Button>
          </div>
          {discover.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Join a team</div>
              <div className="space-y-1">
                {discover.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm py-1">
                    <span>{t.name} <span className="text-gray-400 text-xs">· {t.members}/{t.maxMembers} · {t.points.toLocaleString()} pts</span></span>
                    <Button size="sm" variant="outline" className="h-7" onClick={() => join.mutate(t.id)} disabled={join.isPending || t.members >= t.maxMembers}>Join</Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div>
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1"><Trophy className="h-4 w-4 text-amber-500" /> Top teams</div>
        {lb.length === 0 ? <p className="text-sm text-gray-500">No teams yet — start one!</p> : (
          <div className="space-y-1">
            {lb.map((t) => (
              <div key={t.rank} className="flex items-center justify-between text-sm py-1">
                <span className="flex items-center gap-2"><span className="w-5 text-center">{t.rank === 1 ? "🥇" : t.rank === 2 ? "🥈" : t.rank === 3 ? "🥉" : t.rank + "."}</span>{t.name} <span className="text-gray-400 text-xs">· {t.members}</span></span>
                <span>{t.points.toLocaleString()} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
