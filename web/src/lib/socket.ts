import { io, type Socket } from 'socket.io-client';
import { getDeviceToken } from './deviceToken';

let socket: Socket | null = null;

/** Connect to the family realtime room. Auto-reconnects; caller re-syncs on reconnect. */
export function connectSocket(familyId: string): Socket {
  if (socket) socket.disconnect();
  const token = getDeviceToken(familyId);
  socket = io({
    path: '/socket.io',
    auth: { token },
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}
