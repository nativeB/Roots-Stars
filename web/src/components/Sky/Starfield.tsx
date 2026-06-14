import { memo, useMemo } from 'react';

interface StarfieldProps {
  width: number;
  height: number;
  reducedMotion: boolean;
}

/** Mulberry32 — tiny deterministic PRNG so the dust is stable across renders. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Dust {
  x: number;
  y: number;
  r: number;
  o: number;
  dur: number;
  delay: number;
}

/**
 * Ambient background dust — hundreds of faint distant stars giving the field
 * real depth. Fixed to the viewport (not the pan group) so it feels infinitely
 * far away. Pure decoration: aria-hidden, skipped-twinkle under reduced-motion.
 */
function StarfieldImpl({ width, height, reducedMotion }: StarfieldProps) {
  const dust = useMemo<Dust[]>(() => {
    const r = rng(1337);
    const count = Math.min(220, Math.round((width * height) / 4200));
    const out: Dust[] = [];
    for (let i = 0; i < count; i++) {
      out.push({
        x: r() * width,
        y: r() * height,
        r: 0.4 + r() * 1.3,
        o: 0.15 + r() * 0.6,
        dur: 2.5 + r() * 4,
        delay: r() * 5,
      });
    }
    return out;
  }, [width, height]);

  return (
    <g aria-hidden="true" data-testid="starfield">
      {dust.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#FBF7FF" opacity={d.o}>
          {!reducedMotion && (
            <animate
              attributeName="opacity"
              values={`${d.o};${Math.min(1, d.o + 0.35)};${d.o}`}
              dur={`${d.dur}s`}
              begin={`${d.delay}s`}
              repeatCount="indefinite"
            />
          )}
        </circle>
      ))}
    </g>
  );
}

export const Starfield = memo(StarfieldImpl);
