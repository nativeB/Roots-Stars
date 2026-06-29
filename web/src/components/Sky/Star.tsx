import { memo } from 'react';
import { motion } from 'framer-motion';
import type { Person, PositionedNode } from '@roots/shared';
import { avatarDataUrl } from '../../lib/avatar';

interface StarProps {
  node: PositionedNode;
  person: Person;
  igniting: boolean;
  focused: boolean;
  /** this device's home star — gets a gentle "you are here" treatment */
  isMe?: boolean;
  /** resolved photo URL — rendered as the face inside the orb */
  photoUrl?: string;
  /** show the name label (claimed / focused / near-focus / zoomed-in); else a quiet dot */
  showLabel?: boolean;
  reducedMotion: boolean;
  onSelect: (personId: string) => void;
}

const GOLD = '#FFD08A';
const VIOLET = '#B58CFF';

/**
 * One person = one luminous star. Claimed stars burn warm gold with a layered
 * halo; unclaimed stars glow a softer violet, quietly inviting a tap. Each is a
 * generous, thumb-friendly, keyboard-focusable target.
 */
function StarImpl({
  node,
  person,
  igniting,
  focused,
  isMe,
  photoUrl,
  showLabel = true,
  reducedMotion,
  onSelect,
}: StarProps) {
  const claimed = person.claimed || igniting;
  const color = claimed ? GOLD : VIOLET;
  // the portrait radius — this IS the star now (a face, not a dot)
  const R = claimed ? 22 : 19;
  const face = photoUrl ?? avatarDataUrl(person.name, person.signatureEmoji ?? null);
  const clipId = `clip-${person.id}`;
  const twinkleDur = 3.4 + ((node.x * 7 + node.y * 13) % 1000) / 1000 * 2.6;
  const twinkleDelay = ((node.x * 31 + node.y * 17) % 1000) / 1000 * 2;

  const label = `${person.name}${person.claimed ? '' : ' — unclaimed star, tap to light it up'}`;

  return (
    <g
      transform={`translate(${node.x} ${node.y})`}
      role="button"
      tabIndex={0}
      aria-label={label}
      data-person-name={person.name}
      data-claimed={person.claimed ? 'true' : 'false'}
      data-testid={`star-${person.id}`}
      style={{ cursor: 'pointer', outline: 'none', pointerEvents: 'none' }}
      onClick={() => onSelect(person.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(person.id);
        }
      }}
    >
      {/* soft glow behind the portrait (gold claimed / violet unclaimed) */}
      <motion.circle
        r={R * 1.9}
        fill={`url(#halo-${claimed ? 'gold' : 'violet'})`}
        animate={
          reducedMotion
            ? undefined
            : igniting
              ? { scale: [1, 2.2, 1.3], opacity: [0.55, 0.95, 0.6] }
              : { opacity: claimed ? [0.5, 0.7, 0.5] : [0.3, 0.45, 0.3] }
        }
        transition={
          igniting
            ? { duration: 1.2, ease: 'easeOut' }
            : { duration: twinkleDur, delay: twinkleDelay, repeat: Infinity, ease: 'easeInOut' }
        }
        style={{ transformOrigin: 'center' }}
      />

      <clipPath id={clipId}>
        <circle r={R} />
      </clipPath>

      {/* the portrait — photo or warm generated avatar. THE star. */}
      <motion.g
        animate={reducedMotion ? undefined : igniting ? { scale: [1, 1.18, 1] } : undefined}
        transition={{ duration: 1, ease: 'easeOut' }}
        style={{ transformOrigin: 'center' }}
        data-testid={`star-core-${person.id}`}
        data-claimed={person.claimed ? 'true' : 'false'}
      >
        <image
          href={face}
          x={-R}
          y={-R}
          width={R * 2}
          height={R * 2}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
          opacity={claimed ? 1 : 0.88}
        />
        {/* the ring: gold when claimed, violet otherwise */}
        <circle
          r={R + 1.4}
          fill="none"
          stroke={color}
          strokeWidth={claimed ? 2.6 : 1.8}
          opacity={0.96}
        />
      </motion.g>

      {/* generous invisible hit target (only interactive element) */}
      <circle r={R + 4} fill="transparent" style={{ pointerEvents: 'all' }} />

      {/* "you are here" pulsing ring */}
      {isMe && (
        <motion.circle
          r={R + 6}
          fill="none"
          stroke={GOLD}
          strokeWidth={1.6}
          strokeDasharray="3 5"
          animate={reducedMotion ? { opacity: 0.7 } : { opacity: [0.4, 0.9, 0.4], scale: [1, 1.06, 1] }}
          transition={{ duration: 2.6, repeat: reducedMotion ? 0 : Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: 'center' }}
        />
      )}

      {/* focus ring */}
      {focused && <circle r={R + 6} fill="none" stroke={GOLD} strokeWidth={2} opacity={0.95} />}

      {/* "you" pill above the home star */}
      {isMe && (
        <text
          y={-R - 10}
          textAnchor="middle"
          fill={GOLD}
          fontFamily="Hanken Grotesk, sans-serif"
          fontSize={10}
          fontWeight={600}
          letterSpacing={1}
          style={{ pointerEvents: 'none', userSelect: 'none', textTransform: 'uppercase' }}
        >
          you
        </text>
      )}

      {/* name pill under the portrait — like the reference trees */}
      {showLabel && (
        <g style={{ pointerEvents: 'none', userSelect: 'none' }}>
          <text
            y={R + 18}
            textAnchor="middle"
            fill={claimed ? '#FBF7FF' : '#D9D3F2'}
            fontFamily="Fraunces, serif"
            fontSize={14}
            fontWeight={600}
            letterSpacing={0.2}
            style={{ paintOrder: 'stroke' }}
            stroke="#0B0A1F"
            strokeWidth={3}
            strokeLinejoin="round"
          >
            {person.name}
          </text>
        </g>
      )}
    </g>
  );
}

export const Star = memo(StarImpl);
