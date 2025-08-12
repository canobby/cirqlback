import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Zap, Gift, Star, CheckCircle, Clock } from "lucide-react";
import { useLocation } from "wouter";

export default function TapPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Simulated NFC tap data (in real app this would come from NFC scan)
  const [tapData, setTapData] = useState({
    tagId: "nfc_tag_001",
    customerEmail: "",
    customerName: "",
  });
  
  const [tagInfo, setTagInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tapResult, setTapResult] = useState<any>(null);

  // Simulate getting tag info (normally from NFC scan)
  useEffect(() => {
    loadTagInfo();
  }, []);

  const loadTagInfo = async () => {
    try {
      // For demo, create a sample tag if none exists
      const response = await apiRequest("GET", `/api/tap/${tapData.tagId}`);
      setTagInfo(response);
    } catch (error) {
      // Create demo data if no tag exists
      setTagInfo({
        tag: {
          id: "demo_tag_1",
          tagIdentifier: "nfc_tag_001",
          location: "Counter",
          businessId: "demo_business_1"
        },
        business: {
          id: "demo_business_1",
          name: "Demo Coffee Shop",
          description: "Great coffee and pastries"
        },
        campaign: {
          id: "demo_campaign_1",
          name: "Welcome Reward",
          description: "Get 10% off your first order",
          type: "discount",
          value: "10.00",
          pointsAwarded: 100
        }
      });
    }
  };

  const handleTap = async () => {
    if (!tapData.customerEmail) {
      toast({
        title: "Email Required",
        description: "Please enter your email to tap and earn rewards.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await apiRequest("POST", "/api/taps", {
        tagId: tagInfo?.tag?.id || "demo_tag_1",
        businessId: tagInfo?.business?.id || "demo_business_1",
        campaignId: tagInfo?.campaign?.id || "demo_campaign_1",
        customerEmail: tapData.customerEmail,
        customerName: tapData.customerName,
        pointsEarned: tagInfo?.campaign?.pointsAwarded || 100,
        rewardValue: tagInfo?.campaign?.value || "10.00",
      });

      setTapResult(result);
      toast({
        title: "Tap Successful! 🎉",
        description: "You've earned a reward!",
      });
    } catch (error) {
      toast({
        title: "Tap Failed",
        description: "Unable to process tap. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewRewards = () => {
    setLocation(`/customer?email=${tapData.customerEmail}`);
  };

  if (!tagInfo) {
    return (
      <div className="bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center p-4 min-h-[80vh]">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Loading Cirql tag information...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-primary/10 to-secondary/10 p-4 min-h-[80vh]">
      <div className="max-w-md mx-auto space-y-6 pt-8">
        
        {/* Business Info */}
        <Card className="card-hover glow-effect">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="gradient-text text-xl">{tagInfo.business?.name}</CardTitle>
            <p className="text-muted-foreground">{tagInfo.business?.description}</p>
          </CardHeader>
        </Card>

        {/* Campaign Info */}
        {tagInfo.campaign && (
          <Card className="card-hover border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gift className="h-5 w-5 text-primary" />
                  {tagInfo.campaign.name}
                </CardTitle>
                <Badge variant="secondary" className="gradient-bg text-white">
                  {tagInfo.campaign.type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{tagInfo.campaign.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="font-semibold">{tagInfo.campaign.pointsAwarded} points</span>
                </div>
                <div className="text-lg font-bold text-primary">
                  ${tagInfo.campaign.value} off
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tap Interface */}
        {!tapResult ? (
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-center">Tap to Earn Rewards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={tapData.customerEmail}
                  onChange={(e) => setTapData(prev => ({ ...prev, customerEmail: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  Name (Optional)
                </label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={tapData.customerName}
                  onChange={(e) => setTapData(prev => ({ ...prev, customerName: e.target.value }))}
                />
              </div>
              <Button 
                onClick={handleTap}
                disabled={loading || !tapData.customerEmail}
                className="w-full gradient-bg hover:opacity-90 transition-all duration-200"
                size="lg"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Tap Now!
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Success Result */
          <Card className="card-hover border-green-200 bg-green-50">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-green-800">Reward Earned!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-green-700 mb-4">{tapResult.message}</p>
                
                {tapResult.reward && (
                  <div className="p-4 bg-white rounded-lg border-2 border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2">{tapResult.reward.title}</h4>
                    <p className="text-sm text-green-600 mb-2">{tapResult.reward.description}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-700">Code: {tapResult.reward.code}</span>
                      <div className="flex items-center gap-1 text-green-600">
                        <Clock className="h-3 w-3" />
                        30 days
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Button 
                  onClick={handleViewRewards}
                  variant="outline" 
                  className="w-full border-green-300 text-green-700 hover:bg-green-50"
                >
                  View All Rewards
                </Button>
                <Button 
                  onClick={() => setTapResult(null)}
                  variant="ghost"
                  className="w-full text-green-600"
                >
                  Tap Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tag Location Info */}
        <div className="text-center text-sm text-muted-foreground">
          📍 Cirql Tag Location: {tagInfo.tag?.location || "Main Counter"}
        </div>
      </div>
    </div>
  );
}