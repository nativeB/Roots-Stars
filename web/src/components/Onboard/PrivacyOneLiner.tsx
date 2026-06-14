import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const SEEN_KEY = 'roots:privacy-seen';

/** Plain-language privacy note on first visit (§10). Dismissible, remembered. */
export function PrivacyOneLiner() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(SEEN_KEY) === '1';
    } catch {
      return false;
    }
  });

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* ignore */
    }
  }

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          role="status"
          className="fixed inset-x-3 top-16 z-40 mx-auto max-w-md rounded-2xl bg-space-panel/95 p-4 text-sm text-starlight shadow-xl backdrop-blur"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
        >
          <p className="text-muted">
            This is your family’s private sky. Only people with the invite link can see it — it’s
            never public and never searchable.
          </p>
          <button
            onClick={dismiss}
            className="mt-3 rounded-full bg-glow-gold px-4 py-1.5 font-semibold text-space-deep"
          >
            Got it ✦
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
