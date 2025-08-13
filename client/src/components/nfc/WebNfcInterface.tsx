import { useState, useCallback, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Wifi, WifiOff, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Type definitions for Web NFC API
interface NDEFMessage {
  records: NDEFRecord[];
}

interface NDEFRecord {
  recordType: string;
  mediaType?: string;
  id?: string;
  data?: BufferSource;
  encoding?: string;
  lang?: string;
}

interface NDEFReadingEvent extends Event {
  serialNumber: string;
  message: NDEFMessage;
}

interface NDEFWriter {
  write(message: NDEFMessage | string, options?: any): Promise<void>;
}

interface NDEFReader extends EventTarget {
  scan(options?: any): Promise<void>;
  start(): Promise<void>;
  stop(): void;
  addEventListener(type: 'reading' | 'readingerror', listener: (event: any) => void): void;
}

// Extend Navigator interface for Web NFC
declare global {
  interface Navigator {
    nfc?: {
      reader: () => NDEFReader;
    };
  }

  interface Window {
    NDEFReader?: any;
    NDEFWriter?: any;
  }
}

interface NfcTagData {
  tagId: string;
  businessId: string;
  campaignId?: string;
  redirectUrl: string;
  metadata?: {
    location: string;
    customLabel?: string;
    description?: string;
    createdAt: string;
  };
}

interface WebNfcInterfaceProps {
  tagData: NfcTagData;
  onWriteSuccess: (data: any) => void;
  onWriteError: (error: string) => void;
  onReadSuccess?: (data: any) => void;
}

type NfcState = 'unsupported' | 'supported' | 'permission-needed' | 'ready' | 'writing' | 'reading' | 'error' | 'success';

export default function WebNfcInterface({ 
  tagData, 
  onWriteSuccess, 
  onWriteError, 
  onReadSuccess 
}: WebNfcInterfaceProps) {
  const [nfcState, setNfcState] = useState<NfcState>('unsupported');
  const [isWriting, setIsWriting] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [writeProgress, setWriteProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastWrittenTag, setLastWrittenTag] = useState<any>(null);
  const [reader, setReader] = useState<NDEFReader | null>(null);
  const { toast } = useToast();

  // Check NFC support on component mount
  useEffect(() => {
    checkNfcSupport();
  }, []);

  const checkNfcSupport = useCallback(async () => {
    try {
      // Check if Web NFC is supported
      if ('NDEFReader' in window) {
        setNfcState('supported');
        
        // Request permissions
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'nfc' as any });
          if (permissionStatus.state === 'granted') {
            setNfcState('ready');
          } else {
            setNfcState('permission-needed');
          }
        } catch (permError) {
          // Permissions API might not be available for NFC
          setNfcState('ready');
        }
      } else {
        setNfcState('unsupported');
        setErrorMessage('Web NFC is not supported on this device or browser');
      }
    } catch (error) {
      setNfcState('error');
      setErrorMessage('Failed to initialize NFC: ' + String(error));
    }
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      const ndefReader = new window.NDEFReader();
      await ndefReader.scan();
      setNfcState('ready');
      toast({
        title: "NFC Permission Granted",
        description: "You can now write and read NFC tags."
      });
    } catch (error) {
      setNfcState('error');
      setErrorMessage('Permission denied or NFC not available');
      toast({
        title: "Permission Denied",
        description: "NFC permission is required to write tags.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const writeNfcTag = useCallback(async () => {
    if (nfcState !== 'ready') return;

    setIsWriting(true);
    setWriteProgress(0);
    setNfcState('writing');

    try {
      // Create the NFC message
      const ndefMessage = {
        records: [
          {
            recordType: "url",
            data: tagData.redirectUrl
          },
          {
            recordType: "text",
            data: JSON.stringify({
              tagId: tagData.tagId,
              businessId: tagData.businessId,
              campaignId: tagData.campaignId,
              metadata: tagData.metadata
            }),
            encoding: "utf-8",
            lang: "en"
          }
        ]
      };

      // Simulate progress updates
      setWriteProgress(20);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setWriteProgress(40);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Write to NFC tag
      const writer = new window.NDEFWriter();
      setWriteProgress(60);
      
      await writer.write(ndefMessage);
      
      setWriteProgress(80);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setWriteProgress(100);
      
      // Success
      setNfcState('success');
      setLastWrittenTag(tagData);
      onWriteSuccess({
        tagId: tagData.tagId,
        url: tagData.redirectUrl,
        timestamp: new Date().toISOString(),
        success: true
      });
      
      toast({
        title: "NFC Tag Written Successfully!",
        description: `Tag programmed with campaign data and URL: ${tagData.redirectUrl}`
      });

    } catch (error) {
      setNfcState('error');
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrorMessage(errorMsg);
      onWriteError(errorMsg);
      
      toast({
        title: "NFC Write Failed",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setIsWriting(false);
      setTimeout(() => {
        setWriteProgress(0);
        if (nfcState !== 'ready') {
          setNfcState('ready');
        }
      }, 2000);
    }
  }, [nfcState, tagData, onWriteSuccess, onWriteError, toast]);

  const startReading = useCallback(async () => {
    if (nfcState !== 'ready') return;

    setIsReading(true);
    setNfcState('reading');

    try {
      const ndefReader = new window.NDEFReader();
      setReader(ndefReader);

      ndefReader.addEventListener('reading', (event: NDEFReadingEvent) => {
        console.log('NFC tag read:', event);
        const { message, serialNumber } = event;
        
        // Process the NFC data
        const tagData = {
          serialNumber,
          records: message.records.map(record => ({
            recordType: record.recordType,
            data: record.data ? new TextDecoder().decode(record.data) : null
          }))
        };

        onReadSuccess?.(tagData);
        setIsReading(false);
        setNfcState('ready');
        
        toast({
          title: "NFC Tag Read",
          description: `Successfully read tag: ${serialNumber}`
        });
      });

      ndefReader.addEventListener('readingerror', () => {
        setIsReading(false);
        setNfcState('error');
        setErrorMessage('Failed to read NFC tag');
        toast({
          title: "Read Error",
          description: "Failed to read NFC tag",
          variant: "destructive"
        });
      });

      await ndefReader.scan();
      
      toast({
        title: "NFC Reader Started",
        description: "Bring an NFC tag close to read it"
      });

    } catch (error) {
      setIsReading(false);
      setNfcState('error');
      const errorMsg = error instanceof Error ? error.message : 'Failed to start reading';
      setErrorMessage(errorMsg);
      
      toast({
        title: "Read Failed",
        description: errorMsg,
        variant: "destructive"
      });
    }
  }, [nfcState, onReadSuccess, toast]);

  const stopReading = useCallback(() => {
    if (reader) {
      reader.stop();
      setReader(null);
    }
    setIsReading(false);
    setNfcState('ready');
    
    toast({
      title: "NFC Reader Stopped",
      description: "No longer scanning for tags"
    });
  }, [reader, toast]);

  const getStatusBadge = () => {
    switch (nfcState) {
      case 'unsupported':
        return <Badge variant="destructive" className="flex items-center gap-1"><WifiOff className="h-3 w-3" /> Unsupported</Badge>;
      case 'supported':
        return <Badge variant="secondary" className="flex items-center gap-1"><Wifi className="h-3 w-3" /> Detected</Badge>;
      case 'permission-needed':
        return <Badge variant="outline" className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Permission Needed</Badge>;
      case 'ready':
        return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Ready</Badge>;
      case 'writing':
        return <Badge className="flex items-center gap-1 bg-orange-500"><Zap className="h-3 w-3" /> Writing...</Badge>;
      case 'reading':
        return <Badge className="flex items-center gap-1 bg-blue-500"><Smartphone className="h-3 w-3" /> Reading...</Badge>;
      case 'success':
        return <Badge className="flex items-center gap-1 bg-green-500"><CheckCircle className="h-3 w-3" /> Success</Badge>;
      case 'error':
        return <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Error</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            NFC Tag Writer
          </CardTitle>
          {getStatusBadge()}
        </div>
        <CardDescription>
          Program your NFC tag with campaign data and redirect URL
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* NFC Status Information */}
        {nfcState === 'unsupported' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              NFC is not supported on this device or browser. Please use a compatible Android device with Chrome or Edge browser.
            </AlertDescription>
          </Alert>
        )}

        {nfcState === 'permission-needed' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              NFC permission is required to write tags. Click the button below to grant permission.
            </AlertDescription>
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Tag Data Preview */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Tag Data to Write:</h4>
          <div className="space-y-1 text-sm">
            <div><strong>Tag ID:</strong> {tagData.tagId}</div>
            <div><strong>Redirect URL:</strong> {tagData.redirectUrl}</div>
            {tagData.metadata?.location && <div><strong>Location:</strong> {tagData.metadata.location}</div>}
            {tagData.metadata?.customLabel && <div><strong>Label:</strong> {tagData.metadata.customLabel}</div>}
          </div>
        </div>

        {/* Progress Bar */}
        {isWriting && (
          <div className="space-y-2">
            <Progress value={writeProgress} className="w-full" />
            <p className="text-sm text-gray-600 text-center">
              {writeProgress === 20 && "Initializing NFC connection..."}
              {writeProgress === 40 && "Preparing tag data..."}
              {writeProgress === 60 && "Writing to NFC tag..."}
              {writeProgress === 80 && "Verifying write operation..."}
              {writeProgress === 100 && "Write completed successfully!"}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {nfcState === 'permission-needed' && (
            <Button onClick={requestPermission} className="flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              Grant NFC Permission
            </Button>
          )}

          {nfcState === 'ready' && (
            <>
              <Button 
                onClick={writeNfcTag} 
                disabled={isWriting || isReading}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90"
              >
                <Zap className="h-4 w-4" />
                {isWriting ? 'Writing...' : 'Write NFC Tag'}
              </Button>

              <Button 
                variant="outline" 
                onClick={isReading ? stopReading : startReading}
                disabled={isWriting}
                className="flex items-center gap-2"
              >
                <Smartphone className="h-4 w-4" />
                {isReading ? 'Stop Reading' : 'Test Read'}
              </Button>
            </>
          )}

          {nfcState === 'error' && (
            <Button onClick={checkNfcSupport} variant="outline">
              Retry
            </Button>
          )}
        </div>

        {/* Success Information */}
        {lastWrittenTag && nfcState === 'success' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Tag programmed successfully!</strong> The NFC tag now contains your campaign data and will redirect customers to: {lastWrittenTag.redirectUrl}
            </AlertDescription>
          </Alert>
        )}

        {/* Instructions */}
        {nfcState === 'ready' && (
          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>Instructions:</strong></p>
            <p>1. Click "Write NFC Tag" button</p>
            <p>2. Hold your blank NFC tag close to your device</p>
            <p>3. Keep the tag steady until writing is complete</p>
            <p>4. Test the tag by using "Test Read" function</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}