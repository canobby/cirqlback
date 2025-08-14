import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

// import NotificationCenter from "@/components/global/notification-center";
import Home from "@/pages/home";
import Customer from "@/pages/customer";
import Merchant from "@/pages/merchant";
import ViralCommunityHub from "@/pages/community";
import CirqlQuest from "@/pages/cirql-quest";
import PredictiveAnalyticsDashboard from "@/pages/analytics";
import Account from "@/pages/account";
import TapPage from "@/pages/tap";
import HowItWorksPage from "@/pages/how-it-works";

import InteractiveDiscoveryMap from "@/pages/map";
import ViralMarketingSuite from "@/pages/marketing";
import SettingsPage from "@/pages/settings";
import Checkout from "@/pages/checkout";
import TrialDiscount from "@/pages/trial-discount";
import AvatarCreator from "@/pages/avatar-creator";
import CustomerProfile from "@/pages/customer-profile";

import BusinessWebsitePreview from "@/pages/business-website-preview";
import UserGuide from "@/pages/user-guide";
import InteractiveWalkthrough from "@/pages/interactive-walkthrough";
import NotFound from "@/pages/not-found";
import PlatformOverview from "@/pages/platform-overview";
import AIInsights from "@/pages/ai-insights";
import Partnerships from "@/pages/partnerships";
import MultiMerchantPools from "@/pages/multi-merchant-pools";
import TeamChallenges from "@/pages/team-challenges";
import ArTreasureHunts from "@/pages/ar-treasure-hunts";
import ViralCampaigns from "@/pages/viral-campaigns";
import ARGameHub from "@/pages/ar-game-hub";
import ARExperience from "@/pages/ar-experience";
import BusinessSettings from "@/pages/business-settings";
import CampaignBuilder from "@/pages/campaign-builder";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminInvitations from "@/pages/admin-invitations";
import AdminTrainingCenter from "@/pages/admin-training-center";
import TestSystem from "@/pages/test-system";
import CommunicationPage from "@/pages/communication";
import ProfileSetup from "@/pages/profile-setup";
import ExportHub from "@/pages/export-hub";
import BusinessIntelligenceSuite from "@/pages/business-intelligence-suite";
import ContactPage from "@/pages/contact";
import HelpCenterPage from "@/pages/help-center";
import PrivacyPolicyPage from "@/pages/privacy-policy";
import TermsOfServicePage from "@/pages/terms-of-service";
import NfcWriterPage from "@/pages/nfc-writer";
import CampaignSetupWizard from "@/pages/campaign-setup-wizard";
import NFCSetupWizard from "@/pages/nfc-setup-wizard";
import MerchantBento from "@/pages/merchant-bento";
import CampaignSetupBento from "@/pages/campaign-setup-bento";
import CustomerBento from "@/pages/customer-bento";
import AnalyticsBento from "@/pages/analytics-bento";
import HomeBento from "@/pages/home-bento";
import NFCSetupWizardBento from "@/pages/nfc-setup-wizard-bento";
import MapBento from "@/pages/map-bento";

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
          <Route path="/" component={HomeBento} />
          <Route path="/home-classic" component={Home} />
          <Route path="/customer" component={CustomerBento} />
          <Route path="/customer-classic" component={Customer} />
          <Route path="/merchant" component={MerchantBento} />
          <Route path="/merchant-classic" component={Merchant} />
          <Route path="/community" component={ViralCommunityHub} />
          <Route path="/cirql-quest" component={CirqlQuest} />
          <Route path="/ar-game-hub" component={ARGameHub} />
          <Route path="/analytics" component={AnalyticsBento} />
          <Route path="/analytics-classic" component={PredictiveAnalyticsDashboard} />
          <Route path="/account" component={Account} />
          <Route path="/tap" component={TapPage} />
          <Route path="/how-it-works" component={HowItWorksPage} />
          <Route path="/map" component={MapBento} />
          <Route path="/map-classic" component={InteractiveDiscoveryMap} />
          <Route path="/marketing" component={ViralMarketingSuite} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/checkout" component={Checkout} />
          <Route path="/trial-discount" component={TrialDiscount} />
          <Route path="/avatar" component={AvatarCreator} />
          <Route path="/profile" component={CustomerProfile} />
          <Route path="/website-preview" component={BusinessWebsitePreview} />
          <Route path="/platform" component={PlatformOverview} />
          <Route path="/user-guide" component={UserGuide} />
          <Route path="/walkthrough" component={InteractiveWalkthrough} />
          <Route path="/ai-insights" component={AIInsights} />
          <Route path="/partnerships" component={Partnerships} />
          <Route path="/multi-merchant-pools" component={MultiMerchantPools} />
          <Route path="/team-challenges" component={TeamChallenges} />
          <Route path="/ar-treasure-hunts" component={ArTreasureHunts} />
          <Route path="/viral-campaigns" component={ViralCampaigns} />
          <Route path="/ar-game-hub" component={ARGameHub} />
          <Route path="/ar-hub" component={ARGameHub} />
          <Route path="/ar-experience/:id" component={ARExperience} />
          <Route path="/ar/:tapId" component={ARExperience} />
          <Route path="/business-settings" component={BusinessSettings} />
          <Route path="/campaign-builder" component={CampaignBuilder} />
          <Route path="/admin-dashboard" component={AdminDashboard} />
          <Route path="/admin-invitations" component={AdminInvitations} />
          <Route path="/admin-training-center" component={AdminTrainingCenter} />
          <Route path="/test-system" component={TestSystem} />
          <Route path="/communication" component={CommunicationPage} />
          <Route path="/profile-setup" component={ProfileSetup} />
        <Route path="/export-hub" component={ExportHub} />
        <Route path="/business-intelligence" component={BusinessIntelligenceSuite} />
        <Route path="/nfc-writer" component={NfcWriterPage} />
        <Route path="/campaign-setup-wizard" component={CampaignSetupBento} />
        <Route path="/campaign-setup-classic" component={CampaignSetupWizard} />
        <Route path="/campaign-setup-bento" component={CampaignSetupBento} />
        <Route path="/merchant-bento" component={MerchantBento} />
        <Route path="/customer-bento" component={CustomerBento} />
        <Route path="/analytics-bento" component={AnalyticsBento} />
        <Route path="/home-bento" component={HomeBento} />
        <Route path="/nfc-setup-wizard" component={NFCSetupWizardBento} />
        <Route path="/nfc-setup-classic" component={NFCSetupWizard} />
        <Route path="/nfc-setup-wizard-bento" component={NFCSetupWizardBento} />
        <Route path="/map-bento" component={MapBento} />
          
          {/* Footer Pages */}
          <Route path="/contact" component={ContactPage} />
          <Route path="/help-center" component={HelpCenterPage} />
          <Route path="/privacy-policy" component={PrivacyPolicyPage} />
          <Route path="/terms-of-service" component={TermsOfServicePage} />
          
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
