import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const publicRoutes = [
  { path: '/', name: 'Home' },
  { path: '/About', name: 'About' },
  { path: '/Updates', name: 'Updates' },
  { path: '/Resources', name: 'Resources' },
  { path: '/Prayer', name: 'Prayer' },
  { path: '/Connect', name: 'Connect' },
  { path: '/Give', name: 'Give' },
  { path: '/Privacy', name: 'Privacy' },
];

for (const route of publicRoutes) {
  test(`${route.name} has no automated WCAG A/AA violations`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'domcontentloaded' });
    await page.locator('#main-content').waitFor({ state: 'visible' });
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});

    if (route.path === '/') {
      await page.waitForTimeout(4_200);
    }

    const results = await new AxeBuilder({ page })
      .exclude('iframe[src*="youtube.com"]')
      .exclude('iframe[src*="youtube-nocookie.com"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}
