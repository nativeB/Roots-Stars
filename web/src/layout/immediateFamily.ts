import type { Person, Union } from '@roots/shared';

export type Relation = 'parent' | 'partner' | 'child' | 'sibling';

export interface Relative {
  person: Person;
  relation: Relation;
  label: string; // e.g. "Mother", "Son", "Sister", "Partner"
}

export interface ImmediateFamily {
  focus: Person;
  parents: Relative[];
  partners: Relative[];
  children: Relative[];
  siblings: Relative[];
}

/**
 * Everyone one hop from the focal person, grouped by role. This is all the
 * focus/walk view ever needs to render at once — never the whole 93-node graph.
 */
export function immediateFamily(
  focusId: string,
  people: Person[],
  unions: Union[],
): ImmediateFamily | null {
  const byId = new Map(people.map((p) => [p.id, p]));
  const focus = byId.get(focusId);
  if (!focus) return null;

  const parents: Relative[] = [];
  const partners: Relative[] = [];
  const children: Relative[] = [];
  const siblings: Relative[] = [];
  const seen = new Set<string>([focusId]);

  // parents (+ siblings via shared parent union)
  if (focus.parentUnionId) {
    const pu = unions.find((u) => u.id === focus.parentUnionId);
    for (const pid of [pu?.partnerAId, pu?.partnerBId]) {
      const p = pid ? byId.get(pid) : undefined;
      if (p && !seen.has(p.id)) {
        seen.add(p.id);
        parents.push({ person: p, relation: 'parent', label: 'Parent' });
      }
    }
    // siblings share the same parent union
    for (const p of people) {
      if (p.id !== focusId && p.parentUnionId === focus.parentUnionId && !seen.has(p.id)) {
        seen.add(p.id);
        siblings.push({ person: p, relation: 'sibling', label: 'Sibling' });
      }
    }
  }

  // partners + children (via unions this person is in)
  for (const u of unions) {
    const isA = u.partnerAId === focusId;
    const isB = u.partnerBId === focusId;
    if (!isA && !isB) continue;
    const otherId = isA ? u.partnerBId : u.partnerAId;
    const other = otherId ? byId.get(otherId) : undefined;
    if (other && !seen.has(other.id)) {
      seen.add(other.id);
      partners.push({ person: other, relation: 'partner', label: 'Partner' });
    }
    for (const p of people) {
      if (p.parentUnionId === u.id && !seen.has(p.id)) {
        seen.add(p.id);
        children.push({ person: p, relation: 'child', label: 'Child' });
      }
    }
  }

  return { focus, parents, partners, children, siblings };
}
