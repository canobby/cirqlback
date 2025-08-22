import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuickTranslate } from "@/components/ui/translated-text";
import { 
  MapPin, ArrowRight, Coffee, Smartphone, Store, Utensils, Star, Gift
} from "lucide-react";

export default function MapTest() {
  const [, setLocation] = useLocation();

  const businesses = [
    {
      id: 1,
      name: "Yakima Coffee Company",
      category: "Coffee",
      rating: 4.8,
      rewards: 3,
      isOpen: true,
      distance: "0.1 mi",
      position: { x: 20, y: 30 }
    },
    {
      id: 2,
      name: "Valley Electronics",
      category: "Electronics", 
      rating: 4.6,
      rewards: 2,
      isOpen: true,
      distance: "0.2 mi",
      position: { x: 60, y: 45 }
    },
    {
      id: 3,
      name: "Hop Nation Brewing",
      category: "Food",
      rating: 4.7,
      rewards: 4,
      isOpen: false,
      distance: "0.3 mi",
      position: { x: 40, y: 70 }
    },
    {
      id: 4,
      name: "Fresh Market",
      category: "Food",
      rating: 4.5,
      rewards: 5,
      isOpen: true,
      distance: "0.5 mi",
      position: { x: 75, y: 25 }
    }
  ];

  const getIcon = (category: string) => {
    switch (category) {
      case "Coffee": return Coffee;
      case "Electronics": return Smartphone;
      case "Food": return Utensils;
      default: return Store;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-8">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/')}
            className="mb-4"
          >
            <ArrowRight className="h-4 w-4 rotate-180 mr-2" />
            <QuickTranslate text="Back to Home" />
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            <QuickTranslate text="Discover Local Businesses" />
          </h1>
          <p className="text-gray-600">
            <QuickTranslate text="Tap Cirql tags to earn rewards and discover amazing local spots in Yakima, WA" />
          </p>
        </div>

        {/* Interactive Map */}
        <Card className="mb-6 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-green-500 text-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Yakima, WA Area Map
                </CardTitle>
                <p className="text-blue-100 text-sm">{businesses.length} businesses with active rewards</p>
              </div>
              <Badge className="bg-white/20 text-white border-white/30">Live Updates</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="h-80 bg-gradient-to-br from-blue-50 to-green-50 relative overflow-hidden">
              {/* Street Grid Background */}
              <svg className="absolute inset-0 w-full h-full opacity-20">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#94a3b8" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
              
              {/* Business Markers */}
              {businesses.map((business) => {
                const IconComponent = getIcon(business.category);
                return (
                  <div
                    key={business.id}
                    className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group"
                    style={{
                      left: `${business.position.x}%`,
                      top: `${business.position.y}%`
                    }}
                  >
                    {/* Business Marker */}
                    <div className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${
                      business.isOpen 
                        ? 'bg-green-500 hover:bg-green-600' 
                        : 'bg-gray-400 hover:bg-gray-500'
                    } text-white`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    
                    {/* Reward Count Badge */}
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {business.rewards}
                    </div>
                    
                    {/* Hover Tooltip */}
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {business.name}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
                    </div>
                  </div>
                );
              })}
              
              {/* User Location */}
              <div className="absolute bottom-4 left-4">
                <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse shadow-lg"></div>
                <div className="text-xs text-gray-600 mt-1">You are here</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {businesses.map((business) => {
            const IconComponent = getIcon(business.category);
            return (
              <Card key={business.id} className="hover:shadow-lg transition-all duration-300 cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${
                        business.isOpen 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        <IconComponent className="h-6 w-6" />
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {business.name}
                        </h3>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500" fill="currentColor" />
                            <span>{business.rating}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Gift className="h-4 w-4 text-orange-600" />
                            <span>{business.rewards} rewards</span>
                          </div>
                          
                          <Badge variant={business.isOpen ? "default" : "secondary"} className="text-xs">
                            {business.isOpen ? "Open" : "Closed"}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-500 text-sm mt-1">{business.distance} away</p>
                      </div>
                    </div>
                    
                    <Button size="sm" disabled={!business.isOpen}>
                      {business.isOpen ? "Visit Now" : "Closed"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={() => setLocation('/customer')}
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
          >
            <Gift className="h-4 w-4 mr-2" />
            View My Rewards
          </Button>
          <Button 
            variant="outline"
            onClick={() => setLocation('/merchant')}
          >
            <Store className="h-4 w-4 mr-2" />
            Business Owner?
          </Button>
          <Button 
            variant="outline"
            onClick={() => setLocation('/nfc-setup-wizard')}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Setup NFC Tags
          </Button>
        </div>

      </div>
    </div>
  );
}