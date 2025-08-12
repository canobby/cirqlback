import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Search, Star, Crown, Gift, Zap } from "lucide-react";

interface Business {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: string;
  rating: number;
  activeCampaigns: number;
  isPartner: boolean;
  visibilityLevel?: string;
  referralCount?: number;
  description?: string;
}

export default function MapPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [mapView, setMapView] = useState<"customer" | "business">("customer");

  const { data: businesses, isLoading } = useQuery({
    queryKey: ["/api/map/businesses"],
    queryFn: async () => {
      // This would normally fetch from the real API
      return [
        {
          id: "1",
          name: "Brew & Bean Coffee",
          address: "123 Main St, Downtown",
          lat: 40.7589,
          lng: -73.9851,
          category: "cafe",
          rating: 4.8,
          activeCampaigns: 3,
          isPartner: true,
          visibilityLevel: "featured",
          referralCount: 12,
          description: "Artisan coffee shop with daily rewards"
        },
        {
          id: "2", 
          name: "Pizza Corner",
          address: "456 Oak Ave, Midtown",
          lat: 40.7614,
          lng: -73.9776,
          category: "restaurant",
          rating: 4.5,
          activeCampaigns: 2,
          isPartner: true,
          visibilityLevel: "priority",
          referralCount: 8,
          description: "Authentic Italian pizza with loyalty rewards"
        },
        {
          id: "3",
          name: "Tech Repair Plus",
          address: "789 Broadway, Tech District", 
          lat: 40.7505,
          lng: -73.9934,
          category: "services",
          rating: 4.9,
          activeCampaigns: 1,
          isPartner: true,
          visibilityLevel: "champion",
          referralCount: 127,
          description: "Phone and laptop repair with instant discounts"
        },
        {
          id: "4",
          name: "Green Leaf Wellness",
          address: "321 Health St, Wellness Zone",
          lat: 40.7282,
          lng: -73.9942,
          category: "wellness",
          rating: 4.7,
          activeCampaigns: 4,
          isPartner: true,
          visibilityLevel: "spotlight",
          referralCount: 34,
          description: "Natural health products and consultations"
        }
      ] as Business[];
    }
  });

  const filteredBusinesses = businesses?.filter(business => {
    const matchesSearch = business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         business.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || business.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  const getVisibilityIcon = (level?: string) => {
    switch (level) {
      case "champion": return <Crown className="h-4 w-4 text-yellow-500" />;
      case "spotlight": return <Star className="h-4 w-4 text-purple-500" />;
      case "priority": return <Zap className="h-4 w-4 text-blue-500" />;
      case "featured": return <Gift className="h-4 w-4 text-green-500" />;
      default: return <MapPin className="h-4 w-4 text-gray-500" />;
    }
  };

  const getVisibilityBadge = (level?: string, referralCount?: number) => {
    switch (level) {
      case "champion":
        return <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">Champion (100+ referrals)</Badge>;
      case "spotlight":
        return <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">Spotlight (25+ referrals)</Badge>;
      case "priority":
        return <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">Priority (10+ referrals)</Badge>;
      case "featured":
        return <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">Featured (5+ referrals)</Badge>;
      default:
        return <Badge variant="outline">Standard</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-6 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Cirqlback Business Map
          </h1>
          <p className="text-xl text-gray-600">
            Discover participating businesses and explore visibility rewards
          </p>
        </div>

        <Tabs value={mapView} onValueChange={(value) => setMapView(value as "customer" | "business")} className="mb-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="customer">Customer View</TabsTrigger>
            <TabsTrigger value="business">Business View</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search and Filters */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="h-5 w-5 mr-2" />
                  Find Businesses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Search businesses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <select 
                    value={selectedCategory} 
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="all">All Categories</option>
                    <option value="cafe">Cafes</option>
                    <option value="restaurant">Restaurants</option>
                    <option value="services">Services</option>
                    <option value="wellness">Wellness</option>
                  </select>
                </div>

                {mapView === "business" && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-medium text-yellow-800 mb-2">Visibility Rewards Legend</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center space-x-2">
                        <Crown className="h-4 w-4 text-yellow-500" />
                        <span>Champion (100+ referrals)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 text-purple-500" />
                        <span>Spotlight (25+ referrals)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Zap className="h-4 w-4 text-blue-500" />
                        <span>Priority (10+ referrals)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Gift className="h-4 w-4 text-green-500" />
                        <span>Featured (5+ referrals)</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Business List */}
            <Card className="max-h-96 overflow-y-auto">
              <CardHeader>
                <CardTitle>
                  {mapView === "customer" ? "Participating Businesses" : "Visibility Rewards Status"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredBusinesses.map((business) => (
                  <div
                    key={business.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedBusiness?.id === business.id 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedBusiness(business)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {getVisibilityIcon(business.visibilityLevel)}
                          <h4 className="font-medium">{business.name}</h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{business.address}</p>
                        
                        {mapView === "customer" ? (
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{business.activeCampaigns} active campaigns</Badge>
                            <div className="flex items-center">
                              <Star className="h-3 w-3 text-yellow-500 mr-1" />
                              <span className="text-sm">{business.rating}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {getVisibilityBadge(business.visibilityLevel, business.referralCount)}
                            <p className="text-xs text-gray-500">{business.referralCount} referrals</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Map Area */}
          <div className="lg:col-span-2">
            <Card className="h-[600px]">
              <CardHeader>
                <CardTitle>
                  {mapView === "customer" ? "Reward Locations" : "Visibility Rewards Map"}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-full">
                <div className="w-full h-full bg-gradient-to-br from-blue-100 to-green-100 rounded-lg flex items-center justify-center relative overflow-hidden">
                  {/* Simulated Map Interface */}
                  <div className="absolute inset-4 grid grid-cols-4 grid-rows-4 gap-2">
                    {filteredBusinesses.map((business, index) => (
                      <div
                        key={business.id}
                        className={`relative cursor-pointer transform transition-all duration-200 ${
                          selectedBusiness?.id === business.id ? 'scale-110 z-10' : 'hover:scale-105'
                        }`}
                        style={{
                          gridColumn: (index % 4) + 1,
                          gridRow: Math.floor(index / 4) + 1,
                        }}
                        onClick={() => setSelectedBusiness(business)}
                      >
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg
                          ${business.visibilityLevel === 'champion' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 ring-4 ring-yellow-200' :
                            business.visibilityLevel === 'spotlight' ? 'bg-gradient-to-r from-purple-500 to-pink-500 ring-4 ring-purple-200' :
                            business.visibilityLevel === 'priority' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 ring-2 ring-blue-200' :
                            business.visibilityLevel === 'featured' ? 'bg-gradient-to-r from-green-500 to-emerald-500 ring-2 ring-green-200' :
                            'bg-gray-500'
                          }
                        `}>
                          {getVisibilityIcon(business.visibilityLevel)}
                        </div>
                        
                        {selectedBusiness?.id === business.id && (
                          <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-3 min-w-48 z-20 border">
                            <h4 className="font-semibold text-sm mb-1">{business.name}</h4>
                            <p className="text-xs text-gray-600 mb-2">{business.description}</p>
                            {mapView === "customer" ? (
                              <div className="flex items-center justify-between text-xs">
                                <span>{business.activeCampaigns} campaigns</span>
                                <div className="flex items-center">
                                  <Star className="h-3 w-3 text-yellow-500 mr-1" />
                                  {business.rating}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs">
                                {getVisibilityBadge(business.visibilityLevel, business.referralCount)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="text-center text-gray-500">
                    <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Interactive Map View</p>
                    <p className="text-xs">Click on pins to see business details</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Map Statistics */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-purple-600">{filteredBusinesses.length}</div>
                <div className="text-sm text-gray-600">Total Businesses</div>
              </Card>
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-green-600">
                  {filteredBusinesses.reduce((sum, b) => sum + b.activeCampaigns, 0)}
                </div>
                <div className="text-sm text-gray-600">Active Campaigns</div>
              </Card>
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-orange-600">
                  {filteredBusinesses.filter(b => b.visibilityLevel && b.visibilityLevel !== 'standard').length}
                </div>
                <div className="text-sm text-gray-600">Visibility Rewards</div>
              </Card>
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {filteredBusinesses.reduce((sum, b) => sum + (b.referralCount || 0), 0)}
                </div>
                <div className="text-sm text-gray-600">Total Referrals</div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}