import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Zap, 
  Trophy, 
  Users, 
  Target,
  Star,
  Gift,
  Crown,
  ExternalLink,
  Play
} from "lucide-react";

interface ARIntegrationData {
  userLevel: number;
  totalExperience: number;
  nextLevelExp: number;
  activeGames: ARGame[];
  achievements: Achievement[];
  teamStatus: TeamStatus;
  businessIntegrations: BusinessIntegration[];
}

interface ARGame {
  id: string;
  title: string;
  business: string;
  type: "collectible" | "challenge" | "battle" | "exploration";
  progress: number;
  maxProgress: number;
  reward: string;
  status: "active" | "completed" | "locked";
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

interface TeamStatus {
  teamName: string;
  position: number;
  totalTeams: number;
  currentChallenge: string;
  score: number;
}

interface BusinessIntegration {
  businessId: string;
  businessName: string;
  arExperiences: number;
  customCollectibles: number;
  transformationLevel: number;
}

export default function ARIntegrationPanel() {
  const [arData] = useState<ARIntegrationData>({
    userLevel: 23,
    totalExperience: 8750,
    nextLevelExp: 10000,
    activeGames: [
      {
        id: "1",
        title: "Coffee Bean Collector",
        business: "Brew & Bean Coffee",
        type: "collectible",
        progress: 7,
        maxProgress: 10,
        reward: "Golden Coffee Badge",
        status: "active"
      },
      {
        id: "2", 
        title: "Downtown Explorer",
        business: "Multiple Locations",
        type: "exploration",
        progress: 3,
        maxProgress: 5,
        reward: "500 bonus points",
        status: "active"
      },
      {
        id: "3",
        title: "Team Battle Arena",
        business: "Community Challenge",
        type: "battle",
        progress: 1,
        maxProgress: 1,
        reward: "Champion Crown",
        status: "completed"
      }
    ],
    achievements: [
      {
        id: "1",
        title: "First Tap Master",
        description: "Completed your first AR experience",
        icon: "🎯",
        unlockedAt: "2 days ago",
        rarity: "common"
      },
      {
        id: "2",
        title: "Coffee Connoisseur", 
        description: "Collected 50 coffee-themed items",
        icon: "☕",
        unlockedAt: "1 day ago",
        rarity: "rare"
      },
      {
        id: "3",
        title: "Team Champion",
        description: "Led your team to victory in a battle",
        icon: "👑",
        unlockedAt: "3 hours ago",
        rarity: "epic"
      }
    ],
    teamStatus: {
      teamName: "Downtown Explorers",
      position: 3,
      totalTeams: 47,
      currentChallenge: "Holiday Shopping Spree",
      score: 2847
    },
    businessIntegrations: [
      {
        businessId: "1",
        businessName: "Brew & Bean Coffee",
        arExperiences: 4,
        customCollectibles: 12,
        transformationLevel: 3
      },
      {
        businessId: "2",
        businessName: "Pasta Palace",
        arExperiences: 2,
        customCollectibles: 8,
        transformationLevel: 2
      }
    ]
  });

  const levelProgress = (arData.totalExperience / arData.nextLevelExp) * 100;

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common": return "text-gray-600";
      case "rare": return "text-blue-600";
      case "epic": return "text-purple-600";
      case "legendary": return "text-orange-600";
      default: return "text-gray-600";
    }
  };

  const getGameTypeIcon = (type: string) => {
    switch (type) {
      case "collectible": return <Gift className="h-4 w-4 text-green-600" />;
      case "challenge": return <Target className="h-4 w-4 text-blue-600" />;
      case "battle": return <Trophy className="h-4 w-4 text-red-600" />;
      case "exploration": return <Star className="h-4 w-4 text-purple-600" />;
      default: return <Zap className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* AR Level Status */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-6 w-6 mr-2 text-purple-600" />
            AR Avatar Level {arData.userLevel}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Experience</span>
            <span className="text-sm font-medium">{arData.totalExperience.toLocaleString()} / {arData.nextLevelExp.toLocaleString()}</span>
          </div>
          <Progress value={levelProgress} className="h-3" />
          <div className="text-center">
            <Button 
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              onClick={() => window.location.href = '/ar-hub'}
            >
              <Play className="h-4 w-4 mr-2" />
              Launch AR Hub
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active AR Games */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2 text-blue-600" />
            Active AR Experiences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {arData.activeGames.map(game => (
            <div key={game.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getGameTypeIcon(game.type)}
                  <span className="font-semibold">{game.title}</span>
                  <Badge variant={game.status === "completed" ? "default" : "secondary"}>
                    {game.status}
                  </Badge>
                </div>
                <Button size="sm" variant="outline">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Play
                </Button>
              </div>
              <div className="text-sm text-gray-600 mb-2">{game.business}</div>
              <div className="flex items-center justify-between">
                <Progress value={(game.progress / game.maxProgress) * 100} className="flex-1 mr-3 h-2" />
                <span className="text-xs text-gray-500">{game.progress}/{game.maxProgress}</span>
              </div>
              <div className="text-xs text-green-600 mt-1">Reward: {game.reward}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Team Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2 text-green-600" />
            Team Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold">{arData.teamStatus.teamName}</div>
              <div className="text-sm text-gray-600">#{arData.teamStatus.position} of {arData.teamStatus.totalTeams} teams</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-green-600">{arData.teamStatus.score.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Team Score</div>
            </div>
          </div>
          
          <div className="bg-green-50 p-3 rounded-lg mb-3">
            <div className="font-medium text-green-800">Current Challenge</div>
            <div className="text-sm text-green-700">{arData.teamStatus.currentChallenge}</div>
          </div>
          
          <Button variant="outline" className="w-full">
            <Trophy className="h-4 w-4 mr-2" />
            View Team Leaderboard
          </Button>
        </CardContent>
      </Card>

      {/* Recent Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Crown className="h-5 w-5 mr-2 text-orange-600" />
            Recent Achievements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {arData.achievements.slice(0, 3).map(achievement => (
            <div key={achievement.id} className="flex items-center space-x-3 p-2 border rounded-lg">
              <div className="text-2xl">{achievement.icon}</div>
              <div className="flex-1">
                <div className="font-semibold flex items-center space-x-2">
                  <span>{achievement.title}</span>
                  <Badge className={getRarityColor(achievement.rarity)}>
                    {achievement.rarity}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">{achievement.description}</div>
                <div className="text-xs text-gray-500">{achievement.unlockedAt}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Business Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Star className="h-5 w-5 mr-2 text-yellow-600" />
            Business AR Integrations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {arData.businessIntegrations.map(integration => (
            <div key={integration.businessId} className="p-3 border rounded-lg">
              <div className="font-semibold mb-2">{integration.businessName}</div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-center">
                  <div className="font-bold text-blue-600">{integration.arExperiences}</div>
                  <div className="text-xs text-gray-600">AR Games</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-green-600">{integration.customCollectibles}</div>
                  <div className="text-xs text-gray-600">Collectibles</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-purple-600">Level {integration.transformationLevel}</div>
                  <div className="text-xs text-gray-600">Transform</div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}