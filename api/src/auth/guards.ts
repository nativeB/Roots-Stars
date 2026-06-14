import type { FastifyReply, FastifyRequest } from 'fastify';
import type { FamilyScope } from '../lib/scope.js';
import { verifyToken } from './token.js';

/**
 * Extract a verified FamilyScope from the Authorization: Bearer <token> header.
 * The scope's familyId comes ONLY from the token — request params/body are never trusted.
 */
export async function requireScope(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FamilyScope | null> {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    void reply.code(401).send({ error: 'Missing token' });
    return null;
  }
  const claims = await verifyToken(token);
  if (!claims) {
    void reply.code(401).send({ error: 'Invalid token' });
    return null;
  }
  return { familyId: claims.familyId, deviceId: claims.deviceId, isHost: claims.role === 'host' };
}

export async function requireHost(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FamilyScope | null> {
  const scope = await requireScope(req, reply);
  if (!scope) return null;
  if (!scope.isHost) {
    void reply.code(403).send({ error: 'Host only' });
    return null;
  }
  return scope;
}
