import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Crown, 
  Gift, 
  Star, 
  MapPin, 
  Users, 
  Zap,
  Trophy,
  Target,
  ExternalLink
} from "lucide-react";

interface LoyaltyData {
  tier: "Bronze" | "Silver" | "Gold" | "Platinum";
  points: number;
  nextTierPoints: number;
  totalEarned: number;
  recentActivity: Activity[];
  availableRewards: Reward[];
  nearbyOffers: Offer[];
}

interface Activity {
  id: string;
  type: "tap" | "reward" | "referral" | "achievement";
  description: string;
  points: number;
  timestamp: string;
  business?: string;
}

interface Reward {
  id: string;
  title: string;
  cost: number;
  type: "discount" | "free_item" | "exclusive_access";
  business: string;
  description: string;
}

interface Offer {
  id: string;
  business: string;
  title: string;
  distance: string;
  points: number;
  type: "tap_trail" | "ar_game" | "loyalty";
}

export default function LoyaltyIntegration() {
  const [loyaltyData] = useState<LoyaltyData>({
    tier: "Gold",
    points: 2847,
    nextTierPoints: 5000,
    totalEarned: 12543,
    recentActivity: [
      {
        id: "1",
        type: "tap",
        description: "Tapped at Brew & Bean Coffee",
        points: 50,
        timestamp: "2 hours ago",
        business: "Brew & Bean Coffee"
      },
      {
        id: "2", 
        type: "achievement",
        description: "Coffee Enthusiast achievement unlocked",
        points: 100,
        timestamp: "2 hours ago"
      },
      {
        id: "3",
        type: "referral",
        description: "Friend joined through your referral",
        points: 200,
        timestamp: "1 day ago"
      }
    ],
    availableRewards: [
      {
        id: "1",
        title: "Free Coffee",
        cost: 500,
        type: "free_item",
        business: "Brew & Bean Coffee",
        description: "Any size coffee drink"
      },
      {
        id: "2",
        title: "20% Off Dinner",
        cost: 750,
        type: "discount",
        business: "Pasta Palace",
        description: "Valid for dine-in only"
      }
    ],
    nearbyOffers: [
      {
        id: "1",
        business: "Brew & Bean Coffee",
        title: "Morning Boost Challenge",
        distance: "0.2 miles",
        points: 75,
        type: "ar_game"
      },
      {
        id: "2",
        business: "Local Bookstore",
        title: "Coffee & Books Trail",
        distance: "0.5 miles", 
        points: 150,
        type: "tap_trail"
      }
    ]
  });

  const progressPercentage = (loyaltyData.points / loyaltyData.nextTierPoints) * 100;

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Bronze": return "text-orange-600";
      case "Silver": return "text-gray-600";
      case "Gold": return "text-yellow-600";
      case "Platinum": return "text-purple-600";
      default: return "text-gray-600";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "tap": return <MapPin className="h-4 w-4 text-blue-600" />;
      case "reward": return <Gift className="h-4 w-4 text-green-600" />;
      case "referral": return <Users className="h-4 w-4 text-purple-600" />;
      case "achievement": return <Trophy className="h-4 w-4 text-orange-600" />;
      default: return <Star className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Loyalty Status Card */}
      <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Crown className={`h-6 w-6 mr-2 ${getTierColor(loyaltyData.tier)}`} />
            {loyaltyData.tier} Member Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">{loyaltyData.points.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Current Points</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-gray-700">{loyaltyData.nextTierPoints.toLocaleString()}</div>
              <div className="text-sm text-gray-600">To Platinum</div>
            </div>
          </div>
          
          <Progress value={progressPercentage} className="h-2" />
          
          <div className="flex justify-between text-sm text-gray-600">
            <span>{Math.round(progressPercentage)}% to next tier</span>
            <span>{(loyaltyData.nextTierPoints - loyaltyData.points).toLocaleString()} points needed</span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button 
          className="h-16 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          onClick={() => window.location.href = '/map'}
        >
          <MapPin className="h-5 w-5 mr-2" />
          Find Nearby Deals
        </Button>
        <Button 
          variant="outline" 
          className="h-16 border-2 border-green-300"
          onClick={() => window.location.href = '/ar-hub'}
        >
          <Zap className="h-5 w-5 mr-2 text-green-600" />
          AR Games
        </Button>
      </div>

      {/* Available Rewards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Gift className="h-5 w-5 mr-2 text-green-600" />
            Available Rewards
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loyaltyData.availableRewards.map(reward => (
            <div key={reward.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-semibold">{reward.title}</div>
                <div className="text-sm text-gray-600">{reward.business}</div>
                <div className="text-xs text-gray-500 mt-1">{reward.description}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-green-600">{reward.cost} pts</div>
                <Button size="sm" className="mt-1">
                  Redeem
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Nearby Offers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2 text-blue-600" />
            Nearby Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loyaltyData.nearbyOffers.map(offer => (
            <div key={offer.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <div className="font-semibold">{offer.title}</div>
                <div className="text-sm text-gray-600">{offer.business}</div>
                <div className="text-xs text-blue-600">{offer.distance} away</div>
              </div>
              <div className="text-right">
                <Badge className="bg-blue-100 text-blue-800 mb-1">
                  +{offer.points} pts
                </Badge>
                <Button variant="outline" size="sm" className="block">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Go
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Star className="h-5 w-5 mr-2 text-purple-600" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loyaltyData.recentActivity.map(activity => (
            <div key={activity.id} className="flex items-center space-x-3 p-2">
              {getActivityIcon(activity.type)}
              <div className="flex-1">
                <div className="text-sm font-medium">{activity.description}</div>
                <div className="text-xs text-gray-500">{activity.timestamp}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-green-600">+{activity.points}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}