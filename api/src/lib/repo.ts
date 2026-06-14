import type { Prisma } from '@prisma/client';
import type { PersonCardFields, RelationshipKind, UnionType } from '@roots/shared';
import { prisma } from '../db.js';
import { serializePerson, serializeUnion, type FamilyScope } from './scope.js';

/**
 * The ONLY place Person/Union/Edit are queried. Every call injects
 * `where: { familyId: scope.familyId }`. Updates/deletes use *Many with the
 * familyId in the where so a forged cross-family id touches zero rows.
 *
 * Review rule: no Prisma call to these models outside this file.
 */

export async function getSnapshot(scope: FamilyScope) {
  const [family, people, unions] = await Promise.all([
    prisma.family.findUnique({ where: { id: scope.familyId }, select: { id: true, name: true } }),
    prisma.person.findMany({ where: { familyId: scope.familyId }, orderBy: { createdAt: 'asc' } }),
    prisma.union.findMany({ where: { familyId: scope.familyId }, orderBy: { createdAt: 'asc' } }),
  ]);
  return {
    family: family ?? { id: scope.familyId, name: 'Family' },
    people: people.map(serializePerson),
    unions: unions.map(serializeUnion),
  };
}

async function logEdit(
  tx: Prisma.TransactionClient,
  scope: FamilyScope,
  entity: 'person' | 'union',
  entityId: string,
  action: 'created' | 'updated' | 'claimed' | 'deleted',
  diff?: unknown,
) {
  await tx.edit.create({
    data: {
      familyId: scope.familyId,
      deviceId: scope.deviceId ?? null,
      entity,
      entityId,
      action,
      diff: (diff ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

/** Convert card fields → Prisma create/update data (drops undefined). */
function personData(fields: Partial<PersonCardFields>): Prisma.PersonUncheckedUpdateInput {
  const d: Record<string, unknown> = {};
  const keys: (keyof PersonCardFields)[] = [
    'name', 'nickname', 'birthMonth', 'birthDay', 'birthYear', 'birthplace',
    'currentLocation', 'signatureEmoji', 'signatureDish', 'hiddenTalent', 'song',
    'askMeAbout', 'takesAfterId', 'bio', 'isDeceased', 'isMinor',
  ];
  for (const k of keys) if (fields[k] !== undefined) d[k] = fields[k];
  return d as Prisma.PersonUncheckedUpdateInput;
}

export interface AttachSpec {
  anchorPersonId: string;
  relationship: RelationshipKind;
  otherParentId?: string;
  unionType?: UnionType;
}

/**
 * Add a person, optionally attaching them to an anchor by a relationship.
 * Resolves the relationship into union find-or-create, all in one transaction,
 * validating every referenced id belongs to the same family.
 */
export async function addPerson(
  scope: FamilyScope,
  fields: PersonCardFields,
  attach?: AttachSpec,
) {
  return prisma.$transaction(async (tx) => {
    const assertInFamily = async (id: string) => {
      const p = await tx.person.findFirst({
        where: { id, familyId: scope.familyId },
        select: { id: true, parentUnionId: true },
      });
      if (!p) throw new Error(`Person ${id} not in family`);
      return p;
    };

    // find-or-create a union for an ordered pair (or single parent)
    const findOrCreateUnion = async (aId: string, bId: string | null, type: UnionType) => {
      const existing = await tx.union.findFirst({
        where: {
          familyId: scope.familyId,
          OR: [
            { partnerAId: aId, partnerBId: bId },
            ...(bId ? [{ partnerAId: bId, partnerBId: aId }] : []),
          ],
        },
      });
      if (existing) return existing;
      return tx.union.create({
        data: { familyId: scope.familyId, partnerAId: aId, partnerBId: bId, unionType: type },
      });
    };

    let parentUnionId: string | undefined;
    let createdUnion: Awaited<ReturnType<typeof findOrCreateUnion>> | undefined;

    // create the new person first (so partner/child unions can reference them)
    const created = await tx.person.create({
      data: {
        ...(personData(fields) as Prisma.PersonUncheckedCreateInput),
        familyId: scope.familyId,
        claimedByDeviceId: null,
        name: fields.name,
      },
    });

    if (attach) {
      const anchor = await assertInFamily(attach.anchorPersonId);
      const type = attach.unionType ?? 'partners';

      switch (attach.relationship) {
        case 'partner': {
          createdUnion = await findOrCreateUnion(anchor.id, created.id, type);
          break;
        }
        case 'child': {
          // child of anchor (+ optional other parent)
          let otherId: string | null = null;
          if (attach.otherParentId) otherId = (await assertInFamily(attach.otherParentId)).id;
          createdUnion = await findOrCreateUnion(anchor.id, otherId, type);
          parentUnionId = createdUnion.id;
          break;
        }
        case 'parent': {
          // new person is a parent of the anchor → anchor joins new person's union
          createdUnion = await findOrCreateUnion(created.id, null, type);
          await tx.person.updateMany({
            where: { id: anchor.id, familyId: scope.familyId },
            data: { parentUnionId: createdUnion.id },
          });
          break;
        }
        case 'sibling': {
          // share the anchor's parent union; create a solo union if anchor has none
          if (anchor.parentUnionId) {
            parentUnionId = anchor.parentUnionId;
          } else {
            // can't infer parents; leave unattached (host can fix). No-op.
          }
          break;
        }
      }

      if (parentUnionId) {
        await tx.person.updateMany({
          where: { id: created.id, familyId: scope.familyId },
          data: { parentUnionId },
        });
      }
    }

    const finalPerson = await tx.person.findFirstOrThrow({
      where: { id: created.id, familyId: scope.familyId },
    });
    await logEdit(tx, scope, 'person', created.id, 'created');
    if (createdUnion) await logEdit(tx, scope, 'union', createdUnion.id, 'created');

    return {
      person: serializePerson(finalPerson),
      union: createdUnion ? serializeUnion(createdUnion) : undefined,
    };
  });
}

export async function updatePerson(
  scope: FamilyScope,
  personId: string,
  fields: Partial<PersonCardFields>,
) {
  return prisma.$transaction(async (tx) => {
    const res = await tx.person.updateMany({
      where: { id: personId, familyId: scope.familyId },
      data: personData(fields),
    });
    if (res.count === 0) return null;
    await logEdit(tx, scope, 'person', personId, 'updated', fields);
    const p = await tx.person.findFirstOrThrow({
      where: { id: personId, familyId: scope.familyId },
    });
    return serializePerson(p);
  });
}

export async function claimPerson(scope: FamilyScope, personId: string) {
  return prisma.$transaction(async (tx) => {
    const target = await tx.person.findFirst({
      where: { id: personId, familyId: scope.familyId },
      select: { id: true, claimedByDeviceId: true },
    });
    if (!target) return null;
    const claimedAt = new Date();
    await tx.person.updateMany({
      where: { id: personId, familyId: scope.familyId },
      data: { claimedByDeviceId: scope.deviceId ?? 'unknown', claimedAt },
    });
    await logEdit(tx, scope, 'person', personId, 'claimed');
    return { personId, claimedAt: claimedAt.toISOString() };
  });
}

export async function setPhotoKey(scope: FamilyScope, personId: string, photoKey: string) {
  const res = await prisma.person.updateMany({
    where: { id: personId, familyId: scope.familyId },
    data: { photoKey },
  });
  return res.count > 0;
}

export async function getPersonPhotoKey(scope: FamilyScope, personId: string) {
  const p = await prisma.person.findFirst({
    where: { id: personId, familyId: scope.familyId },
    select: { photoKey: true },
  });
  return p?.photoKey ?? null;
}

export async function deletePerson(scope: FamilyScope, personId: string) {
  return prisma.$transaction(async (tx) => {
    const res = await tx.person.deleteMany({
      where: { id: personId, familyId: scope.familyId },
    });
    if (res.count === 0) return false;
    await logEdit(tx, scope, 'person', personId, 'deleted');
    return true;
  });
}
