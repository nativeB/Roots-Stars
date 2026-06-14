import { z } from 'zod';
import { personSchema, personCardFields } from './person.js';
import { unionSchema, unionType, relationshipKind } from './union.js';

/** Request/response contracts for the JSON API. Both ends validate against these. */

// GET /api/invite/:slug
export const inviteInfoResponse = z.object({
  familyId: z.string(),
  familyName: z.string(),
});

// POST /api/family/:familyId/device  → issue an account-less device token
export const issueDeviceResponse = z.object({
  token: z.string(),
  deviceId: z.string(),
});

// POST /api/family/:familyId/host  { secret }  → elevate to host role
export const claimHostRequest = z.object({ secret: z.string().min(1) });
export const claimHostResponse = z.object({ token: z.string() });

// GET /api/family/snapshot  (device-scoped) → the whole sky
export const snapshotResponse = z.object({
  family: z.object({ id: z.string(), name: z.string() }),
  people: z.array(personSchema),
  unions: z.array(unionSchema),
});
export type SnapshotResponse = z.infer<typeof snapshotResponse>;

// POST /api/person  → add a relative attached to an anchor by a relationship
export const addPersonRequest = z.object({
  fields: personCardFields,
  attach: z
    .object({
      anchorPersonId: z.string(),
      relationship: relationshipKind,
      // For 'child': optionally name the other parent to form/extend a union.
      otherParentId: z.string().optional(),
      unionType: unionType.optional(),
    })
    .optional(),
  clientMutationId: z.string().max(64).optional(),
});
export type AddPersonRequest = z.infer<typeof addPersonRequest>;

export const addPersonResponse = z.object({
  person: personSchema,
  union: unionSchema.optional(),
});

// PATCH /api/person/:id
export const updatePersonRequest = z.object({
  fields: personCardFields.partial(),
  clientMutationId: z.string().max(64).optional(),
});

// POST /api/person/:id/claim
export const claimPersonResponse = z.object({
  personId: z.string(),
  claimedAt: z.string().datetime(),
});

// POST /api/upload/presign  { personId, contentType }
export const presignRequest = z.object({
  personId: z.string(),
  contentType: z.string().regex(/^image\//),
});
export const presignResponse = z.object({
  uploadUrl: z.string().url(),
  photoKey: z.string(),
});

// POST /api/person/:id/photo  { photoKey }
export const setPhotoRequest = z.object({ photoKey: z.string() });

// GET /api/person/:id/photo-url
export const photoUrlResponse = z.object({ url: z.string().url().nullable() });
