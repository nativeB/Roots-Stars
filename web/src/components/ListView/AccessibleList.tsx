import { useMemo } from 'react';
import type { Person, Union } from '@roots/shared';

interface AccessibleListProps {
  people: Person[];
  unions: Union[];
  onSelect: (personId: string) => void;
}

/**
 * Non-visual fallback (a11y, non-negotiable): every person and how they connect,
 * as plain navigable text. Mirrors the constellation for screen readers / keyboard.
 */
export function AccessibleList({ people, unions, onSelect }: AccessibleListProps) {
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const unionsById = useMemo(() => new Map(unions.map((u) => [u.id, u])), [unions]);

  function relations(person: Person): string[] {
    const out: string[] = [];
    // parents
    if (person.parentUnionId) {
      const pu = unionsById.get(person.parentUnionId);
      const names = [pu?.partnerAId, pu?.partnerBId]
        .filter(Boolean)
        .map((id) => byId.get(id as string)?.name)
        .filter(Boolean);
      if (names.length) out.push(`Child of ${names.join(' & ')}`);
    }
    // partners
    for (const u of unions) {
      if (u.partnerAId === person.id && u.partnerBId)
        out.push(`Partner of ${byId.get(u.partnerBId)?.name ?? '—'}`);
      if (u.partnerBId === person.id)
        out.push(`Partner of ${byId.get(u.partnerAId)?.name ?? '—'}`);
    }
    return out;
  }

  return (
    <section aria-label="Family members, list view" className="mx-auto max-w-xl p-4 font-body">
      <h2 className="mb-3 font-display text-xl text-starlight">Everyone in the sky</h2>
      <ul className="space-y-2">
        {people.map((person) => (
          <li key={person.id}>
            <button
              onClick={() => onSelect(person.id)}
              className="w-full rounded-lg bg-space-panel/70 p-3 text-left text-starlight hover:bg-space-panel"
            >
              <span className="font-display text-base">
                {person.signatureEmoji ? `${person.signatureEmoji} ` : ''}
                {person.name}
                {person.claimed ? '' : ' (unclaimed)'}
              </span>
              {relations(person).length > 0 && (
                <span className="mt-1 block text-sm text-muted">
                  {relations(person).join(' · ')}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
