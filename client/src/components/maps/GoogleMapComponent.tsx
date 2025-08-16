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

    // Create info window with business details and interactive buttons  
    const createInfoWindow = (business: Business) => {
      const businessId = business.id;
      return `
        <div style="padding: 16px; min-width: 300px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.4;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
            <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #1f2937;">${business.name}</h3>
            <span style="background: ${business.isOpen ? '#10b981' : '#ef4444'}; color: white; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500;">
              ${business.isOpen ? 'Open' : 'Closed'}
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <span style="color: #6b7280; font-size: 14px;">${business.category}</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="color: #f59e0b; font-size: 16px;">★</span>
              <span style="color: #374151; font-weight: 600;">${business.rating}</span>
            </div>
          </div>
          <div style="color: #6b7280; font-size: 14px; margin-bottom: 16px;">${business.address}</div>
          <div style="margin-bottom: 16px;">
            <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
              <svg style="width: 14px; height: 14px;" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
              ${business.activeRewards} Active Rewards
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button onclick="window.viewBusiness && window.viewBusiness(${businessId})" style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; flex: 1;">
              View Details
            </button>
            <button onclick="window.tapNFC && window.tapNFC(${businessId})" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; border: none; padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; flex: 1;">
              Tap & Earn
            </button>
          </div>
        </div>
      `;
    };

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

        // Create info window with interactive content
        const infoWindow = new window.google.maps.InfoWindow({
          content: createInfoWindow(business),
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

// Loading component - simplified
function MapLoadingComponent() {
  return (
    <div className="w-full h-full min-h-[400px] bg-gradient-to-br from-blue-50 to-green-50 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Loading Map</p>
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
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

export default function GoogleMapWrapper({ 
  businesses, 
  userLocation, 
  onBusinessSelect,
  className = "",
  isFullScreen = false,
  onToggleFullScreen
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