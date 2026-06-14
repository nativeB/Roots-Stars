import { motion } from 'framer-motion';

interface SkyHeaderProps {
  familyName: string;
  litCount: number;
  totalCount: number;
  showList: boolean;
  onToggleList: () => void;
}

/**
 * Magazine-grade header: a small eyebrow, the family name in Fraunces, and the
 * gamified "X of N stars lit" progress meter — the hook that makes people want
 * to fill the sky.
 */
export function SkyHeader({
  familyName,
  litCount,
  totalCount,
  showList,
  onToggleList,
}: SkyHeaderProps) {
  const pct = totalCount > 0 ? Math.round((litCount / totalCount) * 100) : 0;

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 px-5 pt-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-body text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">
            Our constellation
          </p>
          <h1 className="mt-0.5 max-w-[78vw] font-display text-[26px] font-semibold leading-[1.08] text-starlight sm:text-[32px]">
            {familyName}
          </h1>

          {/* progress meter */}
          <div className="mt-2 flex items-center gap-2.5">
            <span className="font-display text-sm text-glow-gold" data-testid="lit-count">
              <span className="font-semibold">{litCount}</span>
              <span className="text-muted"> of {totalCount} stars lit</span>
            </span>
          </div>
          <div className="mt-1.5 h-[3px] w-44 max-w-[55vw] overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, #6FE3C4, #FFD08A)',
                boxShadow: '0 0 8px rgba(255,208,138,0.8)',
              }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 22 }}
              data-testid="progress-fill"
            />
          </div>
        </div>

        <button
          onClick={onToggleList}
          aria-pressed={showList}
          className="pointer-events-auto shrink-0 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-starlight backdrop-blur-md transition hover:bg-white/10"
        >
          {showList ? '✦ Sky' : '☰ List'}
        </button>
      </div>
    </header>
  );
}
