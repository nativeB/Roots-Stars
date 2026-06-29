import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Person, Union } from '@roots/shared';
import { immediateFamily, type Relative } from '../../layout/immediateFamily';
import { FocusPortrait } from './FocusPortrait';

interface FocusViewProps {
  people: Person[];
  unions: Union[];
  /** the star the shell currently has open (we keep our own walk-cursor in sync) */
  focusedId: string | null;
  ignitingId: string | null;
  meId?: string | null;
  photoUrlFor?: (personId: string) => string | undefined;
  /** opens the person card / claim flow (tap the centred portrait) */
  onSelect: (personId: string) => void;
}

/** where a ring of relatives sits around the centre */
type Slot = { x: number; y: number };

// portraits per band before wrapping to another row. Keeps faces from colliding
// on a phone — a row of 8 children becomes 2 readable rows of ≤PER_ROW.
const PER_ROW = 5;
const COL_GAP = 1.02; // layout-units between adjacent faces in a row
const ROW_GAP = 0.92; // layout-units between wrapped rows

/**
 * Fan relatives across one or more horizontal bands centred on x=0. Large groups
 * (many children/siblings) wrap onto stacked rows that grow *away* from centre
 * (dir = -1 up for parents/siblings, +1 down for children) so nothing piles up.
 */
function fanRows(rels: Relative[], baseY: number, dir: 1 | -1): Map<string, Slot> {
  const out = new Map<string, Slot>();
  const n = rels.length;
  if (n === 0) return out;
  const rows = Math.ceil(n / PER_ROW);
  for (let row = 0; row < rows; row++) {
    const slice = rels.slice(row * PER_ROW, row * PER_ROW + PER_ROW);
    const cols = slice.length;
    const start = -((cols - 1) * COL_GAP) / 2;
    const y = baseY + dir * row * ROW_GAP;
    slice.forEach((r, i) => out.set(r.person.id, { x: start + i * COL_GAP, y }));
  }
  return out;
}

/**
 * FOCUS / WALK view — the hero experience. One big, readable person sits at the
 * centre; their immediate family orbits them (parents above, partners beside,
 * children below, siblings flanking). Tap any relative and they glide to the
 * centre with their own family swinging into place. Tap the centre to open the
 * card. You always *see* a face and a name, never a field of dots.
 */
export function FocusView({
  people,
  unions,
  focusedId,
  ignitingId,
  meId,
  photoUrlFor,
  onSelect,
}: FocusViewProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // who's at the centre of the walk. Default: "you" if known, else the eldest
  // root (matriarch/patriarch) so first load lands on the family's origin.
  const rootId = useMemo(() => {
    if (meId && people.some((p) => p.id === meId)) return meId;
    const root = people.find((p) => !p.parentUnionId) ?? people[0];
    return root?.id ?? null;
  }, [people, meId]);

  const [centerId, setCenterId] = useState<string | null>(rootId);

  // keep the centre in sync if the family loads after mount, or the shell focuses
  // someone (e.g. via the list view or "Find me").
  useEffect(() => {
    if (!centerId && rootId) setCenterId(rootId);
  }, [rootId, centerId]);
  useEffect(() => {
    if (focusedId && focusedId !== centerId) setCenterId(focusedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedId]);

  const fam = useMemo(
    () => (centerId ? immediateFamily(centerId, people, unions) : null),
    [centerId, people, unions],
  );

  // siblings are secondary context on a parent→child walk; show a few flanking
  // the centre and fold the rest into a "+N more" chip rather than crowding.
  const SIB_PER_SIDE = 3;
  const sibsShown = useMemo(() => (fam ? fam.siblings.slice(0, SIB_PER_SIDE * 2) : []), [fam]);
  const sibsHidden = fam ? fam.siblings.length - sibsShown.length : 0;

  // positions for the surrounding ring (in an abstract -1..1-ish space; the
  // outer wrapper scales it to the viewport). y grows downward.
  const slots = useMemo(() => {
    const m = new Map<string, Slot>();
    if (!fam) return m;
    // parents above (wrap upward), children below (wrap downward)
    for (const [id, s] of fanRows(fam.parents, -1.15, -1)) m.set(id, s);
    for (const [id, s] of fanRows(fam.children, 1.15, 1)) m.set(id, s);
    // partners hug the centre on the sides
    fam.partners.forEach((r, i) => {
      const side = i % 2 === 0 ? 1 : -1;
      m.set(r.person.id, { x: side * (0.72 + Math.floor(i / 2) * 0.36), y: 0 });
    });
    // siblings: tidy vertical columns flanking the centre (left/right), stepping
    // up so they read as a list, not a diagonal pile.
    sibsShown.forEach((r, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const tier = Math.floor(i / 2);
      m.set(r.person.id, { x: side * 1.18, y: -0.5 - tier * 0.62 });
    });
    return m;
  }, [fam, sibsShown]);

  if (!fam) {
    return <div className="absolute inset-0 bg-space-deep" />;
  }

  const ring: Relative[] = [
    ...fam.parents,
    ...fam.partners,
    ...sibsShown,
    ...fam.children,
  ];

  // walk to a relative (recentre). Tapping the centre opens the card.
  const walkTo = (id: string) => setCenterId(id);

  // base pixels per layout-unit; scaled down to fit whatever the widest/tallest
  // family ring needs so nothing spills off a phone screen.
  const UX = 168; // horizontal
  const UY = 178; // vertical
  const ORBIT = 84; // orbit portrait diameter
  const CENTER = 172; // hero diameter

  const fit = useMemo(() => {
    let maxX = 1,
      maxY = 1;
    for (const s of slots.values()) {
      maxX = Math.max(maxX, Math.abs(s.x));
      maxY = Math.max(maxY, Math.abs(s.y));
    }
    // half-extent in px (+ portrait radius + label headroom) vs available half-size
    const needW = maxX * UX + ORBIT / 2 + 70;
    const needH = maxY * UY + ORBIT / 2 + 90;
    const availW = size.width / 2 - 12;
    const availH = (size.height - 250) / 2; // header/privacy-banner + footer chrome
    const sc = Math.min(1, availW / needW, availH / needH);
    return Number.isFinite(sc) && sc > 0 ? sc : 1;
  }, [slots, size]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      data-testid="focus-view"
    >
      {/* the stage is centred (nudged below the header) and scaled to fit;
          positions are relative to its middle */}
      <div
        className="absolute left-1/2 top-1/2 h-0 w-0"
        style={{ transform: `translateY(40px) scale(${fit})` }}
      >
        {/* connector threads from centre to each relative */}
        <svg
          className="pointer-events-none absolute"
          style={{ left: -1200, top: -1200, width: 2400, height: 2400, overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="focus-thread" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7BE0CF" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#B58CFF" stopOpacity="0.35" />
            </linearGradient>
          </defs>
          {ring.map((r) => {
            const s = slots.get(r.person.id);
            if (!s) return null;
            return (
              <line
                key={`thread-${r.person.id}`}
                x1={1200}
                y1={1200}
                x2={1200 + s.x * UX}
                y2={1200 + s.y * UY}
                stroke="url(#focus-thread)"
                strokeWidth={2}
              />
            );
          })}
        </svg>

        {/* surrounding relatives */}
        <AnimatePresence mode="popLayout">
          {ring.map((r) => {
            const s = slots.get(r.person.id)!;
            return (
              <motion.div
                key={r.person.id}
                className="absolute"
                style={{ x: '-50%', y: '-50%' }}
                initial={reducedMotion ? false : { opacity: 0, scale: 0.6, left: 0, top: 0 }}
                animate={{ opacity: 1, scale: 1, left: s.x * UX, top: s.y * UY }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 240, damping: 28 }}
              >
                <FocusPortrait
                  person={r.person}
                  relation={r.label}
                  size={ORBIT}
                  isMe={meId === r.person.id}
                  igniting={ignitingId === r.person.id}
                  photoUrl={photoUrlFor?.(r.person.id)}
                  onClick={() => walkTo(r.person.id)}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* the centred hero — big, readable, tap opens the card */}
        <motion.div
          key={`center-${fam.focus.id}`}
          className="absolute"
          style={{ left: 0, top: 0, x: '-50%', y: '-50%' }}
          initial={reducedMotion ? false : { scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        >
          <FocusPortrait
            person={fam.focus}
            size={CENTER}
            center
            isMe={meId === fam.focus.id}
            igniting={ignitingId === fam.focus.id}
            photoUrl={photoUrlFor?.(fam.focus.id)}
            onClick={() => onSelect(fam.focus.id)}
          />
        </motion.div>

        {/* overflow siblings folded into a quiet chip beside the centre */}
        {sibsHidden > 0 && (
          <motion.div
            key={`sibs-more-${fam.focus.id}`}
            className="absolute"
            style={{ left: 1.18 * UX, top: -0.5 * UY - SIB_PER_SIDE * 0.62 * UY, x: '-50%', y: '-50%' }}
            initial={reducedMotion ? false : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 240, damping: 28 }}
          >
            <div className="rounded-full border border-aurora-violet/40 bg-aurora-violet/10 px-3 py-1.5 font-body text-xs font-medium text-aurora-violet">
              +{sibsHidden} more siblings
            </div>
          </motion.div>
        )}
      </div>

      {/* gentle hint that the orbiting faces are tappable */}
      <p className="pointer-events-none absolute inset-x-0 top-24 text-center font-body text-xs text-muted/70">
        Tap a face to walk the family · tap the centre for details
      </p>
    </div>
  );
}
