import { useCallback, useState } from 'react';
import type { Person } from '@roots/shared';
import { SkyShell } from '../components/SkyShell';
import { fixturePeople, fixtureUnions } from '../layout/fixtures';

/** Static demo sky from fixtures — no backend. Used at `/` and by Phase 1 tests. */
export function DemoView() {
  const [people, setPeople] = useState<Person[]>(fixturePeople);
  const [ignitingId, setIgnitingId] = useState<string | null>(null);

  const lightUp = useCallback((personId: string) => {
    setIgnitingId(personId);
    setPeople((prev) =>
      prev.map((p) =>
        p.id === personId ? { ...p, claimed: true, claimedAt: new Date().toISOString() } : p,
      ),
    );
    globalThis.setTimeout(() => setIgnitingId(null), 2000);
  }, []);

  return (
    <SkyShell
      people={people}
      unions={fixtureUnions}
      ignitingId={ignitingId}
      onLightUp={lightUp}
    />
  );
}
