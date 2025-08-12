import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  Gift, 
  Star, 
  Clock, 
  MapPin, 
  Sparkles,
  Crown,
  Zap,
  Target,
  TrendingUp,
  Calendar,
  CheckCircle,
  ExternalLink
} from "lucide-react";

interface EnhancedRewardsProps {
  customerEmail: string;
}

export default function EnhancedRewards({ customerEmail }: EnhancedRewardsProps) {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: rewards, isLoading } = useQuery({
    queryKey: ["/api/rewards", customerEmail],
    enabled: !!customerEmail,
  });

  const { data: customerStats } = useQuery({
    queryKey: ["/api/user-stats"],
    enabled: !!customerEmail,
  });

  // Mock data for enhanced features
  const personalizedOffers = [
    {
      id: '1',
      business: 'Coffee Corner',
      title: 'Your Favorite Latte - 30% Off',
      description: 'We noticed you love our vanilla lattes! Special discount just for you.',
      discount: 30,
      validUntil: '2025-01-20',
      category: 'coffee',
      personalizedReason: 'Based on your order history'
    },
    {
      id: '2', 
      business: 'Healthy Bites',
      title: 'Free Smoothie Upgrade',
      description: 'Your health-conscious choices earned you a free size upgrade!',
      discount: 0,
      validUntil: '2025-01-25',
      category: 'food',
      personalizedReason: 'Matches your dietary preferences'
    }
  ];

  const nearbyOpportunities = [
    {
      business: 'Tech Gadget Store',
      distance: '0.2 miles',
      reward: '15% off accessories',
      category: 'electronics',
      newCustomerBonus: true
    },
    {
      business: 'Local Bookshop',
      distance: '0.4 miles', 
      reward: 'Buy 2 get 1 free',
      category: 'books',
      newCustomerBonus: false
    }
  ];

  const achievementProgress = [
    {
      title: 'Coffee Connoisseur',
      description: 'Visit 10 different coffee shops',
      progress: 7,
      total: 10,
      reward: '500 bonus points',
      icon: <Star className="h-5 w-5 text-yellow-500" />
    },
    {
      title: 'Local Explorer',
      description: 'Discover 25 new businesses',
      progress: 18,
      total: 25,
      reward: 'Gold tier upgrade',
      icon: <Crown className="h-5 w-5 text-purple-500" />
    },
    {
      title: 'Weekend Warrior',
      description: 'Complete 5 weekend challenges',
      progress: 3,
      total: 5,
      reward: '$10 weekend bonus',
      icon: <Target className="h-5 w-5 text-green-500" />
    }
  ];

  const streak = {
    current: 12,
    best: 28,
    multiplier: 1.5,
    nextReward: 15
  };

  const redeemReward = async (rewardId: string) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      toast({
        title: "Reward Redeemed!",
        description: "Show this confirmation to the merchant.",
      });
    } catch (error) {
      toast({
        title: "Redemption Failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'platinum': return 'from-purple-500 to-indigo-500';
      case 'gold': return 'from-yellow-400 to-yellow-600';
      case 'silver': return 'from-gray-400 to-gray-600';
      default: return 'from-amber-600 to-amber-700';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Customer Status Overview */}
      <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${getTierColor((customerStats as any)?.tier)} flex items-center justify-center mx-auto mb-2`}>
                <Crown className="h-8 w-8 text-white" />
              </div>
              <div className="font-bold text-lg">{(customerStats as any)?.tier || 'Bronze'}</div>
              <div className="text-sm text-gray-600">Current Tier</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{(customerStats as any)?.totalPoints || 2450}</div>
              <div className="text-sm text-gray-600">Total Points</div>
              <div className="text-xs text-green-600">+{(customerStats as any)?.monthlyPoints || 340} this month</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-500">{streak.current}</div>
              <div className="text-sm text-gray-600">Day Streak</div>
              <div className="text-xs text-gray-500">Best: {streak.best} days</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{streak.multiplier}x</div>
              <div className="text-sm text-gray-600">Points Multiplier</div>
              <div className="text-xs text-blue-600">Next at {streak.nextReward} days</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Rewards</TabsTrigger>
          <TabsTrigger value="personalized">For You</TabsTrigger>
          <TabsTrigger value="nearby">Nearby</TabsTrigger>
          <TabsTrigger value="achievements">Progress</TabsTrigger>
        </TabsList>

        {/* All Rewards */}
        <TabsContent value="all" className="space-y-4">
          {rewards && (rewards as any[]).length > 0 ? (
            (rewards as any[]).map((reward: any) => (
              <Card key={reward.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        <Gift className="h-5 w-5 text-purple-500" />
                        {reward.campaignName}
                      </h3>
                      <p className="text-gray-600">{reward.businessName}</p>
                      <p className="text-sm text-gray-500 mt-1">{reward.description}</p>
                    </div>
                    <div className="text-right">
                      <Badge className="mb-2" variant={reward.redeemed ? "secondary" : "default"}>
                        {reward.redeemed ? "Redeemed" : "Available"}
                      </Badge>
                      <div className="text-2xl font-bold text-green-600">
                        ${reward.value}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-1" />
                      Earned {new Date(reward.earnedAt).toLocaleDateString()}
                    </div>
                    {!reward.redeemed && (
                      <Button onClick={() => redeemReward(reward.id)}>
                        Redeem Now
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-gray-500">
                <Gift className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No Rewards Yet</h3>
                <p>Start tapping Cirql tags to earn your first rewards!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Personalized Offers */}
        <TabsContent value="personalized" className="space-y-4">
          {personalizedOffers.map((offer) => (
            <Card key={offer.id} className="border-2 border-purple-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      <Badge variant="outline" className="text-purple-600">
                        Personalized for You
                      </Badge>
                    </div>
                    <h3 className="font-bold text-lg">{offer.title}</h3>
                    <p className="text-gray-600">{offer.business}</p>
                    <p className="text-sm text-gray-500 mt-1">{offer.description}</p>
                    <p className="text-xs text-purple-600 mt-2">{offer.personalizedReason}</p>
                  </div>
                  <div className="text-right">
                    {offer.discount > 0 && (
                      <div className="text-3xl font-bold text-purple-600">
                        {offer.discount}% OFF
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    Valid until {new Date(offer.validUntil).toLocaleDateString()}
                  </div>
                  <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    Get Directions
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Nearby Opportunities */}
        <TabsContent value="nearby" className="space-y-4">
          {nearbyOpportunities.map((opportunity, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-5 w-5 text-blue-500" />
                      <span className="text-sm text-blue-600">{opportunity.distance}</span>
                      {opportunity.newCustomerBonus && (
                        <Badge className="bg-green-100 text-green-800">
                          New Customer Bonus
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-bold text-lg">{opportunity.business}</h3>
                    <p className="text-gray-600">{opportunity.reward}</p>
                  </div>
                  <Badge variant="outline">{opportunity.category}</Badge>
                </div>
                
                <div className="flex gap-2">
                  <Button className="flex-1">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visit Business
                  </Button>
                  <Button variant="outline">
                    <MapPin className="h-4 w-4 mr-2" />
                    Directions
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Achievements & Progress */}
        <TabsContent value="achievements" className="space-y-4">
          {achievementProgress.map((achievement, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {achievement.icon}
                    <div>
                      <h3 className="font-bold text-lg">{achievement.title}</h3>
                      <p className="text-gray-600">{achievement.description}</p>
                    </div>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {achievement.reward}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span className="font-medium">
                      {achievement.progress}/{achievement.total}
                    </span>
                  </div>
                  <Progress 
                    value={(achievement.progress / achievement.total) * 100} 
                    className="h-3"
                  />
                  {achievement.progress === achievement.total && (
                    <div className="flex items-center gap-2 text-green-600 mt-2">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Achievement Unlocked!</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}