import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Zap, Clock, Star, ArrowRight, Gift, X } from "lucide-react";

export default function TrialDiscount() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const { data: profile } = useQuery<any>({
    queryKey: ["/api/account/profile"],
  });

  const { data: expirationData } = useQuery<any>({
    queryKey: ["/api/account/check-expiration", { userId: profile?.id }],
    enabled: !!profile?.id,
  });

  const selectTrialDiscountMutation = useMutation({
    mutationFn: (tier: string) => apiRequest("POST", "/api/subscription/trial-discount", {
      userId: profile?.id,
      selectedTier: tier
    }),
    onSuccess: () => {
      toast({
        title: "Trial Discount Activated!",
        description: "Your 50% discount is now active for the remainder of your trial period.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/account/profile"] });
      setLocation("/account");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to activate trial discount. Please try again.",
        variant: "destructive",
      });
    },
  });

  const plans = [
    {
      id: "core",
      name: "Core",
      originalPrice: 19.99,
      discountedPrice: 9.99,
      description: "Everything a local business needs to run loyalty",
      features: [
        "1 business location",
        "Unlimited campaigns",
        "500 customer taps/month",
        "Tap & redemption analytics",
        "20 Cirql tags included",
        "Solo & multi-store group campaigns",
        "Email support"
      ],
      highlight: false
    },
    {
      id: "pro",
      name: "Pro",
      originalPrice: 49.99,
      discountedPrice: 24.99,
      description: "For busy, multi-location businesses that want more",
      features: [
        "Everything in Core",
        "Up to 3 business locations",
        "Unlimited customer taps",
        "50 Cirql tags included",
        "Priority support",
        "Early access to new features",
        "Add-ons: analytics, branding, map priority, contests"
      ],
      highlight: true
    }
  ];

  const formatTimeRemaining = (daysRemaining: number) => {
    if (daysRemaining <= 0) return "0 days";
    if (daysRemaining === 1) return "1 day";
    if (daysRemaining <= 7) return `${daysRemaining} days`;
    return `${Math.ceil(daysRemaining / 7)} weeks`;
  };

  const daysRemaining = expirationData?.daysRemaining || 0;
  const discountSavings = selectedTier ? (plans.find((p: any) => p.id === selectedTier)?.originalPrice ?? 0) * 0.5 * (daysRemaining / 30) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Gift className="h-8 w-8 text-purple-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Special Trial Offer
            </h1>
          </div>
          <p className="text-xl text-gray-600 mb-4">
            Choose your perfect plan and save 50% for the remaining {formatTimeRemaining(daysRemaining)} of your trial
          </p>
          <div className="inline-flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-full">
            <Clock className="h-4 w-4" />
            <span className="font-medium">Limited Time: {formatTimeRemaining(daysRemaining)} remaining</span>
          </div>
        </div>

        {/* Discount Explanation */}
        <Card className="mb-8 bg-gradient-to-r from-purple-100 to-pink-100 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                  <Zap className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-purple-900 mb-2">How Your Trial Discount Works</h3>
                <ul className="text-purple-800 space-y-1 text-sm">
                  <li>• Select any paid tier and get 50% off for your remaining trial period</li>
                  <li>• After your trial ends, continue at the regular price or cancel anytime</li>
                  <li>• Keep all the premium features and data you've built during the discount period</li>
                  <li>• Upgrade or downgrade at any time with prorated billing</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Plans */}
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={`relative transition-all duration-200 cursor-pointer ${
                selectedTier === plan.id 
                  ? 'ring-2 ring-purple-500 shadow-lg scale-105' 
                  : 'hover:shadow-lg hover:scale-102'
              } ${
                plan.highlight 
                  ? 'border-purple-500 bg-gradient-to-br from-white to-purple-50' 
                  : ''
              }`}
              onClick={() => setSelectedTier(plan.id)}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1">
                    <Star className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </CardTitle>
                <p className="text-gray-600 mb-4">{plan.description}</p>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-3xl font-bold text-red-500 line-through">
                      ${plan.originalPrice}
                    </span>
                    <span className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      ${plan.discountedPrice}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    per month during trial period
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Save 50% • ${(plan.originalPrice * 0.5).toFixed(2)}/month off
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Selection Summary & Action */}
        {selectedTier && (
          <Card className="bg-white border-2 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Selected: {plans.find(p => p.id === selectedTier)?.name} Plan
                  </h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Trial discount: ${plans.find(p => p.id === selectedTier)?.discountedPrice}/month</p>
                    <p>Total savings during trial: ${discountSavings.toFixed(2)}</p>
                    <p>Regular price after trial: ${plans.find(p => p.id === selectedTier)?.originalPrice}/month</p>
                  </div>
                </div>
                <Button
                  onClick={() => selectTrialDiscountMutation.mutate(selectedTier)}
                  disabled={selectTrialDiscountMutation.isPending}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3"
                  size="lg"
                >
                  {selectTrialDiscountMutation.isPending ? (
                    "Activating..."
                  ) : (
                    <>
                      Activate 50% Discount
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer Notice */}
        <div className="text-center mt-8 text-sm text-gray-600">
          <p>No commitment required • Cancel anytime • Keep your data</p>
          <p className="mt-2">
            Questions? <button onClick={() => setLocation('/contact')} className="text-purple-600 hover:underline">Contact our support team</button>
          </p>
        </div>

      </div>
    </div>
  );
}