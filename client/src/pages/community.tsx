import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Trophy, MapPin, Gift, Star, Clock, TrendingUp, Zap } from "lucide-react";

export default function Community() {
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);

  const leaderboard = [
    { rank: 1, name: "Sarah M.", points: 2847, streak: 15, avatar: "🏆" },
    { rank: 2, name: "Mike R.", points: 2156, streak: 12, avatar: "🥈" },
    { rank: 3, name: "Jennifer L.", points: 1923, streak: 9, avatar: "🥉" },
    { rank: 4, name: "Chris K.", points: 1654, streak: 7, avatar: "⭐" },
    { rank: 5, name: "Alex P.", points: 1432, streak: 5, avatar: "🎯" }
  ];

  const challenges = [
    {
      id: "coffee-crawl",
      title: "☕ Downtown Coffee Crawl",
      description: "Visit 5 coffee shops in downtown area",
      reward: "$25 bonus + exclusive mug",
      participants: 143,
      timeLeft: "3 days",
      difficulty: "Medium",
      progress: 2,
      total: 5
    },
    {
      id: "weekend-warrior",
      title: "🎉 Weekend Warrior",
      description: "Make 10 taps this weekend",
      reward: "$15 bonus + surprise gift",
      participants: 89,
      timeLeft: "2 days",
      difficulty: "Easy",
      progress: 7,
      total: 10
    },
    {
      id: "foodie-friday",
      title: "🍕 Foodie Friday",
      description: "Try 3 different restaurants today",
      reward: "Free dessert + $10 credit",
      participants: 67,
      timeLeft: "18 hours",
      difficulty: "Hard",
      progress: 1,
      total: 3
    }
  ];

  const socialFeed = [
    {
      user: "Sarah M.",
      action: "completed Downtown Coffee Crawl",
      reward: "$25 bonus",
      time: "2 hours ago",
      likes: 23,
      avatar: "☕"
    },
    {
      user: "Mike R.",
      action: "reached 15-day streak milestone",
      reward: "Gold status",
      time: "4 hours ago",
      likes: 18,
      avatar: "🔥"
    },
    {
      user: "Jennifer L.",
      action: "referred 3 friends this week",
      reward: "$15 earned",
      time: "6 hours ago",
      likes: 31,
      avatar: "👥"
    }
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold gradient-text mb-4">Community Hub</h1>
        <p className="text-xl text-gray-600">Compete, connect, and earn together</p>
      </div>

      <Tabs defaultValue="challenges" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="social">Social Feed</TabsTrigger>
          <TabsTrigger value="rewards">Group Rewards</TabsTrigger>
        </TabsList>

        <TabsContent value="challenges" className="space-y-6">
          <div className="grid gap-6">
            {challenges.map((challenge) => (
              <Card key={challenge.id} className="card-hover glow-effect">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="gradient-text">{challenge.title}</CardTitle>
                      <p className="text-gray-600 mt-2">{challenge.description}</p>
                    </div>
                    <Badge variant="outline" className="ml-4">
                      {challenge.difficulty}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium">{challenge.progress}/{challenge.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="gradient-bg h-3 rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${(challenge.progress / challenge.total) * 100}%` }}
                      ></div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-center text-sm">
                      <div>
                        <div className="font-bold text-green-600">{challenge.reward}</div>
                        <div className="text-gray-500">Reward</div>
                      </div>
                      <div>
                        <div className="font-bold text-blue-600">{challenge.participants}</div>
                        <div className="text-gray-500">Participants</div>
                      </div>
                      <div>
                        <div className="font-bold text-red-600">{challenge.timeLeft}</div>
                        <div className="text-gray-500">Time Left</div>
                      </div>
                    </div>

                    <Button className="w-full gradient-bg border-0 text-white">
                      <Zap className="mr-2 h-4 w-4" />
                      Join Challenge
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-6">
          <Card className="card-hover glow-effect">
            <CardHeader>
              <CardTitle className="gradient-text">🏆 Weekly Champions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaderboard.map((user) => (
                  <div key={user.rank} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border floating-animation" style={{ animationDelay: `${user.rank * 0.1}s` }}>
                    <div className="text-2xl">{user.avatar}</div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">#{user.rank}</span>
                        <span className="font-medium">{user.name}</span>
                        {user.rank <= 3 && <Badge variant="outline">Top 3</Badge>}
                      </div>
                      <div className="text-sm text-gray-600">
                        {user.points.toLocaleString()} points • {user.streak} day streak
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold gradient-text">{user.points.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">points</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-6">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="gradient-text">🎉 Community Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {socialFeed.map((post, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border floating-animation" style={{ animationDelay: `${index * 0.2}s` }}>
                    <div className="text-2xl">{post.avatar}</div>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{post.user}</span> {post.action}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="secondary">{post.reward}</Badge>
                        <span className="text-xs text-gray-500">{post.time}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Star className="h-3 w-3" />
                      <span>{post.likes}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="card-hover glow-effect">
              <CardHeader>
                <CardTitle className="gradient-text">🎯 Community Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">1000 Taps Goal</h4>
                    <div className="w-full bg-green-200 rounded-full h-3 mb-2">
                      <div className="bg-green-500 h-3 rounded-full" style={{ width: "73%" }}></div>
                    </div>
                    <p className="text-sm text-green-600">730/1000 taps • Unlock $500 community bonus</p>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">100 New Members</h4>
                    <div className="w-full bg-blue-200 rounded-full h-3 mb-2">
                      <div className="bg-blue-500 h-3 rounded-full" style={{ width: "45%" }}></div>
                    </div>
                    <p className="text-sm text-blue-600">45/100 members • Everyone gets $10 bonus</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover glow-effect">
              <CardHeader>
                <CardTitle className="gradient-text">💰 Group Achievements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                    <Trophy className="h-6 w-6 text-yellow-600" />
                    <div>
                      <div className="font-medium text-yellow-800">Coffee Champions</div>
                      <div className="text-sm text-yellow-600">Unlocked $250 group bonus</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                    <Users className="h-6 w-6 text-purple-600" />
                    <div>
                      <div className="font-medium text-purple-800">Referral Masters</div>
                      <div className="text-sm text-purple-600">Everyone earned $15 bonus</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                    <div>
                      <div className="font-medium text-green-800">Growth Milestone</div>
                      <div className="text-sm text-green-600">500 members reached!</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}