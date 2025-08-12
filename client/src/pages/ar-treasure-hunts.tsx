import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Compass, Camera, Gift, Clock, Users, Star, Trophy, Search, Plus, Zap } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ArTreasureHunt {
  id: string;
  title: string;
  description: string;
  huntType: 'business_specific' | 'neighborhood' | 'city_wide';
  clues: Array<{
    id: string;
    text: string;
    location: string;
    businessId?: string;
    businessName?: string;
    hint?: string;
  }>;
  requiredBusinesses: string[];
  treasureLocations: Array<{
    lat: number;
    lng: number;
    businessId?: string;
    reward: string;
  }>;
  finalReward: {
    type: 'points' | 'discount' | 'prize' | 'badge';
    value: number;
    description: string;
  };
  participantCount: number;
  completionCount: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary';
  estimatedDuration: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  userProgress?: {
    currentClue: number;
    cluesCompleted: string[];
    treasuresFound: number;
    isCompleted: boolean;
    totalTime: number;
  };
}

interface ArExperience {
  id: string;
  businessId: string;
  businessName: string;
  title: string;
  description: string;
  experienceType: 'treasure_hunt' | 'virtual_menu' | 'game' | 'showcase';
  triggerType: 'nfc_tap' | 'location' | 'qr_code' | 'manual';
  rewardPoints: number;
  playCount: number;
  averageRating: number;
  isActive: boolean;
}

export default function ArTreasureHunts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("");
  const [newHuntOpen, setNewHuntOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [activeHunt, setActiveHunt] = useState<ArTreasureHunt | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: treasureHunts = [], isLoading: loadingHunts } = useQuery({
    queryKey: ["/api/ar/treasure-hunts", searchTerm, selectedDifficulty],
  });

  const { data: arExperiences = [], isLoading: loadingExperiences } = useQuery({
    queryKey: ["/api/ar/experiences"],
  });

  const { data: myProgress = [], isLoading: loadingProgress } = useQuery({
    queryKey: ["/api/ar/my-progress"],
  });

  const joinHuntMutation = useMutation({
    mutationFn: async (huntId: string) => {
      await apiRequest("POST", `/api/ar/treasure-hunts/${huntId}/join`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ar/treasure-hunts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ar/my-progress"] });
      toast({
        title: "Hunt Joined!",
        description: "Your AR treasure hunt has begun. Check your first clue!",
      });
    },
  });

  const submitClueAnswerMutation = useMutation({
    mutationFn: async ({ huntId, clueId, answer }: { huntId: string; clueId: string; answer: string }) => {
      await apiRequest("POST", `/api/ar/treasure-hunts/${huntId}/clues/${clueId}/submit`, { answer });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ar/my-progress"] });
      toast({
        title: "Clue Solved!",
        description: "Great work! You've unlocked the next clue.",
      });
    },
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-orange-500';
      case 'legendary': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getHuntTypeIcon = (type: string) => {
    switch (type) {
      case 'business_specific': return <MapPin className="w-4 h-4" />;
      case 'neighborhood': return <Compass className="w-4 h-4" />;
      case 'city_wide': return <Star className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  if (loadingHunts || loadingExperiences || loadingProgress) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Compass className="w-8 h-8 text-green-600" />
          <div>
            <h1 className="text-3xl font-bold">AR Treasure Hunts</h1>
            <p className="text-muted-foreground">Discover local businesses through immersive AR adventures</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCameraOpen(true)}
          >
            <Camera className="w-4 h-4 mr-2" />
            Scan AR
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Hunt
          </Button>
        </div>
      </div>

      <Tabs defaultValue="active-hunts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active-hunts">Active Hunts</TabsTrigger>
          <TabsTrigger value="my-progress">My Progress</TabsTrigger>
          <TabsTrigger value="ar-experiences">AR Experiences</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="active-hunts" className="space-y-6">
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search treasure hunts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Difficulties</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
                <SelectItem value="legendary">Legendary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(treasureHunts as ArTreasureHunt[])
              .filter(hunt => hunt.isActive && !hunt.userProgress?.isCompleted)
              .map((hunt) => (
              <Card key={hunt.id} className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-orange-400 to-pink-600 opacity-10 rounded-bl-full" />
                
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getHuntTypeIcon(hunt.huntType)}
                    {hunt.title}
                  </CardTitle>
                  <Badge className={getDifficultyColor(hunt.difficulty)}>
                    {hunt.difficulty.toUpperCase()}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">{hunt.description}</p>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{hunt.participantCount} joined</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>~{hunt.estimatedDuration}min</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Final Reward:</div>
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm">{hunt.finalReward.description}</span>
                      </div>
                    </div>

                    <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                      {hunt.clues.length} clues • {hunt.treasureLocations.length} treasure locations
                    </div>

                    {hunt.userProgress ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{hunt.userProgress.cluesCompleted.length}/{hunt.clues.length}</span>
                        </div>
                        <Progress 
                          value={(hunt.userProgress.cluesCompleted.length / hunt.clues.length) * 100} 
                        />
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => setActiveHunt(hunt)}
                        >
                          Continue Hunt
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => joinHuntMutation.mutate(hunt.id)}
                        disabled={joinHuntMutation.isPending}
                      >
                        <Compass className="w-4 h-4 mr-2" />
                        Start Hunt
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="my-progress" className="space-y-6">
          {myProgress.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Compass className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No Active Hunts</h3>
                <p className="text-muted-foreground mb-4">Start your first treasure hunt to begin exploring!</p>
                <Button>Browse Available Hunts</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {myProgress.map((progress: any) => (
                <Card key={progress.huntId}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{progress.huntTitle}</CardTitle>
                      <Badge variant={progress.isCompleted ? "default" : "secondary"}>
                        {progress.isCompleted ? "Completed" : "In Progress"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span>Clues Solved</span>
                        <span>{progress.cluesCompleted.length}/{progress.totalClues}</span>
                      </div>
                      <Progress 
                        value={(progress.cluesCompleted.length / progress.totalClues) * 100} 
                      />
                      
                      {!progress.isCompleted && progress.currentClue && (
                        <Card className="bg-blue-50 border-blue-200">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Current Clue</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm mb-3">{progress.currentClue.text}</p>
                            {progress.currentClue.hint && (
                              <p className="text-xs text-muted-foreground mb-3">
                                💡 Hint: {progress.currentClue.hint}
                              </p>
                            )}
                            <div className="flex gap-2">
                              <Input 
                                placeholder="Enter your answer..."
                                className="text-sm"
                              />
                              <Button size="sm">
                                Submit
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {progress.isCompleted && (
                        <div className="text-center text-green-600 bg-green-50 p-4 rounded">
                          <Trophy className="w-8 h-8 mx-auto mb-2" />
                          <div className="font-medium">Hunt Completed!</div>
                          <div className="text-sm">Time: {Math.floor(progress.totalTime / 60)}m {progress.totalTime % 60}s</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ar-experiences" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(arExperiences as ArExperience[]).map((experience) => (
              <Card key={experience.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{experience.title}</CardTitle>
                  <CardDescription>{experience.businessName}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">{experience.description}</p>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span>{experience.averageRating || 'New'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{experience.playCount} played</span>
                      </div>
                    </div>

                    <div className="text-sm">
                      <span className="text-muted-foreground">Trigger:</span>
                      <span className="ml-2 capitalize">{experience.triggerType.replace('_', ' ')}</span>
                    </div>

                    <div className="text-sm">
                      <span className="text-muted-foreground">Reward:</span>
                      <span className="ml-2">{experience.rewardPoints} points</span>
                    </div>

                    <Button size="sm" className="w-full">
                      <Zap className="w-4 h-4 mr-2" />
                      Experience AR
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(treasureHunts as ArTreasureHunt[])
              .filter(hunt => hunt.userProgress?.isCompleted)
              .map((hunt) => (
              <Card key={hunt.id} className="border-green-200 bg-green-50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                      {hunt.title}
                    </CardTitle>
                    <Badge className="bg-green-500">Completed</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Completion Time:</span>
                      <span className="ml-2 font-medium">
                        {Math.floor((hunt.userProgress?.totalTime || 0) / 60)}m {(hunt.userProgress?.totalTime || 0) % 60}s
                      </span>
                    </div>

                    <div className="text-sm">
                      <span className="text-muted-foreground">Treasures Found:</span>
                      <span className="ml-2 font-medium">{hunt.userProgress?.treasuresFound}</span>
                    </div>

                    <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                      <Gift className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">
                        {hunt.finalReward.description}
                      </span>
                    </div>

                    <Button size="sm" variant="outline" className="w-full">
                      View Certificate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* AR Camera Modal */}
      <Dialog open={cameraOpen} onOpenChange={setCameraOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>AR Scanner</DialogTitle>
            <DialogDescription>
              Point your camera at an AR marker or Cirql tag to start an experience
            </DialogDescription>
          </DialogHeader>
          <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
            <div className="text-white text-center">
              <Camera className="w-12 h-12 mx-auto mb-4" />
              <p>Camera access needed for AR experiences</p>
              <Button className="mt-4" onClick={() => setCameraOpen(false)}>
                Enable Camera
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Active Hunt Modal */}
      <Dialog open={!!activeHunt} onOpenChange={() => setActiveHunt(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{activeHunt?.title}</DialogTitle>
            <DialogDescription>
              Current Progress: {activeHunt?.userProgress?.cluesCompleted.length}/{activeHunt?.clues.length} clues
            </DialogDescription>
          </DialogHeader>
          {activeHunt?.userProgress && (
            <div className="space-y-4">
              <Progress 
                value={(activeHunt.userProgress.cluesCompleted.length / activeHunt.clues.length) * 100} 
              />
              
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="text-sm font-medium mb-2">Next Clue:</div>
                  <p className="text-sm">{activeHunt.clues[activeHunt.userProgress.currentClue]?.text}</p>
                  {activeHunt.clues[activeHunt.userProgress.currentClue]?.hint && (
                    <p className="text-xs text-muted-foreground mt-2">
                      💡 {activeHunt.clues[activeHunt.userProgress.currentClue].hint}
                    </p>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button className="flex-1">
                  <MapPin className="w-4 h-4 mr-2" />
                  Get Directions
                </Button>
                <Button variant="outline" className="flex-1">
                  <Camera className="w-4 h-4 mr-2" />
                  Scan AR
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}