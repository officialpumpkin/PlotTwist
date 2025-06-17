import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

export function useRealTimeNotifications() {
  const { isAuthenticated } = useAuth();

  const { data: invitations, isLoading, error } = useQuery({
    queryKey: ["/api/invitations/pending"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(queryKey[0] as string, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch invitations");
      }
      return response.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 30000, // Poll every 30 seconds
    retry: false, // Don't retry on auth failures
  });

  // For now, we'll just log the invitations
  // In a real implementation, you might use WebSocket or Server-Sent Events
  if (invitations && invitations.length > 0) {
    console.log("New invitations:", invitations);
  }

  return { invitations: invitations || [] };
}