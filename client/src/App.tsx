import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import Home from "@/pages/home";
import Customer from "@/pages/customer";
import Merchant from "@/pages/merchant";
import Community from "@/pages/community";
import Analytics from "@/pages/analytics";
import Account from "@/pages/account";
import TapPage from "@/pages/tap";
import HowItWorksPage from "@/pages/how-it-works";
import MapPage from "@/pages/map";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/customer" component={Customer} />
          <Route path="/merchant" component={Merchant} />
          <Route path="/community" component={Community} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/account" component={Account} />
          <Route path="/tap" component={TapPage} />
          <Route path="/how-it-works" component={HowItWorksPage} />
          <Route path="/map" component={MapPage} />
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
