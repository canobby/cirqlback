import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QuickTranslate } from '@/components/ui/translated-text';
import { MapPin, Star, Gift, Navigation, Phone, Globe, Coffee, Smartphone, Utensils, Store } from 'lucide-react';

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

export default function SimpleMapComponent() {
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

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

  const getIcon = (category: string) => {
    switch (category) {
      case "Coffee Shop": return Coffee;
      case "Electronics": return Smartphone;
      case "Restaurant": return Utensils;
      case "Grocery": return Store;
      default: return Store;
    }
  };

  return (
    <div className="space-y-4">
      {/* Interactive Map Simulation */}
      <Card className="mb-6 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-green-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Yakima, WA Interactive Map
              </CardTitle>
              <p className="text-blue-100 text-sm">{businesses.length} businesses with active rewards</p>
            </div>
            <Badge className="bg-white/20 text-white border-white/30">Live Updates</Badge>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="h-96 bg-gray-100 relative overflow-hidden">
            {/* Realistic Map Background */}
            <div className="absolute inset-0 w-full h-full">
              {/* Street Lines */}
              <svg className="absolute inset-0 w-full h-full">
                {/* Main Streets */}
                <path d="M0,120 Q200,110 400,120 Q600,130 800,120" stroke="#E5E7EB" strokeWidth="8" fill="none" />
                <path d="M0,200 Q200,190 400,200 Q600,210 800,200" stroke="#E5E7EB" strokeWidth="6" fill="none" />
                <path d="M0,280 Q200,270 400,280 Q600,290 800,280" stroke="#E5E7EB" strokeWidth="6" fill="none" />
                
                {/* Cross Streets */}
                <path d="M150,0 L160,400" stroke="#F3F4F6" strokeWidth="4" />
                <path d="M300,0 L310,400" stroke="#F3F4F6" strokeWidth="4" />
                <path d="M450,0 L460,400" stroke="#F3F4F6" strokeWidth="4" />
                <path d="M600,0 L610,400" stroke="#F3F4F6" strokeWidth="4" />
                
                {/* Small details */}
                <circle cx="160" cy="120" r="2" fill="#D1D5DB" />
                <circle cx="310" cy="200" r="2" fill="#D1D5DB" />
                <circle cx="460" cy="280" r="2" fill="#D1D5DB" />
              </svg>
              
              {/* Building blocks */}
              <div className="absolute top-4 left-4 w-12 h-8 bg-gray-200 rounded opacity-60"></div>
              <div className="absolute top-16 left-20 w-16 h-12 bg-gray-300 rounded opacity-60"></div>
              <div className="absolute top-6 right-12 w-10 h-10 bg-gray-200 rounded opacity-60"></div>
              <div className="absolute bottom-16 left-8 w-14 h-10 bg-gray-300 rounded opacity-60"></div>
              <div className="absolute bottom-8 right-20 w-12 h-12 bg-gray-200 rounded opacity-60"></div>
            </div>
            
            {/* Business Markers - Interactive */}
            {businesses.map((business, index) => {
              const IconComponent = getIcon(business.category);
              const positions = [
                { x: 18, y: 31 }, // Coffee shop - near intersection
                { x: 62, y: 47 }, // Electronics - main street
                { x: 38, y: 72 }, // Restaurant - corner location
                { x: 77, y: 23 }  // Grocery - street side
              ];
              const pos = positions[index] || { x: 50, y: 50 };
              
              return (
                <div
                  key={business.id}
                  className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`
                  }}
                  onClick={() => setSelectedBusiness(selectedBusiness?.id === business.id ? null : business)}
                >
                  {/* Interactive Business Marker */}
                  <div className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${
                    selectedBusiness?.id === business.id ? 'scale-125' : ''
                  } ${
                    business.isOpen 
                      ? 'bg-green-500 hover:bg-green-600' 
                      : 'bg-gray-400 hover:bg-gray-500'
                  } text-white cursor-pointer`}>
                    <IconComponent className="h-7 w-7" />
                  </div>
                  
                  {/* Reward Count Badge */}
                  <div className="absolute -top-3 -right-3 w-7 h-7 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {business.rewards}
                  </div>
                  
                  {/* Interactive Info Popup */}
                  {selectedBusiness?.id === business.id && (
                    <div className="absolute bottom-full mb-4 left-1/2 transform -translate-x-1/2 z-20">
                      <div className="bg-white rounded-lg shadow-xl p-4 min-w-72 border max-w-sm">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-lg text-gray-900">{business.name}</h3>
                            <p className="text-gray-600 text-sm">{business.category}</p>
                          </div>
                          <Badge 
                            className={business.isOpen 
                              ? "bg-green-100 text-green-700 border-green-200" 
                              : "bg-red-100 text-red-700 border-red-200"
                            }
                          >
                            <QuickTranslate text={business.isOpen ? "Open" : "Closed"} />
                          </Badge>
                        </div>

                        <div className="flex items-center mb-3">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                          <span className="text-sm font-medium">{business.rating}</span>
                          <span className="text-gray-500 text-sm ml-2">•</span>
                          <Gift className="h-4 w-4 text-purple-500 ml-2 mr-1" />
                          <span className="text-sm text-purple-700">
                            {business.rewards} <QuickTranslate text={business.rewards === 1 ? "reward available" : "rewards available"} />
                          </span>
                        </div>

                        <p className="text-gray-700 text-sm mb-3">{business.description}</p>

                        <div className="space-y-2">
                          <p className="text-gray-600 text-sm flex items-center">
                            <MapPin className="h-4 w-4 mr-2" />
                            {business.address}
                          </p>
                          
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleDirections(business)}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Navigation className="h-4 w-4 mr-2" />
                              Directions
                            </Button>
                            
                            {business.phone && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCall(business.phone!)}
                              >
                                <Phone className="h-4 w-4 mr-2" />
                                Call
                              </Button>
                            )}
                            
                            {business.website && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleWebsite(business.website!)}
                              >
                                <Globe className="h-4 w-4 mr-2" />
                                Website
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Popup Arrow */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-8 border-transparent border-t-white"></div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* User Location - You Are Here */}
            <div className="absolute bottom-6 left-6">
              <div className="flex items-center space-x-2 bg-white rounded-lg px-3 py-2 shadow-lg border">
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-gray-700">
                  <QuickTranslate text="You are here" />
                </span>
              </div>
            </div>
            
            {/* Map Controls */}
            <div className="absolute top-4 right-4 space-y-2">
              <Button size="sm" variant="outline" className="bg-white/80">+</Button>
              <Button size="sm" variant="outline" className="bg-white/80">-</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Listing with Interactive Features */}
      <div className="grid gap-4">
        <h2 className="text-xl font-bold text-gray-900">
          <QuickTranslate text="Nearby Businesses" />
        </h2>
        
        {businesses.map((business) => {
          const IconComponent = getIcon(business.category);
          return (
            <Card key={business.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedBusiness(selectedBusiness?.id === business.id ? null : business)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center
                      ${business.isOpen ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}
                    `}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    
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
          );
        })}
      </div>
    </div>
  );
}