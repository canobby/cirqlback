import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Trophy, Target, Calendar, Clock, Star, Crown, Plus, Search, Filter } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Team {
  id: string;
  name: string;
  description: string;
  leaderId: string;
  maxMembers: number;
  currentMembers: number;
  teamType: 'casual' | 'competitive' | 'corporate' | 'family';
  totalPoints: number;
  totalChallengesCompleted: number;
  teamLevel: number;
  teamBadges: string[];
  isPublic: boolean;
  members: Array<{
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    pointsContributed: number;
    joinedAt: string;
  }>;
}

interface CommunityChallenge {
  id: string;
  title: string;
  description: string;
  challengeType: 'individual' | 'team' | 'community' | 'city_wide';
  category: string;
  difficultyLevel: 'easy' | 'medium' | 'hard' | 'epic';
  requirements: any;
  rewards: any;
  participantCount: number;
  completionCount: number;
  maxParticipants: number;
  sponsorBusinessId?: string;
  sponsorBusiness?: {
    name: string;
    category: string;
  };
  isGlobal: boolean;
  startDate: string;
  endDate: string;
  isActive: boolean;
  userProgress?: {
    currentStep: number;
    totalSteps: number;
    isCompleted: boolean;
    pointsEarned: number;
  };
}

export default function TeamChallenges() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [newTeamOpen, setNewTeamOpen] = useState(false);
  const [newTeam, setNewTeam] = useState({
    name: "",
    description: "",
    teamType: "",
    maxMembers: 10,
    isPublic: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: userTeams = [], isLoading: loadingTeams } = useQuery({
    queryKey: ["/api/teams/my-teams"],
  });

  const { data: challenges = [], isLoading: loadingChallenges } = useQuery({
    queryKey: ["/api/challenges", searchTerm, selectedCategory],
  });

  const { data: leaderboard = [], isLoading: loadingLeaderboard } = useQuery({
    queryKey: ["/api/teams/leaderboard"],
  });

  const createTeamMutation = useMutation({
    mutationFn: async (teamData: any) => {
      await apiRequest("POST", "/api/teams", teamData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my-teams"] });
      setNewTeamOpen(false);
      setNewTeam({
        name: "",
        description: "",
        teamType: "",
        maxMembers: 10,
        isPublic: true
      });
      toast({
        title: "Team Created",
        description: "Your team has been created successfully!",
      });
    },
  });

  const joinChallengeMutation = useMutation({
    mutationFn: async ({ challengeId, teamId }: { challengeId: string; teamId?: string }) => {
      await apiRequest("POST", `/api/challenges/${challengeId}/join`, { teamId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      toast({
        title: "Challenge Joined",
        description: "You've successfully joined the challenge!",
      });
    },
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-orange-500';
      case 'epic': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getTeamTypeIcon = (type: string) => {
    switch (type) {
      case 'competitive': return <Trophy className="w-4 h-4" />;
      case 'corporate': return <Target className="w-4 h-4" />;
      case 'family': return <Users className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  if (loadingTeams || loadingChallenges || loadingLeaderboard) {
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
          <Trophy className="w-8 h-8 text-orange-600" />
          <div>
            <h1 className="text-3xl font-bold">Team Challenges</h1>
            <p className="text-muted-foreground">Compete, collaborate, and explore with your team</p>
          </div>
        </div>
        
        <Dialog open={newTeamOpen} onOpenChange={setNewTeamOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Start a team and invite friends to join challenges together
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Team Name</Label>
                <Input
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({...newTeam, name: e.target.value})}
                  placeholder="Enter team name"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  value={newTeam.description}
                  onChange={(e) => setNewTeam({...newTeam, description: e.target.value})}
                  placeholder="Describe your team's goals..."
                />
              </div>

              <div>
                <Label htmlFor="type">Team Type</Label>
                <Select 
                  value={newTeam.teamType} 
                  onValueChange={(value) => setNewTeam({...newTeam, teamType: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="competitive">Competitive</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                    <SelectItem value="family">Family</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="maxMembers">Max Members</Label>
                <Input
                  type="number"
                  min="2"
                  max="50"
                  value={newTeam.maxMembers}
                  onChange={(e) => setNewTeam({...newTeam, maxMembers: parseInt(e.target.value)})}
                />
              </div>

              <Button 
                onClick={() => createTeamMutation.mutate(newTeam)}
                disabled={createTeamMutation.isPending}
                className="w-full"
              >
                Create Team
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="challenges" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="challenges">Active Challenges</TabsTrigger>
          <TabsTrigger value="teams">My Teams</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="create-challenge">Create Challenge</TabsTrigger>
        </TabsList>

        <TabsContent value="challenges" className="space-y-6">
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search challenges..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                <SelectItem value="exploration">Exploration</SelectItem>
                <SelectItem value="social">Social</SelectItem>
                <SelectItem value="spending">Spending</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="seasonal">Seasonal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(challenges as CommunityChallenge[]).map((challenge) => (
              <Card key={challenge.id} className="relative">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg">{challenge.title}</CardTitle>
                  <Badge className={getDifficultyColor(challenge.difficultyLevel)}>
                    {challenge.difficultyLevel.toUpperCase()}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">{challenge.description}</p>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{challenge.participantCount}/{challenge.maxParticipants || '∞'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(challenge.endDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {challenge.sponsorBusiness && (
                      <div className="text-xs text-purple-600 bg-purple-50 p-2 rounded">
                        Sponsored by {challenge.sponsorBusiness.name}
                      </div>
                    )}

                    {challenge.userProgress ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{challenge.userProgress.currentStep}/{challenge.userProgress.totalSteps}</span>
                        </div>
                        <Progress 
                          value={(challenge.userProgress.currentStep / challenge.userProgress.totalSteps) * 100} 
                        />
                        {challenge.userProgress.isCompleted && (
                          <div className="text-green-600 text-sm font-medium">
                            ✓ Completed! Earned {challenge.userProgress.pointsEarned} points
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Rewards:</div>
                        <div className="text-xs text-muted-foreground">
                          {challenge.rewards?.points && `${challenge.rewards.points} points`}
                          {challenge.rewards?.badges && ` • ${challenge.rewards.badges.length} badges`}
                          {challenge.rewards?.prizes && ` • Special prizes`}
                        </div>
                        
                        {challenge.challengeType === 'team' ? (
                          <Select onValueChange={(teamId) => joinChallengeMutation.mutate({ challengeId: challenge.id, teamId })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Join with team" />
                            </SelectTrigger>
                            <SelectContent>
                              {userTeams.map((team: Team) => (
                                <SelectItem key={team.id} value={team.id}>
                                  {team.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Button 
                            size="sm" 
                            className="w-full"
                            onClick={() => joinChallengeMutation.mutate({ challengeId: challenge.id })}
                            disabled={joinChallengeMutation.isPending}
                          >
                            Join Challenge
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="teams" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(userTeams as Team[]).map((team) => (
              <Card key={team.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getTeamTypeIcon(team.teamType)}
                    {team.name}
                  </CardTitle>
                  <Badge variant="outline">Level {team.teamLevel}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">{team.description}</p>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Members:</span>
                        <div className="font-medium">{team.currentMembers}/{team.maxMembers}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Points:</span>
                        <div className="font-medium">{team.totalPoints}</div>
                      </div>
                    </div>

                    <div className="text-sm">
                      <span className="text-muted-foreground">Challenges Completed:</span>
                      <div className="font-medium">{team.totalChallengesCompleted}</div>
                    </div>

                    {team.teamBadges.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {team.teamBadges.slice(0, 3).map((badge, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {badge}
                          </Badge>
                        ))}
                        {team.teamBadges.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{team.teamBadges.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Team Members:</div>
                      <div className="space-y-1">
                        {team.members.slice(0, 3).map((member) => (
                          <div key={member.id} className="flex items-center gap-2 text-sm">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs">
                                {member.firstName[0]}{member.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span>{member.firstName} {member.lastName}</span>
                            {member.role === 'leader' && <Crown className="w-3 h-3 text-yellow-500" />}
                          </div>
                        ))}
                        {team.members.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{team.members.length - 3} more members
                          </div>
                        )}
                      </div>
                    </div>

                    <Button size="sm" className="w-full">
                      View Team Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Team Leaderboard
              </CardTitle>
              <CardDescription>Top performing teams this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaderboard.map((team: any, index: number) => (
                  <div key={team.id} className="flex items-center gap-4 p-3 rounded-lg border">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold">
                      {index + 1}
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-medium">{team.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {team.currentMembers} members • Level {team.teamLevel}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold">{team.totalPoints} pts</div>
                      <div className="text-sm text-muted-foreground">
                        {team.totalChallengesCompleted} challenges
                      </div>
                    </div>

                    {index < 3 && (
                      <Star className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create-challenge" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Community Challenge</CardTitle>
              <CardDescription>
                Design a challenge for your community or business customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Challenge Title</Label>
                  <Input placeholder="Enter challenge title" />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea placeholder="Describe the challenge and what participants need to do..." />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="type">Challenge Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="team">Team</SelectItem>
                        <SelectItem value="community">Community</SelectItem>
                        <SelectItem value="city_wide">City Wide</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                        <SelectItem value="epic">Epic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input type="date" />
                  </div>

                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input type="date" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="rewards">Rewards</Label>
                  <Textarea placeholder="Describe the rewards (points, badges, prizes)..." />
                </div>

                <Button className="w-full">
                  Create Challenge
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}