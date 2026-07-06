import { onCLS, onINP, onLCP } from 'web-vitals/attribution';

const WEB_VITALS_ENDPOINT = '/api/web-vitals';
const METRICS = new Set(['CLS', 'INP', 'LCP']);

function getConnectionInfo() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!connection) return null;

  return {
    effectiveType: connection.effectiveType || null,
    saveData: Boolean(connection.saveData),
  };
}

function getAttribution(metric) {
  const attribution = metric.attribution || {};

  return {
    element: attribution.element || null,
    eventTarget: attribution.eventTarget || null,
    interactionType: attribution.interactionType || null,
    loadState: attribution.loadState || null,
    largestShiftTarget: attribution.largestShiftTarget || null,
    timeToFirstByte: attribution.timeToFirstByte ?? null,
    resourceLoadDelay: attribution.resourceLoadDelay ?? null,
    resourceLoadDuration: attribution.resourceLoadDuration ?? null,
    elementRenderDelay: attribution.elementRenderDelay ?? null,
    inputDelay: attribution.inputDelay ?? null,
    processingDuration: attribution.processingDuration ?? null,
    presentationDelay: attribution.presentationDelay ?? null,
  };
}

function buildPayload(metric) {
  return {
    id: metric.id,
    name: metric.name,
    value: metric.value,
    delta: metric.delta,
    rating: metric.rating,
    navigationType: metric.navigationType,
    path: window.location.pathname,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
    },
    connection: getConnectionInfo(),
    attribution: getAttribution(metric),
    reportedAt: new Date().toISOString(),
  };
}

function sendMetric(metric) {
  if (!METRICS.has(metric.name)) return;

  const body = JSON.stringify(buildPayload(metric));

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    if (navigator.sendBeacon(WEB_VITALS_ENDPOINT, blob)) return;
  }

  fetch(WEB_VITALS_ENDPOINT, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
  }).catch(() => {
    // Performance reporting should never interrupt the visitor experience.
  });
}

export function initWebVitals() {
  if (import.meta.env.VITE_ENABLE_WEB_VITALS === 'false') return;
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

  onCLS(sendMetric);
  onINP(sendMetric);
  onLCP(sendMetric);
}
