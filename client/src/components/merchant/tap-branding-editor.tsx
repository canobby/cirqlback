import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Palette, Lock, Plus, X } from "lucide-react";

interface Biz { id: string; name: string }
interface Link { label: string; url: string }
interface BrandingResp {
  entitled: boolean;
  branding: { brandColor?: string; accentColor?: string; slogan?: string; logoUrl?: string; links?: Link[] } | null;
}

// CHR-68: custom tap-screen branding editor (add-on). Self-contained. Renders
// the form when the business holds custom_branding; an upsell when it doesn't.
export default function TapBrandingEditor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: myBiz } = useQuery<Biz[]>({ queryKey: ["/api/my/businesses"], retry: false });
  const businessId = myBiz?.[0]?.id;

  const { data } = useQuery<BrandingResp>({
    queryKey: [`/api/businesses/${businessId}/tap-branding`],
    enabled: !!businessId,
    retry: false,
  });

  const [form, setForm] = useState({ brandColor: "#7c3aed", accentColor: "#ec4899", slogan: "", logoUrl: "" });
  const [links, setLinks] = useState<Link[]>([]);
  useEffect(() => {
    const b = data?.branding;
    if (b) {
      setForm({
        brandColor: b.brandColor || "#7c3aed",
        accentColor: b.accentColor || "#ec4899",
        slogan: b.slogan || "",
        logoUrl: b.logoUrl || "",
      });
      setLinks(Array.isArray(b.links) ? b.links : []);
    }
  }, [data?.branding]);

  const save = useMutation({
    mutationFn: async () =>
      apiRequest("PUT", `/api/businesses/${businessId}/tap-branding`, {
        ...form,
        links: links.filter((l) => l.url),
      }),
    onSuccess: () => {
      toast({ title: "Branding saved" });
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/tap-branding`] });
    },
    onError: () => toast({ title: "Couldn't save branding", variant: "destructive" }),
  });

  if (!businessId || !data) return null;

  if (!data.entitled) {
    return (
      <Card className="mb-8 border-dashed">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Lock className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Palette className="h-4 w-4 text-purple-600" /> Custom Tap-Screen Branding
            </h3>
            <p className="text-sm text-gray-600">
              Add your colors, slogan, logo, and links to the customer tap page. Enable it from Add-ons above.
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
          <Palette className="h-5 w-5 text-purple-600" /> Tap-screen branding
          <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs">Add-on</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <label className="text-sm text-gray-600 flex items-center gap-2">
            Brand color
            <input type="color" value={form.brandColor} onChange={(e) => setForm({ ...form, brandColor: e.target.value })} className="h-8 w-12 rounded border" />
          </label>
          <label className="text-sm text-gray-600 flex items-center gap-2">
            Accent color
            <input type="color" value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} className="h-8 w-12 rounded border" />
          </label>
        </div>
        <Input placeholder="Slogan (e.g. Freshly roasted, always)" value={form.slogan} onChange={(e) => setForm({ ...form, slogan: e.target.value })} />
        <Input placeholder="Logo image URL" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} />

        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">Links</div>
          {links.map((l, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <Input placeholder="Label" value={l.label} onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} className="w-40" />
              <Input placeholder="https://…" value={l.url} onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} className="flex-1" />
              <Button size="sm" variant="ghost" onClick={() => setLinks(links.filter((_, j) => j !== i))}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => setLinks([...links, { label: "", url: "" }])}>
            <Plus className="h-4 w-4 mr-1" /> Add link
          </Button>
        </div>

        <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          Save branding
        </Button>
      </CardContent>
    </Card>
  );
}
