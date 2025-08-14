import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, Gift, Trophy, Users, Zap, Star, Calendar, 
  Camera, Gamepad2, Target, Coins, Crown, ArrowRight,
  Smartphone, Heart, Share2, TrendingUp
} from "lucide-react";

export default function CustomerBento() {
  const [userStats] = useState({
    totalPoints: 2847,
    level: 12,
    badgesEarned: 8,
    businessesVisited: 23,
    streak: 7,
    referrals: 15
  });

  const recentActivity = [
    { business: "Joe's Coffee", reward: "Free Latte", points: 150, time: "2 hours ago", color: "purple" },
    { business: "Tech Store", reward: "10% Discount", points: 200, time: "1 day ago", color: "blue" },
    { business: "Pizza Corner", reward: "Buy 1 Get 1", points: 300, time: "2 days ago", color: "orange" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-green-50/30 dark:from-gray-950 dark:via-blue-950/30 dark:to-green-950/30">
      <div className="container max-w-7xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 bg-clip-text text-transparent">
                Discovery Hub
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Your adventure continues - Level {userStats.level} Explorer
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => window.location.href = '/customer-classic'}
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Classic View
              </Button>
              <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                <Star className="w-3 h-3 mr-1" />
                Level {userStats.level}
              </Badge>
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <Coins className="w-3 h-3 mr-1" />
                {userStats.totalPoints} pts
              </Badge>
            </div>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-8 gap-6 auto-rows-min">
          
          {/* Discover Nearby - Large Hero Block */}
          <Card className="md:col-span-6 lg:col-span-5 bg-gradient-to-br from-blue-500 to-cyan-500 border-0 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-16 -translate-x-16"></div>
            <CardContent className="p-8 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Discover Local Gems</h2>
                  <p className="text-blue-100 text-lg">23 businesses nearby with active rewards</p>
                </div>
                <MapPin className="h-12 w-12 text-blue-100" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm h-auto p-4 justify-start"
                  variant="outline"
                >
                  <div className="flex items-center w-full">
                    <div className="bg-white/20 p-2 rounded-lg mr-3">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">Explore Map</div>
                      <div className="text-sm text-blue-100">Find nearby rewards</div>
                    </div>
                    <ArrowRight className="h-4 w-4 ml-auto" />
                  </div>
                </Button>
                
                <Button 
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm h-auto p-4 justify-start"
                  variant="outline"
                >
                  <div className="flex items-center w-full">
                    <div className="bg-white/20 p-2 rounded-lg mr-3">
                      <Camera className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">Scan Tag</div>
                      <div className="text-sm text-blue-100">Tap & earn rewards</div>
                    </div>
                    <ArrowRight className="h-4 w-4 ml-auto" />
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Points Balance - Tall Block */}
          <Card className="md:col-span-3 lg:col-span-3 md:row-span-2 bg-gradient-to-br from-purple-500 to-pink-500 border-0 text-white">
            <CardContent className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <Coins className="h-8 w-8 text-purple-100" />
                <Badge className="bg-white/20 text-white border-white/30">+{userStats.streak} day streak</Badge>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-purple-100 mb-2">Total Points</h3>
                <div className="text-4xl font-bold mb-4">{userStats.totalPoints.toLocaleString()}</div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-purple-100">Today</span>
                    <span className="font-semibold">+450 pts</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-purple-100">This week</span>
                    <span className="font-semibold">+1,250 pts</span>
                  </div>
                </div>
              </div>
              
              <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30" variant="outline">
                Redeem Rewards
              </Button>
            </CardContent>
          </Card>

          {/* Gaming Hub */}
          <Card className="md:col-span-3 bg-gradient-to-br from-orange-500 to-red-500 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Gamepad2 className="h-6 w-6 text-orange-100" />
                <Badge className="bg-white/20 text-white border-white/30">New!</Badge>
              </div>
              <h3 className="font-semibold mb-1">Cirql Quest</h3>
              <p className="text-orange-100 text-sm mb-4">AR gaming adventures</p>
              <Button 
                size="sm" 
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                variant="outline"
              >
                Play Now
              </Button>
            </CardContent>
          </Card>

          {/* Stats Row */}
          <Card className="md:col-span-2 bg-gradient-to-br from-green-500 to-emerald-500 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Trophy className="h-6 w-6 text-green-100" />
                <Badge className="bg-white/20 text-white border-white/30">#{userStats.level}</Badge>
              </div>
              <div className="text-2xl font-bold">{userStats.badgesEarned}</div>
              <p className="text-green-100 text-sm">Badges Earned</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 bg-gradient-to-br from-yellow-500 to-orange-500 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Target className="h-6 w-6 text-yellow-100" />
                <Badge className="bg-white/20 text-white border-white/30">Active</Badge>
              </div>
              <div className="text-2xl font-bold">{userStats.businessesVisited}</div>
              <p className="text-yellow-100 text-sm">Businesses Visited</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 bg-gradient-to-br from-pink-500 to-purple-500 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Share2 className="h-6 w-6 text-pink-100" />
                <Badge className="bg-white/20 text-white border-white/30">+$50</Badge>
              </div>
              <div className="text-2xl font-bold">{userStats.referrals}</div>
              <p className="text-pink-100 text-sm">Friends Referred</p>
            </CardContent>
          </Card>

          {/* Recent Activity - Wide Block */}
          <Card className="md:col-span-6 lg:col-span-5 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900 dark:text-white">
                <TrendingUp className="h-5 w-5 mr-2 text-purple-600" />
                Recent Rewards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-4 bg-${activity.color}-50 dark:bg-${activity.color}-950/20 rounded-lg`}>
                    <div className="flex items-center">
                      <div className={`w-3 h-3 bg-${activity.color}-500 rounded-full mr-4`}></div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">{activity.business}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{activity.reward}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 dark:text-white">+{activity.points} pts</div>
                      <div className="text-xs text-gray-500">{activity.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="md:col-span-2 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-colors">
            <CardContent className="p-6 text-center">
              <Heart className="h-6 w-6 text-red-600 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">Favorites</h3>
              <p className="text-gray-600 dark:text-gray-400 text-xs">Saved businesses</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
            <CardContent className="p-6 text-center">
              <Calendar className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">Events</h3>
              <p className="text-gray-600 dark:text-gray-400 text-xs">Upcoming deals</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 transition-colors">
            <CardContent className="p-6 text-center">
              <Users className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">Community</h3>
              <p className="text-gray-600 dark:text-gray-400 text-xs">Connect & compete</p>
            </CardContent>
          </Card>

          {/* Achievement Showcase */}
          <Card className="md:col-span-6 lg:col-span-3 bg-gradient-to-br from-indigo-500 to-purple-600 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Achievement Progress</h3>
                <Crown className="h-6 w-6 text-indigo-100" />
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Coffee Connoisseur</span>
                    <span className="text-sm">8/10</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-white h-2 rounded-full" style={{ width: '80%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Social Butterfly</span>
                    <span className="text-sm">15/20</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-white h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Explorer</span>
                    <span className="text-sm">23/50</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-white h-2 rounded-full" style={{ width: '46%' }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}