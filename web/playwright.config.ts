import { defineConfig, devices } from '@playwright/test';

/**
 * UI is held to the spec here: critical flows, visual snapshots, §6 design-token
 * assertions, accessibility, reduced-motion, and privacy.
 *
 * Snapshot resolution is capped: no captured image exceeds 2000px on either
 * dimension (mobile is 380px wide; desktop viewport is 1440×900 @ scale 1).
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  // Snapshots can differ a hair across machines; allow a small ratio.
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'mobile',
      use: {
        // spec: design at ~380px, thumb-reachable, one-handed
        viewport: { width: 380, height: 780 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        // capped well under 2000px on both dimensions, scale 1
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      },
    },
  ],
});
