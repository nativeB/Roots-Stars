import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Person, RelationshipKind } from '@roots/shared';

interface AddRelativeFlowProps {
  /** The person the new relative attaches to. */
  anchor: Person;
  /** Other people, for picking a second parent when adding a child. */
  people: Person[];
  onClose: () => void;
  onAdd: (args: {
    name: string;
    relationship: RelationshipKind;
    otherParentId?: string;
  }) => Promise<void> | void;
}

const RELATIONSHIPS: { kind: RelationshipKind; label: string; hint: string }[] = [
  { kind: 'parent', label: 'Parent', hint: 'their mother or father' },
  { kind: 'partner', label: 'Partner', hint: 'spouse or partner' },
  { kind: 'child', label: 'Child', hint: 'son or daughter' },
  { kind: 'sibling', label: 'Sibling', hint: 'brother or sister' },
];

/** Add a missing relative, attached to the anchor by a chosen relationship. */
export function AddRelativeFlow({ anchor, people, onClose, onAdd }: AddRelativeFlowProps) {
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState<RelationshipKind>('child');
  const [otherParentId, setOtherParentId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onAdd({
        name: name.trim(),
        relationship,
        otherParentId: relationship === 'child' && otherParentId ? otherParentId : undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-30 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Add a relative connected to ${anchor.name}`}
        className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md rounded-t-3xl bg-space-panel p-6 pb-8 sm:bottom-4 sm:rounded-3xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted/40" />
        <h2 className="font-display text-xl text-starlight">
          Add someone connected to <span className="text-glow-gold">{anchor.name}</span>
        </h2>

        <form onSubmit={submit} className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs text-muted">Their name *</span>
            <input
              className="w-full rounded-lg border border-white/10 bg-space-deep px-3 py-2 text-starlight focus:border-aurora-violet"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              data-testid="new-relative-name"
            />
          </label>

          <fieldset>
            <legend className="mb-2 text-xs text-muted">
              How are they related to {anchor.name}?
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {RELATIONSHIPS.map((r) => (
                <button
                  type="button"
                  key={r.kind}
                  onClick={() => setRelationship(r.kind)}
                  aria-pressed={relationship === r.kind}
                  data-testid={`rel-${r.kind}`}
                  className={`rounded-xl border p-3 text-left transition ${
                    relationship === r.kind
                      ? 'border-glow-gold bg-glow-gold/10'
                      : 'border-white/10 bg-space-deep'
                  }`}
                >
                  <span className="block font-display text-starlight">{r.label}</span>
                  <span className="block text-xs text-muted">{r.hint}</span>
                </button>
              ))}
            </div>
          </fieldset>

          {relationship === 'child' && (
            <label className="block">
              <span className="mb-1 block text-xs text-muted">Other parent (optional)</span>
              <select
                className="w-full rounded-lg border border-white/10 bg-space-deep px-3 py-2 text-starlight focus:border-aurora-violet"
                value={otherParentId}
                onChange={(e) => setOtherParentId(e.target.value)}
              >
                <option value="">— just {anchor.name} —</option>
                {people
                  .filter((p) => p.id !== anchor.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
          )}

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full rounded-full bg-glow-gold py-3 font-semibold text-space-deep disabled:opacity-60"
            data-testid="add-relative-submit"
          >
            {saving ? 'Adding…' : '✦ Add their star'}
          </button>
        </form>
      </motion.div>
    </AnimatePresence>
  );
}
