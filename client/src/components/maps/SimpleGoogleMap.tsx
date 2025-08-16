import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { Loader2, MapPin } from 'lucide-react';

declare global {
  interface Window {
    google: any;
  }
}

interface Business {
  id: number;
  name: string;
  category: string;
  lat?: number;
  lng?: number;
  rating: number;
  activeRewards: number;
  isOpen: boolean;
  address: string;
}

interface MapComponentProps {
  center: { lat: number; lng: number };
  zoom: number;
  businesses: Business[];
  onBusinessSelect?: (business: Business) => void;
  userLocation?: { lat: number; lng: number } | null;
}

// Simple Google Maps component without infinite loop issues
function SimpleMapComponent({ center, zoom, businesses, onBusinessSelect, userLocation }: MapComponentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    // Initialize map only once
    if (ref.current && !mapRef.current) {
      mapRef.current = new window.google.maps.Map(ref.current, {
        center,
        zoom,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
    }

    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add user location marker
    if (userLocation) {
      const userMarker = new window.google.maps.Marker({
        position: userLocation,
        map,
        title: "Your Location",
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#3B82F6',
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: '#FFFFFF',
        },
      });
      markersRef.current.push(userMarker);
    }

    // Add business markers
    console.log('Adding markers for businesses:', businesses);
    businesses.forEach((business) => {
      if (business.lat && business.lng) {
        console.log('Creating marker for:', business.name, 'at', business.lat, business.lng);
        const marker = new window.google.maps.Marker({
          position: { lat: business.lat, lng: business.lng },
          map,
          title: business.name,
          // Use default red pin for visibility - we can customize later
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 12px; min-width: 250px; font-family: system-ui;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">${business.name}</h3>
              <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">${business.category} • ${business.address}</p>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="color: #f59e0b;">★ ${business.rating}</span>
                <span style="background: ${business.isOpen ? '#10b981' : '#ef4444'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
                  ${business.isOpen ? 'Open' : 'Closed'}
                </span>
              </div>
              <div style="color: #3b82f6; font-weight: 600; font-size: 14px;">
                ${business.activeRewards} Active Rewards Available
              </div>
            </div>
          `
        });

        marker.addListener('click', () => {
          console.log('Marker clicked for:', business.name);
          infoWindow.open(map, marker);
          if (onBusinessSelect) {
            onBusinessSelect(business);
          }
        });

        markersRef.current.push(marker);
      }
    });

    // Update center and zoom
    map.setCenter(center);
    map.setZoom(zoom);

  }, [center, zoom, businesses, userLocation, onBusinessSelect]);

  return <div ref={ref} className="w-full h-full min-h-[300px] rounded-lg" />;
}

function LoadingComponent() {
  return (
    <div className="w-full h-full min-h-[300px] bg-gradient-to-br from-blue-50 to-green-50 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Loading Interactive Map</p>
      </div>
    </div>
  );
}

function ErrorComponent() {
  return (
    <div className="w-full h-full min-h-[300px] bg-gradient-to-br from-red-50 to-orange-50 rounded-lg flex items-center justify-center">
      <div className="text-center p-6">
        <MapPin className="h-8 w-8 text-red-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Map Unavailable</h3>
        <p className="text-gray-600">Unable to load interactive map</p>
      </div>
    </div>
  );
}

interface GoogleMapWrapperProps {
  businesses: Business[];
  userLocation?: { lat: number; lng: number } | null;
  onBusinessSelect?: (business: Business) => void;
  className?: string;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

export default function SimpleGoogleMapWrapper({ 
  businesses, 
  userLocation, 
  onBusinessSelect,
  className = ""
}: GoogleMapWrapperProps) {
  const [apiKey, setApiKey] = useState<string>('');

  useEffect(() => {
    // Fetch API key
    fetch('/api/maps/config')
      .then(res => res.json())
      .then(data => setApiKey(data.apiKey))
      .catch(err => console.error('Failed to fetch maps config:', err));
  }, []);

  const center = userLocation || { lat: 46.6021, lng: -120.5059 };
  const zoom = 14;

  if (!apiKey) {
    return <LoadingComponent />;
  }

  const render = (status: Status) => {
    switch (status) {
      case Status.LOADING:
        return <LoadingComponent />;
      case Status.FAILURE:
        return <ErrorComponent />;
      case Status.SUCCESS:
        return (
          <SimpleMapComponent
            center={center}
            zoom={zoom}
            businesses={businesses}
            onBusinessSelect={onBusinessSelect}
            userLocation={userLocation}
          />
        );
    }
  };

  return (
    <div className={className}>
      <Wrapper apiKey={apiKey} render={render} libraries={['places']} />
    </div>
  );
}