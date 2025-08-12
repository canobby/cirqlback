import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Award, 
  BookOpen, 
  CheckCircle, 
  Clock, 
  PlayCircle, 
  Star, 
  Target,
  Users,
  Shield,
  Settings,
  BarChart3,
  MessageSquare,
  AlertCircle,
  Trophy,
  Brain,
  Zap
} from "lucide-react";

export default function AdminTrainingCenter() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedModule, setSelectedModule] = useState(null);
  const [isKnowledgeChecklistOpen, setIsKnowledgeChecklistOpen] = useState(false);

  const { data: trainingProgress, isLoading } = useQuery({
    queryKey: ["/api/admin/training/progress"],
  });

  const { data: trainingModules } = useQuery({
    queryKey: ["/api/admin/training/modules"],
  });

  const { data: knowledgeChecklist } = useQuery({
    queryKey: ["/api/admin/training/knowledge-checklist"],
  });

  const { data: adminProfile } = useQuery({
    queryKey: ["/api/admin/profile"],
  });

  const startModuleMutation = useMutation({
    mutationFn: (moduleId: string) => 
      apiRequest("POST", `/api/admin/training/modules/${moduleId}/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/training/progress"] });
    },
  });

  const completeModuleMutation = useMutation({
    mutationFn: ({ moduleId, answers }: { moduleId: string; answers: any }) =>
      apiRequest("POST", `/api/admin/training/modules/${moduleId}/complete`, { answers }),
    onSuccess: (result) => {
      if (result.passed) {
        toast({
          title: "Module Completed!",
          description: `You scored ${result.score}%. Well done!`,
        });
      } else {
        toast({
          title: "Module Failed",
          description: `You scored ${result.score}%. Please review and try again.`,
          variant: "destructive",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/training/progress"] });
    },
  });

  const updateKnowledgeChecklistMutation = useMutation({
    mutationFn: (updates: any) =>
      apiRequest("PATCH", "/api/admin/training/knowledge-checklist", updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/training/knowledge-checklist"] });
    },
  });

  const trainingCategories = [
    {
      id: "platform_overview",
      title: "Platform Overview",
      description: "Understanding Cirqlback's core functionality and vision",
      icon: <Shield className="h-6 w-6" />,
      color: "from-purple-600 to-blue-600",
      modules: trainingModules?.filter((m: any) => m.category === "platform_overview") || []
    },
    {
      id: "user_management",
      title: "User Management",
      description: "Managing customers, merchants, and admin accounts",
      icon: <Users className="h-6 w-6" />,
      color: "from-blue-600 to-cyan-600",
      modules: trainingModules?.filter((m: any) => m.category === "user_management") || []
    },
    {
      id: "campaign_management",
      title: "Campaign Oversight", 
      description: "Monitoring and managing business campaigns",
      icon: <Target className="h-6 w-6" />,
      color: "from-green-600 to-emerald-600",
      modules: trainingModules?.filter((m: any) => m.category === "campaign_management") || []
    },
    {
      id: "technical_support",
      title: "Technical Support",
      description: "Troubleshooting and resolving technical issues",
      icon: <Settings className="h-6 w-6" />,
      color: "from-orange-600 to-red-600",
      modules: trainingModules?.filter((m: any) => m.category === "technical_support") || []
    },
    {
      id: "analytics_reporting",
      title: "Analytics & Reporting",
      description: "Understanding platform metrics and generating reports",
      icon: <BarChart3 className="h-6 w-6" />,
      color: "from-pink-600 to-rose-600",
      modules: trainingModules?.filter((m: any) => m.category === "analytics_reporting") || []
    }
  ];

  const getCertificationProgress = () => {
    if (!trainingProgress) return 0;
    const completed = trainingProgress.filter((p: any) => p.status === "completed").length;
    const total = trainingModules?.length || 1;
    return (completed / total) * 100;
  };

  const getModuleProgress = (moduleId: string) => {
    const progress = trainingProgress?.find((p: any) => p.moduleId === moduleId);
    return progress || { status: "not_started", score: null, timeSpent: 0 };
  };

  const getKnowledgeChecklistProgress = () => {
    if (!knowledgeChecklist) return 0;
    const completed = Object.values(knowledgeChecklist).filter((item: any) => item.completed).length;
    return (completed / Object.keys(knowledgeChecklist).length) * 100;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Admin Training Center
          </h1>
          <p className="text-gray-600 mb-6">
            Complete your certification to become a fully qualified Cirqlback administrator
          </p>
          
          {/* Progress Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Certification Progress</h3>
                  <p className="text-sm text-gray-600">Overall completion</p>
                </div>
              </div>
              <div className="space-y-2">
                <Progress value={getCertificationProgress()} className="h-2" />
                <div className="flex justify-between text-sm">
                  <span>{Math.round(getCertificationProgress())}% Complete</span>
                  <Badge variant={adminProfile?.certificationLevel === 'expert' ? 'default' : 'outline'}>
                    {adminProfile?.certificationLevel || 'Basic'}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full flex items-center justify-center">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Knowledge Checklist</h3>
                  <p className="text-sm text-gray-600">Essential knowledge items</p>
                </div>
              </div>
              <div className="space-y-2">
                <Progress value={getKnowledgeChecklistProgress()} className="h-2" />
                <div className="flex justify-between text-sm">
                  <span>{Math.round(getKnowledgeChecklistProgress())}% Complete</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsKnowledgeChecklistOpen(true)}
                  >
                    View Checklist
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Specializations</h3>
                  <p className="text-sm text-gray-600">Focus areas</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {adminProfile?.specializations?.length > 0 ? (
                  adminProfile.specializations.map((spec: string) => (
                    <Badge key={spec} variant="secondary" className="text-xs">
                      {spec.replace('_', ' ')}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">None selected</span>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Training Modules by Category */}
        <div className="space-y-8">
          {trainingCategories.map((category) => (
            <Card key={category.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 bg-gradient-to-r ${category.color} rounded-lg flex items-center justify-center text-white`}>
                    {category.icon}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{category.title}</CardTitle>
                    <p className="text-gray-600">{category.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.modules.map((module: any) => {
                    const progress = getModuleProgress(module.id);
                    return (
                      <Card key={module.id} className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm mb-1">{module.title}</h4>
                            <p className="text-xs text-gray-600 mb-2">{module.description}</p>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              <span>{module.timeEstimate} min</span>
                              <Badge 
                                variant={progress.status === "completed" ? "default" : 
                                        progress.status === "in_progress" ? "secondary" : 
                                        "outline"}
                                className="text-xs"
                              >
                                {progress.status === "completed" ? "Done" :
                                 progress.status === "in_progress" ? "Active" :
                                 "Start"}
                              </Badge>
                            </div>
                          </div>
                          {progress.status === "completed" && (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          {progress.status === "completed" && progress.score && (
                            <div className="text-xs">
                              Score: <span className="font-medium">{progress.score}%</span>
                            </div>
                          )}
                          
                          <Button 
                            size="sm" 
                            className="w-full"
                            variant={progress.status === "completed" ? "outline" : "default"}
                            onClick={() => {
                              if (progress.status === "not_started") {
                                startModuleMutation.mutate(module.id);
                              }
                              setSelectedModule(module);
                            }}
                          >
                            {progress.status === "completed" ? (
                              <>
                                <Star className="h-3 w-3 mr-1" />
                                Review
                              </>
                            ) : progress.status === "in_progress" ? (
                              <>
                                <PlayCircle className="h-3 w-3 mr-1" />
                                Continue
                              </>
                            ) : (
                              <>
                                <BookOpen className="h-3 w-3 mr-1" />
                                Start Module
                              </>
                            )}
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Knowledge Checklist Dialog */}
        <Dialog open={isKnowledgeChecklistOpen} onOpenChange={setIsKnowledgeChecklistOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Admin Knowledge Checklist</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {Object.entries(knowledgeChecklist || {}).map(([category, items]: [string, any]) => (
                  <Card key={category} className="p-4">
                    <h3 className="font-semibold mb-3 capitalize">{category.replace('_', ' ')}</h3>
                    <div className="space-y-2">
                      {items.map((item: any) => (
                        <div key={item.id} className="flex items-start space-x-3">
                          <Checkbox 
                            checked={item.completed}
                            onCheckedChange={(checked) => {
                              updateKnowledgeChecklistMutation.mutate({
                                itemId: item.id,
                                completed: checked
                              });
                            }}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.title}</p>
                            <p className="text-xs text-gray-600">{item.description}</p>
                            {item.importance === 'critical' && (
                              <Badge variant="destructive" className="text-xs mt-1">Critical</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}