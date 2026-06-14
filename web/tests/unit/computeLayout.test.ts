import { describe, expect, it } from 'vitest';
import type { Person, Union } from '@roots/shared';
import { computeLayout } from '../../src/layout/computeLayout';
import { computeLineage } from '../../src/layout/lineagePath';
import { fixturePeople, fixtureUnions } from '../../src/layout/fixtures';

describe('computeLayout', () => {
  it('positions every person and emits threads for partners + children', () => {
    const layout = computeLayout(fixturePeople, fixtureUnions);
    expect(layout.nodes).toHaveLength(fixturePeople.length);
    // 4 unions, all two-partner → 4 partner threads
    const partnerThreads = layout.threads.filter((t) => t.kind === 'partner');
    expect(partnerThreads.length).toBe(4);
    // parent-child threads: Kwame; Ama/Yaw/Adwoa; Esi; Kojo = 6
    const pcThreads = layout.threads.filter((t) => t.kind === 'parent-child');
    expect(pcThreads.length).toBe(6);
  });

  it('places siblings in the same parent union and generation band', () => {
    const layout = computeLayout(fixturePeople, fixtureUnions);
    const ama = layout.nodes.find((n) => n.personId === 'ama')!;
    const yaw = layout.nodes.find((n) => n.personId === 'yaw')!;
    const adwoa = layout.nodes.find((n) => n.personId === 'adwoa')!;
    expect(ama.generation).toBe(yaw.generation);
    expect(ama.generation).toBe(adwoa.generation); // all gen 2, share kwame+akosua
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
      locked: false,
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
    // Esi → Ama+Kofi union → Ama → Kwame+Akosua union → Kwame → Nana+Efua union
    const segs = computeLineage('esi', fixturePeople, fixtureUnions);
    const ids = segs.map((s) => s.threadId);
    expect(ids).toContain('pc:u_ama_kofi:esi'); // depth 0
    expect(ids).toContain('pc:u_kwame_akosua:ama'); // up Ama's line
    expect(ids).toContain('pc:u_nana_efuag:kwame'); // and further to the elders
    // depths increase up the tree
    const esiSeg = segs.find((s) => s.threadId === 'pc:u_ama_kofi:esi')!;
    const amaSeg = segs.find((s) => s.threadId === 'pc:u_kwame_akosua:ama')!;
    const kwameSeg = segs.find((s) => s.threadId === 'pc:u_nana_efuag:kwame')!;
    expect(amaSeg.depth).toBeGreaterThan(esiSeg.depth);
    expect(kwameSeg.depth).toBeGreaterThan(amaSeg.depth);
  });
});
