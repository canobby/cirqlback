import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CreditCard, Shield, Check } from "lucide-react";
import { useLocation } from "wouter";

// Load Stripe - check multiple possible environment variable names
const getStripePublicKey = () => {
  if (typeof window === 'undefined') return null;
  // Never hardcode a key here — it comes only from the environment.
  return import.meta.env.VITE_STRIPE_PUBLIC_KEY || null;
};

const stripePromise = getStripePublicKey() ? loadStripe(getStripePublicKey()) : null;

const CheckoutForm = ({ amount, description }: { amount: number; description: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/merchant',
      },
    });

    setIsProcessing(false);

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "Thank you for your purchase!",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium">Total Amount</span>
          <span className="text-2xl font-bold">${amount.toFixed(2)}</span>
        </div>
        <p className="text-sm text-gray-600">{description}</p>
      </div>

      <PaymentElement />
      
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
      >
        {isProcessing ? (
          <>Processing...</>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pay ${amount.toFixed(2)}
          </>
        )}
      </Button>

      <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
        <Shield className="h-4 w-4" />
        <span>Secured by Stripe</span>
      </div>
    </form>
  );
};

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState("");
  const [, setLocation] = useLocation();
  
  // The plan to purchase comes from the URL (?plan=&interval=), defaulting to
  // Core monthly. The PRICE is decided server-side from the plan id —
  // the client never sends an amount.
  const params = new URLSearchParams(window.location.search);
  const checkoutData = {
    planId: params.get("plan") || "core",
    billingInterval: params.get("interval") === "yearly" ? "yearly" : "monthly",
    amount: 19.99, // cosmetic default; server response overrides via displayAmount
    description: "Subscription",
  };
  const [displayAmount, setDisplayAmount] = useState(checkoutData.amount);
  const [planName, setPlanName] = useState("Subscription");
  const [billingInterval, setBillingInterval] = useState(checkoutData.billingInterval);

  useEffect(() => {
    // Create a recurring subscription (anchored to the 10th) and use the first
    // invoice's client secret to confirm the (prorated) first payment.
    const createSubscription = async () => {
      try {
        const response = await fetch("/api/subscription/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            planId: checkoutData.planId,
            billingInterval: checkoutData.billingInterval,
          }),
        });
        const data = await response.json();
        setClientSecret(data.clientSecret);
        if (typeof data.firstChargeAmount === "number") setDisplayAmount(data.firstChargeAmount);
        if (data.planName) setPlanName(data.planName);
        if (data.billingInterval) setBillingInterval(data.billingInterval);
      } catch (error) {
        console.error("Error creating subscription:", error);
      }
    };

    if (getStripePublicKey()) {
      createSubscription();
    }
  }, []);

  // Show message if Stripe keys are not configured
  if (!getStripePublicKey()) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Payment System Setup Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-yellow-800 mb-2">
                    Stripe Integration Needed
                  </h3>
                  <p className="text-yellow-700 mb-4">
                    To enable payment processing, please configure your Stripe API keys in the project settings.
                  </p>
                  <div className="space-y-2 text-sm text-yellow-600">
                    <p>Required keys:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>VITE_STRIPE_PUBLIC_KEY (Publishable key)</li>
                      <li>STRIPE_SECRET_KEY (Secret key)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => window.history.back()}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium">{planName} plan</h4>
                    <p className="text-sm text-gray-600">Billed {billingInterval} on the 10th</p>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Due today {billingInterval === "monthly" ? "(prorated to the 10th)" : ""}</span>
                    <span className="font-semibold">${displayAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Then {billingInterval}, on the 10th</span>
                    <span>auto-renews</span>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">How billing works:</span>
                  </div>
                  <ul className="text-sm text-purple-700 mt-2 space-y-1">
                    <li>• Your first charge is prorated to the next 10th</li>
                    <li>• After that you're billed {billingInterval} on the 10th</li>
                    <li>• Cancel anytime; if payment fails your dashboard locks at month-end</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent>
              {stripePromise ? (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm amount={displayAmount} description={planName} />
                </Elements>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Payment system not configured</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}