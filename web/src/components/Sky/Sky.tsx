import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { Person, Union } from '@roots/shared';
import { computeLayout } from '../../layout/computeLayout';
import { computeLineage } from '../../layout/lineagePath';
import { SkyDefs } from './SkyDefs';
import { Star } from './Star';
import { Thread } from './Thread';
import { usePanZoom } from './usePanZoom';

interface SkyProps {
  people: Person[];
  unions: Union[];
  focusedId: string | null;
  /** person currently igniting (claim animation), or null */
  ignitingId: string | null;
  onSelect: (personId: string) => void;
}

const PULSE_STAGGER = 0.12; // seconds per generation depth

/** The living constellation canvas. */
export function Sky({ people, unions, focusedId, ignitingId, onSelect }: SkyProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });

  const layout = useMemo(() => computeLayout(people, unions), [people, unions]);
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  // lineage thread ids → depth, for the igniting person
  const igniteSegments = useMemo(() => {
    if (!ignitingId) return new Map<string, number>();
    const segs = computeLineage(ignitingId, people, unions);
    return new Map(segs.map((s) => [s.threadId, s.depth]));
  }, [ignitingId, people, unions]);

  const { viewport, onPointerDown, onPointerMove, onPointerUp, onWheel, reset } = usePanZoom({
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
    reset(layout.bounds, size.width, size.height);
    didFit.current = true;
  }, [layout.bounds, size, reset]);

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
      >
        <SkyDefs />
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
                  reducedMotion={reducedMotion}
                  onSelect={onSelect}
                />
              );
            })}
          </g>
        </g>
      </svg>
    </div>
  );
}
