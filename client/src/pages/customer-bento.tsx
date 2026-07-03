import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuickTranslate } from "@/components/ui/translated-text";
import CustomerFeedPanel from "@/components/messaging/customer-feed-panel";
import MessageCenter from "@/components/messaging/message-center";
import BadgesPanel from "@/components/badges/badges-panel";
import PointsStorePanel from "@/components/points/points-store-panel";
import StreakCard from "@/components/gamification/streak-card";
import ReferralPanel from "@/components/gamification/referral-panel";
import PassportsPanel from "@/components/gamification/passports-panel";
import LeaderboardCard from "@/components/gamification/leaderboard-card";
import SpinWheel from "@/components/gamification/spin-wheel";
import EventBanner from "@/components/gamification/event-banner";

export default function CustomerBento() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Real gamification data (CHR-28), keyed to the signed-in customer.
  const { data: stats } = useQuery<any>({ queryKey: ["/api/user-stats"], retry: false });
  const { data: leaderboard = [] } = useQuery<any[]>({ queryKey: ["/api/leaderboard"], retry: false });
  const { data: challenges = [] } = useQuery<any[]>({ queryKey: ["/api/community/challenges"], retry: false });
  const { data: taps = [] } = useQuery<any[]>({
    queryKey: ["/api/taps", user?.email],
    enabled: !!user?.email,
    retry: false,
    queryFn: async () =>
      (await apiRequest("GET", `/api/taps?customerEmail=${encodeURIComponent(user!.email!)}`)).json(),
  });

  const userStats = {
    totalPoints: stats?.totalPoints ?? 0,
    level: stats?.level ?? 1,
    challengesCompleted: stats?.challengesCompleted ?? 0,
    rank: stats?.rank ?? null,
    streak: stats?.currentStreak ?? 0,
    pointsToNextLevel: stats?.pointsToNextLevel ?? null,
  };
  const recentActivity: any[] = (Array.isArray(taps) ? taps : []).slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-green-50/30 dark:from-gray-950 dark:via-blue-950/30 dark:to-green-950/30">
      <div className="responsive-container max-w-7xl mx-auto py-4 sm:py-6 lg:py-8">
        
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="min-w-0 flex-1">
              <h1 className="responsive-heading font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 bg-clip-text text-transparent">
                <QuickTranslate text="Discovery Hub" />
              </h1>
              <p className="text-gray-600 dark:text-gray-400 responsive-text">
                <QuickTranslate text="Your adventure continues - Level" /> {userStats.level} <QuickTranslate text="Explorer" />
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

        {/* Active seasonal event banner */}
        <EventBanner />

        {/* Daily streak nudge */}
        <StreakCard />

        {/* Daily spin-the-wheel */}
        <SpinWheel />

        {/* Updates: business reminders + admin announcements (Slice 3) */}
        <CustomerFeedPanel />

        {/* Refer friends — both earn on the friend's first tap */}
        <ReferralPanel />

        {/* Passports: collect a set of businesses for bonus points */}
        <PassportsPanel />

        {/* Seasonal leaderboard */}
        <LeaderboardCard title="Leaderboard" />

        {/* Messages: contact a business you follow (Slice 4) */}
        <MessageCenter role="customer" />

        {/* Rewards store: spend your points */}
        <PointsStorePanel />

        {/* Badges: your achievements + give a business a badge */}
        <BadgesPanel mode="customer" />

        {/* Bento Grid Layout */}
        <div className="bento-grid auto-rows-min">
          
          {/* Discover Nearby - Large Hero Block */}
          <Card className="bento-item-large bg-gradient-to-br from-blue-500 to-cyan-500 border-0 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-16 -translate-x-16"></div>
            <CardContent className="responsive-card relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-4 sm:mb-6">
                <div className="min-w-0 flex-1">
                  <h2 className="responsive-heading font-bold mb-2"><QuickTranslate text="Discover Local Gems" /></h2>
                  <p className="text-blue-100 responsive-text"><QuickTranslate text="Local businesses with active rewards" /></p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button 
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm h-14 justify-start text-left"
                  variant="outline"
                  onClick={() => setLocation('/map')}
                >
                  <div className="flex items-center w-full">
                    <div className="bg-white/30 p-2 rounded-lg mr-3 flex-shrink-0">
                      <div className="w-4 h-4 bg-green-400 rounded-full"></div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm"><QuickTranslate text="View Map" /></div>
                      <div className="text-xs text-blue-100 truncate"><QuickTranslate text="Find nearby rewards" /></div>
                    </div>
                  </div>
                </Button>
                
                <Button 
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm h-14 justify-start text-left"
                  variant="outline"
                  onClick={() => setLocation('/tap')}
                >
                  <div className="flex items-center w-full">
                    <div className="bg-white/30 p-2 rounded-lg mr-3 flex-shrink-0">
                      <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm"><QuickTranslate text="Tap to Earn" /></div>
                      <div className="text-xs text-blue-100 truncate"><QuickTranslate text="Quick reward scan" /></div>
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats Dashboard */}
          <Card className="md:col-span-3 lg:col-span-3 md:row-span-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
            <CardContent className="p-6 h-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100"><QuickTranslate text="Your Progress" /></h3>
                <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
              
              <div className="space-y-6 flex-1">
                {/* Level Progress */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300"><QuickTranslate text="Level Progress" /></span>
                    <span className="text-sm text-purple-600 dark:text-purple-400">Level {userStats.level}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {userStats.pointsToNextLevel != null
                      ? `${userStats.pointsToNextLevel} pts to level ${userStats.level + 1}`
                      : "Keep tapping to level up"}
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{userStats.totalPoints}</div>
                    <div className="text-sm text-blue-700 dark:text-blue-300"><QuickTranslate text="Total Points" /></div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{userStats.challengesCompleted}</div>
                    <div className="text-sm text-green-700 dark:text-green-300"><QuickTranslate text="Challenges" /></div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{userStats.rank != null ? `#${userStats.rank}` : "—"}</div>
                    <div className="text-sm text-orange-700 dark:text-orange-300"><QuickTranslate text="Rank" /></div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{userStats.streak}</div>
                    <div className="text-sm text-purple-700 dark:text-purple-300"><QuickTranslate text="Day Streak" /></div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                  <Button 
                    onClick={() => setLocation('/profile')}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                  >
                    <div className="w-4 h-4 mr-2 bg-white/30 rounded-full"></div>
                    <QuickTranslate text="Edit Profile" />
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
                    <QuickTranslate text="Account Settings" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="md:col-span-6 lg:col-span-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-gray-900 dark:text-gray-100"><QuickTranslate text="Recent Activity" /></CardTitle>
                <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.length === 0 && (
                  <p className="text-sm text-gray-500 py-2">
                    No activity yet — tap a Cirql tag at a local business to start earning.
                  </p>
                )}
                {recentActivity.map((tap, index) => (
                  <div key={tap.id ?? index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center mr-4">
                        <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">Tap reward</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {tap.customerName ? `${tap.customerName}` : "Points earned"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">+{tap.pointsEarned ?? 0} pts</div>
                      <div className="text-sm text-gray-500">
                        {tap.createdAt ? new Date(tap.createdAt).toLocaleDateString() : ""}
                      </div>
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
                {(!Array.isArray(challenges) || challenges.length === 0) && (
                  <p className="text-sm text-green-100">No active challenges right now.</p>
                )}
                {(Array.isArray(challenges) ? challenges : []).map((c: any) => {
                  const done = (c.current ?? 0) >= (c.goal ?? 1);
                  const pct = Math.min(100, Math.round(c.progress ?? ((c.current ?? 0) / (c.goal || 1)) * 100));
                  return (
                    <div key={c.id} className="bg-white/10 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">{c.title}</span>
                        <span className={`text-xs px-2 py-1 rounded ${done ? "bg-green-400 text-green-800" : "bg-white/20"}`}>
                          {done ? "Complete" : `${c.current ?? 0}/${c.goal ?? 0}`}
                        </span>
                      </div>
                      <div className="bg-white/20 rounded-full h-2">
                        <div className="bg-white h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
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
              <p className="text-orange-100 mb-4">
                {userStats.rank != null ? `You're ranked #${userStats.rank}!` : "Tap to join the leaderboard!"}
              </p>

              <div className="space-y-3">
                {(!Array.isArray(leaderboard) || leaderboard.length === 0) && (
                  <p className="text-sm text-orange-100">No ranked players yet.</p>
                )}
                {(Array.isArray(leaderboard) ? leaderboard : []).slice(0, 3).map((entry: any, i: number) => (
                  <div key={entry.id ?? i} className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3 ${
                        i === 0 ? "bg-yellow-400 text-yellow-900" : i === 1 ? "bg-gray-300 text-gray-700" : "bg-orange-400 text-orange-900"
                      }`}>{entry.rank ?? i + 1}</div>
                      <span className="font-medium">{entry.name}</span>
                    </div>
                    <span className="text-sm">{(entry.points ?? 0).toLocaleString()} pts</span>
                  </div>
                ))}
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
                  onClick={() => setLocation('/tap')}
                  className="h-20 flex-col gap-2 bg-gradient-to-br from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
                >
                  <div className="w-8 h-8 bg-white/30 rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                  </div>
                  <span className="text-sm">Tap & Earn</span>
                </Button>
                
                <Button 
                  onClick={() => setLocation('/profile')}
                  className="h-20 flex-col gap-2 bg-gradient-to-br from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                >
                  <div className="w-8 h-8 bg-white/30 rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                  </div>
                  <span className="text-sm">My Progress</span>
                </Button>
                
                <Button
                  onClick={() => setLocation('/community')}
                  className="h-20 flex-col gap-2 bg-gradient-to-br from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600"
                >
                  <div className="w-8 h-8 bg-white/30 rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                  </div>
                  <span className="text-sm">Community</span>
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}