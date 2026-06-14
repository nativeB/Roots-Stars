import type { Server as HttpServer } from 'node:http';
import { Server as IOServer } from 'socket.io';
import { verifyToken } from '../auth/token.js';

let io: IOServer | null = null;

/**
 * Attach socket.io to the Fastify HTTP server. Each socket authenticates with a
 * device token in the handshake and is joined to its family room. Room names are
 * never taken from the client.
 */
export function initIO(server: HttpServer): IOServer {
  io = new IOServer(server, {
    path: '/socket.io',
    cors: { origin: true, credentials: true },
  });

  io.use(async (socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.headers.authorization?.replace('Bearer ', '') ?? undefined);
    if (!token) return next(new Error('unauthorized'));
    const claims = await verifyToken(token);
    if (!claims) return next(new Error('unauthorized'));
    socket.data.familyId = claims.familyId;
    socket.data.role = claims.role;
    next();
  });

  io.on('connection', (socket) => {
    const familyId = socket.data.familyId as string;
    socket.join(familyId);
    if (socket.data.role === 'host') socket.join(`${familyId}:host`);

    emitPresence(familyId);
    socket.on('disconnect', () => emitPresence(familyId));
  });

  return io;
}

export function getIO(): IOServer | null {
  return io;
}

function presenceCount(familyId: string): number {
  if (!io) return 0;
  return io.sockets.adapter.rooms.get(familyId)?.size ?? 0;
}

export function emitPresence(familyId: string) {
  if (!io) return;
  io.to(familyId).emit('family:presence', { count: presenceCount(familyId) });
}
