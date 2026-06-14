import type { FastifyInstance } from 'fastify';
import {
  addPersonRequest,
  adminUpdateRequest,
  claimHostRequest,
  claimPersonRequest,
  presignRequest,
  setPhotoRequest,
  updatePersonRequest,
} from '@roots/shared';
import { createHash } from 'node:crypto';
import { prisma } from './db.js';
import { signToken } from './auth/token.js';
import { requireScope, requireHost } from './auth/guards.js';
import {
  addPerson,
  claimPerson,
  deletePerson,
  getAdminLedger,
  getPersonPhotoKey,
  getSnapshot,
  setPhotoKey,
  updateAdmin,
  updatePerson,
} from './lib/repo.js';
import { redactForViewer } from './lib/scope.js';
import { broadcast } from './realtime/emit.js';
import { env, r2Configured } from './env.js';
import { presignPutUrl, presignGetUrl, photoKeyFor } from './lib/r2.js';

const hostHash = (secret: string) => createHash('sha256').update(secret).digest('hex');

export async function registerRoutes(app: FastifyInstance) {
  // ── Invite + device/host tokens ──

  // GET /api/invite/:slug → family info (the slug is the capability)
  app.get<{ Params: { slug: string } }>('/api/invite/:slug', async (req, reply) => {
    const family = await prisma.family.findUnique({
      where: { inviteSlug: req.params.slug },
      select: { id: true, name: true },
    });
    if (!family) return reply.code(404).send({ error: 'No such family' });
    return { familyId: family.id, familyName: family.name };
  });

  // POST /api/family/:familyId/device → issue an account-less device token
  app.post<{ Params: { familyId: string } }>(
    '/api/family/:familyId/device',
    async (req, reply) => {
      const family = await prisma.family.findUnique({ where: { id: req.params.familyId } });
      if (!family) return reply.code(404).send({ error: 'No such family' });
      const device = await prisma.device.create({ data: { familyId: family.id } });
      const token = await signToken({
        deviceId: device.id,
        familyId: family.id,
        role: 'member',
      });
      return { token, deviceId: device.id };
    },
  );

  // POST /api/family/:familyId/host { secret } → elevate to host
  app.post<{ Params: { familyId: string } }>('/api/family/:familyId/host', async (req, reply) => {
    const parsed = claimHostRequest.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Bad request' });
    const family = await prisma.family.findUnique({ where: { id: req.params.familyId } });
    if (!family) return reply.code(404).send({ error: 'No such family' });
    if (family.hostTokenHash !== hostHash(parsed.data.secret)) {
      return reply.code(403).send({ error: 'Wrong host secret' });
    }
    const device = await prisma.device.create({ data: { familyId: family.id, label: 'host' } });
    const token = await signToken({ deviceId: device.id, familyId: family.id, role: 'host' });
    return { token };
  });

  // ── Snapshot ──
  app.get('/api/family/snapshot', async (req, reply) => {
    const scope = await requireScope(req, reply);
    if (!scope) return;
    const snap = await getSnapshot(scope);
    return {
      family: snap.family,
      people: snap.people.map((p) => redactForViewer(p, scope)),
      unions: snap.unions,
    };
  });

  // ── Person CRUD ──
  app.post('/api/person', async (req, reply) => {
    const scope = await requireScope(req, reply);
    if (!scope) return;
    const parsed = addPersonRequest.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const { person, union } = await addPerson(
      scope,
      parsed.data.fields,
      parsed.data.attach,
      parsed.data.editPin,
    );
    const cmid = parsed.data.clientMutationId;
    if (union) broadcast.unionAdded(scope.familyId, { union, clientMutationId: cmid });
    broadcast.personAdded(scope.familyId, { person, clientMutationId: cmid });
    return { person, union };
  });

  app.patch<{ Params: { id: string } }>('/api/person/:id', async (req, reply) => {
    const scope = await requireScope(req, reply);
    if (!scope) return;
    const parsed = updatePersonRequest.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const result = await updatePerson(scope, req.params.id, parsed.data.fields, {
      editPin: parsed.data.editPin,
      setEditPin: parsed.data.setEditPin,
    });
    if (!result.ok) {
      if (result.reason === 'locked') {
        return reply.code(403).send({ error: 'locked', message: 'This star is locked. Enter its PIN to edit.' });
      }
      return reply.code(404).send({ error: 'Not found' });
    }
    broadcast.personUpdated(scope.familyId, {
      personId: result.person.id,
      fields: result.person,
      clientMutationId: parsed.data.clientMutationId,
    });
    return result.person;
  });

  app.post<{ Params: { id: string } }>('/api/person/:id/claim', async (req, reply) => {
    const scope = await requireScope(req, reply);
    if (!scope) return;
    const parsed = claimPersonRequest.safeParse(req.body ?? {});
    const editPin = parsed.success ? parsed.data.editPin : undefined;
    const result = await claimPerson(scope, req.params.id, editPin);
    if (!result) return reply.code(404).send({ error: 'Not found' });
    broadcast.personClaimed(scope.familyId, result);
    return result;
  });

  app.delete<{ Params: { id: string } }>('/api/person/:id', async (req, reply) => {
    const scope = await requireScope(req, reply);
    if (!scope) return;
    const editPin = typeof (req.body as { editPin?: string })?.editPin === 'string'
      ? (req.body as { editPin?: string }).editPin
      : undefined;
    const result = await deletePerson(scope, req.params.id, editPin);
    if (result === 'not_found') return reply.code(404).send({ error: 'Not found' });
    if (result === 'locked') {
      return reply.code(403).send({ error: 'locked', message: 'This star is locked.' });
    }
    broadcast.personDeleted(scope.familyId, { personId: req.params.id });
    return { ok: true };
  });

  // ── Photos (R2) ──
  app.post('/api/upload/presign', async (req, reply) => {
    const scope = await requireScope(req, reply);
    if (!scope) return;
    if (!r2Configured) return reply.code(503).send({ error: 'Photo storage not configured' });
    const parsed = presignRequest.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Bad request' });

    // verify the person belongs to this family before minting an upload URL
    const snap = await getSnapshot(scope);
    if (!snap.people.some((p) => p.id === parsed.data.personId)) {
      return reply.code(404).send({ error: 'Not found' });
    }
    const photoKey = photoKeyFor(scope.familyId, parsed.data.personId);
    const uploadUrl = await presignPutUrl(photoKey, parsed.data.contentType);
    return { uploadUrl, photoKey };
  });

  app.post<{ Params: { id: string } }>('/api/person/:id/photo', async (req, reply) => {
    const scope = await requireScope(req, reply);
    if (!scope) return;
    const parsed = setPhotoRequest.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Bad request' });
    const ok = await setPhotoKey(scope, req.params.id, parsed.data.photoKey);
    if (!ok) return reply.code(404).send({ error: 'Not found' });
    broadcast.personUpdated(scope.familyId, {
      personId: req.params.id,
      fields: { photoKey: parsed.data.photoKey },
    });
    return { ok: true };
  });

  app.get<{ Params: { id: string } }>('/api/person/:id/photo-url', async (req, reply) => {
    const scope = await requireScope(req, reply);
    if (!scope) return;
    const key = await getPersonPhotoKey(scope, req.params.id);
    if (!key || !r2Configured) return { url: null };
    const url = await presignGetUrl(key);
    return { url };
  });

  // ── Export / delete my data (privacy §10) ──
  app.get('/api/family/export', async (req, reply) => {
    const scope = await requireScope(req, reply);
    if (!scope) return;
    return getSnapshot(scope);
  });

  // ── Back office (host-only) ──
  // Admin-only bookkeeping. Gated by the host token; this data is NEVER sent to
  // normal members (the member snapshot endpoint doesn't include it).
  app.get('/api/admin/ledger', async (req, reply) => {
    const scope = await requireHost(req, reply);
    if (!scope) return;
    const rows = await getAdminLedger(scope);
    return { rows };
  });

  app.patch<{ Params: { id: string } }>('/api/admin/person/:id', async (req, reply) => {
    const scope = await requireHost(req, reply);
    if (!scope) return;
    const parsed = adminUpdateRequest.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const ok = await updateAdmin(scope, req.params.id, parsed.data);
    if (!ok) return reply.code(404).send({ error: 'Not found' });
    return { ok: true };
  });

  void env; // env validated at import time
}
