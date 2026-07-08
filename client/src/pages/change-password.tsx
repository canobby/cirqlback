import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// Let a signed-in user set a new password (verifies the current one first).
function friendlyError(message: string): string {
  const stripped = message.replace(/^\d+:\s*/, "");
  try { const p = JSON.parse(stripped); if (p?.message) return p.message; } catch { /* not JSON */ }
  return stripped || "Something went wrong. Please try again.";
}

export default function ChangePasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  // Must be signed in to change a password.
  useEffect(() => {
    if (!isLoading && !isAuthenticated) setLocation("/auth");
  }, [isLoading, isAuthenticated, setLocation]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/change-password", {
        currentPassword: current,
        newPassword: next,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password updated", description: "Use your new password next time you sign in." });
      setCurrent(""); setNext(""); setConfirm("");
      setLocation("/");
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't change password", description: friendlyError(err.message), variant: "destructive" });
    },
  });

  const mismatch = confirm.length > 0 && next !== confirm;
  const tooShort = next.length > 0 && next.length < 8;
  const canSubmit = current.length > 0 && next.length >= 8 && next === confirm && !mutation.isPending;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      toast({ title: "Passwords don't match", description: "The new password and confirmation must match.", variant: "destructive" });
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Change your password</CardTitle>
          <CardDescription>
            {user?.email ? `Signed in as ${user.email}. ` : ""}Enter your current password, then choose a new one.
          </CardDescription>
        </CardHeader>

        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            {/* username hint for password managers */}
            <input type="text" autoComplete="username" value={user?.email ?? ""} readOnly hidden />

            <div className="space-y-2">
              <Label htmlFor="current">Current password</Label>
              <Input id="current" type="password" required autoComplete="current-password"
                value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="••••••••" data-testid="current-password" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="next">New password</Label>
              <Input id="next" type="password" required minLength={8} autoComplete="new-password"
                value={next} onChange={(e) => setNext(e.target.value)} placeholder="At least 8 characters" data-testid="new-password" />
              {tooShort && <p className="text-xs text-destructive">Must be at least 8 characters.</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input id="confirm" type="password" required autoComplete="new-password"
                value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter new password" data-testid="confirm-password" />
              {mismatch && <p className="text-xs text-destructive">Passwords don't match.</p>}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={!canSubmit} data-testid="change-password-submit">
              {mutation.isPending ? "Updating…" : "Update password"}
            </Button>
            <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setLocation("/")}>
              Cancel
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
