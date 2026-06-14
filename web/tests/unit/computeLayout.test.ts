import { describe, expect, it } from 'vitest';
import type { Person, Union } from '@roots/shared';
import { computeLayout } from '../../src/layout/computeLayout';
import { computeLineage } from '../../src/layout/lineagePath';
import { fixturePeople, fixtureUnions } from '../../src/layout/fixtures';

describe('computeLayout', () => {
  it('positions every person and emits threads for partners + children', () => {
    const layout = computeLayout(fixturePeople, fixtureUnions);
    expect(layout.nodes).toHaveLength(fixturePeople.length);
    // partner threads (3 unions, 2 have two partners → Edith+Walter, Walter+Carol, Maya+Devon)
    const partnerThreads = layout.threads.filter((t) => t.kind === 'partner');
    expect(partnerThreads.length).toBe(3);
    // parent-child threads: Maya, Theo (E+W), Iris (W+C), Juniper, Rowan (M+D) = 5
    const pcThreads = layout.threads.filter((t) => t.kind === 'parent-child');
    expect(pcThreads.length).toBe(5);
  });

  it('places half-siblings in different parent unions but the same generation band', () => {
    const layout = computeLayout(fixturePeople, fixtureUnions);
    const maya = layout.nodes.find((n) => n.personId === 'maya')!;
    const iris = layout.nodes.find((n) => n.personId === 'iris')!;
    expect(maya.generation).toBe(iris.generation); // same band (gen 1)
  });

  it('handles 120+ nodes quickly (perf floor)', () => {
    const people: Person[] = [];
    const unions: Union[] = [];
    const now = '2026-06-14T00:00:00.000Z';
    // build a 3-generation balanced tree: 2 roots → 4 → 8 ... plus partners
    let id = 0;
    const mk = (parentUnionId: string | null): Person => ({
      id: `p${id++}`,
      familyId: 'perf',
      name: `Person ${id}`,
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
    });

    let frontier: string[] = [];
    // gen 0: 16 couples (32 people), then children fan out to 120+
    for (let i = 0; i < 16; i++) {
      const a = mk(null);
      const b = mk(null);
      people.push(a, b);
      const u: Union = {
        id: `u${i}`,
        familyId: 'perf',
        partnerAId: a.id,
        partnerBId: b.id,
        unionType: 'married',
        createdAt: now,
      };
      unions.push(u);
      frontier.push(u.id);
    }
    // gen 1 + 2: each union gets 4 children, half of whom pair up
    let uid = 100;
    for (let depth = 0; depth < 2; depth++) {
      const next: string[] = [];
      for (const pu of frontier) {
        const kids = [mk(pu), mk(pu), mk(pu), mk(pu)];
        people.push(...kids);
        if (depth === 0) {
          const u: Union = {
            id: `u${uid++}`,
            familyId: 'perf',
            partnerAId: kids[0]!.id,
            partnerBId: kids[1]!.id,
            unionType: 'partners',
            createdAt: now,
          };
          unions.push(u);
          next.push(u.id);
        }
      }
      frontier = next;
    }

    expect(people.length).toBeGreaterThan(120);
    const t0 = performance.now();
    const layout = computeLayout(people, unions);
    const ms = performance.now() - t0;
    expect(layout.nodes).toHaveLength(people.length);
    // should be well under a frame budget on CI; generous bound
    expect(ms).toBeLessThan(500);
  });
});

describe('computeLineage', () => {
  it('traces a child up through both parents to the eldest ancestors', () => {
    // Juniper → Maya+Devon union → Maya → Edith+Walter union; Devon has no parents
    const segs = computeLineage('juniper', fixturePeople, fixtureUnions);
    const ids = segs.map((s) => s.threadId);
    expect(ids).toContain('pc:u_maya_devon:juniper'); // depth 0
    expect(ids).toContain('pc:u_edith_walter:maya'); // up Maya's line
    // depths increase up the tree
    const junSeg = segs.find((s) => s.threadId === 'pc:u_maya_devon:juniper')!;
    const mayaSeg = segs.find((s) => s.threadId === 'pc:u_edith_walter:maya')!;
    expect(mayaSeg.depth).toBeGreaterThan(junSeg.depth);
  });
});
