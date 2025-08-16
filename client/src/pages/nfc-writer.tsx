import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import UniversalNFCWriter from "@/components/nfc/ios-nfc-writer";
import { ArrowLeft, Zap } from "lucide-react";

export default function NFCWriter() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/50 to-purple-50/50 dark:from-gray-950 dark:via-blue-950/50 dark:to-purple-950/50">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              onClick={() => setLocation('/merchant-bento')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Merchant
            </Button>
            <div></div>
          </div>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 bg-clip-text text-transparent mb-2">
            NFC Tag Writer
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
            Program your NFC tags with ease - works on both iOS and Android
          </p>
        </div>

        {/* Unified NFC Writer */}
        <div className="flex justify-center">
          <UniversalNFCWriter 
            tagData={{
              url: "https://cirqlback.com/tap/demo123",
              campaignId: "campaign_001", 
              businessName: "Demo Business",
              campaignType: "Summer Special - 20% off all drinks"
            }}
            onWriteComplete={(success) => {
              if (success) {
                setLocation('/merchant-bento');
              }
            }}
          />
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <Card className="bg-white/80 backdrop-blur-sm border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Zap className="h-5 w-5" />
                Universal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Works seamlessly on both iOS and Android devices with intelligent compatibility detection.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-2 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <Zap className="h-5 w-5" />
                Simple
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Just hold your phone near the NFC tag and tap the button. No complex setup required.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700">
                <Zap className="h-5 w-5" />
                Reliable
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Smart device detection ensures the best NFC writing experience for your specific device.
              </p>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}