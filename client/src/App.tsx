import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense, useEffect } from "react";
import Navbar from "@/components/layout/navbar";
import ImpersonationBanner from "@/components/layout/impersonation-banner";
import Footer from "@/components/layout/footer";

// import NotificationCenter from "@/components/global/notification-center";
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
import MerchantBento from "@/pages/merchant-bento";
import CampaignSetupBento from "@/pages/campaign-setup-bento";
import CustomerBento from "@/pages/customer-bento";
import AnalyticsBento from "@/pages/analytics-bento";
import HomeBento from "@/pages/home-bento";
import NFCSetupWizardBento from "@/pages/nfc-setup-wizard-bento";
import MapWorking from "@/pages/map-working";
import Marketing from "@/pages/marketing";
import Communication from "@/pages/communication";
import Community from "@/pages/community";
import ProfileSetup from "@/pages/profile-setup";
import TestSystem from "@/pages/test-system";
import AdminDashboard from "@/pages/admin-dashboard";
import CoordinatorDashboard from "@/pages/coordinator-dashboard";
import NonprofitDashboard from "@/pages/nonprofit-dashboard";
import RewardPage from "@/pages/reward";
import BusinessWebsitePreview from "@/pages/business-website-preview";
import LegalDocPage from "@/pages/legal-doc-page";
import AboutPage from "@/pages/about";
import AuthPage from "@/pages/auth";
import UserGuide from "@/pages/user-guide";
import PlatformOverview from "@/pages/platform-overview";

// CirqlArcade — each game is code-split so customers who never play don't download
// the engines. Bounce (=CirqlBreak) is /play; the arcade picker + other games below.
const PlayPage = lazy(() => import("@/pages/play"));
const ArcadePage = lazy(() => import("@/pages/arcade"));
const DefenderPage = lazy(() => import("@/pages/defender"));
const PopPage = lazy(() => import("@/pages/pop"));
const SpinPage = lazy(() => import("@/pages/spin"));
const SnakePage = lazy(() => import("@/pages/snake"));
const BloomPage = lazy(() => import("@/pages/bloom"));
const ReactorPage = lazy(() => import("@/pages/reactor"));
const ChainPage = lazy(() => import("@/pages/chain"));
const ShiftPage = lazy(() => import("@/pages/shift"));
const DashPage = lazy(() => import("@/pages/dash"));
const RunnerPage = lazy(() => import("@/pages/runner"));
const InvadersPage = lazy(() => import("@/pages/invaders"));
const TunnelPage = lazy(() => import("@/pages/tunnel"));
const MazePage = lazy(() => import("@/pages/maze"));
const LinkPage = lazy(() => import("@/pages/link"));
const OrbitPage = lazy(() => import("@/pages/orbit"));
const PinballPage = lazy(() => import("@/pages/pinball"));
const RacePage = lazy(() => import("@/pages/race"));
const MinerPage = lazy(() => import("@/pages/miner"));
const ClaimPage = lazy(() => import("@/pages/claim"));
const BeatPage = lazy(() => import("@/pages/beat"));
const PongPage = lazy(() => import("@/pages/pong"));
const WhackPage = lazy(() => import("@/pages/whack"));
const ReflexPage = lazy(() => import("@/pages/reflex"));
const PairsPage = lazy(() => import("@/pages/pairs"));
const FlipPage = lazy(() => import("@/pages/flip"));
const StackPage = lazy(() => import("@/pages/stack"));
const GemsPage = lazy(() => import("@/pages/gems"));
const SweepPage = lazy(() => import("@/pages/sweep"));
const SortPage = lazy(() => import("@/pages/sort"));
const MergePage = lazy(() => import("@/pages/merge"));
const DropPage = lazy(() => import("@/pages/drop"));
const AscentPage = lazy(() => import("@/pages/ascent"));
const BalancePage = lazy(() => import("@/pages/balance"));
const BreathePage = lazy(() => import("@/pages/breathe"));

function Router() {
  const [location] = useLocation();

  // Scroll to top when location changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ImpersonationBanner />
      <Navbar />
      <main className="flex-1">
        <Switch>
          {/* Core Bento Pages - Streamlined for first deployment */}
          <Route path="/" component={HomeBento} />
          <Route path="/customer" component={CustomerBento} />
          <Route path="/arcade">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><ArcadePage /></Suspense>}</Route>
          <Route path="/play/defender">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><DefenderPage /></Suspense>}</Route>
          <Route path="/play/pop">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><PopPage /></Suspense>}</Route>
          <Route path="/play/spin">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><SpinPage /></Suspense>}</Route>
          <Route path="/play/snake">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><SnakePage /></Suspense>}</Route>
          <Route path="/play/bloom">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><BloomPage /></Suspense>}</Route>
          <Route path="/play/reactor">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><ReactorPage /></Suspense>}</Route>
          <Route path="/play/chain">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><ChainPage /></Suspense>}</Route>
          <Route path="/play/shift">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><ShiftPage /></Suspense>}</Route>
          <Route path="/play/dash">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><DashPage /></Suspense>}</Route>
          <Route path="/play/runner">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><RunnerPage /></Suspense>}</Route>
          <Route path="/play/invaders">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><InvadersPage /></Suspense>}</Route>
          <Route path="/play/tunnel">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><TunnelPage /></Suspense>}</Route>
          <Route path="/play/maze">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><MazePage /></Suspense>}</Route>
          <Route path="/play/link">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><LinkPage /></Suspense>}</Route>
          <Route path="/play/orbit">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><OrbitPage /></Suspense>}</Route>
          <Route path="/play/pinball">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><PinballPage /></Suspense>}</Route>
          <Route path="/play/race">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><RacePage /></Suspense>}</Route>
          <Route path="/play/miner">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><MinerPage /></Suspense>}</Route>
          <Route path="/play/claim">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><ClaimPage /></Suspense>}</Route>
          <Route path="/play/beat">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><BeatPage /></Suspense>}</Route>
          <Route path="/play/pong">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><PongPage /></Suspense>}</Route>
          <Route path="/play/whack">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><WhackPage /></Suspense>}</Route>
          <Route path="/play/reflex">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><ReflexPage /></Suspense>}</Route>
          <Route path="/play/pairs">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><PairsPage /></Suspense>}</Route>
          <Route path="/play/flip">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><FlipPage /></Suspense>}</Route>
          <Route path="/play/stack">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><StackPage /></Suspense>}</Route>
          <Route path="/play/gems">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><GemsPage /></Suspense>}</Route>
          <Route path="/play/sweep">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><SweepPage /></Suspense>}</Route>
          <Route path="/play/sort">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><SortPage /></Suspense>}</Route>
          <Route path="/play/merge">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><MergePage /></Suspense>}</Route>
          <Route path="/play/drop">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><DropPage /></Suspense>}</Route>
          <Route path="/play/ascent">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><AscentPage /></Suspense>}</Route>
          <Route path="/play/balance">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><BalancePage /></Suspense>}</Route>
          <Route path="/play/breathe">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><BreathePage /></Suspense>}</Route>
          <Route path="/play">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><PlayPage /></Suspense>}</Route>
          <Route path="/merchant" component={MerchantBento} />
          <Route path="/analytics" component={AnalyticsBento} />
          <Route path="/map" component={MapWorking} />
          <Route path="/nonprofit" component={NonprofitDashboard} />
          <Route path="/campaign-setup-wizard" component={CampaignSetupBento} />
          <Route path="/nfc-setup-wizard" component={NFCSetupWizardBento} />
          <Route path="/nfc-writer" component={NfcWriterPage} />
          
          {/* Auth */}
          <Route path="/auth" component={AuthPage} />
          <Route path="/login" component={AuthPage} />
          <Route path="/register" component={AuthPage} />

          {/* Essential Features */}
          <Route path="/account" component={Account} />
          <Route path="/tap" component={TapPage} />
          {/* A physical Cirql tag stores /tap/<tagId>; both iOS and Android open
              this URL directly, so the id must reach the page as a route param. */}
          <Route path="/tap/:tagId" component={TapPage} />
          <Route path="/reward" component={RewardPage} />
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
          <Route path="/coordinator" component={CoordinatorDashboard} />
          <Route path="/website-preview" component={BusinessWebsitePreview} />
          
          {/* Bento Route Aliases */}
          <Route path="/merchant-bento" component={MerchantBento} />
          <Route path="/customer-bento" component={CustomerBento} />
          <Route path="/analytics-bento" component={AnalyticsBento} />
          <Route path="/home-bento" component={HomeBento} />
          <Route path="/nfc-setup-wizard-bento" component={NFCSetupWizardBento} />
          <Route path="/map-bento" component={MapWorking} />
          <Route path="/campaign-setup-bento" component={CampaignSetupBento} />
          
          {/* Footer Pages */}
          <Route path="/about" component={AboutPage} />
          <Route path="/user-guide" component={UserGuide} />
          <Route path="/platform-overview" component={PlatformOverview} />
          <Route path="/contact" component={ContactPage} />
          <Route path="/help-center" component={HelpCenterPage} />
          <Route path="/privacy-policy" component={PrivacyPolicyPage} />
          <Route path="/terms-of-service" component={TermsOfServicePage} />
          <Route path="/legal/:slug" component={LegalDocPage} />
          
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
