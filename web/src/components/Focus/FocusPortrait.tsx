import { memo } from 'react';
import { motion } from 'framer-motion';
import type { Person } from '@roots/shared';
import { avatarDataUrl } from '../../lib/avatar';

interface FocusPortraitProps {
  person: Person;
  /** relationship caption shown above the name on orbiting faces (e.g. "Mother") */
  relation?: string;
  /** diameter in px */
  size: number;
  /** the centred hero gets the largest, brightest treatment */
  center?: boolean;
  isMe?: boolean;
  igniting?: boolean;
  photoUrl?: string;
  onClick: () => void;
}

const GOLD = '#FFD08A';
const VIOLET = '#B58CFF';

/**
 * One person as a luminous, readable portrait — a real face (photo or warm
 * generated avatar) inside a glowing ring, with their name (and relationship,
 * for orbiting relatives) below. This is the unit the whole focus view is built
 * from: you always see a person, never a dot.
 */
function FocusPortraitImpl({
  person,
  relation,
  size,
  center = false,
  isMe = false,
  igniting = false,
  photoUrl,
  onClick,
}: FocusPortraitProps) {
  const claimed = person.claimed || igniting;
  const color = claimed ? GOLD : VIOLET;
  const face = photoUrl ?? avatarDataUrl(person.name, person.signatureEmoji ?? null);
  const ringW = center ? 4 : 2.5;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex cursor-pointer flex-col items-center gap-1.5 border-0 bg-transparent p-0 outline-none"
      data-testid={`focus-${person.id}`}
      data-person-name={person.name}
      data-claimed={person.claimed ? 'true' : 'false'}
      aria-label={`${person.name}${person.claimed ? '' : ' — unclaimed star, tap to light it up'}`}
    >
      <div className="relative" style={{ width: size, height: size }}>
        {/* soft halo */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${color}55 0%, ${color}00 70%)`,
            transform: 'scale(1.7)',
          }}
          animate={
            igniting
              ? { scale: [1.4, 2.4, 1.8], opacity: [0.6, 1, 0.7] }
              : { opacity: claimed ? [0.55, 0.8, 0.55] : [0.3, 0.45, 0.3] }
          }
          transition={
            igniting
              ? { duration: 1.2, ease: 'easeOut' }
              : { duration: center ? 4 : 5, repeat: Infinity, ease: 'easeInOut' }
          }
        />
        {/* portrait */}
        <motion.div
          className="absolute inset-0 overflow-hidden rounded-full"
          style={{
            boxShadow: `0 0 0 ${ringW}px ${color}, 0 0 ${center ? 36 : 18}px ${color}66`,
            opacity: claimed ? 1 : 0.9,
          }}
          animate={igniting ? { scale: [1, 1.16, 1] } : undefined}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          <img
            src={face}
            alt=""
            draggable={false}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </motion.div>
        {/* "you are here" dashed ring */}
        {isMe && (
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ border: `2px dashed ${GOLD}` }}
            animate={{ opacity: [0.4, 0.9, 0.4], scale: [1.06, 1.12, 1.06] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>

      {/* relationship caption (orbiting faces only) */}
      {relation && !center && (
        <span
          className="font-body text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: claimed ? `${GOLD}cc` : `${VIOLET}cc` }}
        >
          {relation}
        </span>
      )}

      {/* name */}
      <span
        className="max-w-[12rem] truncate text-center font-display font-semibold leading-tight"
        style={{
          color: claimed ? '#FBF7FF' : '#D9D3F2',
          fontSize: center ? 22 : 14,
          textShadow: '0 1px 6px #0B0A1F, 0 0 2px #0B0A1F',
        }}
      >
        {person.name}
      </span>

      {center && (
        <span className="font-body text-xs text-muted">
          {person.claimed ? 'Tap for details' : 'Tap to light this star ✦'}
        </span>
      )}
    </button>
  );
}

export const FocusPortrait = memo(FocusPortraitImpl);
