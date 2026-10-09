/**
 * End-to-end checks, run against dist/ served with the production headers
 * (scripts/serve-dist.mjs). Run `pnpm build` first, then `pnpm test:e2e`.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const PAGES = ['/', '/grc/', '/iam/', '/soc/', '/projects/', '/projects/awareness-platform/', '/resume/', '/contact/', '/security/'];

/** Collect console errors and uncaught exceptions for a page. */
function watchConsole(page: Page): string[] {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(m.text());
    // Permissions-Policy and CSP problems are warnings in Chrome; fail on them too.
    if (m.type() === 'warning' && /Permissions-Policy|Content Security Policy|Trusted Type/i.test(m.text())) problems.push(m.text());
  });
  page.on('pageerror', (e) => problems.push(e.message));
  return problems;
}

for (const path of PAGES) {
  test(`${path} loads cleanly under the production CSP`, async ({ page }) => {
    const problems = watchConsole(page);
    const response = await page.goto(path, { waitUntil: 'load' });
    expect(response?.status()).toBe(200);

    const csp = response?.headers()['content-security-policy'] ?? '';
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain('unsafe-inline');
    expect(csp.split(', default-src').length).toBe(1); // exactly one policy

    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
    await expect(page.locator('a[href="#"]')).toHaveCount(0);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    await page.waitForTimeout(300);
    expect(problems).toEqual([]);
  });

  test(`${path} has no axe accessibility violations`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'load' });
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
  });
}

test('no horizontal scroll at 320px wide', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const path of PAGES) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test('unknown paths return the custom 404 page with status 404', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('Page not found');
});

test('security.txt has the required fields', async ({ request }) => {
  const res = await request.get('/.well-known/security.txt');
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toMatch(/^Contact: mailto:/m);
  expect(body).toMatch(/^Expires: \d{4}-\d{2}-\d{2}T/m);
});

test('the wordmark links home', async ({ page }) => {
  await page.goto('/resume/');
  await page.locator('.wordmark').click();
  await expect(page).toHaveURL(/\/$/);
});

test.describe('mobile', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile only');

  test('menu opens, closes with Escape, and closes after choosing a link', async ({ page }) => {
    await page.goto('/');
    const menu = page.locator('#mobile-menu');
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();

    await page.getByRole('button', { name: 'Open menu' }).click();
    await menu.getByRole('link', { name: 'Skills' }).click();
    await expect(menu).toBeHidden();
  });
});

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop only');

  test('legend buttons pin a channel highlight', async ({ page }) => {
    await page.goto('/?tier=static');
    const fig = page.locator('figure[data-figure="story"]');
    const identity = fig.locator('.fig-legend__button[data-channel="identity"]');
    await identity.click();
    await expect(identity).toHaveAttribute('aria-pressed', 'true');
    await expect(fig).toHaveAttribute('data-active', 'identity');
    await identity.click();
    await expect(identity).toHaveAttribute('aria-pressed', 'false');
  });

  test('3D tier loads without console errors and can be switched off', async ({ page }) => {
    const problems = watchConsole(page);
    await page.goto('/?tier=3d');
    const hero = page.locator('figure[data-figure="hero"]');
    await expect(hero).toHaveAttribute('data-tier', '3d', { timeout: 15000 });
    await expect(hero.locator('canvas.fig__canvas')).toHaveCount(1);

    const toggle = hero.getByRole('button', { name: /Motion/ });
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(hero).toHaveAttribute('data-tier', 'static');
    expect(problems).toEqual([]);
  });

  test('static tier is used when forced', async ({ page }) => {
    await page.goto('/?tier=static');
    await page.waitForTimeout(2500);
    await expect(page.locator('canvas.fig__canvas')).toHaveCount(0);
    await expect(page.locator('[data-motion-toggle]').first()).toBeHidden();
  });
});
