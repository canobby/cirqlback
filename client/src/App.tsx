import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

import NotificationCenter from "@/components/global/notification-center";
import Home from "@/pages/home";
import Customer from "@/pages/customer";
import Merchant from "@/pages/merchant";
import ViralCommunityHub from "@/pages/community";
import PredictiveAnalyticsDashboard from "@/pages/analytics";
import Account from "@/pages/account";
import TapPage from "@/pages/tap";
import HowItWorksPage from "@/pages/how-it-works";

import InteractiveDiscoveryMap from "@/pages/map";
import ViralMarketingSuite from "@/pages/marketing";
import SettingsPage from "@/pages/settings";
import Checkout from "@/pages/checkout";
import AvatarCreator from "@/pages/avatar-creator";
import CustomerProfile from "@/pages/customer-profile";

import BusinessWebsitePreview from "@/pages/business-website-preview";
import UserGuide from "@/pages/user-guide";
import InteractiveWalkthrough from "@/pages/interactive-walkthrough";
import NotFound from "@/pages/not-found";
import PlatformOverview from "@/pages/platform-overview";
import AIInsights from "@/pages/ai-insights";
import Partnerships from "@/pages/partnerships";
import TeamChallenges from "@/pages/team-challenges";
import ArTreasureHunts from "@/pages/ar-treasure-hunts";
import ViralCampaigns from "@/pages/viral-campaigns";
import ARGameHub from "@/pages/ar-game-hub";
import ARExperience from "@/pages/ar-experience";
import BusinessSettings from "@/pages/business-settings";

function Router() {
  const [location] = useLocation();

  // Scroll to top when location changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/customer" component={Customer} />
          <Route path="/merchant" component={Merchant} />
          <Route path="/community" component={ViralCommunityHub} />
          <Route path="/analytics" component={PredictiveAnalyticsDashboard} />
          <Route path="/account" component={Account} />
          <Route path="/tap" component={TapPage} />
          <Route path="/how-it-works" component={HowItWorksPage} />
          <Route path="/map" component={InteractiveDiscoveryMap} />
          <Route path="/marketing" component={ViralMarketingSuite} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/checkout" component={Checkout} />
          <Route path="/avatar" component={AvatarCreator} />
          <Route path="/profile" component={CustomerProfile} />
          <Route path="/website-preview" component={BusinessWebsitePreview} />
          <Route path="/platform" component={PlatformOverview} />
          <Route path="/user-guide" component={UserGuide} />
          <Route path="/walkthrough" component={InteractiveWalkthrough} />
          <Route path="/ai-insights" component={AIInsights} />
          <Route path="/partnerships" component={Partnerships} />
          <Route path="/team-challenges" component={TeamChallenges} />
          <Route path="/ar-treasure-hunts" component={ArTreasureHunts} />
          <Route path="/viral-campaigns" component={ViralCampaigns} />
          <Route path="/ar-game-hub" component={ARGameHub} />
          <Route path="/ar-experience/:id" component={ARExperience} />
          <Route path="/ar/:tapId" component={ARExperience} />
          <Route path="/business-settings" component={BusinessSettings} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />

    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
