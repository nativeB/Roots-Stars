import { memo } from 'react';
import { motion } from 'framer-motion';
import type { Person, PositionedNode } from '@roots/shared';

interface StarProps {
  node: PositionedNode;
  person: Person;
  igniting: boolean;
  focused: boolean;
  /** this device's home star — gets a gentle "you are here" treatment */
  isMe?: boolean;
  /** resolved photo URL — rendered as the face inside the orb */
  photoUrl?: string;
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
  reducedMotion,
  onSelect,
}: StarProps) {
  const claimed = person.claimed || igniting;
  const color = claimed ? GOLD : VIOLET;
  const core = claimed ? 9 : 7;
  // deterministic per-star twinkle timing so the sky shimmers, not strobes
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
      style={{ cursor: 'pointer', outline: 'none' }}
      onClick={() => onSelect(person.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(person.id);
        }
      }}
    >
      {/* generous invisible hit target for thumbs */}
      <circle r={30} fill="transparent" />

      {/* outer atmospheric glow */}
      <motion.circle
        r={core * 4.2}
        fill={`url(#halo-${claimed ? 'gold' : 'violet'})`}
        animate={
          reducedMotion
            ? undefined
            : igniting
              ? { scale: [1, 2.6, 1.4], opacity: [0.5, 0.9, 0.55] }
              : { opacity: claimed ? [0.5, 0.72, 0.5] : [0.28, 0.42, 0.28] }
        }
        transition={
          igniting
            ? { duration: 1.2, ease: 'easeOut' }
            : { duration: twinkleDur, delay: twinkleDelay, repeat: Infinity, ease: 'easeInOut' }
        }
        style={{ transformOrigin: 'center' }}
      />

      {/* mid bloom */}
      <circle r={core * 1.9} fill={color} opacity={claimed ? 0.28 : 0.16} filter="url(#glow-soft)" />

      {/* the bright core */}
      <motion.circle
        r={core}
        fill={`url(#core-${claimed ? 'gold' : 'violet'})`}
        stroke={claimed ? '#FFF4DE' : '#E7DBFF'}
        strokeWidth={claimed ? 1.1 : 0.6}
        strokeOpacity={0.85}
        animate={reducedMotion ? undefined : igniting ? { scale: [1, 1.9, 1] } : undefined}
        transition={{ duration: 1, ease: 'easeOut' }}
        data-testid={`star-core-${person.id}`}
        style={{ transformOrigin: 'center' }}
      />

      {/* a face inside the orb, if there is one — clipped to a warm ringed circle */}
      {photoUrl && (
        <g data-testid={`star-photo-${person.id}`}>
          <clipPath id={`clip-${person.id}`}>
            <circle r={core * 1.5} />
          </clipPath>
          <circle r={core * 1.5 + 1.4} fill="none" stroke={color} strokeWidth={1.6} opacity={0.95} />
          <image
            href={photoUrl}
            x={-core * 1.5}
            y={-core * 1.5}
            width={core * 3}
            height={core * 3}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#clip-${person.id})`}
          />
        </g>
      )}

      {/* tiny specular highlight for a jewel-like read (only on bare orbs) */}
      {!photoUrl && (
        <circle cx={-core * 0.3} cy={-core * 0.3} r={core * 0.28} fill="#FFFFFF" opacity={0.7} />
      )}

      {/* "you are here" — a gentle pulsing ring around this device's home star */}
      {isMe && (
        <motion.circle
          r={core + 9}
          fill="none"
          stroke={GOLD}
          strokeWidth={1.4}
          strokeDasharray="3 5"
          animate={reducedMotion ? { opacity: 0.7 } : { opacity: [0.4, 0.9, 0.4], scale: [1, 1.08, 1] }}
          transition={{ duration: 2.6, repeat: reducedMotion ? 0 : Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: 'center' }}
        />
      )}

      {/* focus ring */}
      {focused && (
        <circle r={core + 8} fill="none" stroke={GOLD} strokeWidth={1.5} opacity={0.9} />
      )}

      {/* "you" pill above the home star */}
      {isMe && (
        <text
          y={-core - 12}
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

      {/* name label */}
      <text
        y={core + 22}
        textAnchor="middle"
        fill={claimed ? '#FBF7FF' : '#C9C2EC'}
        fontFamily="Fraunces, serif"
        fontSize={15}
        fontWeight={500}
        letterSpacing={0.2}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {person.name}
      </text>
      {person.signatureEmoji && (
        <text
          y={core + 40}
          textAnchor="middle"
          fontSize={13}
          opacity={0.85}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {person.signatureEmoji}
        </text>
      )}
    </g>
  );
}

export const Star = memo(StarImpl);
