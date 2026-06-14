import type { Person, Union } from '@roots/shared';

/**
 * Hardcoded sample family for the demo sky (no backend). Warm, real-feeling names,
 * and the hard cases the union model must handle:
 *   - couples with children, a remarriage (Kwame in two unions),
 *   - a half-sibling (Adwoa via Kwame + Akosua's later union),
 *   - partners married into a generation, and grandchildren two bands down.
 */

const now = '2026-06-14T00:00:00.000Z';

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

export const DEMO_FAMILY_NAME = 'The Mensah–Adjei family';

export const fixturePeople: Person[] = [
  // Generation 0 — the elders
  p('nana', 'Nana', null, { signatureEmoji: '🪘', claimed: true, claimedAt: now, isDeceased: true }),
  p('efua-g', 'Efua', null, { signatureEmoji: '🧵', claimed: true, claimedAt: now }),

  // Generation 1 — the founding couple + siblings
  p('kwame', 'Kwame', 'u_nana_efuag', {
    signatureEmoji: '🎷',
    nickname: 'Papa K',
    claimed: true,
    claimedAt: now,
    birthMonth: 3,
    birthDay: 9,
    birthYear: 1951,
    birthplace: 'Kumasi, Ghana',
    currentLocation: 'London, UK',
    signatureDish: 'Jollof (the undisputed best)',
    hiddenTalent: 'Plays sax by ear',
    song: 'Fela Kuti — Water No Get Enemy',
    askMeAbout: 'The road trip across Ghana in ’78',
    bio: 'Patriarch, saxophonist, keeper of the family stories.',
  }),
  p('akosua', 'Akosua', null, { signatureEmoji: '🌺', claimed: true, claimedAt: now }),

  // Generation 2 — Kwame + Akosua's children, plus partners
  p('ama', 'Ama', 'u_kwame_akosua', { signatureEmoji: '📷', claimed: true, claimedAt: now }),
  p('yaw', 'Yaw', 'u_kwame_akosua', { signatureEmoji: '⚽', claimed: true, claimedAt: now }),
  p('adwoa', 'Adwoa', 'u_kwame_akosua', { signatureEmoji: '📚' }), // the unclaimed "you" slot
  p('kofi', 'Kofi', null, { signatureEmoji: '🎬', claimed: true, claimedAt: now }), // married to Ama
  p('efua', 'Efua', null, { signatureEmoji: '🎨' }), // married to Yaw

  // Generation 3 — grandchildren
  p('esi', 'Esi', 'u_ama_kofi', { signatureEmoji: '☕', claimed: true, claimedAt: now }),
  p('kojo', 'Kojo', 'u_yaw_efua', { signatureEmoji: '🌍', isMinor: true }),
];

export const fixtureUnions: Union[] = [
  u('u_nana_efuag', 'nana', 'efua-g'),
  u('u_kwame_akosua', 'kwame', 'akosua'),
  u('u_ama_kofi', 'ama', 'kofi'),
  u('u_yaw_efua', 'yaw', 'efua'),
];
