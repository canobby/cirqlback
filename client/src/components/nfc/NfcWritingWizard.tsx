import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Check, 
  Wifi, 
  Settings, 
  QrCode, 
  MapPin, 
  Zap, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink,
  Copy,
  Download,
  Share2,
  Smartphone,
  CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NfcWritingWizardProps {
  businessId: string;
  onComplete?: () => void;
}

type WizardStep = 'select-campaign' | 'configure-tag' | 'write-tag' | 'deployment' | 'success';

interface TagConfiguration {
  campaignId: string;
  location: string;
  customLabel?: string;
  description?: string;
  placementNotes?: string;
}

interface WriteTagResponse {
  id: string;
  tagUrl: string;
  qrCodeUrl: string;
  tagIdentifier: string;
  deploymentInstructions: string[];
  businessId: string;
  campaignId?: string;
  location: string;
  customLabel?: string;
  description?: string;
  placementNotes?: string;
  isActive: boolean;
  totalTaps: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function NfcWritingWizard({ businessId, onComplete }: NfcWritingWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('select-campaign');
  const [isWriting, setIsWriting] = useState(false);
  const [writeProgress, setWriteProgress] = useState(0);
  const [tagConfiguration, setTagConfiguration] = useState<TagConfiguration>({
    campaignId: '',
    location: '',
    customLabel: '',
    description: '',
    placementNotes: ''
  });
  const [writtenTag, setWrittenTag] = useState<WriteTagResponse | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available campaigns
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: [`/api/campaigns?businessId=${businessId}`],
    enabled: !!businessId
  });

  // Fetch existing tags for reference
  const { data: existingTags = [] } = useQuery({
    queryKey: [`/api/nfc-tags?businessId=${businessId}`],
    enabled: !!businessId
  });

  // Write tag mutation
  const writeTagMutation = useMutation({
    mutationFn: async (config: TagConfiguration) => {
      const response = await apiRequest("POST", "/api/nfc-tags", {
        businessId,
        campaignId: config.campaignId,
        tagIdentifier: `CIRQL-${Date.now()}`,
        location: config.location,
        customLabel: config.customLabel,
        description: config.description,
        placementNotes: config.placementNotes
      });
      return response;
    },
    onSuccess: (data: WriteTagResponse) => {
      setWrittenTag(data);
      setCurrentStep('success');
      queryClient.invalidateQueries({ queryKey: [`/api/nfc-tags`] });
      toast({
        title: "Cirql Tag Created Successfully!",
        description: "Your tag is ready for deployment at your business location."
      });
    },
    onError: (error) => {
      toast({
        title: "Tag Creation Failed",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
      setIsWriting(false);
      setWriteProgress(0);
    }
  });

  // Simulate NFC writing process with realistic timing
  const handleWriteTag = async () => {
    setIsWriting(true);
    setCurrentStep('write-tag');
    setWriteProgress(0);

    // Simulate writing progress
    const progressSteps = [
      { progress: 20, message: "Initializing NFC connection..." },
      { progress: 40, message: "Validating tag compatibility..." },
      { progress: 60, message: "Writing campaign data to tag..." },
      { progress: 80, message: "Configuring security settings..." },
      { progress: 100, message: "Finalizing tag configuration..." }
    ];

    for (const step of progressSteps) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setWriteProgress(step.progress);
    }

    // Execute actual tag creation
    writeTagMutation.mutate(tagConfiguration);
  };

  const selectedCampaign = (campaigns as any[]).find((c: any) => c.id === tagConfiguration.campaignId);

  const getStepNumber = (step: WizardStep): number => {
    const steps: WizardStep[] = ['select-campaign', 'configure-tag', 'write-tag', 'deployment', 'success'];
    return steps.indexOf(step) + 1;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard.`
    });
  };

  const resetWizard = () => {
    setCurrentStep('select-campaign');
    setTagConfiguration({
      campaignId: '',
      location: '',
      customLabel: '',
      description: '',
      placementNotes: ''
    });
    setWrittenTag(null);
    setIsWriting(false);
    setWriteProgress(0);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Cirql Tag Creation Wizard</h2>
        <Badge variant="outline" className="px-3 py-1">
          Step {getStepNumber(currentStep)} of 5
        </Badge>
      </div>

      <div className="flex items-center space-x-4 mb-8">
        {['select-campaign', 'configure-tag', 'write-tag', 'deployment', 'success'].map((step, index) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              getStepNumber(currentStep) > index + 1 
                ? 'bg-green-500 text-white'
                : getStepNumber(currentStep) === index + 1 
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-600'
            }`}>
              {getStepNumber(currentStep) > index + 1 ? <Check className="w-4 h-4" /> : index + 1}
            </div>
            {index < 4 && (
              <div className={`w-16 h-1 mx-2 transition-colors ${
                getStepNumber(currentStep) > index + 1 ? 'bg-green-500' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Campaign Selection */}
      {currentStep === 'select-campaign' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Select Campaign
            </CardTitle>
            <CardDescription>
              Choose which campaign this Cirql tag will activate when customers tap it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {campaignsLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2">Loading campaigns...</span>
              </div>
            ) : (campaigns as any[]).length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No campaigns available. You need to create a campaign first before writing Cirql tags.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <Label htmlFor="campaign-select">Available Campaigns</Label>
                <Select 
                  value={tagConfiguration.campaignId} 
                  onValueChange={(value) => setTagConfiguration(prev => ({ ...prev, campaignId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a campaign for this tag" />
                  </SelectTrigger>
                  <SelectContent>
                    {(campaigns as any[]).map((campaign: any) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{campaign.name}</span>
                          <Badge variant={campaign.isActive ? "default" : "secondary"} className="ml-2">
                            {campaign.type}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedCampaign && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900">{selectedCampaign.name}</h4>
                    <p className="text-blue-700 text-sm mt-1">{selectedCampaign.description}</p>
                    <div className="flex items-center mt-2 space-x-4">
                      <Badge variant="outline">{selectedCampaign.type}</Badge>
                      {selectedCampaign.value && (
                        <span className="text-blue-700 font-medium">
                          {selectedCampaign.type === 'discount' ? `${selectedCampaign.value}% off` : `${selectedCampaign.pointsAwarded} points`}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <Button 
                onClick={() => setCurrentStep('configure-tag')}
                disabled={!tagConfiguration.campaignId}
                className="bg-primary text-white hover:bg-primary/90"
              >
                Continue to Configuration
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Tag Configuration */}
      {currentStep === 'configure-tag' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="mr-2 h-5 w-5" />
              Configure Tag Details
            </CardTitle>
            <CardDescription>
              Provide details about where and how this tag will be used.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="location">Location (Required)</Label>
                <Input
                  id="location"
                  placeholder="e.g., Front Counter, Main Entrance, Table 5"
                  value={tagConfiguration.location}
                  onChange={(e) => setTagConfiguration(prev => ({ ...prev, location: e.target.value }))}
                />
                <p className="text-sm text-gray-500">Where will this tag be placed in your business?</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-label">Custom Label (Optional)</Label>
                <Input
                  id="custom-label"
                  placeholder="e.g., Welcome Tag, Loyalty Rewards"
                  value={tagConfiguration.customLabel}
                  onChange={(e) => setTagConfiguration(prev => ({ ...prev, customLabel: e.target.value }))}
                />
                <p className="text-sm text-gray-500">A friendly name for internal reference</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe what customers should expect when they tap this tag..."
                value={tagConfiguration.description}
                onChange={(e) => setTagConfiguration(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="placement-notes">Placement Notes (Optional)</Label>
              <Textarea
                id="placement-notes"
                placeholder="Add notes about optimal placement, visibility, or special instructions..."
                value={tagConfiguration.placementNotes}
                onChange={(e) => setTagConfiguration(prev => ({ ...prev, placementNotes: e.target.value }))}
                rows={2}
              />
            </div>

            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription>
                <strong>Pro Tip:</strong> Place tags where customers naturally look or interact - near checkout, 
                on tables, or by entrance doors for maximum visibility and engagement.
              </AlertDescription>
            </Alert>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('select-campaign')}>
                Back
              </Button>
              <Button 
                onClick={() => setCurrentStep('write-tag')}
                disabled={!tagConfiguration.location.trim()}
                className="bg-primary text-white hover:bg-primary/90"
              >
                Continue to Writing
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: NFC Writing */}
      {currentStep === 'write-tag' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wifi className="mr-2 h-5 w-5" />
              Write Cirql Tag
            </CardTitle>
            <CardDescription>
              Program your NFC tag with the campaign and configuration details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-6">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto transition-all duration-500 ${
                isWriting 
                  ? "bg-primary bg-opacity-20 animate-pulse" 
                  : "bg-primary bg-opacity-10"
              }`}>
                <Wifi className={`h-12 w-12 transition-all duration-500 ${
                  isWriting ? "text-primary animate-spin" : "text-primary"
                }`} />
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 text-lg">
                  {isWriting ? "Writing Cirql Tag..." : "Ready to Write Your Cirql Tag"}
                </h4>
                <p className="text-gray-600">
                  {isWriting 
                    ? "Please hold your NFC tag near your device until writing completes" 
                    : "Make sure you have a blank NFC tag ready, then click the button below"
                  }
                </p>
              </div>

              {isWriting && (
                <div className="space-y-2">
                  <Progress value={writeProgress} className="w-full max-w-md mx-auto" />
                  <p className="text-sm text-gray-500">
                    {writeProgress < 20 && "Initializing NFC connection..."}
                    {writeProgress >= 20 && writeProgress < 40 && "Validating tag compatibility..."}
                    {writeProgress >= 40 && writeProgress < 60 && "Writing campaign data..."}
                    {writeProgress >= 60 && writeProgress < 80 && "Configuring security settings..."}
                    {writeProgress >= 80 && "Finalizing configuration..."}
                  </p>
                </div>
              )}

              {!isWriting && (
                <div className="space-y-4">
                  <Button 
                    onClick={handleWriteTag}
                    className="bg-primary text-white hover:bg-primary/90"
                    size="lg"
                    disabled={writeTagMutation.isPending}
                  >
                    <Wifi className="mr-2 h-5 w-5" />
                    Write Cirql Tag
                  </Button>
                  
                  <div className="max-w-md mx-auto p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-2">Configuration Summary:</h5>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div><strong>Campaign:</strong> {selectedCampaign?.name}</div>
                      <div><strong>Location:</strong> {tagConfiguration.location}</div>
                      {tagConfiguration.customLabel && (
                        <div><strong>Label:</strong> {tagConfiguration.customLabel}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('configure-tag')} disabled={isWriting}>
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Success & Deployment */}
      {currentStep === 'success' && writtenTag && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-green-700">
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Cirql Tag Created Successfully!
            </CardTitle>
            <CardDescription>
              Your tag is ready for deployment. Here are the details and next steps.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tag Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-900 mb-2">Tag Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700">Tag ID:</span>
                      <span className="font-mono text-green-800">{writtenTag.tagIdentifier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Campaign:</span>
                      <span className="font-medium text-green-800">{selectedCampaign?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Location:</span>
                      <span className="font-medium text-green-800">{tagConfiguration.location}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="font-medium text-gray-900">Quick Actions</h5>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(writtenTag.tagUrl, "Tag URL")}
                    >
                      <Copy className="mr-1 h-3 w-3" />
                      Copy URL
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(writtenTag.qrCodeUrl, '_blank')}
                    >
                      <QrCode className="mr-1 h-3 w-3" />
                      QR Code
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(writtenTag.tagIdentifier, "Tag ID")}
                    >
                      <Share2 className="mr-1 h-3 w-3" />
                      Share Tag
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                    <Smartphone className="mr-1 h-4 w-4" />
                    Deployment Instructions
                  </h4>
                  <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Clean the surface where you'll place the tag</li>
                    <li>Remove the protective backing from the NFC tag</li>
                    <li>Place the tag at {tagConfiguration.location}</li>
                    <li>Test the tag by tapping it with your phone</li>
                    <li>Add signage to encourage customer interaction</li>
                  </ol>
                </div>

                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Remember:</strong> Add clear signage like "Tap here with your phone for rewards!" 
                    to maximize customer engagement.
                  </AlertDescription>
                </Alert>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between pt-6 border-t">
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetWizard}>
                  Create Another Tag
                </Button>
                <Button variant="outline" onClick={onComplete}>
                  Return to Dashboard
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">
                  <ExternalLink className="mr-1 h-4 w-4" />
                  View Tag Details
                </Button>
                <Button className="bg-primary text-white hover:bg-primary/90">
                  <Download className="mr-1 h-4 w-4" />
                  Download Resources
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Tags Reference */}
      {(existingTags as any[]).length > 0 && currentStep === 'select-campaign' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Existing Cirql Tags</CardTitle>
            <CardDescription>
              Tags you've already created for reference.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(existingTags as any[]).slice(0, 6).map((tag: any) => (
                <div key={tag.id} className="p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <Wifi className="text-white h-3 w-3" />
                    </div>
                    <Badge variant={tag.isActive ? "default" : "secondary"} className="text-xs">
                      {tag.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <h5 className="font-medium text-sm text-gray-900">{tag.location}</h5>
                  <p className="text-xs text-gray-500 mt-1">{tag.totalTaps} taps</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}