import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Trophy, 
  Users, 
  Target, 
  Star,
  Gift,
  Zap,
  Crown,
  Medal,
  Award,
  Share2,
  MessageCircle,
  Heart,
  TrendingUp,
  Clock,
  Copy,
  ExternalLink
} from "lucide-react";

export default function Community() {
  const [activeChallenge, setActiveChallenge] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch community data
  const { data: leaderboard = [], isLoading: leaderboardLoading } = useQuery({
    queryKey: ["/api/leaderboard"],
  });

  const { data: challenges = [], isLoading: challengesLoading } = useQuery({
    queryKey: ["/api/challenges"],
  });

  const { data: socialFeed = [], isLoading: feedLoading } = useQuery({
    queryKey: ["/api/social-feed"],
  });

  const { data: userStats = {}, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/user-stats"],
  });

  // Join challenge mutation
  const joinChallengeMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      return await apiRequest("POST", `/api/challenges/${challengeId}/join`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-stats"] });
      toast({
        title: "Challenge Joined!",
        description: "You're now participating in this challenge. Good luck!",
      });
    },
  });

  // Submit referral code
  const submitReferralMutation = useMutation({
    mutationFn: async (code: string) => {
      return await apiRequest("POST", "/api/referrals/apply", { code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-stats"] });
      setReferralCode("");
      toast({
        title: "Referral Applied!",
        description: "You've earned bonus points and your friend gets credit too!",
      });
    },
    onError: () => {
      toast({
        title: "Invalid Code",
        description: "Please check the referral code and try again.",
        variant: "destructive",
      });
    },
  });

  const copyReferralCode = () => {
    const code = (userStats as any)?.referralCode || "CIRQL2025";
    navigator.clipboard.writeText(code);
    toast({
      title: "Code Copied!",
      description: "Share this code with friends to earn $5 each!",
    });
  };

  const defaultStats = {
    rank: 0,
    totalPoints: 0,
    tier: "Bronze",
    challengesCompleted: 0,
    referralCode: "CIRQL2025",
    earnedThisMonth: 0
  };

  const stats = (userStats as any) || defaultStats;

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Platinum": return "from-purple-500 to-indigo-500";
      case "Gold": return "from-yellow-500 to-orange-500";
      case "Silver": return "from-gray-400 to-gray-500";
      default: return "from-orange-500 to-red-500";
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "Platinum": return Crown;
      case "Gold": return Trophy;
      case "Silver": return Medal;
      default: return Award;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Community Hub
              </h1>
              <p className="text-gray-600 mt-1">Connect, compete, and earn rewards together</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* User Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className={`bg-gradient-to-br ${getTierColor(stats.tier)} text-white`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Your Rank</p>
                  <p className="text-3xl font-bold">#{stats.rank || "—"}</p>
                </div>
                {React.createElement(getTierIcon(stats.tier), { className: "h-8 w-8 text-white/80" })}
              </div>
              <div className="flex items-center mt-4 text-white/80">
                <span className="text-sm">{stats.tier} Tier</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Total Points</p>
                  <p className="text-3xl font-bold">{stats.totalPoints.toLocaleString()}</p>
                </div>
                <Star className="h-8 w-8 text-green-200" />
              </div>
              <div className="flex items-center mt-4 text-green-100">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span className="text-sm">+{stats.earnedThisMonth} this month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Challenges Won</p>
                  <p className="text-3xl font-bold">{stats.challengesCompleted}</p>
                </div>
                <Target className="h-8 w-8 text-blue-200" />
              </div>
              <div className="flex items-center mt-4 text-blue-100">
                <span className="text-sm">Keep going!</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-500 to-rose-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-pink-100 text-sm">Referral Code</p>
                  <p className="text-lg font-bold">{stats.referralCode}</p>
                </div>
                <Gift className="h-8 w-8 text-pink-200" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyReferralCode}
                className="mt-2 text-pink-100 hover:text-white hover:bg-pink-600/20"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy Code
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Community Tabs */}
        <Tabs defaultValue="leaderboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
            <TabsTrigger value="social">Social Feed</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
                  Top Performers This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                {leaderboardLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="animate-pulse flex items-center space-x-4 p-4">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/6"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (leaderboard as any[]).length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">No Rankings Yet</h3>
                    <p>Start earning points to appear on the leaderboard!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(leaderboard as any[]).slice(0, 10).map((user: any, index: number) => (
                      <div key={user.id} className="flex items-center space-x-4 p-4 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="flex items-center justify-center w-8 h-8">
                          {index < 3 ? (
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                              index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-500'
                            }`}>
                              {index + 1}
                            </div>
                          ) : (
                            <span className="text-gray-500 font-medium">#{index + 1}</span>
                          )}
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.tier} • {user.location}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{user.points.toLocaleString()}</p>
                          <p className="text-sm text-gray-500">points</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="challenges" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {challengesLoading ? (
                [1, 2, 3, 4].map(i => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-2 bg-gray-200 rounded w-full"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (challenges as any[]).length === 0 ? (
                <Card className="md:col-span-2">
                  <CardContent className="p-12 text-center text-gray-500">
                    <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">No Active Challenges</h3>
                    <p>New challenges coming soon! Check back later.</p>
                  </CardContent>
                </Card>
              ) : (
                (challenges as any[]).map((challenge: any) => (
                  <Card key={challenge.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{challenge.title}</CardTitle>
                          <p className="text-sm text-gray-600 mt-1">{challenge.description}</p>
                        </div>
                        <Badge variant={challenge.difficulty === 'Easy' ? 'secondary' : challenge.difficulty === 'Medium' ? 'default' : 'destructive'}>
                          {challenge.difficulty}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Progress</span>
                        <span className="font-medium">{challenge.progress}%</span>
                      </div>
                      <Progress value={challenge.progress} className="h-2" />
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {challenge.timeLeft}
                          </span>
                          <span className="flex items-center">
                            <Users className="h-3 w-3 mr-1" />
                            {challenge.participants}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">+{challenge.reward} points</p>
                        </div>
                      </div>
                      
                      <Button 
                        className="w-full"
                        variant={challenge.joined ? "secondary" : "default"}
                        onClick={() => !challenge.joined && joinChallengeMutation.mutate(challenge.id)}
                        disabled={challenge.joined || joinChallengeMutation.isPending}
                      >
                        {challenge.joined ? "Participating" : "Join Challenge"}
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="social" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageCircle className="h-5 w-5 mr-2 text-blue-500" />
                  Community Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {feedLoading ? (
                  <div className="space-y-6">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse flex space-x-4 p-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (socialFeed as any[]).length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">No Activity Yet</h3>
                    <p>Be the first to share your Cirqlback experience!</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(socialFeed as any[]).map((post: any) => (
                      <div key={post.id} className="flex space-x-4 p-4 border border-gray-100 rounded-lg">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={post.author.avatar} />
                          <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-medium">{post.author.name}</p>
                            <Badge variant="outline" className="text-xs">{post.author.tier}</Badge>
                            <span className="text-gray-500 text-sm">•</span>
                            <span className="text-gray-500 text-sm">{post.timeAgo}</span>
                          </div>
                          <p className="text-gray-700 mb-3">{post.content}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <button className="flex items-center space-x-1 hover:text-red-500">
                              <Heart className="h-4 w-4" />
                              <span>{post.likes}</span>
                            </button>
                            <button className="flex items-center space-x-1 hover:text-blue-500">
                              <MessageCircle className="h-4 w-4" />
                              <span>{post.comments}</span>
                            </button>
                            <button className="flex items-center space-x-1 hover:text-green-500">
                              <Share2 className="h-4 w-4" />
                              <span>Share</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referrals" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Gift className="h-5 w-5 mr-2 text-purple-500" />
                    Refer Friends
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Gift className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">$5 for You, $5 for Them!</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      Share your referral code and both you and your friend earn $5 when they make their first Cirql tap!
                    </p>
                    <div className="flex items-center space-x-2 bg-white p-3 rounded-lg border-2 border-dashed border-purple-300">
                      <Input
                        value={(stats as any).referralCode}
                        readOnly
                        className="border-0 bg-transparent text-center font-mono text-lg"
                      />
                      <Button size="sm" onClick={copyReferralCode}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button className="flex-1" variant="outline">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Code
                    </Button>
                    <Button className="flex-1" variant="outline">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Get Link
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                    Apply Referral Code
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600 text-sm">
                    Have a friend's referral code? Enter it here to get bonus points!
                  </p>
                  <div className="space-y-3">
                    <Input
                      placeholder="Enter referral code"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      className="font-mono"
                    />
                    <Button 
                      className="w-full"
                      onClick={() => submitReferralMutation.mutate(referralCode)}
                      disabled={!referralCode || submitReferralMutation.isPending}
                    >
                      {submitReferralMutation.isPending ? "Applying..." : "Apply Code"}
                    </Button>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <Zap className="h-5 w-5 text-yellow-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-800">Bonus Rewards!</h4>
                        <p className="text-yellow-700 text-sm mt-1">
                          Plus 5% lifetime earnings from all your referred friends' activity!
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}