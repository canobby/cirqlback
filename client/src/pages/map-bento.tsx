import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  MapPin, Navigation, Search, Filter, Star, Clock, 
  Gift, Zap, Users, Target, ArrowRight, Heart,
  Smartphone, Coffee, Store, Utensils
} from "lucide-react";

export default function MapBento() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  const nearbyBusinesses = [
    {
      id: 1,
      name: "Joe's Coffee Shop",
      category: "Coffee",
      distance: "0.2 miles",
      rating: 4.8,
      activeRewards: 3,
      isOpen: true,
      gradient: "from-orange-500 to-amber-500",
      icon: Coffee,
      bgPattern: "☕"
    },
    {
      id: 2,
      name: "Tech Store Plus",
      category: "Electronics",
      distance: "0.4 miles", 
      rating: 4.6,
      activeRewards: 2,
      isOpen: true,
      gradient: "from-blue-500 to-cyan-500",
      icon: Smartphone,
      bgPattern: "📱"
    },
    {
      id: 3,
      name: "Pizza Corner",
      category: "Food",
      distance: "0.6 miles",
      rating: 4.7,
      activeRewards: 4,
      isOpen: false,
      gradient: "from-red-500 to-pink-500",
      icon: Utensils,
      bgPattern: "🍕"
    }
  ];

  const categories = [
    { id: "all", name: "All", icon: Store, count: 23 },
    { id: "coffee", name: "Coffee", icon: Coffee, count: 8 },
    { id: "food", name: "Food", icon: Utensils, count: 12 },
    { id: "tech", name: "Tech", icon: Smartphone, count: 3 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/30 to-blue-50/30 dark:from-gray-950 dark:via-green-950/30 dark:to-blue-950/30">
      <div className="container max-w-7xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                Discovery Map
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Find local businesses with active Cirql rewards near you
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => window.location.href = '/map'}
                variant="outline"
                size="sm"
                className="text-white"
              >
                Classic View
              </Button>
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <Navigation className="w-3 h-3 mr-1" />
                23 nearby
              </Badge>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4">
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
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-8 gap-6 auto-rows-min">
          
          {/* Interactive Map - Large Block */}
          <Card className="md:col-span-6 lg:col-span-5 bg-gradient-to-br from-green-500 to-blue-500 border-0 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-16 -translate-x-16"></div>
            <CardContent className="p-8 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Your Local Area</h2>
                  <p className="text-green-100">Interactive map showing nearby businesses with rewards</p>
                </div>
                <MapPin className="h-12 w-12 text-green-100" />
              </div>
              
              {/* Mock Map Area */}
              <div className="h-64 bg-white/10 rounded-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 to-blue-600/20"></div>
                
                {/* Mock Business Markers */}
                <div className="absolute top-8 left-12 w-4 h-4 bg-orange-400 rounded-full animate-pulse"></div>
                <div className="absolute top-16 right-20 w-4 h-4 bg-blue-400 rounded-full animate-pulse"></div>
                <div className="absolute bottom-20 left-20 w-4 h-4 bg-red-400 rounded-full animate-pulse"></div>
                <div className="absolute bottom-12 right-16 w-4 h-4 bg-purple-400 rounded-full animate-pulse"></div>
                
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Navigation className="h-6 w-6" />
                    </div>
                    <p className="text-green-100 text-sm">Interactive map loading...</p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-4">
                <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30" variant="outline">
                  <Navigation className="h-4 w-4 mr-2" />
                  Current Location
                </Button>
                <span className="text-green-100 text-sm">Within 1 mile radius</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats - Tall Block */}
          <Card className="md:col-span-3 lg:col-span-3 md:row-span-2 bg-gradient-to-br from-purple-500 to-pink-500 border-0 text-white">
            <CardContent className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <Target className="h-8 w-8 text-purple-100" />
                <Badge className="bg-white/20 text-white border-white/30">Updated now</Badge>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-purple-100 mb-6">Discovery Stats</h3>
                
                <div className="space-y-6">
                  <div>
                    <div className="text-3xl font-bold mb-1">23</div>
                    <div className="text-purple-100 text-sm mb-2">Businesses Nearby</div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div className="bg-white h-2 rounded-full" style={{ width: '78%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-3xl font-bold mb-1">47</div>
                    <div className="text-purple-100 text-sm mb-2">Active Rewards</div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div className="bg-white h-2 rounded-full" style={{ width: '65%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-3xl font-bold mb-1">8</div>
                    <div className="text-purple-100 text-sm mb-2">New This Week</div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div className="bg-white h-2 rounded-full" style={{ width: '40%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-lg font-bold mb-1">15</div>
                    <div className="text-purple-100 text-sm">Currently Open</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Filters */}
          {categories.map((category, idx) => {
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
                Nearby Businesses with Rewards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {nearbyBusinesses.map((business) => {
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
                          <Button size="sm" variant="outline" className="text-white">
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
                            <span className="text-sm text-gray-600 dark:text-gray-400">{business.distance}</span>
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
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}