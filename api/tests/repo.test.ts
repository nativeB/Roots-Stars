import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { prisma } from '../src/db.js';
import {
  addPerson,
  claimPerson,
  getSnapshot,
  updatePerson,
} from '../src/lib/repo.js';
import { redactForViewer, type FamilyScope } from '../src/lib/scope.js';

/**
 * Integration tests against the dev Postgres. Cover the union-graph relationship
 * resolution, family isolation (RLS replacement), and minor redaction.
 */

let famA: string;
let famB: string;
let scopeA: FamilyScope;
let scopeAHost: FamilyScope;
let scopeB: FamilyScope;

beforeAll(async () => {
  const a = await prisma.family.create({
    data: { name: 'Test A', inviteSlug: 'testA' + Date.now(), hostTokenHash: createHash('sha256').update('x').digest('hex') },
  });
  const b = await prisma.family.create({
    data: { name: 'Test B', inviteSlug: 'testB' + Date.now(), hostTokenHash: 'y' },
  });
  famA = a.id;
  famB = b.id;
  scopeA = { familyId: famA, deviceId: 'devA', isHost: false };
  scopeAHost = { familyId: famA, deviceId: 'devAhost', isHost: true };
  scopeB = { familyId: famB, deviceId: 'devB', isHost: false };
});

afterAll(async () => {
  await prisma.family.deleteMany({ where: { id: { in: [famA, famB] } } });
  await prisma.$disconnect();
});

describe('union-graph relationships', () => {
  it('builds partners, children, siblings, half-siblings, and remarriage', async () => {
    const edith = await addPerson(scopeA, { name: 'Edith' } as never);
    const walter = await addPerson(scopeA, { name: 'Walter' } as never);
    // partner union
    const maya = await addPerson(scopeA, { name: 'Maya' } as never, {
      anchorPersonId: edith.person.id,
      relationship: 'child',
      otherParentId: walter.person.id,
    });
    expect(maya.person.parentUnionId).toBeTruthy();

    // sibling of Maya → shares parent union
    const theo = await addPerson(scopeA, { name: 'Theo' } as never, {
      anchorPersonId: maya.person.id,
      relationship: 'sibling',
    });
    expect(theo.person.parentUnionId).toBe(maya.person.parentUnionId);

    // remarriage: Walter + Carol, and a half-sibling Iris
    const carol = await addPerson(scopeA, { name: 'Carol' } as never, {
      anchorPersonId: walter.person.id,
      relationship: 'partner',
    });
    const iris = await addPerson(scopeA, { name: 'Iris' } as never, {
      anchorPersonId: walter.person.id,
      relationship: 'child',
      otherParentId: carol.person.id,
    });
    // Iris shares Walter but not Maya's union → different parent union
    expect(iris.person.parentUnionId).not.toBe(maya.person.parentUnionId);

    const snap = await getSnapshot(scopeA);
    // Walter is in two unions (remarriage)
    const walterUnions = snap.unions.filter(
      (u) => u.partnerAId === walter.person.id || u.partnerBId === walter.person.id,
    );
    expect(walterUnions.length).toBe(2);
  });
});

describe('family isolation (RLS replacement)', () => {
  it('a scope cannot update another family’s person', async () => {
    const secret = await addPerson(scopeB, { name: 'SecretPerson' } as never);
    // famA scope tries to update famB's person
    const result = await updatePerson(scopeA, secret.person.id, { name: 'HACKED' } as never);
    expect(result).toBeNull();
    // confirm unchanged
    const still = await prisma.person.findUnique({ where: { id: secret.person.id } });
    expect(still?.name).toBe('SecretPerson');
  });

  it('snapshot only returns the scoped family', async () => {
    const snapB = await getSnapshot(scopeB);
    expect(snapB.people.every((p) => p.familyId === famB)).toBe(true);
  });
});

describe('minor redaction (privacy)', () => {
  it('hides sensitive fields for minors, except for the host', async () => {
    const kid = await addPerson(scopeA, {
      name: 'Juniper',
      isMinor: true,
      birthYear: 2015,
      bio: 'loves foxes',
    } as never);
    await claimPerson(scopeA, kid.person.id);
    const snap = await getSnapshot(scopeA);
    const fromSnap = snap.people.find((p) => p.id === kid.person.id)!;

    const memberView = redactForViewer(fromSnap, scopeA);
    expect(memberView.birthYear).toBeNull();
    expect(memberView.bio).toBeNull();

    const hostView = redactForViewer(fromSnap, scopeAHost);
    expect(hostView.birthYear).toBe(2015);
    expect(hostView.bio).toBe('loves foxes');
  });
});
