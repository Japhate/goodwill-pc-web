import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const publicRoutes = [
  { path: '/', name: 'Home' },
  { path: '/about', name: 'About' },
  { path: '/updates', name: 'Updates' },
  { path: '/resources', name: 'Resources' },
  { path: '/prayer', name: 'Prayer' },
  { path: '/connect', name: 'Connect' },
  { path: '/give', name: 'Give' },
  { path: '/privacy', name: 'Privacy' },
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
