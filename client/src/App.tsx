import { Switch, Route, Redirect, useLocation } from "wouter";
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
const RetroDemoPage = lazy(() => import("@/pages/retro-demo"));
const AvatarPage = lazy(() => import("@/pages/avatar"));
const AchievementsPage = lazy(() => import("@/pages/achievements"));
const LeaderboardPage = lazy(() => import("@/pages/leaderboard"));
const CirqlCityPage = lazy(() => import("@/pages/cirql-city"));
const BobaBubblePage = lazy(() => import("@/pages/boba-bubble"));
const PillPopPage = lazy(() => import("@/pages/pill-pop"));
const SwatchPage = lazy(() => import("@/pages/swatch"));
const DeliDashPage = lazy(() => import("@/pages/deli-dash"));
const StackEmPage = lazy(() => import("@/pages/stack-em"));
const FrostBitePage = lazy(() => import("@/pages/frost-bite"));
const LastCallPage = lazy(() => import("@/pages/last-call"));
const SnipPage = lazy(() => import("@/pages/snip"));
const CobblerPage = lazy(() => import("@/pages/cobbler"));
const StaticPage = lazy(() => import("@/pages/static"));
const PedalPusherPage = lazy(() => import("@/pages/pedal-pusher"));
const GreaseMonkeyPage = lazy(() => import("@/pages/grease-monkey"));
const SudsyPage = lazy(() => import("@/pages/sudsy"));
const GumballPage = lazy(() => import("@/pages/gumball"));
const NightShiftPage = lazy(() => import("@/pages/night-shift"));
const FlutterPage = lazy(() => import("@/pages/flutter"));
const SugarSwapPage = lazy(() => import("@/pages/sugar-swap"));
const PiggyBankPage = lazy(() => import("@/pages/piggy-bank"));
const ChopShopPage = lazy(() => import("@/pages/chop-shop"));
const DeliveryDashPage = lazy(() => import("@/pages/delivery-dash"));
const SparklePage = lazy(() => import("@/pages/sparkle"));
const SpellboundPage = lazy(() => import("@/pages/spellbound"));
const SortItPage = lazy(() => import("@/pages/sort-it"));
const SmoothiePage = lazy(() => import("@/pages/smoothie"));
const FowlPlayPage = lazy(() => import("@/pages/fowl-play"));
const WireUpPage = lazy(() => import("@/pages/wire-up"));
const HueHopPage = lazy(() => import("@/pages/hue-hop"));
const GardenGuardPage = lazy(() => import("@/pages/garden-guard"));
const LoopLinePage = lazy(() => import("@/pages/loop-line"));
const TownPage = lazy(() => import("@/pages/town"));
const CirqlPage = lazy(() => import("@/pages/cirql"));
const MusicTestPage = lazy(() => import("@/pages/music-test"));
const TileLabPage = lazy(() => import("@/pages/tile-lab"));
const TileArrangerPage = lazy(() => import("@/pages/tile-arranger"));
const ChangePasswordPage = lazy(() => import("@/pages/change-password"));
const HarvestMoonlightPage = lazy(() => import("@/pages/harvest-moonlight"));
const GreenThumbPage = lazy(() => import("@/pages/green-thumb"));
const BloomBoomPage = lazy(() => import("@/pages/bloom-boom"));
const BarkParkPage = lazy(() => import("@/pages/bark-park"));
const SproutPage = lazy(() => import("@/pages/sprout"));
const BrickMortarPage = lazy(() => import("@/pages/brick-mortar"));
const MixtapePage = lazy(() => import("@/pages/mixtape"));
const ClawPage = lazy(() => import("@/pages/claw"));
const PlinkPage = lazy(() => import("@/pages/plink"));
const PinPalsPage = lazy(() => import("@/pages/pin-pals"));
const PunchListPage = lazy(() => import("@/pages/punch-list"));
const CoinDemoPage = lazy(() => import("@/pages/coin-demo"));
const LobbyPage = lazy(() => import("@/pages/lobby"));
const CuppaRushPage = lazy(() => import("@/pages/cuppa-rush"));
const SliceRoutePage = lazy(() => import("@/pages/slice-route"));
const SpinCyclePage = lazy(() => import("@/pages/spin-cycle"));
const RummagePage = lazy(() => import("@/pages/rummage"));
const DozenPage = lazy(() => import("@/pages/dozen"));
const FreshBatchPage = lazy(() => import("@/pages/fresh-batch"));
const SundaeStackPage = lazy(() => import("@/pages/sundae-stack"));
const SpinCityPage = lazy(() => import("@/pages/spin-city"));
const TacoStackPage = lazy(() => import("@/pages/taco-stack"));
const FixItPage = lazy(() => import("@/pages/fix-it"));
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
const LanderPage = lazy(() => import("@/pages/lander"));
const SlicePage = lazy(() => import("@/pages/slice"));
const OsmosPage = lazy(() => import("@/pages/osmos"));
const CrawlerPage = lazy(() => import("@/pages/crawler"));
const SpiroPage = lazy(() => import("@/pages/spiro"));
const TidePage = lazy(() => import("@/pages/tide"));
const DodgePage = lazy(() => import("@/pages/dodge"));
const GunnerPage = lazy(() => import("@/pages/gunner"));
const CirqlTapPage = lazy(() => import("@/pages/cirqltap"));
const SurvivorPage = lazy(() => import("@/pages/survivor"));
const SumoPage = lazy(() => import("@/pages/sumo"));
const CommandPage = lazy(() => import("@/pages/command"));
const CoilPage = lazy(() => import("@/pages/coil"));
const KeepPage = lazy(() => import("@/pages/keep"));
const WeavePage = lazy(() => import("@/pages/weave"));
const PongOnlinePage = lazy(() => import("@/pages/pong-online"));
const SumoOnlinePage = lazy(() => import("@/pages/sumo-online"));
const ReflexOnlinePage = lazy(() => import("@/pages/reflex-online"));
const TapOnlinePage = lazy(() => import("@/pages/tap-online"));
const CommandOnlinePage = lazy(() => import("@/pages/command-online"));
const RaceOnlinePage = lazy(() => import("@/pages/race-online"));
const AuroraPage = lazy(() => import("@/pages/aurora"));
const KaleidoPage = lazy(() => import("@/pages/kaleido"));
const EmberPage = lazy(() => import("@/pages/ember"));
const MancalaPage = lazy(() => import("@/pages/mancala"));
const KoiPage = lazy(() => import("@/pages/koi"));
const MarketPage = lazy(() => import("@/pages/market"));
const FortressPage = lazy(() => import("@/pages/fortress"));

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
          {/* /arcade is the Main Street Arcade pixel lobby front door. */}
          <Route path="/arcade">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><LobbyPage /></Suspense>}</Route>
          <Route path="/retro-demo">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><RetroDemoPage /></Suspense>}</Route>
          <Route path="/avatar">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><AvatarPage /></Suspense>}</Route>
          <Route path="/achievements">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><AchievementsPage /></Suspense>}</Route>
          <Route path="/leaderboard">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><LeaderboardPage /></Suspense>}</Route>
          <Route path="/play/cirql-city">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><CirqlCityPage /></Suspense>}</Route>
          <Route path="/play/boba-bubble">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><BobaBubblePage /></Suspense>}</Route>
          <Route path="/play/pill-pop">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><PillPopPage /></Suspense>}</Route>
          <Route path="/play/swatch">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><SwatchPage /></Suspense>}</Route>
          <Route path="/play/deli-dash">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><DeliDashPage /></Suspense>}</Route>
          <Route path="/play/stack-em">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><StackEmPage /></Suspense>}</Route>
          <Route path="/play/frost-bite">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><FrostBitePage /></Suspense>}</Route>
          <Route path="/play/last-call">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><LastCallPage /></Suspense>}</Route>
          <Route path="/play/snip">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><SnipPage /></Suspense>}</Route>
          <Route path="/play/cobbler">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><CobblerPage /></Suspense>}</Route>
          <Route path="/play/static">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><StaticPage /></Suspense>}</Route>
          <Route path="/play/pedal-pusher">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><PedalPusherPage /></Suspense>}</Route>
          <Route path="/play/grease-monkey">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><GreaseMonkeyPage /></Suspense>}</Route>
          <Route path="/play/sudsy">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><SudsyPage /></Suspense>}</Route>
          <Route path="/play/gumball">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><GumballPage /></Suspense>}</Route>
          <Route path="/play/night-shift">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><NightShiftPage /></Suspense>}</Route>
          <Route path="/play/flutter">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><FlutterPage /></Suspense>}</Route>
          <Route path="/play/sugar-swap">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><SugarSwapPage /></Suspense>}</Route>
          <Route path="/play/piggy-bank">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><PiggyBankPage /></Suspense>}</Route>
          <Route path="/play/chop-shop">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><ChopShopPage /></Suspense>}</Route>
          <Route path="/play/delivery-dash">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><DeliveryDashPage /></Suspense>}</Route>
          <Route path="/play/sparkle">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><SparklePage /></Suspense>}</Route>
          <Route path="/play/spellbound">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><SpellboundPage /></Suspense>}</Route>
          <Route path="/play/sort-it">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><SortItPage /></Suspense>}</Route>
          <Route path="/play/smoothie">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><SmoothiePage /></Suspense>}</Route>
          <Route path="/play/fowl-play">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><FowlPlayPage /></Suspense>}</Route>
          <Route path="/play/wire-up">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><WireUpPage /></Suspense>}</Route>
          <Route path="/play/hue-hop">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><HueHopPage /></Suspense>}</Route>
          <Route path="/play/garden-guard">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><GardenGuardPage /></Suspense>}</Route>
          <Route path="/play/loop-line">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><LoopLinePage /></Suspense>}</Route>
          <Route path="/town">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><TownPage /></Suspense>}</Route>
          <Route path="/cirql">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><CirqlPage /></Suspense>}</Route>
          <Route path="/music-test">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><MusicTestPage /></Suspense>}</Route>
          <Route path="/tile-lab">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><TileLabPage /></Suspense>}</Route>
          <Route path="/tile-arranger">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><TileArrangerPage /></Suspense>}</Route>
          {/* easy public shortcuts to the new tile-world (no login) */}
          <Route path="/cirqlsphere">{() => <Redirect to="/tile-lab?biome=shroom" />}</Route>
          <Route path="/world">{() => <Redirect to="/tile-lab?biome=shroom" />}</Route>
          <Route path="/shroomwood">{() => <Redirect to="/tile-lab?biome=shroom" />}</Route>
          <Route path="/dunes">{() => <Redirect to="/tile-lab?biome=desert" />}</Route>
          <Route path="/change-password">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><ChangePasswordPage /></Suspense>}</Route>
          <Route path="/play/harvest-moonlight">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><HarvestMoonlightPage /></Suspense>}</Route>
          <Route path="/play/green-thumb">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><GreenThumbPage /></Suspense>}</Route>
          <Route path="/play/bloom-boom">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><BloomBoomPage /></Suspense>}</Route>
          <Route path="/play/bark-park">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><BarkParkPage /></Suspense>}</Route>
          <Route path="/play/sprout">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><SproutPage /></Suspense>}</Route>
          <Route path="/play/brick-mortar">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><BrickMortarPage /></Suspense>}</Route>
          <Route path="/play/mixtape">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><MixtapePage /></Suspense>}</Route>
          <Route path="/play/claw">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><ClawPage /></Suspense>}</Route>
          <Route path="/play/plink">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><PlinkPage /></Suspense>}</Route>
          <Route path="/play/pin-pals">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><PinPalsPage /></Suspense>}</Route>
          <Route path="/play/punch-list">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><PunchListPage /></Suspense>}</Route>
          <Route path="/coin-demo">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><CoinDemoPage /></Suspense>}</Route>
          <Route path="/lobby">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><LobbyPage /></Suspense>}</Route>
          <Route path="/play/cuppa">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><CuppaRushPage /></Suspense>}</Route>
          <Route path="/play/slice-route">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><SliceRoutePage /></Suspense>}</Route>
          <Route path="/play/spin-cycle">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><SpinCyclePage /></Suspense>}</Route>
          <Route path="/play/rummage">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><RummagePage /></Suspense>}</Route>
          <Route path="/play/dozen">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><DozenPage /></Suspense>}</Route>
          <Route path="/play/fresh-batch">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><FreshBatchPage /></Suspense>}</Route>
          <Route path="/play/sundae-stack">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><SundaeStackPage /></Suspense>}</Route>
          <Route path="/play/spin-city">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><SpinCityPage /></Suspense>}</Route>
          <Route path="/play/taco-stack">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><TacoStackPage /></Suspense>}</Route>
          <Route path="/play/fix-it">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><FixItPage /></Suspense>}</Route>
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
          <Route path="/play/race/online">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><RaceOnlinePage /></Suspense>}</Route>
          <Route path="/play/race">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><RacePage /></Suspense>}</Route>
          <Route path="/play/miner">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><MinerPage /></Suspense>}</Route>
          <Route path="/play/claim">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><ClaimPage /></Suspense>}</Route>
          <Route path="/play/beat">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><BeatPage /></Suspense>}</Route>
          <Route path="/play/pong/online">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><PongOnlinePage /></Suspense>}</Route>
          <Route path="/play/pong">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><PongPage /></Suspense>}</Route>
          <Route path="/play/whack">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><WhackPage /></Suspense>}</Route>
          <Route path="/play/reflex/online">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><ReflexOnlinePage /></Suspense>}</Route>
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
          <Route path="/play/lander">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><LanderPage /></Suspense>}</Route>
          <Route path="/play/slice">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><SlicePage /></Suspense>}</Route>
          <Route path="/play/osmos">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><OsmosPage /></Suspense>}</Route>
          <Route path="/play/crawler">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><CrawlerPage /></Suspense>}</Route>
          <Route path="/play/spiro">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><SpiroPage /></Suspense>}</Route>
          <Route path="/play/tide">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><TidePage /></Suspense>}</Route>
          <Route path="/play/dodge">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><DodgePage /></Suspense>}</Route>
          <Route path="/play/gunner">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><GunnerPage /></Suspense>}</Route>
          <Route path="/play/tap/online">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><TapOnlinePage /></Suspense>}</Route>
          <Route path="/play/tap">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><CirqlTapPage /></Suspense>}</Route>
          <Route path="/play/survivor">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><SurvivorPage /></Suspense>}</Route>
          <Route path="/play/sumo/online">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><SumoOnlinePage /></Suspense>}</Route>
          <Route path="/play/sumo">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><SumoPage /></Suspense>}</Route>
          <Route path="/play/command/online">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><CommandOnlinePage /></Suspense>}</Route>
          <Route path="/play/command">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><CommandPage /></Suspense>}</Route>
          <Route path="/play/coil">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><CoilPage /></Suspense>}</Route>
          <Route path="/play/keep">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><KeepPage /></Suspense>}</Route>
          <Route path="/play/weave">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><WeavePage /></Suspense>}</Route>
          <Route path="/play/aurora">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><AuroraPage /></Suspense>}</Route>
          <Route path="/play/kaleido">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><KaleidoPage /></Suspense>}</Route>
          <Route path="/play/ember">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><EmberPage /></Suspense>}</Route>
          <Route path="/play/mancala">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><MancalaPage /></Suspense>}</Route>
          <Route path="/play/koi">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><KoiPage /></Suspense>}</Route>
          <Route path="/play/market">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><MarketPage /></Suspense>}</Route>
          <Route path="/play/fortress">{() => <Suspense fallback={<div className="min-h-screen" style={{ background: "#05040f" }} />}><FortressPage /></Suspense>}</Route>
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
