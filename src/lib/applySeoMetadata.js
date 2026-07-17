import { buildSeoJsonLd, getSeoMetadata, SITE_NAME } from './seo.js';

function upsertMeta(selector, attributes) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([name, value]) => {
    element.setAttribute(name, value);
  });

  return element;
}

function upsertCanonical(href) {
  let element = document.head.querySelector('link[rel="canonical"]');

  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }

  element.href = href;
}

function upsertRouteSchema(route) {
  let element = document.head.querySelector('#goodwill-route-schema');

  if (!element) {
    element = document.createElement('script');
    element.type = 'application/ld+json';
    element.id = 'goodwill-route-schema';
    document.head.appendChild(element);
  }

  element.textContent = JSON.stringify(buildSeoJsonLd(route)).replaceAll('<', '\\u003c');
}

export function applySeoMetadata(pathname) {
  if (typeof document === 'undefined') return;

  const route = getSeoMetadata(pathname || window.location.pathname);
  document.title = route.title;

  upsertMeta('meta[name="description"]', { name: 'description', content: route.description });
  upsertMeta('meta[name="author"]', { name: 'author', content: 'Goodwill Presbyterian Church, USA' });
  upsertMeta('meta[name="robots"]', { name: 'robots', content: route.robots });
  upsertCanonical(route.canonicalUrl);

  upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
  upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: 'en_US' });
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: route.canonicalUrl });
  upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: SITE_NAME });
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: route.title });
  upsertMeta('meta[property="og:description"]', { property: 'og:description', content: route.description });
  upsertMeta('meta[property="og:image"]', { property: 'og:image', content: route.image });
  upsertMeta('meta[property="og:image:alt"]', { property: 'og:image:alt', content: route.imageAlt });

  upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: route.title });
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: route.description });
  upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: route.image });
  upsertMeta('meta[name="twitter:image:alt"]', { name: 'twitter:image:alt', content: route.imageAlt });

  upsertRouteSchema(route);
}
