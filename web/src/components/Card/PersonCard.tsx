import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Person, PersonCardFields } from '@roots/shared';
import { EditPersonForm } from './EditPersonForm';
import { usePhotoUrl } from '../../lib/usePhotoUrl';

interface PersonCardProps {
  person: Person | null;
  onClose: () => void;
  onLightUp: (personId: string) => void;
  /** When provided, enables Edit + Add-relative actions (live mode). */
  onSave?: (personId: string, fields: Partial<PersonCardFields>) => Promise<void> | void;
  onAddRelative?: (anchor: Person) => void;
  onUploadPhoto?: (personId: string, file: File) => Promise<void>;
  onDelete?: (personId: string) => Promise<void> | void;
  /** resolved display name of who this person takes after (if set) */
  takesAfterName?: string | null;
  /** other members, for the edit form's "takes after" picker */
  people?: { id: string; name: string }[];
}

function birthdayText(p: Person): string | null {
  if (!p.birthMonth || !p.birthDay) return null;
  const d = new Date(2000, p.birthMonth - 1, p.birthDay);
  const md = d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  return p.birthYear ? `${md}, ${p.birthYear}` : md;
}

/** Person card — slides up from the bottom on mobile. Read + edit + add-relative. */
export function PersonCard({
  person,
  onClose,
  onLightUp,
  onSave,
  onAddRelative,
  onUploadPhoto,
  onDelete,
  takesAfterName,
  people = [],
}: PersonCardProps) {
  const [editing, setEditing] = useState(false);
  const photoUrl = usePhotoUrl(person?.id ?? null, Boolean(person?.photoKey));

  function close() {
    setEditing(false);
    onClose();
  }

  return (
    <AnimatePresence>
      {person && (
        <>
          <motion.div
            className="fixed inset-0 z-10 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${person.name} details`}
            className="fixed inset-x-0 bottom-0 z-20 mx-auto max-h-[88vh] max-w-md overflow-y-auto rounded-t-3xl bg-space-panel p-6 pb-8 shadow-2xl sm:bottom-4 sm:rounded-3xl"
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.4 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted/40" />

            {editing && onSave ? (
              <EditPersonForm
                person={person}
                onSave={async (fields) => {
                  await onSave(person.id, fields);
                  setEditing(false);
                }}
                onCancel={() => setEditing(false)}
                onUploadPhoto={
                  onUploadPhoto ? (file) => onUploadPhoto(person.id, file) : undefined
                }
                onDelete={
                  onDelete
                    ? async () => {
                        await onDelete(person.id);
                        close();
                      }
                    : undefined
                }
                people={people}
              />
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl"
                    style={{
                      background: person.claimed
                        ? 'radial-gradient(circle, rgba(255,208,138,0.35), rgba(255,208,138,0.05))'
                        : 'radial-gradient(circle, rgba(155,150,196,0.25), transparent)',
                    }}
                    aria-hidden
                  >
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      (person.signatureEmoji ?? person.name.charAt(0))
                    )}
                  </div>
                  <div>
                    <h2 className="font-display text-2xl leading-tight text-starlight">
                      {person.name}
                      {person.nickname ? (
                        <span className="ml-2 text-base text-muted">“{person.nickname}”</span>
                      ) : null}
                    </h2>
                    {person.isDeceased && <p className="text-sm text-muted">In loving memory ✦</p>}
                  </div>
                </div>

                {person.bio && <p className="mt-4 text-starlight/90">{person.bio}</p>}

                <dl className="mt-4 grid grid-cols-1 gap-2 text-sm">
                  <Detail label="Birthday" value={birthdayText(person)} />
                  <Detail
                    label="From → now"
                    value={
                      person.birthplace || person.currentLocation
                        ? `${person.birthplace ?? '—'} → ${person.currentLocation ?? '—'}`
                        : null
                    }
                  />
                  <Detail label="Signature dish" value={person.signatureDish} />
                  <Detail label="Hidden talent" value={person.hiddenTalent} />
                  <Detail label="The song" value={person.song} />
                  <Detail label="Ask me about" value={person.askMeAbout} />
                  <Detail label="Takes after" value={takesAfterName} />
                </dl>

                {!person.claimed && (
                  <button
                    onClick={() => onLightUp(person.id)}
                    className="mt-6 w-full rounded-full bg-glow-gold py-3 font-body font-semibold text-space-deep transition hover:brightness-105 active:scale-[0.98]"
                    data-testid="light-it-up"
                  >
                    ✦ This is me — light it up
                  </button>
                )}

                {(onSave || onAddRelative) && (
                  <div className="mt-4 flex gap-2">
                    {onSave && (
                      <button
                        onClick={() => setEditing(true)}
                        className="flex-1 rounded-full bg-space-deep py-2.5 text-sm text-starlight"
                        data-testid="edit-person"
                      >
                        Edit details
                      </button>
                    )}
                    {onAddRelative && (
                      <button
                        onClick={() => onAddRelative(person)}
                        className="flex-1 rounded-full bg-space-deep py-2.5 text-sm text-starlight"
                        data-testid="add-relative"
                      >
                        + Add a relative
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 border-b border-white/5 py-1">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-starlight">{value}</dd>
    </div>
  );
}
