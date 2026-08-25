import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Eye } from "lucide-react";

// Shown app-wide while an admin is impersonating ("viewing as") another user.
export default function ImpersonationBanner() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!user?._impersonating) return null;

  const stop = async () => {
    setBusy(true);
    try {
      await apiRequest("POST", "/api/auth/stop-impersonate", {});
    } catch {
      /* fall through to reload regardless */
    }
    window.location.href = "/admin-dashboard";
  };

  return (
    <div className="bg-amber-500 text-white text-sm px-4 py-2 flex items-center justify-center gap-3 flex-wrap">
      <span className="flex items-center gap-2 font-medium">
        <Eye className="h-4 w-4" />
        Viewing as <span className="underline">{user.email}</span>
        {user._impersonatorEmail && <span className="opacity-90">(admin: {user._impersonatorEmail})</span>}
      </span>
      <button
        onClick={stop}
        disabled={busy}
        className="rounded bg-white/20 hover:bg-white/30 px-3 py-0.5 font-semibold disabled:opacity-60"
      >
        {busy ? "Stopping…" : "Stop impersonating"}
      </button>
    </div>
  );
}
