import { useCallback, useState } from 'react';
import type { Person } from '@roots/shared';
import { SkyShell } from '../components/SkyShell';
import { DEMO_FAMILY_NAME, fixturePeople, fixtureUnions } from '../layout/fixtures';

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

  // merge edited/claim-flow fields locally so the demo reflects them
  const save = useCallback((personId: string, fields: Record<string, unknown>) => {
    setPeople((prev) => prev.map((p) => (p.id === personId ? { ...p, ...fields } : p)));
  }, []);

  return (
    <SkyShell
      people={people}
      unions={fixtureUnions}
      ignitingId={ignitingId}
      familyName={DEMO_FAMILY_NAME}
      onLightUp={lightUp}
      onSave={save}
    />
  );
}
