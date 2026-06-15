import { useEffect, useMemo } from 'react';

/**
 * Root-domain landing for visitors who arrive without an invite link.
 * Roots & Stars is invite-only, so there's no family to show here — just a
 * warm, on-brand "you need a link" message over a calm starfield.
 */
export function Landing() {
  // a sprinkle of deterministic stars for ambient warmth (no data, no motion deps)
  const stars = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        x: (i * 97.13) % 100,
        y: (i * 53.77) % 100,
        r: 0.5 + ((i * 7) % 5) / 4,
        o: 0.15 + ((i * 13) % 50) / 100,
      })),
    [],
  );

  useEffect(() => {
    document.title = 'Roots & Stars';
  }, []);

  return (
    <main className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-space-deep px-6 text-center">
      {/* ambient starfield */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        {stars.map((s, i) => (
          <circle
            key={i}
            cx={`${s.x}%`}
            cy={`${s.y}%`}
            r={s.r}
            fill="#F5F3FF"
            opacity={s.o}
            className="animate-twinkle"
            style={{ animationDelay: `${(i % 8) * 0.4}s` }}
          />
        ))}
      </svg>

      <div className="relative z-10 max-w-md">
        <div
          className="mx-auto mb-6 h-3 w-3 rounded-full bg-glow-gold"
          style={{ boxShadow: '0 0 24px 6px rgba(255,208,138,0.7)' }}
          aria-hidden
        />
        <h1 className="font-display text-4xl font-semibold leading-tight text-starlight">
          Roots <span className="text-glow-gold">&</span> Stars
        </h1>
        <p className="mt-4 font-body text-[17px] leading-relaxed text-muted">
          A private, living constellation of your family. Every relative lights up their own
          star and sees how they all connect.
        </p>
        <p className="mt-6 font-body text-[15px] leading-relaxed text-muted/80">
          This sky is invite-only. Open the link someone in your family shared with you to step
          inside.
        </p>
      </div>

      <p className="absolute bottom-6 left-0 right-0 z-10 font-body text-xs text-muted/50">
        Private &amp; unlisted · made for one family
      </p>
    </main>
  );
}
