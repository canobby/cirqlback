import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import GoogleMapWrapper from "@/components/maps/GoogleMapComponent";
import { 
  MapPin, Navigation, Search, Filter, Star, Clock, 
  Gift, Zap, Users, Target, ArrowRight, Heart,
  Smartphone, Coffee, Store, Utensils, Loader2, RefreshCw
} from "lucide-react";

export default function MapBento() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationPermission, setLocationPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [nearbyBusinesses, setNearbyBusinesses] = useState<any[]>([]);
  const [isMapFullScreen, setIsMapFullScreen] = useState(false);
  const { toast } = useToast();
  
  // Get user location on component mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Using Sample Area",
        description: "Showing nearby businesses around you",
        variant: "default"
      });
      setLocationPermission('denied');
      setLoadingLocation(false);
      loadMockBusinesses();
      return;
    }

    setLoadingLocation(true);
    
    // Set a maximum timeout of 8 seconds for better user experience
    const timeoutId = setTimeout(() => {
      setLocationPermission('denied');
      setLoadingLocation(false);
      loadMockBusinesses(); // This will default to Yakima, WA
      toast({
        title: "Using Yakima Area",
        description: "Showing businesses around Yakima, WA. Tap 'Refresh Location' for your exact location.",
        variant: "default"
      });
    }, 8000);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setLocationPermission('granted');
        setLoadingLocation(false);
        loadMockBusinesses(latitude, longitude);
        toast({
          title: "Location Found",
          description: "Finding nearby businesses with rewards..."
        });
      },
      (error) => {
        clearTimeout(timeoutId);
        console.error('Geolocation error:', error);
        setLocationPermission('denied');
        setLoadingLocation(false);
        loadMockBusinesses();
        
        let errorMessage = "Using default area for business discovery";
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied. Using default area.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location unavailable. Using default area.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Using default area.";
            break;
          default:
            errorMessage = "Location error. Using default area.";
            break;
        }
        
        toast({
          title: "Using Sample Area",
          description: "Showing great businesses near you! Tap 'Refresh Location' to try again.",
          variant: "default"
        });
      },
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 300000 }
    );
  };

  const loadNearbyBusinesses = async (lat: number, lng: number) => {
    // Simulate API call to find nearby businesses
    // In production, this would call your backend with the coordinates
    const mockBusinessesWithDistance = [
      {
        id: 1,
        name: "Local Coffee Roasters",
        category: "Coffee",
        lat: lat + 0.001,
        lng: lng + 0.002,
        rating: 4.8,
        activeRewards: 3,
        isOpen: true,
        gradient: "from-orange-500 to-amber-500",
        icon: Coffee,
        address: "123 Main St"
      },
      {
        id: 2,
        name: "Downtown Electronics",
        category: "Electronics",
        lat: lat - 0.002,
        lng: lng + 0.001,
        rating: 4.6,
        activeRewards: 2,
        isOpen: true,
        gradient: "from-blue-500 to-cyan-500",
        icon: Smartphone,
        address: "456 Tech Ave"
      },
      {
        id: 3,
        name: "Family Pizza House",
        category: "Food",
        lat: lat + 0.003,
        lng: lng - 0.001,
        rating: 4.7,
        activeRewards: 4,
        isOpen: false,
        gradient: "from-red-500 to-pink-500",
        icon: Utensils,
        address: "789 Food St"
      },
      {
        id: 4,
        name: "Green Smoothie Bar",
        category: "Food",
        lat: lat - 0.001,
        lng: lng - 0.002,
        rating: 4.5,
        activeRewards: 2,
        isOpen: true,
        gradient: "from-green-500 to-emerald-500",
        icon: Utensils,
        address: "321 Health Blvd"
      }
    ];

    // Calculate distances
    const businessesWithDistance = mockBusinessesWithDistance.map(business => ({
      ...business,
      distance: calculateDistance(lat, lng, business.lat, business.lng)
    })).sort((a, b) => a.distance - b.distance);

    setNearbyBusinesses(businessesWithDistance);
  };

  const loadMockBusinesses = (userLat?: number, userLng?: number) => {
    console.log('Loading mock businesses for location:', { userLat, userLng });
    
    // Use Yakima, WA coordinates if no user location provided
    const baseLat = userLat || 46.6021;
    const baseLng = userLng || -120.5059;
    
    const mockBusinesses = [
      {
        id: 1,
        name: "Yakima Coffee Company",
        category: "Coffee",
        lat: baseLat + 0.001,
        lng: baseLng + 0.002,
        distance: userLat ? calculateDistance(userLat, userLng!, baseLat + 0.001, baseLng + 0.002) : 0.2,
        rating: 4.8,
        activeRewards: 3,
        isOpen: true,
        gradient: "from-orange-500 to-amber-500",
        icon: Coffee,
        address: "Downtown Yakima"
      },
      {
        id: 2,
        name: "Valley Electronics",
        category: "Electronics",
        lat: baseLat - 0.002,
        lng: baseLng + 0.001,
        distance: userLat ? calculateDistance(userLat, userLng!, baseLat - 0.002, baseLng + 0.001) : 0.4,
        rating: 4.6,
        activeRewards: 2,
        isOpen: true,
        gradient: "from-blue-500 to-cyan-500",
        icon: Smartphone,
        address: "Yakima Avenue"
      },
      {
        id: 3,
        name: "Hop Nation Brewing Co",
        category: "Food",
        lat: baseLat + 0.003,
        lng: baseLng - 0.001,
        distance: userLat ? calculateDistance(userLat, userLng!, baseLat + 0.003, baseLng - 0.001) : 0.6,
        rating: 4.7,
        activeRewards: 4,
        isOpen: false,
        gradient: "from-red-500 to-pink-500",
        icon: Utensils,
        address: "Craft District"
      },
      {
        id: 4,
        name: "Fresh Valley Market",
        category: "Food",
        lat: baseLat - 0.001,
        lng: baseLng + 0.003,
        distance: userLat ? calculateDistance(userLat, userLng!, baseLat - 0.001, baseLng + 0.003) : 0.3,
        rating: 4.5,
        activeRewards: 2,
        isOpen: true,
        gradient: "from-green-500 to-emerald-500",
        icon: Utensils,
        address: "Farmers Market"
      }
    ];
    console.log('Setting nearby businesses:', mockBusinesses);
    setNearbyBusinesses(mockBusinesses);
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const formatDistance = (distance: number): string => {
    if (distance < 0.1) return "< 0.1 miles";
    return `${distance.toFixed(1)} miles`;
  };

  // Set location to Yakima specifically
  const setYakimaLocation = () => {
    const yakimaLat = 46.6021;
    const yakimaLng = -120.5059;
    setUserLocation({ lat: yakimaLat, lng: yakimaLng });
    setLocationPermission('granted');
    loadMockBusinesses(yakimaLat, yakimaLng);
    toast({
      title: "Location Set to Yakima",
      description: "Showing businesses around Yakima, Washington",
      variant: "default"
    });
  };

  // Interactive business functions for map info windows
  const setupBusinessInteractions = () => {
    (window as any).viewBusiness = (businessId: number) => {
      const business = nearbyBusinesses.find(b => b.id === businessId);
      if (business) {
        toast({
          title: `Viewing ${business.name}`,
          description: `${business.category} • ${business.activeRewards} rewards available`,
          variant: "default"
        });
        // Business interaction handled via console and toast
      }
    };

    (window as any).tapNFC = (businessId: number) => {
      const business = nearbyBusinesses.find(b => b.id === businessId);
      if (business) {
        toast({
          title: "NFC Tap Simulation",
          description: `Earned points from ${business.name}! Check your rewards.`,
          variant: "default"
        });
      }
    };
  };

  // Initialize with default location on component load
  useEffect(() => {
    setYakimaLocation(); // Start with Yakima location
    setupBusinessInteractions(); // Set up interactive functions
  }, [nearbyBusinesses]);

  const categories = [
    { id: "all", name: "All", icon: Store, count: nearbyBusinesses.length },
    { id: "coffee", name: "Coffee", icon: Coffee, count: nearbyBusinesses.filter(b => b.category === 'Coffee').length },
    { id: "food", name: "Food", icon: Utensils, count: nearbyBusinesses.filter(b => b.category === 'Food').length },
    { id: "tech", name: "Tech", icon: Smartphone, count: nearbyBusinesses.filter(b => b.category === 'Electronics').length }
  ];

  const filteredBusinesses = selectedCategory === 'all' 
    ? nearbyBusinesses 
    : nearbyBusinesses.filter(business => 
        business.category.toLowerCase() === selectedCategory || 
        (selectedCategory === 'tech' && business.category === 'Electronics')
      );

  console.log('Nearby businesses:', nearbyBusinesses);
  console.log('Filtered businesses:', filteredBusinesses);
  console.log('Selected category:', selectedCategory);

  return (
    <>
      {isMapFullScreen && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex-1">
            <GoogleMapWrapper
              businesses={nearbyBusinesses}
              userLocation={userLocation}
              onBusinessSelect={(business) => {
                console.log('Selected business:', business);
              }}
              className="h-full w-full"
              isFullScreen={isMapFullScreen}
              onToggleFullScreen={() => setIsMapFullScreen(false)}
            />
          </div>
          <div className="bg-white p-4 border-t">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Discovery Map - Full Screen</h3>
              <div className="flex gap-2">
                <Button 
                  onClick={getCurrentLocation}
                  variant="outline"
                  size="sm"
                  disabled={loadingLocation}
                >
                  {loadingLocation ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Navigation className="h-4 w-4 mr-2" />
                  )}
                  My Location
                </Button>
                <Button 
                  onClick={setYakimaLocation}
                  variant="outline"
                  size="sm"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Yakima
                </Button>
                <Button 
                  onClick={() => setIsMapFullScreen(false)}
                  variant="outline"
                  size="sm"
                >
                  Exit Full Screen
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/30 to-blue-50/30 dark:from-gray-950 dark:via-green-950/30 dark:to-blue-950/30">
        <div className="responsive-container max-w-7xl mx-auto py-4 sm:py-6 lg:py-8">
        
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="min-w-0 flex-1">
              <h1 className="responsive-heading font-bold bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                Discovery Map
              </h1>
              <p className="text-gray-600 dark:text-gray-400 responsive-text">
                Find local businesses with active Cirql rewards near you
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <Button 
                onClick={() => setLocation('/map')}
                variant="outline"
                size="sm"
                className="text-white"
              >
                Classic View
              </Button>
              {loadingLocation ? (
                <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Finding location...
                </Badge>
              ) : (
                <Badge className="bg-green-100 text-green-700 border-green-200">
                  <Navigation className="w-3 h-3 mr-1" />
                  {nearbyBusinesses.length} nearby
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search businesses, rewards, or categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-lg"
                />
              </div>
            </div>
            <Button className="bg-green-600 hover:bg-green-700 text-white h-12 px-6">
              <Filter className="h-4 w-4 mr-2" />
              Filter Results
            </Button>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="bento-grid auto-rows-min">
          
          {/* Interactive Map - Large Block */}
          <Card className="md:col-span-6 lg:col-span-5 bg-gradient-to-br from-green-500 to-blue-500 border-0 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-16 -translate-x-16"></div>
            <CardContent className="p-8 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Your Local Area</h2>
                  <p className="text-green-100">Live location-based discovery of nearby businesses</p>
                </div>
                <MapPin className="h-12 w-12 text-green-100" />
              </div>
              
              {/* Google Maps Integration */}
              <div className="h-64 bg-white rounded-lg overflow-hidden">
                <GoogleMapWrapper
                  businesses={nearbyBusinesses}
                  userLocation={userLocation}
                  onBusinessSelect={(business) => {
                    console.log('Selected business:', business);
                  }}
                  className="h-full w-full"
                  isFullScreen={isMapFullScreen}
                  onToggleFullScreen={() => setIsMapFullScreen(!isMapFullScreen)}
                />
              </div>
              
              <div className="flex justify-between items-center mt-4">
                <div className="flex gap-2">
                  <Button 
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30" 
                    variant="outline"
                    onClick={getCurrentLocation}
                    disabled={loadingLocation}
                    size="sm"
                  >
                    {loadingLocation ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Navigation className="h-4 w-4 mr-2" />
                    )}
                    {loadingLocation ? 'Finding...' : 'My Location'}
                  </Button>
                  <Button 
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30" 
                    variant="outline"
                    onClick={setYakimaLocation}
                    size="sm"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Yakima
                  </Button>
                </div>
                <span className="text-green-100 text-sm">
                  {userLocation ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : 'Default area'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats - Tall Block */}
          <Card className="md:col-span-3 lg:col-span-3 md:row-span-2 bg-gradient-to-br from-purple-500 to-pink-500 border-0 text-white">
            <CardContent className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <Target className="h-8 w-8 text-purple-100" />
                <Badge className="bg-white/20 text-white border-white/30">Live</Badge>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-purple-100 mb-6">Discovery Stats</h3>
                
                <div className="space-y-6">
                  <div>
                    <div className="text-3xl font-bold mb-1">{nearbyBusinesses.length}</div>
                    <div className="text-purple-100 text-sm mb-2">Businesses Nearby</div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div className="bg-white h-2 rounded-full" style={{ width: `${Math.min(nearbyBusinesses.length * 25, 100)}%` }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-3xl font-bold mb-1">{nearbyBusinesses.reduce((sum, b) => sum + b.activeRewards, 0)}</div>
                    <div className="text-purple-100 text-sm mb-2">Active Rewards</div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div className="bg-white h-2 rounded-full" style={{ width: '65%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-3xl font-bold mb-1">{Math.floor(nearbyBusinesses.length * 0.3)}</div>
                    <div className="text-purple-100 text-sm mb-2">New This Week</div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div className="bg-white h-2 rounded-full" style={{ width: '40%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-lg font-bold mb-1">{nearbyBusinesses.filter(b => b.isOpen).length}</div>
                    <div className="text-purple-100 text-sm">Currently Open</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Filters */}
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Card 
                key={category.id}
                className={`md:col-span-2 cursor-pointer transition-all duration-300 hover:scale-105 ${
                  selectedCategory === category.id 
                    ? 'border-2 border-purple-500 bg-purple-50 dark:bg-purple-950/20' 
                    : 'bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700'
                }`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <CardContent className="p-6 text-center">
                  <Icon className={`h-6 w-6 mx-auto mb-2 ${selectedCategory === category.id ? 'text-purple-600' : 'text-gray-600'}`} />
                  <h3 className={`font-medium mb-1 ${selectedCategory === category.id ? 'text-purple-900 dark:text-purple-100' : 'text-gray-900 dark:text-white'}`}>
                    {category.name}
                  </h3>
                  <p className={`text-xs ${selectedCategory === category.id ? 'text-purple-700 dark:text-purple-300' : 'text-gray-600 dark:text-gray-400'}`}>
                    {category.count} places
                  </p>
                </CardContent>
              </Card>
            );
          })}

          {/* Nearby Businesses List */}
          <Card className="md:col-span-6 lg:col-span-8 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900 dark:text-white">
                <Store className="h-5 w-5 mr-2 text-purple-600" />
                Live Nearby Businesses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredBusinesses.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500 dark:text-gray-400">
                    {nearbyBusinesses.length === 0 ? 'Loading businesses...' : 'No businesses match your filters'}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredBusinesses.map((business) => {
                  const Icon = business.icon;
                  return (
                    <Card key={business.id} className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow">
                      <div className={`h-2 bg-gradient-to-r ${business.gradient}`}></div>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center">
                            <div className={`w-12 h-12 bg-gradient-to-r ${business.gradient} rounded-lg flex items-center justify-center mr-3`}>
                              <Icon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-white">{business.name}</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{business.category}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="outline">
                            <Heart className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{business.rating}</span>
                          </div>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {typeof business.distance === 'number' ? formatDistance(business.distance) : business.distance}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mb-4">
                          <Badge className={business.isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                            <Clock className="w-3 h-3 mr-1" />
                            {business.isOpen ? 'Open' : 'Closed'}
                          </Badge>
                          <Badge className="bg-purple-100 text-purple-700">
                            <Gift className="w-3 h-3 mr-1" />
                            {business.activeRewards} rewards
                          </Badge>
                        </div>
                        
                        <Button className="w-full" variant={business.isOpen ? 'default' : 'outline'}>
                          <Zap className="h-4 w-4 mr-2" />
                          View Rewards
                        </Button>
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
    </>
  );
}