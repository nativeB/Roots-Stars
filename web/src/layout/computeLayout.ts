import type {
  LayoutResult,
  Person,
  PositionedNode,
  PositionedThread,
  Union,
  UnionAnchor,
} from '@roots/shared';
import { forceLayout } from './forceLayout';

/**
 * Generational-band layout for a UNION-BASED family graph (a multi-root DAG).
 *
 * d3.tree can't consume this graph directly (a union has two parents; partners
 * cross-link a generation). So we do it in passes:
 *   0. Generation assignment (longest-path layering; partners share a band).
 *   1. Within-band ordering (barycenter sweeps; partners kept adjacent).
 *   2. X-coordinates (parents centered over their children's span) + thread paths.
 *
 * Deterministic id-hashed jitter gives the "constellation scatter" while keeping
 * the layout identical across devices.
 */

const BAND_HEIGHT = 300; // vertical distance between generations
const LEAF_GAP = 86; // horizontal slot width per leaf (tight sibling clustering)
const PARTNER_GAP = 104; // gap between two partners in a union
const JITTER_X = 12;
const JITTER_Y = 34;
const MAX_RELAX_ITERS = 12;

const LAYOUT_MODE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LAYOUT) || 'tree';

/** Stable, deterministic pseudo-random in [-1, 1] from a string id. */
function hashUnit(id: string, salt: string): number {
  let h = 2166136261;
  const s = id + '|' + salt;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // map to [-1, 1)
  return ((h >>> 0) / 0xffffffff) * 2 - 1;
}

interface Graph {
  peopleById: Map<string, Person>;
  unionsById: Map<string, Union>;
  /** unions a person participates in as a partner */
  partnerUnions: Map<string, string[]>;
  /** children grouped by their parentUnionId */
  childrenOf: Map<string, string[]>;
}

function buildGraph(people: Person[], unions: Union[]): Graph {
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const unionsById = new Map(unions.map((u) => [u.id, u]));
  const partnerUnions = new Map<string, string[]>();
  const childrenOf = new Map<string, string[]>();

  for (const u of unions) {
    for (const pid of [u.partnerAId, u.partnerBId]) {
      if (!pid) continue;
      const arr = partnerUnions.get(pid) ?? [];
      arr.push(u.id);
      partnerUnions.set(pid, arr);
    }
  }
  for (const p of people) {
    if (p.parentUnionId) {
      const arr = childrenOf.get(p.parentUnionId) ?? [];
      arr.push(p.id);
      childrenOf.set(p.parentUnionId, arr);
    }
  }
  return { peopleById, unionsById, partnerUnions, childrenOf };
}

/** Pass 0: assign each person a generation. Partners are pulled to the same band. */
function assignGenerations(people: Person[], g: Graph): Map<string, number> {
  const gen = new Map<string, number>();
  // roots: no parent union
  for (const p of people) if (!p.parentUnionId) gen.set(p.id, 0);

  // longest-path: relax child = parent + 1, and partners = max(of the pair)
  for (let iter = 0; iter < MAX_RELAX_ITERS; iter++) {
    let changed = false;

    // children one band below their parent union's partners
    for (const u of g.unionsById.values()) {
      const parents = [u.partnerAId, u.partnerBId].filter(Boolean) as string[];
      const parentGen = Math.max(...parents.map((pid) => gen.get(pid) ?? 0));
      for (const childId of g.childrenOf.get(u.id) ?? []) {
        const target = parentGen + 1;
        if ((gen.get(childId) ?? -Infinity) < target) {
          gen.set(childId, target);
          changed = true;
        }
      }
    }

    // partners share a band (married-in person inherits the higher generation)
    for (const u of g.unionsById.values()) {
      if (!u.partnerBId) continue;
      const a = gen.get(u.partnerAId);
      const b = gen.get(u.partnerBId);
      const max = Math.max(a ?? 0, b ?? 0);
      if (a !== max) {
        gen.set(u.partnerAId, max);
        changed = true;
      }
      if (b !== max) {
        gen.set(u.partnerBId, max);
        changed = true;
      }
    }

    if (!changed) break;
  }

  // anyone still unassigned (isolated) → band 0
  for (const p of people) if (!gen.has(p.id)) gen.set(p.id, 0);
  return gen;
}

/**
 * A unit is what we order within a band: either a single person or a partner pair
 * (a union whose partners are in this band). Children fan beneath a unit's anchor.
 */
interface Unit {
  key: string;
  members: string[]; // 1 or 2 person ids, left-to-right
  unionId?: string; // the union this unit represents (for partner pairs)
}

function buildUnitsPerBand(people: Person[], g: Graph, gen: Map<string, number>): Map<number, Unit[]> {
  const bands = new Map<number, Unit[]>();
  const consumed = new Set<string>();

  // partner-pair units first (both partners in the same band)
  for (const u of g.unionsById.values()) {
    if (!u.partnerBId) continue;
    const ga = gen.get(u.partnerAId);
    const gb = gen.get(u.partnerBId);
    if (ga === undefined || ga !== gb) continue;
    if (consumed.has(u.partnerAId) || consumed.has(u.partnerBId)) continue;
    consumed.add(u.partnerAId);
    consumed.add(u.partnerBId);
    const arr = bands.get(ga) ?? [];
    arr.push({ key: 'pair:' + u.id, members: [u.partnerAId, u.partnerBId], unionId: u.id });
    bands.set(ga, arr);
  }

  // remaining single people (incl. single parents)
  for (const p of people) {
    if (consumed.has(p.id)) continue;
    const band = gen.get(p.id) ?? 0;
    // if this person is a single parent, attach their solo union to the unit
    const soloUnion = (g.partnerUnions.get(p.id) ?? [])
      .map((uid) => g.unionsById.get(uid)!)
      .find((u) => !u.partnerBId);
    const arr = bands.get(band) ?? [];
    arr.push({ key: 'solo:' + p.id, members: [p.id], unionId: soloUnion?.id });
    bands.set(band, arr);
  }

  return bands;
}

export function computeLayout(people: Person[], unions: Union[]): LayoutResult {
  const g = buildGraph(people, unions);
  const gen = assignGenerations(people, g);

  const nodes: PositionedNode[] = [];
  const personPos = new Map<string, { x: number; y: number }>();

  const place = (personId: string, x: number, y: number) => {
    const jx = hashUnit(personId, 'x') * JITTER_X;
    const jy = hashUnit(personId, 'y') * JITTER_Y;
    const px = x + jx;
    const py = y + jy;
    personPos.set(personId, { x: px, y: py });
    const person = g.peopleById.get(personId)!;
    nodes.push({ personId, x: px, y: py, generation: gen.get(personId) ?? 0, claimed: person.claimed });
  };

  if (LAYOUT_MODE === 'force') {
    // ── radial / nebula layout ──
    const { pos } = forceLayout(people, unions, gen, g.childrenOf, g.unionsById, g.partnerUnions);
    for (const [pid, p] of pos) place(pid, p.x, p.y);
  } else {
    // ── tidy-tree layout (default): tight sibling clusters under each parent ──
    treeLayout(people, g, gen, place);
  }

  return buildThreadsAndBounds(unions, g, personPos, nodes);
}

/**
 * Tidy-tree x-assignment. Leaves consume one slot; parents center over their
 * children; partner pairs sit side by side. Width = sum of leaf slots, so
 * siblings cluster tightly under their parent instead of spreading across the
 * whole band. Runs a couple of barycenter sweeps first to order within bands.
 */
function treeLayout(
  people: Person[],
  g: Graph,
  gen: Map<string, number>,
  place: (id: string, x: number, y: number) => void,
) {
  const bands = buildUnitsPerBand(people, g, gen);
  const sortedGens = [...bands.keys()].sort((a, b) => a - b);

  const unitOfPerson = new Map<string, Unit>();
  for (const units of bands.values())
    for (const u of units) for (const m of u.members) unitOfPerson.set(m, u);

  const unitX = new Map<string, number>();
  for (const band of sortedGens) bands.get(band)!.forEach((u, i) => unitX.set(u.key, i));

  const barycenter = (u: Unit): number | null => {
    const xs: number[] = [];
    for (const m of u.members) {
      const person = g.peopleById.get(m)!;
      if (person.parentUnionId) {
        const pu = g.unionsById.get(person.parentUnionId);
        for (const pid of [pu?.partnerAId, pu?.partnerBId]) {
          const pUnit = pid ? unitOfPerson.get(pid) : undefined;
          if (pUnit) xs.push(unitX.get(pUnit.key) ?? 0);
        }
      }
      for (const uid of g.partnerUnions.get(m) ?? [])
        for (const childId of g.childrenOf.get(uid) ?? []) {
          const cUnit = unitOfPerson.get(childId);
          if (cUnit) xs.push(unitX.get(cUnit.key) ?? 0);
        }
    }
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  };

  // order within bands to reduce crossings
  for (let sweep = 0; sweep < 4; sweep++) {
    const order = sweep % 2 === 0 ? sortedGens : [...sortedGens].reverse();
    for (const band of order) {
      const units = bands.get(band)!;
      const withB = units.map((u) => ({ u, b: barycenter(u) ?? unitX.get(u.key) ?? 0 }));
      withB.sort((a, b) => a.b - b.b);
      withB.forEach((w, i) => unitX.set(w.u.key, i));
      bands.set(band, withB.map((w) => w.u));
    }
  }

  // tidy-tree packing: assign each unit an x by walking generations bottom-up.
  // A unit with children centers over them; a childless unit takes the next slot.
  const finalX = new Map<string, number>();
  let cursor = 0;
  const childUnitsOf = (u: Unit): Unit[] => {
    const out: Unit[] = [];
    const seen = new Set<string>();
    for (const m of u.members)
      for (const uid of g.partnerUnions.get(m) ?? [])
        for (const childId of g.childrenOf.get(uid) ?? []) {
          const cu = unitOfPerson.get(childId);
          if (cu && !seen.has(cu.key)) {
            seen.add(cu.key);
            out.push(cu);
          }
        }
    return out;
  };

  const assigned = new Set<string>();
  const assign = (u: Unit): number => {
    if (finalX.has(u.key)) return finalX.get(u.key)!;
    assigned.add(u.key);
    const kids = childUnitsOf(u).filter((k) => !assigned.has(k.key));
    if (kids.length === 0) {
      const x = cursor;
      cursor += LEAF_GAP;
      finalX.set(u.key, x);
      return x;
    }
    const kidXs = kids.map((k) => assign(k));
    const x = (Math.min(...kidXs) + Math.max(...kidXs)) / 2;
    finalX.set(u.key, x);
    return x;
  };

  // start from the topmost band's units (roots), left to right
  for (const u of bands.get(sortedGens[0]!) ?? []) assign(u);
  // any unit not reached (disconnected) gets appended
  for (const band of sortedGens) for (const u of bands.get(band)!) if (!finalX.has(u.key)) assign(u);

  // de-overlap each band so packed parents don't collide
  for (const band of sortedGens) {
    const ordered = [...bands.get(band)!].sort((a, b) => (finalX.get(a.key) ?? 0) - (finalX.get(b.key) ?? 0));
    for (let i = 1; i < ordered.length; i++) {
      const prev = finalX.get(ordered[i - 1]!.key) ?? 0;
      if ((finalX.get(ordered[i]!.key) ?? 0) - prev < LEAF_GAP)
        finalX.set(ordered[i]!.key, prev + LEAF_GAP);
    }
  }

  for (const band of sortedGens) {
    const y = band * BAND_HEIGHT;
    for (const u of bands.get(band)!) {
      const cx = finalX.get(u.key) ?? 0;
      if (u.members.length === 2) {
        place(u.members[0]!, cx - PARTNER_GAP / 2, y);
        place(u.members[1]!, cx + PARTNER_GAP / 2, y);
      } else {
        place(u.members[0]!, cx, y);
      }
    }
  }
}

/** Shared: build partner + parent-child threads and the layout bounds. */
function buildThreadsAndBounds(
  unions: Union[],
  g: Graph,
  personPos: Map<string, { x: number; y: number }>,
  nodes: PositionedNode[],
): LayoutResult {

  // ── Union anchors + threads ──
  const unionAnchors: UnionAnchor[] = [];
  const threads: PositionedThread[] = [];

  for (const u of unions) {
    const a = personPos.get(u.partnerAId);
    const b = u.partnerBId ? personPos.get(u.partnerBId) : undefined;
    if (!a) continue;

    // anchor: midpoint of partners (or just below a single parent), nudged down a touch
    const anchorX = b ? (a.x + b.x) / 2 : a.x;
    const anchorY = (b ? (a.y + b.y) / 2 : a.y) + 34;
    unionAnchors.push({ unionId: u.id, x: anchorX, y: anchorY });

    // partner thread: a gentle arc between the two stars
    if (b) {
      const midX = (a.x + b.x) / 2;
      const arcY = Math.min(a.y, b.y) - 14;
      threads.push({
        id: 'pt:' + u.id,
        kind: 'partner',
        unionId: u.id,
        d: `M ${a.x} ${a.y} Q ${midX} ${arcY} ${b.x} ${b.y}`,
      });
    }

    // parent-child threads: fan to each child. Top-down (tree) gets a short stem
    // then a curve; otherwise (radial) a single gentle quadratic toward the child.
    for (const childId of g.childrenOf.get(u.id) ?? []) {
      const c = personPos.get(childId);
      if (!c) continue;
      const below = c.y > anchorY + 30;
      let d: string;
      if (below) {
        const stemY = anchorY + 24;
        d = `M ${anchorX} ${anchorY} L ${anchorX} ${stemY} Q ${anchorX} ${(stemY + c.y) / 2} ${c.x} ${c.y}`;
      } else {
        // control point bowed perpendicular to the line for an organic arc
        const mx = (anchorX + c.x) / 2;
        const my = (anchorY + c.y) / 2;
        const dx = c.x - anchorX;
        const dy = c.y - anchorY;
        const len = Math.hypot(dx, dy) || 1;
        const bow = Math.min(40, len * 0.12);
        const cxp = mx + (-dy / len) * bow;
        const cyp = my + (dx / len) * bow;
        d = `M ${anchorX} ${anchorY} Q ${cxp} ${cyp} ${c.x} ${c.y}`;
      }
      threads.push({ id: `pc:${u.id}:${childId}`, kind: 'parent-child', unionId: u.id, childId, d });
    }
  }

  // ── Bounds (with padding for star glow) ──
  const pad = 80;
  const allX = nodes.map((n) => n.x);
  const allY = nodes.map((n) => n.y);
  const bounds = {
    minX: (allX.length ? Math.min(...allX) : 0) - pad,
    minY: (allY.length ? Math.min(...allY) : 0) - pad,
    maxX: (allX.length ? Math.max(...allX) : 0) + pad,
    maxY: (allY.length ? Math.max(...allY) : 0) + pad,
  };

  return { nodes, threads, unionAnchors, bounds };
}
