/** Shared SVG gradients + glow filters for the luminous constellation (§6 palette). */
export function SkyDefs() {
  return (
    <defs>
      {/* radial core gradients — bright center fading to the accent hue */}
      <radialGradient id="core-gold" cx="50%" cy="42%" r="60%">
        <stop offset="0%" stopColor="#FFFDF6" />
        <stop offset="35%" stopColor="#FFE6B8" />
        <stop offset="100%" stopColor="#FFB454" />
      </radialGradient>
      <radialGradient id="core-violet" cx="50%" cy="42%" r="60%">
        <stop offset="0%" stopColor="#F3ECFF" />
        <stop offset="40%" stopColor="#C8A9FF" />
        <stop offset="100%" stopColor="#8E6BE0" />
      </radialGradient>

      {/* soft atmospheric halos */}
      <radialGradient id="halo-gold" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FFD08A" stopOpacity="0.55" />
        <stop offset="45%" stopColor="#FFB454" stopOpacity="0.22" />
        <stop offset="100%" stopColor="#FFB454" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="halo-violet" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#B58CFF" stopOpacity="0.4" />
        <stop offset="45%" stopColor="#8E6BE0" stopOpacity="0.16" />
        <stop offset="100%" stopColor="#8E6BE0" stopOpacity="0" />
      </radialGradient>

      {/* connection threads: teal → violet, with a luminous variant */}
      <linearGradient id="thread-parent" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#6FE3C4" />
        <stop offset="100%" stopColor="#B58CFF" />
      </linearGradient>
      <linearGradient id="thread-partner" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#6FE3C4" />
        <stop offset="100%" stopColor="#B58CFF" />
      </linearGradient>
      <linearGradient id="thread-pulse" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFD08A" />
        <stop offset="50%" stopColor="#6FE3C4" />
        <stop offset="100%" stopColor="#B58CFF" />
      </linearGradient>

      <filter id="glow-soft" x="-120%" y="-120%" width="340%" height="340%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <filter id="glow-strong" x="-150%" y="-150%" width="400%" height="400%">
        <feGaussianBlur stdDeviation="7" />
      </filter>
    </defs>
  );
}
