import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Person, RelationshipKind } from '@roots/shared';
import { PhotoPicker } from '../Card/PhotoPicker';

interface AddYourStarFlowProps {
  people: Person[];
  onClose: () => void;
  /** Create + attach the new "you" star, optionally with a photo, then light it. */
  onAdd: (args: {
    name: string;
    anchorPersonId: string;
    relationship: RelationshipKind;
    photo?: Blob;
  }) => Promise<void> | void;
}

const RELATIONSHIPS: { kind: RelationshipKind; label: string; hint: string }[] = [
  { kind: 'child', label: 'Their child', hint: 'they are my parent' },
  { kind: 'sibling', label: 'Their sibling', hint: 'we share a parent' },
  { kind: 'partner', label: 'Their partner', hint: 'spouse or partner' },
  { kind: 'parent', label: 'Their parent', hint: 'they are my child' },
];

/**
 * Top-level "Add your star" for a first-time visitor who doesn't see their own
 * dim star yet (§2 step 3): name → pick someone they're connected to → relationship.
 * Resolves into the same union find-or-create as adding any relative.
 */
export function AddYourStarFlow({ people, onClose, onAdd }: AddYourStarFlowProps) {
  const [name, setName] = useState('');
  const [anchorId, setAnchorId] = useState('');
  const [relationship, setRelationship] = useState<RelationshipKind>('child');
  const [photo, setPhoto] = useState<Blob | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const anchor = useMemo(() => people.find((p) => p.id === anchorId), [people, anchorId]);
  const canSubmit = name.trim() && anchorId;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      await onAdd({ name: name.trim(), anchorPersonId: anchorId, relationship, photo });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Add your star"
        className="fixed inset-x-0 bottom-0 z-40 mx-auto max-h-[92vh] max-w-md overflow-y-auto rounded-t-[28px] border-t border-white/10 bg-gradient-to-b from-[#1b1838] to-[#13112a] px-6 pb-9 pt-3 sm:bottom-4 sm:rounded-[28px] sm:border"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 34 }}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />
        <h2 className="font-display text-[26px] font-semibold leading-tight text-starlight">
          Add your star
        </h2>
        <p className="mt-1.5 font-body text-[15px] leading-snug text-muted">
          Tell us your name and who you’re connected to — we’ll place you in the sky.
        </p>

        <div className="mt-5 flex justify-center">
          <PhotoPicker fallback="✦" size={84} onPick={setPhoto} />
        </div>

        <form onSubmit={submit} className="mt-5 space-y-5">
          <label className="block">
            <span className="mb-1.5 block font-body text-sm text-muted">Your name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3.5 font-body text-[17px] text-starlight outline-none focus:border-glow-gold/70"
              data-testid="your-name"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-body text-sm text-muted">
              Someone you’re connected to
            </span>
            <select
              value={anchorId}
              onChange={(e) => setAnchorId(e.target.value)}
              className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3.5 font-body text-[16px] text-starlight outline-none focus:border-glow-gold/70"
              data-testid="anchor-pick"
            >
              <option value="">— pick a relative —</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          {anchor && (
            <fieldset>
              <legend className="mb-2 font-body text-sm text-muted">
                You are {anchor.name}’s…
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {RELATIONSHIPS.map((r) => (
                  <button
                    type="button"
                    key={r.kind}
                    onClick={() => setRelationship(r.kind)}
                    aria-pressed={relationship === r.kind}
                    data-testid={`yourel-${r.kind}`}
                    className={`rounded-xl border p-3 text-left transition ${
                      relationship === r.kind
                        ? 'border-glow-gold bg-glow-gold/10'
                        : 'border-white/10 bg-white/[0.03]'
                    }`}
                  >
                    <span className="block font-display text-starlight">{r.label}</span>
                    <span className="block text-xs text-muted">{r.hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <button
            type="submit"
            disabled={saving || !canSubmit}
            className="w-full rounded-full bg-gradient-to-r from-[#FFE0AE] via-[#FFD08A] to-[#FFBF73] py-4 font-body text-[17px] font-semibold text-[#2a1d05] shadow-[0_6px_24px_rgba(255,208,138,0.35)] disabled:opacity-60"
            data-testid="add-your-star-submit"
          >
            {saving ? 'Lighting…' : '✦ Light up my star'}
          </button>
        </form>
      </motion.div>
    </AnimatePresence>
  );
}
