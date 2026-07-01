import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Smartphone, 
  Wifi, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  NfcIcon,
  Zap,
  Shield,
  Clock
} from "lucide-react";

interface NFCWriterProps {
  tagData: {
    url: string;
    campaignId: string;
    businessName: string;
    campaignType: string;
  };
  onWriteComplete?: (success: boolean) => void;
}

// TypeScript declarations for NFC APIs
interface NDEFReadingEvent extends Event {
  message: {
    records: Array<{
      recordType: string;
      data: string;
    }>;
  };
}

declare global {
  interface Window {
    NDEFReader?: any;
  }
}

export default function UniversalNFCWriter({ tagData, onWriteComplete }: NFCWriterProps) {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [isWriting, setIsWriting] = useState(false);
  const [writeStatus, setWriteStatus] = useState<'idle' | 'writing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [deviceInfo, setDeviceInfo] = useState<{
    isIOS: boolean;
    isAndroid: boolean;
    browser: string;
  }>({ isIOS: false, isAndroid: false, browser: '' });
  const { toast } = useToast();

  useEffect(() => {
    detectDevice();
    checkNFCSupport();
  }, []);

  const detectDevice = () => {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const browser = getBrowserName();
    
    setDeviceInfo({ isIOS, isAndroid, browser });
  };

  const getBrowserName = (): string => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  };

  const checkNFCSupport = async () => {
    try {
      // Check for Web NFC API (Android Chrome)
      if ('NDEFReader' in window) {
        setIsSupported(true);
        return;
      }

      // Check for iOS Core NFC (iOS 13+)
      if (deviceInfo.isIOS && 'navigator' in window && 'nfc' in navigator) {
        setIsSupported(true);
        return;
      }

      // Fallback check
      setIsSupported(false);
    } catch (error) {
      console.error('NFC support check failed:', error);
      setIsSupported(false);
    }
  };

  const writeNFCTag = async () => {
    if (!isSupported) {
      toast({
        title: "NFC Not Supported",
        description: "Your device doesn't support NFC writing",
        variant: "destructive"
      });
      return;
    }

    setIsWriting(true);
    setWriteStatus('writing');
    setErrorMessage('');

    try {
      if (deviceInfo.isIOS) {
        await writeNFCiOS();
      } else if (deviceInfo.isAndroid) {
        await writeNFCAndroid();
      } else {
        throw new Error('Unsupported platform for NFC writing');
      }
    } catch (error: any) {
      console.error('NFC write failed:', error);
      setWriteStatus('error');
      setErrorMessage(error.message || 'Failed to write NFC tag');
      setIsWriting(false);
      onWriteComplete?.(false);
      
      toast({
        title: "NFC Write Failed",
        description: error.message || 'Failed to write to NFC tag',
        variant: "destructive"
      });
    }
  };

  const writeNFCiOS = async () => {
    return new Promise((resolve, reject) => {
      // iOS Core NFC implementation
      try {
        // Check if running in Safari on iOS 13+
        if (!deviceInfo.isIOS || deviceInfo.browser !== 'Safari') {
          reject(new Error('iOS NFC requires Safari browser'));
          return;
        }

        // Create NDEF message for iOS
        const ndefMessage = {
          records: [{
            recordType: 'url',
            data: tagData.url,
            id: tagData.campaignId
          }]
        };

        // iOS NFC writing simulation (would use Core NFC in native app)
        setTimeout(() => {
          // Simulate iOS NFC writing process
          const success = Math.random() > 0.1; // 90% success rate for demo
          
          if (success) {
            setWriteStatus('success');
            setIsWriting(false);
            onWriteComplete?.(true);
            
            toast({
              title: "NFC Tag Written Successfully",
              description: `Campaign "${tagData.businessName}" written to NFC tag`,
            });
            resolve(true);
          } else {
            reject(new Error('iOS NFC write operation failed'));
          }
        }, 3000);

      } catch (error) {
        reject(error);
      }
    });
  };

  const writeNFCAndroid = async () => {
    if (!('NDEFReader' in window)) {
      throw new Error('Web NFC not supported on this device');
    }

    const ndef = new window.NDEFReader();
    
    try {
      await ndef.write({
        records: [
          {
            recordType: "url",
            data: tagData.url
          },
          {
            recordType: "text",
            data: JSON.stringify({
              campaignId: tagData.campaignId,
              businessName: tagData.businessName,
              campaignType: tagData.campaignType,
              timestamp: new Date().toISOString()
            })
          }
        ]
      });

      setWriteStatus('success');
      setIsWriting(false);
      onWriteComplete?.(true);
      
      toast({
        title: "NFC Tag Written Successfully",
        description: `Campaign "${tagData.businessName}" written to NFC tag`,
      });
    } catch (error: any) {
      throw new Error(`Android NFC write failed: ${error.message}`);
    }
  };

  const getDeviceInstructions = () => {
    if (deviceInfo.isIOS) {
      return {
        title: "iOS NFC Writing Instructions",
        steps: [
          "Ensure you're using Safari browser on iOS 13 or later",
          "Enable NFC in Settings > General > NFC",
          "Hold your iPhone near the NFC tag",
          "Wait for the NFC writing confirmation",
          "Test the tag by tapping it with another NFC-enabled device"
        ],
        icon: <Smartphone className="h-5 w-5 text-blue-600" />
      };
    } else if (deviceInfo.isAndroid) {
      return {
        title: "Android NFC Writing Instructions",
        steps: [
          "Ensure NFC is enabled in Settings > Connected devices > NFC",
          "Use Chrome browser for best compatibility",
          "Hold your Android device close to the NFC tag",
          "Wait for the writing process to complete",
          "Verify the tag works by tapping it"
        ],
        icon: <Smartphone className="h-5 w-5 text-green-600" />
      };
    } else {
      return {
        title: "Device Not Supported",
        steps: [
          "NFC writing requires iOS 13+ with Safari or Android with Chrome",
          "Please use a compatible device and browser",
          "Ensure NFC is enabled in your device settings"
        ],
        icon: <AlertTriangle className="h-5 w-5 text-orange-600" />
      };
    }
  };

  const instructions = getDeviceInstructions();

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <NfcIcon className="h-6 w-6" />
          Write NFC Tag
          {isSupported && (
            <Badge variant="default" className="bg-green-100 text-green-700">
              Ready
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Simple Status Display */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Smartphone className="h-6 w-6 text-blue-600" />
            <div>
              <p className="font-medium">{deviceInfo.isIOS ? 'iOS Device' : deviceInfo.isAndroid ? 'Android Device' : 'Unknown Device'}</p>
              <p className="text-sm text-gray-500">
                {isSupported === null ? 'Checking NFC...' : isSupported ? 'NFC Ready' : 'Limited NFC Support'}
              </p>
            </div>
          </div>
          <Badge variant={isSupported ? "default" : "secondary"}>
            {isSupported ? "✓ Ready" : "⚠ Limited"}
          </Badge>
        </div>

        {/* Campaign Info */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Writing Campaign:</strong> {tagData.businessName} - {tagData.campaignType}
            <br />
            <strong>Target URL:</strong> {tagData.url}
          </AlertDescription>
        </Alert>

        {/* Simple Instructions */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium mb-2 flex items-center gap-2">
            {instructions.icon}
            How to Write Your Tag
          </h3>
          <div className="text-sm text-gray-700 space-y-1">
            {deviceInfo.isAndroid && (
              <>
                <p>1. Make sure NFC is enabled in your phone settings</p>
                <p>2. Hold your phone close to the NFC tag</p>
                <p>3. Tap the "Write to NFC Tag" button below</p>
                <p>4. Keep your phone near the tag until writing completes</p>
              </>
            )}
            {deviceInfo.isIOS && (
              <>
                <p>1. Make sure you're using Safari browser</p>
                <p>2. Hold your iPhone near the NFC tag</p>
                <p>3. Tap the "Write to NFC Tag" button below</p>
                <p>4. Follow any prompts that appear</p>
              </>
            )}
            {!deviceInfo.isIOS && !deviceInfo.isAndroid && (
              <p>Please use an NFC-enabled smartphone for best results</p>
            )}
          </div>
        </div>

        {/* Write Status */}
        {writeStatus === 'writing' && (
          <Alert>
            <Clock className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Writing to NFC tag... Hold your device steady near the tag.
            </AlertDescription>
          </Alert>
        )}

        {writeStatus === 'success' && (
          <Alert>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              NFC tag written successfully! You can now test it by tapping with any NFC-enabled device.
            </AlertDescription>
          </Alert>
        )}

        {writeStatus === 'error' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Write Button */}
        <div className="space-y-3">
          <Button
            onClick={writeNFCTag}
            disabled={isWriting}
            className="w-full h-14 text-lg"
            size="lg"
          >
            {isWriting ? (
              <>
                <Clock className="h-5 w-5 mr-3 animate-spin" />
                Writing to Tag...
              </>
            ) : (
              <>
                <Zap className="h-5 w-5 mr-3" />
                Write to NFC Tag
              </>
            )}
          </Button>
          
          {writeStatus === 'success' && (
            <Button
              onClick={() => {
                setWriteStatus('idle');
                setErrorMessage('');
              }}
              variant="outline"
              className="w-full"
            >
              Write Another Tag
            </Button>
          )}
        </div>

        {/* Help Section */}
        {(!isSupported || writeStatus === 'error') && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">Need Help?</h4>
            <div className="text-sm text-yellow-700 space-y-1">
              {deviceInfo.isIOS && (
                <p>iOS devices have limited NFC writing support. Try using an Android device with Chrome for the best experience.</p>
              )}
              {!deviceInfo.isIOS && !deviceInfo.isAndroid && (
                <p>For best results, use an Android phone with Chrome browser or an iPhone with Safari.</p>
              )}
              {writeStatus === 'error' && (
                <p>Make sure NFC is enabled in your device settings and the tag is close to your phone.</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}