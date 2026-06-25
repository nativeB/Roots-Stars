import { lazy, Suspense, useState } from 'react';
import type { Person, PersonCardFields, RelationshipKind, Union } from '@roots/shared';
import { Sky } from './Sky/Sky';

// 3D galaxy is heavy (Three.js) — load it only when selected.
const Galaxy3D = lazy(() => import('./Galaxy/Galaxy3D').then((m) => ({ default: m.Galaxy3D })));
const USE_GALAXY = (import.meta.env?.VITE_LAYOUT ?? 'galaxy') === 'galaxy';
import { SkyHeader } from './SkyHeader';
import { SkyCelebration } from './SkyCelebration';
import { PersonCard } from './Card/PersonCard';
import { ClaimFlow } from './Claim/ClaimFlow';
import { AccessibleList } from './ListView/AccessibleList';
import { AddRelativeFlow } from './Relate/AddRelativeFlow';
import { AddYourStarFlow } from './Relate/AddYourStarFlow';

interface SkyShellProps {
  people: Person[];
  unions: Union[];
  ignitingId: string | null;
  familyName?: string;
  /** this device's home/"you are here" star */
  meId?: string | null;
  /** resolve a person's photo URL (orb, card, list). */
  photoUrlFor?: (personId: string) => string | undefined;
  onLightUp: (personId: string, opts?: { editPin?: string }) => void;
  /** Live-mode actions. When omitted (demo), the card is read-only. */
  onSave?: (
    personId: string,
    fields: Partial<PersonCardFields>,
    opts?: { editPin?: string; setEditPin?: string | null },
  ) => Promise<void> | void;
  onAddRelative?: (args: {
    name: string;
    relationship: RelationshipKind;
    anchorPersonId: string;
    otherParentId?: string;
  }) => Promise<void> | void;
  onUploadPhoto?: (personId: string, blob: Blob) => Promise<void>;
  onDelete?: (personId: string) => Promise<void> | void;
  /** top-level "Add your star": create + attach + light the new visitor's own star */
  onAddYourStar?: (args: {
    name: string;
    anchorPersonId: string;
    relationship: RelationshipKind;
    photo?: Blob;
  }) => Promise<void> | void;
  /** force the 2D constellation (used by the demo/tests regardless of VITE_LAYOUT) */
  force2D?: boolean;
  footer?: React.ReactNode;
}

/** The shared constellation chrome reused by the demo and live views. */
export function SkyShell({
  people,
  unions,
  ignitingId,
  familyName,
  meId,
  photoUrlFor,
  onLightUp,
  onSave,
  onAddRelative,
  onUploadPhoto,
  onDelete,
  onAddYourStar,
  force2D,
  footer,
}: SkyShellProps) {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);
  const [addAnchor, setAddAnchor] = useState<Person | null>(null);
  const [addingSelf, setAddingSelf] = useState(false);
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
      ) : USE_GALAXY && !force2D ? (
        <Suspense fallback={<div className="absolute inset-0 bg-space-deep" />}>
          <Galaxy3D
            people={people}
            unions={unions}
            focusedId={focusedId}
            ignitingId={ignitingId}
            meId={meId ?? null}
            photoUrlFor={photoUrlFor}
            onSelect={(id) => setFocusedId(id || null)}
          />
        </Suspense>
      ) : (
        <Sky
          people={people}
          unions={unions}
          focusedId={focusedId}
          ignitingId={ignitingId}
          meId={meId ?? null}
          photoUrlFor={photoUrlFor}
          onSelect={setFocusedId}
        />
      )}

      {/* "Find me" — re-center on this device's home star (returning visitor) */}
      {!showList && meId && !focused && (
        <button
          onClick={() => setFocusedId(meId)}
          className="pointer-events-auto absolute right-4 top-[104px] z-30 flex items-center gap-1.5 rounded-full border border-glow-gold/30 bg-glow-gold/10 px-3 py-1.5 text-xs font-medium text-glow-gold backdrop-blur-md transition hover:bg-glow-gold/20"
          data-testid="find-me"
        >
          <span aria-hidden>✦</span> Find me
        </button>
      )}

      {/* claimed star → read-only card */}
      <PersonCard
        person={viewTarget}
        takesAfterName={
          viewTarget?.takesAfterId
            ? (people.find((p) => p.id === viewTarget.takesAfterId)?.name ?? null)
            : null
        }
        people={people}
        photoUrl={viewTarget ? photoUrlFor?.(viewTarget.id) : undefined}
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
          onLightUp={async (id, fields, opts) => {
            if (onSave) await onSave(id, fields);
            onLightUp(id, { editPin: opts.editPin });
            setFocusedId(null);
            if (opts.photo && onUploadPhoto) void onUploadPhoto(id, opts.photo); // fire-and-forget
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

      {/* top-level "Add your star" self-attach flow */}
      {addingSelf && onAddYourStar && (
        <AddYourStarFlow
          people={people}
          onClose={() => setAddingSelf(false)}
          onAdd={onAddYourStar}
        />
      )}

      {/* warm empty state */}
      {!showList && people.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-8 text-center">
          <p className="font-display text-2xl text-starlight">No one here yet</p>
          <p className="mt-2 max-w-xs font-body text-muted">
            Add the first star and the sky begins to glow.
          </p>
        </div>
      )}

      {/* footer: invite nudge (if provided) above the Add-your-star pill */}
      {!showList && (
        <div className="absolute inset-x-0 bottom-4 z-10 flex flex-col items-center gap-2.5 px-5">
          {footer}
          {onAddYourStar ? (
            <button
              onClick={() => setAddingSelf(true)}
              className="pointer-events-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-full border border-glow-gold/40 bg-glow-gold/10 py-3.5 font-body font-semibold text-glow-gold backdrop-blur-md transition hover:bg-glow-gold/20"
              data-testid="add-your-star"
            >
              ✦ Add your star
            </button>
          ) : (
            !footer && (
              <p className="pointer-events-none text-center font-body text-sm text-muted">
                Find yourself, or add your star ✦
              </p>
            )
          )}
        </div>
      )}

      <SkyCelebration litCount={litCount} totalCount={people.length} />
    </main>
  );
}
