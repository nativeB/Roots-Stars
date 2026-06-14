import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const slug = readFileSync(resolve(__dirname, '.live-slug'), 'utf8').trim();
const invite = `/j/${slug}`;

// Live ids are cuids, so address stars by name via data-person-name.
const star = (page: Page, name: string) => page.locator(`g[data-person-name="${name}"]`);

/**
 * End-to-end against the real backend: live snapshot load, claiming a star,
 * and cross-device realtime (a second context sees the claim without refresh).
 */

test('loads the live family from the invite link', async ({ page }) => {
  await page.goto(invite);
  await page.getByRole('button', { name: /Got it/ }).click();
  await expect(star(page, 'Walter')).toBeVisible();
  await expect(star(page, 'Iris')).toBeVisible(); // half-sibling
});

test('a relative can claim their star (persists to the backend)', async ({ page }) => {
  await page.goto(invite);
  await page.getByRole('button', { name: /Got it/ }).click();

  await expect(star(page, 'Theo')).toHaveAttribute('data-claimed', 'false');
  await star(page, 'Theo').click();
  await expect(page.getByTestId('claim-name')).toBeVisible();
  await page.getByTestId('light-it-up').click();
  await expect(star(page, 'Theo')).toHaveAttribute('data-claimed', 'true', { timeout: 5000 });

  // reload → claim persisted server-side
  await page.reload();
  await expect(star(page, 'Theo')).toHaveAttribute('data-claimed', 'true', { timeout: 5000 });
});

test('a relative can edit their details (persists + live to others)', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();
  await a.goto(invite);
  await b.goto(invite);
  await a.getByRole('button', { name: /Got it/ }).click();
  await b.getByRole('button', { name: /Got it/ }).click();

  // edit Walter (a claimed star → read-only card with Edit) on device A
  await star(a, 'Walter').click();
  await a.getByTestId('edit-person').click();
  await a.getByTestId('save-person').waitFor();
  await a.locator('input').first().fill('Walter Snr');
  await a.getByTestId('save-person').click();

  // device B sees the new name without reload
  await expect(star(b, 'Walter Snr')).toBeVisible({ timeout: 6000 });

  await ctxA.close();
  await ctxB.close();
});

test('a relative can be added and appears live for others', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();
  await a.goto(invite);
  await b.goto(invite);
  await a.getByRole('button', { name: /Got it/ }).click();
  await b.getByRole('button', { name: /Got it/ }).click();

  // add a child of Edith (a claimed star → read-only card with Add-relative).
  // Edith is never renamed by other tests, so this is order-independent.
  await star(a, 'Edith').click();
  await a.getByTestId('add-relative').click();
  await a.getByTestId('new-relative-name').fill('Juno');
  await a.getByTestId('rel-child').click();
  await a.getByTestId('add-relative-submit').click();

  // appears on both devices
  await expect(star(a, 'Juno')).toBeVisible({ timeout: 6000 });
  await expect(star(b, 'Juno')).toBeVisible({ timeout: 6000 });

  await ctxA.close();
  await ctxB.close();
});

test('a second device sees a claim live, without refreshing', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();

  await a.goto(invite);
  await b.goto(invite);
  await a.getByRole('button', { name: /Got it/ }).click();
  await b.getByRole('button', { name: /Got it/ }).click();

  // claim Maya on device A (unclaimed → "Light your star" flow)
  await star(a, 'Maya').click();
  await expect(a.getByTestId('claim-name')).toBeVisible();
  await a.getByTestId('light-it-up').click();

  // device B reflects it without any reload
  await expect(star(b, 'Maya')).toHaveAttribute('data-claimed', 'true', { timeout: 6000 });

  await ctxA.close();
  await ctxB.close();
});
