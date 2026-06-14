import { useEffect } from 'react';
import { useConstellation } from '../state/useConstellation';
import { SkyShell } from '../components/SkyShell';
import { PrivacyOneLiner } from '../components/Onboard/PrivacyOneLiner';
import { InviteFooter } from '../components/Onboard/InviteFooter';

/** Live family sky behind an invite slug. */
export function ConstellationView({ slug }: { slug: string }) {
  const { people, unions, loading, error, ignitingId, familyName, claim, setIgniting } =
    useConstellation();

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
        onLightUp={(id) => void claim(id)}
        footer={<InviteFooter slug={slug} />}
      />
      <PrivacyOneLiner />
    </>
  );
}
