import type { Person, Union } from '@roots/shared';

/**
 * Compute the ordered list of parent-child thread ids from a person up through
 * every ancestor union (forking up both maternal and paternal lines). Each id
 * matches a PositionedThread.id of kind 'parent-child' (`pc:<unionId>:<childId>`),
 * so the ignite pulse can light exactly those threads, staggered by generation depth.
 *
 * Returns segments grouped by depth (depth 0 = the threads directly above the
 * claimed person) so the renderer can stagger the travelling pulse upward.
 */
export interface LineageSegment {
  threadId: string;
  depth: number;
}

export function computeLineage(
  startPersonId: string,
  people: Person[],
  unions: Union[],
): LineageSegment[] {
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const unionsById = new Map(unions.map((u) => [u.id, u]));

  const segments: LineageSegment[] = [];
  const seenThread = new Set<string>();
  // BFS up the ancestor DAG. Frontier holds [personId, depth].
  let frontier: Array<[string, number]> = [[startPersonId, 0]];
  const visitedPerson = new Set<string>([startPersonId]);

  while (frontier.length) {
    const next: Array<[string, number]> = [];
    for (const [personId, depth] of frontier) {
      const person = peopleById.get(personId);
      if (!person?.parentUnionId) continue;
      const union = unionsById.get(person.parentUnionId);
      if (!union) continue;

      // the thread leading from this person's parent-union down to them
      const threadId = `pc:${union.id}:${personId}`;
      if (!seenThread.has(threadId)) {
        seenThread.add(threadId);
        segments.push({ threadId, depth });
      }

      // fork up to both parents
      for (const parentId of [union.partnerAId, union.partnerBId]) {
        if (!parentId || visitedPerson.has(parentId)) continue;
        visitedPerson.add(parentId);
        next.push([parentId, depth + 1]);
      }
    }
    frontier = next;
  }

  return segments;
}
