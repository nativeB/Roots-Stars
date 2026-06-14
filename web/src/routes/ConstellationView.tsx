import { useEffect } from 'react';
import { useConstellation } from '../state/useConstellation';
import { SkyShell } from '../components/SkyShell';
import { PrivacyOneLiner } from '../components/Onboard/PrivacyOneLiner';
import { InviteFooter } from '../components/Onboard/InviteFooter';

/** Live family sky behind an invite slug. */
export function ConstellationView({ slug }: { slug: string }) {
  const {
    people,
    unions,
    loading,
    error,
    ignitingId,
    familyName,
    meId,
    claim,
    updatePerson,
    addRelative,
    uploadPhoto,
    removePerson,
    setIgniting,
  } = useConstellation();

  useEffect(() => {
    void useConstellation.getState().load(slug);
  }, [slug]);

  // settle the ignite ~2s after it begins (covers both local + remote ignites)
  useEffect(() => {
    if (!ignitingId) return;
    const t = globalThis.setTimeout(() => setIgniting(null), 2000);
    return () => globalThis.clearTimeout(t);
  }, [ignitingId, setIgniting]);

  if (loading) {
    return (
      <main className="flex h-full items-center justify-center bg-space-deep">
        <p className="animate-twinkle font-display text-xl text-muted">Lighting the sky…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex h-full flex-col items-center justify-center gap-3 bg-space-deep p-8 text-center">
        <p className="font-display text-2xl text-starlight">This sky is out of reach</p>
        <p className="max-w-sm font-body text-muted">
          This link may be wrong or expired. Ask whoever invited you for a fresh one.
        </p>
      </main>
    );
  }

  return (
    <>
      <SkyShell
        people={people}
        unions={unions}
        ignitingId={ignitingId}
        familyName={familyName}
        meId={meId}
        onLightUp={(id) => void claim(id)}
        onSave={(id, fields) => updatePerson(id, fields)}
        onAddRelative={async (args) => {
          await addRelative(args);
        }}
        onUploadPhoto={(id, file) => uploadPhoto(id, file)}
        onDelete={(id) => removePerson(id)}
        onAddYourStar={async ({ name, anchorPersonId, relationship }) => {
          const created = await addRelative({ name, anchorPersonId, relationship });
          if (created) await claim(created.id); // your new star lights up + becomes home
        }}
        footer={<InviteFooter slug={slug} />}
      />
      <PrivacyOneLiner />
    </>
  );
}
