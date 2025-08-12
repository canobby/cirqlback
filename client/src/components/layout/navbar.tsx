import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { CircleX } from "lucide-react";
import NotificationCenter from "@/components/notifications/notification-center";
import cirqlbackLogo from "@assets/cirqlback-logo-transparent.png";

export default function Navbar() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="bg-card/95 backdrop-blur-md shadow-sm border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              <img 
                src={cirqlbackLogo} 
                alt="Cirqlback" 
                className="h-6 w-auto mr-3 logo-transparent"
                key="cirqlback-logo-v5"
              />
              <span className="text-xl font-bold gradient-text">Cirqlback</span>
            </Link>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <Link href="/customer">
                <Button 
                  variant="ghost" 
                  className={`px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive("/customer") 
                      ? "text-primary bg-primary/10 border border-primary/20" 
                      : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                  }`}
                >
                  Customer
                </Button>
              </Link>
              <Link href="/merchant">
                <Button 
                  variant="ghost" 
                  className={`px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive("/merchant") 
                      ? "text-secondary bg-secondary/10 border border-secondary/20" 
                      : "text-muted-foreground hover:text-secondary hover:bg-secondary/5"
                  }`}
                >
                  Merchant
                </Button>
              </Link>
              <Link href="/community">
                <Button 
                  variant="ghost" 
                  className={`px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive("/community") 
                      ? "text-accent bg-accent/10 border border-accent/20" 
                      : "text-muted-foreground hover:text-accent hover:bg-accent/5"
                  }`}
                >
                  Community
                </Button>
              </Link>
              <Link href="/analytics">
                <Button 
                  variant="ghost" 
                  className={`px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive("/analytics") 
                      ? "text-primary bg-primary/10 border border-primary/20" 
                      : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                  }`}
                >
                  Analytics
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button 
                  variant="ghost" 
                  className={`px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive("/how-it-works") 
                      ? "text-secondary bg-secondary/10 border border-secondary/20" 
                      : "text-muted-foreground hover:text-secondary hover:bg-secondary/5"
                  }`}
                >
                  How It Works
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <NotificationCenter />
            <Button className="gradient-bg border-0 text-white font-semibold">
              Login
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
