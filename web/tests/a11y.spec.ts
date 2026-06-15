import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Accessibility floor (§11): axe scan, keyboard focus, list-view fallback. */

test('no serious/critical axe violations on the sky', async ({ page }) => {
  await page.goto('/demo');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});

test('stars are keyboard-focusable and openable', async ({ page }) => {
  await page.goto('/demo');
  // tab to the first focusable star and activate it
  const firstStar = page.locator('g[role="button"]').first();
  await firstStar.focus();
  await expect(firstStar).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
});
