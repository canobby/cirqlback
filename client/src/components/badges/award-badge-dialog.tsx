import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import BadgeMedallion from "./badge-medallion";
import { Sparkles, Upload } from "lucide-react";

type Role = "customer" | "business" | "coordinator" | "admin";
interface Def { id: string; name: string; description: string | null; emoji: string | null; imageDataUri: string | null; color: string | null }
interface NamedBiz { id: string; name: string }

const IMG_MAX = 220 * 1024;

export default function AwardBadgeDialog({
  as, open, onOpenChange, onDone, awarderBusinessId,
}: {
  as: Role;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
  awarderBusinessId?: string; // for as='business'
}) {
  const { toast } = useToast();
  const [selectedDef, setSelectedDef] = useState("");
  const [note, setNote] = useState("");
  // Recipient inputs by role.
  const [recipientBusinessId, setRecipientBusinessId] = useState(""); // customer/coordinator
  const [recipientEmail, setRecipientEmail] = useState("");           // business/admin
  const [adminTarget, setAdminTarget] = useState<"customer" | "business">("customer");
  const [adminBizQ, setAdminBizQ] = useState("");
  const [adminBizId, setAdminBizId] = useState("");
  // Custom badge (not for customers).
  const [custom, setCustom] = useState(false);
  const [cName, setCName] = useState("");
  const [cEmoji, setCEmoji] = useState("🏅");
  const [cColor, setCColor] = useState("#7c3aed");
  const [cImage, setCImage] = useState<string | null>(null);

  const { data: catalog = [] } = useQuery<Def[]>({
    queryKey: [`/api/badges/catalog?as=${as}`], enabled: open, retry: false,
  });
  const { data: visited = [] } = useQuery<NamedBiz[]>({
    queryKey: ["/api/badges/my-visited-businesses"], enabled: open && as === "customer", retry: false,
  });
  const { data: overview } = useQuery<{ stores: NamedBiz[] }>({
    queryKey: ["/api/coordinator/territory/overview"], enabled: open && as === "coordinator", retry: false,
  });
  const { data: bizResults = [] } = useQuery<NamedBiz[]>({
    queryKey: [`/api/group-campaigns/business-search?q=${encodeURIComponent(adminBizQ)}`],
    enabled: open && as === "admin" && adminTarget === "business" && adminBizQ.trim().length >= 2, retry: false,
  });

  const onFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > IMG_MAX) return toast({ title: "Image too large (max ~220KB)", variant: "destructive" });
    const reader = new FileReader();
    reader.onload = () => setCImage(String(reader.result));
    reader.readAsDataURL(f);
  };

  const reset = () => { setSelectedDef(""); setNote(""); setRecipientBusinessId(""); setRecipientEmail(""); setAdminBizId(""); setAdminBizQ(""); setCustom(false); setCName(""); setCImage(null); };

  const award = useMutation({
    mutationFn: async () => {
      const body: any = { as, note: note.trim() || undefined };
      // recipient
      if (as === "customer" || as === "coordinator") body.recipientBusinessId = recipientBusinessId;
      if (as === "business") { body.recipientEmail = recipientEmail.trim(); body.awarderBusinessId = awarderBusinessId; }
      if (as === "admin") { if (adminTarget === "business") body.recipientBusinessId = adminBizId; else body.recipientEmail = recipientEmail.trim(); }
      // badge
      if (custom) body.custom = { name: cName.trim(), emoji: cEmoji, color: cColor, imageDataUri: cImage || undefined };
      else body.badgeDefinitionId = selectedDef;
      return apiRequest("POST", "/api/badges/award", body);
    },
    onSuccess: () => { toast({ title: "Badge awarded 🎉" }); reset(); onDone(); onOpenChange(false); },
    onError: (e: any) => toast({ title: "Couldn't award badge", description: String(e?.message ?? "").slice(0, 140), variant: "destructive" }),
  });

  const hasRecipient =
    as === "customer" || as === "coordinator" ? !!recipientBusinessId
    : as === "business" ? !!recipientEmail.trim()
    : adminTarget === "business" ? !!adminBizId : !!recipientEmail.trim();
  const hasBadge = custom ? !!cName.trim() : !!selectedDef;
  const allowCustom = as !== "customer";

  const title =
    as === "customer" ? "Give a business a badge"
    : as === "business" ? "Award a customer a badge"
    : as === "coordinator" ? "Award a business a badge"
    : "Award a badge";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* Recipient */}
          {(as === "customer" || as === "coordinator") && (
            <select value={recipientBusinessId} onChange={(e) => setRecipientBusinessId(e.target.value)} className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm">
              <option value="">{as === "customer" ? "Choose a business you've visited…" : "Choose a business in your territory…"}</option>
              {(as === "customer" ? visited : (overview?.stores ?? [])).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          {as === "business" && (
            <Input placeholder="Customer email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} />
          )}
          {as === "admin" && (
            <div className="space-y-2">
              <div className="flex gap-2 text-sm">
                <label className="flex items-center gap-1"><input type="radio" checked={adminTarget === "customer"} onChange={() => setAdminTarget("customer")} /> a person</label>
                <label className="flex items-center gap-1"><input type="radio" checked={adminTarget === "business"} onChange={() => setAdminTarget("business")} /> a business</label>
              </div>
              {adminTarget === "customer" ? (
                <Input placeholder="Email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} />
              ) : (
                <div>
                  <Input placeholder="Search a business…" value={adminBizQ} onChange={(e) => { setAdminBizQ(e.target.value); setAdminBizId(""); }} />
                  {adminBizQ.trim().length >= 2 && !adminBizId && (
                    <div className="mt-1 space-y-1">
                      {bizResults.map((b) => (
                        <button key={b.id} onClick={() => { setAdminBizId(b.id); setAdminBizQ(b.name); }} className="w-full text-left text-sm px-2 py-1 rounded hover:bg-purple-50">{b.name}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Badge picker */}
          {!custom && (
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Choose a badge</div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {catalog.map((d) => (
                  <button key={d.id} onClick={() => setSelectedDef(d.id)} className={`flex flex-col items-center gap-1 p-2 rounded-lg border ${selectedDef === d.id ? "border-purple-500 bg-purple-50" : "border-gray-200"}`}>
                    <BadgeMedallion emoji={d.emoji} imageDataUri={d.imageDataUri} color={d.color} name={d.name} size={40} />
                    <span className="text-[11px] text-center leading-tight text-gray-700">{d.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {allowCustom && (
            <button onClick={() => setCustom((v) => !v)} className="text-sm text-purple-600 flex items-center gap-1">
              <Sparkles className="h-4 w-4" /> {custom ? "Pick from catalog instead" : "Create a custom badge"}
            </button>
          )}

          {custom && (
            <div className="space-y-2 rounded-lg border border-gray-200 p-3">
              <div className="flex items-center gap-3">
                <BadgeMedallion emoji={cEmoji} imageDataUri={cImage} color={cColor} name={cName || "Custom"} size={48} />
                <div className="flex-1 space-y-2">
                  <Input placeholder="Badge name" value={cName} onChange={(e) => setCName(e.target.value)} maxLength={60} />
                  <div className="flex items-center gap-2">
                    <Input placeholder="emoji" value={cEmoji} onChange={(e) => setCEmoji(e.target.value)} className="w-16 text-center" maxLength={4} />
                    <input type="color" value={cColor} onChange={(e) => setCColor(e.target.value)} className="h-9 w-10 rounded border" />
                    <label className="text-xs text-purple-600 flex items-center gap-1 cursor-pointer">
                      <Upload className="h-4 w-4" /> {cImage ? "Change image" : "Upload PNG"}
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
                    </label>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-gray-400">Uploaded art (PNG/JPG/WebP, ≤220KB) replaces the emoji. Otherwise the emoji + color are used.</p>
            </div>
          )}

          <Textarea placeholder="Add a note (optional)" value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="resize-none" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => award.mutate()} disabled={!hasRecipient || !hasBadge || award.isPending} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            Award badge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
