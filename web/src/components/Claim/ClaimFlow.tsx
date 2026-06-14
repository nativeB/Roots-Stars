import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Person, PersonCardFields } from '@roots/shared';
import { PhotoPicker } from '../Card/PhotoPicker';

interface ClaimFlowProps {
  person: Person;
  onClose: () => void;
  /** Save details (if any) + optional photo, then light the star. */
  onLightUp: (
    personId: string,
    fields: Partial<PersonCardFields>,
    photo?: Blob,
  ) => Promise<void> | void;
}

// A warm, curated starter set — "an emoji that's so you".
const EMOJI = ['✦', '🌺', '🎷', '⚽', '📚', '🎨', '🪘', '🌍', '☕', '🎬', '📷', '🌻'];

/**
 * The signature claim card — "Light your star". This is the critical 90-second
 * moment: a relative finds their unlit star, adds a few delightful details, and
 * ignites. Kept short and playful; only a name matters.
 */
export function ClaimFlow({ person, onClose, onLightUp }: ClaimFlowProps) {
  const [name, setName] = useState(person.name);
  const [emoji, setEmoji] = useState(person.signatureEmoji ?? '✦');
  const [dish, setDish] = useState(person.signatureDish ?? '');
  const [photo, setPhoto] = useState<Blob | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  async function light() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onLightUp(
        person.id,
        {
          name: name.trim(),
          signatureEmoji: emoji,
          signatureDish: dish.trim() || null,
        },
        photo,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-10 bg-black/50 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Light ${person.name}'s star`}
        className="fixed inset-x-0 bottom-0 z-20 mx-auto max-h-[92vh] max-w-md overflow-y-auto rounded-t-[28px] border-t border-white/10 bg-gradient-to-b from-[#1b1838] to-[#13112a] px-6 pb-9 pt-3 shadow-[0_-20px_60px_rgba(0,0,0,0.5)] sm:bottom-4 sm:rounded-[28px] sm:border"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 34 }}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />

        <h2 className="font-display text-[28px] font-semibold leading-tight text-starlight">
          Light your star
        </h2>
        <p className="mt-1.5 font-body text-[15px] leading-snug text-muted">
          A spot is waiting for you in this family’s sky. Two minutes, that’s all.
        </p>

        {/* a face for the star — optional, but it's the warm part */}
        <div className="mt-5 flex justify-center">
          <PhotoPicker fallback={emoji} size={92} onPick={setPhoto} />
        </div>

        <div className="mt-5 space-y-5">
          <div>
            <label className="mb-1.5 block font-body text-sm text-muted" htmlFor="claim-name">
              Your name
            </label>
            <input
              id="claim-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3.5 font-body text-[17px] text-starlight outline-none transition focus:border-glow-gold/70 focus:bg-white/[0.06]"
              data-testid="claim-name"
            />
          </div>

          <div>
            <p className="mb-2 font-body text-sm text-muted">An emoji that’s so you</p>
            <div className="grid grid-cols-6 gap-2">
              {EMOJI.map((e) => {
                const active = emoji === e;
                return (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    aria-pressed={active}
                    className={`flex aspect-square items-center justify-center rounded-xl border text-xl transition ${
                      active
                        ? 'border-glow-gold bg-glow-gold/15 shadow-[0_0_14px_rgba(255,208,138,0.35)]'
                        : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'
                    }`}
                  >
                    {e}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-body text-sm text-muted" htmlFor="claim-dish">
              Signature dish
            </label>
            <input
              id="claim-dish"
              value={dish}
              onChange={(e) => setDish(e.target.value)}
              placeholder="the thing everyone asks you to bring"
              className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3.5 font-body text-[16px] text-starlight placeholder:text-muted/50 outline-none transition focus:border-glow-gold/70 focus:bg-white/[0.06]"
            />
          </div>
        </div>

        <motion.button
          onClick={light}
          disabled={saving || !name.trim()}
          whileTap={{ scale: 0.98 }}
          className="mt-7 w-full rounded-full bg-gradient-to-r from-[#FFE0AE] via-[#FFD08A] to-[#FFBF73] py-4 font-body text-[17px] font-semibold text-[#2a1d05] shadow-[0_6px_24px_rgba(255,208,138,0.35)] transition disabled:opacity-60"
          data-testid="light-it-up"
        >
          {saving ? 'Lighting…' : '✦ Light it up'}
        </motion.button>

        <button
          onClick={onClose}
          className="mt-3 w-full py-1 font-body text-sm text-muted transition hover:text-starlight"
        >
          Not me — close
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
