import { useLocation } from "wouter";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  MapPin, Navigation, Search, Star, 
  Gift, ArrowRight, Coffee, Smartphone, Store, Utensils
} from "lucide-react";

export default function MapSimple() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const businesses = [
    {
      id: 1,
      name: "Yakima Coffee Company",
      category: "Coffee",
      rating: 4.8,
      activeRewards: 3,
      isOpen: true,
      address: "Downtown Yakima",
      distance: "0.1 miles"
    },
    {
      id: 2,
      name: "Valley Electronics",
      category: "Electronics", 
      rating: 4.6,
      activeRewards: 2,
      isOpen: true,
      address: "Yakima Avenue",
      distance: "0.2 miles"
    },
    {
      id: 3,
      name: "Hop Nation Brewing Co",
      category: "Food",
      rating: 4.7,
      activeRewards: 4,
      isOpen: false,
      address: "Craft District",
      distance: "0.3 miles"
    },
    {
      id: 4,
      name: "Fresh Valley Market",
      category: "Food",
      rating: 4.5,
      activeRewards: 2,
      isOpen: true,
      address: "Farmers Market",
      distance: "0.2 miles"
    }
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Coffee": return Coffee;
      case "Electronics": return Smartphone;
      case "Food": return Utensils;
      default: return Store;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pb-8">
      {/* Header */}
      <div className="w-full px-4 pt-20 pb-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/')}
            className="flex items-center gap-2"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Back to Home
          </Button>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Find Businesses with Cirql Tags
        </h1>
        <p className="text-gray-600">
          Discover local businesses where you can tap Cirql tags to earn rewards and collect treasures
        </p>
      </div>

      {/* Main Content */}
      <div className="w-full px-4 max-w-4xl mx-auto space-y-6">
        {/* Interactive Map Section */}
        <Card className="bg-white shadow-xl border-0 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="h-6 w-6" />
                <div>
                  <h2 className="text-xl font-bold">Interactive Map - Yakima, WA</h2>
                  <p className="text-green-100 text-sm">
                    {businesses.length} businesses with Cirql tags nearby
                  </p>
                </div>
              </div>
              <Button variant="secondary" size="sm">
                <Navigation className="h-4 w-4 mr-2" />
                My Location
              </Button>
            </div>
          </div>
          
          {/* Interactive Map Area */}
          <div className="relative h-64 bg-gradient-to-br from-blue-100 to-green-100">
            {/* Map Background Pattern */}
            <div 
              className="absolute inset-0 opacity-30"
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
            
            {/* Business Markers on Map */}
            <div className="absolute inset-0 p-8">
              {businesses.map((business, index) => {
                const IconComponent = getCategoryIcon(business.category);
                const positions = [
                  { top: '25%', left: '30%' },
                  { top: '65%', left: '75%' }, 
                  { top: '45%', left: '20%' },
                  { top: '80%', left: '50%' }
                ];
                const pos = positions[index % positions.length];
                
                return (
                  <div
                    key={business.id}
                    className="absolute cursor-pointer group"
                    style={{ 
                      top: pos.top, 
                      left: pos.left,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    {/* Map Pin */}
                    <div className={`relative ${
                      business.isOpen 
                        ? 'bg-green-500 hover:bg-green-600' 
                        : 'bg-gray-500 hover:bg-gray-600'
                    } text-white p-3 rounded-full shadow-lg transition-all group-hover:scale-110`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    
                    {/* Business Label */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2">
                      <div className="bg-white/90 backdrop-blur-sm text-gray-900 text-xs rounded px-2 py-1 text-center whitespace-nowrap shadow-sm border">
                        <div className="font-medium">{business.name.split(' ')[0]}</div>
                        <div className="text-green-600">{business.activeRewards} rewards</div>
                      </div>
                    </div>
                    
                    {/* Hover Info */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-black text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                        {business.name} • {business.activeRewards} rewards • {business.distance}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Map Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <Button size="sm" variant="secondary" className="w-8 h-8 p-0">+</Button>
              <Button size="sm" variant="secondary" className="w-8 h-8 p-0">-</Button>
            </div>
          </div>
        </Card>

        {/* Business List */}
        <Card className="bg-white shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
            <CardTitle className="text-lg">Available Businesses</CardTitle>
          </CardHeader>
          
          <CardContent className="p-6">
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search businesses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Business List */}
            <div className="space-y-4">
              {businesses.map((business) => {
                const IconComponent = getCategoryIcon(business.category);
                return (
                  <Card key={business.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`p-3 rounded-lg ${
                            business.isOpen 
                              ? 'bg-green-100 text-green-600' 
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            <IconComponent className="h-5 w-5" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 mb-1 truncate">
                              {business.name}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2 truncate">
                              {business.category} • {business.address}
                            </p>
                            
                            <div className="flex items-center gap-4 text-sm flex-wrap">
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500" fill="currentColor" />
                                <span className="font-medium">{business.rating}</span>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <Gift className="h-4 w-4 text-green-600" />
                                <span>{business.activeRewards} rewards</span>
                              </div>
                              
                              <Badge variant={business.isOpen ? "default" : "secondary"}>
                                {business.isOpen ? "Open" : "Closed"}
                              </Badge>
                              
                              <span className="text-gray-500">{business.distance}</span>
                            </div>
                          </div>
                        </div>
                        
                        <Button variant="outline" size="sm" className="shrink-0 ml-2">
                          Visit & Tap
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Help Section */}
            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
              <h3 className="font-semibold text-gray-900 mb-2">How it works:</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p>1. Visit any business listed above</p>
                <p>2. Look for a Cirql tag (NFC sticker or QR code)</p>
                <p>3. Tap your phone to the tag to earn rewards</p>
                <p>4. Collect points, unlock levels, and get real prizes!</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col gap-3">
              <Button 
                onClick={() => setLocation('/customer')}
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
              >
                <Gift className="h-4 w-4 mr-2" />
                My Rewards
              </Button>
              <Button 
                variant="outline"
                onClick={() => setLocation('/merchant')}
                className="w-full"
              >
                <Store className="h-4 w-4 mr-2" />
                For Business Owners
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}