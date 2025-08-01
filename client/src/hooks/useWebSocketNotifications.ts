import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { queryClient } from '@/lib/queryClient';

export function useWebSocketNotifications() {
  const { user, isAuthenticated } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    if (!isAuthenticated || !user?.id) return;

    // Only connect if we don't have an active connection
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts.current = 0;
        
        // Authenticate with the server
        ws.send(JSON.stringify({
          type: 'authenticate',
          userId: user.id
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'authenticated':
              console.log('WebSocket authenticated for user:', message.userId);
              break;
              
            case 'notification':
              console.log('Received notification:', message.data);
              
              // Show toast notification for join request approval
              if (message.data.type === 'join_request_approved') {
                // We need to import toast here, but since we can't import hooks inside hooks,
                // we'll trigger a custom event that can be caught by components
                window.dispatchEvent(new CustomEvent('joinRequestApproved', {
                  detail: message.data
                }));
              }
              
              // Invalidate relevant queries to refresh data
              if (message.data.type === 'invitation') {
                queryClient.invalidateQueries({ queryKey: ['/api/invitations/pending'] });
              } else if (message.data.type === 'story_update') {
                queryClient.invalidateQueries({ queryKey: ['/api/my-turn'] });
                queryClient.invalidateQueries({ queryKey: ['/api/waiting-turn'] });
              } else if (message.data.type === 'join_request') {
                queryClient.invalidateQueries({ queryKey: ['/api/join-requests/pending'] });
              } else if (message.data.type === 'join_request_approved') {
                // Refresh user's stories since they now have access to a new story
                queryClient.invalidateQueries({ queryKey: ['/api/my-stories'] });
                queryClient.invalidateQueries({ queryKey: ['/api/my-turn'] });
                queryClient.invalidateQueries({ queryKey: ['/api/waiting-turn'] });
              } else if (message.data.type === 'story_deleted') {
                // Show toast notification for story deletion
                window.dispatchEvent(new CustomEvent('storyDeleted', {
                  detail: message.data
                }));
                // Refresh all story lists since a story was deleted
                queryClient.invalidateQueries({ queryKey: ['/api/my-stories'] });
                queryClient.invalidateQueries({ queryKey: ['/api/my-turn'] });
                queryClient.invalidateQueries({ queryKey: ['/api/waiting-turn'] });
              }
              break;
              
            default:
              console.log('Unknown WebSocket message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        wsRef.current = null;
        
        // Only attempt to reconnect if we're still authenticated and it's not a normal closure
        if (isAuthenticated && event.code !== 1000) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current++;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Attempting to reconnect WebSocket (attempt ${reconnectAttempts.current})`);
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [isAuthenticated, user?.id]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    
    reconnectAttempts.current = 0;
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      connect();
    } else {
      disconnect();
    }

    return disconnect;
  }, [isAuthenticated, user?.id, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return disconnect;
  }, [disconnect]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    connect,
    disconnect
  };
}