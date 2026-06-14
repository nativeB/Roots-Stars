import { useState } from 'react';
import type { Person, PersonCardFields, RelationshipKind, Union } from '@roots/shared';
import { Sky } from './Sky/Sky';
import { SkyHeader } from './SkyHeader';
import { SkyCelebration } from './SkyCelebration';
import { PersonCard } from './Card/PersonCard';
import { ClaimFlow } from './Claim/ClaimFlow';
import { AccessibleList } from './ListView/AccessibleList';
import { AddRelativeFlow } from './Relate/AddRelativeFlow';

interface SkyShellProps {
  people: Person[];
  unions: Union[];
  ignitingId: string | null;
  familyName?: string;
  onLightUp: (personId: string) => void;
  /** Live-mode actions. When omitted (demo), the card is read-only. */
  onSave?: (personId: string, fields: Partial<PersonCardFields>) => Promise<void> | void;
  onAddRelative?: (args: {
    name: string;
    relationship: RelationshipKind;
    anchorPersonId: string;
    otherParentId?: string;
  }) => Promise<void> | void;
  onUploadPhoto?: (personId: string, file: File) => Promise<void>;
  onDelete?: (personId: string) => Promise<void> | void;
  footer?: React.ReactNode;
}

/** The shared constellation chrome reused by the demo and live views. */
export function SkyShell({
  people,
  unions,
  ignitingId,
  familyName,
  onLightUp,
  onSave,
  onAddRelative,
  onUploadPhoto,
  onDelete,
  footer,
}: SkyShellProps) {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);
  const [addAnchor, setAddAnchor] = useState<Person | null>(null);
  const focused = people.find((p) => p.id === focusedId) ?? null;

  const litCount = people.filter((p) => p.claimed).length;

  // tapping an unclaimed star opens the "Light your star" claim flow;
  // a claimed star opens the read-only person card.
  const claimTarget = focused && !focused.claimed ? focused : null;
  const viewTarget = focused && focused.claimed ? focused : null;

  return (
    <main className="relative h-full w-full overflow-hidden bg-space-deep">
      <SkyHeader
        familyName={familyName ?? 'Our family'}
        litCount={litCount}
        totalCount={people.length}
        showList={showList}
        onToggleList={() => setShowList((s) => !s)}
      />

      {showList ? (
        <div className="absolute inset-0 overflow-auto pt-28">
          <AccessibleList people={people} unions={unions} onSelect={setFocusedId} />
        </div>
      ) : (
        <Sky
          people={people}
          unions={unions}
          focusedId={focusedId}
          ignitingId={ignitingId}
          onSelect={setFocusedId}
        />
      )}

      {/* claimed star → read-only card */}
      <PersonCard
        person={viewTarget}
        onClose={() => setFocusedId(null)}
        onLightUp={(id) => {
          onLightUp(id);
          setFocusedId(null);
        }}
        onSave={onSave}
        onUploadPhoto={onUploadPhoto}
        onDelete={onDelete}
        onAddRelative={
          onAddRelative
            ? (anchor) => {
                setAddAnchor(anchor);
                setFocusedId(null);
              }
            : undefined
        }
      />

      {/* unclaimed star → "Light your star" claim flow */}
      {claimTarget && (
        <ClaimFlow
          person={claimTarget}
          onClose={() => setFocusedId(null)}
          onLightUp={async (id, fields) => {
            if (onSave) await onSave(id, fields);
            onLightUp(id);
            setFocusedId(null);
          }}
        />
      )}

      {addAnchor && onAddRelative && (
        <AddRelativeFlow
          anchor={addAnchor}
          people={people}
          onClose={() => setAddAnchor(null)}
          onAdd={({ name, relationship, otherParentId }) =>
            onAddRelative({ name, relationship, anchorPersonId: addAnchor.id, otherParentId })
          }
        />
      )}

      {footer ?? (
        <p className="pointer-events-none absolute bottom-4 left-0 right-0 z-10 text-center font-body text-sm text-muted">
          Find yourself, or add your star ✦
        </p>
      )}

      <SkyCelebration litCount={litCount} totalCount={people.length} />
    </main>
  );
}
