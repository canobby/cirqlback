import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  User, 
  Palette, 
  Sparkles, 
  Crown, 
  Star, 
  Gift,
  Save,
  Eye,
  Shirt,
  Camera,
  Zap,
  Trophy,
  Download,
  Share2,
  Heart,
  Coins,
  MapPin,
  Users,
  ArrowUpDown,
  Flame,
  Calendar,
  Target,
  Medal,
  Gamepad2,
  UserPlus,
  Send,
  Group,
  Swords,
  PartyPopper,
  Building2,
  Users2,
  ShieldCheck
} from "lucide-react";

interface AvatarAsset {
  id: string;
  type: 'hair' | 'eyes' | 'skin' | 'outfit' | 'accessory' | 'pet' | 'effect';
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  cost: number;
  unlockCondition?: string;
  businessId?: string;
  isOwned: boolean;
  previewUrl: string;
  animationUrl?: string;
}

interface UserAvatar {
  id: string;
  name: string;
  hair: string;
  eyes: string;
  skin: string;
  outfit: string;
  accessories: string[];
  pet?: string;
  effects: string[];
  level: number;
  experience: number;
  coins: number;
  badges: string[];
}

interface AvatarAchievement {
  id: string;
  title: string;
  description: string;
  type: string;
  target: number;
  progress: number;
  reward: string;
  rarity: string;
  completed: boolean;
}

interface TreasureHunt {
  id: string;
  name: string;
  description: string;
  locations: { businessId: string; name: string; discovered: boolean }[];
  rewards: string[];
  timeLimit: string;
  participants: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

interface SocialCompetition {
  id: string;
  title: string;
  description: string;
  type: 'leaderboard' | 'tournament' | 'challenge';
  participants: number;
  timeLeft: string;
  prize: string;
  myRank?: number;
  status: 'active' | 'upcoming' | 'ended';
}

interface TradingOffer {
  id: string;
  fromUser: string;
  toUser: string;
  offeredItems: string[];
  requestedItems: string[];
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

interface StreakBonus {
  type: 'daily' | 'weekly' | 'monthly';
  current: number;
  target: number;
  multiplier: number;
  reward: string;
  nextReward: string;
}

interface Team {
  id: string;
  name: string;
  members: TeamMember[];
  captain: string;
  totalPoints: number;
  level: number;
  achievements: string[];
  activeChallenge?: string;
  inviteCode: string;
}

interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  points: number;
  joinedAt: string;
  status: 'active' | 'invited' | 'pending';
}

interface TeamChallenge {
  id: string;
  title: string;
  description: string;
  type: 'cooperative' | 'competitive' | 'team_battle' | 'family' | 'corporate';
  requiredMembers: number;
  timeLimit: string;
  rewards: string[];
  progress: number;
  target: number;
  participants: number;
}

interface TeamBattle {
  id: string;
  title: string;
  team1: { name: string; score: number; members: number };
  team2: { name: string; score: number; members: number };
  challenge: string;
  timeLeft: string;
  prize: string;
  status: 'active' | 'upcoming' | 'completed';
}

interface FamilyPlan {
  id: string;
  name: string;
  memberLimit: number;
  benefits: string[];
  monthlyRewards: string;
  price: string;
  savings: string;
}

interface CorporateChallenge {
  id: string;
  company: string;
  title: string;
  description: string;
  employees: number;
  progress: number;
  target: number;
  corporateReward: string;
  employeeReward: string;
  deadline: string;
}

export default function AvatarCreator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("customize");
  const [selectedCategory, setSelectedCategory] = useState("hair");
  const [avatarPreview, setAvatarPreview] = useState<UserAvatar | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AvatarAsset | null>(null);
  const [activeGameTab, setActiveGameTab] = useState('treasureHunts');

  // Fetch user's current avatar (with default fallback data)
  const { data: userAvatar, isLoading: avatarLoading } = useQuery({
    queryKey: ["/api/avatar/me"],
    queryFn: async () => {
      try {
        return await apiRequest("GET", "/api/avatar/me");
      } catch (error) {
        // Return default avatar if API fails
        return defaultAvatar;
      }
    }
  });

  // Fetch available avatar assets (with sample data)
  const { data: availableAssets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ["/api/avatar/assets"],
    queryFn: async () => {
      try {
        return await apiRequest("GET", "/api/avatar/assets");
      } catch (error) {
        // Return sample assets if API fails
        return sampleAssets;
      }
    }
  });

  // Fetch avatar achievements/rewards
  const { data: achievements = [] } = useQuery({
    queryKey: ["/api/avatar/achievements"],
    queryFn: async () => {
      try {
        return await apiRequest("GET", "/api/avatar/achievements");
      } catch (error) {
        return sampleAchievements;
      }
    }
  });

  const saveAvatarMutation = useMutation({
    mutationFn: async (avatarData: Partial<UserAvatar>) => {
      return await apiRequest("POST", "/api/avatar/save", avatarData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/avatar/me"] });
      toast({
        title: "Avatar Saved!",
        description: "Your avatar changes have been saved successfully.",
      });
    },
  });

  const purchaseAssetMutation = useMutation({
    mutationFn: async (assetId: string) => {
      return await apiRequest("POST", `/api/avatar/purchase/${assetId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/avatar/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/avatar/me"] });
      toast({
        title: "Asset Purchased!",
        description: "New avatar item added to your collection.",
      });
    },
    onError: () => {
      toast({
        title: "Purchase Failed",
        description: "Not enough coins or asset already owned.",
        variant: "destructive",
      });
    },
  });

  const defaultAvatar: UserAvatar = {
    id: "default",
    name: "My Avatar",
    hair: "default_hair",
    eyes: "default_eyes", 
    skin: "default_skin",
    outfit: "default_outfit",
    accessories: [],
    effects: [],
    level: 1,
    experience: 0,
    coins: 500,
    badges: []
  };

  const sampleAssets: AvatarAsset[] = [
    {
      id: "hair_1",
      type: "hair",
      name: "Classic Brown",
      rarity: "common",
      cost: 0,
      isOwned: true,
      previewUrl: ""
    },
    {
      id: "hair_2", 
      type: "hair",
      name: "Stylish Pink",
      rarity: "rare",
      cost: 100,
      isOwned: false,
      previewUrl: ""
    },
    {
      id: "outfit_1",
      type: "outfit",
      name: "Casual Hoodie",
      rarity: "common",
      cost: 0,
      isOwned: true,
      previewUrl: ""
    },
    {
      id: "pet_1",
      type: "pet",
      name: "Digital Dragon",
      rarity: "legendary",
      cost: 500,
      unlockCondition: "Visit 10 businesses",
      isOwned: false,
      previewUrl: ""
    }
  ];

  const sampleAchievements: AvatarAchievement[] = [
    {
      id: "ach_1",
      title: "First Steps",
      description: "Complete your first tap",
      type: "taps",
      target: 1,
      progress: 1,
      reward: "50 coins",
      rarity: "common",
      completed: true
    },
    {
      id: "ach_2",
      title: "Social Butterfly",
      description: "Share your avatar 5 times",
      type: "social",
      target: 5,
      progress: 2,
      reward: "Rare effect: Sparkles",
      rarity: "rare",
      completed: false
    }
  ];

  // Sample gamification data
  const treasureHunts: TreasureHunt[] = [
    {
      id: "hunt_1",
      name: "Downtown Explorer",
      description: "Discover hidden AR treasures across 5 downtown businesses",
      locations: [
        { businessId: "biz_1", name: "Central Coffee", discovered: true },
        { businessId: "biz_2", name: "Metro Deli", discovered: true },
        { businessId: "biz_3", name: "Art Gallery", discovered: false },
        { businessId: "biz_4", name: "Book Store", discovered: false },
        { businessId: "biz_5", name: "Music Shop", discovered: false }
      ],
      rewards: ["Legendary pet: Crystal Dragon", "500 Cirql coins", "Exclusive badge"],
      timeLimit: "3 days left",
      participants: 234,
      difficulty: "Medium"
    }
  ];

  const socialCompetitions: SocialCompetition[] = [
    {
      id: "comp_1",
      title: "Avatar Style Contest",
      description: "Show off your most creative avatar combination",
      type: "tournament",
      participants: 1247,
      timeLeft: "2 days",
      prize: "Epic hair style + 1000 coins",
      myRank: 23,
      status: "active"
    },
    {
      id: "comp_2",
      title: "Weekly Leaderboard",
      description: "Earn the most Cirql coins this week",
      type: "leaderboard",
      participants: 856,
      timeLeft: "5 days",
      prize: "Champion crown accessory",
      myRank: 42,
      status: "active"
    }
  ];

  const tradingOffers: TradingOffer[] = [
    {
      id: "trade_1",
      fromUser: "AvatarMaster99",
      toUser: "You",
      offeredItems: ["Rare sunglasses", "Cool jacket"],
      requestedItems: ["Your epic boots"],
      status: "pending",
      createdAt: "2 hours ago"
    }
  ];

  const streakBonuses: StreakBonus[] = [
    {
      type: "daily",
      current: 7,
      target: 7,
      multiplier: 2,
      reward: "Double coins earned",
      nextReward: "Streak pet unlock"
    },
    {
      type: "weekly",
      current: 3,
      target: 4,
      multiplier: 1.5,
      reward: "Weekly bonus coins",
      nextReward: "Rare effect unlock"
    }
  ];

  // Team and social gamification data
  const userTeams: Team[] = [
    {
      id: "team_1",
      name: "Downtown Explorers",
      members: [
        { id: "user_1", name: "You", avatar: "avatar_1", points: 1250, joinedAt: "2 weeks ago", status: "active" },
        { id: "user_2", name: "Sarah_M", avatar: "avatar_2", points: 980, joinedAt: "1 week ago", status: "active" },
        { id: "user_3", name: "Mike_K", avatar: "avatar_3", points: 1100, joinedAt: "3 days ago", status: "active" }
      ],
      captain: "user_1",
      totalPoints: 3330,
      level: 8,
      achievements: ["Team Explorer", "Social Butterfly", "Challenge Winner"],
      activeChallenge: "challenge_1",
      inviteCode: "DTE2024"
    }
  ];

  const teamChallenges: TeamChallenge[] = [
    {
      id: "challenge_1",
      title: "Weekend Warriors",
      description: "Visit 15 businesses as a team this weekend",
      type: "cooperative",
      requiredMembers: 3,
      timeLimit: "2 days left",
      rewards: ["Team badge: Weekend Warriors", "500 coins each", "Exclusive team avatar effect"],
      progress: 8,
      target: 15,
      participants: 47
    },
    {
      id: "challenge_2", 
      title: "Rival Teams Battle",
      description: "Compete against other teams for the most Cirql taps",
      type: "competitive",
      requiredMembers: 4,
      timeLimit: "5 days left",
      rewards: ["Champion team crown", "1000 coins each", "Featured on leaderboard"],
      progress: 23,
      target: 50,
      participants: 12
    }
  ];

  const invitations = [
    { from: "Alex_R", teamName: "Coffee Connoisseurs", message: "Join our coffee shop hopping team!", sent: "1 hour ago" },
    { from: "Emma_L", teamName: "Fitness Fanatics", message: "Let's earn rewards at gyms together!", sent: "3 hours ago" }
  ];

  const teamBattles: TeamBattle[] = [
    {
      id: "battle_1",
      title: "Downtown Dominance",
      team1: { name: "Coffee Crusaders", score: 847, members: 12 },
      team2: { name: "Tea Titans", score: 723, members: 9 },
      challenge: "Most Cirql taps in downtown area",
      timeLeft: "4 hours",
      prize: "Champion crowns + 2000 coins each",
      status: "active"
    },
    {
      id: "battle_2",
      title: "Weekend Warriors Challenge",
      team1: { name: "Your Team", score: 234, members: 5 },
      team2: { name: "Thunder Squad", score: 189, members: 7 },
      challenge: "Complete the most weekend tap trails",
      timeLeft: "1 day 6 hours",
      prize: "Legendary pet + exclusive badge",
      status: "active"
    }
  ];

  const familyPlans: FamilyPlan[] = [
    {
      id: "family_basic",
      name: "Family Explorer Pack",
      memberLimit: 6,
      benefits: [
        "Shared family achievement tracking",
        "Family-only challenges and rewards",
        "Combined family leaderboard ranking",
        "Special family avatar accessories",
        "Monthly family meetup events"
      ],
      monthlyRewards: "500 bonus coins per family member",
      price: "Free with 4+ active family members",
      savings: "Save 40% vs individual rewards"
    },
    {
      id: "family_premium",
      name: "Family Champions League",
      memberLimit: 10,
      benefits: [
        "All Explorer Pack benefits",
        "Exclusive family-vs-family tournaments",
        "Premium family avatar collections",
        "Priority family event access",
        "Custom family challenge creation"
      ],
      monthlyRewards: "1000 bonus coins + rare items",
      price: "$4.99/month for entire family",
      savings: "Save 60% vs individual premium"
    }
  ];

  const corporateChallenges: CorporateChallenge[] = [
    {
      id: "corp_1",
      company: "Tech Solutions Inc",
      title: "Lunch Break Explorers",
      description: "Employees discover local lunch spots during work breaks",
      employees: 47,
      progress: 234,
      target: 500,
      corporateReward: "Company featured on Cirqlback + employee wellness points",
      employeeReward: "Lunch vouchers + wellness badges",
      deadline: "End of month"
    },
    {
      id: "corp_2",
      company: "Marketing Agency Co",
      title: "Team Building Tap Trail",
      description: "Department teams compete in after-work business discovery",
      employees: 23,
      progress: 89,
      target: 200,
      corporateReward: "Team building budget bonus + local business partnerships",
      employeeReward: "Happy hour credits + team achievement badges",
      deadline: "2 weeks"
    }
  ];

  const avatar = avatarPreview || (userAvatar as UserAvatar) || defaultAvatar;

  const handleAssetSelect = (asset: AvatarAsset) => {
    if (!asset.isOwned && asset.cost > 0) {
      setSelectedAsset(asset);
      return;
    }

    if (!avatarPreview) return;

    const updatedAvatar = { ...avatarPreview };
    
    switch (asset.type) {
      case 'hair':
        updatedAvatar.hair = asset.id;
        break;
      case 'eyes':
        updatedAvatar.eyes = asset.id;
        break;
      case 'skin':
        updatedAvatar.skin = asset.id;
        break;
      case 'outfit':
        updatedAvatar.outfit = asset.id;
        break;
      case 'accessory':
        if (updatedAvatar.accessories.includes(asset.id)) {
          updatedAvatar.accessories = updatedAvatar.accessories.filter(id => id !== asset.id);
        } else {
          updatedAvatar.accessories.push(asset.id);
        }
        break;
      case 'pet':
        updatedAvatar.pet = updatedAvatar.pet === asset.id ? undefined : asset.id;
        break;
      case 'effect':
        if (updatedAvatar.effects.includes(asset.id)) {
          updatedAvatar.effects = updatedAvatar.effects.filter(id => id !== asset.id);
        } else {
          updatedAvatar.effects.push(asset.id);
        }
        break;
    }

    setAvatarPreview(updatedAvatar);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 800);
  };

  const handleSaveAvatar = () => {
    if (avatarPreview) {
      saveAvatarMutation.mutate(avatarPreview);
    }
  };

  const handlePurchaseAsset = () => {
    if (selectedAsset) {
      purchaseAssetMutation.mutate(selectedAsset.id);
      setSelectedAsset(null);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-500 to-orange-500';
      case 'epic': return 'from-purple-500 to-pink-500';
      case 'rare': return 'from-blue-500 to-cyan-500';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return Crown;
      case 'epic': return Star;
      case 'rare': return Sparkles;
      default: return Gift;
    }
  };

  const categories = [
    { id: 'hair', name: 'Hair', icon: User },
    { id: 'eyes', name: 'Eyes', icon: Eye },
    { id: 'skin', name: 'Skin', icon: Palette },
    { id: 'outfit', name: 'Outfits', icon: Shirt },
    { id: 'accessory', name: 'Accessories', icon: Crown },
    { id: 'pet', name: 'Pets', icon: Heart },
    { id: 'effect', name: 'Effects', icon: Sparkles }
  ];

  const filteredAssets = (availableAssets as AvatarAsset[]).filter((asset: AvatarAsset) => asset.type === selectedCategory);

  if (avatarLoading || assetsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Avatar Creator
          </h1>
          <p className="text-xl text-gray-600">
            Create your unique AR avatar and bring it to life across Cirqlback
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 max-w-5xl mx-auto text-xs">
            <TabsTrigger value="customize">Customize</TabsTrigger>
            <TabsTrigger value="shop">Shop</TabsTrigger>
            <TabsTrigger value="achievements">Rewards</TabsTrigger>
            <TabsTrigger value="games">Games</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="battles">Battles</TabsTrigger>
            <TabsTrigger value="showcase">Showcase</TabsTrigger>
          </TabsList>

          <TabsContent value="customize" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Avatar Preview */}
              <div className="lg:col-span-1">
                <Card className="sticky top-6">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{avatar.name}</span>
                      <Badge variant="outline">Level {avatar.level}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 3D Avatar Preview */}
                    <div className={`relative bg-gradient-to-br ${getRarityColor('epic')} rounded-xl p-6 min-h-[300px] flex items-center justify-center ${isAnimating ? 'animate-bounce' : ''}`}>
                      <div className="text-center text-white">
                        <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                          <User className="h-16 w-16" />
                        </div>
                        <h3 className="text-lg font-semibold">{avatar.name}</h3>
                        <p className="text-sm opacity-90">Tap around to see me!</p>
                      </div>
                      
                      {/* AR Effects */}
                      {avatar.effects.length > 0 && (
                        <div className="absolute top-2 right-2 space-y-1">
                          {avatar.effects.slice(0, 3).map((effect, index) => (
                            <div key={effect} className="w-6 h-6 bg-white/30 rounded-full flex items-center justify-center">
                              <Sparkles className="h-3 w-3 text-yellow-300" />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Pet */}
                      {avatar.pet && (
                        <div className="absolute bottom-4 right-4 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                          <Heart className="h-6 w-6 text-pink-300" />
                        </div>
                      )}
                    </div>

                    {/* Avatar Stats */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center">
                          <Coins className="h-4 w-4 mr-1 text-yellow-500" />
                          Coins
                        </span>
                        <span className="font-bold">{avatar.coins.toLocaleString()}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center">
                          <Zap className="h-4 w-4 mr-1 text-blue-500" />
                          Experience
                        </span>
                        <span className="font-bold">{avatar.experience} XP</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Level Progress</span>
                          <span>{Math.min(100, (avatar.experience % 1000) / 10)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, (avatar.experience % 1000) / 10)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <Button 
                      onClick={handleSaveAvatar}
                      disabled={saveAvatarMutation.isPending}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Avatar
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Customization Options */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Palette className="h-5 w-5 mr-2" />
                      Customize Your Avatar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Category Tabs */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {categories.map((category) => {
                        const IconComponent = category.icon;
                        return (
                          <Button
                            key={category.id}
                            variant={selectedCategory === category.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedCategory(category.id)}
                            className="flex items-center space-x-2"
                          >
                            <IconComponent className="h-4 w-4" />
                            <span>{category.name}</span>
                          </Button>
                        );
                      })}
                    </div>

                    {/* Asset Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {filteredAssets.map((asset: AvatarAsset) => {
                        const RarityIcon = getRarityIcon(asset.rarity);
                        const isActive = (() => {
                          switch (asset.type) {
                            case 'hair': return avatar.hair === asset.id;
                            case 'eyes': return avatar.eyes === asset.id;
                            case 'skin': return avatar.skin === asset.id;
                            case 'outfit': return avatar.outfit === asset.id;
                            case 'accessory': return avatar.accessories.includes(asset.id);
                            case 'pet': return avatar.pet === asset.id;
                            case 'effect': return avatar.effects.includes(asset.id);
                            default: return false;
                          }
                        })();

                        return (
                          <Card 
                            key={asset.id}
                            className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                              isActive ? 'ring-2 ring-purple-500 bg-purple-50' : ''
                            } ${!asset.isOwned && asset.cost > 0 ? 'opacity-75' : ''}`}
                            onClick={() => handleAssetSelect(asset)}
                          >
                            <CardContent className="p-3">
                              <div className={`relative aspect-square bg-gradient-to-br ${getRarityColor(asset.rarity)} rounded-lg mb-2 flex items-center justify-center overflow-hidden`}>
                                {/* Asset Preview */}
                                <div className="w-full h-full bg-white/20 flex items-center justify-center">
                                  <RarityIcon className="h-8 w-8 text-white" />
                                </div>
                                
                                {/* Rarity Badge */}
                                <div className="absolute top-1 right-1">
                                  <Badge 
                                    className={`bg-gradient-to-r ${getRarityColor(asset.rarity)} text-white text-xs px-1 py-0`}
                                  >
                                    {asset.rarity}
                                  </Badge>
                                </div>

                                {/* Lock/Cost Overlay */}
                                {!asset.isOwned && asset.cost > 0 && (
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <div className="text-center text-white">
                                      <Coins className="h-4 w-4 mx-auto mb-1" />
                                      <span className="text-xs font-bold">{asset.cost}</span>
                                    </div>
                                  </div>
                                )}

                                {/* Active Indicator */}
                                {isActive && (
                                  <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                                      <Zap className="h-3 w-3 text-white" />
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              <h4 className="font-medium text-sm truncate">{asset.name}</h4>
                              
                              {asset.unlockCondition && (
                                <p className="text-xs text-gray-500 mt-1 truncate">
                                  {asset.unlockCondition}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="shop" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(availableAssets as AvatarAsset[])
                .filter((asset: AvatarAsset) => !asset.isOwned && asset.cost > 0)
                .map((asset: AvatarAsset) => {
                  const RarityIcon = getRarityIcon(asset.rarity);
                  
                  return (
                    <Card key={asset.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className={`relative aspect-square bg-gradient-to-br ${getRarityColor(asset.rarity)} rounded-lg mb-4 flex items-center justify-center`}>
                          <RarityIcon className="h-12 w-12 text-white" />
                          
                          <div className="absolute top-2 right-2">
                            <Badge className={`bg-gradient-to-r ${getRarityColor(asset.rarity)} text-white`}>
                              {asset.rarity}
                            </Badge>
                          </div>
                        </div>
                        
                        <h3 className="font-semibold mb-2">{asset.name}</h3>
                        
                        {asset.businessId && (
                          <p className="text-sm text-gray-600 mb-2">
                            Exclusive to business partner
                          </p>
                        )}
                        
                        {asset.unlockCondition && (
                          <p className="text-sm text-gray-600 mb-3">
                            Unlock: {asset.unlockCondition}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className="flex items-center text-lg font-bold">
                            <Coins className="h-4 w-4 mr-1 text-yellow-500" />
                            {asset.cost}
                          </span>
                          
                          <Button
                            size="sm"
                            onClick={() => purchaseAssetMutation.mutate(asset.id)}
                            disabled={purchaseAssetMutation.isPending || (avatar.coins < asset.cost)}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                          >
                            Buy Now
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(achievements as AvatarAchievement[]).map((achievement: AvatarAchievement) => (
                <Card key={achievement.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getRarityColor(achievement.rarity)} flex items-center justify-center`}>
                        <Trophy className="h-8 w-8 text-white" />
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{achievement.title}</h3>
                        <p className="text-gray-600 mb-3">{achievement.description}</p>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{achievement.progress}/{achievement.target}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                              style={{ width: `${(achievement.progress / achievement.target) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-4">
                          <Badge variant={achievement.completed ? "default" : "outline"}>
                            {achievement.completed ? "Completed" : "In Progress"}
                          </Badge>
                          
                          <span className="text-sm font-medium">
                            Reward: {achievement.reward}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="games" className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-4">Gamification Hub</h2>
              <p className="text-gray-600">Complete challenges, compete with friends, and earn exclusive rewards</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Flame className="h-5 w-5 text-orange-500" />
                      <span>Daily Streaks</span>
                    </div>
                    <Badge variant="outline" className="text-orange-600 border-orange-300">
                      7-day streak!
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {streakBonuses.map((streak, index) => (
                    <div key={index} className="bg-gradient-to-r from-orange-50 to-pink-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium capitalize">{streak.type} Streak</span>
                        <span className="text-sm font-bold text-orange-600">
                          {streak.current}/{streak.target}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div 
                          className="bg-gradient-to-r from-orange-400 to-pink-400 h-2 rounded-full"
                          style={{ width: `${(streak.current / streak.target) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Reward: {streak.reward}</span>
                        <span>Next: {streak.nextReward}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5 text-green-500" />
                    <span>AR Treasure Hunts</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {treasureHunts.map((hunt) => (
                    <div key={hunt.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold">{hunt.name}</h3>
                          <p className="text-sm text-gray-600">{hunt.description}</p>
                        </div>
                        <Badge variant={hunt.difficulty === 'Easy' ? 'secondary' : hunt.difficulty === 'Medium' ? 'default' : 'destructive'}>
                          {hunt.difficulty}
                        </Badge>
                      </div>
                      <div className="space-y-2 mb-4">
                        {hunt.locations.map((location, idx) => (
                          <div key={idx} className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${location.discovered ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <span className={`text-sm ${location.discovered ? 'text-green-700' : 'text-gray-600'}`}>
                              {location.name}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-orange-600">{hunt.timeLimit}</span>
                        <Button size="sm" className="bg-gradient-to-r from-green-500 to-emerald-500">
                          <MapPin className="h-4 w-4 mr-1" />
                          Start Hunt
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    <span>Social Competitions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {socialCompetitions.map((comp) => (
                    <div key={comp.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{comp.title}</h3>
                        <Badge variant="outline" className="text-blue-600 border-blue-300">
                          Rank #{comp.myRank}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{comp.description}</p>
                      <div className="flex justify-between text-sm text-gray-500 mb-3">
                        <span>{comp.participants} participants</span>
                        <span>{comp.timeLeft} left</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-purple-600">Prize: {comp.prize}</span>
                        <Button size="sm" variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50">
                          <Trophy className="h-4 w-4 mr-1" />
                          Join
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <ArrowUpDown className="h-5 w-5 text-purple-500" />
                    <span>Trading System</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tradingOffers.map((offer) => (
                    <div key={offer.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold">{offer.fromUser}</span>
                        <Badge variant="outline" className="text-purple-600 border-purple-300">
                          {offer.status}
                        </Badge>
                      </div>
                      <div className="space-y-2 mb-3">
                        <div>
                          <span className="text-sm text-gray-600">Offering: </span>
                          <span className="text-sm font-medium">{offer.offeredItems.join(', ')}</span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Wants: </span>
                          <span className="text-sm font-medium">{offer.requestedItems.join(', ')}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">{offer.createdAt}</span>
                        <div className="space-x-2">
                          <Button size="sm" variant="outline">Decline</Button>
                          <Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500">Accept</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button className="w-full border-purple-300 text-purple-600 hover:bg-purple-50" variant="outline">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    Browse All Trades
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="teams" className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-4">Team & Social Hub</h2>
              <p className="text-gray-600">Invite friends, form teams, and compete together for amazing rewards</p>
            </div>

            {/* Friend Invitations Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <UserPlus className="h-5 w-5 text-green-500" />
                    <span>Invite Friends</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Referral Rewards</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• You get 200 coins per friend who joins</li>
                      <li>• Friend gets 100 bonus coins to start</li>
                      <li>• Unlock team challenges with 3+ friends</li>
                      <li>• Special "Social Champion" badge at 10 referrals</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex space-x-2">
                      <input 
                        type="email" 
                        placeholder="Friend's email address"
                        className="flex-1 px-3 py-2 border rounded-md"
                      />
                      <Button className="bg-gradient-to-r from-green-500 to-emerald-500">
                        <Send className="h-4 w-4 mr-1" />
                        Invite
                      </Button>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2">Or share your invite code:</p>
                      <div className="bg-gray-100 p-2 rounded font-mono text-center">
                        CIRQL-{Math.random().toString(36).substring(2, 8).toUpperCase()}
                      </div>
                      <Button variant="outline" size="sm" className="mt-2">
                        <Share2 className="h-4 w-4 mr-1" />
                        Share Code
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Group className="h-5 w-5 text-blue-500" />
                      <span>My Teams</span>
                    </div>
                    <Badge variant="outline" className="text-blue-600 border-blue-300">
                      {userTeams.length} Active
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {userTeams.map((team) => (
                    <div key={team.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold">{team.name}</h3>
                          <p className="text-sm text-gray-600">{team.members.length} members</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-purple-600 border-purple-300 mb-1">
                            Level {team.level}
                          </Badge>
                          <p className="text-xs text-gray-500">{team.totalPoints} total points</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 mb-3">
                        {team.members.slice(0, 4).map((member, idx) => (
                          <div key={idx} className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {member.name[0]}
                          </div>
                        ))}
                        {team.members.length > 4 && (
                          <div className="text-sm text-gray-500">+{team.members.length - 4} more</div>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-orange-600">
                          {team.activeChallenge ? "Active Challenge" : "No active challenge"}
                        </span>
                        <Button size="sm" variant="outline">
                          <Group className="h-4 w-4 mr-1" />
                          Manage
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <Button className="w-full" variant="outline">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create New Team
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Team Challenges Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Swords className="h-5 w-5 text-orange-500" />
                    <span>Team Challenges</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {teamChallenges.map((challenge) => (
                    <div key={challenge.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{challenge.title}</h3>
                        <Badge variant={challenge.type === 'cooperative' ? 'default' : 'destructive'}>
                          {challenge.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{challenge.description}</p>
                      
                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{challenge.progress}/{challenge.target}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-orange-400 to-red-400 h-2 rounded-full"
                            style={{ width: `${(challenge.progress / challenge.target) * 100}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-orange-600">{challenge.timeLimit}</span>
                        <Button size="sm" className="bg-gradient-to-r from-orange-500 to-red-500">
                          <Swords className="h-4 w-4 mr-1" />
                          Join Challenge
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <PartyPopper className="h-5 w-5 text-pink-500" />
                    <span>Social Events</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Weekend Social Hour</h3>
                    <p className="text-sm text-gray-600 mb-3">Join other Cirqlback users for a fun meetup at downtown businesses!</p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-purple-600">Sat 2PM - Central Plaza</span>
                      <Button size="sm" variant="outline" className="border-pink-300 text-pink-600">
                        <PartyPopper className="h-4 w-4 mr-1" />
                        Join Event
                      </Button>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Flash Mob Challenge</h3>
                    <p className="text-sm text-gray-600 mb-3">100+ users tap the same business within 1 hour for massive rewards!</p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-600">Active: Coffee Central</span>
                      <Button size="sm" className="bg-gradient-to-r from-green-500 to-emerald-500">
                        <MapPin className="h-4 w-4 mr-1" />
                        Go There!
                      </Button>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Monthly Leaderboard</h3>
                    <p className="text-sm text-gray-600 mb-3">Top teams win exclusive avatar items and business vouchers</p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-600">Your team rank: #12</span>
                      <Button size="sm" variant="outline">
                        <Trophy className="h-4 w-4 mr-1" />
                        View Rankings
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pending Invitations */}
            {invitations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Send className="h-5 w-5 text-yellow-500" />
                    <span>Pending Invitations</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {invitations.map((invite, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                      <div>
                        <p className="font-medium">{invite.from} invited you to join "{invite.teamName}"</p>
                        <p className="text-sm text-gray-600">"{invite.message}"</p>
                        <p className="text-xs text-gray-500">{invite.sent}</p>
                      </div>
                      <div className="space-x-2">
                        <Button size="sm" variant="outline">Decline</Button>
                        <Button size="sm" className="bg-gradient-to-r from-green-500 to-emerald-500">Accept</Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="battles" className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-4">Epic Team Battles & Corporate Challenges</h2>
              <p className="text-gray-600">Join massive team battles, family competitions, and corporate challenges for incredible rewards</p>
            </div>

            {/* Team vs Team Battles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Swords className="h-5 w-5 text-red-500" />
                  <span>Live Team Battles</span>
                  <Badge variant="destructive" className="ml-auto">2 Active</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {teamBattles.map((battle) => (
                  <div key={battle.id} className="border rounded-lg p-4 bg-gradient-to-r from-red-50 to-orange-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-lg">{battle.title}</h3>
                        <p className="text-sm text-gray-600">{battle.challenge}</p>
                      </div>
                      <Badge variant="destructive">{battle.timeLeft}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center p-3 bg-blue-100 rounded">
                        <div className="font-bold text-blue-800">{battle.team1.name}</div>
                        <div className="text-2xl font-bold text-blue-600">{battle.team1.score}</div>
                        <div className="text-sm text-gray-600">{battle.team1.members} members</div>
                      </div>
                      <div className="text-center p-3 bg-purple-100 rounded">
                        <div className="font-bold text-purple-800">{battle.team2.name}</div>
                        <div className="text-2xl font-bold text-purple-600">{battle.team2.score}</div>
                        <div className="text-sm text-gray-600">{battle.team2.members} members</div>
                      </div>
                    </div>
                    
                    <div className="text-center mb-3">
                      <p className="text-sm text-orange-600 font-medium">Prize: {battle.prize}</p>
                    </div>
                    
                    <Button className="w-full bg-gradient-to-r from-red-500 to-orange-500">
                      <Crown className="h-4 w-4 mr-2" />
                      {battle.team1.name === "Your Team" || battle.team2.name === "Your Team" 
                        ? "Continue Battle" 
                        : "Join Battle"}
                    </Button>
                  </div>
                ))}
                
                <Button variant="outline" className="w-full">
                  <Swords className="h-4 w-4 mr-2" />
                  Challenge Another Team
                </Button>
              </CardContent>
            </Card>

            {/* Family Plans */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users2 className="h-5 w-5 text-green-500" />
                    <span>Family Plans</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {familyPlans.map((plan) => (
                    <div key={plan.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold">{plan.name}</h3>
                          <p className="text-sm text-gray-600">Up to {plan.memberLimit} family members</p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">{plan.price}</div>
                          <div className="text-xs text-green-500">{plan.savings}</div>
                        </div>
                      </div>
                      
                      <div className="space-y-1 mb-3">
                        {plan.benefits.slice(0, 3).map((benefit, idx) => (
                          <div key={idx} className="text-sm text-gray-600 flex items-center">
                            <ShieldCheck className="h-3 w-3 mr-1 text-green-500" />
                            {benefit}
                          </div>
                        ))}
                        {plan.benefits.length > 3 && (
                          <div className="text-xs text-gray-500">+{plan.benefits.length - 3} more benefits</div>
                        )}
                      </div>
                      
                      <div className="bg-green-50 p-2 rounded text-sm text-green-700 mb-3">
                        Monthly: {plan.monthlyRewards}
                      </div>
                      
                      <Button className="w-full" variant={plan.id === 'family_basic' ? 'outline' : 'default'}>
                        <Users2 className="h-4 w-4 mr-2" />
                        {plan.id === 'family_basic' ? 'Start Family Plan' : 'Upgrade to Premium'}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Corporate Challenges */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5 text-blue-500" />
                    <span>Corporate Challenges</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {corporateChallenges.map((challenge) => (
                    <div key={challenge.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{challenge.title}</h3>
                          <p className="text-sm text-blue-600 font-medium">{challenge.company}</p>
                        </div>
                        <Badge variant="outline" className="text-blue-600 border-blue-300">
                          {challenge.employees} employees
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">{challenge.description}</p>
                      
                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-sm">
                          <span>Company Progress</span>
                          <span>{challenge.progress}/{challenge.target}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full"
                            style={{ width: `${(challenge.progress / challenge.target) * 100}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 p-2 rounded text-xs mb-3">
                        <div className="font-medium">Employee Reward: {challenge.employeeReward}</div>
                        <div className="text-gray-600">Company Reward: {challenge.corporateReward}</div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-blue-600">Deadline: {challenge.deadline}</span>
                        <Button size="sm" className="bg-gradient-to-r from-blue-500 to-purple-500">
                          <Building2 className="h-4 w-4 mr-1" />
                          Join Challenge
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Is Your Company Missing Out?</h3>
                    <p className="text-sm text-gray-600 mb-3">Get your workplace involved in local business discovery and team building!</p>
                    <Button variant="outline" className="w-full border-blue-300 text-blue-600">
                      <Building2 className="h-4 w-4 mr-2" />
                      Invite Your Company
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Community-Focused Challenges */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Heart className="h-5 w-5 text-purple-500" />
                  <span>Community-Focused Challenges</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="border rounded-lg p-3 bg-gradient-to-r from-purple-50 to-pink-50">
                    <h3 className="font-semibold mb-1">Local Heritage Trail</h3>
                    <p className="text-sm text-gray-600 mb-2">Discover businesses celebrating diverse cultural traditions</p>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-purple-600">234 participants</span>
                      <Badge variant="outline" className="text-purple-600 border-purple-300">Cultural Exploration</Badge>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">Featured: Casa Maria's Tacos • Seoul Garden • Nonna's Deli</div>
                    <Button size="sm" className="w-full bg-gradient-to-r from-purple-500 to-pink-500">
                      Join Heritage Trail
                    </Button>
                  </div>
                  
                  <div className="border rounded-lg p-3 bg-gradient-to-r from-green-50 to-blue-50">
                    <h3 className="font-semibold mb-1">Accessibility Champions</h3>
                    <p className="text-sm text-gray-600 mb-2">Support businesses leading in accessibility and inclusion</p>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-green-600">156 participants</span>
                      <Badge variant="outline" className="text-green-600 border-green-300">Accessibility Focus</Badge>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">Featured: Sunshine Cafe • Quiet Corner • Helping Hands Market</div>
                    <Button size="sm" className="w-full bg-gradient-to-r from-green-500 to-blue-500">
                      Join Champions Challenge
                    </Button>
                  </div>
                  
                  <div className="border rounded-lg p-3 bg-gradient-to-r from-orange-50 to-yellow-50">
                    <h3 className="font-semibold mb-1">Local Entrepreneur Spotlight</h3>
                    <p className="text-sm text-gray-600 mb-2">Support homegrown businesses building our community</p>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-orange-600">289 participants</span>
                      <Badge variant="outline" className="text-orange-600 border-orange-300">Entrepreneur Support</Badge>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">Featured: Sarah's Bakery • Veterans Coffee • Rainbow Market</div>
                    <Button size="sm" className="w-full bg-gradient-to-r from-orange-500 to-yellow-500">
                      Support Local Entrepreneurs
                    </Button>
                  </div>
                  
                  <div className="border rounded-lg p-3 bg-gradient-to-r from-teal-50 to-cyan-50">
                    <h3 className="font-semibold mb-1">New Business Discovery Trail</h3>
                    <p className="text-sm text-gray-600 mb-2">Be among the first to discover and support new local businesses</p>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-teal-600">178 participants</span>
                      <Badge variant="outline" className="text-teal-600 border-teal-300">New Business Support</Badge>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">Featured: Fresh Start Smoothie • Corner Craft Studio • Digital Nomad Cafe</div>
                    <Button size="sm" className="w-full bg-gradient-to-r from-teal-500 to-cyan-500">
                      Discover New Businesses
                    </Button>
                  </div>
                  
                  <div className="border rounded-lg p-3 bg-gradient-to-r from-amber-50 to-yellow-50">
                    <h3 className="font-semibold mb-1">Legacy Business Heritage Walk</h3>
                    <p className="text-sm text-gray-600 mb-2">Honor businesses that have shaped our community for generations</p>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-amber-600">312 participants</span>
                      <Badge variant="outline" className="text-amber-600 border-amber-300">Heritage Celebration</Badge>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">Featured: Murphy's Five & Dime (60 years) • Giuseppe's Deli • Riverside Hardware</div>
                    <Button size="sm" className="w-full bg-gradient-to-r from-amber-500 to-yellow-500">
                      Honor Legacy Businesses
                    </Button>
                  </div>
                  
                  <div className="border rounded-lg p-3 bg-gradient-to-r from-emerald-50 to-green-50">
                    <h3 className="font-semibold mb-1">Budget-Friendly Finds Challenge</h3>
                    <p className="text-sm text-gray-600 mb-2">Discover amazing value at local budget-friendly businesses</p>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-emerald-600">445 participants</span>
                      <Badge variant="outline" className="text-emerald-600 border-emerald-300">Smart Shopping</Badge>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">Featured: Student Corner Cafe • Family Pack Market • Happy Hour Hub</div>
                    <Button size="sm" className="w-full bg-gradient-to-r from-emerald-500 to-green-500">
                      Find Great Deals
                    </Button>
                  </div>
                </div>
                
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-sm text-purple-700">
                    <strong>Community Impact:</strong> These challenges connect you with businesses that share your values 
                    while supporting diversity, accessibility, local entrepreneurship, new businesses, heritage preservation, and budget-conscious choices in your community.
                  </p>
                </div>
                
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">AI-Powered Business Matching</h4>
                  <p className="text-sm text-blue-700">
                    Our smart system uses business descriptors like maturity (new/established/legacy), features (pet-friendly, outdoor seating, WiFi), 
                    and price range to create perfect challenge matches that enhance your local discovery experience.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Flash Events */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  <span>Flash Events & Mass Challenges</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-orange-800">MEGA FLASH MOB - ACTIVE NOW!</h3>
                      <p className="text-sm text-orange-600">500+ users needed at Central Coffee within 2 hours!</p>
                    </div>
                    <Badge className="bg-yellow-500 text-white animate-pulse">LIVE</Badge>
                  </div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-2xl font-bold text-orange-600">347/500 users</span>
                    <span className="text-sm text-orange-600">1h 23m remaining</span>
                  </div>
                  <div className="w-full bg-orange-200 rounded-full h-3 mb-3">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full" style={{ width: '69%' }} />
                  </div>
                  <div className="text-sm text-orange-700 mb-3">
                    <strong>Massive Rewards:</strong> 1000 coins + Legendary Flash Mob Crown + Business partnerships unlocked!
                  </div>
                  <Button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                    <Zap className="h-4 w-4 mr-2" />
                    JOIN THE FLASH MOB NOW!
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-3">
                    <h3 className="font-semibold mb-1">City-Wide Tournament</h3>
                    <p className="text-sm text-gray-600 mb-2">All teams compete for ultimate city champion title</p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-purple-600">Starts Monday</span>
                      <Button size="sm" variant="outline">Register Team</Button>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <h3 className="font-semibold mb-1">Weekend Family Festival</h3>
                    <p className="text-sm text-gray-600 mb-2">Special family-only mega challenges and prizes</p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-600">This Saturday</span>
                      <Button size="sm" variant="outline">Join Festival</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="showcase" className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-4">Share Your Avatar</h2>
              <p className="text-gray-600">Show off your unique avatar to friends and the community</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Camera className="h-5 w-5 mr-2" />
                    AR Photo Booth
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Take AR photos with your avatar at participating businesses
                  </p>
                  <Button className="w-full">
                    <Camera className="h-4 w-4 mr-2" />
                    Start AR Session
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Share2 className="h-5 w-5 mr-2" />
                    Social Sharing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Share your avatar on social media and earn bonus coins
                  </p>
                  <Button variant="outline" className="w-full">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Avatar
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Download className="h-5 w-5 mr-2" />
                    Download Assets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Download your avatar as wallpapers or profile pictures
                  </p>
                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download Pack
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Purchase Modal */}
        {selectedAsset && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Purchase Avatar Asset</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`aspect-square bg-gradient-to-br ${getRarityColor(selectedAsset.rarity)} rounded-lg flex items-center justify-center`}>
                  {React.createElement(getRarityIcon(selectedAsset.rarity), { className: "h-16 w-16 text-white" })}
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg">{selectedAsset.name}</h3>
                  <Badge className={`bg-gradient-to-r ${getRarityColor(selectedAsset.rarity)} text-white mt-1`}>
                    {selectedAsset.rarity}
                  </Badge>
                </div>
                
                {selectedAsset.unlockCondition && (
                  <p className="text-sm text-gray-600">
                    Unlock condition: {selectedAsset.unlockCondition}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-lg">
                  <span>Cost:</span>
                  <span className="flex items-center font-bold">
                    <Coins className="h-5 w-5 mr-1 text-yellow-500" />
                    {selectedAsset.cost}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span>Your coins:</span>
                  <span className="flex items-center">
                    <Coins className="h-4 w-4 mr-1 text-yellow-500" />
                    {avatar.coins}
                  </span>
                </div>
                
                <div className="flex space-x-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedAsset(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handlePurchaseAsset}
                    disabled={purchaseAssetMutation.isPending || avatar.coins < selectedAsset.cost}
                    className="flex-1"
                  >
                    {purchaseAssetMutation.isPending ? "Purchasing..." : "Purchase"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}