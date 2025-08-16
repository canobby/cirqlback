import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Navigation, 
  RefreshCw,
  Star,
  Clock,
  Gift,
  ExternalLink,
  Loader2
} from 'lucide-react';

declare global {
  interface Window {
    google: typeof google;
    selectBusiness: (businessId: number) => void;
  }
}

interface Business {
  id: number;
  name: string;
  category: string;
  lat?: number;
  lng?: number;
  distance?: number;
  rating: number;
  activeRewards: number;
  isOpen: boolean;
  gradient: string;
  address: string;
  description?: string;
}

interface MapComponentProps {
  center: { lat: number; lng: number };
  zoom: number;
  businesses: Business[];
  onBusinessSelect?: (business: Business) => void;
  userLocation?: { lat: number; lng: number } | null;
}

// Google Maps component
function MapComponent({ center, zoom, businesses, onBusinessSelect, userLocation }: MapComponentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map>();
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

  // Initialize map
  useEffect(() => {
    if (ref.current && !map) {
      const newMap = new window.google.maps.Map(ref.current, {
        center,
        zoom,
        styles: [
          {
            featureType: "poi.business",
            stylers: [{ visibility: "off" }]
          },
          {
            featureType: "poi.park",
            elementType: "labels.text",
            stylers: [{ visibility: "off" }]
          }
        ],
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      setMap(newMap);
    }
  }, [ref, map, center, zoom]);

  // Add markers for businesses
  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    const newMarkers: google.maps.Marker[] = [];

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
      newMarkers.push(userMarker);
    }

    // Add business markers
    businesses.forEach((business) => {
      if (business.lat && business.lng) {
        const marker = new window.google.maps.Marker({
          position: { lat: business.lat, lng: business.lng },
          map,
          title: business.name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: business.isOpen ? '#10B981' : '#EF4444',
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#FFFFFF',
          },
        });

        // Create info window
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div class="p-3 max-w-sm">
              <h3 class="font-semibold text-lg text-gray-900 mb-1">${business.name}</h3>
              <p class="text-sm text-gray-600 mb-2">${business.category} • ${business.address}</p>
              <div class="flex items-center gap-2 mb-2">
                <div class="flex items-center">
                  <span class="text-yellow-400">★</span>
                  <span class="text-sm text-gray-700">${business.rating}</span>
                </div>
                <span class="text-sm ${business.isOpen ? 'text-green-600' : 'text-red-600'}">
                  ${business.isOpen ? 'Open' : 'Closed'}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-purple-600">
                  ${business.activeRewards} active reward${business.activeRewards !== 1 ? 's' : ''}
                </span>
                <button 
                  onclick="window.selectBusiness(${business.id})"
                  class="px-3 py-1 bg-purple-600 text-white text-xs rounded-md hover:bg-purple-700"
                >
                  View Details
                </button>
              </div>
            </div>
          `,
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        newMarkers.push(marker);
      }
    });

    setMarkers(newMarkers);

    // Set up global function for info window button
    (window as any).selectBusiness = (businessId: number) => {
      const business = businesses.find(b => b.id === businessId);
      if (business && onBusinessSelect) {
        onBusinessSelect(business);
      }
    };

  }, [map, businesses, userLocation, onBusinessSelect]);

  // Update map center and zoom
  useEffect(() => {
    if (map) {
      map.setCenter(center);
      map.setZoom(zoom);
    }
  }, [map, center, zoom]);

  return <div ref={ref} className="w-full h-full min-h-[400px] rounded-lg" />;
}

// Loading component
function MapLoadingComponent() {
  return (
    <div className="w-full h-full min-h-[400px] bg-gradient-to-br from-blue-50 to-green-50 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Loading interactive map...</p>
        <p className="text-sm text-gray-500">Connecting to Google Maps</p>
      </div>
    </div>
  );
}

// Error component
function MapErrorComponent({ status }: { status: Status }) {
  return (
    <div className="w-full h-full min-h-[400px] bg-gradient-to-br from-red-50 to-orange-50 rounded-lg flex items-center justify-center">
      <div className="text-center p-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MapPin className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Map Not Available</h3>
        <p className="text-gray-600 mb-4">
          {status === Status.LOADING ? 'Loading Google Maps...' : 
           status === Status.FAILURE ? 'Failed to load Google Maps' :
           'Unable to initialize map service'}
        </p>
        <div className="text-sm text-gray-500">
          Showing business list view instead
        </div>
      </div>
    </div>
  );
}

// Main wrapper component
interface GoogleMapWrapperProps {
  businesses: Business[];
  userLocation?: { lat: number; lng: number } | null;
  onBusinessSelect?: (business: Business) => void;
  className?: string;
}

export default function GoogleMapWrapper({ 
  businesses, 
  userLocation, 
  onBusinessSelect,
  className = ""
}: GoogleMapWrapperProps) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Fetch API key from server
  useEffect(() => {
    fetch('/api/maps/config')
      .then(res => res.json())
      .then(data => {
        if (data.apiKey) {
          setApiKey(data.apiKey);
        } else {
          setApiError('Google Maps API key not configured');
        }
      })
      .catch(err => {
        console.error('Failed to fetch maps config:', err);
        setApiError('Failed to load map configuration');
      });
  }, []);
  
  // Default center (Yakima, WA)
  const defaultCenter = { lat: 46.6021, lng: -120.5059 };
  const center = userLocation || defaultCenter;

  const render = (status: Status) => {
    switch (status) {
      case Status.LOADING:
        return <MapLoadingComponent />;
      case Status.FAILURE:
        return <MapErrorComponent status={status} />;
      case Status.SUCCESS:
        return (
          <MapComponent
            center={center}
            zoom={userLocation ? 15 : 12}
            businesses={businesses}
            onBusinessSelect={onBusinessSelect}
            userLocation={userLocation}
          />
        );
    }
  };

  if (apiError) {
    return (
      <div className={`w-full ${className}`}>
        <div className="w-full h-full min-h-[400px] bg-gradient-to-br from-red-50 to-orange-50 rounded-lg flex items-center justify-center">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Maps Not Available</h3>
            <p className="text-gray-600 mb-4">{apiError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className={`w-full ${className}`}>
        <MapLoadingComponent />
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <Wrapper apiKey={apiKey} render={render} libraries={['places']} />
    </div>
  );
}