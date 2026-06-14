import { test, expect } from '@playwright/test';

/**
 * The signature moment: tapping an unclaimed star → "light it up" → the star
 * becomes claimed (gold). Phase 1 uses a local stub; Phase 5 wires the real
 * claim + cross-device ignite.
 */
test('a relative can light up their star', async ({ page }) => {
  await page.goto('/');

  // Theo starts unclaimed (dim lavender)
  const theo = page.locator('[data-testid="star-theo"]');
  await expect(theo).toHaveAttribute('data-claimed', 'false');

  // open Theo's card and light it up
  await page.locator('g[aria-label^="Theo"]').click();
  await page.getByTestId('light-it-up').click();

  // after the ignite settles, Theo is claimed → gold
  await expect(theo).toHaveAttribute('data-claimed', 'true', { timeout: 4000 });
  await expect(theo).toHaveAttribute('fill', '#FFD08A');
});

test('list view shows everyone and their relationships (a11y fallback)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /List/ }).click();

  const list = page.getByRole('region', { name: /list view/i });
  await expect(list).toBeVisible();
  // half-sibling case: Iris is child of Walter & Carol
  await expect(list.getByText('Iris', { exact: false })).toBeVisible();
  await expect(list.getByText(/Child of Walter & Carol/)).toBeVisible();
});
