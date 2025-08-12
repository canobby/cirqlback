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
          <Card className="card-hover glow-effect">
            <CardHeader>
              <CardTitle className="flex items-center gradient-text">
                <Gift className="mr-2 h-5 w-5" />
                Your Rewards
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customerEmail ? (
                <div className="space-y-3">
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg floating-animation">
                    <h4 className="font-medium text-green-800">🎉 Free Coffee</h4>
                    <p className="text-sm text-green-600">Joe's Coffee Shop - Expires Dec 31</p>
                    <div className="mt-2 text-xs text-green-500 font-medium">Value: $4.50</div>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg floating-animation" style={{ animationDelay: '0.5s' }}>
                    <h4 className="font-medium text-blue-800">📚 10% Off Books</h4>
                    <p className="text-sm text-blue-600">Downtown Books - Valid until used</p>
                    <div className="mt-2 text-xs text-blue-500 font-medium">Up to $15 savings</div>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg floating-animation" style={{ animationDelay: '1s' }}>
                    <h4 className="font-medium text-purple-800">🍕 $5 Off Dinner</h4>
                    <p className="text-sm text-purple-600">Luigi's Pizza - Earned from referral</p>
                    <div className="mt-2 text-xs text-purple-500 font-medium">Referral bonus!</div>
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
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gradient-text">
                <MapPin className="mr-2 h-5 w-5" />
                Tap Trail Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-primary to-secondary rounded-xl text-white glow-effect">
                  <h4 className="font-semibold mb-2">🏪 Downtown Discovery</h4>
                  <p className="text-sm opacity-90 mb-3">Visit 5 shops for $20 bonus</p>
                  <div className="w-full bg-white bg-opacity-20 rounded-full h-3 mb-2">
                    <div className="bg-white h-3 rounded-full transition-all duration-500 ease-out" style={{ width: "40%" }}></div>
                  </div>
                  <p className="text-sm">2 of 5 shops visited • $8 earned so far</p>
                </div>

                <div className="p-4 bg-gradient-to-r from-secondary to-accent rounded-xl text-white glow-effect">
                  <h4 className="font-semibold mb-2">🍽️ Foodie Trail</h4>
                  <p className="text-sm opacity-90 mb-3">Try 3 restaurants for free dessert</p>
                  <div className="w-full bg-white bg-opacity-20 rounded-full h-3 mb-2">
                    <div className="bg-white h-3 rounded-full transition-all duration-500 ease-out" style={{ width: "67%" }}></div>
                  </div>
                  <p className="text-sm">2 of 3 restaurants visited • Almost there!</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Referral Program */}
          <Card className="card-hover glow-effect">
            <CardHeader>
              <CardTitle className="flex items-center gradient-text">
                <Users className="mr-2 h-5 w-5" />
                Premium Referral Program
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">💰 Earn Big Rewards</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• $5 when friend makes first tap</li>
                    <li>• $10 bonus after their 5th tap</li>
                    <li>• 5% of their rewards forever!</li>
                  </ul>
                </div>
                
                {customerEmail && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Your unique referral code:</p>
                    <div className="flex items-center space-x-2">
                      <code className="px-3 py-1 bg-white border rounded text-primary font-mono">CHRIS2024</code>
                      <Button size="sm" variant="outline">Copy</Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="font-bold text-green-600">3</div>
                    <div className="text-xs text-green-600">Friends Joined</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="font-bold text-blue-600">$25</div>
                    <div className="text-xs text-blue-600">Earned</div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="font-bold text-purple-600">Gold</div>
                    <div className="text-xs text-purple-600">Status</div>
                  </div>
                </div>

                <Button className="w-full gradient-bg border-0 text-white font-semibold">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share & Earn $5 per Friend
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
