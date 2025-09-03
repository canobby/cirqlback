import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuickTranslate } from "@/components/ui/translated-text";
import { 
  MapPin, ArrowRight, Coffee, Smartphone, Store, Utensils, Star, Gift, Navigation
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
            <QuickTranslate text="Back to Home" />
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            <QuickTranslate text="Discover Local Businesses" />
          </h1>
          <p className="text-gray-600">
            <QuickTranslate text="Tap Cirql tags to earn rewards and discover amazing local spots in Yakima, WA" />
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
                <p className="text-blue-100 text-sm">{businesses.length} <QuickTranslate text="businesses nearby with active rewards" /></p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="h-96 bg-gradient-to-br from-blue-50 to-green-50 relative">
              {/* Interactive Map Display */}
              <iframe
                className="w-full h-full rounded-b-lg"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d47327.77!2d-120.5059!3d46.6021!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x549691a71f0f7e25%3A0x7df0d9e4e9c87b8c!2sYakima%2C%20WA!5e0!3m2!1sen!2sus!4v1623456789000!5m2!1sen!2sus"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Yakima Area Business Map"
              ></iframe>
              
              {/* Business Markers Overlay */}
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Active Businesses</span>
                </div>
                <div className="space-y-1">
                  {businesses.map((business) => (
                    <div key={business.id} className="flex items-center gap-2 text-xs">
                      <div className={`w-2 h-2 rounded-full ${business.isOpen ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span className="truncate">{business.name}</span>
                      <span className="text-green-600">{business.rewards}🎁</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Map Controls */}
              <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                <Button 
                  size="sm" 
                  className="bg-white/90 text-gray-900 hover:bg-white shadow-lg"
                  onClick={() => {
                    const url = "https://www.google.com/maps/search/restaurants+near+Yakima,+WA";
                    window.open(url, '_blank');
                  }}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  <QuickTranslate text="Open Full Map" />
                </Button>
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
                            <QuickTranslate text={business.isOpen ? "Open" : "Closed"} />
                          </Badge>
                          
                          <span className="text-gray-500">{business.distance}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Button size="sm" onClick={() => {
                      const url = `https://www.google.com/maps/search/?api=1&query=${business.name}+Yakima+WA`;
                      window.open(url, '_blank');
                    }}>
                      <Navigation className="h-4 w-4 mr-2" />
                      <QuickTranslate text="Directions" />
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
            <QuickTranslate text="View My Rewards" />
          </Button>
          <Button 
            variant="outline"
            onClick={() => setLocation('/merchant')}
            className="w-full"
          >
            <Store className="h-4 w-4 mr-2" />
            <QuickTranslate text="Business Owner? Get Started" />
          </Button>
        </div>

      </div>
    </div>
  );
}