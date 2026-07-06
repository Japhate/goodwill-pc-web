import manifest from './responsive-image-manifest.json';

function normalizeImageUrl(url = '') {
  if (!url || typeof url !== 'string') return '';
  if (!url.startsWith('/images/')) return url;
  return url.split('?')[0].split('#')[0];
}

function toSrcSet(variants = []) {
  return variants
    .map((variant) => `${variant.url} ${variant.width}w`)
    .join(', ');
}

export function getResponsiveImage(url) {
  const normalizedUrl = normalizeImageUrl(url);
  if (!normalizedUrl) return null;
  return manifest[normalizedUrl] || null;
}

export function getResponsiveImageProps(url, sizes) {
  const image = getResponsiveImage(url);
  if (!image) {
    return {};
  }

  const largestWebp = image.variants?.webp?.[image.variants.webp.length - 1];
  const largestAvif = image.variants?.avif?.[image.variants.avif.length - 1];

  return {
    src: url,
    sizes,
    width: image.width,
    height: image.height,
    style: { aspectRatio: image.aspectRatio },
    avifSrcSet: toSrcSet(image.variants?.avif),
    webpSrcSet: toSrcSet(image.variants?.webp),
    fallbackSrc: url,
    preloadHref: largestAvif?.url || largestWebp?.url || url,
  };
}
