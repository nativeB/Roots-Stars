import { defineConfig } from '@playwright/test';

/**
 * Live integration tests — exercise the real API + Postgres + realtime via
 * `/j/:slug`. Requires Docker Postgres up. global-setup seeds a family and
 * starts the API; the web dev server proxies /api + /socket.io to it.
 *
 * Run: npm run test:e2e:live
 */
export default defineConfig({
  testDir: './tests/live',
  testMatch: /.*\.spec\.ts/,
  globalSetup: './tests/live/global-setup.ts',
  globalTeardown: './tests/live/global-teardown.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://localhost:5173', trace: 'on-first-retry' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'mobile', use: { viewport: { width: 380, height: 780 }, hasTouch: true, deviceScaleFactor: 1 } },
  ],
});
