import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

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

interface MinimalMapProps {
  businesses: Business[];
  userLocation?: { lat: number; lng: number } | null;
  onBusinessSelect?: (business: Business) => void;
  className?: string;
}

export default function MinimalGoogleMap({ 
  businesses, 
  userLocation, 
  onBusinessSelect,
  className = ""
}: MinimalMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const initMap = async () => {
      try {
        // Fetch API key
        const response = await fetch('/api/maps/config');
        const config = await response.json();
        
        if (!isMounted) return;
        
        // Load Google Maps script
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${config.apiKey}&callback=initGoogleMap`;
        script.async = true;
        script.defer = true;
        
        (window as any).initGoogleMap = () => {
          if (!isMounted || !mapRef.current) return;
          
          const center = userLocation || { lat: 46.6021, lng: -120.5059 };
          
          const map = new (window as any).google.maps.Map(mapRef.current, {
            zoom: 14,
            center: center,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });

          // Add markers
          businesses.forEach((business) => {
            if (business.lat && business.lng) {
              const marker = new (window as any).google.maps.Marker({
                position: { lat: business.lat, lng: business.lng },
                map: map,
                title: business.name,
              });

              const infoWindow = new (window as any).google.maps.InfoWindow({
                content: `
                  <div style="padding: 12px;">
                    <h3 style="margin: 0 0 8px 0;">${business.name}</h3>
                    <p style="margin: 0; color: #666;">${business.category}</p>
                    <p style="margin: 4px 0 0 0; font-weight: bold;">
                      ${business.activeRewards} rewards available
                    </p>
                  </div>
                `
              });

              marker.addListener('click', () => {
                infoWindow.open(map, marker);
                if (onBusinessSelect) {
                  onBusinessSelect(business);
                }
              });
            }
          });

          setIsLoaded(true);
        };
        
        document.head.appendChild(script);
        
      } catch (err) {
        if (isMounted) {
          setError('Failed to load map');
          console.error('Map loading error:', err);
        }
      }
    };

    initMap();
    
    return () => {
      isMounted = false;
    };
  }, [businesses, userLocation, onBusinessSelect]);

  if (error) {
    return (
      <div className={`w-full h-full min-h-[300px] bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center">
          <p className="text-gray-600">Map unavailable</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`w-full h-full min-h-[300px] bg-gradient-to-br from-blue-50 to-green-50 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Loading Map</p>
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