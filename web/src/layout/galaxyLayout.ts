import type { Person, Union } from '@roots/shared';

/**
 * 3D "floating galaxy" layout. The matriarch sits near the origin; each
 * generation drifts outward and the family branches fan into distinct angular
 * sectors of a sphere, so each lineage forms its own arm of stars in space.
 *
 * Fully deterministic (id-hashed jitter, no RNG) so the sky is identical on
 * every device and stable across renders.
 */

export interface Galaxy3DNode {
  personId: string;
  x: number;
  y: number;
  z: number;
  generation: number;
}

export interface Galaxy3DThread {
  id: string;
  kind: 'partner' | 'parent-child';
  a: [number, number, number];
  b: [number, number, number];
  childId?: string;
  unionId: string;
}

export interface Galaxy3DResult {
  nodes: Galaxy3DNode[];
  threads: Galaxy3DThread[];
  pos: Map<string, [number, number, number]>;
  radius: number; // bounding radius for camera framing
}

const RING_GAP = 16; // distance added per generation
const ROOT_RING = 14; // first generation's radius from center
const ARM_SPREAD = 0.5; // how wide each branch's angular sector fans (fraction of π)
const JITTER = 2.0; // organic scatter so it's a cloud, not a disc
const GEN_LIFT = 9; // vertical separation per generation (depth read)

function hash(id: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) / 0xffffffff) * 2 - 1; // [-1, 1)
}

export function galaxyLayout(people: Person[], unions: Union[]): Galaxy3DResult {
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const unionsById = new Map(unions.map((u) => [u.id, u]));
  const partnerUnions = new Map<string, string[]>();
  const childrenOf = new Map<string, string[]>();
  for (const u of unions) {
    for (const pid of [u.partnerAId, u.partnerBId]) {
      if (!pid) continue;
      (partnerUnions.get(pid) ?? partnerUnions.set(pid, []).get(pid)!).push(u.id);
    }
  }
  for (const p of people) {
    if (p.parentUnionId)
      (childrenOf.get(p.parentUnionId) ?? childrenOf.set(p.parentUnionId, []).get(p.parentUnionId)!).push(p.id);
  }

  const kidsOf = (pid: string): string[] => {
    const out: string[] = [];
    for (const uid of partnerUnions.get(pid) ?? []) out.push(...(childrenOf.get(uid) ?? []));
    return out;
  };

  // generation via longest path from roots
  const gen = new Map<string, number>();
  const roots = people.filter((p) => !p.parentUnionId);
  const queue: Array<[string, number]> = roots.map((r) => [r.id, 0]);
  const seenGen = new Set<string>();
  while (queue.length) {
    const [id, gN] = queue.shift()!;
    if ((gen.get(id) ?? -1) >= gN && seenGen.has(id)) continue;
    gen.set(id, Math.max(gen.get(id) ?? 0, gN));
    seenGen.add(id);
    for (const k of kidsOf(id)) queue.push([k, gN + 1]);
  }
  for (const p of people) if (!gen.has(p.id)) gen.set(p.id, 0);

  // pick the most-connected root as the center anchor
  const root =
    roots.slice().sort((a, b) => kidsOf(b.id).length - kidsOf(a.id).length)[0] ?? people[0];
  const pos = new Map<string, [number, number, number]>();

  // leaf counts for proportional angular spread
  const leaves = new Map<string, number>();
  const countLeaves = (pid: string, seen: Set<string>): number => {
    if (seen.has(pid)) return 1;
    seen.add(pid);
    const kids = kidsOf(pid);
    if (!kids.length) {
      leaves.set(pid, 1);
      return 1;
    }
    let t = 0;
    for (const k of kids) t += countLeaves(k, seen);
    leaves.set(pid, t);
    return t;
  };
  if (root) countLeaves(root.id, new Set());

  const placed = new Set<string>();
  // theta = around the vertical axis, phi = tilt above/below the equator.
  // Children inherit their parent's direction and fan around it, so each branch
  // forms a coherent arm reaching out into its own region of space.
  const place = (pid: string, theta: number, phi: number, depth: number) => {
    if (placed.has(pid)) return;
    placed.add(pid);
    const r = depth === 0 ? 0 : ROOT_RING + (depth - 1) * RING_GAP;
    const jx = hash(pid, 1) * JITTER;
    const jy = hash(pid, 2) * JITTER;
    const jz = hash(pid, 3) * JITTER;
    // full spherical → cartesian so arms reach in true 3D, plus a per-generation
    // downward lift so older generations sit "above" younger ones (depth read).
    const x = Math.cos(theta) * Math.cos(phi) * r + jx;
    const y = Math.sin(phi) * r - depth * GEN_LIFT + jy;
    const z = Math.sin(theta) * Math.cos(phi) * r + jz;
    pos.set(pid, [x, y, z]);

    const kids = kidsOf(pid).filter((k) => !placed.has(k));
    if (!kids.length) return;
    const total = kids.reduce((s, k) => s + (leaves.get(k) ?? 1), 0) || 1;
    const arc = depth === 0 ? Math.PI * 2 : Math.PI * ARM_SPREAD;
    let cursor = theta - arc / 2;
    for (const k of kids) {
      const frac = (leaves.get(k) ?? 1) / total;
      const span = arc * frac;
      const childTheta = cursor + span / 2;
      // gen-0 children each get their own latitude band so the nine branches
      // splay across the sphere instead of collapsing onto one plane.
      const childPhi =
        depth === 0
          ? (hash(k, 5) * 0.9) // distinct tilt per branch arm
          : phi + hash(k, 7) * 0.45;
      place(k, childTheta, childPhi, depth + 1);
      cursor += span;
    }
  };

  if (root) place(root.id, 0, 0, 0);

  // strays (disconnected roots/orphans) on a golden-angle outer shell
  let s = 0;
  for (const p of people) {
    if (pos.has(p.id)) continue;
    const theta = s * 2.399963;
    const phi = (hash(p.id, 9)) * 1.2;
    const r = ROOT_RING + 2 * RING_GAP;
    pos.set(p.id, [
      Math.cos(theta) * Math.cos(phi) * r,
      Math.sin(phi) * r * 0.6 + 3 * 2.5,
      Math.sin(theta) * Math.cos(phi) * r,
    ]);
    s++;
  }

  // materialize
  const nodes: Galaxy3DNode[] = people.map((p) => {
    const [x, y, z] = pos.get(p.id)!;
    return { personId: p.id, x, y, z, generation: gen.get(p.id) ?? 0 };
  });

  const threads: Galaxy3DThread[] = [];
  for (const u of unions) {
    const a = pos.get(u.partnerAId);
    if (!a) continue;
    if (u.partnerBId) {
      const b = pos.get(u.partnerBId);
      if (b) threads.push({ id: 'pt:' + u.id, kind: 'partner', a, b, unionId: u.id });
    }
    const anchor = a; // single parent or partnerA as the branch origin
    for (const childId of childrenOf.get(u.id) ?? []) {
      const c = pos.get(childId);
      if (c) threads.push({ id: `pc:${u.id}:${childId}`, kind: 'parent-child', a: anchor, b: c, childId, unionId: u.id });
    }
  }

  // bounding radius
  let radius = 1;
  for (const [, [x, y, z]] of pos) radius = Math.max(radius, Math.hypot(x, y, z));

  return { nodes, threads, pos, radius };
}
