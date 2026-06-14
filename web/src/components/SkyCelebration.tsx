import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

interface SkyCelebrationProps {
  litCount: number;
  totalCount: number;
}

/**
 * A quiet reward when the whole sky lights up — every star claimed. Fires once
 * per completion (tracked across the session). Calm and warm, not confetti-loud.
 */
export function SkyCelebration({ litCount, totalCount }: SkyCelebrationProps) {
  const reduced = useReducedMotion();
  const [show, setShow] = useState(false);
  const firedAt = useRef(0);

  useEffect(() => {
    const complete = totalCount > 1 && litCount >= totalCount;
    if (complete && firedAt.current !== totalCount) {
      firedAt.current = totalCount;
      setShow(true);
      const t = globalThis.setTimeout(() => setShow(false), reduced ? 2200 : 4200);
      return () => globalThis.clearTimeout(t);
    }
  }, [litCount, totalCount, reduced]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-testid="sky-complete"
        >
          {!reduced && (
            <motion.div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(60% 50% at 50% 45%, rgba(255,208,138,0.16), transparent 70%)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 4, ease: 'easeInOut' }}
            />
          )}
          <motion.div
            className="rounded-2xl border border-glow-gold/30 bg-space-panel/85 px-7 py-5 text-center backdrop-blur-md"
            initial={{ scale: 0.9, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20 }}
          >
            <p className="font-display text-2xl text-starlight">Your whole sky is lit ✦</p>
            <p className="mt-1 font-body text-sm text-muted">
              Every star claimed. The family is all here.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
