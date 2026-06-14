import { memo } from 'react';
import { motion } from 'framer-motion';
import type { Person, PositionedNode } from '@roots/shared';

interface StarProps {
  node: PositionedNode;
  person: Person;
  igniting: boolean;
  focused: boolean;
  reducedMotion: boolean;
  onSelect: (personId: string) => void;
}

const GOLD = '#FFD08A';
const LAVENDER = '#9B96C4';

/**
 * One person = one star. Claimed stars glow gold; unclaimed are dim lavender,
 * inviting a tap. Each is keyboard-focusable with an accessible label.
 */
function StarImpl({ node, person, igniting, focused, reducedMotion, onSelect }: StarProps) {
  const claimed = person.claimed || igniting;
  const color = claimed ? GOLD : LAVENDER;
  const baseRadius = claimed ? 7 : 5;

  const label = `${person.name}${person.claimed ? '' : ' — unclaimed star, tap to light it up'}`;

  return (
    <g
      transform={`translate(${node.x} ${node.y})`}
      role="button"
      tabIndex={0}
      aria-label={label}
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
      <circle r={22} fill="transparent" />

      {/* glow halo */}
      <motion.circle
        r={baseRadius * 2.6}
        fill={color}
        opacity={claimed ? 0.22 : 0.1}
        filter="url(#glow-soft)"
        animate={
          reducedMotion
            ? undefined
            : igniting
              ? { scale: [1, 2.4, 1.3], opacity: [0.22, 0.6, 0.3] }
              : { opacity: claimed ? [0.18, 0.28, 0.18] : [0.08, 0.13, 0.08] }
        }
        transition={
          igniting
            ? { duration: 1.1, ease: 'easeOut' }
            : { duration: 4 + (node.generation % 3), repeat: Infinity, ease: 'easeInOut' }
        }
      />

      {/* the star core */}
      <motion.circle
        r={baseRadius}
        fill={claimed ? GOLD : LAVENDER}
        style={{ filter: claimed ? 'drop-shadow(0 0 6px rgba(255,208,138,0.9))' : 'none' }}
        animate={reducedMotion ? undefined : igniting ? { scale: [1, 1.8, 1] } : undefined}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        data-claimed={person.claimed ? 'true' : 'false'}
        data-testid={`star-${person.id}`}
      />

      {/* focus ring */}
      {focused && <circle r={baseRadius + 6} fill="none" stroke={GOLD} strokeWidth={1.5} opacity={0.9} />}

      {/* name label */}
      <text
        y={baseRadius + 18}
        textAnchor="middle"
        fill="#F5F3FF"
        fontFamily="Fraunces, serif"
        fontSize={13}
        opacity={0.9}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {person.signatureEmoji ? `${person.signatureEmoji} ` : ''}
        {person.name}
      </text>
    </g>
  );
}

export const Star = memo(StarImpl);
