import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { MessageSquare, Plus, Send, ArrowLeft, Store, Globe, LifeBuoy, User } from "lucide-react";

// Shared cross-role message center — one component for every hub. The `role`
// prop only changes who the "New conversation" flow can address; the inbox,
// thread view, replies and read-state are identical everywhere.
//   coordinator ↔ business (Slice 1) · admin support (Slice 2)
// In-app only; no email/push yet.

type Role = "coordinator" | "business" | "admin" | "customer";

interface ThreadSummary {
  id: string;
  subject: string;
  status: string;
  kind: string; // 'coordinator_business' | 'admin_support'
  myRole: Role;
  counterpartName: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  messageCount: number;
  unreadCount: number;
}

interface ThreadMessage {
  id: string;
  senderRole: string;
  body: string;
  createdAt: string | null;
  readAt: string | null;
}

interface ThreadDetail {
  thread: { id: string; subject: string; status: string; kind: string; myRole: Role; counterpartName: string };
  messages: ThreadMessage[];
}

function timeLabel(ts: string | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function ThreadIcon({ kind, myRole, className }: { kind: string; myRole: Role; className?: string }) {
  if (kind === "admin_support") return <LifeBuoy className={className} />;
  // customer_business: customer sees the business (store), business sees the customer.
  if (kind === "customer_business") return myRole === "customer" ? <Store className={className} /> : <User className={className} />;
  // coordinator_business: coordinator sees a store, business sees a globe.
  return myRole === "coordinator" ? <Store className={className} /> : <Globe className={className} />;
}

export default function MessageCenter({ role }: { role: Role }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);

  const { data: threads = [] } = useQuery<ThreadSummary[]>({
    queryKey: ["/api/messages/threads"],
    retry: false,
  });

  const { data: detail } = useQuery<ThreadDetail>({
    queryKey: [`/api/messages/threads/${selectedId}`],
    enabled: !!selectedId,
    retry: false,
  });

  const refetchAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/messages/threads"] });
    queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
    if (selectedId) queryClient.invalidateQueries({ queryKey: [`/api/messages/threads/${selectedId}`] });
  };

  const openThread = (id: string) => {
    setSelectedId(id);
    setReplyBody("");
    setTimeout(refetchAll, 300);
  };

  const reply = useMutation({
    mutationFn: async () =>
      apiRequest("POST", `/api/messages/threads/${selectedId}/messages`, { body: replyBody.trim() }),
    onSuccess: () => {
      setReplyBody("");
      refetchAll();
    },
    onError: () => toast({ title: "Couldn't send message", variant: "destructive" }),
  });

  const totalUnread = threads.reduce((s, t) => s + t.unreadCount, 0);

  const subtitle =
    role === "coordinator"
      ? "Message the businesses in your territory. They can reply here."
      : role === "business"
        ? "Message your community coordinator or reply to Cirqlback Support."
        : role === "customer"
          ? "Message a business you follow. They can reply here."
          : "Support conversations with coordinators and businesses.";

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
          <span className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-purple-600" />
            Messages
            {totalUnread > 0 && <Badge className="bg-rose-500 text-white border-0">{totalUnread}</Badge>}
          </span>
          <Button
            size="sm"
            onClick={() => setComposeOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
          >
            <Plus className="h-4 w-4 mr-1" /> New
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{subtitle}</p>

        {selectedId && detail ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Inbox
              </Button>
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 dark:text-white truncate">{detail.thread.subject}</div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <ThreadIcon kind={detail.thread.kind} myRole={detail.thread.myRole} className="h-3 w-3" />
                  {detail.thread.counterpartName}
                </div>
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-800 p-3 bg-gray-50/50 dark:bg-gray-900/30">
              {detail.messages.map((m) => {
                const mine = m.senderRole === detail.thread.myRole;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                        mine
                          ? "bg-purple-600 text-white rounded-br-sm"
                          : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-sm"
                      }`}
                    >
                      {!mine && m.senderRole === "admin" && (
                        <div className="text-[10px] font-semibold text-purple-600 mb-0.5">Cirqlback Support</div>
                      )}
                      <div className="whitespace-pre-wrap break-words">{m.body}</div>
                      <div className={`mt-1 text-[10px] ${mine ? "text-purple-100" : "text-gray-400"}`}>
                        {timeLabel(m.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 mt-3">
              <Textarea
                placeholder="Write a reply…"
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={2}
                className="flex-1 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && replyBody.trim()) reply.mutate();
                }}
              />
              <Button
                onClick={() => reply.mutate()}
                disabled={!replyBody.trim() || reply.isPending}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {threads.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No conversations yet. Start one with “New”.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {threads.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => openThread(t.id)}
                    className="w-full text-left py-3 px-1 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors flex items-start gap-3"
                  >
                    <div className="mt-0.5">
                      <ThreadIcon kind={t.kind} myRole={t.myRole} className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-gray-900 dark:text-white truncate">{t.counterpartName}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0">{timeLabel(t.lastMessageAt)}</span>
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 truncate">{t.subject}</div>
                      {t.lastMessagePreview && (
                        <div className="text-xs text-gray-500 truncate">{t.lastMessagePreview}</div>
                      )}
                    </div>
                    {t.unreadCount > 0 && (
                      <Badge className="bg-rose-500 text-white border-0 flex-shrink-0">{t.unreadCount}</Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>

      <ComposeDialog
        role={role}
        open={composeOpen}
        onOpenChange={setComposeOpen}
        onCreated={(id) => {
          setComposeOpen(false);
          refetchAll();
          openThread(id);
        }}
      />
    </Card>
  );
}

// ── New-conversation dialog ────────────────────────────────────────────────
interface TerritoryStore { id: string; name: string }
interface AdminTargets { coordinators: { id: string; name: string }[]; businesses: { id: string; name: string }[] }

function ComposeDialog({
  role, open, onOpenChange, onCreated,
}: {
  role: Role;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (threadId: string) => void;
}) {
  const { toast } = useToast();
  const [businessId, setBusinessId] = useState("");   // coordinator flow
  const [adminTarget, setAdminTarget] = useState(""); // admin flow: "business:<id>" | "coordinator:<id>"
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Coordinator: businesses in territory. Admin: coordinators + claimed businesses.
  const { data: overview } = useQuery<{ stores: TerritoryStore[] }>({
    queryKey: ["/api/coordinator/territory/overview"],
    enabled: open && role === "coordinator",
    retry: false,
  });
  const { data: myBiz } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/my/businesses"],
    enabled: open && role === "business",
    retry: false,
  });
  const { data: adminTargets } = useQuery<AdminTargets>({
    queryKey: ["/api/admin/messages/targets"],
    enabled: open && role === "admin",
    retry: false,
  });
  const { data: followed } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/customer/followed-businesses"],
    enabled: open && role === "customer",
    retry: false,
  });

  const reset = () => { setSubject(""); setBody(""); setBusinessId(""); setAdminTarget(""); };

  const create = useMutation({
    mutationFn: async () => {
      let res;
      if (role === "admin") {
        const [targetType, targetId] = adminTarget.split(":");
        res = await apiRequest("POST", "/api/admin/messages/threads", {
          targetType, targetId, subject: subject.trim(), body: body.trim(),
        });
      } else {
        const effectiveBusinessId = role === "business" ? (myBiz?.[0]?.id ?? "") : businessId;
        res = await apiRequest("POST", "/api/messages/threads", {
          businessId: effectiveBusinessId, subject: subject.trim(), body: body.trim(),
        });
      }
      return (await res.json()) as { id: string };
    },
    onSuccess: (data) => { reset(); onCreated(data.id); },
    onError: () => toast({ title: "Couldn't start conversation", variant: "destructive" }),
  });

  const hasRecipient =
    role === "admin" ? !!adminTarget : role === "business" ? !!myBiz?.[0]?.id : !!businessId;
  const canSend = hasRecipient && !!subject.trim() && !!body.trim() && !create.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {role === "coordinator" || role === "customer" ? "Message a business"
              : role === "admin" ? "New support message"
              : "Message your coordinator"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {role === "coordinator" && (
            <select
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
            >
              <option value="">Select a business…</option>
              {(overview?.stores ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          {role === "customer" && (
            (followed ?? []).length === 0 ? (
              <p className="text-sm text-gray-500">
                Follow a business (tap the heart on its page) to message it.
              </p>
            ) : (
              <select
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
              >
                <option value="">Select a business you follow…</option>
                {(followed ?? []).map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            )
          )}
          {role === "admin" && (
            <select
              value={adminTarget}
              onChange={(e) => setAdminTarget(e.target.value)}
              className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
            >
              <option value="">Select a recipient…</option>
              {(adminTargets?.coordinators ?? []).length > 0 && (
                <optgroup label="Coordinators">
                  {adminTargets!.coordinators.map((c) => (
                    <option key={c.id} value={`coordinator:${c.id}`}>{c.name}</option>
                  ))}
                </optgroup>
              )}
              {(adminTargets?.businesses ?? []).length > 0 && (
                <optgroup label="Businesses">
                  {adminTargets!.businesses.map((b) => (
                    <option key={b.id} value={`business:${b.id}`}>{b.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          )}
          {role === "business" && (
            <p className="text-sm text-gray-500">
              This goes to the community coordinator for {myBiz?.[0]?.name ?? "your business"}.
            </p>
          )}
          <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea
            placeholder="Write your message…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => create.mutate()}
            disabled={!canSend}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
          >
            <Send className="h-4 w-4 mr-1" /> Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
