import { z } from 'zod';

/**
 * The playful person-card fields. Everything is optional except `name`.
 * Birthday is split so a relative can give month+day without a year (privacy / age-shyness).
 */
export const personCardFields = z.object({
  name: z.string().trim().min(1, 'A name is the one thing we need').max(120),
  nickname: z.string().trim().max(80).optional().nullable(),

  birthMonth: z.number().int().min(1).max(12).optional().nullable(),
  birthDay: z.number().int().min(1).max(31).optional().nullable(),
  birthYear: z.number().int().min(1850).max(2100).optional().nullable(),

  birthplace: z.string().trim().max(160).optional().nullable(),
  currentLocation: z.string().trim().max(160).optional().nullable(),

  signatureEmoji: z.string().trim().max(16).optional().nullable(),
  signatureDish: z.string().trim().max(160).optional().nullable(),
  hiddenTalent: z.string().trim().max(160).optional().nullable(),
  song: z.string().trim().max(300).optional().nullable(),
  askMeAbout: z.string().trim().max(200).optional().nullable(),
  takesAfterId: z.string().trim().max(40).optional().nullable(),
  bio: z.string().trim().max(280).optional().nullable(),

  isDeceased: z.boolean().optional().default(false),
  isMinor: z.boolean().optional().default(false),
});

export type PersonCardFields = z.infer<typeof personCardFields>;

/** The full person as returned from the API (server-owned fields included). */
export const personSchema = personCardFields.extend({
  id: z.string(),
  familyId: z.string(),
  parentUnionId: z.string().nullable(),
  photoKey: z.string().nullable(),
  claimed: z.boolean(),
  claimedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Person = z.infer<typeof personSchema>;

/**
 * Sensitive fields that are hidden for minors unless the host opts to reveal them.
 * Photos of minors are always behind the invite wall (enforced separately at the storage layer).
 */
export const MINOR_SENSITIVE_FIELDS = [
  'birthYear',
  'currentLocation',
  'song',
  'askMeAbout',
  'bio',
] as const satisfies readonly (keyof PersonCardFields)[];
