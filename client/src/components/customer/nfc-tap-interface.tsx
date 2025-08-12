import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Wifi, CheckCircle, Gift } from "lucide-react";

interface NFCTapInterfaceProps {
  customerEmail: string;
  customerName: string;
}

export default function NFCTapInterface({ customerEmail, customerName }: NFCTapInterfaceProps) {
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const { toast } = useToast();

  // Mock campaigns data
  const mockCampaigns = [
    { id: "campaign-1", name: "Free Coffee Friday", business: "Joe's Coffee Shop" },
    { id: "campaign-2", name: "Loyalty Punch Card", business: "Joe's Coffee Shop" },
    { id: "campaign-3", name: "10% Off Books", business: "Downtown Books" },
    { id: "campaign-4", name: "Happy Hour Special", business: "Mama's Bistro" }
  ];

  const tapMutation = useMutation({
    mutationFn: async (tapData: any) => {
      return await apiRequest("POST", "/api/taps", tapData);
    },
    onSuccess: (response) => {
      const data = response.json();
      setIsAnimating(true);
      toast({
        title: "Reward Unlocked! 🎉",
        description: "Check your rewards to see what you've earned.",
      });
      
      setTimeout(() => setIsAnimating(false), 600);
    },
    onError: (error) => {
      toast({
        title: "Tap Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleNFCTap = () => {
    if (!selectedCampaign) {
      toast({
        title: "Select a Campaign",
        description: "Please choose a campaign to simulate tapping.",
        variant: "destructive",
      });
      return;
    }

    if (!customerEmail) {
      toast({
        title: "Email Required",
        description: "Please enter your email to receive rewards.",
        variant: "destructive",
      });
      return;
    }

    // Find the selected campaign
    const campaign = mockCampaigns.find(c => c.id === selectedCampaign);
    if (!campaign) return;

    // Simulate tap data
    const tapData = {
      tagId: `tag-${selectedCampaign}`,
      campaignId: selectedCampaign,
      businessId: "business-1", // Mock business ID
      customerEmail,
      customerName: customerName || "Anonymous",
    };

    tapMutation.mutate(tapData);
  };

  return (
    <Card className={isAnimating ? "tap-animation" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Wifi className="mr-2 h-5 w-5" />
          NFC Tap Simulation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Campaign Selection */}
        <div>
          <Label htmlFor="campaign-select">Select Campaign to Tap</Label>
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a campaign..." />
            </SelectTrigger>
            <SelectContent>
              {mockCampaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name} - {campaign.business}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* NFC Tap Area */}
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300 ${
            isAnimating 
              ? "bg-green-500 scale-110" 
              : "bg-primary bg-opacity-10 nfc-pulse hover:bg-primary hover:bg-opacity-20"
          }`}>
            {isAnimating ? (
              <CheckCircle className="text-white h-12 w-12" />
            ) : (
              <Wifi className="text-primary h-12 w-12" />
            )}
          </div>
          
          <h4 className="font-semibold text-gray-900 mb-2">
            {isAnimating ? "Tap Successful!" : "Ready to Tap"}
          </h4>
          
          <p className="text-gray-600 mb-6">
            {isAnimating 
              ? "Your reward has been added to your account" 
              : "Simulate tapping an NFC tag to unlock rewards"
            }
          </p>
          
          <Button 
            className="bg-primary text-white hover:bg-primary/90"
            onClick={handleNFCTap}
            disabled={tapMutation.isPending || isAnimating}
            size="lg"
          >
            {tapMutation.isPending ? (
              "Processing..."
            ) : isAnimating ? (
              <>
                <Gift className="mr-2 h-5 w-5" />
                Reward Unlocked!
              </>
            ) : (
              <>
                <Wifi className="mr-2 h-5 w-5" />
                Simulate NFC Tap
              </>
            )}
          </Button>
        </div>

        {/* QR Code Alternative */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
              <span className="text-yellow-600 text-xs font-bold">QR</span>
            </div>
            <div>
              <h5 className="font-medium text-yellow-800">QR Code Available</h5>
              <p className="text-sm text-yellow-700">Every NFC tag also works as a QR code for non-NFC devices</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
