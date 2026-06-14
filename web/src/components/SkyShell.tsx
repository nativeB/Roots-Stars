import { useState } from 'react';
import type { Person, Union } from '@roots/shared';
import { Sky } from './Sky/Sky';
import { PersonCard } from './Card/PersonCard';
import { AccessibleList } from './ListView/AccessibleList';

interface SkyShellProps {
  people: Person[];
  unions: Union[];
  ignitingId: string | null;
  familyName?: string;
  /** Light up (claim) a person; returns once the claim is initiated. */
  onLightUp: (personId: string) => void;
  /** Optional footer nudge slot (e.g. invite link). */
  footer?: React.ReactNode;
}

/** The shared constellation chrome reused by the demo and live views. */
export function SkyShell({
  people,
  unions,
  ignitingId,
  familyName,
  onLightUp,
  footer,
}: SkyShellProps) {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);
  const focused = people.find((p) => p.id === focusedId) ?? null;

  return (
    <main className="relative h-full w-full overflow-hidden bg-space-deep">
      <header className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex items-center justify-between p-4">
        <h1 className="font-display text-lg text-starlight">
          Roots <span className="text-glow-gold">&</span> Stars
          {familyName ? <span className="ml-2 text-sm text-muted">· {familyName}</span> : null}
        </h1>
        <button
          className="pointer-events-auto rounded-full bg-space-panel/80 px-3 py-1.5 text-sm text-starlight backdrop-blur"
          onClick={() => setShowList((s) => !s)}
          aria-pressed={showList}
        >
          {showList ? '✦ Sky' : '☰ List'}
        </button>
      </header>

      {showList ? (
        <div className="absolute inset-0 overflow-auto pt-16">
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

      <PersonCard
        person={focused}
        onClose={() => setFocusedId(null)}
        onLightUp={(id) => {
          onLightUp(id);
          setFocusedId(null);
        }}
      />

      {footer ?? (
        <p className="pointer-events-none absolute bottom-4 left-0 right-0 z-10 text-center font-body text-sm text-muted">
          Find yourself, or add your star ✦
        </p>
      )}
    </main>
  );
}
