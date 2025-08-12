import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Wifi, WifiOff, Smartphone, AlertTriangle, CheckCircle, Zap } from "lucide-react";

interface WebNFCInterfaceProps {
  onTagRead?: (data: any) => void;
  onTagWritten?: (success: boolean) => void;
}

export default function WebNFCInterface({ onTagRead, onTagWritten }: WebNFCInterfaceProps) {
  const [isNFCSupported, setIsNFCSupported] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [lastReadData, setLastReadData] = useState<any>(null);
  const { toast } = useToast();

  // Check Web NFC API support
  const checkNFCSupport = useCallback(async () => {
    if ('NDEFReader' in window) {
      setIsNFCSupported(true);
      try {
        // Request permission
        const permission = await navigator.permissions.query({ name: 'nfc' as any });
        setHasPermission(permission.state === 'granted');
        return true;
      } catch (error) {
        console.warn('NFC permission check failed:', error);
        return false;
      }
    } else {
      setIsNFCSupported(false);
      return false;
    }
  }, []);

  // Start NFC reading
  const startReading = useCallback(async () => {
    if (!isNFCSupported) {
      toast({
        title: "NFC Not Supported",
        description: "Your device or browser doesn't support Web NFC API.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsReading(true);
      const ndef = new (window as any).NDEFReader();
      
      await ndef.scan();
      
      ndef.addEventListener('reading', ({ message, serialNumber }: any) => {
        console.log('NFC tag read:', { message, serialNumber });
        
        const records = message.records.map((record: any) => ({
          recordType: record.recordType,
          data: record.data,
          encoding: record.encoding,
          lang: record.lang,
        }));

        const tagData = {
          serialNumber,
          records,
          timestamp: new Date().toISOString(),
        };

        setLastReadData(tagData);
        onTagRead?.(tagData);
        
        toast({
          title: "Cirql Tag Read Successfully! 🎉",
          description: `Tag ID: ${serialNumber.slice(-8)}`,
        });
      });

      ndef.addEventListener('readingerror', () => {
        toast({
          title: "Reading Error",
          description: "Failed to read NFC tag. Please try again.",
          variant: "destructive",
        });
        setIsReading(false);
      });

    } catch (error) {
      console.error('NFC reading error:', error);
      setIsReading(false);
      toast({
        title: "Reading Failed",
        description: "Could not start NFC reading. Check permissions.",
        variant: "destructive",
      });
    }
  }, [isNFCSupported, onTagRead, toast]);

  // Stop NFC reading
  const stopReading = useCallback(() => {
    setIsReading(false);
    toast({
      title: "NFC Reading Stopped",
      description: "No longer scanning for Cirql tags.",
    });
  }, [toast]);

  // Write NFC tag
  const writeTag = useCallback(async (data: { url: string; campaignId: string; businessId: string }) => {
    if (!isNFCSupported) {
      toast({
        title: "NFC Not Supported",
        description: "Your device or browser doesn't support Web NFC API.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsWriting(true);
      const ndef = new (window as any).NDEFReader();
      
      const message = {
        records: [{
          recordType: "url",
          data: data.url
        }, {
          recordType: "text",
          data: JSON.stringify({
            platform: "cirqlback",
            campaignId: data.campaignId,
            businessId: data.businessId,
            version: "1.0"
          })
        }]
      };

      await ndef.write(message);
      
      setIsWriting(false);
      onTagWritten?.(true);
      
      toast({
        title: "Cirql Tag Written Successfully! 🎉",
        description: "Your NFC tag is ready for customer taps.",
      });

    } catch (error) {
      console.error('NFC writing error:', error);
      setIsWriting(false);
      onTagWritten?.(false);
      
      toast({
        title: "Writing Failed",
        description: "Could not write to NFC tag. Please try again.",
        variant: "destructive",
      });
    }
  }, [isNFCSupported, onTagWritten, toast]);

  // Initialize NFC support check on component mount
  useState(() => {
    checkNFCSupport();
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Cirql Tag Reader/Writer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* NFC Support Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {isNFCSupported ? (
                <Wifi className="h-5 w-5 text-green-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-600" />
              )}
              <div>
                <p className="font-medium">
                  {isNFCSupported ? "Web NFC Supported" : "Web NFC Not Available"}
                </p>
                <p className="text-sm text-gray-600">
                  {isNFCSupported 
                    ? "Your device can read and write Cirql tags" 
                    : "Requires Android Chrome 89+ or compatible browser"
                  }
                </p>
              </div>
            </div>
            <Badge variant={isNFCSupported ? "default" : "destructive"}>
              {isNFCSupported ? "Ready" : "Unavailable"}
            </Badge>
          </div>

          {/* Permission Status */}
          {isNFCSupported && (
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                {hasPermission ? (
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                )}
                <div>
                  <p className="font-medium">
                    {hasPermission ? "NFC Permission Granted" : "NFC Permission Required"}
                  </p>
                  <p className="text-sm text-gray-600">
                    {hasPermission 
                      ? "Can access NFC functionality" 
                      : "Grant permission to use Cirql tags"
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Reading Controls */}
          <div className="space-y-3">
            <h4 className="font-medium">Read Cirql Tags</h4>
            <div className="flex gap-2">
              <Button 
                onClick={startReading}
                disabled={!isNFCSupported || isReading || isWriting}
                className="flex-1"
              >
                {isReading ? (
                  <>
                    <Zap className="h-4 w-4 mr-2 animate-pulse" />
                    Scanning for Tags...
                  </>
                ) : (
                  <>
                    <Wifi className="h-4 w-4 mr-2" />
                    Start Reading
                  </>
                )}
              </Button>
              
              {isReading && (
                <Button 
                  variant="outline"
                  onClick={stopReading}
                >
                  Stop
                </Button>
              )}
            </div>
          </div>

          {/* Last Read Data */}
          {lastReadData && (
            <div className="p-4 bg-green-50 rounded-lg">
              <h5 className="font-medium text-green-800 mb-2">Last Tag Read</h5>
              <div className="text-sm text-green-700">
                <p><strong>Tag ID:</strong> {lastReadData.serialNumber}</p>
                <p><strong>Records:</strong> {lastReadData.records.length}</p>
                <p><strong>Time:</strong> {new Date(lastReadData.timestamp).toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* Browser Compatibility Info */}
          {!isNFCSupported && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Web NFC Requirements:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• Android device with NFC capability</li>
                  <li>• Chrome 89+ or Edge 93+</li>
                  <li>• HTTPS connection (secure context)</li>
                  <li>• NFC enabled in device settings</li>
                </ul>
                <p className="mt-2 text-sm">
                  <strong>Alternative:</strong> Use QR codes for broader device compatibility.
                </p>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}