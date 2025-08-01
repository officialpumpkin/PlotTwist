import { useWebSocketNotifications } from "./useWebSocketNotifications";

export function useRealTimeNotifications() {
  // Initialize WebSocket connection for real-time notifications
  const { isConnected } = useWebSocketNotifications();

  return { 
    isConnected,
    // This hook now primarily manages the WebSocket connection
    // Individual components should use their own useQuery hooks for data
  };
}