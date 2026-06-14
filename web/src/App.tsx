import { useEffect } from 'react';
import { ConstellationView } from './routes/ConstellationView';
import { DemoView } from './routes/DemoView';

/**
 * Minimal routing without a router dependency:
 *   /j/:slug  → live family constellation (real backend)
 *   /         → static demo sky from fixtures (no backend; used by Phase 1 tests)
 */
export function App() {
  const path = globalThis.location.pathname;
  const match = /^\/j\/([A-Za-z0-9]+)\/?$/.exec(path);

  useEffect(() => {
    // keep the tab title warm
    document.title = 'Roots & Stars';
  }, []);

  if (match) return <ConstellationView slug={match[1]!} />;
  return <DemoView />;
}
