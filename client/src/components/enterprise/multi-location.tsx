import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Store, Users, TrendingUp, Settings, Crown, Building, Globe, BarChart3 } from "lucide-react";

export default function MultiLocationManager() {
  const [selectedLocation, setSelectedLocation] = useState("all");
  
  const locations = [
    {
      id: "downtown",
      name: "Downtown Flagship",
      address: "123 Main St, Downtown",
      manager: "Sarah Johnson",
      status: "active",
      revenue: "$45,230",
      customers: 1247,
      taps: 89,
      rating: 4.8,
      tier: "premium"
    },
    {
      id: "mall",
      name: "Shopping Mall",
      address: "456 Mall Dr, Westside",
      manager: "Mike Chen",
      status: "active", 
      revenue: "$32,180",
      customers: 892,
      taps: 67,
      rating: 4.6,
      tier: "standard"
    },
    {
      id: "airport",
      name: "Airport Terminal",
      address: "Terminal B, Gate 15",
      manager: "Lisa Rodriguez",
      status: "active",
      revenue: "$28,950",
      customers: 634,
      taps: 45,
      rating: 4.4,
      tier: "premium"
    },
    {
      id: "university",
      name: "University Campus",
      address: "789 College Ave",
      manager: "David Park",
      status: "pending",
      revenue: "$0",
      customers: 0,
      taps: 0,
      rating: 0,
      tier: "standard"
    }
  ];

  const franchiseData = [
    {
      region: "West Coast",
      locations: 24,
      revenue: "$234,500",
      growth: "+18%",
      topPerformer: "San Francisco Downtown"
    },
    {
      region: "East Coast", 
      locations: 31,
      revenue: "$298,700",
      growth: "+23%",
      topPerformer: "NYC Times Square"
    },
    {
      region: "Midwest",
      locations: 18,
      revenue: "$156,200",
      growth: "+12%",
      topPerformer: "Chicago Loop"
    },
    {
      region: "Southeast",
      locations: 22,
      revenue: "$189,400",
      growth: "+15%",
      topPerformer: "Atlanta Downtown"
    }
  ];

  const globalStats = {
    totalLocations: 95,
    totalRevenue: "$878,800",
    totalCustomers: 42847,
    avgRating: 4.6,
    topRegion: "East Coast",
    growthRate: "+17%"
  };

  const whiteLabel = {
    activeBrands: 8,
    customizations: [
      { brand: "Bean & Brew Co.", locations: 12, theme: "Coffee Brown" },
      { brand: "Fresh Eats", locations: 8, theme: "Organic Green" },
      { brand: "Tech Hub Cafe", locations: 6, theme: "Silicon Blue" },
      { brand: "University Dining", locations: 15, theme: "Academic Gold" }
    ],
    revenue: "$145,600",
    brandingOptions: ["Custom Colors", "Logo Upload", "Font Selection", "Custom Domain"]
  };

  return (
    <div className="space-y-6">
      <Card className="card-hover glow-effect">
        <CardHeader>
          <CardTitle className="flex items-center gradient-text">
            <Building className="mr-2 h-6 w-6" />
            Enterprise Multi-Location Hub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{globalStats.totalLocations}</div>
              <div className="text-sm text-blue-700">Total Locations</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{globalStats.totalRevenue}</div>
              <div className="text-sm text-green-700">Global Revenue</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{globalStats.totalCustomers.toLocaleString()}</div>
              <div className="text-sm text-purple-700">Total Customers</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{globalStats.growthRate}</div>
              <div className="text-sm text-orange-700">Global Growth</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="locations" className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="grid grid-cols-4 min-w-max lg:w-full">
            <TabsTrigger value="locations" className="px-2 text-xs lg:px-3 lg:text-sm">Locations</TabsTrigger>
            <TabsTrigger value="franchise" className="px-2 text-xs lg:px-3 lg:text-sm">Franchise</TabsTrigger>
            <TabsTrigger value="whitelabel" className="px-2 text-xs lg:px-3 lg:text-sm">White Label</TabsTrigger>
            <TabsTrigger value="analytics" className="px-2 text-xs lg:px-3 lg:text-sm">Global Analytics</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="locations" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {locations.map((location) => (
              <Card key={location.id} className="card-hover">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <Store className="h-6 w-6 text-blue-500" />
                        <div>
                          <h4 className="font-semibold text-gray-900">{location.name}</h4>
                          <p className="text-sm text-gray-600 flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {location.address}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Badge variant={location.status === "active" ? "default" : "secondary"}>
                          {location.status}
                        </Badge>
                        {location.tier === "premium" && (
                          <Badge className="gradient-bg border-0 text-white">
                            <Crown className="h-3 w-3 mr-1" />
                            Premium
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="font-bold text-green-600">{location.revenue}</div>
                        <div className="text-xs text-green-600">Revenue</div>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="font-bold text-blue-600">{location.customers}</div>
                        <div className="text-xs text-blue-600">Customers</div>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <div className="font-bold text-purple-600">{location.taps}</div>
                        <div className="text-xs text-purple-600">Daily Taps</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-600">
                        Manager: <span className="font-medium">{location.manager}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-sm font-medium">⭐ {location.rating}</span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Settings className="mr-1 h-3 w-3" />
                        Manage
                      </Button>
                      <Button size="sm" className="flex-1 gradient-bg border-0 text-white">
                        <BarChart3 className="mr-1 h-3 w-3" />
                        Analytics
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="gradient-text">Add New Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <Input placeholder="Location name" />
                <Input placeholder="Address" />
                <Input placeholder="Manager name" />
              </div>
              <div className="mt-4 flex space-x-4">
                <Button variant="outline" className="flex-1">
                  <Store className="mr-2 h-4 w-4" />
                  Standard Setup
                </Button>
                <Button className="flex-1 gradient-bg border-0 text-white">
                  <Crown className="mr-2 h-4 w-4" />
                  Premium Setup
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="franchise" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">Regional Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {franchiseData.map((region, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-900">{region.region}</h4>
                      <Badge className="gradient-bg border-0 text-white">
                        {region.growth}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Locations:</span>
                        <div className="font-medium">{region.locations}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Revenue:</span>
                        <div className="font-medium text-green-600">{region.revenue}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-blue-600">
                      Top: {region.topPerformer}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">Franchise Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">🏢 Franchise Features</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div>• Centralized campaign management</div>
                    <div>• Regional performance dashboards</div>
                    <div>• Automated royalty calculations</div>
                    <div>• Training & onboarding systems</div>
                    <div>• Quality control monitoring</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="font-bold text-green-600">$2.4M</div>
                    <div className="text-xs text-green-600">Franchise Fees</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="font-bold text-purple-600">97%</div>
                    <div className="text-xs text-purple-600">Success Rate</div>
                  </div>
                </div>
                
                <Button className="w-full gradient-bg border-0 text-white">
                  <Globe className="mr-2 h-4 w-4" />
                  Franchise Portal
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="whitelabel" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">White Label Brands</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {whiteLabel.customizations.map((brand, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-900">{brand.brand}</h4>
                      <Badge variant="outline">
                        {brand.locations} locations
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: brand.theme === "Coffee Brown" ? "#8B4513" : 
                                                brand.theme === "Organic Green" ? "#228B22" :
                                                brand.theme === "Silicon Blue" ? "#4169E1" : "#FFD700" }}
                      ></div>
                      <span className="text-sm text-gray-600">{brand.theme}</span>
                    </div>
                  </div>
                ))}
                
                <Button className="w-full gradient-bg border-0 text-white">
                  <Crown className="mr-2 h-4 w-4" />
                  Add New Brand
                </Button>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">Customization Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2">🎨 Branding Suite</h4>
                  <div className="space-y-2">
                    {whiteLabel.brandingOptions.map((option, index) => (
                      <div key={index} className="flex items-center text-sm text-purple-700">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                        {option}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="font-bold text-blue-600">{whiteLabel.activeBrands}</div>
                    <div className="text-xs text-blue-600">Active Brands</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="font-bold text-green-600">{whiteLabel.revenue}</div>
                    <div className="text-xs text-green-600">Monthly Revenue</div>
                  </div>
                </div>
                
                <Button variant="outline" className="w-full">
                  <Settings className="mr-2 h-4 w-4" />
                  Customization Studio
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">Global Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">🌍 Worldwide Impact</h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <div>• 95 active locations</div>
                    <div>• 42K+ loyal customers</div>
                    <div>• $878K monthly revenue</div>
                    <div>• 4.6⭐ average rating</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Best Performing Region</span>
                    <span className="font-medium text-blue-600">{globalStats.topRegion}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Growth Rate</span>
                    <span className="font-medium text-green-600">{globalStats.growthRate}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg Rating</span>
                    <span className="font-medium text-yellow-600">{globalStats.avgRating}⭐</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">Performance Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">📊 Key Insights</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div>• Premium locations 23% more profitable</div>
                    <div>• Airport locations highest volume</div>
                    <div>• University locations most viral</div>
                    <div>• Mall locations best retention</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="font-bold text-purple-600">156</div>
                    <div className="text-xs text-purple-600">Avg Daily Taps</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="font-bold text-orange-600">$234</div>
                    <div className="text-xs text-orange-600">Avg Per Location</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">Expansion Opportunities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">🎯 Growth Targets</h4>
                  <div className="text-sm text-yellow-700 space-y-1">
                    <div>• Target: 150 locations by Q4</div>
                    <div>• Focus: Tech hubs & universities</div>
                    <div>• International: EU expansion</div>
                    <div>• Partnerships: Major retailers</div>
                  </div>
                </div>
                
                <Button className="w-full gradient-bg border-0 text-white">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Expansion Strategy
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}