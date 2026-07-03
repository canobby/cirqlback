import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GoogleMap, LoadScript, Circle } from "@react-google-maps/api";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Trash2, Wand2, AlertTriangle, Crosshair } from "lucide-react";

interface Territory { id: string; name: string; coordinatorId: string; coordinatorName: string | null; centerLat: number | null; centerLng: number | null; radiusMeters: number | null; welcomeMessage: string | null; isActive: boolean; businesses: number }
interface Point { id: string; name: string; lat: number; lng: number; territoryId: string | null; claimed: boolean }
interface Manager { territories: Territory[]; coordinators: { id: string; name: string }[]; points: Point[]; overlaps: { a: string; b: string }[]; summary: { unassigned: number; contested: number; noCoverage: number } }

const PALETTE = ["#7c3aed", "#2563eb", "#0d9488", "#db2777", "#ea580c", "#16a34a", "#dc2626", "#4f46e5"];
const containerStyle = { width: "100%", height: "480px", borderRadius: "12px" };
const YAKIMA = { lat: 46.6021, lng: -120.5059 };

type FormState = { id?: string; name: string; coordinatorId: string; centerLat: number | null; centerLng: number | null; radiusKm: number; welcomeMessage: string };
const EMPTY: FormState = { name: "", coordinatorId: "", centerLat: null, centerLng: null, radiusKm: 15, welcomeMessage: "" };

export default function TerritoryManager() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || "";
  const { data } = useQuery<Manager>({ queryKey: ["/api/admin/territories"], retry: false });
  const [form, setForm] = useState<FormState | null>(null);

  const territories = data?.territories ?? [];
  const points = data?.points ?? [];
  const colorOf = (territoryId: string | null) => {
    if (!territoryId) return "#9ca3af";
    const i = territories.findIndex((t) => t.id === territoryId);
    return i >= 0 ? PALETTE[i % PALETTE.length] : "#9ca3af";
  };
  const refresh = () => qc.invalidateQueries({ queryKey: ["/api/admin/territories"] });

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      const body = { name: f.name, coordinatorId: f.coordinatorId, centerLat: f.centerLat, centerLng: f.centerLng, radiusMeters: Math.round(f.radiusKm * 1000), welcomeMessage: f.welcomeMessage };
      return f.id ? apiRequest("PATCH", `/api/admin/territories/${f.id}`, body) : apiRequest("POST", "/api/admin/territories", body);
    },
    onSuccess: () => { toast({ title: "Territory saved" }); setForm(null); refresh(); },
    onError: () => toast({ title: "Couldn't save territory", variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/admin/territories/${id}`, {}),
    onSuccess: () => { toast({ title: "Territory deleted" }); refresh(); },
    onError: () => toast({ title: "Couldn't delete", variant: "destructive" }),
  });
  const autoAssign = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/admin/territories/auto-assign", {}),
    onSuccess: async (res: any) => { const d = await res.json(); toast({ title: `Assigned ${d.assigned}${d.contested ? `, ${d.contested} contested` : ""}` }); refresh(); },
    onError: () => toast({ title: "Auto-assign failed", variant: "destructive" }),
  });
  const reassign = useMutation({
    mutationFn: async ({ businessId, territoryId }: { businessId: string; territoryId: string | null }) => apiRequest("POST", `/api/admin/businesses/${businessId}/territory`, { territoryId }),
    onSuccess: () => refresh(),
    onError: () => toast({ title: "Couldn't reassign", variant: "destructive" }),
  });

  const unassigned = points.filter((p) => !p.territoryId);
  const center = form?.centerLat != null && form?.centerLng != null ? { lat: form.centerLat, lng: form.centerLng }
    : territories[0]?.centerLat != null ? { lat: territories[0].centerLat!, lng: territories[0].centerLng! } : YAKIMA;

  return (
    <div className="space-y-6">
      {/* Summary + actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline">{territories.length} territories</Badge>
        <Badge variant="outline" className="border-gray-300 text-gray-600">{data?.summary.unassigned ?? 0} unassigned</Badge>
        {(data?.summary.contested ?? 0) > 0 && <Badge variant="outline" className="border-amber-300 text-amber-700">{data!.summary.contested} contested</Badge>}
        {(data?.overlaps.length ?? 0) > 0 && <Badge variant="outline" className="border-red-300 text-red-700 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{data!.overlaps.length} overlap(s)</Badge>}
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => autoAssign.mutate()} disabled={autoAssign.isPending}>
            <Wand2 className="h-4 w-4 mr-1" /> Auto-assign leads
          </Button>
          <Button size="sm" onClick={() => setForm({ ...EMPTY, coordinatorId: data?.coordinators[0]?.id ?? "" })} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <Plus className="h-4 w-4 mr-1" /> New territory
          </Button>
        </div>
      </div>

      {/* Coverage map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-purple-600" /> Coverage map
            {form && <span className="ml-auto text-xs font-normal text-purple-600 flex items-center gap-1"><Crosshair className="h-3 w-3" /> click the map to set this territory's center</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {apiKey ? (
            <LoadScript googleMapsApiKey={apiKey} loadingElement={<div className="h-[480px] bg-gray-100 rounded-xl flex items-center justify-center text-gray-500">Loading map…</div>}>
              <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={10}
                options={{ streetViewControl: false, mapTypeControl: false }}
                onClick={(e) => { if (form && e.latLng) setForm({ ...form, centerLat: e.latLng.lat(), centerLng: e.latLng.lng() }); }}>
                {/* Territory boundary circles */}
                {territories.filter((t) => t.centerLat != null && t.radiusMeters != null).map((t) => (
                  <Circle key={t.id} center={{ lat: t.centerLat!, lng: t.centerLng! }} radius={t.radiusMeters!}
                    options={{ fillColor: colorOf(t.id), fillOpacity: 0.08, strokeColor: colorOf(t.id), strokeWeight: 2, clickable: false }} />
                ))}
                {/* Preview circle for the territory being created/edited */}
                {form?.centerLat != null && (
                  <Circle center={{ lat: form.centerLat, lng: form.centerLng! }} radius={form.radiusKm * 1000}
                    options={{ fillColor: "#7c3aed", fillOpacity: 0.12, strokeColor: "#7c3aed", strokeWeight: 2, clickable: false, zIndex: 5 }} />
                )}
                {/* Business points */}
                {points.map((p) => (
                  <Circle key={p.id} center={{ lat: p.lat, lng: p.lng }} radius={p.territoryId ? 130 : 200}
                    options={{ fillColor: colorOf(p.territoryId), fillOpacity: p.territoryId ? 0.9 : 0.9, strokeColor: p.territoryId ? colorOf(p.territoryId) : "#374151", strokeWeight: p.territoryId ? 0 : 1, clickable: false, zIndex: 3 }} />
                ))}
              </GoogleMap>
            </LoadScript>
          ) : (
            <div className="h-[480px] bg-gray-100 rounded-xl flex items-center justify-center text-gray-500">Map unavailable — set VITE_GOOGLE_MAPS_API_KEY.</div>
          )}
          <p className="text-xs text-gray-400 mt-2">Colored circles are territories; dots are businesses (gray = unassigned). Membership is exclusive — a business belongs to exactly one territory.</p>
        </CardContent>
      </Card>

      {/* Create / edit form */}
      {form && (
        <Card className="border-purple-200">
          <CardHeader><CardTitle className="text-base">{form.id ? "Edit territory" : "New territory"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Name</div>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Yakima Valley" />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Coordinator</div>
                <select value={form.coordinatorId} onChange={(e) => setForm({ ...form, coordinatorId: e.target.value })} className="w-full h-9 rounded-md border border-gray-200 px-2 text-sm">
                  <option value="">Select…</option>
                  {data?.coordinators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Radius (km)</div>
                <Input type="number" min={1} value={form.radiusKm} onChange={(e) => setForm({ ...form, radiusKm: Math.max(1, Number(e.target.value) || 1) })} />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Center</div>
                <div className="text-sm text-gray-600 h-9 flex items-center">{form.centerLat != null ? `${form.centerLat.toFixed(4)}, ${form.centerLng!.toFixed(4)}` : "click the map above"}</div>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Welcome message (optional)</div>
              <Input value={form.welcomeMessage} onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })} placeholder="Shown to new businesses in this territory" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
              <Button onClick={() => save.mutate(form)} disabled={save.isPending || !form.name || !form.coordinatorId || form.centerLat == null} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                {save.isPending ? "Saving…" : "Save territory"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Territory list */}
      <Card>
        <CardHeader><CardTitle className="text-base">Territories</CardTitle></CardHeader>
        <CardContent>
          {territories.length === 0 ? (
            <p className="text-sm text-gray-500">No territories yet — create one above.</p>
          ) : (
            <div className="space-y-2">
              {territories.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                  <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: colorOf(t.id) }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{t.name} {!t.isActive && <Badge variant="outline" className="text-xs text-gray-400">inactive</Badge>}</div>
                    <div className="text-xs text-gray-500">{t.coordinatorName || "no coordinator"} · {t.businesses} businesses · {t.radiusMeters ? `${Math.round(t.radiusMeters / 1000)} km` : "no radius"}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setForm({ id: t.id, name: t.name, coordinatorId: t.coordinatorId, centerLat: t.centerLat, centerLng: t.centerLng, radiusKm: t.radiusMeters ? t.radiusMeters / 1000 : 15, welcomeMessage: t.welcomeMessage || "" })}>Edit</Button>
                  <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => { if (confirm(`Delete "${t.name}"? Its ${t.businesses} businesses become unassigned.`)) del.mutate(t.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unassigned businesses */}
      {unassigned.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Unassigned businesses ({unassigned.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {unassigned.slice(0, 50).map((b) => (
              <div key={b.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-2 text-sm">
                <span className="flex-1 min-w-0 truncate text-gray-800">{b.name}</span>
                <select className="h-8 rounded-md border border-gray-200 px-2 text-sm" defaultValue="" onChange={(e) => e.target.value && reassign.mutate({ businessId: b.id, territoryId: e.target.value })}>
                  <option value="">Assign to…</option>
                  {territories.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            ))}
            {unassigned.length > 50 && <p className="text-xs text-gray-400">Showing 50 of {unassigned.length}. Use Auto-assign for the rest.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
