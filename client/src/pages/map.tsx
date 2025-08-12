import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Search, Star, Crown, Gift, Zap, Route, Trophy, Target, Award } from "lucide-react";

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
  badges?: string[];
  campaigns?: Campaign[];
}

interface Campaign {
  id: string;
  title: string;
  type: "discount" | "loyalty" | "challenge";
  reward: string;
  points: number;
  difficulty: "easy" | "medium" | "hard";
  category: string;
}

interface TapTrail {
  id: string;
  name: string;
  businesses: string[];
  totalReward: number;
  difficulty: "easy" | "medium" | "hard";
  estimatedTime: string;
  theme: string;
}

export default function MapPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [selectedTrail, setSelectedTrail] = useState<TapTrail | null>(null);
  const [mapView, setMapView] = useState<"customer" | "business" | "trails">("customer");
  const [showRoutes, setShowRoutes] = useState(false);

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
          description: "Artisan coffee shop with daily rewards",
          badges: ["Early Adopter", "Customer Favorite", "Daily Rewards Champion"],
          campaigns: [
            { id: "c1", title: "Morning Brew Bonus", type: "discount", reward: "20% off", points: 50, difficulty: "easy", category: "morning" },
            { id: "c2", title: "Loyalty Stamps", type: "loyalty", reward: "Free coffee after 10 visits", points: 100, difficulty: "medium", category: "loyalty" },
            { id: "c3", title: "Social Share Challenge", type: "challenge", reward: "Free pastry", points: 25, difficulty: "easy", category: "social" }
          ]
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
          description: "Authentic Italian pizza with loyalty rewards",
          badges: ["Quality Leader", "Community Partner"],
          campaigns: [
            { id: "c4", title: "Pizza Party Points", type: "loyalty", reward: "Free slice after 5 visits", points: 75, difficulty: "medium", category: "food" },
            { id: "c5", title: "Family Feast Deal", type: "discount", reward: "30% off family meals", points: 120, difficulty: "hard", category: "family" }
          ]
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
          description: "Phone and laptop repair with instant discounts",
          badges: ["Cirqlback Champion", "Tech Expert", "Referral Master", "Top Performer"],
          campaigns: [
            { id: "c6", title: "Instant Repair Discount", type: "discount", reward: "15% off repairs", points: 60, difficulty: "easy", category: "tech" }
          ]
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
          description: "Natural health products and consultations",
          badges: ["Wellness Leader", "Newsletter Featured", "Health Champion"],
          campaigns: [
            { id: "c7", title: "Wellness Wednesday", type: "discount", reward: "25% off consultations", points: 80, difficulty: "medium", category: "wellness" },
            { id: "c8", title: "Healthy Habits Challenge", type: "challenge", reward: "Free supplement sample", points: 40, difficulty: "easy", category: "wellness" },
            { id: "c9", title: "Monthly Membership", type: "loyalty", reward: "Free consultation after 3 visits", points: 150, difficulty: "hard", category: "membership" },
            { id: "c10", title: "Refer a Friend", type: "challenge", reward: "$10 credit", points: 100, difficulty: "medium", category: "referral" }
          ]
        },
        {
          id: "5",
          name: "Urban Fitness Studio",
          address: "555 Gym Street, Fitness District",
          lat: 40.7350,
          lng: -73.9900,
          category: "fitness",
          rating: 4.6,
          activeCampaigns: 2,
          isPartner: true,
          visibilityLevel: "featured",
          referralCount: 7,
          description: "Modern fitness studio with member rewards",
          badges: ["Fitness Pro", "New Partner"],
          campaigns: [
            { id: "c11", title: "First Class Free", type: "discount", reward: "Free trial class", points: 30, difficulty: "easy", category: "fitness" },
            { id: "c12", title: "Monthly Challenge", type: "challenge", reward: "Free personal training session", points: 200, difficulty: "hard", category: "fitness" }
          ]
        }
      ] as Business[];
    }
  });

  const { data: tapTrails } = useQuery({
    queryKey: ["/api/map/tap-trails"],
    queryFn: async () => {
      return [
        {
          id: "trail1",
          name: "Downtown Coffee & Eats",
          businesses: ["1", "2"],
          totalReward: 250,
          difficulty: "easy",
          estimatedTime: "45 minutes",
          theme: "Food & Drink"
        },
        {
          id: "trail2", 
          name: "Wellness & Fitness Journey",
          businesses: ["4", "5"],
          totalReward: 350,
          difficulty: "medium",
          estimatedTime: "2 hours",
          theme: "Health & Wellness"
        },
        {
          id: "trail3",
          name: "Complete Downtown Experience",
          businesses: ["1", "2", "3", "4"],
          totalReward: 500,
          difficulty: "hard",
          estimatedTime: "3 hours",
          theme: "Full Experience"
        }
      ] as TapTrail[];
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

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case "Cirqlback Champion": return <Crown className="h-3 w-3" />;
      case "Early Adopter": return <Star className="h-3 w-3" />;
      case "Customer Favorite": return <Trophy className="h-3 w-3" />;
      case "Quality Leader": return <Award className="h-3 w-3" />;
      case "Tech Expert": return <Zap className="h-3 w-3" />;
      case "Wellness Leader": return <Target className="h-3 w-3" />;
      case "Fitness Pro": return <Trophy className="h-3 w-3" />;
      default: return <Award className="h-3 w-3" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "text-green-600 bg-green-100";
      case "medium": return "text-orange-600 bg-orange-100";
      case "hard": return "text-red-600 bg-red-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getTrailColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "border-green-500 bg-green-50";
      case "medium": return "border-orange-500 bg-orange-50";
      case "hard": return "border-red-500 bg-red-50";
      default: return "border-gray-500 bg-gray-50";
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

        <Tabs value={mapView} onValueChange={(value) => setMapView(value as "customer" | "business" | "trails")} className="mb-6">
          <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto">
            <TabsTrigger value="customer">Rewards</TabsTrigger>
            <TabsTrigger value="business">Visibility</TabsTrigger>
            <TabsTrigger value="trails">Tap Trails</TabsTrigger>
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
                    <option value="fitness">Fitness</option>
                  </select>
                </div>

                {mapView === "trails" && (
                  <div className="space-y-3">
                    <Button 
                      onClick={() => setShowRoutes(!showRoutes)}
                      className="w-full"
                      variant={showRoutes ? "default" : "outline"}
                    >
                      <Route className="h-4 w-4 mr-2" />
                      {showRoutes ? "Hide Routes" : "Show Suggested Routes"}
                    </Button>
                  </div>
                )}

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

            {/* Business List / Tap Trails */}
            <Card className="max-h-96 overflow-y-auto">
              <CardHeader>
                <CardTitle>
                  {mapView === "customer" ? "Participating Businesses" : 
                   mapView === "business" ? "Visibility Rewards Status" : "Tap Trails"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mapView === "trails" ? (
                  tapTrails?.map((trail) => (
                    <div
                      key={trail.id}
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedTrail?.id === trail.id 
                          ? getTrailColor(trail.difficulty) + ' ring-2 ring-purple-500' 
                          : getTrailColor(trail.difficulty) + ' hover:ring-1 hover:ring-gray-300'
                      }`}
                      onClick={() => setSelectedTrail(trail)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold flex items-center">
                          <Route className="h-4 w-4 mr-2" />
                          {trail.name}
                        </h4>
                        <Badge className={getDifficultyColor(trail.difficulty)}>
                          {trail.difficulty}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{trail.theme}</p>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{trail.businesses.length} stops</span>
                        <span>{trail.estimatedTime}</span>
                        <span className="font-semibold text-purple-600">{trail.totalReward} points</span>
                      </div>
                    </div>
                  ))
                ) : (
                  filteredBusinesses.map((business) => (
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
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">{business.activeCampaigns} campaigns</Badge>
                              <div className="flex items-center">
                                <Star className="h-3 w-3 text-yellow-500 mr-1" />
                                <span className="text-sm">{business.rating}</span>
                              </div>
                            </div>
                            {business.badges && business.badges.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {business.badges.slice(0, 2).map((badge, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs flex items-center gap-1">
                                    {getBadgeIcon(badge)}
                                    {badge}
                                  </Badge>
                                ))}
                                {business.badges.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{business.badges.length - 2} more
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {getVisibilityBadge(business.visibilityLevel, business.referralCount)}
                            <p className="text-xs text-gray-500">{business.referralCount} referrals</p>
                            {business.badges && business.badges.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {business.badges.slice(0, 3).map((badge, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs flex items-center gap-1">
                                    {getBadgeIcon(badge)}
                                    {badge}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Map Area */}
          <div className="lg:col-span-2">
            <Card className="h-[600px]">
              <CardHeader>
                <CardTitle>
                  {mapView === "customer" ? "Reward Locations" : 
                   mapView === "business" ? "Visibility Rewards Map" : "Tap Trail Routes"}
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
                          w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg transition-all duration-200
                          ${mapView === "trails" && selectedTrail && selectedTrail.businesses.includes(business.id) 
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 ring-4 ring-purple-300 animate-pulse' 
                            : business.visibilityLevel === 'champion' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 ring-4 ring-yellow-200' :
                            business.visibilityLevel === 'spotlight' ? 'bg-gradient-to-r from-purple-500 to-pink-500 ring-4 ring-purple-200' :
                            business.visibilityLevel === 'priority' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 ring-2 ring-blue-200' :
                            business.visibilityLevel === 'featured' ? 'bg-gradient-to-r from-green-500 to-emerald-500 ring-2 ring-green-200' :
                            'bg-gray-500'
                          }
                        `}>
                          {getVisibilityIcon(business.visibilityLevel)}
                        </div>
                        
                        {selectedBusiness?.id === business.id && (
                          <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-3 min-w-56 z-20 border">
                            <h4 className="font-semibold text-sm mb-1">{business.name}</h4>
                            <p className="text-xs text-gray-600 mb-2">{business.description}</p>
                            {mapView === "customer" ? (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span>{business.activeCampaigns} campaigns</span>
                                  <div className="flex items-center">
                                    <Star className="h-3 w-3 text-yellow-500 mr-1" />
                                    {business.rating}
                                  </div>
                                </div>
                                {business.campaigns && business.campaigns.length > 0 && (
                                  <div className="space-y-1 max-h-16 overflow-y-auto">
                                    {business.campaigns.slice(0, 2).map((campaign) => (
                                      <div key={campaign.id} className="flex items-center justify-between bg-purple-50 p-1 rounded text-xs">
                                        <span className="font-medium">{campaign.title}</span>
                                        <Badge className={getDifficultyColor(campaign.difficulty)} variant="outline">
                                          {campaign.points}pts
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : mapView === "business" ? (
                              <div className="text-xs space-y-1">
                                {getVisibilityBadge(business.visibilityLevel, business.referralCount)}
                                {business.badges && business.badges.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {business.badges.slice(0, 2).map((badge, i) => (
                                      <Badge key={i} variant="secondary" className="text-xs flex items-center gap-1">
                                        {getBadgeIcon(badge)}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs">
                                <p className="font-medium text-purple-600">Part of selected trail</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Route Connections for Tap Trails */}
                  {mapView === "trails" && selectedTrail && showRoutes && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                      {selectedTrail.businesses.map((businessId, index) => {
                        const currentBusiness = filteredBusinesses.find(b => b.id === businessId);
                        const nextBusiness = filteredBusinesses.find(b => b.id === selectedTrail.businesses[index + 1]);
                        if (!currentBusiness || !nextBusiness) return null;
                        
                        const currentIndex = filteredBusinesses.findIndex(b => b.id === businessId);
                        const nextIndex = filteredBusinesses.findIndex(b => b.id === selectedTrail.businesses[index + 1]);
                        
                        const x1 = ((currentIndex % 4) + 1) * (100 / 5) + 10;
                        const y1 = (Math.floor(currentIndex / 4) + 1) * (100 / 5) + 10;
                        const x2 = ((nextIndex % 4) + 1) * (100 / 5) + 10;
                        const y2 = (Math.floor(nextIndex / 4) + 1) * (100 / 5) + 10;
                        
                        return (
                          <line
                            key={`${businessId}-${selectedTrail.businesses[index + 1]}`}
                            x1={`${x1}%`}
                            y1={`${y1}%`}
                            x2={`${x2}%`}
                            y2={`${y2}%`}
                            stroke="#8B5CF6"
                            strokeWidth="3"
                            strokeDasharray="5,5"
                            className="animate-pulse"
                          />
                        );
                      })}
                    </svg>
                  )}

                  <div className="text-center text-gray-500">
                    <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Interactive Map View</p>
                    <p className="text-xs">
                      {mapView === "trails" ? "Select a trail to see suggested routes" : "Click on pins to see business details"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Map Statistics */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {mapView === "trails" ? (
                <>
                  <Card className="text-center p-4">
                    <div className="text-2xl font-bold text-purple-600">{tapTrails?.length || 0}</div>
                    <div className="text-sm text-gray-600">Available Trails</div>
                  </Card>
                  <Card className="text-center p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {tapTrails?.reduce((sum, t) => sum + t.totalReward, 0) || 0}
                    </div>
                    <div className="text-sm text-gray-600">Total Rewards</div>
                  </Card>
                  <Card className="text-center p-4">
                    <div className="text-2xl font-bold text-orange-600">
                      {tapTrails?.reduce((sum, t) => sum + t.businesses.length, 0) || 0}
                    </div>
                    <div className="text-sm text-gray-600">Trail Stops</div>
                  </Card>
                  <Card className="text-center p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedTrail ? selectedTrail.totalReward : 0}
                    </div>
                    <div className="text-sm text-gray-600">Selected Trail Reward</div>
                  </Card>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}