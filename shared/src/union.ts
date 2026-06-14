import { z } from 'zod';

/** A couple/partnership. Light, non-judgmental typing. */
export const unionType = z.enum(['married', 'partners', 'other']);
export type UnionType = z.infer<typeof unionType>;

/**
 * A union has one or two partners.
 * - Two partners → a couple.
 * - One partner (partnerBId null) → a single parent.
 * Children attach to a union via Person.parentUnionId.
 */
export const unionSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  partnerAId: z.string(),
  partnerBId: z.string().nullable(),
  unionType: unionType,
  createdAt: z.string().datetime(),
});

export type Union = z.infer<typeof unionSchema>;

/**
 * The relationship a new relative is attached by, from the perspective of an
 * existing "anchor" person. The API resolves these into union find-or-create ops.
 */
export const relationshipKind = z.enum(['parent', 'partner', 'child', 'sibling']);
export type RelationshipKind = z.infer<typeof relationshipKind>;
