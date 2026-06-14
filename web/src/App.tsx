import { useCallback, useMemo, useState } from 'react';
import type { Person } from '@roots/shared';
import { Sky } from './components/Sky/Sky';
import { PersonCard } from './components/Card/PersonCard';
import { AccessibleList } from './components/ListView/AccessibleList';
import { fixturePeople, fixtureUnions } from './layout/fixtures';

/**
 * Phase 1 shell: renders the constellation from hardcoded fixtures with a stub
 * ignite-on-click. Live data, claiming, and realtime arrive in later phases.
 */
export function App() {
  const [people, setPeople] = useState<Person[]>(fixturePeople);
  const unions = fixtureUnions;

  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [ignitingId, setIgnitingId] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);

  const focused = useMemo(
    () => people.find((p) => p.id === focusedId) ?? null,
    [people, focusedId],
  );

  const lightUp = useCallback((personId: string) => {
    setIgnitingId(personId);
    setFocusedId(null);
    // mark claimed locally (stub for the real claim flow)
    setPeople((prev) =>
      prev.map((p) =>
        p.id === personId ? { ...p, claimed: true, claimedAt: new Date().toISOString() } : p,
      ),
    );
    // ignite lasts ~2s, then settles
    window.setTimeout(() => setIgnitingId(null), 2000);
  }, []);

  return (
    <main className="relative h-full w-full overflow-hidden bg-space-deep">
      {/* Header / brand */}
      <header className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex items-center justify-between p-4">
        <h1 className="font-display text-lg text-starlight">
          Roots <span className="text-glow-gold">&</span> Stars
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

      <PersonCard person={focused} onClose={() => setFocusedId(null)} onLightUp={lightUp} />

      {/* gentle first-visit nudge */}
      <p className="pointer-events-none absolute bottom-4 left-0 right-0 z-10 text-center font-body text-sm text-muted">
        Find yourself, or add your star ✦
      </p>
    </main>
  );
}
