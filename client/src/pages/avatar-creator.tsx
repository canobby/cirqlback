import { useState } from "react";
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
  Coins
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

export default function AvatarCreator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("customize");
  const [selectedCategory, setSelectedCategory] = useState("hair");
  const [avatarPreview, setAvatarPreview] = useState<UserAvatar | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AvatarAsset | null>(null);

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
          <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
            <TabsTrigger value="customize">Customize</TabsTrigger>
            <TabsTrigger value="shop">Shop</TabsTrigger>
            <TabsTrigger value="achievements">Rewards</TabsTrigger>
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