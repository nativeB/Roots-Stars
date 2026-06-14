import { test, expect } from '@playwright/test';

/**
 * Returning-visitor + self-attach UX:
 *  - claiming a star marks it as "you" (home base) with a YOU label
 *  - "Find me" appears once a home star exists and the card is closed
 *  - the top-level "Add your star" flow lets a new visitor self-attach
 */

test('claiming makes a home star with a "you" marker and Find me', async ({ page }) => {
  await page.goto('/');

  await page.locator('g[aria-label^="Adwoa"]').click();
  await page.getByTestId('light-it-up').click();
  await expect(page.locator('[data-testid="star-adwoa"]')).toHaveAttribute(
    'data-claimed',
    'true',
    { timeout: 4000 },
  );

  // a "YOU" label is rendered on the home star
  await expect(page.locator('text=you').first()).toBeVisible();

  // close the card → Find me recenters on home
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('find-me')).toBeVisible();
  await page.getByTestId('find-me').click();
  await expect(page.getByRole('dialog')).toBeVisible(); // recenters + opens home card
});

test('top-level "Add your star" lets a new visitor self-attach', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('add-your-star').click();
  await page.getByTestId('your-name').fill('Kojo Jr');
  await page.getByTestId('anchor-pick').selectOption({ label: 'Yaw' });
  await page.getByTestId('yourel-child').click();
  await page.getByTestId('add-your-star-submit').click();

  // the new star appears, claimed (it's you)
  await expect(page.locator('g[data-person-name="Kojo Jr"]')).toBeVisible({ timeout: 4000 });
  await expect(page.locator('g[data-person-name="Kojo Jr"]')).toHaveAttribute(
    'data-claimed',
    'true',
    { timeout: 4000 },
  );
});

test('takes-after shows in the card after editing', async ({ page }) => {
  await page.goto('/');

  // Kwame is claimed → read-only card → edit
  await page.locator('g[aria-label^="Kwame"]').click();
  await page.getByTestId('edit-person').click();
  // expand to reveal the "takes after" picker
  await page.getByRole('button', { name: /add more sparkle/i }).click();
  await page.getByRole('combobox').selectOption({ label: 'Akosua' });
  await page.getByTestId('save-person').click();

  // after save we're back on Kwame's read-only card → it shows "Takes after Akosua"
  await expect(page.getByText('Takes after')).toBeVisible();
  await expect(page.getByRole('dialog').getByText('Akosua')).toBeVisible();
});
