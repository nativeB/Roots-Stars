import type { Person, Union } from '@roots/shared';

/**
 * Hardcoded sample family for Phase 1 — proves the layout + look before any backend.
 * Deliberately includes the hard cases the union model must handle:
 *   - a couple with children (Edith + Walter → Maya, Theo)
 *   - a remarriage: Walter is in two unions (with Edith, then with Carol)
 *   - a half-sibling: Iris is Walter + Carol's child (shares Walter, not Edith)
 *   - a single parent: Maya has a union with one partner → her child Juniper
 *   - partners across a generation: Maya + Devon
 */

const now = '2026-06-13T00:00:00.000Z';

function p(
  id: string,
  name: string,
  parentUnionId: string | null,
  extra: Partial<Person> = {},
): Person {
  return {
    id,
    familyId: 'demo',
    name,
    nickname: null,
    parentUnionId,
    photoKey: null,
    birthMonth: null,
    birthDay: null,
    birthYear: null,
    birthplace: null,
    currentLocation: null,
    signatureEmoji: null,
    signatureDish: null,
    hiddenTalent: null,
    song: null,
    askMeAbout: null,
    takesAfterId: null,
    bio: null,
    isDeceased: false,
    isMinor: false,
    claimed: false,
    claimedAt: null,
    createdAt: now,
    updatedAt: now,
    ...extra,
  };
}

function u(id: string, partnerAId: string, partnerBId: string | null): Union {
  return {
    id,
    familyId: 'demo',
    partnerAId,
    partnerBId,
    unionType: partnerBId ? 'married' : 'other',
    createdAt: now,
  };
}

export const fixturePeople: Person[] = [
  // Generation 0 — eldest
  p('edith', 'Edith', null, {
    signatureEmoji: '🪡',
    signatureDish: 'Apple strudel',
    isDeceased: true,
  }),
  p('walter', 'Walter', null, {
    signatureEmoji: '🎻',
    nickname: 'Wally',
    claimed: true,
    claimedAt: now,
    birthMonth: 4,
    birthDay: 2,
    birthYear: 1948,
    birthplace: 'Kraków, Poland',
    currentLocation: 'Portland, OR',
    signatureDish: 'Pierogi (the real ones)',
    hiddenTalent: 'Can whistle two notes at once',
    song: 'Brahms — Hungarian Dance No. 5',
    askMeAbout: 'The boat he built in 1979',
    bio: 'Patriarch, fiddler, keeper of the family stories.',
  }),
  p('carol', 'Carol', null, { signatureEmoji: '🌻' }),

  // Generation 1 — Edith+Walter's kids, plus Walter+Carol's half-sibling, plus partners
  p('maya', 'Maya', 'u_edith_walter', { signatureEmoji: '📷', claimed: true, claimedAt: now }),
  p('theo', 'Theo', 'u_edith_walter', { signatureEmoji: '🪐' }),
  p('iris', 'Iris', 'u_walter_carol', { signatureEmoji: '🎨' }), // half-sibling
  p('devon', 'Devon', null, { signatureEmoji: '🎸' }), // married into gen 1 (Maya's partner)

  // Generation 2
  p('juniper', 'Juniper', 'u_maya_devon', { signatureEmoji: '🦊', isMinor: true }),
  p('rowan', 'Rowan', 'u_maya_devon', { signatureEmoji: '🐢', isMinor: true }),
];

export const fixtureUnions: Union[] = [
  u('u_edith_walter', 'edith', 'walter'),
  u('u_walter_carol', 'walter', 'carol'), // remarriage: Walter again
  u('u_maya_devon', 'maya', 'devon'),
];
