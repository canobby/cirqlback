import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';

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

interface WorkingGoogleMapProps {
  businesses: Business[];
  userLocation?: { lat: number; lng: number } | null;
  onBusinessSelect?: (business: Business) => void;
  className?: string;
}

export default function WorkingGoogleMap({ 
  businesses, 
  userLocation, 
  onBusinessSelect,
  className = ""
}: WorkingGoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');

  // Fetch API key
  useEffect(() => {
    fetch('/api/maps/config')
      .then(res => res.json())
      .then(data => {
        setApiKey(data.apiKey);
        loadGoogleMapsScript(data.apiKey);
      })
      .catch(err => console.error('Failed to fetch maps config:', err));
  }, []);

  const loadGoogleMapsScript = (key: string) => {
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      initializeMap();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsLoaded(true);
      initializeMap();
    };
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
    };
    document.head.appendChild(script);
  };

  const initializeMap = () => {
    if (!mapRef.current || !window.google) return;

    const center = userLocation || { lat: 46.6021, lng: -120.5059 };
    
    googleMapRef.current = new window.google.maps.Map(mapRef.current, {
      zoom: 14,
      center: center,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      gestureHandling: 'greedy',
      styles: [
        {
          featureType: "poi.business",
          stylers: [{ visibility: "off" }]
        }
      ]
    });

    updateMarkers();
  };

  const updateMarkers = () => {
    if (!googleMapRef.current || !window.google) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add user location marker
    if (userLocation) {
      const userMarker = new window.google.maps.Marker({
        position: userLocation,
        map: googleMapRef.current,
        title: "Your Location",
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="8" fill="#3B82F6" stroke="white" stroke-width="2"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(24, 24),
          anchor: new window.google.maps.Point(12, 12)
        }
      });
      markersRef.current.push(userMarker);
    }

    // Add business markers
    businesses.forEach((business) => {
      if (business.lat && business.lng) {
        const marker = new window.google.maps.Marker({
          position: { lat: business.lat, lng: business.lng },
          map: googleMapRef.current,
          title: business.name,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="12" fill="${business.isOpen ? '#10B981' : '#EF4444'}" stroke="white" stroke-width="2"/>
                <text x="16" y="20" font-family="Arial" font-size="12" font-weight="bold" text-anchor="middle" fill="white">${business.activeRewards}</text>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(32, 32),
            anchor: new window.google.maps.Point(16, 16)
          }
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 16px; min-width: 280px; font-family: system-ui, -apple-system, sans-serif;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">${business.name}</h3>
                <span style="background: ${business.isOpen ? '#10B981' : '#EF4444'}; color: white; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 500; white-space: nowrap;">
                  ${business.isOpen ? 'Open' : 'Closed'}
                </span>
              </div>
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; color: #6B7280; font-size: 14px;">
                <span>${business.category}</span>
                <span style="display: flex; align-items: center; gap: 4px;">
                  <span style="color: #F59E0B;">★</span>
                  <span style="color: #374151; font-weight: 600;">${business.rating}</span>
                </span>
              </div>
              <div style="color: #6B7280; font-size: 14px; margin-bottom: 16px;">${business.address}</div>
              <div style="background: linear-gradient(135deg, #3B82F6, #1E40AF); color: white; padding: 8px 12px; border-radius: 8px; font-size: 14px; font-weight: 600; text-align: center; margin-bottom: 12px;">
                🎁 ${business.activeRewards} Active Rewards Available
              </div>
              <div style="text-align: center;">
                <button onclick="window.selectBusiness(${business.id})" style="background: linear-gradient(135deg, #10B981, #059669); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; width: 100%;">
                  View Details & Rewards
                </button>
              </div>
            </div>
          `
        });

        marker.addListener('click', () => {
          // Close any open info windows
          markersRef.current.forEach(m => {
            if (m.infoWindow) m.infoWindow.close();
          });
          
          infoWindow.open(googleMapRef.current, marker);
          
          if (onBusinessSelect) {
            onBusinessSelect(business);
          }
        });

        marker.infoWindow = infoWindow;
        markersRef.current.push(marker);
      }
    });

    // Set up global callback for info window buttons
    (window as any).selectBusiness = (businessId: number) => {
      const business = businesses.find(b => b.id === businessId);
      if (business && onBusinessSelect) {
        onBusinessSelect(business);
      }
    };
  };

  // Update markers when businesses change
  useEffect(() => {
    if (isLoaded && googleMapRef.current) {
      updateMarkers();
    }
  }, [businesses, userLocation, isLoaded]);

  if (!isLoaded || !apiKey) {
    return (
      <div className={`w-full h-full min-h-[300px] bg-gradient-to-br from-blue-50 to-green-50 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Loading Interactive Map</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div ref={mapRef} className="w-full h-full min-h-[300px] rounded-lg" />
    </div>
  );
}