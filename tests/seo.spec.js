import { test, expect } from '@playwright/test';

const siteOrigin = 'https://www.goodwillpresch1867.com';

const seoRoutes = [
  {
    path: '/',
    title: 'Goodwill Presbyterian Church, USA | Mayesville, SC',
    description: 'Worship with Goodwill Presbyterian Church, USA in Mayesville, SC. Find Sunday service times, livestreams, sermons, church announcements, prayer support, and ways to connect.',
    canonical: `${siteOrigin}/`,
  },
  {
    path: '/about',
    title: 'About Goodwill Presbyterian Church | History, Beliefs & Leadership',
    description: 'Learn about Goodwill Presbyterian Church, USA in Mayesville, SC, including our 1867 heritage, Presbyterian beliefs, mission, values, and church leadership.',
    canonical: `${siteOrigin}/about`,
  },
  {
    path: '/updates',
    title: 'Church Announcements & Events | Goodwill Presbyterian Church',
    description: 'Read the latest announcements, events, worship calendar updates, and community news from Goodwill Presbyterian Church in Mayesville, SC.',
    canonical: `${siteOrigin}/updates`,
  },
  {
    path: '/resources',
    title: 'Sermons, Livestream & Worship Bulletins | Goodwill Presbyterian Church',
    description: 'Watch worship livestreams, revisit recent sermons, and access worship bulletins and ministry resources from Goodwill Presbyterian Church.',
    canonical: `${siteOrigin}/resources`,
  },
  {
    path: '/prayer',
    title: 'Prayer Ministry & Requests | Goodwill Presbyterian Church',
    description: 'Share a prayer request, read weekly prayer guidance, and connect with the prayer ministry of Goodwill Presbyterian Church in Mayesville, SC.',
    canonical: `${siteOrigin}/prayer`,
  },
  {
    path: '/connect',
    title: 'Visit & Contact Goodwill Presbyterian Church | Mayesville, SC',
    description: 'Plan your visit to Goodwill Presbyterian Church, get directions to 295 North Brick Church Road, contact the church office, and learn how to get involved.',
    canonical: `${siteOrigin}/connect`,
  },
  {
    path: '/give',
    title: 'Give to Goodwill Presbyterian Church | Support Ministry',
    description: 'Support worship, outreach, discipleship, and community ministry through giving to Goodwill Presbyterian Church, USA in Mayesville, South Carolina.',
    canonical: `${siteOrigin}/give`,
  },
  {
    path: '/privacy',
    title: 'Privacy Policy | Goodwill Presbyterian Church',
    description: 'Read how Goodwill Presbyterian Church uses website information to support worship, prayer, communication, analytics, and site reliability.',
    canonical: `${siteOrigin}/privacy`,
  },
];

for (const route of seoRoutes) {
  test(`${route.path} exposes canonical SEO metadata`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveTitle(route.title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', route.description);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', route.canonical);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', route.canonical);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
    await expect(page.locator('#goodwill-route-schema')).toHaveCount(1);
  });
}

test('legacy uppercase route redirects to the lowercase canonical URL', async ({ request }) => {
  const response = await request.get('/About', { maxRedirects: 0 });

  expect(response.status()).toBe(301);
  expect(response.headers().location).toBe('/about');
});

test('unknown pages return a real noindex 404 response', async ({ request }) => {
  const response = await request.get('/not-a-real-page', { maxRedirects: 0 });
  const body = await response.text();

  expect(response.status()).toBe(404);
  expect(response.headers()['x-robots-tag']).toContain('noindex');
  expect(body).toContain('Page Not Found | Goodwill Presbyterian Church');
});
