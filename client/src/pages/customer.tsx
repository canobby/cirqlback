import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import NFCTapInterface from "@/components/customer/nfc-tap-interface";
import { Gift, Users, MapPin, Share2 } from "lucide-react";

export default function Customer() {
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Customer Experience</h1>
        <p className="text-xl text-gray-600">Tap NFC tags to unlock rewards and build your tap trail</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Customer Info & NFC Interface */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customerName">Name</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Enter your email for rewards"
                />
              </div>
            </CardContent>
          </Card>

          <NFCTapInterface 
            customerEmail={customerEmail} 
            customerName={customerName}
          />
        </div>

        {/* Rewards & Features */}
        <div className="space-y-6">
          {/* Active Rewards */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Gift className="mr-2 h-5 w-5" />
                Your Rewards
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customerEmail ? (
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-800">Free Coffee</h4>
                    <p className="text-sm text-green-600">Joe's Coffee Shop - Expires Dec 31</p>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-800">10% Off Books</h4>
                    <p className="text-sm text-blue-600">Downtown Books - Valid until used</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  Enter your email to see your rewards
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tap Trail Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="mr-2 h-5 w-5" />
                Tap Trail Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-primary to-secondary rounded-xl text-white">
                  <h4 className="font-semibold mb-2">Downtown Discovery</h4>
                  <p className="text-sm opacity-90 mb-3">Visit 5 shops for $20 bonus</p>
                  <div className="w-full bg-white bg-opacity-20 rounded-full h-3 mb-2">
                    <div className="bg-white h-3 rounded-full" style={{ width: "40%" }}></div>
                  </div>
                  <p className="text-sm">2 of 5 shops visited</p>
                </div>

                <div className="p-4 bg-gradient-to-r from-secondary to-accent rounded-xl text-white">
                  <h4 className="font-semibold mb-2">Foodie Trail</h4>
                  <p className="text-sm opacity-90 mb-3">Try 3 restaurants for free dessert</p>
                  <div className="w-full bg-white bg-opacity-20 rounded-full h-3 mb-2">
                    <div className="bg-white h-3 rounded-full" style={{ width: "67%" }}></div>
                  </div>
                  <p className="text-sm">2 of 3 restaurants visited</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referral Program */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Refer Friends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Share Cirqlback with friends and earn rewards when they make their first tap!
              </p>
              <Button className="w-full" variant="outline">
                <Share2 className="mr-2 h-4 w-4" />
                Generate Referral Link
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
