import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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
  Gamepad2
} from "lucide-react";

// Mock data for avatar customization
const assetCategories = {
  hair: [
    { id: 'hair_1', name: 'Classic Bob', rarity: 'common', cost: 0, owned: true },
    { id: 'hair_2', name: 'Wavy Locks', rarity: 'rare', cost: 150, owned: false },
    { id: 'hair_3', name: 'Pixel Punk', rarity: 'epic', cost: 300, owned: false },
    { id: 'hair_4', name: 'Royal Crown', rarity: 'legendary', cost: 500, owned: false },
  ],
  eyes: [
    { id: 'eyes_1', name: 'Bright Blue', rarity: 'common', cost: 0, owned: true },
    { id: 'eyes_2', name: 'Emerald Glow', rarity: 'rare', cost: 100, owned: false },
    { id: 'eyes_3', name: 'Galaxy Eyes', rarity: 'epic', cost: 250, owned: false },
  ],
  outfit: [
    { id: 'outfit_1', name: 'Casual Wear', rarity: 'common', cost: 0, owned: true },
    { id: 'outfit_2', name: 'Business Suit', rarity: 'rare', cost: 200, owned: false },
    { id: 'outfit_3', name: 'Hero Costume', rarity: 'epic', cost: 400, owned: false },
  ],
  accessories: [
    { id: 'acc_1', name: 'Classic Glasses', rarity: 'common', cost: 50, owned: false },
    { id: 'acc_2', name: 'Magic Pendant', rarity: 'rare', cost: 180, owned: false },
    { id: 'acc_3', name: 'Dragon Wings', rarity: 'legendary', cost: 600, owned: false },
  ]
};

const mockAvatar = {
  id: 'avatar_1',
  name: 'My Avatar',
  level: 12,
  experience: 2450,
  nextLevelXP: 3000,
  coins: 850,
  hair: 'hair_1',
  eyes: 'eyes_1', 
  outfit: 'outfit_1',
  accessories: [],
  badges: ['first_tap', 'social_butterfly', 'explorer'],
  achievements: [
    { id: 'ach_1', title: 'First Steps', description: 'Complete your first Cirql tap', completed: true },
    { id: 'ach_2', title: 'Social Star', description: 'Share 5 AR experiences', completed: true },
    { id: 'ach_3', title: 'Explorer', description: 'Visit 10 different businesses', completed: false, progress: 7, target: 10 },
  ]
};

const mockTreasureHunts = [
  {
    id: 'hunt_1',
    name: 'Downtown Discovery',
    description: 'Find all 8 hidden collectibles in the downtown district',
    difficulty: 'Easy' as const,
    timeLimit: '3 days',
    participants: 124,
    reward: '200 coins + Rare Hair Style',
    locations: [
      { name: 'Coffee Corner', discovered: true },
      { name: 'Book Nook', discovered: true },
      { name: 'Pizza Palace', discovered: false },
      { name: 'Flower Shop', discovered: false },
    ]
  },
  {
    id: 'hunt_2', 
    name: 'Culinary Quest',
    description: 'Complete AR cooking challenges at 5 restaurants',
    difficulty: 'Medium' as const,
    timeLimit: '1 week',
    participants: 89,
    reward: '500 coins + Chef Hat + Recipe Collection',
    locations: [
      { name: 'Italiano Bistro', discovered: true },
      { name: 'Sushi Zen', discovered: false },
      { name: 'Taco Fiesta', discovered: false },
    ]
  }
];

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case 'common': return 'bg-gray-100 text-gray-800';
    case 'rare': return 'bg-blue-100 text-blue-800';
    case 'epic': return 'bg-purple-100 text-purple-800';
    case 'legendary': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function AvatarCreator() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("customize");
  const [selectedCategory, setSelectedCategory] = useState("hair");
  const [avatar, setAvatar] = useState(mockAvatar);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  const handleAssetSelect = (asset: any) => {
    if (!asset.owned && asset.cost > avatar.coins) {
      toast({
        title: "Insufficient Coins",
        description: `You need ${asset.cost} coins to purchase this item.`,
        variant: "destructive"
      });
      return;
    }

    if (!asset.owned) {
      // Purchase the asset
      setAvatar(prev => ({
        ...prev,
        coins: prev.coins - asset.cost,
        [selectedCategory]: asset.id
      }));
      toast({
        title: "Asset Purchased!",
        description: `${asset.name} has been added to your collection.`,
      });
    } else {
      // Equip the asset
      setAvatar(prev => ({
        ...prev,
        [selectedCategory]: asset.id
      }));
      toast({
        title: "Avatar Updated!",
        description: `${asset.name} equipped successfully.`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">
            Avatar Creator
          </h1>
          <p className="text-gray-600">Customize your AR avatar and explore gamified experiences</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="customize">Customize</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="treasures">Treasure Hunts</TabsTrigger>
            <TabsTrigger value="social">Social Hub</TabsTrigger>
          </TabsList>

          {/* Customize Tab */}
          <TabsContent value="customize" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Avatar Preview */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Avatar Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg p-8 text-center">
                    <div className="w-32 h-32 mx-auto bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-white text-4xl font-bold">
                      {avatar.name.charAt(0)}
                    </div>
                    <h3 className="text-lg font-semibold mt-4">{avatar.name}</h3>
                    <p className="text-sm text-gray-600">Level {avatar.level}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Experience</span>
                      <span className="text-sm text-purple-600">{avatar.experience} / {avatar.nextLevelXP}</span>
                    </div>
                    <div className="bg-purple-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${(avatar.experience / avatar.nextLevelXP) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-yellow-50 p-3 rounded-lg">
                    <div className="flex items-center">
                      <Coins className="h-4 w-4 text-yellow-600 mr-2" />
                      <span className="font-semibold text-yellow-800">Coins</span>
                    </div>
                    <span className="text-lg font-bold text-yellow-600">{avatar.coins}</span>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600">
                      <Save className="h-4 w-4 mr-2" />
                      Save Avatar
                    </Button>
                    <Button variant="outline" size="icon">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Customization Options */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Palette className="h-5 w-5 mr-2" />
                    Customization Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Category Tabs */}
                  <div className="flex gap-2 flex-wrap">
                    {Object.keys(assetCategories).map(category => (
                      <Button
                        key={category}
                        variant={selectedCategory === category ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory(category)}
                        className="capitalize"
                      >
                        {category}
                      </Button>
                    ))}
                  </div>

                  {/* Assets Grid */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {assetCategories[selectedCategory as keyof typeof assetCategories]?.map(asset => (
                      <Card key={asset.id} className="border-2 hover:border-purple-300 transition-colors cursor-pointer"
                            onClick={() => handleAssetSelect(asset)}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold">{asset.name}</h4>
                            <Badge className={getRarityColor(asset.rarity)}>
                              {asset.rarity}
                            </Badge>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div className="flex items-center text-sm text-gray-600">
                              <Coins className="h-3 w-3 mr-1" />
                              {asset.cost === 0 ? 'Free' : `${asset.cost} coins`}
                            </div>
                            <div className="flex items-center">
                              {asset.owned ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Owned
                                </Badge>
                              ) : (
                                <Button size="sm" variant="outline">
                                  {asset.cost <= avatar.coins ? 'Purchase' : 'Locked'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {avatar.achievements.map(achievement => (
                    <div key={achievement.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-semibold">{achievement.title}</h4>
                        <p className="text-sm text-gray-600">{achievement.description}</p>
                        {!achievement.completed && achievement.progress && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Progress</span>
                              <span>{achievement.progress} / {achievement.target}</span>
                            </div>
                            <div className="bg-gray-200 rounded-full h-1">
                              <div 
                                className="bg-blue-500 h-1 rounded-full"
                                style={{ width: `${(achievement.progress / achievement.target) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        {achievement.completed ? (
                          <Badge className="bg-green-100 text-green-800">
                            <Medal className="h-3 w-3 mr-1" />
                            Complete
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            In Progress
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Star className="h-5 w-5 mr-2 text-purple-500" />
                    Badge Collection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {avatar.badges.map(badge => (
                      <div key={badge} className="text-center p-3 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg">
                        <div className="w-12 h-12 mx-auto bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white mb-2">
                          <Star className="h-6 w-6" />
                        </div>
                        <p className="text-xs font-semibold capitalize">{badge.replace('_', ' ')}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Treasure Hunts Tab */}
          <TabsContent value="treasures" className="space-y-6">
            <div className="grid gap-6">
              {mockTreasureHunts.map(hunt => (
                <Card key={hunt.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center">
                          <MapPin className="h-5 w-5 mr-2 text-orange-500" />
                          {hunt.name}
                        </CardTitle>
                        <p className="text-gray-600 mt-1">{hunt.description}</p>
                      </div>
                      <Badge className={hunt.difficulty === 'Easy' ? 'bg-green-100 text-green-800' : 
                                      hunt.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'}>
                        {hunt.difficulty}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold">Locations to Discover</h4>
                        <div className="space-y-1">
                          {hunt.locations.map((location, idx) => (
                            <div key={idx} className="flex items-center text-sm">
                              <div className={`w-2 h-2 rounded-full mr-2 ${location.discovered ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                              <span className={location.discovered ? 'text-green-700' : 'text-gray-600'}>
                                {location.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span>Time Remaining:</span>
                            <span className="font-semibold text-orange-600">{hunt.timeLimit}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Participants:</span>
                            <span>{hunt.participants}</span>
                          </div>
                        </div>
                        
                        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-3 rounded-lg">
                          <div className="text-xs font-semibold text-orange-800 mb-1">Reward:</div>
                          <div className="text-sm text-orange-700">{hunt.reward}</div>
                        </div>
                      </div>
                    </div>

                    <Button className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600">
                      <Camera className="h-4 w-4 mr-2" />
                      Start AR Treasure Hunt
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Social Hub Tab */}
          <TabsContent value="social" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-blue-500" />
                  Social Features & Team Battles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          <Gamepad2 className="h-5 w-5 text-blue-500" />
                          <span className="font-medium">Team Battles</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          Form teams and compete in real-time multiplayer AR challenges
                        </p>
                        <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                          <Zap className="h-4 w-4 mr-2" />
                          Join Battle
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          <Users className="h-5 w-5 text-purple-500" />
                          <span className="font-medium">Friend System</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          Connect with friends, share achievements, and play together
                        </p>
                        <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Find Friends
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Trophy className="h-5 w-5 text-green-500" />
                          <span className="font-medium">Leaderboards</span>
                        </div>
                        <Badge className="bg-green-100 text-green-800">Live</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        Compete for top rankings in various AR game categories
                      </p>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Eye className="h-4 w-4 mr-2" />
                          View Rankings
                        </Button>
                        <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700">
                          <Crown className="h-4 w-4 mr-2" />
                          Compete Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}