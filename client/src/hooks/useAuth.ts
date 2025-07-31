import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, isError, refetch } = useQuery({
    queryKey: ["/api/auth/user"],
    // Handle unauthorized errors gracefully
    queryFn: async ({ queryKey }) => {
      try {
        const res = await fetch(queryKey[0] as string, { 
          credentials: "include",
          headers: {
            'Content-Type': 'application/json',
          }
        });
        if (res.status === 401) {
          return null; // Gracefully handle unauthorized
        }
        if (!res.ok) {
          throw new Error(`${res.status}: ${await res.text() || res.statusText}`);
        }
        return await res.json();
      } catch (error) {
        console.log("Auth error:", error);
        return null; // Return null for all errors to avoid UI blocking
      }
    },
    retry: (failureCount, error) => {
      // Only retry on network errors, not auth errors
      return failureCount < 2 && !error?.message?.includes('401');
    },
    staleTime: 30 * 1000, // 30 seconds stale time
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000, // Refetch every minute instead of 5 seconds
  });

  return {
    user,
    isLoading: isLoading && !isError, // Only treat as loading if no error occurred
    isAuthenticated: !!user,
    refetch,
  };
}
