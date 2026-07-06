const GA_MEASUREMENT_ID = String(import.meta.env.VITE_GA_MEASUREMENT_ID || '').trim();
const ANALYTICS_ENABLED = String(import.meta.env.VITE_ENABLE_ANALYTICS || 'true') !== 'false';
const GA_SCRIPT_ID = 'google-analytics-script';
const OPT_OUT_STORAGE_KEY = 'goodwill:analytics-opt-out';

let initialized = false;
let lastPagePath = '';

function hasValidMeasurementId() {
  return /^G-[A-Z0-9]+$/i.test(GA_MEASUREMENT_ID);
}

export function isAnalyticsConfigured() {
  return ANALYTICS_ENABLED && hasValidMeasurementId();
}

export function isAnalyticsOptedOut() {
  try {
    return window.localStorage.getItem(OPT_OUT_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function shouldTrackAnalytics({ isAuthenticated = false } = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (!isAnalyticsConfigured()) return false;
  if (isAnalyticsOptedOut()) return false;
  if (isAuthenticated) return false;

  return true;
}

function loadAnalyticsScript() {
  if (document.getElementById(GA_SCRIPT_ID)) return;

  const script = document.createElement('script');
  script.id = GA_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
  document.head.appendChild(script);
}

export function initGoogleAnalytics() {
  if (initialized || !shouldTrackAnalytics()) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  loadAnalyticsScript();
  initialized = true;
}

export function reportPageView(path, { isAuthenticated = false, title = document.title } = {}) {
  if (!shouldTrackAnalytics({ isAuthenticated })) return;

  initGoogleAnalytics();

  if (typeof window.gtag !== 'function') return;

  const pagePath = path || `${window.location.pathname}${window.location.search}`;
  if (pagePath === lastPagePath) return;

  lastPagePath = pagePath;

  window.gtag('event', 'page_view', {
    page_title: title,
    page_location: window.location.href,
    page_path: pagePath,
  });
}

export function setAnalyticsOptOut(shouldOptOut = true) {
  try {
    window.localStorage.setItem(OPT_OUT_STORAGE_KEY, shouldOptOut ? 'true' : 'false');
  } catch {
    // Ignore storage failures; Analytics will fall back to environment settings.
  }
}
