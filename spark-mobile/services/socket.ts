import { io, Socket } from 'socket.io-client';
import * as storage from '@/utils/storage';
import { API_URL } from '@/utils/constants';

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  const token = await storage.getItem('accessToken');

  if (socket?.connected) {
    return socket;
  }

  const baseUrl = API_URL.replace('/api', '');

  socket = io(baseUrl, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
