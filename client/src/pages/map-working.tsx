import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuickTranslate } from "@/components/ui/translated-text";
import { MapPin, ArrowRight, Navigation, Store, Gift } from "lucide-react";

interface MapBusiness {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  description: string | null;
  category: string;
  isActive: boolean;
}

const containerStyle = { width: "100%", height: "420px" };
// Default view: downtown Yakima, WA (used until businesses load).
const DEFAULT_CENTER = { lat: 46.6021, lng: -120.5059 };

export default function MapWorking() {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<MapBusiness | null>(null);

  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || "";
  const { isLoaded } = useJsApiLoader({
    id: "cirqlback-google-map",
    googleMapsApiKey: apiKey,
  });

  const { data: businesses = [], isLoading } = useQuery<MapBusiness[]>({
    queryKey: ["/api/map/businesses"],
  });

  // Center on the average of the loaded businesses, else the default.
  const center = useMemo(() => {
    if (businesses.length === 0) return DEFAULT_CENTER;
    return {
      lat: businesses.reduce((s, b) => s + b.lat, 0) / businesses.length,
      lng: businesses.reduce((s, b) => s + b.lng, 0) / businesses.length,
    };
  }, [businesses]);

  const openDirections = (b: MapBusiness) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`,
      "_blank",
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setLocation("/")} className="mb-4">
            <ArrowRight className="h-4 w-4 rotate-180 mr-2" />
            <QuickTranslate text="Back to Home" />
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            <QuickTranslate text="Discover Local Businesses" />
          </h1>
          <p className="text-gray-600">
            <QuickTranslate text="Tap Cirql tags to earn rewards and discover amazing local spots." />
          </p>
        </div>

        {/* Map */}
        <div className="mb-6 bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <MapPin className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Local businesses</h2>
              <p className="text-sm text-gray-600">
                {isLoading ? "Loading…" : `${businesses.length} businesses on the map`}
              </p>
            </div>
          </div>

          <div className="relative h-[420px] bg-gray-100">
            {apiKey && isLoaded ? (
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={14}
                options={{ streetViewControl: false, mapTypeControl: false }}
              >
                {businesses.map((b) => (
                  <Marker
                    key={b.id}
                    position={{ lat: b.lat, lng: b.lng }}
                    title={b.name}
                    onClick={() => setSelected(b)}
                  />
                ))}
                {selected && (
                  <InfoWindow
                    position={{ lat: selected.lat, lng: selected.lng }}
                    onCloseClick={() => setSelected(null)}
                  >
                    <div className="max-w-xs p-1">
                      <h3 className="font-bold text-gray-900">{selected.name}</h3>
                      {selected.address && (
                        <p className="text-xs text-gray-600 mb-1">{selected.address}</p>
                      )}
                      {selected.description && (
                        <p className="text-sm text-gray-700 mb-2">{selected.description}</p>
                      )}
                      <Button size="sm" className="w-full" onClick={() => openDirections(selected)}>
                        <Navigation className="h-4 w-4 mr-2" /> Directions
                      </Button>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center px-6">
                <MapPin className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-gray-600">
                  {apiKey
                    ? "Loading map…"
                    : "Interactive map unavailable — set VITE_GOOGLE_MAPS_API_KEY to enable it."}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  The businesses below are live from the database.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Business list (live from /api/map/businesses) */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Nearby Businesses</h3>
          {businesses.length === 0 && !isLoading ? (
            <p className="text-gray-500 text-sm">No businesses on the map yet.</p>
          ) : (
            <div className="space-y-3">
              {businesses.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border"
                  onClick={() => setSelected(b)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-green-100 text-green-600 flex-shrink-0">
                      <Store className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{b.name}</p>
                      <p className="text-sm text-gray-600 truncate">
                        {b.address || b.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs capitalize">
                          {b.category}
                        </Badge>
                        <span className="text-xs text-purple-600 flex items-center gap-1">
                          <Gift className="h-3 w-3" /> Rewards available
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDirections(b);
                    }}
                  >
                    <Navigation className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
