import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MapPin,
  Compass,
  Trophy,
  Star,
  Eye,
  Zap,
  Target,
  Gift,
  Clock,
  Users,
  Camera,
  Map,
  Sparkles,
  Crown,
  Search,
  Filter,
  Play,
  Pause,
  RotateCcw,
  Award,
  ChevronRight,
  Navigation,
  QrCode,
  Smartphone,
  Globe,
  Gamepad2,
  MapPin as TreasureIcon
} from "lucide-react";

export default function ArTreasureHunts() {
  const [selectedHunt, setSelectedHunt] = useState<any>(null);
  const [huntFilter, setHuntFilter] = useState("available");
  const [difficulty, setDifficulty] = useState("all");
  const [activeTab, setActiveTab] = useState("discover");

  // Mock data for AR treasure hunts
  const availableHunts = [
    {
      id: 1,
      title: "Downtown Mystery Adventure",
      description: "Uncover the secrets of downtown's historic district through AR clues and interactive puzzles",
      difficulty: "Medium",
      duration: "45-60 minutes",
      stops: 8,
      distance: "1.2 miles",
      reward: "Historic Explorer Badge + 800 points",
      participants: 234,
      rating: 4.8,
      businesses: ["Heritage Cafe", "Vintage Books", "Art Gallery"],
      image: "/api/placeholder/300/200",
      type: "Historical",
      status: "Active",
      createdBy: "City Tourism Board"
    },
    {
      id: 2,
      title: "Foodie's AR Quest",
      description: "Follow AR taste trails to discover signature dishes at local restaurants",
      difficulty: "Easy",
      duration: "30-45 minutes", 
      stops: 6,
      distance: "0.8 miles",
      reward: "Master Chef Crown + 600 points",
      participants: 187,
      rating: 4.9,
      businesses: ["Bistro 21", "Taco Heaven", "Sweet Treats"],
      image: "/api/placeholder/300/200",
      type: "Culinary",
      status: "Featured",
      createdBy: "Local Restaurant Alliance"
    },
    {
      id: 3,
      title: "Tech Innovation Trail",
      description: "Explore cutting-edge AR experiences at tech startups and innovation hubs",
      difficulty: "Hard",
      duration: "60-90 minutes",
      stops: 10,
      distance: "1.8 miles", 
      reward: "Tech Pioneer Badge + 1200 points",
      participants: 156,
      rating: 4.7,
      businesses: ["TechHub", "Innovation Lab", "Startup Incubator"],
      image: "/api/placeholder/300/200",
      type: "Technology",
      status: "Premium",
      createdBy: "Tech Community"
    }
  ];

  const activeHunts = [
    {
      id: 1,
      title: "Coffee Shop Circuit",
      progress: 75,
      currentStop: 6,
      totalStops: 8,
      timeElapsed: "32 minutes",
      nextClue: "Look for the golden espresso machine in the window",
      location: "Brew & Bite Cafe",
      points: 450
    },
    {
      id: 2,
      title: "Art District Discovery",
      progress: 40,
      currentStop: 3,
      totalStops: 7,
      timeElapsed: "18 minutes", 
      nextClue: "Find the mural with hidden AR layers",
      location: "Main Street Gallery",
      points: 280
    }
  ];

  const leaderboard = [
    { rank: 1, name: "Emma Explorer", avatar: "/api/placeholder/32/32", points: 15420, hunts: 34, badges: 12 },
    { rank: 2, name: "Adventure Alex", avatar: "/api/placeholder/32/32", points: 14850, hunts: 31, badges: 11 },
    { rank: 3, name: "Quest Queen Sarah", avatar: "/api/placeholder/32/32", points: 13240, hunts: 28, badges: 10 },
    { rank: 4, name: "Treasure Tom", avatar: "/api/placeholder/32/32", points: 12680, hunts: 26, badges: 9 },
    { rank: 5, name: "Mystery Mike", avatar: "/api/placeholder/32/32", points: 11950, hunts: 24, badges: 8 }
  ];

  const achievements = [
    { name: "First Steps", description: "Complete your first AR hunt", icon: "👣", earned: true },
    { name: "Speed Demon", description: "Complete a hunt in under 30 minutes", icon: "⚡", earned: true },
    { name: "Explorer", description: "Complete 10 different hunts", icon: "🗺️", earned: true },
    { name: "Master Hunter", description: "Complete 25 hunts", icon: "🏆", earned: false },
    { name: "Legend", description: "Complete 50 hunts", icon: "👑", earned: false },
    { name: "City Expert", description: "Complete hunts in 5 different districts", icon: "🏙️", earned: true }
  ];

  const arFeatures = [
    {
      title: "Interactive 3D Clues",
      description: "Immersive AR objects that respond to your touch and movement",
      icon: <Sparkles className="h-6 w-6" />
    },
    {
      title: "GPS-Based Navigation", 
      description: "Precise location tracking with AR waypoint overlays",
      icon: <Navigation className="h-6 w-6" />
    },
    {
      title: "QR Code Integration",
      description: "Scan QR codes to unlock hidden AR content at businesses",
      icon: <QrCode className="h-6 w-6" />
    },
    {
      title: "Social Sharing",
      description: "Capture and share AR moments with friends and teams",
      icon: <Camera className="h-6 w-6" />
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white">
              <TreasureIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AR Treasure Hunts
              </h1>
              <p className="text-gray-600 text-lg mt-1">
                City-wide augmented reality adventures with immersive storytelling and business discovery
              </p>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100">Hunts Completed</p>
                    <p className="text-3xl font-bold">17</p>
                    <p className="text-sm text-blue-100">+3 this month</p>
                  </div>
                  <Trophy className="h-12 w-12 text-blue-100" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100">AR Points</p>
                    <p className="text-3xl font-bold">8,450</p>
                    <p className="text-sm text-purple-100">+1,200 this week</p>
                  </div>
                  <Star className="h-12 w-12 text-purple-100" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-pink-500 to-pink-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-pink-100">Global Rank</p>
                    <p className="text-3xl font-bold">#24</p>
                    <p className="text-sm text-pink-100">in city leaderboard</p>
                  </div>
                  <Crown className="h-12 w-12 text-pink-100" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100">Badges Earned</p>
                    <p className="text-3xl font-bold">9</p>
                    <p className="text-sm text-orange-100">6 more to unlock</p>
                  </div>
                  <Award className="h-12 w-12 text-orange-100" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* AR Hunt Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto">
            <TabsTrigger value="discover" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Discover Hunts
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Active Hunts
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="achievements" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Achievements
            </TabsTrigger>
            <TabsTrigger value="ar-features" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AR Features
            </TabsTrigger>
          </TabsList>

          {/* Discover Hunts */}
          <TabsContent value="discover" className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <Select value={huntFilter} onValueChange={setHuntFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter hunts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available Now</SelectItem>
                    <SelectItem value="featured">Featured</SelectItem>
                    <SelectItem value="new">New This Week</SelectItem>
                    <SelectItem value="popular">Most Popular</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                Create Hunt
                <Sparkles className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {availableHunts.map((hunt) => (
                <Card key={hunt.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="relative">
                    <div className="h-48 bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center">
                      <div className="text-white text-center">
                        <TreasureIcon className="h-12 w-12 mx-auto mb-2" />
                        <p className="text-sm opacity-80">{hunt.type} Adventure</p>
                      </div>
                    </div>
                    <div className="absolute top-4 right-4">
                      <Badge variant={hunt.status === "Featured" ? "default" : "secondary"} 
                             className={hunt.status === "Featured" ? "bg-yellow-500" : ""}>
                        {hunt.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{hunt.title}</h3>
                        <p className="text-gray-600 text-sm mb-3">{hunt.description}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <span>{hunt.duration}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-purple-500" />
                          <span>{hunt.stops} stops</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-green-500" />
                          <span>{hunt.distance}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-orange-500" />
                          <span>{hunt.participants}</span>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Gift className="h-4 w-4 text-purple-500" />
                          <span className="text-sm font-medium">Hunt Reward</span>
                        </div>
                        <p className="text-sm text-gray-600">{hunt.reward}</p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {[1,2,3,4,5].map((star) => (
                              <Star key={star} className={`h-4 w-4 ${
                                star <= hunt.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                              }`} />
                            ))}
                          </div>
                          <span className="text-sm text-gray-500">({hunt.rating})</span>
                        </div>
                        <Badge variant="outline" className={`${
                          hunt.difficulty === "Easy" ? "text-green-600 border-green-300" :
                          hunt.difficulty === "Medium" ? "text-yellow-600 border-yellow-300" :
                          "text-red-600 border-red-300"
                        }`}>
                          {hunt.difficulty}
                        </Badge>
                      </div>

                      <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                             onClick={() => setSelectedHunt(hunt)}>
                        Start AR Hunt
                        <Play className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Active Hunts */}
          <TabsContent value="active" className="space-y-6">
            {activeHunts.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {activeHunts.map((hunt) => (
                  <Card key={hunt.id} className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{hunt.title}</CardTitle>
                        <Badge className="bg-blue-100 text-blue-700">In Progress</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Progress</span>
                            <span>{hunt.currentStop}/{hunt.totalStops} stops</span>
                          </div>
                          <Progress value={hunt.progress} className="h-3" />
                        </div>

                        <div className="bg-blue-50 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Eye className="h-4 w-4 text-blue-500" />
                            <span className="font-medium text-sm">Next AR Clue</span>
                          </div>
                          <p className="text-sm text-gray-700">{hunt.nextClue}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-medium">Current Location</p>
                            <p className="text-gray-600">{hunt.location}</p>
                          </div>
                          <div>
                            <p className="font-medium">Time Elapsed</p>
                            <p className="text-gray-600">{hunt.timeElapsed}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="font-medium text-purple-600">{hunt.points} points</span>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Pause className="h-4 w-4" />
                            </Button>
                            <Button size="sm" className="bg-blue-500 text-white">
                              Continue Hunt
                              <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Compass className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Active Hunts</h3>
                  <p className="text-gray-600 mb-6">Start your first AR treasure hunt to begin the adventure!</p>
                  <Button onClick={() => setActiveTab("discover")} className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                    Discover Hunts
                    <Search className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Leaderboard */}
          <TabsContent value="leaderboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  AR Hunt Masters Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leaderboard.map((player) => (
                    <div key={player.rank} className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className={`text-2xl font-bold ${
                          player.rank === 1 ? 'text-yellow-500' :
                          player.rank === 2 ? 'text-gray-400' :
                          player.rank === 3 ? 'text-orange-600' : 'text-gray-500'
                        }`}>
                          #{player.rank}
                        </div>
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={player.avatar} />
                          <AvatarFallback>{player.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{player.name}</p>
                          <p className="text-sm text-gray-500">{player.hunts} hunts • {player.badges} badges</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-purple-600">{player.points.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">AR points</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Achievements */}
          <TabsContent value="achievements" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.map((achievement, index) => (
                <Card key={index} className={`${
                  achievement.earned ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200' : 'bg-gray-50'
                }`}>
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-3">{achievement.icon}</div>
                    <h3 className={`font-semibold text-lg mb-2 ${
                      achievement.earned ? 'text-yellow-700' : 'text-gray-600'
                    }`}>
                      {achievement.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">{achievement.description}</p>
                    {achievement.earned ? (
                      <Badge className="bg-yellow-500 text-white">Earned!</Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500">Locked</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* AR Features */}
          <TabsContent value="ar-features" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Immersive AR Technology</h2>
                <div className="space-y-4">
                  {arFeatures.map((feature, index) => (
                    <Card key={index} className="border-l-4 border-l-purple-500">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
                            {feature.icon}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                            <p className="text-gray-600">{feature.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              
              <div className="space-y-6">
                <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
                  <CardContent className="p-8 text-center">
                    <Smartphone className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-4">Download AR Hunt App</h3>
                    <p className="text-gray-600 mb-6">
                      Get the full AR experience with our dedicated mobile app featuring advanced 3D rendering and GPS tracking.
                    </p>
                    <div className="space-y-2">
                      <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                        Download for iOS
                      </Button>
                      <Button className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white">
                        Download for Android
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      AR Hunt Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>Total AR Hunts Created</span>
                        <span className="font-semibold">247</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Active Participants</span>
                        <span className="font-semibold">3,842</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Businesses Featured</span>
                        <span className="font-semibold">156</span>
                      </div>
                      <div className="flex justify-between">
                        <span>AR Experiences Created</span>
                        <span className="font-semibold">1,293</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}