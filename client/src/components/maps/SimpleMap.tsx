import React from 'react';
import { MapPin, Star, Clock, Gift } from 'lucide-react';

interface Business {
  id: number;
  name: string;
  category: string;
  rating: number;
  activeRewards: number;
  isOpen: boolean;
  address: string;
}

interface SimpleMapProps {
  businesses: Business[];
  userLocation?: { lat: number; lng: number } | null;
  onBusinessSelect?: (business: Business) => void;
  className?: string;
}

export default function SimpleMap({ 
  businesses, 
  userLocation, 
  onBusinessSelect,
  className = ""
}: SimpleMapProps) {
  
  return (
    <div className={`${className} relative bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg overflow-hidden`}>
      {/* Map Background Pattern */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, #10b981 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, #3b82f6 0%, transparent 50%),
            linear-gradient(90deg, #f3f4f6 50%, transparent 50%),
            linear-gradient(#f3f4f6 50%, transparent 50%)
          `,
          backgroundSize: '40px 40px, 40px 40px, 20px 20px, 20px 20px'
        }}
      />
      
      {/* Central Map Area */}
      <div className="relative h-full flex flex-col">
        {/* Header */}
        <div className="p-4 bg-white/80 backdrop-blur-sm border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-gray-900">
                {userLocation ? 'Your Area' : 'Yakima, WA'}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {businesses.length} businesses nearby
            </div>
          </div>
        </div>
        
        {/* Business Grid */}
        <div className="flex-1 p-4">
          <div className="grid grid-cols-1 gap-3 h-full">
            {businesses.slice(0, 4).map((business, index) => (
              <div
                key={business.id}
                className="bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer border border-gray-200/50"
                onClick={() => onBusinessSelect && onBusinessSelect(business)}
                style={{
                  transform: `translateX(${index % 2 === 0 ? '0' : '10px'}) translateY(${index * 5}px)`
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm">{business.name}</h3>
                    <p className="text-xs text-gray-600 mb-2">{business.category}</p>
                    
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500" fill="currentColor" />
                        <span className="text-gray-700">{business.rating}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Gift className="h-3 w-3 text-green-600" />
                        <span className="text-gray-700">{business.activeRewards} rewards</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gray-500" />
                        <span className={`font-medium ${business.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                          {business.isOpen ? 'Open' : 'Closed'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Business Pin Visual */}
                  <div className="flex-shrink-0 ml-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      business.isOpen ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <MapPin className="h-4 w-4" fill="currentColor" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {businesses.length > 4 && (
              <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 text-center border border-gray-200/50">
                <p className="text-sm text-gray-600">
                  +{businesses.length - 4} more businesses in your area
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}