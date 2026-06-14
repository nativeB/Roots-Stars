import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { prisma } from '../src/db.js';
import {
  addPerson,
  claimPerson,
  deletePerson,
  getAdminLedger,
  getSnapshot,
  updateAdmin,
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
    expect(result.ok).toBe(false);
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

describe('optional edit-lock PIN', () => {
  it('open stars edit freely; locked stars need the PIN; host always edits', async () => {
    // unlocked → anyone in family can edit
    const open = await addPerson(scopeA, { name: 'Open' } as never);
    expect(open.person.locked).toBe(false);
    const r1 = await updatePerson(scopeA, open.person.id, { name: 'Open2' } as never);
    expect(r1.ok).toBe(true);

    // claim with a PIN → locked
    const mine = await addPerson(scopeA, { name: 'Mine' } as never);
    await claimPerson(scopeA, mine.person.id, '1234');
    const snap = await getSnapshot(scopeA);
    expect(snap.people.find((p) => p.id === mine.person.id)!.locked).toBe(true);

    // wrong/no PIN from a member → blocked
    const noPin = await updatePerson(scopeA, mine.person.id, { name: 'Hacked' } as never);
    expect(noPin).toEqual({ ok: false, reason: 'locked' });
    const wrong = await updatePerson(scopeA, mine.person.id, { name: 'Hacked' } as never, {
      editPin: '9999',
    });
    expect(wrong.ok).toBe(false);

    // correct PIN → allowed
    const right = await updatePerson(scopeA, mine.person.id, { name: 'Renamed' } as never, {
      editPin: '1234',
    });
    expect(right.ok).toBe(true);

    // host bypasses the lock
    const byHost = await updatePerson(scopeAHost, mine.person.id, { name: 'HostEdit' } as never);
    expect(byHost.ok).toBe(true);

    // delete is gated the same way
    const delNoPin = await deletePerson(scopeA, mine.person.id);
    expect(delNoPin).toBe('locked');
    const delHost = await deletePerson(scopeAHost, mine.person.id);
    expect(delHost).toBe('ok');
  });
});

describe('back office (host-only bookkeeping)', () => {
  it('stores admin fields, isolated per family, never in the member snapshot', async () => {
    const p = await addPerson(scopeA, { name: 'Dues Person' } as never);
    await updateAdmin(scopeA, p.person.id, { duesStatus: 'paid', duesAmount: 5000, note: 'ok' });

    const ledger = await getAdminLedger(scopeA);
    const row = ledger.find((r) => r.personId === p.person.id)!;
    expect(row.duesStatus).toBe('paid');
    expect(row.duesAmount).toBe(5000);
    expect(row.note).toBe('ok');

    // family B can't write to family A's person
    const cross = await updateAdmin(scopeB, p.person.id, { duesStatus: 'unpaid' });
    expect(cross).toBe(false);

    // admin data never leaks into the normal member snapshot shape
    const snap = await getSnapshot(scopeA);
    const snapPerson = snap.people.find((sp) => sp.id === p.person.id)!;
    expect('duesStatus' in snapPerson).toBe(false);
    expect('note' in snapPerson).toBe(false);
  });
});
