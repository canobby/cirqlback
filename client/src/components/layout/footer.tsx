import { Link } from "wouter";
import cirqlbackLogo from "@assets/cirqlback-logo-transparent.png";

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <img 
                src={cirqlbackLogo} 
                alt="Cirqlback" 
                className="h-5 w-auto mr-3 logo-transparent"
              />
              <span className="text-xl font-bold gradient-text">Cirqlback</span>
            </div>
            <p className="text-muted-foreground mb-4 max-w-md">
              The revolutionary NFC-powered local marketing platform connecting customers 
              with businesses through seamless tap-to-reward experiences.
            </p>
            <div className="flex space-x-4">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center hover:bg-primary/80 transition-colors cursor-pointer">
                <span className="text-white text-sm font-bold">f</span>
              </div>
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center hover:bg-secondary/80 transition-colors cursor-pointer">
                <span className="text-white text-sm font-bold">t</span>
              </div>
              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center hover:bg-accent/80 transition-colors cursor-pointer">
                <span className="text-white text-sm font-bold">in</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-foreground">Platform</h3>
            <ul className="space-y-2">
              <li><Link href="/customer" className="text-muted-foreground hover:text-primary transition-colors">Customer Experience</Link></li>
              <li><Link href="/merchant" className="text-muted-foreground hover:text-secondary transition-colors">Merchant Dashboard</Link></li>
              <li><Link href="/analytics" className="text-muted-foreground hover:text-accent transition-colors">Analytics Suite</Link></li>
              <li><Link href="/community" className="text-muted-foreground hover:text-primary transition-colors">Community Hub</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-foreground">Support</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Help Center</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-secondary transition-colors">Documentation</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-accent transition-colors">Contact Us</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">System Status</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-muted-foreground text-sm">
            © 2024 Cirqlback. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-muted-foreground hover:text-primary text-sm transition-colors">Privacy Policy</a>
            <a href="#" className="text-muted-foreground hover:text-secondary text-sm transition-colors">Terms of Service</a>
            <a href="#" className="text-muted-foreground hover:text-accent text-sm transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}