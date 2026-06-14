import { test, expect } from '@playwright/test';

/**
 * Visual-regression snapshots — the look held to the candle of the spec.
 * Resolution is capped by the project viewports (mobile 380px, desktop 1440px)
 * at deviceScaleFactor 1, so no captured image exceeds 2000px on either axis.
 *
 * Run with `npm run test:e2e:update` to (re)generate baselines after intentional
 * visual changes.
 */

// Freeze ambient motion so snapshots are deterministic.
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('the populated constellation', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="sky-canvas"]').waitFor();
  // let the fit-to-view settle
  await page.waitForTimeout(400);
  await expect(page).toHaveScreenshot('constellation.png', { fullPage: false });
});

test('a person card', async ({ page }) => {
  await page.goto('/');
  await page.locator('g[aria-label^="Walter"]').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.waitForTimeout(300);
  await expect(page.getByRole('dialog')).toHaveScreenshot('person-card.png');
});

test('the accessible list view', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /List/ }).click();
  await expect(page.getByRole('region', { name: /list view/i })).toBeVisible();
  await expect(page).toHaveScreenshot('list-view.png', { fullPage: false });
});
