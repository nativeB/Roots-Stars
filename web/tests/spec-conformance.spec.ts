import { test, expect } from '@playwright/test';

/**
 * §6 design-token + typography conformance, and §10 privacy guarantees.
 * Holds the build to the spec's palette and "never indexable" rules.
 */

test.describe('design tokens (§6)', () => {
  test('night-sky base color and token CSS vars are wired', async ({ page }) => {
    await page.goto('/demo');
    const vars = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return {
        deep: s.getPropertyValue('--space-deep').trim(),
        panel: s.getPropertyValue('--space-panel').trim(),
        starlight: s.getPropertyValue('--starlight').trim(),
        muted: s.getPropertyValue('--muted').trim(),
        gold: s.getPropertyValue('--glow-gold').trim(),
        teal: s.getPropertyValue('--aurora-teal').trim(),
        violet: s.getPropertyValue('--aurora-violet').trim(),
      };
    });
    expect(vars.deep.toLowerCase()).toBe('#0b0a1f');
    expect(vars.panel.toLowerCase()).toBe('#16142e');
    expect(vars.starlight.toLowerCase()).toBe('#f5f3ff');
    expect(vars.muted.toLowerCase()).toBe('#9b96c4');
    expect(vars.gold.toLowerCase()).toBe('#ffd08a');
    expect(vars.teal.toLowerCase()).toBe('#6fe3c4');
    expect(vars.violet.toLowerCase()).toBe('#b58cff');
  });

  test('base background is the deep indigo-plum, never pure black', async ({ page }) => {
    await page.goto('/demo');
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe('rgb(11, 10, 31)'); // #0B0A1F
  });

  test('display type is Fraunces; threads use a teal→violet gradient', async ({ page }) => {
    await page.goto('/demo');
    const h1 = page.locator('h1');
    const family = await h1.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(family).toContain('Fraunces');

    // gradient stops exist in the SVG defs
    const stopColors = await page.$$eval('#thread-parent stop', (els) =>
      els.map((e) => e.getAttribute('stop-color')),
    );
    expect(stopColors).toContain('#6FE3C4');
    expect(stopColors).toContain('#B58CFF');
  });

  test('claimed stars are gold, unclaimed are dim lavender', async ({ page }) => {
    await page.goto('/demo');
    // each person is now a portrait orb: claimed burns gold, unclaimed glows violet.
    // Kwame is claimed in the fixture: gold ring around the portrait.
    await expect(page.locator('[data-testid="star-kwame"]')).toHaveAttribute(
      'data-claimed',
      'true',
    );
    await expect(
      page.locator('[data-testid="star-core-kwame"] circle[stroke="#FFD08A"]'),
    ).toHaveCount(1);
    // Adwoa is unclaimed: violet ring (the inviting "unlit" hue)
    await expect(page.locator('[data-testid="star-adwoa"]')).toHaveAttribute(
      'data-claimed',
      'false',
    );
    await expect(
      page.locator('[data-testid="star-core-adwoa"] circle[stroke="#B58CFF"]'),
    ).toHaveCount(1);
  });
});

test.describe('privacy (§10)', () => {
  test('page is noindex / nofollow', async ({ page }) => {
    await page.goto('/demo');
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots).toContain('noindex');
    expect(robots).toContain('nofollow');
  });

  test('robots.txt disallows everything', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).toContain('Disallow: /');
  });
});
