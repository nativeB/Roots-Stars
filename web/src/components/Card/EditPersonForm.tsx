import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Person, PersonCardFields } from '@roots/shared';
import { PhotoPicker } from './PhotoPicker';

interface EditPersonFormProps {
  person: Person;
  onSave: (
    fields: Partial<PersonCardFields>,
    opts?: { editPin?: string; setEditPin?: string | null },
  ) => Promise<void> | void;
  onCancel: () => void;
  /** the host can edit locked stars without a PIN */
  isHost?: boolean;
  /** Upload an already-compressed photo blob; resolves when stored. Omitted if disabled. */
  onUploadPhoto?: (blob: Blob) => Promise<void>;
  /** the person's current (presigned) photo URL, if any */
  currentPhotoUrl?: string | null;
  /** Remove this star and its data (privacy §10). */
  onDelete?: () => Promise<void> | void;
  /** other family members, for the "who you take after" picker */
  people?: { id: string; name: string }[];
}

type FormState = Partial<Record<keyof PersonCardFields, string | boolean>>;

/**
 * Edit a star's playful details. Name is the only required field; the rest live
 * behind an "add more sparkle" expander so the form feels like unlocking, not intake.
 */
export function EditPersonForm({
  person,
  onSave,
  onCancel,
  isHost,
  onUploadPhoto,
  currentPhotoUrl,
  onDelete,
  people = [],
}: EditPersonFormProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // edit-lock UI: a locked star needs its PIN (unless host); anyone can set/clear a lock.
  const [unlockPin, setUnlockPin] = useState('');
  const [lockChoice, setLockChoice] = useState<'keep' | 'set' | 'clear'>('keep');
  const [newPin, setNewPin] = useState('');
  const [lockError, setLockError] = useState<string | null>(null);
  const needsPin = person.locked && !isHost;
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    name: person.name,
    nickname: person.nickname ?? '',
    signatureEmoji: person.signatureEmoji ?? '',
    bio: person.bio ?? '',
    birthMonth: person.birthMonth?.toString() ?? '',
    birthDay: person.birthDay?.toString() ?? '',
    birthYear: person.birthYear?.toString() ?? '',
    birthplace: person.birthplace ?? '',
    currentLocation: person.currentLocation ?? '',
    signatureDish: person.signatureDish ?? '',
    hiddenTalent: person.hiddenTalent ?? '',
    song: person.song ?? '',
    askMeAbout: person.askMeAbout ?? '',
    takesAfterId: person.takesAfterId ?? '',
  });
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof PersonCardFields, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function toFields(): Partial<PersonCardFields> {
    const num = (s: unknown) => {
      const n = Number.parseInt(typeof s === 'string' ? s : '', 10);
      return Number.isFinite(n) ? n : null;
    };
    const str = (s: unknown) => {
      const t = (typeof s === 'string' ? s : '').trim();
      return t.length ? t : null;
    };
    return {
      name: str(form.name) ?? person.name,
      nickname: str(form.nickname),
      signatureEmoji: str(form.signatureEmoji),
      bio: str(form.bio),
      birthMonth: num(form.birthMonth),
      birthDay: num(form.birthDay),
      birthYear: num(form.birthYear),
      birthplace: str(form.birthplace),
      currentLocation: str(form.currentLocation),
      signatureDish: str(form.signatureDish),
      hiddenTalent: str(form.hiddenTalent),
      song: str(form.song),
      askMeAbout: str(form.askMeAbout),
      takesAfterId: str(form.takesAfterId),
    };
  }

  async function uploadBlob(blob: Blob) {
    if (!onUploadPhoto) return;
    setPhotoBusy(true);
    setPhotoMsg(null);
    try {
      await onUploadPhoto(blob);
      setPhotoMsg('Photo saved ✦');
    } catch {
      setPhotoMsg('Couldn’t save the photo right now.');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLockError(null);
    if (needsPin && unlockPin.length < 4) {
      setLockError('Enter this star’s PIN to save your changes.');
      return;
    }
    if (lockChoice === 'set' && newPin.length < 4) {
      setLockError('Choose a PIN of at least 4 digits, or cancel the lock.');
      return;
    }
    const setEditPin =
      lockChoice === 'set' ? newPin : lockChoice === 'clear' ? null : undefined;
    setSaving(true);
    try {
      await onSave(toFields(), { editPin: needsPin ? unlockPin : undefined, setEditPin });
    } catch (err) {
      // server says locked / wrong PIN
      const msg = err instanceof Error ? err.message : '';
      setLockError(msg.includes('403') ? 'That PIN didn’t match. Try again.' : 'Couldn’t save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Name" required>
        <input
          className={inputCls}
          value={String(form.name ?? '')}
          onChange={(e) => set('name', e.target.value)}
          required
          autoFocus
        />
      </Field>

      {onUploadPhoto && (
        <div className="flex items-center gap-3">
          <PhotoPicker
            initialUrl={currentPhotoUrl}
            fallback={person.signatureEmoji ?? person.name.charAt(0)}
            size={72}
            onPick={uploadBlob}
            busy={photoBusy}
          />
          <div className="text-sm">
            <p className="text-starlight">Photo</p>
            <p className="text-muted">Tap to add or change — optional.</p>
            {photoMsg && <p className="mt-0.5 text-aurora-teal">{photoMsg}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Nickname">
          <input
            className={inputCls}
            value={String(form.nickname ?? '')}
            onChange={(e) => set('nickname', e.target.value)}
          />
        </Field>
        <Field label="An emoji that's so you">
          <input
            className={inputCls}
            value={String(form.signatureEmoji ?? '')}
            onChange={(e) => set('signatureEmoji', e.target.value)}
            placeholder="🎻"
            maxLength={8}
          />
        </Field>
      </div>

      <Field label="One line about you">
        <input
          className={inputCls}
          value={String(form.bio ?? '')}
          onChange={(e) => set('bio', e.target.value)}
          maxLength={120}
        />
      </Field>

      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-sm text-aurora-violet hover:text-aurora-teal"
        >
          add more sparkle ✨
        </button>
      )}

      {expanded && (
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <div className="grid grid-cols-3 gap-2">
            <Field label="Birth month">
              <input className={inputCls} value={String(form.birthMonth ?? '')} onChange={(e) => set('birthMonth', e.target.value)} inputMode="numeric" placeholder="MM" />
            </Field>
            <Field label="Day">
              <input className={inputCls} value={String(form.birthDay ?? '')} onChange={(e) => set('birthDay', e.target.value)} inputMode="numeric" placeholder="DD" />
            </Field>
            <Field label="Year (opt)">
              <input className={inputCls} value={String(form.birthYear ?? '')} onChange={(e) => set('birthYear', e.target.value)} inputMode="numeric" placeholder="YYYY" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Where born">
              <input className={inputCls} value={String(form.birthplace ?? '')} onChange={(e) => set('birthplace', e.target.value)} />
            </Field>
            <Field label="Where you live now">
              <input className={inputCls} value={String(form.currentLocation ?? '')} onChange={(e) => set('currentLocation', e.target.value)} />
            </Field>
          </div>
          <Field label="Signature dish">
            <input className={inputCls} value={String(form.signatureDish ?? '')} onChange={(e) => set('signatureDish', e.target.value)} />
          </Field>
          <Field label="Hidden talent">
            <input className={inputCls} value={String(form.hiddenTalent ?? '')} onChange={(e) => set('hiddenTalent', e.target.value)} />
          </Field>
          <Field label="The song that defines you">
            <input className={inputCls} value={String(form.song ?? '')} onChange={(e) => set('song', e.target.value)} />
          </Field>
          <Field label="Ask me about…">
            <input className={inputCls} value={String(form.askMeAbout ?? '')} onChange={(e) => set('askMeAbout', e.target.value)} />
          </Field>
          {people.length > 0 && (
            <Field label="Who in the family you most take after">
              <select
                className={inputCls}
                value={String(form.takesAfterId ?? '')}
                onChange={(e) => set('takesAfterId', e.target.value)}
              >
                <option value="">— no one in particular —</option>
                {people
                  .filter((pp) => pp.id !== person.id)
                  .map((pp) => (
                    <option key={pp.id} value={pp.id}>
                      {pp.name}
                    </option>
                  ))}
              </select>
            </Field>
          )}
        </motion.div>
      )}

      {/* edit lock — PIN to unlock a locked star (members), and set/clear control */}
      {needsPin && (
        <div className="rounded-xl border border-glow-gold/30 bg-glow-gold/5 p-3">
          <label className="mb-1.5 block text-sm text-starlight" htmlFor="unlock-pin">
            🔒 This star is locked — enter its PIN to save
          </label>
          <input
            id="unlock-pin"
            value={unlockPin}
            onChange={(e) => setUnlockPin(e.target.value.replace(/\D/g, '').slice(0, 12))}
            inputMode="numeric"
            autoComplete="off"
            className={`${inputCls} tracking-[0.3em]`}
            data-testid="unlock-pin"
          />
        </div>
      )}

      {!needsPin && (
        <div className="text-sm">
          {lockChoice === 'keep' && (
            <div className="flex gap-3">
              {!person.locked && (
                <button
                  type="button"
                  onClick={() => setLockChoice('set')}
                  className="text-aurora-violet underline"
                  data-testid="lock-set"
                >
                  🔒 Lock my edits
                </button>
              )}
              {person.locked && (
                <button
                  type="button"
                  onClick={() => setLockChoice('clear')}
                  className="text-muted underline"
                  data-testid="lock-clear"
                >
                  Unlock this star
                </button>
              )}
            </div>
          )}
          {lockChoice === 'set' && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <label className="mb-1.5 block text-muted" htmlFor="new-pin">
                Set a PIN (4–12 digits) — only you can edit after this
              </label>
              <input
                id="new-pin"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 12))}
                inputMode="numeric"
                autoComplete="off"
                className={`${inputCls} tracking-[0.3em]`}
                data-testid="new-pin"
              />
              <button
                type="button"
                onClick={() => {
                  setLockChoice('keep');
                  setNewPin('');
                }}
                className="mt-2 text-xs text-muted underline"
              >
                Cancel lock
              </button>
            </div>
          )}
          {lockChoice === 'clear' && (
            <p className="text-muted">
              This star will be unlocked on save.{' '}
              <button
                type="button"
                onClick={() => setLockChoice('keep')}
                className="underline"
              >
                Keep it locked
              </button>
            </p>
          )}
        </div>
      )}

      {lockError && <p className="text-sm text-red-400" data-testid="lock-error">{lockError}</p>}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-full bg-glow-gold py-2.5 font-semibold text-space-deep disabled:opacity-60"
          data-testid="save-person"
        >
          {saving ? 'Saving…' : 'Save ✦'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full bg-space-deep px-4 py-2.5 text-muted"
        >
          Cancel
        </button>
      </div>

      {onDelete && (
        <div className="pt-2 text-center">
          {confirmingDelete ? (
            <span className="inline-flex items-center gap-2 text-sm text-muted">
              Remove {person.name}’s star and all their details?
              <button
                type="button"
                onClick={() => onDelete()}
                className="rounded-full bg-red-500/80 px-3 py-1 text-white"
                data-testid="confirm-delete"
              >
                Remove
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="text-muted underline"
              >
                Keep
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="text-xs text-muted underline hover:text-red-400"
              data-testid="delete-person"
            >
              Remove this star
            </button>
          )}
        </div>
      )}
    </form>
  );
}

const inputCls =
  'w-full rounded-lg border border-white/10 bg-space-deep px-3 py-2 text-starlight placeholder:text-muted/50 focus:border-aurora-violet';

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted">
        {label}
        {required ? ' *' : ''}
      </span>
      {children}
    </label>
  );
}
