import type { Person, Union } from '@roots/shared';

/**
 * Radial force-ish layout: the eldest root sits near the center and each
 * generation is pushed onto a ring, with children clustered in the angular
 * wedge of their parent. Branches naturally clump into nebula-like groups —
 * compact and constellation-like at any size, unlike the flat band layout.
 *
 * Deterministic (no RNG, no animation) so every device draws the same sky.
 * This is the alternative engine, selected via VITE_LAYOUT=force.
 */

export interface ForcePositions {
  pos: Map<string, { x: number; y: number }>;
  generation: Map<string, number>;
}

const RING_GAP = 230; // radius added per generation
const ROOT_RADIUS = 150; // first ring radius

export function forceLayout(
  people: Person[],
  unions: Union[],
  gen: Map<string, number>,
  childrenOf: Map<string, string[]>,
  unionsById: Map<string, Union>,
  partnerUnions: Map<string, string[]>,
): ForcePositions {
  const pos = new Map<string, { x: number; y: number }>();

  // The matriarch/eldest root = lowest generation, fewest ancestors. Pick gen-0
  // person who parents the most (most central).
  const roots = people.filter((p) => (gen.get(p.id) ?? 0) === 0);
  // children of a person = kids across all unions they're a partner in
  const kidsOf = (pid: string): string[] => {
    const out: string[] = [];
    for (const uid of partnerUnions.get(pid) ?? []) out.push(...(childrenOf.get(uid) ?? []));
    return out;
  };

  const root =
    roots.slice().sort((a, b) => kidsOf(b.id).length - kidsOf(a.id).length)[0] ?? roots[0];
  if (!root) return { pos, generation: gen };

  // Assign each person an angular slot. Walk the tree from root; each node gets
  // an [a0, a1] angular span; its children split that span proportional to their
  // own subtree leaf-count so dense branches get more arc.
  const subtreeLeaves = new Map<string, number>();
  const computeLeaves = (pid: string, seen: Set<string>): number => {
    if (seen.has(pid)) return 1;
    seen.add(pid);
    const kids = kidsOf(pid);
    if (kids.length === 0) {
      subtreeLeaves.set(pid, 1);
      return 1;
    }
    let total = 0;
    for (const k of kids) total += computeLeaves(k, seen);
    subtreeLeaves.set(pid, total);
    return total;
  };
  computeLeaves(root.id, new Set());

  const placed = new Set<string>();
  const place = (pid: string, a0: number, a1: number, depth: number) => {
    if (placed.has(pid)) return;
    placed.add(pid);
    const mid = (a0 + a1) / 2;
    const radius = depth === 0 ? 0 : ROOT_RADIUS + (depth - 1) * RING_GAP;
    pos.set(pid, { x: Math.cos(mid) * radius, y: Math.sin(mid) * radius });

    const kids = kidsOf(pid).filter((k) => !placed.has(k));
    if (kids.length === 0) return;
    const totalLeaves = kids.reduce((s, k) => s + (subtreeLeaves.get(k) ?? 1), 0) || 1;
    // give children a slightly wider angular spread than the parent's own slot
    // at shallow depth so the first ring fans nicely around the center
    let cursor = a0;
    for (const k of kids) {
      const frac = (subtreeLeaves.get(k) ?? 1) / totalLeaves;
      const span = (a1 - a0) * frac;
      place(k, cursor, cursor + span, depth + 1);
      cursor += span;
    }
  };

  // root owns the full circle
  place(root.id, 0, Math.PI * 2, 0);

  // place anyone disconnected from the root (other gen-0 roots, orphans) on an
  // outer arc so they're still visible
  let stray = 0;
  for (const p of people) {
    if (pos.has(p.id)) continue;
    const ang = (stray * 2.399963) % (Math.PI * 2); // golden-angle scatter
    const r = ROOT_RADIUS + 2 * RING_GAP + (stray % 3) * 60;
    pos.set(p.id, { x: Math.cos(ang) * r, y: Math.sin(ang) * r });
    stray++;
  }

  return { pos, generation: gen };
}
