import { useEffect } from 'react';
import { ConstellationView } from './routes/ConstellationView';
import { BackOffice } from './routes/BackOffice';
import { DemoView } from './routes/DemoView';
import { Landing } from './routes/Landing';

/**
 * Minimal routing without a router dependency:
 *   /j/:slug/manage → host-only back office (password-gated)
 *   /j/:slug        → live family constellation (real backend)
 *   /demo           → static demo sky from fixtures (no backend; Phase 1 tests)
 *   /               → invite-only landing (no fake family on the public root)
 */
export function App() {
  const path = globalThis.location.pathname;
  const manage = /^\/j\/([A-Za-z0-9_-]+)\/manage\/?$/.exec(path);
  const family = /^\/j\/([A-Za-z0-9_-]+)\/?$/.exec(path);
  const isDemo = /^\/demo\/?$/.test(path);

  useEffect(() => {
    document.title = 'Roots & Stars';
  }, []);

  if (manage) return <BackOffice slug={manage[1]!} />;
  if (family) return <ConstellationView slug={family[1]!} />;
  if (isDemo) return <DemoView />;
  return <Landing />;
}
