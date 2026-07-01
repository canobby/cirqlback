import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, MapPin, Lock } from "lucide-react";

interface Territory {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  isActive?: boolean | null;
}

interface CoordinatorMe {
  coordinator: { id: string; displayName?: string | null; planStatus?: string | null };
  territories: Territory[];
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-950 dark:via-blue-950/30 dark:to-purple-950/30">
      <div className="container max-w-6xl mx-auto px-4 py-10">{children}</div>
    </div>
  );
}

function GateCard({ title, body, showLogin }: { title: string; body: string; showLogin?: boolean }) {
  return (
    <div className="max-w-md mx-auto mt-16">
      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-6 w-6 text-purple-600" />
          </div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{title}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{body}</p>
          {showLogin && (
            <Link href="/auth">
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">Log in</Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CoordinatorDashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data, isLoading, isError } = useQuery<CoordinatorMe>({
    queryKey: ["/api/coordinator/me"],
    enabled: isAuthenticated,
    retry: false,
  });

  if (authLoading) return <Shell><p className="text-gray-500 text-center mt-16">Loading…</p></Shell>;
  if (!isAuthenticated)
    return <Shell><GateCard title="Sign in required" body="Log in as a Community Coordinator to manage your territory." showLogin /></Shell>;
  if (isLoading) return <Shell><p className="text-gray-500 text-center mt-16">Loading your territory…</p></Shell>;
  if (isError || !data)
    return (
      <Shell>
        <GateCard
          title="Coordinator access required"
          body="This area is for Community Coordinators. If you believe this is an error, contact your Cirqlback administrator."
        />
      </Shell>
    );

  const { coordinator, territories } = data;

  return (
    <Shell>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
            <Globe className="h-7 w-7 text-purple-600" />
            Coordinator Hub
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {coordinator.displayName ? `Welcome, ${coordinator.displayName}. ` : ""}
            Manage the businesses and campaigns in your territory.
          </p>
        </div>
        {coordinator.planStatus && (
          <Badge className="bg-purple-100 text-purple-700 border-purple-200 capitalize">
            {coordinator.planStatus}
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <MapPin className="h-5 w-5 text-purple-600" />
            Your Territories
          </CardTitle>
        </CardHeader>
        <CardContent>
          {territories.length === 0 ? (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              No territories assigned yet. Once a territory is set up for you, its businesses and
              campaigns will appear here.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {territories.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-gray-900 dark:text-white">{t.name}</div>
                    {t.isActive === false && (
                      <Badge variant="outline" className="text-xs">Inactive</Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {[t.city, t.state].filter(Boolean).join(", ") || "Region not set"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Shell>
  );
}
