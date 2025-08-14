import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

// Avatar customization system inspired by popular games
const avatarAssets = {
  body: {
    skinTone: [
      { id: 'skin_1', name: 'Fair', color: '#FDBCB4', cost: 0, owned: true },
      { id: 'skin_2', name: 'Light', color: '#EDB98A', cost: 0, owned: true },
      { id: 'skin_3', name: 'Medium', color: '#C67F3C', cost: 0, owned: true },
      { id: 'skin_4', name: 'Tan', color: '#8B4A2B', cost: 0, owned: true },
      { id: 'skin_5', name: 'Dark', color: '#58311A', cost: 0, owned: true },
    ]
  },
  hair: {
    style: [
      { id: 'hair_1', name: 'Short & Clean', style: 'modern', cost: 0, owned: true },
      { id: 'hair_2', name: 'Flowing Waves', style: 'elegant', cost: 150, owned: true },
      { id: 'hair_3', name: 'Edgy Spikes', style: 'punk', cost: 200, owned: false },
      { id: 'hair_4', name: 'Long & Straight', style: 'classic', cost: 100, owned: true },
      { id: 'hair_5', name: 'Curly Afro', style: 'natural', cost: 120, owned: false },
      { id: 'hair_6', name: 'Buzz Cut', style: 'minimal', cost: 0, owned: true },
    ],
    color: [
      { id: 'color_1', name: 'Natural Black', color: '#2C1B18', cost: 0, owned: true },
      { id: 'color_2', name: 'Chocolate Brown', color: '#8B4513', cost: 0, owned: true },
      { id: 'color_3', name: 'Golden Blonde', color: '#DAA520', cost: 80, owned: false },
      { id: 'color_4', name: 'Auburn Red', color: '#A0522D', cost: 100, owned: false },
      { id: 'color_5', name: 'Platinum Silver', color: '#C0C0C0', cost: 250, owned: false },
      { id: 'color_6', name: 'Electric Blue', color: '#4169E1', cost: 300, owned: false },
    ]
  },
  clothing: {
    style: [
      { id: 'outfit_1', name: 'Casual Explorer', theme: 'adventure', cost: 0, owned: true },
      { id: 'outfit_2', name: 'Business Professional', theme: 'corporate', cost: 200, owned: true },
      { id: 'outfit_3', name: 'Street Fashion', theme: 'urban', cost: 180, owned: false },
      { id: 'outfit_4', name: 'Athletic Gear', theme: 'sporty', cost: 150, owned: false },
      { id: 'outfit_5', name: 'Formal Elegance', theme: 'luxury', cost: 400, owned: false },
      { id: 'outfit_6', name: 'Creative Artist', theme: 'artistic', cost: 220, owned: false },
    ],
    color: [
      { id: 'outfit_color_1', name: 'Classic Black', color: '#2F2F2F', cost: 0, owned: true },
      { id: 'outfit_color_2', name: 'Navy Blue', color: '#1E3A8A', cost: 50, owned: true },
      { id: 'outfit_color_3', name: 'Forest Green', color: '#059669', cost: 75, owned: false },
      { id: 'outfit_color_4', name: 'Burgundy', color: '#991B1B', cost: 100, owned: false },
      { id: 'outfit_color_5', name: 'Royal Purple', color: '#7C3AED', cost: 120, owned: false },
    ]
  },
  accessories: [
    { id: 'acc_1', name: 'Modern Glasses', style: 'intellectual', cost: 80, owned: true },
    { id: 'acc_2', name: 'Sleek Watch', style: 'professional', cost: 150, owned: false },
    { id: 'acc_3', name: 'Statement Necklace', style: 'fashionable', cost: 120, owned: false },
    { id: 'acc_4', name: 'Baseball Cap', style: 'casual', cost: 60, owned: false },
    { id: 'acc_5', name: 'Designer Earrings', style: 'luxury', cost: 200, owned: false },
  ]
};

const defaultAvatar = {
  id: 'avatar_1',
  name: 'CirqlHero',
  level: 12,
  experience: 2450,
  nextLevelXP: 3000,
  coins: 850,
  skinTone: 'skin_1',
  hairStyle: 'hair_1',
  hairColor: 'color_1',
  outfitStyle: 'outfit_1',
  outfitColor: 'outfit_color_1',
  accessories: ['acc_1']
};

export default function AvatarCreator() {
  const { toast } = useToast();
  const [avatar, setAvatar] = useState(defaultAvatar);
  const [selectedCategory, setSelectedCategory] = useState("body");
  const [selectedSubCategory, setSelectedSubCategory] = useState("skinTone");

  const handleAssetSelect = (asset: any, categoryKey: string) => {
    if (!asset.owned && asset.cost > avatar.coins) {
      toast({
        title: "Need More Coins",
        description: `You need ${asset.cost} coins to unlock this ${categoryKey}.`,
        variant: "destructive"
      });
      return;
    }

    if (!asset.owned) {
      // Purchase and equip
      setAvatar(prev => ({
        ...prev,
        coins: prev.coins - asset.cost,
        [categoryKey]: asset.id
      }));
      
      toast({
        title: "Unlocked & Applied",
        description: `${asset.name} added to your avatar.`,
      });
    } else {
      // Just equip
      setAvatar(prev => ({
        ...prev,
        [categoryKey]: asset.id
      }));
    }
  };

  const getAvatarPreview = () => {
    const skinTone = avatarAssets.body.skinTone.find(s => s.id === avatar.skinTone);
    const hairColor = avatarAssets.hair.color.find(c => c.id === avatar.hairColor);
    const outfitColor = avatarAssets.clothing.color.find(c => c.id === avatar.outfitColor);
    
    return {
      skinColor: skinTone?.color || '#FDBCB4',
      hairColor: hairColor?.color || '#2C1B18',
      outfitColor: outfitColor?.color || '#2F2F2F'
    };
  };

  const avatarPreview = getAvatarPreview();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/customer-bento">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Hub
            </Button>
          </Link>
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-green-600 bg-clip-text text-transparent">
              Create Your Avatar
            </h1>
            <p className="text-gray-600 text-lg">Design your unique Cirqlback character</p>
          </div>
          <div className="w-24"></div>
        </div>

        {/* Main Creator Interface */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Avatar Preview */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-center">Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Large Avatar Display */}
                <div className="relative mx-auto w-64 h-80 bg-gradient-to-b from-gray-100 to-gray-200 rounded-2xl overflow-hidden">
                  {/* Background */}
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-200 to-purple-200"></div>
                  
                  {/* Avatar Body */}
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
                    {/* Head */}
                    <div 
                      className="w-20 h-20 rounded-full mx-auto mb-2"
                      style={{ backgroundColor: avatarPreview.skinColor }}
                    ></div>
                    
                    {/* Hair */}
                    <div 
                      className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 w-24 h-12 rounded-full"
                      style={{ backgroundColor: avatarPreview.hairColor }}
                    ></div>
                    
                    {/* Body */}
                    <div 
                      className="w-32 h-40 rounded-t-3xl mx-auto"
                      style={{ backgroundColor: avatarPreview.outfitColor }}
                    ></div>
                  </div>
                </div>

                {/* Avatar Stats */}
                <div className="space-y-3">
                  <div className="text-center">
                    <h3 className="font-bold text-lg">{avatar.name}</h3>
                    <p className="text-gray-600">Level {avatar.level}</p>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Experience</span>
                    <span className="text-sm text-purple-600">{avatar.experience} / {avatar.nextLevelXP}</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${(avatar.experience / avatar.nextLevelXP) * 100}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-center gap-2 bg-yellow-50 p-3 rounded-lg">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                    <span className="font-semibold">{avatar.coins} Coins</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                      Save Avatar
                    </Button>
                    <Button variant="outline" className="px-4">
                      Share
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customization Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Category Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Customize Your Avatar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <Button 
                    variant={selectedCategory === "body" ? "default" : "outline"}
                    onClick={() => {
                      setSelectedCategory("body");
                      setSelectedSubCategory("skinTone");
                    }}
                    className="h-16 flex-col gap-2"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-300 to-yellow-300 rounded-full"></div>
                    Body
                  </Button>
                  
                  <Button 
                    variant={selectedCategory === "hair" ? "default" : "outline"}
                    onClick={() => {
                      setSelectedCategory("hair");
                      setSelectedSubCategory("style");
                    }}
                    className="h-16 flex-col gap-2"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-600 to-yellow-600 rounded-full"></div>
                    Hair
                  </Button>
                  
                  <Button 
                    variant={selectedCategory === "clothing" ? "default" : "outline"}
                    onClick={() => {
                      setSelectedCategory("clothing");
                      setSelectedSubCategory("style");
                    }}
                    className="h-16 flex-col gap-2"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full"></div>
                    Clothing
                  </Button>
                </div>

                {/* Sub-category selection for hair and clothing */}
                {(selectedCategory === "hair" || selectedCategory === "clothing") && (
                  <div className="flex gap-2 mb-4">
                    <Button
                      variant={selectedSubCategory === "style" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedSubCategory("style")}
                    >
                      Style
                    </Button>
                    <Button
                      variant={selectedSubCategory === "color" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedSubCategory("color")}
                    >
                      Color
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Options Grid */}
            <Card>
              <CardContent className="p-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {selectedCategory === "body" && avatarAssets.body.skinTone.map(item => (
                    <div 
                      key={item.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        avatar.skinTone === item.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                      }`}
                      onClick={() => handleAssetSelect(item, 'skinTone')}
                    >
                      <div 
                        className="w-16 h-16 rounded-full mx-auto mb-3"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <h4 className="text-center font-medium">{item.name}</h4>
                      <p className="text-center text-xs text-gray-500 mt-1">
                        {item.cost === 0 ? 'Free' : `${item.cost} coins`}
                      </p>
                    </div>
                  ))}

                  {selectedCategory === "hair" && selectedSubCategory === "style" && avatarAssets.hair.style.map(item => (
                    <div 
                      key={item.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        avatar.hairStyle === item.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                      }`}
                      onClick={() => handleAssetSelect(item, 'hairStyle')}
                    >
                      <div className="w-16 h-8 bg-gray-800 rounded-t-full mx-auto mb-3"></div>
                      <h4 className="text-center font-medium">{item.name}</h4>
                      <p className="text-center text-xs text-gray-500 mt-1">
                        {item.cost === 0 ? 'Free' : `${item.cost} coins`}
                      </p>
                      {!item.owned && item.cost > avatar.coins && (
                        <p className="text-center text-xs text-red-500 mt-1">Need more coins</p>
                      )}
                    </div>
                  ))}

                  {selectedCategory === "hair" && selectedSubCategory === "color" && avatarAssets.hair.color.map(item => (
                    <div 
                      key={item.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        avatar.hairColor === item.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                      }`}
                      onClick={() => handleAssetSelect(item, 'hairColor')}
                    >
                      <div 
                        className="w-16 h-8 rounded-t-full mx-auto mb-3"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <h4 className="text-center font-medium">{item.name}</h4>
                      <p className="text-center text-xs text-gray-500 mt-1">
                        {item.cost === 0 ? 'Free' : `${item.cost} coins`}
                      </p>
                      {!item.owned && item.cost > avatar.coins && (
                        <p className="text-center text-xs text-red-500 mt-1">Need more coins</p>
                      )}
                    </div>
                  ))}

                  {selectedCategory === "clothing" && selectedSubCategory === "style" && avatarAssets.clothing.style.map(item => (
                    <div 
                      key={item.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        avatar.outfitStyle === item.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                      }`}
                      onClick={() => handleAssetSelect(item, 'outfitStyle')}
                    >
                      <div className="w-16 h-20 bg-gray-600 rounded mx-auto mb-3"></div>
                      <h4 className="text-center font-medium">{item.name}</h4>
                      <p className="text-center text-xs text-purple-600 mt-1">{item.theme}</p>
                      <p className="text-center text-xs text-gray-500 mt-1">
                        {item.cost === 0 ? 'Free' : `${item.cost} coins`}
                      </p>
                      {!item.owned && item.cost > avatar.coins && (
                        <p className="text-center text-xs text-red-500 mt-1">Need more coins</p>
                      )}
                    </div>
                  ))}

                  {selectedCategory === "clothing" && selectedSubCategory === "color" && avatarAssets.clothing.color.map(item => (
                    <div 
                      key={item.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        avatar.outfitColor === item.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                      }`}
                      onClick={() => handleAssetSelect(item, 'outfitColor')}
                    >
                      <div 
                        className="w-16 h-20 rounded mx-auto mb-3"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <h4 className="text-center font-medium">{item.name}</h4>
                      <p className="text-center text-xs text-gray-500 mt-1">
                        {item.cost === 0 ? 'Free' : `${item.cost} coins`}
                      </p>
                      {!item.owned && item.cost > avatar.coins && (
                        <p className="text-center text-xs text-red-500 mt-1">Need more coins</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Accessories Section */}
            <Card>
              <CardHeader>
                <CardTitle>Accessories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {avatarAssets.accessories.map(item => (
                    <div 
                      key={item.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        avatar.accessories.includes(item.id) ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-purple-300'
                      }`}
                      onClick={() => {
                        if (avatar.accessories.includes(item.id)) {
                          // Remove accessory
                          setAvatar(prev => ({
                            ...prev,
                            accessories: prev.accessories.filter(acc => acc !== item.id)
                          }));
                        } else {
                          // Add accessory (if owned or affordable)
                          if (item.owned || item.cost <= avatar.coins) {
                            setAvatar(prev => ({
                              ...prev,
                              accessories: [...prev.accessories, item.id],
                              coins: item.owned ? prev.coins : prev.coins - item.cost
                            }));
                            if (!item.owned) {
                              toast({
                                title: "Accessory Purchased",
                                description: `${item.name} added to your collection.`,
                              });
                            }
                          } else {
                            toast({
                              title: "Need More Coins",
                              description: `You need ${item.cost} coins for ${item.name}.`,
                              variant: "destructive"
                            });
                          }
                        }
                      }}
                    >
                      <div className="w-16 h-10 bg-gradient-to-r from-purple-400 to-blue-400 rounded mx-auto mb-3"></div>
                      <h4 className="text-center font-medium">{item.name}</h4>
                      <p className="text-center text-xs text-purple-600 mt-1">{item.style}</p>
                      <p className="text-center text-xs text-gray-500 mt-1">
                        {item.cost === 0 ? 'Free' : `${item.cost} coins`}
                      </p>
                      {avatar.accessories.includes(item.id) && (
                        <Badge className="w-full mt-2 bg-green-100 text-green-800">
                          Equipped
                        </Badge>
                      )}
                      {!item.owned && item.cost > avatar.coins && (
                        <p className="text-center text-xs text-red-500 mt-1">Need more coins</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}