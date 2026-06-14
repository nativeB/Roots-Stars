import { test, expect } from '@playwright/test';

/**
 * The signature ignite moment + its reduced-motion variant (§6, §11).
 * With motion: a ripple ring appears and the canvas flags igniting.
 * Reduced-motion: the star swaps to gold instantly, with NO ripple.
 */

test('ignite shows the ripple and brightens the sky (full motion)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');

  await page.locator('g[aria-label^="Theo"]').click();
  await page.getByTestId('light-it-up').click();

  // ripple is present during the ~2s ignite
  await expect(page.locator('[data-testid="ignite-ripple"]')).toBeVisible();
  await expect(page.locator('[data-testid="sky-canvas"]')).toHaveAttribute('data-igniting', 'true');

  // settles: star ends claimed/gold
  await expect(page.locator('[data-testid="star-theo"]')).toHaveAttribute(
    'data-claimed',
    'true',
    { timeout: 4000 },
  );
});

test('reduced-motion: instant gold, no ripple', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  await page.locator('g[aria-label^="Theo"]').click();
  await page.getByTestId('light-it-up').click();

  // no ripple is ever rendered under reduced-motion
  await expect(page.locator('[data-testid="ignite-ripple"]')).toHaveCount(0);
  // the star reaches gold immediately
  await expect(page.locator('[data-testid="star-core-theo"]')).toHaveAttribute(
    'fill',
    '#FFD08A',
  );
});
