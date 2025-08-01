import { useNotifications } from './useNotifications';

// This hook has been replaced by useNotifications which uses WebSocket
// for real-time updates instead of polling
export function useRealTimeNotifications() {
  const { notifications } = useNotifications();

  return { invitations: notifications.filter(n => n.type === 'invitation') };
}