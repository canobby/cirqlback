import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Smartphone, 
  AlertTriangle, 
  Info,
  ExternalLink,
  Download,
  Wifi
} from "lucide-react";

interface IOSNFCGuidanceProps {
  onContinueAnyway?: () => void;
  onTryAdvancedWriter?: () => void;
}

export default function IOSNFCGuidance({ onContinueAnyway, onTryAdvancedWriter }: IOSNFCGuidanceProps) {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-6 w-6 text-blue-600" />
          iOS NFC Limitations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Main Alert */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>iOS Safari Limitations:</strong> Apple restricts NFC writing capabilities in web browsers. 
            Full NFC tag programming typically requires a native iOS app or specific workarounds.
          </AlertDescription>
        </Alert>

        {/* iOS Capabilities */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            What iOS Can Do
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-700">✓</Badge>
              <span className="text-sm">Read NFC tags (iOS 13+)</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-700">✓</Badge>
              <span className="text-sm">Detect NFC tag presence</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-red-100 text-red-700">✗</Badge>
              <span className="text-sm">Write NFC tags in Safari (limited)</span>
            </div>
          </div>
        </div>

        {/* Recommended Solutions */}
        <div>
          <h3 className="font-semibold mb-3">Recommended Solutions</h3>
          <div className="grid gap-3">
            
            {/* Option 1: Android Device */}
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-green-700 font-bold text-sm">1</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Use Android Device (Recommended)</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Android devices with Chrome browser have full NFC writing support through Web NFC API
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-700">Best Experience</Badge>
                    <Badge className="bg-green-100 text-green-700">Full Features</Badge>
                  </div>
                </div>
              </div>
            </Card>

            {/* Option 2: Advanced Writer */}
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-700 font-bold text-sm">2</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Try Advanced NFC Writer</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Our enhanced NFC writer attempts iOS compatibility using Core NFC framework simulation
                  </p>
                  <Button 
                    onClick={onTryAdvancedWriter}
                    size="sm" 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Open Advanced Writer
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Option 3: Native App */}
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-700 font-bold text-sm">3</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Native iOS App (Future)</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    For full iOS NFC writing, a native app using Core NFC framework would be ideal
                  </p>
                  <Badge className="bg-purple-100 text-purple-700">Coming Soon</Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Technical Details */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            Technical Details
          </h4>
          <div className="text-xs text-gray-600 space-y-1">
            <p>• iOS Safari lacks Web NFC API support (security restrictions)</p>
            <p>• Core NFC framework requires native iOS app development</p>
            <p>• NFC reading works but writing is severely limited in browsers</p>
            <p>• Android Chrome has full Web NFC API support since Android 6.0</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {onContinueAnyway && (
            <Button 
              onClick={onContinueAnyway}
              variant="outline"
              className="flex-1"
            >
              Continue Anyway
            </Button>
          )}
          {onTryAdvancedWriter && (
            <Button 
              onClick={onTryAdvancedWriter}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Try Advanced Writer
            </Button>
          )}
        </div>

      </CardContent>
    </Card>
  );
}