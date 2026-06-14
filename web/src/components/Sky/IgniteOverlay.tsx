import { motion } from 'framer-motion';

interface IgniteOverlayProps {
  /** Position of the igniting star in layout coordinates. */
  x: number;
  y: number;
  reducedMotion: boolean;
}

/**
 * The expanding ripple ring at the moment of ignition. Rendered inside the
 * zoom/pan group so it tracks the star. Under reduced-motion it is omitted —
 * the star's instant gold swap is the whole signal.
 */
export function IgniteOverlay({ x, y, reducedMotion }: IgniteOverlayProps) {
  if (reducedMotion) return null;
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none" data-testid="ignite-ripple">
      {[0, 0.18, 0.36].map((delay, i) => (
        <motion.circle
          key={i}
          r={6}
          fill="none"
          stroke="#FFD08A"
          strokeWidth={1.5}
          initial={{ scale: 0.4, opacity: 0.8 }}
          animate={{ scale: 7, opacity: 0 }}
          transition={{ duration: 1.4, delay, ease: 'easeOut' }}
        />
      ))}
    </g>
  );
}
