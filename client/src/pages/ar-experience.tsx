import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Camera, 
  Share2, 
  Trophy, 
  Star, 
  Sparkles, 
  Gift, 
  MapPin,
  Users,
  Play,
  Download,
  Instagram,
  Heart
} from "lucide-react";

interface ARReward {
  id: string;
  type: 'discount' | 'points' | 'badge' | 'collectible';
  title: string;
  description: string;
  value: string;
  animation: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface ARScene {
  id: string;
  businessId: string;
  businessName: string;
  sceneType: 'reward_unlock' | 'progress_update' | 'achievement' | 'easter_egg';
  animation: string;
  rewards: ARReward[];
  isMultiplayer: boolean;
  shareEnabled: boolean;
}

export default function ARExperience() {
  const [, params] = useRoute("/ar/:tapId");
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [arScene, setARScene] = useState<ARScene | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [shareClip, setShareClip] = useState<string | null>(null);
  const [gameScore, setGameScore] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [collectibles, setCollectibles] = useState<Array<{id: string, x: number, y: number, collected: boolean}>>([]);

  // Initialize camera for AR
  useEffect(() => {
    const initializeCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
        }
      } catch (error) {
        console.error('Camera access denied:', error);
        toast({
          title: "Camera Required",
          description: "Please allow camera access for AR experience",
          variant: "destructive"
        });
      }
    };

    initializeCamera();
    
    // Load AR scene based on tap ID
    const loadARScene = () => {
      const mockScene: ARScene = {
        id: params?.tapId || "scene1",
        businessId: "1",
        businessName: "Brew & Beans Coffee",
        sceneType: "reward_unlock",
        animation: "coffee_cup_rising",
        rewards: [
          {
            id: "reward1",
            type: "discount",
            title: "Free Coffee Upgrade",
            description: "Upgrade any drink to large size",
            value: "20% off",
            animation: "steaming_cup",
            rarity: "common"
          },
          {
            id: "reward2", 
            type: "badge",
            title: "Coffee Connoisseur",
            description: "Earned for 5th visit this month",
            value: "Achievement Unlocked",
            animation: "golden_badge",
            rarity: "rare"
          }
        ],
        isMultiplayer: false,
        shareEnabled: true
      };
      setARScene(mockScene);
    };

    loadARScene();
    
    return () => {
      // Cleanup camera stream
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [params?.tapId]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: true 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        
        // Auto-start AR mini-game after camera initializes
        setTimeout(() => {
          if (!gameActive && !showRewards) {
            startARGame();
          }
        }, 2000);
      }
    } catch (error) {
      toast({
        title: "Camera Access Required",
        description: "Please allow camera access to experience AR rewards",
        variant: "destructive",
      });
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    toast({
      title: "Recording Started",
      description: "Capture your AR experience to share!",
    });
    
    // Simulate recording completion
    setTimeout(() => {
      setIsRecording(false);
      setShareClip("mock_ar_clip.mp4");
      toast({
        title: "AR Experience Recorded!",
        description: "Ready to share your magical moment!",
      });
    }, 5000);
  };

  const startARGame = () => {
    setGameActive(true);
    setGameScore(0);
    
    // Spawn random collectibles for AR game
    const newCollectibles = Array.from({length: 5}, (_, i) => ({
      id: `collectible_${i}`,
      x: Math.random() * 80 + 10, // 10-90% position
      y: Math.random() * 60 + 20, // 20-80% position  
      collected: false
    }));
    
    setCollectibles(newCollectibles);
    
    toast({
      title: "AR Game Started!",
      description: "Tap the floating collectibles to earn rewards!"
    });
  };

  const collectItem = (collectibleId: string) => {
    setCollectibles(prev => 
      prev.map(item => 
        item.id === collectibleId ? {...item, collected: true} : item
      )
    );
    
    setGameScore(prev => prev + 100);
    
    // Check if all collected
    const remaining = collectibles.filter(item => !item.collected && item.id !== collectibleId);
    if (remaining.length === 0) {
      setTimeout(() => {
        setGameActive(false);
        setShowRewards(true);
        toast({
          title: "Game Complete!",
          description: `Final Score: ${gameScore + 100}! Rewards unlocked!`
        });
      }, 500);
    }
  };

  const shareToSocial = (platform: string) => {
    toast({
      title: `Sharing to ${platform}`,
      description: "Your AR experience is being shared with Cirqlback branding!",
    });
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'bg-gradient-to-r from-yellow-400 to-orange-500';
      case 'epic': return 'bg-gradient-to-r from-purple-500 to-pink-500';
      case 'rare': return 'bg-gradient-to-r from-blue-500 to-cyan-500';
      default: return 'bg-gradient-to-r from-gray-400 to-gray-600';
    }
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'discount': return <Gift className="h-6 w-6" />;
      case 'points': return <Star className="h-6 w-6" />;
      case 'badge': return <Trophy className="h-6 w-6" />;
      case 'collectible': return <Sparkles className="h-6 w-6" />;
      default: return <Gift className="h-6 w-6" />;
    }
  };

  if (!arScene) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Loading AR Experience...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      {/* AR Camera View */}
      <div className="relative h-screen overflow-hidden">
        {!cameraActive ? (
          <div className="flex flex-col items-center justify-center h-full space-y-6 p-6">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Camera className="h-12 w-12" />
              </div>
              <h1 className="text-3xl font-bold">AR Reward Experience</h1>
              <p className="text-xl text-purple-200">at {arScene.businessName}</p>
              <p className="text-gray-300 max-w-md">
                Point your camera to discover your magical rewards in augmented reality!
              </p>
            </div>
            
            <Button 
              onClick={startCamera}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 text-lg"
            >
              <Camera className="h-6 w-6 mr-2" />
              Start AR Experience
            </Button>
          </div>
        ) : (
          <div className="relative h-full">
            {/* Camera Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* AR Interactive Game Elements */}
            {gameActive && (
              <div className="absolute inset-0">
                {collectibles.map((collectible) => (
                  !collectible.collected && (
                    <button
                      key={collectible.id}
                      onClick={() => collectItem(collectible.id)}
                      style={{
                        position: 'absolute',
                        left: `${collectible.x}%`,
                        top: `${collectible.y}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                      className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-bounce opacity-90 flex items-center justify-center hover:scale-110 transition-transform shadow-lg z-10"
                    >
                      <Sparkles className="h-8 w-8 text-white" />
                    </button>
                  )
                ))}
              </div>
            )}

            {/* AR Game UI Overlay */}
            <div className="absolute top-4 left-4 bg-black/70 text-white p-3 rounded-lg z-20">
              <div className="flex items-center space-x-2">
                <Trophy className="h-5 w-5" />
                <span className="font-semibold">Score: {gameScore}</span>
              </div>
              {gameActive && (
                <div className="text-sm text-green-300 mt-1">
                  Collect: {collectibles.filter(c => !c.collected).length} remaining
                </div>
              )}
            </div>

            {/* Start Game Button */}
            {!gameActive && !showRewards && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
                <Button onClick={startARGame} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                  <Play className="h-4 w-4 mr-2" />
                  Start AR Mini Game
                </Button>
              </div>
            )}

            {/* AR Overlay Elements */}
            {showRewards && (
              <div className="absolute inset-0 pointer-events-none z-10">
                {/* Animated AR Rewards */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="relative">
                    {/* Main Reward Animation */}
                    <div className="animate-bounce">
                      <div className="w-32 h-32 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
                        <Gift className="h-16 w-16 text-white" />
                      </div>
                    </div>
                    
                    {/* Floating Particles */}
                    <div className="absolute -top-4 -left-4 w-4 h-4 bg-yellow-400 rounded-full animate-ping" />
                    <div className="absolute -top-2 -right-6 w-3 h-3 bg-pink-400 rounded-full animate-ping delay-300" />
                    <div className="absolute -bottom-3 -left-5 w-5 h-5 bg-blue-400 rounded-full animate-ping delay-500" />
                    <div className="absolute -bottom-4 -right-4 w-4 h-4 bg-green-400 rounded-full animate-ping delay-700" />
                  </div>
                </div>
                
                {/* Floating Reward Cards */}
                <div className="absolute bottom-20 left-4 right-4">
                  <div className="grid grid-cols-1 gap-3 max-w-sm mx-auto">
                    {arScene.rewards.map((reward, index) => (
                      <div
                        key={reward.id}
                        className={`p-4 rounded-2xl backdrop-blur-md bg-white/20 border border-white/30 transform transition-all duration-1000 ${
                          showRewards ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
                        }`}
                        style={{ transitionDelay: `${index * 300}ms` }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${getRarityColor(reward.rarity)}`}>
                            {getRewardIcon(reward.type)}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-white">{reward.title}</h3>
                            <p className="text-sm text-white/80">{reward.description}</p>
                            <Badge variant="secondary" className="mt-1">
                              {reward.value}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Business Branding Overlay */}
                <div className="absolute top-4 left-4 right-4">
                  <div className="flex items-center justify-between">
                    <div className="backdrop-blur-md bg-black/30 rounded-full px-4 py-2">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-white" />
                        <span className="text-white font-medium">{arScene.businessName}</span>
                      </div>
                    </div>
                    <div className="backdrop-blur-md bg-black/30 rounded-full px-4 py-2">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="h-4 w-4 text-yellow-400" />
                        <span className="text-white text-sm">Cirqlback AR</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* AR Controls */}
            <div className="absolute bottom-6 left-6 right-6 pointer-events-auto">
              <div className="flex items-center justify-center space-x-4">
                {shareClip ? (
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => shareToSocial('Instagram')}
                      className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
                    >
                      <Instagram className="h-4 w-4 mr-2" />
                      Instagram
                    </Button>
                    <Button
                      onClick={() => shareToSocial('TikTok')}
                      className="bg-gradient-to-r from-black to-gray-800 hover:from-gray-800 hover:to-gray-900"
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      TikTok
                    </Button>
                    <Button
                      onClick={() => shareToSocial('Share')}
                      variant="outline"
                      className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      More
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={startRecording}
                    disabled={!showRewards || isRecording}
                    className={`px-8 py-4 text-lg ${
                      isRecording 
                        ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                    }`}
                  >
                    {isRecording ? (
                      <>
                        <div className="w-4 h-4 bg-white rounded-full mr-2 animate-pulse" />
                        Recording...
                      </>
                    ) : (
                      <>
                        <Play className="h-6 w-6 mr-2" />
                        Record AR Experience
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
            
            {/* Multiplayer Elements */}
            {arScene.isMultiplayer && (
              <div className="absolute top-20 right-4">
                <div className="backdrop-blur-md bg-black/30 rounded-xl p-3">
                  <div className="flex items-center space-x-2 text-white">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">3 others viewing</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}