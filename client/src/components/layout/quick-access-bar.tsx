import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Layers,
  ArrowRight,
  User,
  Store,
  Gamepad2,
  Map,
  BarChart3,
  Settings
} from "lucide-react";

export default function QuickAccessBar() {
  const quickLinks = [
    { path: "/platform", name: "All Pages", icon: Layers, color: "bg-blue-500", description: "Complete page directory" },
    { path: "/customer", name: "Customer", icon: User, color: "bg-green-500", description: "Rewards & tap trails" },
    { path: "/merchant", name: "Merchant", icon: Store, color: "bg-purple-500", description: "Business dashboard" },
    { path: "/ar-hub", name: "AR Hub", icon: Gamepad2, color: "bg-pink-500", description: "Gaming & avatars" },
    { path: "/map", name: "Map", icon: Map, color: "bg-orange-500", description: "Business discovery" },
    { path: "/analytics", name: "Analytics", icon: BarChart3, color: "bg-indigo-500", description: "Real-time insights" },
  ];

  return (
    <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-gray-800">Quick Access</h3>
            <Badge variant="secondary" className="text-xs">No login required</Badge>
          </div>
          <Link href="/platform">
            <Button variant="outline" size="sm" className="gap-2">
              View All Pages
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickLinks.map((link, index) => {
            const Icon = link.icon;
            return (
              <Link key={index} href={link.path}>
                <Button
                  variant="ghost"
                  className="h-auto p-3 flex-col gap-2 hover:scale-105 transition-all duration-200 hover:shadow-md border border-transparent hover:border-primary/20"
                >
                  <div className={`w-8 h-8 rounded-lg ${link.color} flex items-center justify-center`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-medium text-gray-800">{link.name}</div>
                    <div className="text-xs text-gray-500 hidden lg:block">{link.description}</div>
                  </div>
                </Button>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}