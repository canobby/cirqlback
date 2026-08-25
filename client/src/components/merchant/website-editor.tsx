import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Globe, Lock, Plus, X, ChevronUp, ChevronDown, ExternalLink, Eye } from "lucide-react";
import {
  FONT_PRESETS,
  HERO_STYLES,
  SECTION_CATALOG,
  ALL_SECTIONS,
  ACCENT_SWATCHES,
  DAYS,
  type BusinessWebsiteContent,
  type SectionKey,
  type FontPreset,
  type HeroStyle,
} from "@shared/business-website";

interface Biz { id: string; name: string }
interface WebsiteResp {
  entitled: boolean;
  content: BusinessWebsiteContent;
  slug: string | null;
  published: boolean;
  views: number;
  publicUrl: string | null;
}

const DAY_LABELS: Record<string, string> = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday",
  friday: "Friday", saturday: "Saturday", sunday: "Sunday",
};

// Hosted Business Page editor (hosted_website add-on). Mirrors TapBrandingEditor:
// upsell when not entitled, otherwise a form + live server-rendered preview.
export default function WebsiteEditor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: myBiz } = useQuery<Biz[]>({ queryKey: ["/api/my/businesses"], retry: false });
  const businessId = myBiz?.[0]?.id;

  const { data } = useQuery<WebsiteResp>({
    queryKey: [`/api/business/website/${businessId}`],
    enabled: !!businessId,
    retry: false,
  });

  const [content, setContent] = useState<BusinessWebsiteContent | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (data?.content) setContent(data.content);
  }, [data?.content]);

  // Debounced live preview — re-render via the same server renderer as the
  // public page whenever the draft changes.
  useEffect(() => {
    if (!businessId || !content || !data?.entitled) return;
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(async () => {
      try {
        const res = await apiRequest("POST", `/api/business/website/${businessId}/preview`, { content });
        setPreviewHtml(await res.text());
      } catch {
        /* preview is best-effort */
      }
    }, 500);
    return () => { if (previewTimer.current) clearTimeout(previewTimer.current); };
  }, [content, businessId, data?.entitled]);

  const save = useMutation({
    mutationFn: async () => apiRequest("PUT", `/api/business/website/${businessId}`, { content }),
    onSuccess: () => {
      toast({ title: "Website saved" });
      queryClient.invalidateQueries({ queryKey: [`/api/business/website/${businessId}`] });
    },
    onError: () => toast({ title: "Couldn't save website", variant: "destructive" }),
  });

  const publish = useMutation({
    mutationFn: async (published: boolean) =>
      apiRequest("POST", `/api/business/website/${businessId}/publish`, { published }),
    onSuccess: (_res, published) => {
      toast({ title: published ? "Website published" : "Website unpublished" });
      queryClient.invalidateQueries({ queryKey: [`/api/business/website/${businessId}`] });
    },
    onError: () => toast({ title: "Couldn't update publish state", variant: "destructive" }),
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
              <Globe className="h-4 w-4 text-purple-600" /> Hosted Business Page
            </h3>
            <p className="text-sm text-gray-600">
              A customizable one-page website with your brand, hours, specials, and live Cirql rewards.
              Included with Pro, or add it from Add-ons above on Core.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!content) return null;

  // ── small update helpers ──
  const set = (patch: Partial<BusinessWebsiteContent>) => setContent({ ...content, ...patch });
  const included = content.sections;
  const available = ALL_SECTIONS.filter((s) => !included.includes(s));
  const moveSection = (i: number, dir: -1 | 1) => {
    const next = [...included];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set({ sections: next });
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-gray-900">
          <Globe className="h-5 w-5 text-purple-600" /> Hosted business page
          <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs">Add-on</Badge>
          {data.published ? (
            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs flex items-center gap-1">
              Live
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-gray-500">Draft</Badge>
          )}
          {data.publicUrl && (
            <a href={data.publicUrl} target="_blank" rel="noopener noreferrer"
               className="text-xs text-purple-600 hover:underline flex items-center gap-1 ml-auto">
              <ExternalLink className="h-3 w-3" /> {data.publicUrl}
            </a>
          )}
        </CardTitle>
        {data.published && (
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Eye className="h-3 w-3" /> {data.views.toLocaleString()} views
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── Editor form ── */}
          <div className="space-y-5">
            <Field label="Business name">
              <Input value={content.businessName} onChange={(e) => set({ businessName: e.target.value })} />
            </Field>
            <Field label="Tagline">
              <Input value={content.tagline} placeholder="A short line under your name"
                     onChange={(e) => set({ tagline: e.target.value })} />
            </Field>

            {/* Look & feel */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Brand color">
                <div className="flex items-center gap-2">
                  <input type="color" value={content.accentColor}
                         onChange={(e) => set({ accentColor: e.target.value })}
                         className="h-9 w-12 rounded border" />
                  <div className="flex flex-wrap gap-1">
                    {ACCENT_SWATCHES.map((c) => (
                      <button key={c} type="button" title={c} onClick={() => set({ accentColor: c })}
                              className="h-5 w-5 rounded-full border border-gray-200"
                              style={{ background: c }} />
                    ))}
                  </div>
                </div>
              </Field>
              <Field label="Font">
                <select value={content.fontPreset} onChange={(e) => set({ fontPreset: e.target.value as FontPreset })}
                        className="w-full h-9 rounded-md border border-gray-200 px-2 text-sm">
                  {Object.entries(FONT_PRESETS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Hero style">
                <select value={content.heroStyle} onChange={(e) => set({ heroStyle: e.target.value as HeroStyle })}
                        className="w-full h-9 rounded-md border border-gray-200 px-2 text-sm">
                  {Object.entries(HERO_STYLES).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Hero / cover image URL">
                <Input value={content.heroImage} placeholder="https://…"
                       onChange={(e) => set({ heroImage: e.target.value })} />
              </Field>
            </div>

            {/* Text blocks */}
            <Field label="About">
              <Textarea rows={3} value={content.about} onChange={(e) => set({ about: e.target.value })} />
            </Field>
            <Field label="Specials & offers">
              <Textarea rows={2} value={content.specials} onChange={(e) => set({ specials: e.target.value })} />
            </Field>

            {/* Sections order */}
            <Field label="Sections (shown in this order)">
              <div className="space-y-1">
                {included.map((s, i) => (
                  <div key={s} className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1">
                    <span className="text-sm flex-1">{SECTION_CATALOG[s].label}</span>
                    <button type="button" className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                            disabled={i === 0} onClick={() => moveSection(i, -1)}>
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button type="button" className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                            disabled={i === included.length - 1} onClick={() => moveSection(i, 1)}>
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button type="button" className="text-gray-400 hover:text-red-600"
                            onClick={() => set({ sections: included.filter((x) => x !== s) })}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {available.length > 0 && (
                  <select value="" onChange={(e) => e.target.value && set({ sections: [...included, e.target.value as SectionKey] })}
                          className="w-full h-9 rounded-md border border-dashed border-gray-300 px-2 text-sm text-gray-500">
                    <option value="">+ Add a section…</option>
                    {available.map((s) => <option key={s} value={s}>{SECTION_CATALOG[s].label}</option>)}
                  </select>
                )}
              </div>
            </Field>

            {/* Contact */}
            <Field label="Contact">
              <div className="space-y-2">
                <Input placeholder="Address" value={content.contact.address}
                       onChange={(e) => set({ contact: { ...content.contact, address: e.target.value } })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Phone" value={content.contact.phone}
                         onChange={(e) => set({ contact: { ...content.contact, phone: e.target.value } })} />
                  <Input placeholder="Email" value={content.contact.email}
                         onChange={(e) => set({ contact: { ...content.contact, email: e.target.value } })} />
                </div>
              </div>
            </Field>

            {/* Social */}
            <Field label="Social links">
              <div className="grid grid-cols-2 gap-2">
                {(["facebook", "instagram", "twitter", "website"] as const).map((k) => (
                  <Input key={k} placeholder={k} value={content.social[k] || ""}
                         onChange={(e) => set({ social: { ...content.social, [k]: e.target.value } })} />
                ))}
              </div>
            </Field>

            {/* Hours */}
            <Field label="Hours">
              <div className="space-y-1">
                {DAYS.map((d) => {
                  const h = content.hours[d];
                  return (
                    <div key={d} className="flex items-center gap-2 text-sm">
                      <span className="w-20 text-gray-600">{DAY_LABELS[d]}</span>
                      <Switch checked={!h.closed}
                              onCheckedChange={(open) => set({ hours: { ...content.hours, [d]: { ...h, closed: !open } } })} />
                      {h.closed ? (
                        <span className="text-gray-400">Closed</span>
                      ) : (
                        <>
                          <input type="time" value={h.open}
                                 onChange={(e) => set({ hours: { ...content.hours, [d]: { ...h, open: e.target.value } } })}
                                 className="h-8 rounded border border-gray-200 px-1" />
                          <span className="text-gray-400">–</span>
                          <input type="time" value={h.close}
                                 onChange={(e) => set({ hours: { ...content.hours, [d]: { ...h, close: e.target.value } } })}
                                 className="h-8 rounded border border-gray-200 px-1" />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </Field>

            {/* Gallery */}
            <Field label="Gallery image URLs">
              <div className="space-y-2">
                {content.gallery.map((g, i) => (
                  <div key={i} className="flex gap-2">
                    <Input placeholder="https://…" value={g}
                           onChange={(e) => set({ gallery: content.gallery.map((x, j) => (j === i ? e.target.value : x)) })} />
                    <Button size="sm" variant="ghost" onClick={() => set({ gallery: content.gallery.filter((_, j) => j !== i) })}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {content.gallery.length < 12 && (
                  <Button size="sm" variant="outline" onClick={() => set({ gallery: [...content.gallery, ""] })}>
                    <Plus className="h-4 w-4 mr-1" /> Add image
                  </Button>
                )}
              </div>
            </Field>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={() => save.mutate()} disabled={save.isPending}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                {save.isPending ? "Saving…" : "Save"}
              </Button>
              {data.published ? (
                <Button variant="outline" onClick={() => publish.mutate(false)} disabled={publish.isPending}>
                  Unpublish
                </Button>
              ) : (
                <Button variant="outline" onClick={() => publish.mutate(true)} disabled={publish.isPending}>
                  Save &amp; publish
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-400">Save first, then publish to make changes live.</p>
          </div>

          {/* ── Live preview ── */}
          <div className="lg:sticky lg:top-4 h-fit">
            <div className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
              <Eye className="h-3 w-3" /> Live preview
            </div>
            <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
              <iframe title="Website preview" srcDoc={previewHtml}
                      className="w-full h-[560px] border-0" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-medium text-gray-700 mb-1">{label}</div>
      {children}
    </div>
  );
}
