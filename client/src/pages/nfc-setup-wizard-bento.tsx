import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import UniversalNFCWriter from "@/components/nfc/ios-nfc-writer";
import { 
  Smartphone, Wifi, CheckCircle, AlertTriangle, ArrowRight, 
  ArrowLeft, Zap, Target, Settings, RefreshCw, Play
} from "lucide-react";

export default function NFCSetupWizardBento() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcEnabled, setNfcEnabled] = useState(false);
  const [tagWritten, setTagWritten] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({
    isIOS: false,
    isAndroid: false,
    browser: ''
  });

  useEffect(() => {
    // Enhanced NFC support detection
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome');
    const isChrome = userAgent.includes('Chrome');

    setDeviceInfo({
      isIOS,
      isAndroid,
      browser: isChrome ? 'Chrome' : isSafari ? 'Safari' : 'Other'
    });

    if (isAndroid && isChrome && 'NDEFReader' in window) {
      setNfcSupported(true);
    } else if (isIOS && isSafari) {
      // iOS has NFC reading capability but writing requires special handling
      setNfcSupported(false);
    } else {
      setNfcSupported(false);
    }
  }, []);

  const handleWriteTag = async () => {
    if (!nfcSupported) return;
    
    setIsWriting(true);
    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.write({
        records: [
          { recordType: "text", data: "Hello from Cirqlback!" },
          { recordType: "url", data: "https://cirqlback.com/tap/demo123" }
        ]
      });
      setTagWritten(true);
      setTimeout(() => setStep(4), 1000);
    } catch (error) {
      console.error("NFC write failed:", error);
    } finally {
      setIsWriting(false);
    }
  };

  const progress = (step / 5) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/50 to-purple-50/50 dark:from-gray-950 dark:via-blue-950/50 dark:to-purple-950/50">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-6">
            <Button 
              onClick={() => setLocation('/merchant')}
              variant="outline"
              size="sm"
              className="text-gray-700 border-gray-300 hover:bg-gray-100"
            >
              Back to Merchant
            </Button>
            <div></div>
          </div>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 bg-clip-text text-transparent mb-2">
            Cirql Tag Setup
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
            Program your NFC tags in guided visual steps
          </p>
          
          {/* Progress Bar */}
          <div className="max-w-md mx-auto mb-8">
            <Progress value={progress} className="h-3 bg-gray-200 dark:bg-gray-700" />
            <div className="flex justify-between mt-3 text-sm">
              <Badge variant={step >= 1 ? "default" : "secondary"} className={step >= 1 ? "bg-blue-600" : ""}>
                1. Check
              </Badge>
              <Badge variant={step >= 2 ? "default" : "secondary"} className={step >= 2 ? "bg-blue-600" : ""}>
                2. Enable  
              </Badge>
              <Badge variant={step >= 3 ? "default" : "secondary"} className={step >= 3 ? "bg-blue-600" : ""}>
                3. Setup
              </Badge>
              <Badge variant={step >= 4 ? "default" : "secondary"} className={step >= 4 ? "bg-blue-600" : ""}>
                4. Write
              </Badge>
              <Badge variant={step >= 5 ? "default" : "secondary"} className={step >= 5 ? "bg-blue-600" : ""}>
                5. Done
              </Badge>
            </div>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-8 gap-6 auto-rows-min">

          {/* Step 1: NFC Support Check */}
          {step === 1 && (
            <>
              <Card className="md:col-span-6 lg:col-span-5 bg-gradient-to-br from-blue-500 to-cyan-500 border-0 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
                <CardContent className="p-8 relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-3xl font-bold mb-2">Device Compatibility</h2>
                      <p className="text-blue-100">Checking your device's NFC capabilities</p>
                    </div>
                    <Smartphone className="h-12 w-12 text-blue-100" />
                  </div>
                  
                  <div className="space-y-4">
                    <div className={`flex items-center p-4 rounded-lg ${nfcSupported ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      {nfcSupported ? <CheckCircle className="h-6 w-6 mr-3 text-green-200" /> : <AlertTriangle className="h-6 w-6 mr-3 text-red-200" />}
                      <span className="font-semibold">
                        {nfcSupported ? "NFC Supported ✓" : "NFC Not Available"}
                      </span>
                    </div>
                    
                    {nfcSupported ? (
                      <Button 
                        onClick={() => setStep(2)}
                        className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                        variant="outline"
                      >
                        Continue to Enable NFC
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <Alert className="bg-red-500/20 border-red-300/20">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription className="text-red-100">
                            {deviceInfo.isIOS 
                              ? "iOS devices have limited NFC writing support in browsers. For full NFC functionality, try our advanced NFC writer or use an Android device with Chrome."
                              : "Your device doesn't support NFC. Please use an Android device with NFC capability."
                            }
                          </AlertDescription>
                        </Alert>
                        
                        <div className="space-y-2">
                          <Button 
                            onClick={() => setStep(2)}
                            className="bg-white/20 hover:bg-white/30 text-white border-white/30 w-full"
                            variant="outline"
                          >
                            Continue with Smart NFC Writer
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-3 lg:col-span-3 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center text-gray-900 dark:text-white">
                    <Settings className="h-5 w-5 mr-2 text-blue-600" />
                    Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${nfcSupported ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">NFC-enabled device</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Modern web browser</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-gray-300 rounded-full mr-3"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Blank NFC tag</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Step 2: Enable NFC */}
          {step === 2 && (
            <>
              <Card className="md:col-span-6 lg:col-span-4 bg-gradient-to-br from-purple-500 to-pink-500 border-0 text-white">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-3xl font-bold mb-2">Enable NFC</h2>
                      <p className="text-purple-100">Turn on NFC in your device settings</p>
                    </div>
                    <Wifi className="h-12 w-12 text-purple-100" />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-white/10 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Instructions:</h3>
                      <ol className="text-sm text-purple-100 space-y-1 list-decimal list-inside">
                        <li>Open Settings on your device</li>
                        <li>Look for "Connected devices" or "Connections"</li>
                        <li>Find and enable "NFC"</li>
                        <li>Return to this page</li>
                      </ol>
                    </div>
                    
                    <Button 
                      onClick={() => {setNfcEnabled(true); setStep(3);}}
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30 w-full"
                      variant="outline"
                    >
                      NFC is Enabled - Continue
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-3 lg:col-span-4 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">Need Help?</h3>
                  <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg flex items-center justify-center mb-4">
                    <Button size="lg" className="bg-white/90 hover:bg-white text-purple-600">
                      <Play className="h-6 w-6 mr-2" />
                      Watch Tutorial
                    </Button>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Step-by-step video guide for enabling NFC on your device
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {/* Step 3: Write Tag */}
          {step === 3 && (
            <>
              <Card className="md:col-span-6 lg:col-span-4 bg-gradient-to-br from-green-500 to-emerald-500 border-0 text-white">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-3xl font-bold mb-2">Write to Tag</h2>
                      <p className="text-green-100">Hold your NFC tag near the device</p>
                    </div>
                    <Target className="h-12 w-12 text-green-100" />
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-white/10 p-6 rounded-lg text-center">
                      <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Zap className="h-12 w-12" />
                      </div>
                      <p className="text-green-100 mb-4">
                        Place your NFC tag within 2cm of your device and tap the button
                      </p>
                    </div>
                    
                    <Button 
                      onClick={() => setStep(4)}
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30 w-full h-14 text-lg"
                      variant="outline"
                    >
                      <Zap className="h-5 w-5 mr-2" />
                      Use Smart NFC Writer
                    </Button>
                    

                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-3 lg:col-span-4 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white">Campaign Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-4 rounded-lg">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Target className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Summer Special</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">20% off all drinks</p>
                      <Badge className="bg-purple-100 text-purple-700">Tap to claim</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Step 4: Universal NFC Writer */}
          {step === 4 && !tagWritten && (
            <div className="md:col-span-6 lg:col-span-8">
              <UniversalNFCWriter 
                tagData={{
                  url: "https://cirqlback.com/tap/demo123",
                  campaignId: "campaign_001",
                  businessName: "Demo Business",
                  campaignType: "Summer Special - 20% off all drinks"
                }}
                onWriteComplete={(success) => {
                  if (success) {
                    setTagWritten(true);
                    setStep(5); // Go to success step
                  }
                }}
              />
            </div>
          )}

          {/* Step 5: Success */}
          {step === 5 && (
            <>
              <Card className="md:col-span-6 lg:col-span-5 bg-gradient-to-br from-green-500 to-emerald-600 border-0 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20"></div>
                <CardContent className="p-8 relative z-10">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="h-12 w-12" />
                    </div>
                    <h2 className="text-3xl font-bold mb-4">Tag Programmed Successfully!</h2>
                    <p className="text-green-100 text-lg mb-8">
                      Your Cirql tag is ready to attract customers and drive engagement
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button 
                        onClick={() => setLocation('/merchant-bento')}
                        className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                        variant="outline"
                      >
                        Return to Dashboard
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                      
                      <Button 
                        onClick={() => setStep(1)}
                        className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                        variant="outline"
                      >
                        Program Another Tag
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-3 lg:col-span-3 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white">Next Steps</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                      <span className="text-sm text-gray-900 dark:text-white">Place tag in visible location</span>
                    </div>
                    
                    <div className="flex items-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                      <span className="text-sm text-gray-900 dark:text-white">Test with your phone</span>
                    </div>
                    
                    <div className="flex items-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <span className="text-sm text-gray-900 dark:text-white">Monitor analytics</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}



          {/* Navigation */}
          {step > 1 && step < 5 && step !== 4 && (
            <div className="md:col-span-6 lg:col-span-8 flex justify-center gap-4">
              <Button variant="outline" onClick={() => setStep(step - 1)} size="lg" className="text-white">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back
              </Button>
            </div>
          )}
          
          {step === 5 && (
            <div className="md:col-span-6 lg:col-span-8 flex justify-center gap-4">
              <Button variant="outline" onClick={() => setStep(3)} size="lg">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Simple Writer
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}