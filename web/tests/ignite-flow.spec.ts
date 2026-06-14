import { test, expect } from '@playwright/test';

/**
 * The signature moment: tapping an unclaimed star opens "Light your star" →
 * lighting it claims the star (gold). Phase 1 uses a local stub; Phase 5 wires
 * the real claim + cross-device ignite.
 */
test('a relative can light up their star', async ({ page }) => {
  await page.goto('/');

  // Adwoa starts unclaimed
  const adwoa = page.locator('[data-testid="star-adwoa"]');
  await expect(adwoa).toHaveAttribute('data-claimed', 'false');

  // open the claim flow and light it up
  await page.locator('g[aria-label^="Adwoa"]').click();
  await expect(page.getByTestId('claim-name')).toBeVisible();
  await page.getByTestId('light-it-up').click();

  // after the ignite settles, Adwoa is claimed → gold gradient core
  await expect(adwoa).toHaveAttribute('data-claimed', 'true', { timeout: 4000 });
  await expect(page.locator('[data-testid="star-core-adwoa"]')).toHaveAttribute(
    'fill',
    'url(#core-gold)',
  );
});

test('list view shows everyone and their relationships (a11y fallback)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /List/ }).click();

  const list = page.getByRole('region', { name: /list view/i });
  await expect(list).toBeVisible();
  // Adwoa's row shows her name and her parentage (child of Kwame & Akosua)
  const adwoaRow = list.getByRole('button').filter({ hasText: 'Adwoa' });
  await expect(adwoaRow).toContainText('Child of Kwame & Akosua');
  // at least one parentage line is rendered (relationship resolution works)
  await expect(list.getByText(/Child of Kwame & Akosua/).first()).toBeVisible();
});
