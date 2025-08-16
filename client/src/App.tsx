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
// Core Pages - Streamlined for first deployment
import Account from "@/pages/account";
import TapPage from "@/pages/tap";
import HowItWorksPage from "@/pages/how-it-works";
import SettingsPage from "@/pages/settings";
import Checkout from "@/pages/checkout";
import TrialDiscount from "@/pages/trial-discount";
import CustomerProfile from "@/pages/customer-profile";
import NotFound from "@/pages/not-found";
import BusinessSettings from "@/pages/business-settings";
import CampaignBuilder from "@/pages/campaign-builder";
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
import Marketing from "@/pages/marketing";
import Communication from "@/pages/communication";
import Community from "@/pages/community";
import ProfileSetup from "@/pages/profile-setup";
import TestSystem from "@/pages/test-system";
import AdminDashboard from "@/pages/admin-dashboard";
import BusinessWebsitePreview from "@/pages/business-website-preview";

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
          {/* Core Bento Pages - Streamlined for first deployment */}
          <Route path="/" component={HomeBento} />
          <Route path="/customer" component={CustomerBento} />
          <Route path="/merchant" component={MerchantBento} />
          <Route path="/analytics" component={AnalyticsBento} />
          <Route path="/map" component={MapBento} />
          <Route path="/campaign-setup-wizard" component={CampaignSetupBento} />
          <Route path="/nfc-setup-wizard" component={NFCSetupWizardBento} />
          <Route path="/nfc-writer" component={NfcWriterPage} />
          
          {/* Essential Features */}
          <Route path="/account" component={Account} />
          <Route path="/tap" component={TapPage} />
          <Route path="/how-it-works" component={HowItWorksPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/checkout" component={Checkout} />
          <Route path="/trial-discount" component={TrialDiscount} />
          <Route path="/profile" component={CustomerProfile} />
          <Route path="/business-settings" component={BusinessSettings} />
          <Route path="/campaign-builder" component={CampaignBuilder} />
          <Route path="/marketing" component={Marketing} />
          <Route path="/communication" component={Communication} />
          <Route path="/community" component={Community} />
          <Route path="/profile-setup" component={ProfileSetup} />
          <Route path="/test-system" component={TestSystem} />
          <Route path="/admin-dashboard" component={AdminDashboard} />
          <Route path="/website-preview" component={BusinessWebsitePreview} />
          
          {/* Bento Route Aliases */}
          <Route path="/merchant-bento" component={MerchantBento} />
          <Route path="/customer-bento" component={CustomerBento} />
          <Route path="/analytics-bento" component={AnalyticsBento} />
          <Route path="/home-bento" component={HomeBento} />
          <Route path="/nfc-setup-wizard-bento" component={NFCSetupWizardBento} />
          <Route path="/map-bento" component={MapBento} />
          <Route path="/campaign-setup-bento" component={CampaignSetupBento} />
          
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
