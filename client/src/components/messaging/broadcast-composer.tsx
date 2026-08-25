import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Send } from "lucide-react";

// Admin-only broadcast composer + sent history (Slice 2). Sends a one-way
// announcement to a role audience; recipients see it in their AnnouncementsPanel.

interface Broadcast {
  id: string;
  audience: string;
  subject: string;
  body: string;
  createdAt: string | null;
}

const AUDIENCES = [
  { value: "all", label: "Everyone" },
  { value: "businesses", label: "Businesses" },
  { value: "coordinators", label: "Coordinators" },
  { value: "customers", label: "Customers" },
];

function timeLabel(ts: string | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function BroadcastComposer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [audience, setAudience] = useState("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const { data: sent = [] } = useQuery<Broadcast[]>({
    queryKey: ["/api/admin/broadcasts"],
    retry: false,
  });

  const send = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/admin/broadcasts", { audience, subject: subject.trim(), body: body.trim() }),
    onSuccess: () => {
      toast({ title: "Broadcast sent" });
      setSubject(""); setBody("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/broadcasts"] });
    },
    onError: () => toast({ title: "Couldn't send broadcast", variant: "destructive" }),
  });

  const canSend = !!subject.trim() && !!body.trim() && !send.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <Megaphone className="h-5 w-5 text-purple-600" />
          Broadcast an announcement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm sm:w-48"
          >
            {AUDIENCES.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
          <Input
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1"
          />
        </div>
        <Textarea
          placeholder="Write your announcement…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="resize-none"
        />
        <div className="flex justify-end">
          <Button
            onClick={() => send.mutate()}
            disabled={!canSend}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
          >
            <Send className="h-4 w-4 mr-1" /> Send broadcast
          </Button>
        </div>

        {sent.length > 0 && (
          <div className="pt-2">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recent broadcasts</div>
            <div className="space-y-2">
              {sent.slice(0, 8).map((b) => (
                <div key={b.id} className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">{b.subject}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="capitalize">{b.audience}</Badge>
                      <span className="text-xs text-gray-400">{timeLabel(b.createdAt)}</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">{b.body}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
