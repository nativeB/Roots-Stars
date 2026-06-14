import { z } from 'zod';
import { personSchema } from './person.js';
import { unionSchema } from './union.js';

/**
 * Realtime event names + payload schemas. Single source of truth shared by
 * the socket.io server (api) and the client store (web). Scoped to a family room.
 */

export const WS_EVENTS = {
  personAdded: 'person:added',
  personClaimed: 'person:claimed',
  personUpdated: 'person:updated',
  personDeleted: 'person:deleted',
  unionAdded: 'union:added',
  presence: 'family:presence',
} as const;

export type WsEventName = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];

/** Echoed back to the originating client so it can dedupe its own optimistic apply. */
export const clientMutationId = z.string().max(64).optional();

export const personAddedPayload = z.object({
  person: personSchema,
  clientMutationId,
});

export const personClaimedPayload = z.object({
  personId: z.string(),
  claimedAt: z.string().datetime(),
  clientMutationId,
});

export const personUpdatedPayload = z.object({
  personId: z.string(),
  fields: personSchema.partial(),
  clientMutationId,
});

export const personDeletedPayload = z.object({
  personId: z.string(),
  clientMutationId,
});

export const unionAddedPayload = z.object({
  union: unionSchema,
  clientMutationId,
});

export const presencePayload = z.object({
  count: z.number().int().min(0),
});

export type PersonAddedPayload = z.infer<typeof personAddedPayload>;
export type PersonClaimedPayload = z.infer<typeof personClaimedPayload>;
export type PersonUpdatedPayload = z.infer<typeof personUpdatedPayload>;
export type PersonDeletedPayload = z.infer<typeof personDeletedPayload>;
export type UnionAddedPayload = z.infer<typeof unionAddedPayload>;
export type PresencePayload = z.infer<typeof presencePayload>;
