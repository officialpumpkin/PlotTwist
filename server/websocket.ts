
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from './logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function setupWebSocket(server: HTTPServer) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: true,
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Store user socket mappings
  const userSockets = new Map<string, string[]>();

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info('Socket connected', undefined, { socketId: socket.id });

    // Authenticate the socket connection
    socket.on('authenticate', (data: { userId: string }) => {
      if (data.userId) {
        socket.userId = data.userId;
        
        // Store socket for this user
        if (!userSockets.has(data.userId)) {
          userSockets.set(data.userId, []);
        }
        userSockets.get(data.userId)!.push(socket.id);
        
        socket.join(`user:${data.userId}`);
        logger.info('Socket authenticated', undefined, { 
          socketId: socket.id, 
          userId: data.userId 
        });
        
        socket.emit('authenticated', { success: true });
      }
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        // Remove socket from user's socket list
        const sockets = userSockets.get(socket.userId);
        if (sockets) {
          const index = sockets.indexOf(socket.id);
          if (index > -1) {
            sockets.splice(index, 1);
          }
          if (sockets.length === 0) {
            userSockets.delete(socket.userId);
          }
        }
        
        logger.info('Socket disconnected', undefined, { 
          socketId: socket.id, 
          userId: socket.userId 
        });
      }
    });
  });

  // Helper functions to emit notifications
  const notificationService = {
    // Send story invitation notification
    sendInvitationNotification: (userId: string, invitation: any) => {
      io.to(`user:${userId}`).emit('notification:invitation', {
        type: 'invitation',
        data: invitation,
        timestamp: new Date().toISOString()
      });
    },

    // Send turn notification
    sendTurnNotification: (userId: string, story: any) => {
      io.to(`user:${userId}`).emit('notification:turn', {
        type: 'turn',
        data: story,
        timestamp: new Date().toISOString()
      });
    },

    // Send join request notification
    sendJoinRequestNotification: (userId: string, request: any) => {
      io.to(`user:${userId}`).emit('notification:join_request', {
        type: 'join_request',
        data: request,
        timestamp: new Date().toISOString()
      });
    },

    // Send edit request notification
    sendEditRequestNotification: (userId: string, request: any) => {
      io.to(`user:${userId}`).emit('notification:edit_request', {
        type: 'edit_request',
        data: request,
        timestamp: new Date().toISOString()
      });
    }
  };

  return { io, notificationService };
}
