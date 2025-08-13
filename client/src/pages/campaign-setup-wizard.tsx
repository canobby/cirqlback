import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, ArrowLeft, CheckCircle, Gift, Target, Zap } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
    description: "Give customers a percentage or dollar amount off",
    icon: Gift,
    examples: ["10% off total purchase", "$5 off orders over $25"]
  },
  {
    id: "loyalty",
    title: "Loyalty Points",
    description: "Reward customers with points for visits",
    icon: Target,
    examples: ["100 points per visit", "Double points on weekends"]
  },
  {
    id: "referral",
    title: "Referral Bonus",
    description: "Reward customers for bringing friends",
    icon: Zap,
    examples: ["$10 for each friend referred", "Free item for 3 referrals"]
  }
];

export default function CampaignSetupWizard() {
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
          businessId: "demo_biz_1" // In real app, get from user session
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
      // Navigate to NFC setup wizard with the new campaign
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Campaign Setup Wizard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Create your campaign in 4 simple steps
          </p>
          
          {/* Progress Bar */}
          <div className="mt-6 max-w-md mx-auto">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between mt-2 text-sm text-gray-500">
              <span className={step >= 1 ? "text-purple-600 font-medium" : ""}>Type</span>
              <span className={step >= 2 ? "text-purple-600 font-medium" : ""}>Details</span>
              <span className={step >= 3 ? "text-purple-600 font-medium" : ""}>Review</span>
              <span className={step >= 4 ? "text-purple-600 font-medium" : ""}>Complete</span>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardContent className="p-8">
            
            {/* Step 1: Campaign Type Selection */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <CardTitle className="text-2xl mb-2">Choose Your Campaign Type</CardTitle>
                  <CardDescription className="text-lg">
                    What kind of reward do you want to offer customers?
                  </CardDescription>
                </div>
                
                <div className="grid md:grid-cols-3 gap-6 mt-8">
                  {campaignTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <Card 
                        key={type.id}
                        className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 hover:border-purple-300"
                        onClick={() => handleTypeSelect(type.id)}
                      >
                        <CardContent className="p-6 text-center">
                          <Icon className="h-12 w-12 mx-auto mb-4 text-purple-600" />
                          <h3 className="font-semibold text-lg mb-2">{type.title}</h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                            {type.description}
                          </p>
                          <div className="space-y-1">
                            {type.examples.map((example, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {example}
                              </Badge>
                            ))}
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
              <div className="space-y-6">
                <div className="text-center">
                  <CardTitle className="text-2xl mb-2">Campaign Details</CardTitle>
                  <CardDescription className="text-lg">
                    Tell us about your {campaignTypes.find(t => t.id === campaignData.type)?.title.toLowerCase()}
                  </CardDescription>
                </div>

                <div className="max-w-2xl mx-auto space-y-6">
                  <div>
                    <Label htmlFor="name" className="text-base font-medium">Campaign Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Summer Special Discount"
                      value={campaignData.name}
                      onChange={(e) => setCampaignData({ ...campaignData, name: e.target.value })}
                      className="mt-2 text-base"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-base font-medium">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what customers get when they tap your tag"
                      value={campaignData.description}
                      onChange={(e) => setCampaignData({ ...campaignData, description: e.target.value })}
                      className="mt-2"
                      rows={3}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="value" className="text-base font-medium">
                        {campaignData.type === "discount" ? "Discount Amount" : 
                         campaignData.type === "loyalty" ? "Points Value" : "Reward Value"}
                      </Label>
                      <div className="relative mt-2">
                        {campaignData.type === "discount" && (
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        )}
                        <Input
                          id="value"
                          type="number"
                          placeholder={campaignData.type === "discount" ? "15.00" : "100"}
                          value={campaignData.value}
                          onChange={(e) => setCampaignData({ ...campaignData, value: e.target.value })}
                          className={`text-base ${campaignData.type === "discount" ? "pl-8" : ""}`}
                        />
                      </div>
                    </div>

                    {campaignData.type !== "discount" && (
                      <div>
                        <Label htmlFor="points" className="text-base font-medium">Bonus Points</Label>
                        <Input
                          id="points"
                          type="number"
                          placeholder="50"
                          value={campaignData.pointsAwarded}
                          onChange={(e) => setCampaignData({ ...campaignData, pointsAwarded: parseInt(e.target.value) || 0 })}
                          className="mt-2 text-base"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-center gap-4 mt-8">
                  <Button variant="outline" onClick={handleBack} className="text-white">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={handleDetailsSubmit} className="text-white">
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center">
                  <CardTitle className="text-2xl mb-2">Review Your Campaign</CardTitle>
                  <CardDescription className="text-lg">
                    Make sure everything looks good before creating
                  </CardDescription>
                </div>

                <div className="max-w-2xl mx-auto">
                  <Card className="border-2 border-purple-200 bg-purple-50 dark:bg-purple-950/20">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold text-lg text-purple-800 dark:text-purple-200">
                            {campaignData.name}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 mt-1">
                            {campaignData.description}
                          </p>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                          <div>
                            <span className="text-sm font-medium text-gray-500">Type:</span>
                            <p className="font-semibold capitalize">{campaignData.type}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-500">Value:</span>
                            <p className="font-semibold">
                              {campaignData.type === "discount" ? "$" : ""}{campaignData.value}
                              {campaignData.type === "loyalty" ? " points" : ""}
                            </p>
                          </div>
                        </div>

                        {campaignData.pointsAwarded > 0 && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">Bonus Points:</span>
                            <p className="font-semibold">{campaignData.pointsAwarded} points</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-center gap-4 mt-8">
                  <Button variant="outline" onClick={handleBack} className="text-white">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button 
                    onClick={handleCreateCampaign} 
                    disabled={createCampaignMutation.isPending}
                    className="text-white"
                  >
                    {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
                    <CheckCircle className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}