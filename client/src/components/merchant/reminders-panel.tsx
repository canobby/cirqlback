import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Heart } from "lucide-react";

interface Biz { id: string; name: string }

// CHR-75: post reminders to favoriters + see favoriter count. Self-contained
// (mirrors the other merchant panels). Delivery (email/push) is a follow-up.
export default function RemindersPanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: myBiz } = useQuery<Biz[]>({ queryKey: ["/api/my/businesses"], retry: false });
  const businessId = myBiz?.[0]?.id;

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: [`/api/businesses/${businessId}/favoriter-count`],
    enabled: !!businessId,
    retry: false,
  });

  const [message, setMessage] = useState("");
  const post = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/businesses/${businessId}/reminders`, { message }),
    onSuccess: () => {
      toast({ title: "Reminder posted to your favoriters" });
      setMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/favoriter-count`] });
    },
    onError: () => toast({ title: "Couldn't post reminder", variant: "destructive" }),
  });

  if (!businessId) return null;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-gray-900">
          <span className="flex items-center gap-2"><Bell className="h-5 w-5 text-purple-600" /> Reminders</span>
          <span className="text-sm font-normal text-gray-500 flex items-center gap-1">
            <Heart className="h-4 w-4 text-rose-500" /> {countData?.count ?? 0} favoriter{(countData?.count ?? 0) === 1 ? "" : "s"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-3">
          Post an offer or reminder for customers who favorited you. (Push/email delivery is coming soon; it shows in their feed now.)
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="e.g. Double points this weekend!"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={() => post.mutate()}
            disabled={!message.trim() || post.isPending}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
          >
            Post reminder
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
