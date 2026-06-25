import { useCallback, useState } from 'react';
import type { Person, RelationshipKind, Union } from '@roots/shared';
import { SkyShell } from '../components/SkyShell';
import { DEMO_FAMILY_NAME, fixturePeople, fixtureUnions } from '../layout/fixtures';

/** Static demo sky from fixtures — no backend. Used at `/` and by Phase 1 tests. */
export function DemoView() {
  const [people, setPeople] = useState<Person[]>(fixturePeople);
  const [unions, setUnions] = useState<Union[]>(fixtureUnions);
  const [ignitingId, setIgnitingId] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  // demo has no backend: keep picked photos as local object URLs so orbs show faces
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  const setLocalPhoto = useCallback((personId: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    setPhotoUrls((m) => ({ ...m, [personId]: url }));
    setPeople((prev) =>
      prev.map((p) => (p.id === personId ? { ...p, photoKey: 'local' } : p)),
    );
  }, []);

  const lightUp = useCallback((personId: string, opts?: { editPin?: string }) => {
    setIgnitingId(personId);
    setMeId(personId); // the star you light becomes your home base in the demo
    setPeople((prev) =>
      prev.map((p) =>
        p.id === personId
          ? {
              ...p,
              claimed: true,
              claimedAt: new Date().toISOString(),
              locked: Boolean(opts?.editPin) || p.locked,
            }
          : p,
      ),
    );
    globalThis.setTimeout(() => setIgnitingId(null), 2000);
  }, []);

  // merge edited/claim-flow fields locally so the demo reflects them
  const save = useCallback(
    (
      personId: string,
      fields: Record<string, unknown>,
      opts?: { editPin?: string; setEditPin?: string | null },
    ) => {
      setPeople((prev) =>
        prev.map((p) => {
          if (p.id !== personId) return p;
          const next = { ...p, ...fields };
          if (opts?.setEditPin !== undefined) next.locked = opts.setEditPin !== null;
          return next;
        }),
      );
    },
    [],
  );

  const blank = useCallback(
    (id: string, name: string, parentUnionId: string | null): Person => ({
      id,
      familyId: 'demo',
      name,
      nickname: null,
      parentUnionId,
      photoKey: null,
      birthMonth: null,
      birthDay: null,
      birthYear: null,
      birthplace: null,
      currentLocation: null,
      signatureEmoji: null,
      signatureDish: null,
      hiddenTalent: null,
      song: null,
      askMeAbout: null,
      takesAfterId: null,
      bio: null,
      isDeceased: false,
      isMinor: false,
      claimed: false,
      claimedAt: null,
      locked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    [],
  );

  // lightweight local attach (the real union find-or-create lives in the backend)
  const addPersonLocal = useCallback(
    (name: string, anchorId: string, relationship: RelationshipKind): Person => {
      const id = `new-${Date.now()}`;
      const anchor = people.find((p) => p.id === anchorId);
      let parentUnionId: string | null = null;
      let newUnion: Union | null = null;

      if (relationship === 'sibling') {
        parentUnionId = anchor?.parentUnionId ?? null;
      } else if (relationship === 'child') {
        newUnion = {
          id: `u-${id}`,
          familyId: 'demo',
          partnerAId: anchorId,
          partnerBId: null,
          unionType: 'other',
          createdAt: new Date().toISOString(),
        };
        parentUnionId = newUnion.id;
      } else if (relationship === 'partner') {
        newUnion = {
          id: `u-${id}`,
          familyId: 'demo',
          partnerAId: anchorId,
          partnerBId: id,
          unionType: 'partners',
          createdAt: new Date().toISOString(),
        };
      }
      // 'parent' is rarer in the demo; just place them ungrouped near the anchor

      const person = blank(id, name, parentUnionId);
      setPeople((prev) => [...prev, person]);
      if (newUnion) setUnions((prev) => [...prev, newUnion!]);
      return person;
    },
    [people, blank],
  );

  const addYourStar = useCallback(
    ({
      name,
      anchorPersonId,
      relationship,
      photo,
    }: {
      name: string;
      anchorPersonId: string;
      relationship: RelationshipKind;
      photo?: Blob;
    }) => {
      const p = addPersonLocal(name, anchorPersonId, relationship);
      lightUp(p.id);
      if (photo) setLocalPhoto(p.id, photo);
    },
    [addPersonLocal, lightUp, setLocalPhoto],
  );

  return (
    <SkyShell
      people={people}
      unions={unions}
      ignitingId={ignitingId}
      familyName={DEMO_FAMILY_NAME}
      meId={meId}
      photoUrlFor={(id) => photoUrls[id]}
      onLightUp={lightUp}
      onSave={save}
      onUploadPhoto={async (id, blob) => setLocalPhoto(id, blob)}
      onAddYourStar={addYourStar}
      force2D
    />
  );
}
