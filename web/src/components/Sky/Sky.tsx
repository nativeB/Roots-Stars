import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Person, Union } from '@roots/shared';
import { computeLayout } from '../../layout/computeLayout';
import { computeLineage } from '../../layout/lineagePath';
import { SkyDefs } from './SkyDefs';
import { Star } from './Star';
import { Thread } from './Thread';
import { Starfield } from './Starfield';
import { IgniteOverlay } from './IgniteOverlay';
import { usePanZoom } from './usePanZoom';

interface SkyProps {
  people: Person[];
  unions: Union[];
  focusedId: string | null;
  /** person currently igniting (claim animation), or null */
  ignitingId: string | null;
  /** this device's home/"you are here" star */
  meId?: string | null;
  onSelect: (personId: string) => void;
  /** chrome insets so the auto-fit clears the header / footer */
  topInset?: number;
  bottomInset?: number;
}

const PULSE_STAGGER = 0.12; // seconds per generation depth

/** The living constellation canvas. */
export function Sky({
  people,
  unions,
  focusedId,
  ignitingId,
  meId = null,
  onSelect,
  topInset = 150,
  bottomInset = 120,
}: SkyProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });

  const layout = useMemo(() => computeLayout(people, unions), [people, unions]);
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const ignitingNode = ignitingId
    ? (layout.nodes.find((n) => n.personId === ignitingId) ?? null)
    : null;

  // lineage thread ids → depth, for the igniting person
  const igniteSegments = useMemo(() => {
    if (!ignitingId) return new Map<string, number>();
    const segs = computeLineage(ignitingId, people, unions);
    return new Map(segs.map((s) => [s.threadId, s.depth]));
  }, [ignitingId, people, unions]);

  const { viewport, onPointerDown, onPointerMove, onPointerUp, onWheel, reset, focusOn } =
    usePanZoom({
      x: 0,
      y: 0,
      scale: 1,
    });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // fit the sky on first layout + size
  const didFit = useRef(false);
  useEffect(() => {
    if (didFit.current || size.width <= 1) return;
    reset(layout.bounds, size.width, size.height, { top: topInset, bottom: bottomInset });
    didFit.current = true;
  }, [layout.bounds, size, reset, topInset, bottomInset]);

  // tap-to-focus: smoothly zoom toward the selected star, parking it in the
  // upper third so the card rising from the bottom doesn't cover it.
  useEffect(() => {
    if (!focusedId || size.width <= 1) return;
    const node = layout.nodes.find((n) => n.personId === focusedId);
    if (!node) return;
    const targetScale = Math.min(1.9, Math.max(viewport.scale, 1.25));
    const sx = size.width / 2;
    const sy = Math.min(size.height * 0.34, size.height - bottomInset - 40);
    focusOn(node.x, node.y, sx, sy, targetScale, reducedMotion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedId]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 touch-none select-none"
      style={{ overflow: 'hidden' }}
    >
      <svg
        width="100%"
        height="100%"
        role="application"
        aria-roledescription="Family constellation"
        aria-label="Family constellation. Pan to explore, tap a star to open it, or switch to List view for a text version."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
        style={{ display: 'block' }}
        data-testid="sky-canvas"
        data-igniting={ignitingId ? 'true' : 'false'}
      >
        <SkyDefs />

        {/* fixed, far-away dust for depth */}
        <Starfield width={size.width} height={size.height} reducedMotion={reducedMotion} />

        <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}>
          {/* threads under stars */}
          <g>
            {layout.threads.map((t) => (
              <Thread
                key={t.id}
                thread={t}
                igniting={igniteSegments.has(t.id)}
                pulseDelay={(igniteSegments.get(t.id) ?? 0) * PULSE_STAGGER}
                reducedMotion={reducedMotion}
              />
            ))}
          </g>
          {/* stars */}
          <g>
            {layout.nodes.map((n) => {
              const person = peopleById.get(n.personId);
              if (!person) return null;
              return (
                <Star
                  key={n.personId}
                  node={n}
                  person={person}
                  igniting={ignitingId === n.personId}
                  focused={focusedId === n.personId}
                  isMe={meId === n.personId}
                  reducedMotion={reducedMotion}
                  onSelect={onSelect}
                />
              );
            })}
          </g>

          {/* ignite ripple at the newly-lit star */}
          {ignitingNode && (
            <IgniteOverlay x={ignitingNode.x} y={ignitingNode.y} reducedMotion={reducedMotion} />
          )}
        </g>

        {/* whole-sky brightness nudge during ignite (skipped under reduced-motion) */}
        <AnimatePresence>
          {ignitingId && !reducedMotion && (
            <motion.rect
              x={0}
              y={0}
              width="100%"
              height="100%"
              fill="#FFD08A"
              pointerEvents="none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.06, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: 'easeInOut' }}
            />
          )}
        </AnimatePresence>
      </svg>
    </div>
  );
}
