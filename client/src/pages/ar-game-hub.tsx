import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Smartphone, Gamepad2, Zap, Star, Crown, Gem, Award, Camera, MapPin, Target, Trophy, Clock, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ARGame {
  id: string;
  title: string;
  description: string;
  style: 'pokemon-go' | 'minecraft' | 'fortnite' | 'candy-crush';
  difficulty: 'easy' | 'medium' | 'hard';
  merchantReward: number;
  customerReward: number;
  estimatedTime: string;
  playerCount: number;
  isActive: boolean;
}

interface MerchantMission {
  id: string;
  businessName: string;
  missionType: 'ar-treasure' | 'social-challenge' | 'team-quest' | 'mystery-box';
  reward: number;
  timeLimit: string;
  participants: number;
  maxParticipants: number;
  description: string;
}

export default function ARGameHub() {
  const [selectedStyle, setSelectedStyle] = useState<string>('pokemon-go');
  const [activeGame, setActiveGame] = useState<ARGame | null>(null);
  const queryClient = useQueryClient();

  // Mock data for AR Games - these would integrate with real AR frameworks
  const arGames: ARGame[] = [
    {
      id: 'treasure_hunt_1',
      title: '🗺️ Local Treasure Hunt',
      description: 'Find hidden AR treasures at partner businesses using your camera',
      style: 'pokemon-go',
      difficulty: 'easy',
      merchantReward: 500,
      customerReward: 250,
      estimatedTime: '15-30 min',
      playerCount: 847,
      isActive: true
    },
    {
      id: 'build_challenge_1',
      title: '🏗️ Business Builder Challenge',
      description: 'Help businesses build virtual storefronts in AR space',
      style: 'minecraft',
      difficulty: 'medium',
      merchantReward: 1000,
      customerReward: 400,
      estimatedTime: '30-45 min',
      playerCount: 623,
      isActive: true
    },
    {
      id: 'battle_royale_1',
      title: '⚔️ Merchant Battle Royale',
      description: 'Team up with local businesses in competitive AR challenges',
      style: 'fortnite',
      difficulty: 'hard',
      merchantReward: 2000,
      customerReward: 800,
      estimatedTime: '45-60 min',
      playerCount: 392,
      isActive: true
    },
    {
      id: 'puzzle_match_1',
      title: '🍬 Business Puzzle Match',
      description: 'Match business logos and products in addictive puzzle games',
      style: 'candy-crush',
      difficulty: 'easy',
      merchantReward: 300,
      customerReward: 150,
      estimatedTime: '10-20 min',
      playerCount: 1234,
      isActive: true
    }
  ];

  const merchantMissions: MerchantMission[] = [
    {
      id: 'mission_1',
      businessName: "Joe's Coffee Shop",
      missionType: 'ar-treasure',
      reward: 500,
      timeLimit: '2 hours',
      participants: 23,
      maxParticipants: 50,
      description: 'Find the hidden golden coffee bean in our AR experience'
    },
    {
      id: 'mission_2', 
      businessName: "Tech Repair Plus",
      missionType: 'mystery-box',
      reward: 800,
      timeLimit: '1 day',
      participants: 67,
      maxParticipants: 100,
      description: 'Solve tech puzzles to unlock exclusive repair discounts'
    },
    {
      id: 'mission_3',
      businessName: "Local Fitness Gym",
      missionType: 'team-quest',
      reward: 1200,
      timeLimit: '3 days',
      participants: 45,
      maxParticipants: 80,
      description: 'Complete fitness challenges with AR form tracking'
    }
  ];

  const getStyleIcon = (style: string) => {
    switch(style) {
      case 'pokemon-go': return <MapPin className="w-5 h-5" />;
      case 'minecraft': return <Gamepad2 className="w-5 h-5" />;
      case 'fortnite': return <Target className="w-5 h-5" />;
      case 'candy-crush': return <Gem className="w-5 h-5" />;
      default: return <Camera className="w-5 h-5" />;
    }
  };

  const getStyleColor = (style: string) => {
    switch(style) {
      case 'pokemon-go': return 'bg-blue-500';
      case 'minecraft': return 'bg-green-500';
      case 'fortnite': return 'bg-purple-500';
      case 'candy-crush': return 'bg-pink-500';
      default: return 'bg-gray-500';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch(difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const joinGameMutation = useMutation({
    mutationFn: async (gameId: string) => {
      const response = await apiRequest("POST", "/api/ar-games/join", { gameId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ar-games"] });
    },
  });

  const joinMissionMutation = useMutation({
    mutationFn: async (missionId: string) => {
      const response = await apiRequest("POST", "/api/ar-games/join-mission", { missionId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ar-games"] });
    },
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">
          🎮 AR Game Hub - Choose Your Style
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Multiple gaming platforms tied to local merchants. Play your style, earn rewards!
        </p>
        
        {/* Platform Style Selector */}
        <div className="flex justify-center gap-3 mb-6 flex-wrap">
          {['pokemon-go', 'minecraft', 'fortnite', 'candy-crush'].map((style) => (
            <Button
              key={style}
              variant={selectedStyle === style ? "default" : "outline"}
              onClick={() => setSelectedStyle(style)}
              className={`${selectedStyle === style ? getStyleColor(style) + ' text-white' : ''}`}
            >
              {getStyleIcon(style)}
              <span className="ml-2 capitalize">{style.replace('-', ' ')}</span>
            </Button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="ar-games" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ar-games">🎯 AR Games</TabsTrigger>
          <TabsTrigger value="merchant-missions">🏪 Merchant Missions</TabsTrigger>
          <TabsTrigger value="leaderboards">🏆 Leaderboards</TabsTrigger>
        </TabsList>

        <TabsContent value="ar-games" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {arGames
              .filter(game => selectedStyle === 'all' || game.style === selectedStyle)
              .map((game) => (
              <Card key={game.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStyleIcon(game.style)}
                      <CardTitle className="text-lg">{game.title}</CardTitle>
                    </div>
                    <Badge className={getDifficultyColor(game.difficulty)}>
                      {game.difficulty}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">{game.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{game.estimatedTime}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{game.playerCount} active</span>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Customer Reward: <strong>+{game.customerReward}</strong></span>
                      <span>Merchant Bonus: <strong>+{game.merchantReward}</strong></span>
                    </div>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={() => joinGameMutation.mutate(game.id)}
                    disabled={joinGameMutation.isPending}
                  >
                    {joinGameMutation.isPending ? 'Joining...' : '🚀 Join Game'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="merchant-missions" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {merchantMissions.map((mission) => (
              <Card key={mission.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{mission.businessName}</CardTitle>
                    <Badge variant="secondary">+{mission.reward} points</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">{mission.description}</p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Participants: {mission.participants}/{mission.maxParticipants}</span>
                      <span>Time Left: {mission.timeLimit}</span>
                    </div>
                    <Progress 
                      value={(mission.participants / mission.maxParticipants) * 100} 
                      className="h-2"
                    />
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={() => joinMissionMutation.mutate(mission.id)}
                    disabled={joinMissionMutation.isPending || mission.participants >= mission.maxParticipants}
                  >
                    {mission.participants >= mission.maxParticipants 
                      ? '🔒 Mission Full' 
                      : joinMissionMutation.isPending 
                        ? 'Joining...' 
                        : '🎯 Join Mission'
                    }
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leaderboards" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Top AR Gamers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { rank: 1, name: 'ARMaster2024', points: 15420, games: 67 },
                    { rank: 2, name: 'LocalHero', points: 12890, games: 54 },
                    { rank: 3, name: 'QuestKing', points: 11230, games: 48 },
                    { rank: 4, name: 'You', points: 8450, games: 32 }
                  ].map((player) => (
                    <div key={player.rank} className={`flex items-center justify-between p-3 rounded-lg ${player.name === 'You' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg">#{player.rank}</span>
                        <div>
                          <p className="font-medium">{player.name}</p>
                          <p className="text-sm text-gray-600">{player.games} games completed</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{player.points.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">AR Points</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-purple-500" />
                  Top Merchants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { rank: 1, name: "Joe's Coffee Shop", engagement: 94, missions: 12 },
                    { rank: 2, name: 'TechRepair Plus', engagement: 89, missions: 8 },
                    { rank: 3, name: 'Local Fitness Gym', engagement: 82, missions: 6 },
                    { rank: 4, name: 'BookStore Corner', engagement: 76, missions: 4 }
                  ].map((merchant) => (
                    <div key={merchant.rank} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg">#{merchant.rank}</span>
                        <div>
                          <p className="font-medium">{merchant.name}</p>
                          <p className="text-sm text-gray-600">{merchant.missions} active missions</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{merchant.engagement}%</p>
                        <p className="text-sm text-gray-600">Engagement</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Stats */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center p-4">
          <Zap className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
          <p className="text-2xl font-bold">847</p>
          <p className="text-sm text-gray-600">Active Players</p>
        </Card>
        <Card className="text-center p-4">
          <Target className="w-8 h-8 mx-auto mb-2 text-blue-500" />
          <p className="text-2xl font-bold">23</p>
          <p className="text-sm text-gray-600">Live Missions</p>
        </Card>
        <Card className="text-center p-4">
          <Crown className="w-8 h-8 mx-auto mb-2 text-purple-500" />
          <p className="text-2xl font-bold">156</p>
          <p className="text-sm text-gray-600">Partner Businesses</p>
        </Card>
        <Card className="text-center p-4">
          <Award className="w-8 h-8 mx-auto mb-2 text-green-500" />
          <p className="text-2xl font-bold">$12.5K</p>
          <p className="text-sm text-gray-600">Rewards Distributed</p>
        </Card>
      </div>
    </div>
  );
}