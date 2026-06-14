import { useState } from 'react';
import { motion } from 'framer-motion';

interface EditLockFieldProps {
  /** called with the PIN (4–12 chars) or undefined when cleared/invalid */
  onChange: (pin: string | undefined) => void;
}

/**
 * Optional, opt-in edit lock. Collapsed by default so it never blocks the warm
 * path — most people (and anyone pre-filling for relatives) just skip it. If a
 * relative wants only-me edits, they expand it and set a short PIN.
 */
export function EditLockField({ onChange }: EditLockFieldProps) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');

  function update(v: string) {
    const clean = v.replace(/\D/g, '').slice(0, 12);
    setPin(clean);
    onChange(clean.length >= 4 ? clean : undefined);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm text-muted transition hover:text-starlight"
        data-testid="lock-toggle"
      >
        🔒 Lock my edits <span className="text-xs">(optional)</span>
      </button>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
      <label className="mb-1.5 block font-body text-sm text-muted" htmlFor="lock-pin">
        Choose a PIN so only you can edit your star
      </label>
      <input
        id="lock-pin"
        value={pin}
        onChange={(e) => update(e.target.value)}
        inputMode="numeric"
        placeholder="4–12 digits"
        autoComplete="off"
        className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 font-body text-[16px] tracking-[0.3em] text-starlight outline-none focus:border-glow-gold/70"
        data-testid="lock-pin"
      />
      <p className="mt-1 text-xs text-muted">
        Optional. Without it, family can help keep your details up to date. The family host can
        always help if you forget it.
      </p>
    </motion.div>
  );
}
