import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth, type AuthUser } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Mode = "login" | "register";

// apiRequest throws Error(`${status}: ${body}`) where body is usually JSON
// like {"message":"..."}. Pull out a friendly message.
function friendlyError(message: string): string {
  const stripped = message.replace(/^\d+:\s*/, "");
  try {
    const parsed = JSON.parse(stripped);
    if (parsed?.message) return parsed.message;
  } catch {
    /* not JSON — fall through */
  }
  return stripped || "Something went wrong. Please try again.";
}

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [role, setRole] = useState<"customer" | "merchant">("customer");
  const [remember, setRemember] = useState(true);   // keep me signed in + prefill my email

  // Already signed in? Don't show the form.
  useEffect(() => {
    if (!isLoading && isAuthenticated) setLocation("/");
  }, [isLoading, isAuthenticated, setLocation]);

  // Prefill the saved email (from a previous "remember me" sign-in) so it's one tap.
  useEffect(() => {
    try { const saved = localStorage.getItem("cb_saved_email"); if (saved) setEmail(saved); } catch { /* ignore */ }
  }, []);

  const authMutation = useMutation({
    mutationFn: async (): Promise<AuthUser> => {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { email, password, remember }
          : { email, password, firstName: firstName || undefined, role, remember };
      const res = await apiRequest("POST", url, body);
      return (await res.json()) as AuthUser;
    },
    onSuccess: (user) => {
      // Remember me: keep the email prefilled next time (the browser's password
      // manager saves the password itself). Unchecked → forget it.
      try {
        if (remember && email) localStorage.setItem("cb_saved_email", email);
        else localStorage.removeItem("cb_saved_email");
      } catch { /* ignore */ }
      queryClient.setQueryData(["/api/auth/user"], user);
      toast({
        title: mode === "login" ? "Welcome back!" : "Account created",
        description: user.email ?? undefined,
      });
      setLocation("/");
    },
    onError: (err: Error) => {
      toast({
        title: mode === "login" ? "Sign in failed" : "Registration failed",
        description: friendlyError(err.message),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    authMutation.mutate();
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{mode === "login" ? "Sign in" : "Create your account"}</CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Welcome back to Cirqlback."
              : "Join Cirqlback — no card required to start."}
          </CardDescription>
        </CardHeader>

        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={mode === "register" ? 8 : undefined}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "register" ? "At least 8 characters" : "••••••••"}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                data-testid="remember-me"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Remember me <span className="text-xs">(stay signed in &amp; save my email on this device)</span>
            </label>

            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="role">I'm signing up as a</Label>
                <select
                  id="role"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={role}
                  onChange={(e) => setRole(e.target.value as "customer" | "merchant")}
                >
                  <option value="customer">Customer</option>
                  <option value="merchant">Business / Merchant</option>
                </select>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={authMutation.isPending}>
              {authMutation.isPending
                ? "Please wait…"
                : mode === "login"
                ? "Sign in"
                : "Create account"}
            </Button>

            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login"
                ? "New to Cirqlback? Create an account"
                : "Already have an account? Sign in"}
            </button>

            {mode === "login" && (
              <p className="text-center text-xs text-muted-foreground">
                To change your password, sign in, then open the account menu (top-right) →{" "}
                <span className="font-medium text-foreground">Change password</span>.
              </p>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
