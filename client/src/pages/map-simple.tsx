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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 pt-20">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
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
      <div className="max-w-6xl mx-auto">
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="h-6 w-6" />
                <div>
                  <CardTitle className="text-xl">Yakima, WA</CardTitle>
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
                          
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">
                              {business.name}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
                              {business.category} • {business.address}
                            </p>
                            
                            <div className="flex items-center gap-4 text-sm">
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
                        
                        <Button variant="outline" size="sm">
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
            <div className="mt-6 flex gap-4">
              <Button 
                onClick={() => setLocation('/customer')}
                className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
              >
                <Gift className="h-4 w-4 mr-2" />
                My Rewards
              </Button>
              <Button 
                variant="outline"
                onClick={() => setLocation('/merchant')}
                className="flex-1"
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