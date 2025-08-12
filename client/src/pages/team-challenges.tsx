import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users,
  Trophy,
  Zap,
  Target,
  Crown,
  Star,
  Clock,
  MapPin,
  Gift,
  Award,
  TrendingUp,
  Flame,
  Heart,
  Shield,
  Swords,
  UserPlus,
  Calendar,
  BarChart3,
  Medal,
  Sparkles,
  ChevronRight,
  Plus,
  Search,
  Filter
} from "lucide-react";

export default function TeamChallenges() {
  const [selectedTeam, setSelectedTeam] = useState("my-team");
  const [challengeFilter, setChallengeFilter] = useState("active");
  const [teamType, setTeamType] = useState("competitive");

  // Mock data for team challenges
  const myTeam = {
    id: 1,
    name: "Downtown Explorers",
    type: "Competitive",
    members: 8,
    maxMembers: 12,
    level: 15,
    points: 12450,
    rank: 3,
    streak: 7,
    avatar: "/api/placeholder/64/64",
    badges: ["Explorer", "Loyal Customer", "Social Butterfly"]
  };

  const teamMembers = [
    { id: 1, name: "Sarah Johnson", avatar: "/api/placeholder/32/32", points: 2850, role: "Captain", online: true },
    { id: 2, name: "Mike Chen", avatar: "/api/placeholder/32/32", points: 2340, role: "Co-Captain", online: true },
    { id: 3, name: "Emma Davis", avatar: "/api/placeholder/32/32", points: 1980, role: "Member", online: false },
    { id: 4, name: "Alex Rodriguez", avatar: "/api/placeholder/32/32", points: 1750, role: "Member", online: true },
    { id: 5, name: "Lisa Wong", avatar: "/api/placeholder/32/32", points: 1520, role: "Member", online: false },
    { id: 6, name: "David Kim", avatar: "/api/placeholder/32/32", points: 1340, role: "Member", online: true },
    { id: 7, name: "Rachel Green", avatar: "/api/placeholder/32/32", points: 1180, role: "Member", online: true },
    { id: 8, name: "Tom Wilson", avatar: "/api/placeholder/32/32", points: 980, role: "Rookie", online: false }
  ];

  const activeChallenges = [
    {
      id: 1,
      title: "Coffee Shop Conquest",
      description: "Visit 10 different coffee shops this week",
      type: "Business Discovery",
      difficulty: "Medium",
      reward: "500 points + Free Coffee Badge",
      progress: 60,
      timeLeft: "3 days",
      participants: 156,
      businesses: ["Brew & Bite", "Coffee Corner", "Morning Rush"],
      teamProgress: 6
    },
    {
      id: 2,
      title: "Weekend Warriors",
      description: "Complete 5 check-ins during weekend hours",
      type: "Social Activity",
      difficulty: "Easy",
      reward: "300 points + Weekend Badge",
      progress: 80,
      timeLeft: "2 days",
      participants: 89,
      businesses: ["Various"],
      teamProgress: 4
    },
    {
      id: 3,
      title: "Local Foodie Challenge",
      description: "Try signature dishes at 8 local restaurants",
      type: "Culinary Adventure",
      difficulty: "Hard",
      reward: "1000 points + Foodie Crown",
      progress: 25,
      timeLeft: "1 week",
      participants: 203,
      businesses: ["Bistro 21", "Sunset Grill", "Farm Table"],
      teamProgress: 2
    }
  ];

  const leaderboard = [
    { rank: 1, team: "City Champions", points: 18750, members: 12, badge: "🏆" },
    { rank: 2, team: "Local Legends", points: 15420, members: 10, badge: "🥈" },
    { rank: 3, team: "Downtown Explorers", points: 12450, members: 8, badge: "🥉" },
    { rank: 4, team: "Business Boosters", points: 11200, members: 11, badge: "⭐" },
    { rank: 5, team: "Community Connectors", points: 9850, members: 7, badge: "🌟" }
  ];

  const teamTypes = [
    {
      type: "Casual",
      description: "Relaxed challenges with flexible timing",
      benefits: ["Low pressure", "Social focus", "Beginner friendly"],
      members: "4-8 people"
    },
    {
      type: "Competitive", 
      description: "High-energy challenges with leaderboards",
      benefits: ["Rankings", "Exclusive rewards", "Achievement focus"],
      members: "8-12 people"
    },
    {
      type: "Corporate",
      description: "Workplace team building challenges",
      benefits: ["Company rewards", "Professional networking", "Team bonding"],
      members: "10-50 people"
    },
    {
      type: "Family",
      description: "Multi-generational family challenges",
      benefits: ["Family bonding", "Age-appropriate tasks", "Shared rewards"],
      members: "3-10 family members"
    }
  ];

  const upcomingEvents = [
    {
      id: 1,
      title: "Flash Mob Friday",
      description: "City-wide synchronized check-ins at 6 PM",
      date: "This Friday",
      time: "6:00 PM",
      participants: 2500,
      reward: "Mega Flash Badge + 2000 points",
      type: "City Event"
    },
    {
      id: 2,
      title: "Team vs Team Battle",
      description: "Epic showdown between top 10 teams",
      date: "Next Saturday",
      time: "All Day",
      participants: 120,
      reward: "Champion Trophy + Premium Benefits",
      type: "Competition"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-purple-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-gradient-to-r from-orange-500 to-purple-500 text-white">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-purple-600 bg-clip-text text-transparent">
                Team Challenges
              </h1>
              <p className="text-gray-600 text-lg mt-1">
                Multi-tier social gamification, team battles, and community-driven local business discovery
              </p>
            </div>
          </div>

          {/* Team Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100">Team Rank</p>
                    <p className="text-3xl font-bold">#{myTeam.rank}</p>
                    <p className="text-sm text-orange-100">in city leaderboard</p>
                  </div>
                  <Crown className="h-12 w-12 text-orange-100" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100">Team Points</p>
                    <p className="text-3xl font-bold">{myTeam.points.toLocaleString()}</p>
                    <p className="text-sm text-purple-100">+1,250 this week</p>
                  </div>
                  <Star className="h-12 w-12 text-purple-100" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100">Win Streak</p>
                    <p className="text-3xl font-bold">{myTeam.streak}</p>
                    <p className="text-sm text-blue-100">challenges completed</p>
                  </div>
                  <Flame className="h-12 w-12 text-blue-100" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100">Active Members</p>
                    <p className="text-3xl font-bold">{teamMembers.filter(m => m.online).length}/{myTeam.members}</p>
                    <p className="text-sm text-green-100">online now</p>
                  </div>
                  <Users className="h-12 w-12 text-green-100" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Team Challenges Tabs */}
        <Tabs defaultValue="active-challenges" className="space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="grid grid-cols-5 min-w-max lg:w-full">
              <TabsTrigger value="active-challenges" className="px-2 text-xs lg:px-3 lg:text-sm flex items-center gap-1">
                <Target className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Active</span>
              </TabsTrigger>
              <TabsTrigger value="my-team" className="px-2 text-xs lg:px-3 lg:text-sm flex items-center gap-1">
                <Users className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">My Team</span>
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="px-2 text-xs lg:px-3 lg:text-sm flex items-center gap-1">
                <Trophy className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Leaderboard</span>
              </TabsTrigger>
              <TabsTrigger value="team-types" className="px-2 text-xs lg:px-3 lg:text-sm flex items-center gap-1">
                <Shield className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Create</span>
              </TabsTrigger>
              <TabsTrigger value="events" className="px-2 text-xs lg:px-3 lg:text-sm flex items-center gap-1">
                <Sparkles className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Events</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Active Challenges */}
          <TabsContent value="active-challenges" className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <Select value={challengeFilter} onValueChange={setChallengeFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter challenges" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active Challenges</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="all">All Challenges</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="bg-gradient-to-r from-orange-500 to-purple-500 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create Challenge
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {activeChallenges.map((challenge) => (
                <Card key={challenge.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{challenge.title}</CardTitle>
                        <p className="text-gray-600 mt-1">{challenge.description}</p>
                      </div>
                      <Badge variant="outline" className={`${
                        challenge.difficulty === "Easy" ? "bg-green-100 text-green-700" :
                        challenge.difficulty === "Medium" ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {challenge.difficulty}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Challenge Type</p>
                          <p className="text-sm">{challenge.type}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Time Left</p>
                          <p className="text-sm text-orange-600 font-medium">{challenge.timeLeft}</p>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Team Progress</span>
                          <span className="text-sm text-gray-500">{challenge.teamProgress}/{challenge.title === "Coffee Shop Conquest" ? 10 : challenge.title === "Weekend Warriors" ? 5 : 8}</span>
                        </div>
                        <Progress value={challenge.progress} className="h-2" />
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Gift className="h-4 w-4 text-purple-500" />
                          <span className="text-sm font-medium">Reward</span>
                        </div>
                        <p className="text-sm text-gray-600">{challenge.reward}</p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Users className="h-4 w-4" />
                          <span>{challenge.participants} participants</span>
                        </div>
                        <Button size="sm" className="bg-gradient-to-r from-orange-500 to-purple-500 text-white">
                          Join Challenge
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* My Team */}
          <TabsContent value="my-team" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Team Info */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={myTeam.avatar} />
                      <AvatarFallback>DE</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-xl">{myTeam.name}</CardTitle>
                      <p className="text-gray-600">Level {myTeam.level} • {myTeam.type}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Members</span>
                        <span>{myTeam.members}/{myTeam.maxMembers}</span>
                      </div>
                      <Progress value={(myTeam.members / myTeam.maxMembers) * 100} className="h-2" />
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium mb-2">Team Badges</p>
                      <div className="flex flex-wrap gap-1">
                        {myTeam.badges.map((badge, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {badge}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Button className="w-full" variant="outline">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Friends
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Team Members */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Team Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={member.avatar} />
                              <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            {member.online && (
                              <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 border-2 border-white rounded-full" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-gray-500">{member.role}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-purple-600">{member.points.toLocaleString()}</p>
                          <p className="text-sm text-gray-500">points</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Leaderboard */}
          <TabsContent value="leaderboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  City Team Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leaderboard.map((team) => (
                    <div 
                      key={team.rank} 
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        team.team === myTeam.name ? 'bg-purple-50 border-purple-200' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-2xl">{team.badge}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-gray-400">#{team.rank}</span>
                            <span className="font-semibold text-lg">{team.team}</span>
                            {team.team === myTeam.name && (
                              <Badge variant="secondary" className="ml-2">Your Team</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{team.members} members</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-purple-600">{team.points.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">points</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Types / Create Team */}
          <TabsContent value="team-types" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Choose Your Team Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {teamTypes.map((type, index) => (
                    <Card key={index} className={`cursor-pointer transition-all hover:shadow-lg ${
                      teamType === type.type.toLowerCase() ? 'ring-2 ring-purple-500 bg-purple-50' : ''
                    }`} onClick={() => setTeamType(type.type.toLowerCase())}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="font-semibold text-lg">{type.type} Team</h3>
                          <Badge variant="outline">{type.members}</Badge>
                        </div>
                        <p className="text-gray-600 text-sm mb-4">{type.description}</p>
                        <div>
                          <p className="font-medium text-sm mb-2">Benefits:</p>
                          <ul className="space-y-1">
                            {type.benefits.map((benefit, i) => (
                              <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                                <Star className="h-3 w-3 text-yellow-500" />
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <Button size="lg" className="bg-gradient-to-r from-orange-500 to-purple-500 text-white px-8">
                    Create New Team
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mega Events */}
          <TabsContent value="events" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {upcomingEvents.map((event) => (
                <Card key={event.id} className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl text-purple-800">{event.title}</CardTitle>
                        <p className="text-gray-600 mt-1">{event.description}</p>
                      </div>
                      <Badge className="bg-purple-500 text-white">{event.type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-purple-500" />
                          <div>
                            <p className="text-sm font-medium">{event.date}</p>
                            <p className="text-sm text-gray-500">{event.time}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-purple-500" />
                          <div>
                            <p className="text-sm font-medium">{event.participants.toLocaleString()}</p>
                            <p className="text-sm text-gray-500">participants</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-3 border border-purple-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Medal className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium">Event Reward</span>
                        </div>
                        <p className="text-sm text-gray-600">{event.reward}</p>
                      </div>

                      <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                        Join Event
                        <Sparkles className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}