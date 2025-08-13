import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Trophy, 
  Star, 
  Zap, 
  Target, 
  Gift, 
  Sword, 
  Shield,
  Crown,
  Gem,
  Sparkles,
  MapPin,
  Users,
  Clock,
  TrendingUp,
  Award,
  Gamepad2,
  Flame,
  Bolt,
  Heart,
  Diamond
} from "lucide-react";

interface QuestItem {
  id: string;
  name: string;
  type: 'common' | 'rare' | 'epic' | 'legendary';
  rarity: number;
  power: number;
  description: string;
  unlockMethod: string;
  category: 'charm' | 'power' | 'luck' | 'speed';
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  progress: number;
  target: number;
  reward: string;
  completed: boolean;
  category: string;
}

export default function CirqlQuest() {
  const [activeTab, setActiveTab] = useState("collection");
  const [selectedItem, setSelectedItem] = useState<QuestItem | null>(null);
  const queryClient = useQueryClient();

  const { data: playerStats } = useQuery({
    queryKey: ["/api/quest/player-stats"],
    retry: 1,
  });

  const { data: collection } = useQuery({
    queryKey: ["/api/quest/collection"],
    retry: 1,
  });

  const { data: achievements } = useQuery({
    queryKey: ["/api/quest/achievements"],
    retry: 1,
  });

  const { data: leaderboard } = useQuery({
    queryKey: ["/api/quest/leaderboard"],
    retry: 1,
  });

  const { data: dailyQuests } = useQuery({
    queryKey: ["/api/quest/daily-quests"],
    retry: 1,
  });

  const claimRewardMutation = useMutation({
    mutationFn: async (achievementId: string) => {
      const response = await apiRequest("POST", "/api/quest/claim-reward", { achievementId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quest"] });
    },
  });

  const getRarityColor = (type: string) => {
    switch (type) {
      case 'legendary': return 'from-yellow-400 to-orange-500';
      case 'epic': return 'from-purple-400 to-pink-500';
      case 'rare': return 'from-blue-400 to-cyan-500';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  const getRarityBorder = (type: string) => {
    switch (type) {
      case 'legendary': return 'border-yellow-400 shadow-yellow-300';
      case 'epic': return 'border-purple-400 shadow-purple-300';
      case 'rare': return 'border-blue-400 shadow-blue-300';
      default: return 'border-gray-300 shadow-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Player Header */}
        <Card className="mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <Crown className="h-8 w-8 text-yellow-300" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Quest Master {playerStats?.username || 'Explorer'}</h2>
                  <p className="text-indigo-200">Level {playerStats?.level || 1} • {playerStats?.totalPoints || 0} Quest Points</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{playerStats?.questStreak || 0}</div>
                <div className="text-sm text-indigo-200">Day Streak</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Level Progress</span>
                <span>{playerStats?.levelProgress || 0}%</span>
              </div>
              <Progress value={playerStats?.levelProgress || 0} className="h-2 bg-white/20" />
            </div>
          </CardHeader>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="text-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100">
            <Gem className="h-6 w-6 mx-auto mb-2 text-emerald-600" />
            <div className="text-2xl font-bold text-emerald-700">{collection?.totalItems || 0}</div>
            <div className="text-sm text-emerald-600">Items Collected</div>
          </Card>
          
          <Card className="text-center p-4 bg-gradient-to-br from-amber-50 to-amber-100">
            <Trophy className="h-6 w-6 mx-auto mb-2 text-amber-600" />
            <div className="text-2xl font-bold text-amber-700">{achievements?.completed || 0}</div>
            <div className="text-sm text-amber-600">Achievements</div>
          </Card>
          
          <Card className="text-center p-4 bg-gradient-to-br from-rose-50 to-rose-100">
            <MapPin className="h-6 w-6 mx-auto mb-2 text-rose-600" />
            <div className="text-2xl font-bold text-rose-700">{playerStats?.businessesVisited || 0}</div>
            <div className="text-sm text-rose-600">Businesses Visited</div>
          </Card>
          
          <Card className="text-center p-4 bg-gradient-to-br from-violet-50 to-violet-100">
            <Users className="h-6 w-6 mx-auto mb-2 text-violet-600" />
            <div className="text-2xl font-bold text-violet-700">#{playerStats?.leaderboardRank || '--'}</div>
            <div className="text-sm text-violet-600">Global Rank</div>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="collection">Collection</TabsTrigger>
            <TabsTrigger value="daily-quests">Daily Quests</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="crafting">Crafting</TabsTrigger>
          </TabsList>

          {/* Collection Tab */}
          <TabsContent value="collection" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gem className="h-5 w-5" />
                  Your Quest Collection
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Collect rare items by visiting local businesses and completing quests
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {collection?.items?.map((item: QuestItem) => (
                    <Card 
                      key={item.id}
                      className={`cursor-pointer transition-all hover:scale-105 border-2 shadow-lg ${getRarityBorder(item.type)}`}
                      onClick={() => setSelectedItem(item)}
                    >
                      <CardContent className="p-3 text-center">
                        <div className={`w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br ${getRarityColor(item.type)} flex items-center justify-center`}>
                          {item.category === 'charm' && <Sparkles className="h-6 w-6 text-white" />}
                          {item.category === 'power' && <Sword className="h-6 w-6 text-white" />}
                          {item.category === 'luck' && <Star className="h-6 w-6 text-white" />}
                          {item.category === 'speed' && <Bolt className="h-6 w-6 text-white" />}
                        </div>
                        <h4 className="font-semibold text-xs">{item.name}</h4>
                        <Badge className={`text-xs mt-1 bg-gradient-to-r ${getRarityColor(item.type)}`}>
                          {item.type}
                        </Badge>
                        <div className="text-xs text-gray-600 mt-1">
                          Power: {item.power}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {/* Empty Slots */}
                  {Array.from({ length: Math.max(0, 24 - (collection?.items?.length || 0)) }).map((_, index) => (
                    <Card key={`empty-${index}`} className="border-dashed border-gray-300">
                      <CardContent className="p-3 text-center">
                        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gray-200 flex items-center justify-center">
                          <Target className="h-6 w-6 text-gray-400" />
                        </div>
                        <div className="text-xs text-gray-400">Empty Slot</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Daily Quests Tab */}
          <TabsContent value="daily-quests" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Daily Quests
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Complete daily challenges to earn rare rewards and boost your streak
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {dailyQuests?.map((quest: any) => (
                  <Card key={quest.id} className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                          <Target className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{quest.title}</h4>
                          <p className="text-sm text-gray-600">{quest.description}</p>
                          <div className="flex items-center mt-1">
                            <Progress value={quest.progress} className="w-32 h-2 mr-2" />
                            <span className="text-xs text-gray-500">
                              {quest.currentCount}/{quest.targetCount}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-cyan-600">+{quest.reward}</div>
                        <div className="text-xs text-gray-500">Quest Points</div>
                        {quest.completed && (
                          <Button size="sm" className="mt-2 bg-gradient-to-r from-emerald-500 to-green-500">
                            <Gift className="h-4 w-4 mr-1" />
                            Claim
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievements?.list?.map((achievement: Achievement) => (
                    <Card 
                      key={achievement.id} 
                      className={`p-4 ${achievement.completed ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200' : 'bg-gray-50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            achievement.completed ? 'bg-gradient-to-br from-emerald-500 to-green-500' : 'bg-gray-300'
                          }`}>
                            <Award className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{achievement.name}</h4>
                            <p className="text-sm text-gray-600">{achievement.description}</p>
                            <Progress value={(achievement.progress / achievement.target) * 100} className="w-32 h-2 mt-2" />
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-purple-600">{achievement.reward}</div>
                          {achievement.completed && (
                            <Button 
                              size="sm" 
                              className="mt-2 bg-gradient-to-r from-emerald-500 to-green-500"
                              onClick={() => claimRewardMutation.mutate(achievement.id)}
                            >
                              <Gift className="h-4 w-4 mr-1" />
                              Claim
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Global Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leaderboard?.map((player: any, index: number) => (
                    <div 
                      key={player.id} 
                      className={`flex items-center p-3 rounded-lg ${
                        index < 3 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200' : 'bg-gray-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' : 
                        index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                      }`}>
                        <span className="text-white font-bold text-sm">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{player.username}</div>
                        <div className="text-sm text-gray-600">Level {player.level}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-purple-600">{player.questPoints}</div>
                        <div className="text-xs text-gray-500">Quest Points</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Crafting Tab */}
          <TabsContent value="crafting" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5" />
                  Item Crafting & Fusion
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Combine items to create more powerful quest gear
                </p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                    <Sparkles className="h-12 w-12 text-purple-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Crafting System Coming Soon!</h3>
                  <p className="text-gray-600 mb-4">
                    Fuse your collected items to create legendary gear with enhanced powers
                  </p>
                  <Button className="bg-gradient-to-r from-purple-500 to-pink-500">
                    <Flame className="h-4 w-4 mr-2" />
                    Notify Me When Available
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Item Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getRarityColor(selectedItem.type)} flex items-center justify-center`}>
                  {selectedItem.category === 'charm' && <Sparkles className="h-4 w-4 text-white" />}
                  {selectedItem.category === 'power' && <Sword className="h-4 w-4 text-white" />}
                  {selectedItem.category === 'luck' && <Star className="h-4 w-4 text-white" />}
                  {selectedItem.category === 'speed' && <Bolt className="h-4 w-4 text-white" />}
                </div>
                {selectedItem.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <Badge className={`bg-gradient-to-r ${getRarityColor(selectedItem.type)} text-white`}>
                  {selectedItem.type.toUpperCase()}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Power:</span>
                  <span className="font-semibold">{selectedItem.power}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rarity:</span>
                  <span className="font-semibold">{selectedItem.rarity}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Category:</span>
                  <span className="font-semibold capitalize">{selectedItem.category}</span>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-1">Description:</h4>
                <p className="text-sm text-gray-600">{selectedItem.description}</p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-1">How to Unlock:</h4>
                <p className="text-sm text-gray-600">{selectedItem.unlockMethod}</p>
              </div>
              
              <Button 
                onClick={() => setSelectedItem(null)}
                className="w-full"
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}