import {
  CHURCH_ADDRESS,
  CHURCH_CONTACT,
  CHURCH_IDENTITY,
  CHURCH_LOCATION,
  CHURCH_SOCIAL_LINKS,
  PRIMARY_WORSHIP_SERVICE,
  WEEKLY_GATHERINGS,
} from './churchIdentity.js';

export const SITE_ORIGIN = CHURCH_IDENTITY.website.replace(/\/+$/, '');
export const SITE_NAME = CHURCH_IDENTITY.shortName;
export const DEFAULT_SOCIAL_IMAGE = `${SITE_ORIGIN}/images/site/about-header.jpg`;
export const DEFAULT_SOCIAL_IMAGE_ALT = 'Goodwill Presbyterian Church community in Mayesville, South Carolina';

const baseDescription = 'Connect with Goodwill Presbyterian Church in Mayesville, South Carolina. Stay updated on worship, events, sermons, prayer requests, and community news.';

const publicRouteDefinitions = [
  {
    path: '/',
    aliases: ['/home'],
    label: 'Home',
    title: 'Goodwill Presbyterian Church, USA | Mayesville, SC',
    description: 'Worship with Goodwill Presbyterian Church, USA in Mayesville, SC. Find Sunday service times, livestreams, sermons, church announcements, prayer support, and ways to connect.',
    image: `${SITE_ORIGIN}/images/hero/goodwill-presbyterian-church-hero.png`,
    imageAlt: 'Welcome to Goodwill Presbyterian Church in Mayesville, South Carolina',
    schemaType: 'WebPage',
    changefreq: 'weekly',
    priority: '1.0',
  },
  {
    path: '/about',
    label: 'About',
    title: 'About Goodwill Presbyterian Church | History, Beliefs & Leadership',
    description: 'Learn about Goodwill Presbyterian Church, USA in Mayesville, SC, including our 1867 heritage, Presbyterian beliefs, mission, values, and church leadership.',
    image: `${SITE_ORIGIN}/images/site/about-header.jpg`,
    imageAlt: 'Goodwill Presbyterian Church history and community life',
    schemaType: 'AboutPage',
    changefreq: 'monthly',
    priority: '0.8',
  },
  {
    path: '/updates',
    label: 'Updates',
    title: 'Church Announcements & Events | Goodwill Presbyterian Church',
    description: 'Read the latest announcements, events, worship calendar updates, and community news from Goodwill Presbyterian Church in Mayesville, SC.',
    image: `${SITE_ORIGIN}/images/site/updates-header.png`,
    imageAlt: 'Goodwill Presbyterian Church announcements and events',
    schemaType: 'CollectionPage',
    changefreq: 'weekly',
    priority: '0.9',
  },
  {
    path: '/resources',
    label: 'Resources',
    title: 'Sermons, Livestream & Worship Bulletins | Goodwill Presbyterian Church',
    description: 'Watch worship livestreams, revisit recent sermons, and access worship bulletins and ministry resources from Goodwill Presbyterian Church.',
    image: `${SITE_ORIGIN}/images/site/resources-header.jpg`,
    imageAlt: 'Goodwill Presbyterian Church worship resources and sermons',
    schemaType: 'CollectionPage',
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    path: '/prayer',
    label: 'Prayer',
    title: 'Prayer Ministry & Requests | Goodwill Presbyterian Church',
    description: 'Share a prayer request, read weekly prayer guidance, and connect with the prayer ministry of Goodwill Presbyterian Church in Mayesville, SC.',
    image: `${SITE_ORIGIN}/images/site/prayer-header.jpg`,
    imageAlt: 'Goodwill Presbyterian Church prayer ministry',
    schemaType: 'WebPage',
    changefreq: 'monthly',
    priority: '0.8',
  },
  {
    path: '/connect',
    label: 'Connect',
    title: 'Visit & Contact Goodwill Presbyterian Church | Mayesville, SC',
    description: 'Plan your visit to Goodwill Presbyterian Church, get directions to 295 North Brick Church Road, contact the church office, and learn how to get involved.',
    image: `${SITE_ORIGIN}/images/site/connect-header.png`,
    imageAlt: 'Connect with Goodwill Presbyterian Church in Mayesville, South Carolina',
    schemaType: 'ContactPage',
    changefreq: 'monthly',
    priority: '0.8',
  },
  {
    path: '/give',
    label: 'Give',
    title: 'Give to Goodwill Presbyterian Church | Support Ministry',
    description: 'Support worship, outreach, discipleship, and community ministry through giving to Goodwill Presbyterian Church, USA in Mayesville, South Carolina.',
    image: `${SITE_ORIGIN}/images/site/church-logo.png`,
    imageAlt: 'Goodwill Presbyterian Church logo',
    schemaType: 'WebPage',
    changefreq: 'monthly',
    priority: '0.7',
    potentialAction: 'DonateAction',
  },
  {
    path: '/privacy',
    label: 'Privacy',
    title: 'Privacy Policy | Goodwill Presbyterian Church',
    description: 'Read how Goodwill Presbyterian Church uses website information to support worship, prayer, communication, analytics, and site reliability.',
    image: DEFAULT_SOCIAL_IMAGE,
    imageAlt: DEFAULT_SOCIAL_IMAGE_ALT,
    schemaType: 'WebPage',
    changefreq: 'yearly',
    priority: '0.4',
  },
];

const noIndexRouteDefinitions = [
  {
    path: '/admin',
    label: 'Admin',
    title: 'Admin Sign In | Goodwill Presbyterian Church',
    description: 'Protected site administration for Goodwill Presbyterian Church.',
    robots: 'noindex, nofollow',
  },
  {
    path: '/adminsetup',
    label: 'Admin Setup',
    title: 'Admin Setup | Goodwill Presbyterian Church',
    description: 'Protected administrator setup for Goodwill Presbyterian Church.',
    robots: 'noindex, nofollow',
  },
  {
    path: '/unsubscribe',
    label: 'Unsubscribe',
    title: 'Unsubscribe | Goodwill Presbyterian Church',
    description: 'Manage newsletter subscription preferences for Goodwill Presbyterian Church.',
    robots: 'noindex, follow',
  },
];

function withComputedFields(route) {
  return {
    ...route,
    canonicalUrl: `${SITE_ORIGIN}${route.path === '/' ? '/' : route.path}`,
    robots: route.robots || 'index, follow',
    image: route.image || DEFAULT_SOCIAL_IMAGE,
    imageAlt: route.imageAlt || DEFAULT_SOCIAL_IMAGE_ALT,
  };
}

export const PUBLIC_SEO_ROUTES = publicRouteDefinitions.map(withComputedFields);
export const NOINDEX_SEO_ROUTES = noIndexRouteDefinitions.map(withComputedFields);

const routeLookup = new Map();

for (const route of [...PUBLIC_SEO_ROUTES, ...NOINDEX_SEO_ROUTES]) {
  routeLookup.set(route.path, route);
  for (const alias of route.aliases || []) {
    routeLookup.set(alias.toLowerCase(), route);
  }
}

export function cleanPathname(pathname = '/') {
  const rawPath = String(pathname || '/').split(/[?#]/)[0] || '/';
  let cleanPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;

  try {
    cleanPath = decodeURI(cleanPath);
  } catch {
    // Keep the original path when a malformed escape sequence is present.
  }

  cleanPath = cleanPath.replace(/\/{2,}/g, '/');
  if (cleanPath.length > 1) cleanPath = cleanPath.replace(/\/+$/, '');

  return cleanPath || '/';
}

export function getSeoRoute(pathname = '/') {
  return routeLookup.get(cleanPathname(pathname).toLowerCase()) || null;
}

export function getSeoMetadata(pathname = '/') {
  const route = getSeoRoute(pathname);
  if (route) return route;

  return withComputedFields({
    path: cleanPathname(pathname).toLowerCase(),
    label: 'Page Not Found',
    title: 'Page Not Found | Goodwill Presbyterian Church',
    description: 'The requested page could not be found on the Goodwill Presbyterian Church website.',
    robots: 'noindex, follow',
    statusCode: 404,
  });
}

export function shouldRedirectToCanonicalPath(pathname = '/') {
  const cleanPath = cleanPathname(pathname);
  const route = getSeoRoute(cleanPath);
  return Boolean(route && cleanPath !== route.path);
}

export function getCanonicalPath(pathname = '/') {
  return getSeoRoute(pathname)?.path || cleanPathname(pathname).toLowerCase();
}

export function getCanonicalRedirectPath(pathname = '/', search = '') {
  const canonicalPath = getCanonicalPath(pathname);
  return `${canonicalPath === '/' ? '/' : canonicalPath}${search || ''}`;
}

export function normalizeInternalLinkUrl(url = '') {
  const trimmedUrl = String(url || '').trim();
  if (!trimmedUrl.startsWith('/') || trimmedUrl.startsWith('//')) return trimmedUrl;

  const match = trimmedUrl.match(/^([^?#]*)(.*)$/);
  const path = match?.[1] || '/';
  const suffix = match?.[2] || '';
  const route = getSeoRoute(path);

  return route ? `${route.path}${suffix}` : trimmedUrl;
}

export function isIndexableSeoPath(pathname = '/') {
  const route = getSeoRoute(pathname);
  return Boolean(route && route.robots === 'index, follow');
}

function buildChurchSchema() {
  return {
    '@type': ['Church', 'Organization'],
    '@id': `${SITE_ORIGIN}/#church`,
    name: CHURCH_IDENTITY.name,
    alternateName: [
      CHURCH_IDENTITY.shortName,
      CHURCH_IDENTITY.formalName,
    ],
    url: `${SITE_ORIGIN}/`,
    description: baseDescription,
    slogan: CHURCH_IDENTITY.slogan,
    foundingDate: CHURCH_IDENTITY.foundingYear,
    telephone: CHURCH_CONTACT.phoneE164,
    email: CHURCH_CONTACT.email,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_ORIGIN}/images/optimized/site-icon-512.png`,
      width: 512,
      height: 512,
    },
    image: DEFAULT_SOCIAL_IMAGE,
    address: {
      '@type': 'PostalAddress',
      streetAddress: CHURCH_ADDRESS.street,
      addressLocality: CHURCH_ADDRESS.city,
      addressRegion: CHURCH_ADDRESS.region,
      postalCode: CHURCH_ADDRESS.postalCode,
      addressCountry: CHURCH_ADDRESS.country,
    },
    hasMap: CHURCH_LOCATION.directionsUrl,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: CHURCH_CONTACT.phoneE164,
      email: CHURCH_CONTACT.email,
      contactType: 'church office',
      areaServed: `${CHURCH_ADDRESS.city}, ${CHURCH_ADDRESS.region}`,
      availableLanguage: 'English',
    },
    openingHoursSpecification: WEEKLY_GATHERINGS.map((gathering) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: gathering.schemaDay || `https://schema.org/${gathering.day}`,
      opens: gathering.time === PRIMARY_WORSHIP_SERVICE.time ? '10:30' : '18:30',
      closes: gathering.time === PRIMARY_WORSHIP_SERVICE.time ? '12:00' : '19:30',
      description: gathering.name,
    })),
    sameAs: [
      CHURCH_SOCIAL_LINKS.facebook,
      CHURCH_SOCIAL_LINKS.youtube,
    ],
  };
}

function buildWebsiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': `${SITE_ORIGIN}/#website`,
    name: CHURCH_IDENTITY.name,
    alternateName: SITE_NAME,
    url: `${SITE_ORIGIN}/`,
    publisher: {
      '@id': `${SITE_ORIGIN}/#church`,
    },
    inLanguage: 'en-US',
    hasPart: PUBLIC_SEO_ROUTES.map((route) => ({
      '@id': `${route.canonicalUrl}#webpage`,
    })),
  };
}

function buildBreadcrumbSchema(route) {
  const items = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: `${SITE_ORIGIN}/`,
    },
  ];

  if (route.path !== '/') {
    items.push({
      '@type': 'ListItem',
      position: 2,
      name: route.label,
      item: route.canonicalUrl,
    });
  }

  return {
    '@type': 'BreadcrumbList',
    '@id': `${route.canonicalUrl}#breadcrumb`,
    itemListElement: items,
  };
}

function buildWebPageSchema(route) {
  const schema = {
    '@type': route.schemaType || 'WebPage',
    '@id': `${route.canonicalUrl}#webpage`,
    url: route.canonicalUrl,
    name: route.label,
    headline: route.title,
    description: route.description,
    isPartOf: {
      '@id': `${SITE_ORIGIN}/#website`,
    },
    about: {
      '@id': `${SITE_ORIGIN}/#church`,
    },
    breadcrumb: {
      '@id': `${route.canonicalUrl}#breadcrumb`,
    },
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: route.image,
      caption: route.imageAlt,
    },
    inLanguage: 'en-US',
  };

  if (route.schemaType === 'ContactPage') {
    schema.mainEntity = {
      '@id': `${SITE_ORIGIN}/#church`,
    };
  }

  if (route.potentialAction === 'DonateAction') {
    schema.potentialAction = {
      '@type': 'DonateAction',
      target: route.canonicalUrl,
      recipient: {
        '@id': `${SITE_ORIGIN}/#church`,
      },
    };
  }

  return schema;
}

export function buildSeoJsonLd(route = PUBLIC_SEO_ROUTES[0]) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      buildChurchSchema(),
      buildWebsiteSchema(),
      buildBreadcrumbSchema(route),
      buildWebPageSchema(route),
    ],
  };
}
