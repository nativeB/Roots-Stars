import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Person, PersonCardFields } from '@roots/shared';
import { compressForUpload } from '../../lib/imageCompress';

interface EditPersonFormProps {
  person: Person;
  onSave: (fields: Partial<PersonCardFields>) => Promise<void> | void;
  onCancel: () => void;
  /** Compress + upload a photo; resolves when stored. Omitted if photos disabled. */
  onUploadPhoto?: (file: File) => Promise<void>;
  /** Remove this star and its data (privacy §10). */
  onDelete?: () => Promise<void> | void;
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
  onUploadPhoto,
  onDelete,
}: EditPersonFormProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
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
    };
  }

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onUploadPhoto) return;
    setPhotoBusy(true);
    setPhotoMsg(null);
    try {
      const blob = await compressForUpload(file);
      await onUploadPhoto(new File([blob], 'photo.webp', { type: 'image/webp' }));
      setPhotoMsg('Photo added ✦');
    } catch {
      setPhotoMsg('Couldn’t add the photo right now.');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(toFields());
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
        <Field label="Photo">
          <input
            type="file"
            accept="image/*"
            onChange={pickPhoto}
            disabled={photoBusy}
            className="block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-space-deep file:px-3 file:py-1.5 file:text-starlight"
            data-testid="photo-input"
          />
          {photoBusy && <span className="text-xs text-muted">Adding photo…</span>}
          {photoMsg && <span className="text-xs text-aurora-teal">{photoMsg}</span>}
        </Field>
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
        </motion.div>
      )}

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
