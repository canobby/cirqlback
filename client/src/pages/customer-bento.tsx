import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function CustomerBento() {
  const [, setLocation] = useLocation();
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
      <div className="responsive-container max-w-7xl mx-auto py-4 sm:py-6 lg:py-8">
        
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="min-w-0 flex-1">
              <h1 className="responsive-heading font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 bg-clip-text text-transparent">
                Discovery Hub
              </h1>
              <p className="text-gray-600 dark:text-gray-400 responsive-text">
                Your adventure continues - Level {userStats.level} Explorer
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                <div className="w-3 h-3 mr-1 bg-blue-500 rounded-full"></div>
                Level {userStats.level}
              </Badge>
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <div className="w-3 h-3 mr-1 bg-yellow-500 rounded-full"></div>
                {userStats.totalPoints} pts
              </Badge>
            </div>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="bento-grid auto-rows-min">
          
          {/* Discover Nearby - Large Hero Block */}
          <Card className="bento-item-large bg-gradient-to-br from-blue-500 to-cyan-500 border-0 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-16 -translate-x-16"></div>
            <CardContent className="responsive-card relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-4 sm:mb-6">
                <div className="min-w-0 flex-1">
                  <h2 className="responsive-heading font-bold mb-2">Discover Local Gems</h2>
                  <p className="text-blue-100 responsive-text">23 businesses nearby with active rewards</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  </div>
                </div>
              </div>
              
              <div className="responsive-button-group">
                <Button 
                  className="constrained-button bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm h-auto p-4 justify-start"
                  variant="outline"
                  onClick={() => setLocation('/map-bento')}
                >
                  <div className="flex items-center w-full">
                    <div className="bg-white/20 p-2 rounded-lg mr-3">
                      <div className="w-5 h-5 bg-green-300 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">View Map</div>
                      <div className="text-sm text-blue-100">Find nearby rewards</div>
                    </div>
                    <div className="w-4 h-4 ml-auto bg-white/30 rounded-full"></div>
                  </div>
                </Button>
                
                <Button 
                  className="constrained-button bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm h-auto p-4 justify-start"
                  variant="outline"
                  onClick={() => setLocation('/nfc-setup-wizard-bento')}
                >
                  <div className="flex items-center w-full">
                    <div className="bg-white/20 p-2 rounded-lg mr-3">
                      <div className="w-5 h-5 bg-yellow-300 rounded-lg flex items-center justify-center">
                        <div className="w-2 h-2 bg-yellow-600 rounded"></div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">Tap to Earn</div>
                      <div className="text-sm text-blue-100">Quick reward scan</div>
                    </div>
                    <div className="w-4 h-4 ml-auto bg-white/30 rounded-full"></div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats Dashboard */}
          <Card className="md:col-span-3 lg:col-span-3 md:row-span-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
            <CardContent className="p-6 h-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Your Progress</h3>
                <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
              
              <div className="space-y-6 flex-1">
                {/* Level Progress */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Level Progress</span>
                    <span className="text-sm text-purple-600 dark:text-purple-400">Level {userStats.level}</span>
                  </div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full" style={{width: '75%'}}></div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{userStats.totalPoints}</div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">Total Points</div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{userStats.badgesEarned}</div>
                    <div className="text-sm text-green-700 dark:text-green-300">Badges Earned</div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{userStats.businessesVisited}</div>
                    <div className="text-sm text-orange-700 dark:text-orange-300">Businesses</div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{userStats.streak}</div>
                    <div className="text-sm text-purple-700 dark:text-purple-300">Day Streak</div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                  <Button 
                    onClick={() => setLocation('/profile')}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                  >
                    <div className="w-4 h-4 mr-2 bg-white/30 rounded-full"></div>
                    Edit Profile
                  </Button>
                  <div
                    onClick={() => setLocation('/settings')}
                    style={{
                      backgroundColor: 'white',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'white'}
                  >
                    <div className="w-4 h-4 mr-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full"></div>
                    Account Settings
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="md:col-span-6 lg:col-span-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-gray-900 dark:text-gray-100">Recent Activity</CardTitle>
                <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 bg-gradient-to-br ${
                        activity.color === 'purple' ? 'from-purple-400 to-purple-600' :
                        activity.color === 'blue' ? 'from-blue-400 to-blue-600' :
                        'from-orange-400 to-orange-600'
                      } rounded-lg flex items-center justify-center mr-4`}>
                        <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{activity.business}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{activity.reward}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">+{activity.points} pts</div>
                      <div className="text-sm text-gray-500">{activity.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Gamification Features */}
          <Card className="md:col-span-3 lg:col-span-3 bg-gradient-to-br from-green-500 to-emerald-600 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Daily Challenges</h3>
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-green-200 rounded-full animate-pulse"></div>
                </div>
              </div>
              <p className="text-green-100 mb-4">Complete challenges to earn bonus rewards and level up faster!</p>
              
              <div className="space-y-3">
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Visit 3 new businesses</span>
                    <span className="text-xs bg-white/20 px-2 py-1 rounded">2/3</span>
                  </div>
                  <div className="bg-white/20 rounded-full h-2">
                    <div className="bg-white h-2 rounded-full" style={{width: '66%'}}></div>
                  </div>
                </div>
                
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Share 1 business review</span>
                    <span className="text-xs bg-green-400 text-green-800 px-2 py-1 rounded">Complete</span>
                  </div>
                  <div className="bg-white/20 rounded-full h-2">
                    <div className="bg-white h-2 rounded-full w-full"></div>
                  </div>
                </div>
                
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Earn 500 points</span>
                    <span className="text-xs bg-white/20 px-2 py-1 rounded">350/500</span>
                  </div>
                  <div className="bg-white/20 rounded-full h-2">
                    <div className="bg-white h-2 rounded-full" style={{width: '70%'}}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leaderboard Preview */}
          <Card className="md:col-span-3 lg:col-span-3 bg-gradient-to-br from-orange-500 to-red-500 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Leaderboard</h3>
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
                </div>
              </div>
              <p className="text-orange-100 mb-4">You're ranked #47 this week!</p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-yellow-900 font-bold mr-3">1</div>
                    <span className="font-medium">Alex_Explorer</span>
                  </div>
                  <span className="text-sm">8,450 pts</span>
                </div>
                
                <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-bold mr-3">2</div>
                    <span className="font-medium">Sarah_Quest</span>
                  </div>
                  <span className="text-sm">7,890 pts</span>
                </div>
                
                <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center text-orange-900 font-bold mr-3">3</div>
                    <span className="font-medium">Mike_Hunter</span>
                  </div>
                  <span className="text-sm">6,230 pts</span>
                </div>
              </div>
              
              <Button 
                onClick={() => setLocation('/community')}
                className="w-full mt-4 bg-white/20 hover:bg-white/30 text-white border-white/30" 
                variant="outline"
              >
                View Full Leaderboard
                <div className="w-4 h-4 ml-2 bg-white/50 rounded-full"></div>
              </Button>
            </CardContent>
          </Card>

          {/* Quick Access Features */}
          <Card className="md:col-span-6 lg:col-span-8 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-center text-gray-900 dark:text-gray-100">Explore More Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button 
                  onClick={() => setLocation('/map-bento')}
                  className="h-20 flex-col gap-2 bg-gradient-to-br from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600"
                >
                  <div className="w-8 h-8 bg-white/30 rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                  </div>
                  <span className="text-sm">Discovery Map</span>
                </Button>
                
                <Button 
                  onClick={() => setLocation('/nfc-setup-wizard-bento')}
                  className="h-20 flex-col gap-2 bg-gradient-to-br from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
                >
                  <div className="w-8 h-8 bg-white/30 rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                  </div>
                  <span className="text-sm">Tap & Earn</span>
                </Button>
                
                <Button 
                  onClick={() => setLocation('/analytics-bento')}
                  className="h-20 flex-col gap-2 bg-gradient-to-br from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                >
                  <div className="w-8 h-8 bg-white/30 rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                  </div>
                  <span className="text-sm">My Progress</span>
                </Button>
                
                <Button 
                  onClick={() => setLocation('/checkout')}
                  className="h-20 flex-col gap-2 bg-gradient-to-br from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600"
                >
                  <div className="w-8 h-8 bg-white/30 rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                  </div>
                  <span className="text-sm">Rewards Store</span>
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}