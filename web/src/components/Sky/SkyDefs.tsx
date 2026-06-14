/** Shared SVG gradients + glow filters for threads and stars (the §6 palette). */
export function SkyDefs() {
  return (
    <defs>
      {/* connection threads: teal → violet */}
      <linearGradient id="thread-parent" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#6FE3C4" />
        <stop offset="100%" stopColor="#B58CFF" />
      </linearGradient>
      <linearGradient id="thread-partner" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#6FE3C4" />
        <stop offset="100%" stopColor="#B58CFF" />
      </linearGradient>
      {/* brighter pulse used during ignite */}
      <linearGradient id="thread-pulse" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFD08A" />
        <stop offset="50%" stopColor="#6FE3C4" />
        <stop offset="100%" stopColor="#B58CFF" />
      </linearGradient>

      <filter id="glow-soft" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}
