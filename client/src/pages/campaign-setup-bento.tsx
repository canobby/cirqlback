import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, ArrowLeft, CheckCircle, Gift, Target, Zap, Sparkles, DollarSign } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface CampaignData {
  name: string;
  description: string;
  type: string;
  value: string;
  pointsAwarded: number;
  startDate?: string;
  endDate?: string;
}

const campaignTypes = [
  {
    id: "discount",
    title: "Discount Offer",
    description: "Give customers money off their purchase",
    icon: DollarSign,
    gradient: "from-green-500 to-emerald-600",
    examples: ["10% off total", "$5 off orders $25+"],
    bgPattern: "💰"
  },
  {
    id: "loyalty",
    title: "Loyalty Points",
    description: "Reward return visits with points",
    icon: Target,
    gradient: "from-blue-500 to-cyan-600", 
    examples: ["100 points per visit", "Double points weekends"],
    bgPattern: "🎯"
  },
  {
    id: "referral",
    title: "Referral Bonus",
    description: "Reward customers for bringing friends",
    icon: Sparkles,
    gradient: "from-purple-500 to-pink-600",
    examples: ["$10 per friend", "Free item for 3 referrals"],
    bgPattern: "✨"
  }
];

export default function CampaignSetupBento() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [campaignData, setCampaignData] = useState<CampaignData>({
    name: "",
    description: "",
    type: "",
    value: "",
    pointsAwarded: 0
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: CampaignData) => {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          businessId: "demo_biz_1"
        }),
      });
      if (!response.ok) throw new Error("Failed to create campaign");
      return response.json();
    },
    onSuccess: (campaign) => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Campaign Created!",
        description: "Your campaign is ready for NFC tag programming.",
      });
      setLocation(`/nfc-setup-wizard?campaignId=${campaign.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create campaign. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleTypeSelect = (type: string) => {
    setCampaignData({ ...campaignData, type });
    handleNext();
  };

  const handleDetailsSubmit = () => {
    if (!campaignData.name || !campaignData.value) {
      toast({
        title: "Missing Information",
        description: "Please fill in campaign name and value.",
        variant: "destructive",
      });
      return;
    }
    handleNext();
  };

  const handleCreateCampaign = () => {
    createCampaignMutation.mutate(campaignData);
  };

  const progress = (step / 4) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/50 to-pink-50/50 dark:from-gray-950 dark:via-purple-950/50 dark:to-pink-950/50">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent mb-2">
            Campaign Builder
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
            Create your campaign with guided blocks
          </p>
          
          {/* Progress Bar */}
          <div className="max-w-md mx-auto mb-8">
            <Progress value={progress} className="h-3 bg-gray-200 dark:bg-gray-700" />
            <div className="flex justify-between mt-3 text-sm">
              <Badge variant={step >= 1 ? "default" : "secondary"} className={step >= 1 ? "bg-purple-600" : ""}>
                1. Type
              </Badge>
              <Badge variant={step >= 2 ? "default" : "secondary"} className={step >= 2 ? "bg-purple-600" : ""}>
                2. Details  
              </Badge>
              <Badge variant={step >= 3 ? "default" : "secondary"} className={step >= 3 ? "bg-purple-600" : ""}>
                3. Review
              </Badge>
              <Badge variant={step >= 4 ? "default" : "secondary"} className={step >= 4 ? "bg-purple-600" : ""}>
                4. Complete
              </Badge>
            </div>
          </div>
        </div>

        {/* Step 1: Campaign Type Selection */}
        {step === 1 && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Choose Your Campaign Type
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                What kind of reward do you want to offer?
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {campaignTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Card 
                    key={type.id}
                    className="cursor-pointer transition-all duration-300 hover:scale-105 border-0 overflow-hidden relative group shadow-xl"
                    onClick={() => handleTypeSelect(type.id)}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${type.gradient}`}></div>
                    <div className="absolute top-4 right-4 text-6xl opacity-20">
                      {type.bgPattern}
                    </div>
                    <CardContent className="p-8 relative z-10 text-white h-full">
                      <Icon className="h-12 w-12 mb-4 text-white" />
                      <h3 className="text-2xl font-bold mb-3">{type.title}</h3>
                      <p className="text-white/90 mb-6 text-lg">
                        {type.description}
                      </p>
                      <div className="space-y-2">
                        {type.examples.map((example, idx) => (
                          <Badge key={idx} className="bg-white/20 text-white border-white/30 mr-2">
                            {example}
                          </Badge>
                        ))}
                      </div>
                      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="h-6 w-6" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Campaign Details */}
        {step === 2 && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Campaign Details
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Configure your {campaignTypes.find(t => t.id === campaignData.type)?.title.toLowerCase()}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Form Fields */}
              <Card className="border-2 border-gray-200 dark:border-gray-700">
                <CardContent className="p-8 space-y-6">
                  <div>
                    <Label htmlFor="name" className="text-lg font-medium">Campaign Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Summer Special Discount"
                      value={campaignData.name}
                      onChange={(e) => setCampaignData({ ...campaignData, name: e.target.value })}
                      className="mt-2 text-lg h-12"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-lg font-medium">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what customers get when they tap your tag"
                      value={campaignData.description}
                      onChange={(e) => setCampaignData({ ...campaignData, description: e.target.value })}
                      className="mt-2 min-h-[100px]"
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="value" className="text-lg font-medium">
                        {campaignData.type === "discount" ? "Discount Amount" : 
                         campaignData.type === "loyalty" ? "Points Value" : "Reward Value"}
                      </Label>
                      <div className="relative mt-2">
                        {campaignData.type === "discount" && (
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">$</span>
                        )}
                        <Input
                          id="value"
                          type="number"
                          placeholder={campaignData.type === "discount" ? "15.00" : "100"}
                          value={campaignData.value}
                          onChange={(e) => setCampaignData({ ...campaignData, value: e.target.value })}
                          className={`text-lg h-12 ${campaignData.type === "discount" ? "pl-10" : ""}`}
                        />
                      </div>
                    </div>

                    {campaignData.type !== "discount" && (
                      <div>
                        <Label htmlFor="points" className="text-lg font-medium">Bonus Points</Label>
                        <Input
                          id="points"
                          type="number"
                          placeholder="50"
                          value={campaignData.pointsAwarded}
                          onChange={(e) => setCampaignData({ ...campaignData, pointsAwarded: parseInt(e.target.value) || 0 })}
                          className="mt-2 text-lg h-12"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
                <CardHeader>
                  <CardTitle className="text-purple-800 dark:text-purple-200">Live Preview</CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Gift className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {campaignData.name || "Your Campaign Name"}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {campaignData.description || "Campaign description will appear here"}
                      </p>
                      <div className="inline-flex items-center px-4 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                        <span className="font-semibold text-purple-800 dark:text-purple-200">
                          {campaignData.type === "discount" ? "$" : ""}{campaignData.value || "0"}
                          {campaignData.type === "loyalty" ? " points" : ""}
                          {campaignData.type === "discount" ? " off" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-center gap-4 mt-8">
              <Button variant="outline" onClick={handleBack} size="lg" className="text-white">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back
              </Button>
              <Button onClick={handleDetailsSubmit} size="lg" className="text-white">
                Continue
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Review Your Campaign
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Everything looks good? Let's create it!
              </p>
            </div>

            <Card className="border-0 shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{campaignData.name}</h3>
                    <p className="text-purple-100 text-lg">{campaignData.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold">
                      {campaignData.type === "discount" ? "$" : ""}{campaignData.value}
                      {campaignData.type === "loyalty" ? " pts" : ""}
                    </div>
                    <div className="text-purple-100 capitalize">{campaignData.type} Campaign</div>
                  </div>
                </div>
              </div>
              
              <CardContent className="p-8">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {campaignData.type === "discount" ? "$" : ""}{campaignData.value}
                      {campaignData.type === "loyalty" ? " points" : ""}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 capitalize">
                      {campaignData.type} Value
                    </div>
                  </div>
                  
                  {campaignData.pointsAwarded > 0 && (
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {campaignData.pointsAwarded}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        Bonus Points
                      </div>
                    </div>
                  )}
                  
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      Active
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Status
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center gap-4 mt-8">
              <Button variant="outline" onClick={handleBack} size="lg" className="text-white">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleCreateCampaign} 
                disabled={createCampaignMutation.isPending}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
                <CheckCircle className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}