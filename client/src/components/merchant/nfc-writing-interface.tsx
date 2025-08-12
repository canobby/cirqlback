import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Wifi, Check, MoreHorizontal, AlertCircle } from "lucide-react";

interface NFCWritingInterfaceProps {
  businessId: string;
}

export default function NFCWritingInterface({ businessId }: NFCWritingInterfaceProps) {
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [tagLocation, setTagLocation] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [isWriting, setIsWriting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ["/api/campaigns", businessId],
    queryFn: () => 
      fetch(`/api/campaigns?businessId=${businessId}`)
        .then(res => res.json()),
  });

  const { data: nfcTags = [], isLoading: tagsLoading } = useQuery({
    queryKey: ["/api/nfc-tags", businessId],
    queryFn: () => 
      fetch(`/api/nfc-tags?businessId=${businessId}`)
        .then(res => res.json()),
  });

  const writeTagMutation = useMutation({
    mutationFn: async (tagData: any) => {
      return await apiRequest("POST", "/api/nfc-tags", tagData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nfc-tags", businessId] });
      setCurrentStep(3);
      toast({
        title: "NFC Tag Written Successfully! 🎉",
        description: "Your NFC tag is now ready to be deployed.",
      });
      
      // Reset form after a delay
      setTimeout(() => {
        setCurrentStep(1);
        setSelectedCampaign("");
        setTagLocation("");
        setIsWriting(false);
      }, 3000);
    },
    onError: () => {
      setIsWriting(false);
      toast({
        title: "Writing Failed",
        description: "Failed to write NFC tag. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleWriteTag = () => {
    if (!selectedCampaign) {
      toast({
        title: "Select Campaign",
        description: "Please choose a campaign to write to the NFC tag.",
        variant: "destructive",
      });
      return;
    }

    setIsWriting(true);
    setCurrentStep(2);

    // Simulate NFC writing process
    setTimeout(() => {
      const campaign = campaigns.find((c: any) => c.id === selectedCampaign);
      const tagUrl = `${window.location.origin}/c/${selectedCampaign}`;
      
      const tagData = {
        campaignId: selectedCampaign,
        businessId,
        location: tagLocation || "Unspecified",
        tagUrl,
      };

      writeTagMutation.mutate(tagData);
    }, 2000);
  };

  const getStepClass = (step: number) => {
    if (step < currentStep) return "bg-primary text-white";
    if (step === currentStep) return "bg-primary text-white";
    return "bg-gray-300 text-gray-600";
  };

  const getStepLineClass = (step: number) => {
    return step < currentStep ? "bg-primary" : "bg-gray-300";
  };

  if (campaignsLoading || tagsLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          Loading NFC management...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">NFC Tag Management</h3>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* NFC Writing Process */}
        <Card>
          <CardHeader>
            <CardTitle>Write New NFC Tag</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getStepClass(1)}`}>
                  {currentStep > 1 ? <Check className="h-4 w-4" /> : "1"}
                </div>
                <span className="ml-3 font-medium text-gray-900">Select Campaign</span>
              </div>
              <div className={`flex-1 mx-4 h-1 rounded ${getStepLineClass(2)}`}></div>
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getStepClass(2)}`}>
                  {currentStep > 2 ? <Check className="h-4 w-4" /> : "2"}
                </div>
                <span className="ml-3 font-medium text-gray-500">Write Tag</span>
              </div>
              <div className={`flex-1 mx-4 h-1 rounded ${getStepLineClass(3)}`}></div>
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getStepClass(3)}`}>
                  {currentStep === 3 ? <Check className="h-4 w-4" /> : "3"}
                </div>
                <span className="ml-3 font-medium text-gray-500">Deploy</span>
              </div>
            </div>

            {/* Step 1: Campaign Selection */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="campaign-select">Choose Campaign to Write</Label>
                  <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a campaign..." />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.filter((c: any) => c.isActive).map((campaign: any) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.name} - {campaign.rewardValue}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCampaign && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    {(() => {
                      const campaign = campaigns.find((c: any) => c.id === selectedCampaign);
                      return campaign ? (
                        <div>
                          <h4 className="font-semibold text-blue-800">{campaign.name}</h4>
                          <p className="text-sm text-blue-600">{campaign.description}</p>
                          <p className="text-sm text-blue-600 mt-1">
                            Reward: {campaign.rewardType} - {campaign.rewardValue}
                          </p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}

                <div>
                  <Label htmlFor="tag-location">Tag Location (Optional)</Label>
                  <Input
                    id="tag-location"
                    value={tagLocation}
                    onChange={(e) => setTagLocation(e.target.value)}
                    placeholder="e.g., Checkout Counter, Front Door, Product Display"
                  />
                </div>

                <Button 
                  onClick={() => setCurrentStep(2)} 
                  disabled={!selectedCampaign}
                  className="w-full"
                >
                  Continue to Writing
                </Button>
              </div>
            )}

            {/* Step 2: NFC Writing */}
            {currentStep === 2 && (
              <div className="text-center space-y-6">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-all duration-500 ${
                  isWriting 
                    ? "bg-primary bg-opacity-20 animate-pulse" 
                    : "bg-primary bg-opacity-10"
                }`}>
                  <Wifi className={`h-10 w-10 transition-colors ${
                    isWriting ? "text-primary animate-spin" : "text-primary"
                  }`} />
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {isWriting ? "Writing NFC Tag..." : "Ready to Write NFC Tag"}
                  </h4>
                  <p className="text-gray-600">
                    {isWriting 
                      ? "Please hold your NFC tag near the device" 
                      : "Hold your NFC tag near your device to program it"
                    }
                  </p>
                </div>

                {!isWriting && (
                  <Button 
                    onClick={handleWriteTag}
                    className="bg-primary text-white hover:bg-primary/90"
                    size="lg"
                  >
                    <Wifi className="mr-2 h-5 w-5" />
                    Write NFC Tag
                  </Button>
                )}
              </div>
            )}

            {/* Step 3: Success */}
            {currentStep === 3 && (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                  <Check className="text-white h-10 w-10" />
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">NFC Tag Written Successfully!</h4>
                  <p className="text-gray-600">Your NFC tag is now ready to be deployed in your business</p>
                </div>

                <Button 
                  onClick={() => {
                    setCurrentStep(1);
                    setSelectedCampaign("");
                    setTagLocation("");
                  }}
                  variant="outline"
                >
                  Write Another Tag
                </Button>
              </div>
            )}

            {/* QR Code Alternative */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="text-yellow-600 h-5 w-5 mr-3" />
                <div>
                  <h5 className="font-medium text-yellow-800">QR Code Available</h5>
                  <p className="text-sm text-yellow-700">Every NFC tag also works as a QR code for non-NFC devices</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Existing Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Deployed NFC Tags</CardTitle>
          </CardHeader>
          <CardContent>
            {nfcTags.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wifi className="text-gray-400 h-8 w-8" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">No NFC Tags Yet</h4>
                <p className="text-gray-600">Write your first NFC tag to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {nfcTags.map((tag: any) => {
                  const campaign = campaigns.find((c: any) => c.id === tag.campaignId);
                  return (
                    <div key={tag.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <Wifi className="text-white h-4 w-4" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{tag.location}</p>
                          <p className="text-xs text-gray-500">{campaign?.name || "Unknown Campaign"}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={tag.isActive ? "default" : "secondary"}>
                          {tag.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
