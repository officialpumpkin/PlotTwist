
import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import { useQueryClient } from '@tanstack/react-query';

interface Notification {
  type: 'invitation' | 'turn' | 'join_request' | 'edit_request';
  data: any;
  timestamp: string;
}

interface NotificationCounts {
  invitations: number;
  joinRequests: number;
  editRequests: number;
  total: number;
}

export function useNotifications() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [counts, setCounts] = useState<NotificationCounts>({
    invitations: 0,
    joinRequests: 0,
    editRequests: 0,
    total: 0
  });

  // Connect to WebSocket when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const newSocket = io('/', {
      transports: ['websocket', 'polling'],
      autoConnect: true
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      // Authenticate the socket
      newSocket.emit('authenticate', { userId: user.id });
    });

    newSocket.on('authenticated', (data) => {
      console.log('WebSocket authenticated:', data);
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    // Handle different notification types
    newSocket.on('notification:invitation', (notification: Notification) => {
      console.log('Received invitation notification:', notification);
      setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
      setCounts(prev => ({
        ...prev,
        invitations: prev.invitations + 1,
        total: prev.total + 1
      }));
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/invitations/pending'] });
    });

    newSocket.on('notification:turn', (notification: Notification) => {
      console.log('Received turn notification:', notification);
      setNotifications(prev => [notification, ...prev.slice(0, 49)]);
      
      // Invalidate story queries to refresh turn data
      queryClient.invalidateQueries({ queryKey: ['/api/my-turn'] });
      queryClient.invalidateQueries({ queryKey: ['/api/waiting-turn'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-stories'] });
    });

    newSocket.on('notification:join_request', (notification: Notification) => {
      console.log('Received join request notification:', notification);
      setNotifications(prev => [notification, ...prev.slice(0, 49)]);
      setCounts(prev => ({
        ...prev,
        joinRequests: prev.joinRequests + 1,
        total: prev.total + 1
      }));
      
      queryClient.invalidateQueries({ queryKey: ['/api/join-requests/pending'] });
    });

    newSocket.on('notification:edit_request', (notification: Notification) => {
      console.log('Received edit request notification:', notification);
      setNotifications(prev => [notification, ...prev.slice(0, 49)]);
      setCounts(prev => ({
        ...prev,
        editRequests: prev.editRequests + 1,
        total: prev.total + 1
      }));
      
      queryClient.invalidateQueries({ queryKey: ['/api/edit-requests/pending'] });
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user?.id, queryClient]);

  const clearNotification = useCallback((index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  }, []);

  const markAsRead = useCallback((type: string) => {
    setCounts(prev => {
      const newCounts = { ...prev };
      switch (type) {
        case 'invitations':
          newCounts.total -= newCounts.invitations;
          newCounts.invitations = 0;
          break;
        case 'joinRequests':
          newCounts.total -= newCounts.joinRequests;
          newCounts.joinRequests = 0;
          break;
        case 'editRequests':
          newCounts.total -= newCounts.editRequests;
          newCounts.editRequests = 0;
          break;
      }
      return newCounts;
    });
  }, []);

  return {
    isConnected,
    notifications,
    counts,
    clearNotification,
    markAsRead
  };
}
