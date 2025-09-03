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

        {/* Interactive Map Section */}
        <div className="mb-6 bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Map Header Bar */}
          <div className="bg-white border-b border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Yakima, WA</h2>
                  <p className="text-sm text-gray-600">{businesses.length} businesses with rewards</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const url = "https://www.google.com/maps/search/restaurants+near+Yakima,+WA";
                  window.open(url, '_blank');
                }}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Navigate
              </Button>
            </div>
          </div>
          
          {/* Full-Width Interactive Map */}
          <div className="relative h-80 bg-gray-100">
            <iframe
              className="w-full h-full"
              src="https://www.google.com/maps/embed?pb=!1m16!1m12!1m3!1d11793.22!2d-120.5059!3d46.6021!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!2m1!1srestaurants%20coffee%20shops%20electronics%20stores%20Yakima%20WA!5e0!3m2!1sen!2sus!4v1623456789000!5m2!1sen!2sus"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Yakima Area Business Map"
            ></iframe>
            
            {/* Quick Action Buttons */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <Button 
                size="sm" 
                className="bg-white text-gray-900 hover:bg-gray-50 shadow-md border"
                onClick={() => {
                  const url = "https://www.google.com/maps/dir//Yakima,+WA";
                  window.open(url, '_blank');
                }}
              >
                <Navigation className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                className="bg-white text-gray-900 hover:bg-gray-50 shadow-md border"
                onClick={() => {
                  const url = "https://www.google.com/maps/search/restaurants+near+Yakima,+WA";
                  window.open(url, '_blank');
                }}
              >
                <Store className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Business Quick Access */}
          <div className="p-4 bg-gray-50">
            <h4 className="text-sm font-medium text-gray-700 mb-3">📍 Map shows Yakima area - click businesses below for directions and rewards:</h4>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {businesses.map((business, index) => {
                const IconComponent = getIcon(business.category);
                const markerColors = ['red', 'blue', 'green'];
                const markerLabels = ['C', 'E', 'B'];
                return (
                  <div 
                    key={business.id} 
                    className="flex-shrink-0 bg-white rounded-lg p-3 shadow-sm border cursor-pointer hover:shadow-md transition-all"
                    onClick={() => {
                      const url = `https://www.google.com/maps/search/?api=1&query=${business.name}+Yakima+WA`;
                      window.open(url, '_blank');
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative">
                        <div className={`p-2 rounded-lg ${
                          business.isOpen ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-xs flex items-center justify-center font-bold ${
                          markerColors[index] === 'red' ? 'bg-red-500' : 
                          markerColors[index] === 'blue' ? 'bg-blue-500' : 'bg-green-500'
                        }`}>
                          {markerLabels[index]}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{business.name}</p>
                        <p className="text-xs text-green-600">{business.rewards} rewards • {business.distance}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Navigation Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <Button 
            onClick={() => setLocation('/customer')}
            className="h-16 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
          >
            <div className="flex items-center gap-3">
              <Gift className="h-6 w-6" />
              <div className="text-left">
                <div className="font-semibold"><QuickTranslate text="View My Rewards" /></div>
                <div className="text-sm opacity-90">Check points & earnings</div>
              </div>
            </div>
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => setLocation('/merchant')}
            className="h-16 border-2 hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <Store className="h-6 w-6" />
              <div className="text-left">
                <div className="font-semibold"><QuickTranslate text="Business Owner? Get Started" /></div>
                <div className="text-sm text-gray-600">Set up rewards program</div>
              </div>
            </div>
          </Button>
        </div>
        
        {/* Detailed Business Info */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Nearby Businesses</h3>
          <div className="space-y-3">
            {businesses.map((business) => {
              const IconComponent = getIcon(business.category);
              return (
                <div 
                  key={business.id} 
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                  onClick={() => {
                    const url = `https://www.google.com/maps/search/?api=1&query=${business.name}+Yakima+WA`;
                    window.open(url, '_blank');
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      business.isOpen ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{business.name}</p>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500" fill="currentColor" />
                          {business.rating}
                        </span>
                        <span className="flex items-center gap-1">
                          <Gift className="h-3 w-3 text-green-600" />
                          {business.rewards} rewards
                        </span>
                        <span>{business.distance}</span>
                        <Badge 
                          variant={business.isOpen ? "default" : "secondary"}
                          className="text-xs"
                        >
                          <QuickTranslate text={business.isOpen ? "Open" : "Closed"} />
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Navigation className="h-4 w-4 text-gray-400" />
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}