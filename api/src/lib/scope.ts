import type { Person as DbPerson, Union as DbUnion } from '@prisma/client';
import type { Person, Union } from '@roots/shared';

/**
 * FamilyScope is derived ONLY from a verified token — never from request input.
 * Every repository function takes a scope and filters by scope.familyId, which
 * is how we get RLS-equivalent isolation on plain Postgres.
 */
export interface FamilyScope {
  familyId: string;
  deviceId?: string;
  isHost: boolean;
}

/** Map a DB person row to the API/DTO shape (dates as ISO strings, `claimed` derived). */
export function serializePerson(p: DbPerson): Person {
  return {
    id: p.id,
    familyId: p.familyId,
    parentUnionId: p.parentUnionId,
    name: p.name,
    nickname: p.nickname,
    photoKey: p.photoKey,
    birthMonth: p.birthMonth,
    birthDay: p.birthDay,
    birthYear: p.birthYear,
    birthplace: p.birthplace,
    currentLocation: p.currentLocation,
    signatureEmoji: p.signatureEmoji,
    signatureDish: p.signatureDish,
    hiddenTalent: p.hiddenTalent,
    song: p.song,
    askMeAbout: p.askMeAbout,
    takesAfterId: p.takesAfterId,
    bio: p.bio,
    isDeceased: p.isDeceased,
    isMinor: p.isMinor,
    claimed: p.claimedByDeviceId !== null,
    claimedAt: p.claimedAt ? p.claimedAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function serializeUnion(u: DbUnion): Union {
  return {
    id: u.id,
    familyId: u.familyId,
    partnerAId: u.partnerAId,
    partnerBId: u.partnerBId,
    unionType: (u.unionType as Union['unionType']) ?? 'partners',
    createdAt: u.createdAt.toISOString(),
  };
}

/**
 * Redact a minor's sensitive fields unless the viewer is the host.
 * Photos of minors are gated separately at the storage layer.
 */
export function redactForViewer(person: Person, scope: FamilyScope): Person {
  if (!person.isMinor || scope.isHost) return person;
  return {
    ...person,
    birthYear: null,
    currentLocation: null,
    song: null,
    askMeAbout: null,
    bio: null,
  };
}
