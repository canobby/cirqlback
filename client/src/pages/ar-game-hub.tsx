import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import cirqlbackLogo from "@assets/cirqlback-logo-transparent.png";
import { 
  Gamepad2, 
  Trophy, 
  Users, 
  Zap, 
  Heart, 
  Star, 
  Map, 
  Gift,
  Target,
  Crown,
  Swords,
  Sparkles,
  Camera,
  Volume2
} from "lucide-react";

export default function ARGameHub() {
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [avatarStats, setAvatarStats] = useState({
    level: 12,
    experience: 2450,
    nextLevelXP: 3000,
    energy: 85,
    skills: {
      cooking: { level: 7, xp: 1200 },
      fitness: { level: 4, xp: 600 },
      art: { level: 6, xp: 950 },
      social: { level: 8, xp: 1400 },
      explorer: { level: 9, xp: 1800 }
    },
    inventory: [
      { id: 1, name: "Golden Spatula", rarity: "legendary", effect: "+50% Cooking XP" },
      { id: 2, name: "Friendship Badge", rarity: "epic", effect: "+30% Social XP" },
      { id: 3, name: "Explorer's Compass", rarity: "rare", effect: "Reveals hidden collectibles" }
    ],
    badges: ["Master Chef", "Social Butterfly", "Trail Blazer", "Team Captain"]
  });

  const activeChallenges = [
    {
      id: 1,
      type: "cooking_quest",
      title: "The Great Pizza Challenge",
      business: "Mario's Authentic Pizzeria",
      difficulty: "Medium",
      participants: 12,
      maxParticipants: 20,
      timeRemaining: "2h 15m",
      reward: "Rare: Chef's Hat (+25% Cooking XP)",
      description: "Master the art of pizza making in this immersive AR cooking experience",
      skills: ["cooking", "social"],
      arPreview: "🍕"
    },
    {
      id: 2,
      type: "fitness_challenge",
      title: "Strength Training Academy",
      business: "PowerFit Gym",
      difficulty: "Hard",
      participants: 8,
      maxParticipants: 15,
      timeRemaining: "1h 45m",
      reward: "Epic: Strength Bracelet (+40% Fitness XP)",
      description: "Train with virtual personal trainers in this high-intensity AR workout",
      skills: ["fitness", "social"],
      arPreview: "💪"
    },
    {
      id: 3,
      type: "art_creation",
      title: "Digital Mural Masterpiece",
      business: "Creative Canvas Studio",
      difficulty: "Easy",
      participants: 15,
      maxParticipants: 25,
      timeRemaining: "3h 30m",
      reward: "Common: Paint Palette (+15% Art XP)",
      description: "Collaborate with others to create a stunning AR mural",
      skills: ["art", "social"],
      arPreview: "🎨"
    }
  ];

  const socialFeatures = [
    {
      type: "team_battle",
      title: "Coffee Shop Conquest",
      description: "Teams compete to claim coffee shops across the city",
      participants: 156,
      reward: "Team Victory Crown",
      status: "Live Battle"
    },
    {
      type: "avatar_meetup",
      title: "Downtown Social Hour",
      description: "Meet friends' avatars for collaborative challenges",
      participants: 43,
      reward: "Social Interaction Bonus",
      status: "Starting Soon"
    },
    {
      type: "item_trade",
      title: "Rare Collectible Exchange",
      description: "Trade unique items found at different businesses",
      participants: 89,
      reward: "Trader's Badge",
      status: "Active"
    }
  ];

  const businessTransformations = [
    {
      business: "Joe's Coffee Shop",
      transformation: "Enchanted Café",
      description: "Magical brewing station with potion-making mini-games",
      collectibles: ["Magic Beans", "Golden Spoon", "Aroma Crystal"],
      arFeatures: ["Interactive brewing", "Spell casting", "Ingredient collection"]
    },
    {
      business: "FitZone Gym",
      transformation: "Warrior Training Ground",
      description: "Epic fitness challenges with mythical creature battles",
      collectibles: ["Strength Gem", "Endurance Stone", "Victory Medal"],
      arFeatures: ["Battle simulations", "Power-up collection", "Team formations"]
    },
    {
      business: "Artist's Corner",
      transformation: "Creative Dimension",
      description: "Interdimensional art studio with impossible physics",
      collectibles: ["Color Essence", "Inspiration Orb", "Creative Spark"],
      arFeatures: ["3D painting", "Reality manipulation", "Collaborative creation"]
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center mb-4">
          <img 
            src={cirqlbackLogo} 
            alt="Cirqlback" 
            className="h-8 w-auto mr-4 logo-transparent"
          />
          <h1 className="text-4xl font-bold gradient-text">
            Cirqlback AR Hub
          </h1>
        </div>
        <p className="text-gray-600 text-lg max-w-3xl mx-auto">
          Transform every Cirql tap into an immersive AR adventure. Build your avatar, join team battles, 
          collect rare items, and turn local businesses into interactive game worlds - all connected to your loyalty progress.
        </p>
      </div>

      <Tabs defaultValue="challenges" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="challenges">Active Challenges</TabsTrigger>
          <TabsTrigger value="avatar">Avatar Progress</TabsTrigger>
          <TabsTrigger value="social">Social Features</TabsTrigger>
          <TabsTrigger value="transforms">Business AR</TabsTrigger>
          <TabsTrigger value="rewards">Rewards & Items</TabsTrigger>
        </TabsList>

        {/* Active Challenges */}
        <TabsContent value="challenges" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeChallenges.map((challenge) => (
              <Card key={challenge.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">
                      {challenge.difficulty}
                    </Badge>
                    <span className="text-3xl">{challenge.arPreview}</span>
                  </div>
                  <CardTitle className="text-lg">{challenge.title}</CardTitle>
                  <p className="text-sm text-gray-600">{challenge.business}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-700">{challenge.description}</p>
                  
                  <div className="flex flex-wrap gap-1">
                    {challenge.skills.map(skill => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Participants:</span>
                      <span>{challenge.participants}/{challenge.maxParticipants}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time Remaining:</span>
                      <span className="text-orange-600 font-semibold">{challenge.timeRemaining}</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-3 rounded-lg">
                    <div className="text-xs font-semibold text-orange-800 mb-1">Reward:</div>
                    <div className="text-sm text-orange-700">{challenge.reward}</div>
                  </div>

                  <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                    <Camera className="h-4 w-4 mr-2" />
                    Start AR Challenge
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Avatar Progress */}
        <TabsContent value="avatar" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="h-5 w-5 mr-2 text-yellow-500" />
                  Avatar Level & Experience
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">Level {avatarStats.level}</div>
                  <div className="bg-purple-200 rounded-full h-3 mt-2">
                    <div 
                      className="bg-purple-600 h-3 rounded-full transition-all"
                      style={{ width: `${(avatarStats.experience / avatarStats.nextLevelXP) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {avatarStats.experience} / {avatarStats.nextLevelXP} XP
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(avatarStats.skills).map(([skill, data]) => (
                    <div key={skill} className="text-center bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm font-semibold capitalize text-gray-700">{skill}</div>
                      <div className="text-lg font-bold text-purple-600">Level {data.level}</div>
                      <div className="bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-gradient-to-r from-purple-400 to-blue-400 h-2 rounded-full"
                          style={{ width: `${(data.xp % 200) / 200 * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Gift className="h-5 w-5 mr-2 text-green-500" />
                  Inventory & Badges
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Active Items</h4>
                  <div className="space-y-2">
                    {avatarStats.inventory.map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <div>
                          <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-xs text-gray-600">{item.effect}</div>
                        </div>
                        <Badge variant={item.rarity === "legendary" ? "default" : "secondary"}>
                          {item.rarity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Achievement Badges</h4>
                  <div className="flex flex-wrap gap-1">
                    {avatarStats.badges.map(badge => (
                      <Badge key={badge} className="text-xs">
                        <Crown className="h-3 w-3 mr-1" />
                        {badge}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Social Features */}
        <TabsContent value="social" className="space-y-6">
          <div className="grid gap-6">
            {socialFeatures.map((feature, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-2 rounded-lg">
                        {feature.type === "team_battle" && <Swords className="h-5 w-5 text-white" />}
                        {feature.type === "avatar_meetup" && <Users className="h-5 w-5 text-white" />}
                        {feature.type === "item_trade" && <Gift className="h-5 w-5 text-white" />}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{feature.title}</h3>
                        <p className="text-gray-600">{feature.description}</p>
                      </div>
                    </div>
                    <Badge variant={feature.status === "Live Battle" ? "destructive" : "default"}>
                      {feature.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {feature.participants} participants
                      </span>
                      <span className="flex items-center">
                        <Trophy className="h-4 w-4 mr-1" />
                        {feature.reward}
                      </span>
                    </div>
                    
                    <Button variant="outline" className="ml-4">
                      Join Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Business Transformations */}
        <TabsContent value="transforms" className="space-y-6">
          <div className="grid gap-6">
            {businessTransformations.map((transform, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg text-purple-600">{transform.transformation}</h3>
                      <p className="text-gray-600">{transform.business}</p>
                      <p className="text-sm text-gray-700 mt-2">{transform.description}</p>
                    </div>
                    <Sparkles className="h-6 w-6 text-purple-500" />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2 text-sm">Collectible Items</h4>
                      <div className="flex flex-wrap gap-1">
                        {transform.collectibles.map(item => (
                          <Badge key={item} variant="outline" className="text-xs">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2 text-sm">AR Features</h4>
                      <div className="flex flex-wrap gap-1">
                        {transform.arFeatures.map(feature => (
                          <Badge key={feature} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <Button variant="outline" size="sm">
                      <Map className="h-4 w-4 mr-2" />
                      View on Map
                    </Button>
                    <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600">
                      <Camera className="h-4 w-4 mr-2" />
                      Experience AR
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Rewards & Items */}
        <TabsContent value="rewards" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Daily Rewards</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
                  <div className="font-semibold text-green-800">Today's Bonus Available!</div>
                  <div className="text-sm text-green-700 mt-1">
                    Visit any local business to claim +50 XP and mystery item
                  </div>
                  <Button size="sm" className="mt-2 bg-green-600 hover:bg-green-700">
                    Claim Reward
                  </Button>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {[1,2,3,4,5,6,7].map(day => (
                    <div key={day} className={`text-center p-2 rounded text-xs ${day <= 3 ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                      Day {day}
                      {day <= 3 && <div className="text-xs">✓</div>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Streak Bonuses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">🔥 7 Day Streak</div>
                  <div className="text-sm text-gray-600">Keep visiting to maintain your streak!</div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current Streak Bonus:</span>
                    <span className="font-semibold text-orange-600">+35% XP</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Next Milestone (10 days):</span>
                    <span className="text-purple-600">Rare Item Guaranteed</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Collectibles Showcase</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: "Dragon Coffee Bean", rarity: "legendary", found: true },
                  { name: "Artist's Inspiration", rarity: "epic", found: true },
                  { name: "Friendship Gem", rarity: "rare", found: false },
                  { name: "Golden Dumbbell", rarity: "epic", found: false }
                ].map((item, index) => (
                  <div key={index} className={`text-center p-3 rounded-lg border-2 ${item.found ? 'border-purple-200 bg-purple-50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className={`text-2xl mb-2 ${item.found ? '' : 'opacity-30'}`}>
                      {item.rarity === "legendary" ? "🏆" : item.rarity === "epic" ? "💎" : "⭐"}
                    </div>
                    <div className={`text-xs font-semibold ${item.found ? 'text-purple-800' : 'text-gray-500'}`}>
                      {item.name}
                    </div>
                    <Badge variant={item.found ? "default" : "outline"} className="text-xs mt-1">
                      {item.rarity}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}