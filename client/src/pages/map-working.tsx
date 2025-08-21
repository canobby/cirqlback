import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, ArrowRight, Coffee, Smartphone, Store, Utensils, Star, Gift
} from "lucide-react";

export default function MapWorking() {
  const [, setLocation] = useLocation();

  const businesses = [
    {
      id: 1,
      name: "Yakima Coffee Company",
      category: "Coffee",
      rating: 4.8,
      rewards: 3,
      isOpen: true,
      distance: "0.1 mi"
    },
    {
      id: 2,
      name: "Valley Electronics",
      category: "Electronics", 
      rating: 4.6,
      rewards: 2,
      isOpen: true,
      distance: "0.2 mi"
    },
    {
      id: 3,
      name: "Hop Nation Brewing",
      category: "Food",
      rating: 4.7,
      rewards: 4,
      isOpen: false,
      distance: "0.3 mi"
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
      <div className="max-w-4xl mx-auto px-4">
        
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/')}
            className="mb-4"
          >
            <ArrowRight className="h-4 w-4 rotate-180 mr-2" />
            Back to Home
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Find Local Businesses
          </h1>
          <p className="text-gray-600">
            Tap Cirql tags at these businesses to earn rewards
          </p>
        </div>

        {/* Map Visual */}
        <Card className="mb-6 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-green-500 text-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Yakima, WA Area
                </CardTitle>
                <p className="text-blue-100 text-sm">{businesses.length} businesses nearby</p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="h-48 bg-gradient-to-br from-blue-50 to-green-50 relative">
              {/* Simple map representation */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="grid grid-cols-3 gap-8 w-full max-w-md px-8">
                  {businesses.map((business, index) => {
                    const IconComponent = getIcon(business.category);
                    return (
                      <div key={business.id} className="flex flex-col items-center">
                        <div className={`p-3 rounded-full shadow-lg ${
                          business.isOpen ? 'bg-green-500' : 'bg-gray-400'
                        } text-white mb-2`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="text-xs text-center">
                          <div className="font-medium">{business.name.split(' ')[0]}</div>
                          <div className="text-green-600">{business.rewards} rewards</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business List */}
        <div className="space-y-4">
          {businesses.map((business) => {
            const IconComponent = getIcon(business.category);
            return (
              <Card key={business.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${
                        business.isOpen 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {business.name}
                        </h3>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500" fill="currentColor" />
                            <span>{business.rating}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Gift className="h-4 w-4 text-green-600" />
                            <span>{business.rewards} rewards</span>
                          </div>
                          
                          <Badge variant={business.isOpen ? "default" : "secondary"}>
                            {business.isOpen ? "Open" : "Closed"}
                          </Badge>
                          
                          <span className="text-gray-500">{business.distance}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Button size="sm">
                      Visit & Tap
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col gap-3">
          <Button 
            onClick={() => setLocation('/customer')}
            className="w-full bg-gradient-to-r from-green-600 to-blue-600"
          >
            <Gift className="h-4 w-4 mr-2" />
            View My Rewards
          </Button>
          <Button 
            variant="outline"
            onClick={() => setLocation('/merchant')}
            className="w-full"
          >
            <Store className="h-4 w-4 mr-2" />
            Business Owner? Get Started
          </Button>
        </div>

      </div>
    </div>
  );
}