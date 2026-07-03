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
import { MessageSquare, Plus, Send, ArrowLeft, Store, Globe } from "lucide-react";

// Slice 1 of the cross-role message center: coordinator ↔ business threads.
// This one component serves both hubs — the `role` prop only changes who the
// "New conversation" flow can address. Everything else (inbox, thread view,
// replies, read state) is identical. In-app only; no email/push yet.

type Role = "coordinator" | "business";

interface ThreadSummary {
  id: string;
  subject: string;
  status: string;
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
  thread: { id: string; subject: string; status: string; myRole: Role; counterpartName: string };
  messages: ThreadMessage[];
}

// Coordinator-only: businesses in territory (for addressing a new thread).
interface TerritoryStore { id: string; name: string }

function timeLabel(ts: string | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
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
    // Opening marks-as-read server-side; refresh the list badges shortly after.
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

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
          <span className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-purple-600" />
            Messages
            {totalUnread > 0 && (
              <Badge className="bg-rose-500 text-white border-0">{totalUnread}</Badge>
            )}
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
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {role === "coordinator"
            ? "Message the businesses in your territory. They can reply here."
            : "Message your community coordinator. They can reply here."}
        </p>

        {/* Thread view */}
        {selectedId && detail ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Inbox
              </Button>
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 dark:text-white truncate">{detail.thread.subject}</div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  {detail.thread.myRole === "coordinator" ? <Store className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
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
          /* Inbox list */
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
                      {t.myRole === "coordinator" ? (
                        <Store className="h-5 w-5 text-purple-600" />
                      ) : (
                        <Globe className="h-5 w-5 text-purple-600" />
                      )}
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
function ComposeDialog({
  role, open, onOpenChange, onCreated,
}: {
  role: Role;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (threadId: string) => void;
}) {
  const { toast } = useToast();
  const [businessId, setBusinessId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Coordinator: pick a business in the territory. Business: recipient is
  // implicit (their coordinator) — we just need the business's own id.
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

  const effectiveBusinessId = role === "business" ? (myBiz?.[0]?.id ?? "") : businessId;

  const create = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/messages/threads", {
        businessId: effectiveBusinessId,
        subject: subject.trim(),
        body: body.trim(),
      });
      return (await res.json()) as { id: string };
    },
    onSuccess: (data) => {
      setSubject(""); setBody(""); setBusinessId("");
      onCreated(data.id);
    },
    onError: () => toast({ title: "Couldn't start conversation", variant: "destructive" }),
  });

  const canSend =
    !!effectiveBusinessId && !!subject.trim() && !!body.trim() && !create.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {role === "coordinator" ? "Message a business" : "Message your coordinator"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {role === "coordinator" ? (
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Business</label>
              <select
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
                className="mt-1 w-full h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
              >
                <option value="">Select a business…</option>
                {(overview?.stores ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          ) : (
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
