import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

// Minimal shape of the authenticated user returned by GET /api/auth/user.
export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  subscriptionTier: string | null;
  [key: string]: unknown;
}

/**
 * Current-user hook. Returns null (not an error) when logged out, because the
 * query uses on401: "returnNull". Components can branch on `isAuthenticated`.
 */
export function useAuth() {
  const { data, isLoading, error } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 60_000,
    retry: false,
  });

  return {
    user: data ?? null,
    isLoading,
    isAuthenticated: !!data,
    error,
  };
}
