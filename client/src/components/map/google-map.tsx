import React, { useCallback, useState, useRef, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QuickTranslate } from '@/components/ui/translated-text';
import { MapPin, Star, Gift, Navigation, Phone, Globe } from 'lucide-react';

const mapContainerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '12px'
};

// Default center - Yakima, WA
const center = {
  lat: 46.6021,
  lng: -120.5059
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: true,
  mapTypeControl: true,
  fullscreenControl: true,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'on' }]
    }
  ]
};

interface Business {
  id: number;
  name: string;
  category: string;
  rating: number;
  rewards: number;
  isOpen: boolean;
  distance: string;
  lat: number;
  lng: number;
  address: string;
  phone?: string;
  website?: string;
  description: string;
}

const businesses: Business[] = [
  {
    id: 1,
    name: "Yakima Coffee Company",
    category: "Coffee Shop",
    rating: 4.8,
    rewards: 3,
    isOpen: true,
    distance: "0.1 mi",
    lat: 46.6031,
    lng: -120.5049,
    address: "123 Main St, Yakima, WA",
    phone: "(509) 555-0123",
    website: "yakimacoffee.com",
    description: "Premium locally roasted coffee and fresh pastries"
  },
  {
    id: 2,
    name: "Valley Electronics",
    category: "Electronics",
    rating: 4.6,
    rewards: 2,
    isOpen: true,
    distance: "0.2 mi",
    lat: 46.6011,
    lng: -120.5029,
    address: "456 Valley Rd, Yakima, WA",
    phone: "(509) 555-0456",
    description: "Latest gadgets and tech accessories"
  },
  {
    id: 3,
    name: "Hop Nation Brewing",
    category: "Restaurant",
    rating: 4.7,
    rewards: 4,
    isOpen: false,
    distance: "0.3 mi",
    lat: 46.5991,
    lng: -120.5079,
    address: "789 Brewery Ave, Yakima, WA",
    phone: "(509) 555-0789",
    website: "hopnation.com",
    description: "Craft brewery with local ingredients and live music"
  },
  {
    id: 4,
    name: "Fresh Market",
    category: "Grocery",
    rating: 4.5,
    rewards: 5,
    isOpen: true,
    distance: "0.5 mi",
    lat: 46.6051,
    lng: -120.5009,
    address: "321 Market St, Yakima, WA",
    phone: "(509) 555-0321",
    description: "Organic produce and local specialty items"
  }
];

export default function GoogleMapComponent() {
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          // Fallback to Yakima if geolocation fails
          setUserLocation(center);
        }
      );
    } else {
      setUserLocation(center);
    }
  }, []);

  const handleDirections = (business: Business) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${business.lat},${business.lng}&destination_place_id=${business.name}`;
    window.open(url, '_blank');
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleWebsite = (website: string) => {
    window.open(`https://${website}`, '_blank');
  };

  const getMarkerIcon = (category: string, isOpen: boolean) => {
    const color = isOpen ? '#10B981' : '#EF4444'; // Green if open, red if closed
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: color,
      fillOpacity: 1,
      strokeWeight: 2,
      strokeColor: '#FFFFFF'
    };
  };

  // Access the Google Maps API key from environment
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBHLett8djBo62dDXj0EjCpF92A_SWMnwI';

  return (
    <div className="space-y-4">
      <LoadScript
        googleMapsApiKey={apiKey}
        loadingElement={
          <div className="h-[500px] bg-gray-100 rounded-xl flex items-center justify-center">
            <div className="text-gray-500">Loading map...</div>
          </div>
        }
      >
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={userLocation || center}
          zoom={15}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={mapOptions}
        >
          {/* User location marker */}
          {userLocation && (
            <Marker
              position={userLocation}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 6,
                fillColor: '#3B82F6',
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: '#FFFFFF'
              }}
              title="Your Location"
            />
          )}

          {/* Business markers */}
          {businesses.map((business) => (
            <Marker
              key={business.id}
              position={{ lat: business.lat, lng: business.lng }}
              icon={getMarkerIcon(business.category, business.isOpen)}
              onClick={() => setSelectedBusiness(business)}
              title={business.name}
            />
          ))}

          {/* Info Window for selected business */}
          {selectedBusiness && (
            <InfoWindow
              position={{ lat: selectedBusiness.lat, lng: selectedBusiness.lng }}
              onCloseClick={() => setSelectedBusiness(null)}
            >
              <div className="max-w-sm p-2">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{selectedBusiness.name}</h3>
                    <p className="text-gray-600 text-sm">{selectedBusiness.category}</p>
                  </div>
                  <Badge 
                    className={selectedBusiness.isOpen 
                      ? "bg-green-100 text-green-700 border-green-200" 
                      : "bg-red-100 text-red-700 border-red-200"
                    }
                  >
                    <QuickTranslate text={selectedBusiness.isOpen ? "Open" : "Closed"} />
                  </Badge>
                </div>

                <div className="flex items-center mb-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                  <span className="text-sm font-medium">{selectedBusiness.rating}</span>
                  <span className="text-gray-500 text-sm ml-2">•</span>
                  <Gift className="h-4 w-4 text-purple-500 ml-2 mr-1" />
                  <span className="text-sm text-purple-700">
                    {selectedBusiness.rewards} <QuickTranslate text={selectedBusiness.rewards === 1 ? "reward available" : "rewards available"} />
                  </span>
                </div>

                <p className="text-gray-700 text-sm mb-3">{selectedBusiness.description}</p>

                <div className="space-y-2">
                  <p className="text-gray-600 text-sm flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    {selectedBusiness.address}
                  </p>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleDirections(selectedBusiness)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Directions
                    </Button>
                    
                    {selectedBusiness.phone && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCall(selectedBusiness.phone!)}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Call
                      </Button>
                    )}
                    
                    {selectedBusiness.website && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleWebsite(selectedBusiness.website!)}
                      >
                        <Globe className="h-4 w-4 mr-2" />
                        Website
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </LoadScript>

      {/* Business List */}
      <div className="grid gap-4 mt-6">
        {businesses.map((business) => (
          <Card key={business.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedBusiness(business);
                  if (mapRef.current) {
                    mapRef.current.panTo({ lat: business.lat, lng: business.lng });
                    mapRef.current.setZoom(17);
                  }
                }}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900">{business.name}</h3>
                  <p className="text-gray-600 mb-1">{business.category} • {business.distance}</p>
                  <p className="text-gray-500 text-sm mb-2">{business.address}</p>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                      <span className="font-medium">{business.rating}</span>
                    </div>
                    
                    <Badge 
                      className={business.isOpen 
                        ? "bg-green-100 text-green-700 border-green-200" 
                        : "bg-red-100 text-red-700 border-red-200"
                      }
                    >
                      <QuickTranslate text={business.isOpen ? "Open" : "Closed"} />
                    </Badge>
                    
                    <div className="flex items-center">
                      <Gift className="h-4 w-4 text-purple-500 mr-1" />
                      <span className="text-purple-700 font-medium">
                        {business.rewards} <QuickTranslate text={business.rewards === 1 ? "reward available" : "rewards available"} />
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="ml-4">
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDirections(business);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Directions
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}