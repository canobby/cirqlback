import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import IOSNFCWriter from "@/components/nfc/ios-nfc-writer";
import { useToast } from "@/hooks/use-toast";
import { 
  NfcIcon,
  ArrowLeft,
  Settings,
  Smartphone,
  Zap,
  Globe,
  Target,
  Users,
  Gift,
  Percent,
  Info
} from "lucide-react";

interface CampaignData {
  id: string;
  name: string;
  type: string;
  description: string;
  url: string;
  businessName: string;
}

export default function NFCWriter() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignData | null>(null);
  const [customUrl, setCustomUrl] = useState("");
  const [useCustomUrl, setUseCustomUrl] = useState(false);

  // Mock campaigns data
  const campaigns: CampaignData[] = [
    {
      id: "camp_001",
      name: "New Customer Welcome",
      type: "Discount",
      description: "20% off first purchase for new customers",
      url: "https://cirqlback.com/tap/welcome001",
      businessName: "Your Business"
    },
    {
      id: "camp_002", 
      name: "Happy Hour Special",
      type: "Time-Limited",
      description: "Buy one get one free drinks 4-6 PM",
      url: "https://cirqlback.com/tap/happy002",
      businessName: "Your Business"
    },
    {
      id: "camp_003",
      name: "Loyalty Points Boost",
      type: "Loyalty", 
      description: "Double points on all purchases this week",
      url: "https://cirqlback.com/tap/loyalty003",
      businessName: "Your Business"
    },
    {
      id: "camp_004",
      name: "Weekend Event",
      type: "Event",
      description: "Live music Saturday + Sunday, special menu",
      url: "https://cirqlback.com/tap/event004", 
      businessName: "Your Business"
    }
  ];

  const handleCampaignSelect = (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    setSelectedCampaign(campaign || null);
    setUseCustomUrl(false);
  };

  const getTagData = () => {
    if (useCustomUrl && customUrl) {
      return {
        url: customUrl,
        campaignId: "custom_url",
        businessName: "Custom URL",
        campaignType: "Custom Link"
      };
    }
    
    if (selectedCampaign) {
      return {
        url: selectedCampaign.url,
        campaignId: selectedCampaign.id,
        businessName: selectedCampaign.businessName,
        campaignType: selectedCampaign.name
      };
    }
    
    return null;
  };

  const getCampaignIcon = (type: string) => {
    switch (type) {
      case 'Discount': return <Percent className="h-4 w-4" />;
      case 'Time-Limited': return <Target className="h-4 w-4" />;
      case 'Loyalty': return <Users className="h-4 w-4" />;
      case 'Event': return <Gift className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getCampaignColor = (type: string) => {
    switch (type) {
      case 'Discount': return 'bg-green-100 text-green-700 border-green-200';
      case 'Time-Limited': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Loyalty': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Event': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const tagData = getTagData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button 
                onClick={() => setLocation('/merchant')}
                variant="outline"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Merchant
              </Button>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Cross-Platform NFC Writer
            </h1>
            <p className="text-gray-600 text-lg mt-2">
              Write NFC tags for both iOS and Android devices with full compatibility
            </p>
          </div>
          <div className="text-right">
            <Badge variant="outline" className="mb-2">
              <Smartphone className="h-3 w-3 mr-1" />
              iOS + Android
            </Badge>
            <p className="text-sm text-gray-500">Universal NFC Support</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Campaign Selection */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Select Campaign or URL
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Campaign Selection */}
                <div>
                  <Label className="text-base font-medium">Choose Campaign</Label>
                  <div className="grid gap-3 mt-3">
                    {campaigns.map((campaign) => (
                      <Card 
                        key={campaign.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedCampaign?.id === campaign.id && !useCustomUrl
                            ? 'ring-2 ring-blue-500 bg-blue-50' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleCampaignSelect(campaign.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={getCampaignColor(campaign.type)}>
                                  {getCampaignIcon(campaign.type)}
                                  {campaign.type}
                                </Badge>
                              </div>
                              <h3 className="font-semibold">{campaign.name}</h3>
                              <p className="text-sm text-gray-600 mt-1">{campaign.description}</p>
                              <p className="text-xs text-gray-400 mt-2">{campaign.url}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Custom URL Option */}
                <div className="border-t pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <input 
                      type="checkbox"
                      id="customUrl"
                      checked={useCustomUrl}
                      onChange={(e) => {
                        setUseCustomUrl(e.target.checked);
                        if (e.target.checked) setSelectedCampaign(null);
                      }}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="customUrl" className="font-medium">
                      Use Custom URL
                    </Label>
                  </div>
                  
                  {useCustomUrl && (
                    <div>
                      <Input
                        placeholder="https://your-website.com/custom-page"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        className="mb-2"
                      />
                      <p className="text-xs text-gray-500">
                        Enter any URL to write to the NFC tag
                      </p>
                    </div>
                  )}
                </div>

                {/* Selected Preview */}
                {tagData && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Selected for NFC Tag:</strong><br />
                      <span className="font-mono text-sm">{tagData.url}</span>
                    </AlertDescription>
                  </Alert>
                )}

              </CardContent>
            </Card>
          </div>

          {/* NFC Writer */}
          <div>
            {tagData ? (
              <IOSNFCWriter 
                tagData={tagData}
                onWriteComplete={(success) => {
                  if (success) {
                    toast({
                      title: "NFC Tag Written Successfully",
                      description: `Tag programmed with: ${tagData.campaignType}`,
                    });
                  }
                }}
              />
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center p-12">
                  <NfcIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">
                    Select Campaign or URL
                  </h3>
                  <p className="text-gray-500">
                    Choose a campaign or enter a custom URL to write to your NFC tag
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

        </div>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Cross-Platform NFC Writing Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Smartphone className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">iOS Compatibility</h3>
                <p className="text-sm text-gray-600">
                  Works with Safari on iOS 13+ using Core NFC framework
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Globe className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">Android Support</h3>
                <p className="text-sm text-gray-600">
                  Full Web NFC API support in Chrome for Android devices
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Zap className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">Smart Detection</h3>
                <p className="text-sm text-gray-600">
                  Automatically detects device capabilities and optimizes accordingly
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}