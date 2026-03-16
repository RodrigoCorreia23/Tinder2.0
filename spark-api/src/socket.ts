import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './config/env';
import { setUserOnline, setUserOffline } from './modules/map/map.service';

let io: Server;

interface AuthSocket extends Socket {
  userId?: string;
}

export function initializeSocket(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // JWT authentication middleware
  io.use((socket: AuthSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthSocket) => {
    console.log(`User connected: ${socket.userId}`);

    // Track online status
    if (socket.userId) setUserOnline(socket.userId);

    // Join personal room for direct notifications
    socket.join(`user:${socket.userId}`);

    // Join a match chat room
    socket.on('join_match', (matchId: string) => {
      socket.join(`match:${matchId}`);
    });

    socket.on('leave_match', (matchId: string) => {
      socket.leave(`match:${matchId}`);
    });

    // Typing indicators
    socket.on('typing', (matchId: string) => {
      socket.to(`match:${matchId}`).emit('user_typing', {
        matchId,
        userId: socket.userId,
      });
    });

    socket.on('stop_typing', (matchId: string) => {
      socket.to(`match:${matchId}`).emit('user_stop_typing', {
        matchId,
        userId: socket.userId,
      });
    });

    socket.on('disconnect', () => {
      if (socket.userId) setUserOffline(socket.userId);
      console.log(`User disconnected: ${socket.userId}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}
