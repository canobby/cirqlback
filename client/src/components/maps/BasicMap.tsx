import React from 'react';

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

interface BasicMapProps {
  businesses: Business[];
  userLocation?: { lat: number; lng: number } | null;
  onBusinessSelect?: (business: Business) => void;
  className?: string;
}

export default function BasicMap({ 
  businesses, 
  userLocation, 
  onBusinessSelect,
  className = ""
}: BasicMapProps) {
  const center = userLocation || { lat: 46.6021, lng: -120.5059 };
  
  // Create a static Google Maps embed instead of the complex JavaScript API
  const embedUrl = `https://www.google.com/maps/embed/v1/view?key=AIzaSyDmqF9ANwhBYXko3uP_NMj-bShFim5iHY0&center=${center.lat},${center.lng}&zoom=14`;

  return (
    <div className={className}>
      <div className="relative w-full h-full min-h-[300px] rounded-lg overflow-hidden">
        {/* Static Google Maps Embed */}
        <iframe
          src={embedUrl}
          width="100%"
          height="100%"
          style={{ border: 0, minHeight: '300px' }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        
        {/* Overlay with business information */}
        <div className="absolute top-4 left-4 right-4 z-10">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Nearby Businesses</h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {businesses.slice(0, 3).map((business) => (
                <div
                  key={business.id}
                  className="flex items-center justify-between text-sm cursor-pointer hover:bg-gray-50 p-2 rounded"
                  onClick={() => onBusinessSelect && onBusinessSelect(business)}
                >
                  <div>
                    <div className="font-medium">{business.name}</div>
                    <div className="text-gray-500">{business.category} • {business.activeRewards} rewards</div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${business.isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
                </div>
              ))}
            </div>
            {businesses.length > 3 && (
              <div className="text-xs text-gray-500 mt-2">
                +{businesses.length - 3} more businesses nearby
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}