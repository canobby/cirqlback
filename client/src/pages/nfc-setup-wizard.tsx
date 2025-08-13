import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, ArrowLeft, CheckCircle, Tag, MapPin, Smartphone, Wifi, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface NFCTagData {
  campaignId: string;
  campaignName: string;
  tagIdentifier: string;
  location: string;
  customLabel: string;
  description: string;
}

export default function NFCSetupWizard() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const [urlParams] = useState(new URLSearchParams(window.location.search));
  const { toast } = useToast();
  
  const [tagData, setTagData] = useState<NFCTagData>({
    campaignId: urlParams.get("campaignId") || "",
    campaignName: "Summer Special", // In real app, fetch from API
    tagIdentifier: "",
    location: "",
    customLabel: "",
    description: ""
  });

  const [isWriting, setIsWriting] = useState(false);
  const [writeSuccess, setWriteSuccess] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(false);

  useEffect(() => {
    // Check if Web NFC is supported
    if ('NDEFReader' in window) {
      setNfcSupported(true);
    }
  }, []);

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleTagSetup = () => {
    if (!tagData.tagIdentifier || !tagData.location) {
      toast({
        title: "Missing Information",
        description: "Please fill in tag ID and location.",
        variant: "destructive",
      });
      return;
    }
    handleNext();
  };

  const writeNFCTag = async () => {
    if (!nfcSupported) {
      toast({
        title: "NFC Not Supported",
        description: "Your device doesn't support NFC writing.",
        variant: "destructive",
      });
      return;
    }

    setIsWriting(true);
    
    try {
      // Create the URL that will be written to the NFC tag
      const tapUrl = `${window.location.origin}/tap?tag=${tagData.tagIdentifier}&campaign=${tagData.campaignId}`;
      
      // @ts-ignore - Web NFC API types
      const ndef = new NDEFReader();
      
      await ndef.write({
        records: [{
          recordType: "url",
          data: tapUrl
        }]
      });

      setWriteSuccess(true);
      toast({
        title: "NFC Tag Programmed!",
        description: "Your tag is ready to use.",
      });
      
      // Save tag data to backend
      await fetch("/api/nfc-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...tagData,
          businessId: "demo_biz_1" // In real app, get from user session
        })
      });
      
      handleNext();
    } catch (error) {
      console.error("NFC write error:", error);
      toast({
        title: "Writing Failed",
        description: "Could not write to NFC tag. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsWriting(false);
    }
  };

  const progress = (step / 4) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            NFC Tag Setup Wizard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Program your physical tag in 4 simple steps
          </p>
          
          {/* Progress Bar */}
          <div className="mt-6 max-w-md mx-auto">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between mt-2 text-sm text-gray-500">
              <span className={step >= 1 ? "text-blue-600 font-medium" : ""}>Setup</span>
              <span className={step >= 2 ? "text-blue-600 font-medium" : ""}>Details</span>
              <span className={step >= 3 ? "text-blue-600 font-medium" : ""}>Program</span>
              <span className={step >= 4 ? "text-blue-600 font-medium" : ""}>Deploy</span>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardContent className="p-8">
            
            {/* Step 1: Campaign Info */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <CardTitle className="text-2xl mb-2">Ready to Program Your Tag</CardTitle>
                  <CardDescription className="text-lg">
                    Your campaign is ready for NFC deployment
                  </CardDescription>
                </div>
                
                <div className="max-w-2xl mx-auto">
                  <Card className="border-2 border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <Tag className="h-12 w-12 text-blue-600" />
                        <div>
                          <h3 className="font-semibold text-lg text-blue-800 dark:text-blue-200">
                            {tagData.campaignName}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400">
                            Ready for NFC programming
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {!nfcSupported && (
                    <Alert className="mt-6">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        NFC writing requires a compatible mobile device. Please use a smartphone with NFC capabilities.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="flex justify-center mt-8">
                  <Button onClick={handleNext} className="text-white">
                    Continue Setup
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Tag Details */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <CardTitle className="text-2xl mb-2">Tag Information</CardTitle>
                  <CardDescription className="text-lg">
                    Give your NFC tag a unique identifier and location
                  </CardDescription>
                </div>

                <div className="max-w-2xl mx-auto space-y-6">
                  <div>
                    <Label htmlFor="tagId" className="text-base font-medium">Tag ID</Label>
                    <Input
                      id="tagId"
                      placeholder="e.g., FRONT-COUNTER-01"
                      value={tagData.tagIdentifier}
                      onChange={(e) => setTagData({ ...tagData, tagIdentifier: e.target.value.toUpperCase() })}
                      className="mt-2 text-base font-mono"
                    />
                    <p className="text-sm text-gray-500 mt-1">Unique identifier for this tag</p>
                  </div>

                  <div>
                    <Label htmlFor="location" className="text-base font-medium">Physical Location</Label>
                    <Input
                      id="location"
                      placeholder="e.g., Front counter, Table 5, Entrance door"
                      value={tagData.location}
                      onChange={(e) => setTagData({ ...tagData, location: e.target.value })}
                      className="mt-2 text-base"
                    />
                  </div>

                  <div>
                    <Label htmlFor="label" className="text-base font-medium">Custom Label (Optional)</Label>
                    <Input
                      id="label"
                      placeholder="e.g., Main Rewards Tag"
                      value={tagData.customLabel}
                      onChange={(e) => setTagData({ ...tagData, customLabel: e.target.value })}
                      className="mt-2 text-base"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-base font-medium">Customer Instructions (Optional)</Label>
                    <Input
                      id="description"
                      placeholder="e.g., Tap here to earn rewards!"
                      value={tagData.description}
                      onChange={(e) => setTagData({ ...tagData, description: e.target.value })}
                      className="mt-2 text-base"
                    />
                  </div>
                </div>

                <div className="flex justify-center gap-4 mt-8">
                  <Button variant="outline" onClick={handleBack} className="text-white">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={handleTagSetup} className="text-white">
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: NFC Programming */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center">
                  <CardTitle className="text-2xl mb-2">Program Your NFC Tag</CardTitle>
                  <CardDescription className="text-lg">
                    Hold your phone near the NFC tag to program it
                  </CardDescription>
                </div>

                <div className="max-w-2xl mx-auto text-center">
                  {!writeSuccess ? (
                    <>
                      <div className="bg-gradient-to-br from-blue-100 to-green-100 dark:from-blue-900/20 dark:to-green-900/20 rounded-2xl p-8 mb-6">
                        <Smartphone className="h-20 w-20 mx-auto mb-4 text-blue-600" />
                        <h3 className="text-lg font-semibold mb-2">Ready to Program</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          Make sure NFC is enabled on your device, then click the button below and hold your phone near the NFC tag.
                        </p>
                      </div>

                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                          <Wifi className="h-5 w-5" />
                          <span className="font-medium">Instructions:</span>
                        </div>
                        <ol className="list-decimal list-inside text-sm text-yellow-700 dark:text-yellow-300 mt-2 space-y-1">
                          <li>Click "Program Tag" below</li>
                          <li>When prompted, hold your phone near the NFC tag</li>
                          <li>Keep steady until programming completes</li>
                        </ol>
                      </div>

                      <Button 
                        onClick={writeNFCTag} 
                        disabled={isWriting || !nfcSupported}
                        size="lg"
                        className="text-white"
                      >
                        {isWriting ? (
                          <>
                            <div className="animate-spin h-5 w-5 mr-2 border-2 border-white border-t-transparent rounded-full" />
                            Programming...
                          </>
                        ) : (
                          <>
                            <Tag className="h-5 w-5 mr-2" />
                            Program Tag
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <div className="bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/20 dark:to-blue-900/20 rounded-2xl p-8">
                      <CheckCircle className="h-20 w-20 mx-auto mb-4 text-green-600" />
                      <h3 className="text-lg font-semibold mb-2 text-green-800 dark:text-green-200">
                        Tag Programmed Successfully!
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Your NFC tag is ready to use. Customers can now tap it to access your campaign.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-center gap-4 mt-8">
                  <Button variant="outline" onClick={handleBack} disabled={isWriting} className="text-white">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  {writeSuccess && (
                    <Button onClick={handleNext} className="text-white">
                      Continue
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Deployment Complete */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="text-center">
                  <CardTitle className="text-2xl mb-2">Deployment Complete!</CardTitle>
                  <CardDescription className="text-lg">
                    Your NFC campaign is live and ready for customers
                  </CardDescription>
                </div>

                <div className="max-w-2xl mx-auto text-center">
                  <div className="bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/20 dark:to-blue-900/20 rounded-2xl p-8 mb-6">
                    <CheckCircle className="h-20 w-20 mx-auto mb-4 text-green-600" />
                    <h3 className="text-xl font-semibold mb-4 text-green-800 dark:text-green-200">
                      Campaign Successfully Deployed!
                    </h3>
                    
                    <div className="space-y-3 text-left">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Campaign:</span>
                        <span className="font-medium">{tagData.campaignName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tag ID:</span>
                        <span className="font-mono font-medium">{tagData.tagIdentifier}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Location:</span>
                        <span className="font-medium">{tagData.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Button 
                      onClick={() => setLocation("/merchant")}
                      variant="outline"
                      className="text-white"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      View Dashboard
                    </Button>
                    <Button 
                      onClick={() => setLocation("/campaign-setup-wizard")}
                      className="text-white"
                    >
                      <Tag className="h-4 w-4 mr-2" />
                      Create Another
                    </Button>
                  </div>
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}