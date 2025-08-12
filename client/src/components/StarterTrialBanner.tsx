import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Zap, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

interface StarterTrialBannerProps {
  userId?: string;
}

export function StarterTrialBanner({ userId }: StarterTrialBannerProps) {
  const [, setLocation] = useLocation();
  const [isVisible, setIsVisible] = useState(true);

  const { data: expirationData } = useQuery({
    queryKey: ["/api/account/check-expiration", userId],
    enabled: !!userId,
    refetchInterval: 60000, // Check every minute
  });

  // Type guard and early return
  if (!isVisible || !expirationData) {
    return null;
  }

  const isExpired = expirationData.isExpired || false;
  const daysRemaining = expirationData.daysRemaining || 0;
  const subscriptionStatus = expirationData.subscriptionStatus || 'active';
  
  // Don't show if not expired/expiring
  if (!isExpired && daysRemaining > 30) {
    return null;
  }

  const formatTimeRemaining = (daysRemaining: number) => {
    if (daysRemaining <= 0) return "Expired";
    if (daysRemaining === 1) return "1 day left";
    if (daysRemaining <= 7) return `${daysRemaining} days left`;
    if (daysRemaining <= 30) return `${daysRemaining} days left`;
    return `${Math.ceil(daysRemaining / 7)} weeks left`;
  };

  const getBannerVariant = (daysRemaining: number, isExpired: boolean) => {
    if (isExpired) return "destructive";
    if (daysRemaining <= 7) return "destructive";
    if (daysRemaining <= 30) return "default";
    return "default";
  };

  const getBannerMessage = (daysRemaining: number, isExpired: boolean) => {
    if (isExpired) {
      return {
        title: "Trial Period Expired",
        description: "Your 6-month Starter trial has ended. Upgrade to continue using all Cirqlback features."
      };
    }
    if (daysRemaining <= 7) {
      return {
        title: "Trial Ending Soon!",
        description: `Your Starter trial expires in ${formatTimeRemaining(daysRemaining)}. Choose your plan to continue without interruption.`
      };
    }
    return {
      title: "Trial Period Active",
      description: `${formatTimeRemaining(daysRemaining)} remaining in your Starter trial. Upgrade anytime to unlock more features.`
    };
  };

  const message = getBannerMessage(daysRemaining, isExpired);

  return (
    <Alert className={`mb-4 border-l-4 ${
      isExpired ? 'border-l-red-500 bg-red-50' : 
      daysRemaining <= 7 ? 'border-l-orange-500 bg-orange-50' :
      'border-l-blue-500 bg-blue-50'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            {isExpired ? (
              <Clock className="h-5 w-5 text-red-500" />
            ) : (
              <Calendar className="h-5 w-5 text-blue-500" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-semibold text-sm">{message.title}</h4>
              <Badge 
                variant={getBannerVariant(daysRemaining, isExpired)}
                className="text-xs"
              >
                {formatTimeRemaining(daysRemaining)}
              </Badge>
            </div>
            <AlertDescription className="text-sm">
              {message.description}
            </AlertDescription>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setLocation('/trial-discount')}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            size="sm"
          >
            <Zap className="h-4 w-4 mr-1" />
            Choose Your Tier (50% Off)
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </Button>
        </div>
      </div>

      {!isExpired && daysRemaining <= 30 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>See what you've accomplished in your trial:</span>
            <div className="flex space-x-4">
              <span>• Campaigns Created</span>
              <span>• Customer Taps</span>
              <span>• Business Analytics</span>
            </div>
          </div>
        </div>
      )}
    </Alert>
  );
}