import { useQuery } from "@tanstack/react-query";
import { GoogleMap, LoadScript, Circle } from "@react-google-maps/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Globe } from "lucide-react";

interface Point { lat: number; lng: number; name: string; claimed: boolean; taps: number }
interface Region { name: string; city: string | null; state: string | null; coordinator: string | null; businesses: number; taps: number }
interface Geo { points: Point[]; regions: Region[] }

const containerStyle = { width: "100%", height: "480px", borderRadius: "12px" };
const YAKIMA = { lat: 46.6021, lng: -120.5059 };

// Density "heatmap" via additive translucent circles — the Maps JS HeatmapLayer
// was removed in v3.65. Overlapping circles compound in opacity, so dense/active
// areas burn hotter; radius grows a little with tap activity.
function Heat({ points }: { points: Point[] }) {
  return (
    <>
      {points.map((p, i) => (
        <Circle
          key={i}
          center={{ lat: p.lat, lng: p.lng }}
          radius={350 + Math.min(p.taps, 25) * 80}
          options={{ fillColor: "#ef4444", fillOpacity: 0.12, strokeOpacity: 0, clickable: false, zIndex: 1 }}
        />
      ))}
    </>
  );
}

// Admin geographic view — a business heatmap + per-territory coverage, to see
// where the network is dense, where it's thin, and where to recruit next.
export default function AdminGeoPanel() {
  const { data } = useQuery<Geo>({ queryKey: ["/api/admin/geo"], retry: false });
  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || "";
  const points = data?.points ?? [];
  const regions = data?.regions ?? [];
  const claimed = points.filter((p) => p.claimed).length;
  const center = points.length
    ? { lat: points.reduce((s, p) => s + p.lat, 0) / points.length, lng: points.reduce((s, p) => s + p.lng, 0) / points.length }
    : YAKIMA;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-purple-600" /> Business heatmap
            <span className="ml-auto text-sm font-normal text-gray-500">{points.length.toLocaleString()} located · {claimed} claimed</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {apiKey ? (
            <LoadScript googleMapsApiKey={apiKey}
              loadingElement={<div className="h-[480px] bg-gray-100 rounded-xl flex items-center justify-center text-gray-500">Loading map…</div>}>
              <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={10}
                options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: true }}>
                {points.length > 0 && <Heat points={points} />}
              </GoogleMap>
            </LoadScript>
          ) : (
            <div className="h-[480px] bg-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-500 gap-2">
              <Globe className="h-6 w-6" />
              <span>Map unavailable — set <code>VITE_GOOGLE_MAPS_API_KEY</code>.</span>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">Heat reflects business density (hotter where more businesses, and more taps).</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Globe className="h-4 w-4 text-purple-600" /> Territory coverage</CardTitle>
        </CardHeader>
        <CardContent>
          {regions.length === 0 ? (
            <p className="text-sm text-gray-500">No territories yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 pr-4 font-medium">Region</th>
                    <th className="py-2 px-2 font-medium">Coordinator</th>
                    <th className="py-2 px-2 font-medium text-right">Businesses</th>
                    <th className="py-2 pl-2 font-medium text-right">Taps</th>
                  </tr>
                </thead>
                <tbody>
                  {regions.map((r, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 pr-4">
                        <div className="font-medium text-gray-900">{r.name}</div>
                        {(r.city || r.state) && <div className="text-xs text-gray-400">{[r.city, r.state].filter(Boolean).join(", ")}</div>}
                      </td>
                      <td className="py-2 px-2">
                        {r.coordinator ? (
                          <span className="text-gray-700">{r.coordinator}</span>
                        ) : (
                          <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">No coordinator</Badge>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right text-gray-900">{r.businesses.toLocaleString()}</td>
                      <td className="py-2 pl-2 text-right text-gray-700">{r.taps.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-3">Regions with no coordinator (or a big "Unassigned" row) are where to recruit next.</p>
        </CardContent>
      </Card>
    </div>
  );
}
