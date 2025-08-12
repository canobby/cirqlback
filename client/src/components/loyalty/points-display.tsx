import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Crown, Zap, Trophy } from "lucide-react";

interface PointsDisplayProps {
  totalPoints: number;
  availablePoints: number;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum";
  nextTierPoints?: number;
}

export default function PointsDisplay({ 
  totalPoints, 
  availablePoints, 
  tier, 
  nextTierPoints 
}: PointsDisplayProps) {
  const getTierIcon = (tierName: string) => {
    switch (tierName) {
      case "Bronze": return <Star className="h-4 w-4 text-amber-600" />;
      case "Silver": return <Zap className="h-4 w-4 text-gray-500" />;
      case "Gold": return <Crown className="h-4 w-4 text-yellow-500" />;
      case "Platinum": return <Trophy className="h-4 w-4 text-purple-600" />;
      default: return <Star className="h-4 w-4" />;
    }
  };

  const getTierColor = (tierName: string) => {
    switch (tierName) {
      case "Bronze": return "bg-amber-50 text-amber-800 border-amber-200";
      case "Silver": return "bg-gray-50 text-gray-800 border-gray-200";
      case "Gold": return "bg-yellow-50 text-yellow-800 border-yellow-200";
      case "Platinum": return "bg-purple-50 text-purple-800 border-purple-200";
      default: return "bg-gray-50 text-gray-800 border-gray-200";
    }
  };

  const progressToNext = nextTierPoints ? 
    Math.min((totalPoints % nextTierPoints) / nextTierPoints * 100, 100) : 100;

  return (
    <Card className="card-hover glow-effect">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Points Display */}
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text">{availablePoints.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Available Points</div>
            <div className="text-xs text-gray-500 mt-1">
              {totalPoints.toLocaleString()} total earned
            </div>
          </div>

          {/* Tier Display */}
          <div className="flex items-center justify-center space-x-2">
            {getTierIcon(tier)}
            <Badge className={getTierColor(tier)}>
              {tier} Member
            </Badge>
          </div>

          {/* Progress to Next Tier */}
          {nextTierPoints && tier !== "Platinum" && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Progress to next tier</span>
                <span>{Math.round(progressToNext)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="gradient-bg h-2 rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${progressToNext}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 text-center">
                {nextTierPoints - (totalPoints % nextTierPoints)} points to {
                  tier === "Bronze" ? "Silver" : 
                  tier === "Silver" ? "Gold" : "Platinum"
                }
              </div>
            </div>
          )}

          {/* Tier Benefits */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Your Benefits:</div>
            <div className="space-y-1 text-xs text-gray-600">
              {tier === "Bronze" && (
                <>
                  <div>• 1 point per $1 spent</div>
                  <div>• Basic rewards access</div>
                </>
              )}
              {tier === "Silver" && (
                <>
                  <div>• 1.5 points per $1 spent</div>
                  <div>• Early access to challenges</div>
                  <div>• 10% bonus rewards</div>
                </>
              )}
              {tier === "Gold" && (
                <>
                  <div>• 2 points per $1 spent</div>
                  <div>• Exclusive challenges</div>
                  <div>• 20% bonus rewards</div>
                  <div>• Free monthly reward</div>
                </>
              )}
              {tier === "Platinum" && (
                <>
                  <div>• 3 points per $1 spent</div>
                  <div>• VIP challenges & events</div>
                  <div>• 30% bonus rewards</div>
                  <div>• Weekly free rewards</div>
                  <div>• Concierge support</div>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}