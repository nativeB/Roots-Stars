import { memo } from 'react';
import { motion } from 'framer-motion';
import type { PositionedThread } from '@roots/shared';

interface ThreadProps {
  thread: PositionedThread;
  /** Whether this thread is part of a lineage currently igniting. */
  igniting: boolean;
  /** Stagger delay (seconds) for the travelling pulse, by generation depth. */
  pulseDelay: number;
  reducedMotion: boolean;
}

/**
 * A connection thread. The base stroke is a calm teal→violet gradient.
 * During ignite, a brighter "pulse" path traces along it (or, under
 * reduced-motion, simply brightens instantly).
 */
function ThreadImpl({ thread, igniting, pulseDelay, reducedMotion }: ThreadProps) {
  const gradientId = thread.kind === 'partner' ? 'thread-partner' : 'thread-parent';

  return (
    <g>
      <path
        d={thread.d}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={thread.kind === 'partner' ? 1.4 : 1.1}
        strokeLinecap="round"
        opacity={igniting ? 0.95 : 0.4}
        style={{ transition: reducedMotion ? 'none' : 'opacity 0.5s ease' }}
      />

      {igniting && !reducedMotion && (
        <motion.path
          d={thread.d}
          fill="none"
          stroke="url(#thread-pulse)"
          strokeWidth={3}
          strokeLinecap="round"
          filter="url(#glow-soft)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 1], opacity: [0, 1, 0] }}
          transition={{ duration: 0.9, delay: pulseDelay, ease: 'easeInOut' }}
        />
      )}
    </g>
  );
}

export const Thread = memo(ThreadImpl);
