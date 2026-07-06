import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { initializeApp as initializeClientApp, getApps as getClientApps } from 'firebase/app';
import { collection, doc, getDoc, getDocs, getFirestore as getClientFirestore } from 'firebase/firestore';
import { applicationDefault, cert, getApps as getAdminApps, initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import {
  getDefaultEmailTemplate,
  mergeEmailTemplate,
  NEWSLETTER_TEMPLATE_IDS,
  renderNewsletterTemplateText,
} from '../src/lib/newsletterTemplates.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const CANONICAL_HOST = 'www.goodwillpresch1867.com';
const SITE_DEVELOPER_EMAIL = 'nebajaphate@gmail.com';
const PUBLIC_EMAIL_RATE_LIMITS = {
  ip: { windowMs: 15 * 60 * 1000, max: 10 },
  email: { windowMs: 60 * 60 * 1000, max: 3 },
};
const WEB_VITALS_RATE_LIMIT = {
  windowMs: 60 * 60 * 1000,
  max: 240,
};
const CLIENT_ERROR_RATE_LIMIT = {
  windowMs: 60 * 60 * 1000,
  max: 60,
};
const YOUTUBE_LIVE_CACHE_TTL_MS = Math.max(
  30 * 1000,
  Number(process.env.YOUTUBE_LIVE_CACHE_TTL_MS || 2 * 60 * 1000),
);
const LANDING_IMAGE_PRELOAD_CACHE_TTL_MS = Math.max(
  60 * 1000,
  Number(process.env.LANDING_IMAGE_PRELOAD_CACHE_TTL_MS || 5 * 60 * 1000),
);
const LANDING_IMAGE_PRELOAD_RENDER_WAIT_MS = Math.max(
  0,
  Number(process.env.LANDING_IMAGE_PRELOAD_RENDER_WAIT_MS || 1200),
);
const LANDING_IMAGE_PRELOAD_BLOCK_PATTERN = /<!-- GOODWILL_LANDING_IMAGE_PRELOAD_START -->[\s\S]*?<!-- GOODWILL_LANDING_IMAGE_PRELOAD_END -->/;
const DEFAULT_LANDING_IMAGE_RECORD = {
  id: 'landing-image',
  image_url: '/images/hero/goodwill-presbyterian-church-hero.png',
  alt_text: 'Welcome to Goodwill Presbyterian Church',
  link_url: '/About',
  link_label: 'Learn More',
  is_active: true,
};
const ADMIN_ROLES = {
  SITE_ADMIN: 'site_admin',
  SITE_DEVELOPER: 'site_developer',
};
const LEGACY_HOSTS = new Set([]);
const PRODUCTION_CORS_ORIGINS = new Set([
  `https://${CANONICAL_HOST}`,
  'https://goodwillpresch1867.com',
  ...String(process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
]);
const publicEmailRateLimitStore = new Map();
const webVitalsRateLimitStore = new Map();
const clientErrorRateLimitStore = new Map();
let youtubeLiveStatusCache = null;
let landingImagePreloadCache = {
  value: null,
  expiresAt: 0,
  pending: null,
};
let responsiveImageManifestCache = null;
let distIndexHtmlCache = null;

app.set('trust proxy', 1);

function isLocalDevelopmentOrigin(origin) {
  if (process.env.LOCAL_VITE_DEV !== 'true') return false;

  try {
    const { hostname, protocol } = new URL(origin);
    return ['http:', 'https:'].includes(protocol)
      && (
        hostname === 'localhost'
        || hostname === '127.0.0.1'
        || hostname === '::1'
      );
  } catch {
    return false;
  }
}

function isAllowedCorsOrigin(origin) {
  if (!origin) return true;
  return PRODUCTION_CORS_ORIGINS.has(origin) || isLocalDevelopmentOrigin(origin);
}

function buildContentSecurityPolicy() {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "script-src 'self' https://www.googletagmanager.com",
    // TODO: Replace unsafe-inline with nonce/hash-based style allowances after
    // verifying React, Tailwind, and shadcn/Radix style injection behavior.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "media-src 'self' data: blob: https:",
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://maps.google.com https://www.google.com",
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebase.com https://firebasestorage.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://www.google-analytics.com https://region1.google-analytics.com https://analytics.google.com",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ];

  if (process.env.LOCAL_VITE_DEV === 'true') {
    return directives
      .filter((directive) => directive !== "upgrade-insecure-requests")
      .join('; ');
  }

  return directives.join('; ');
}

function applySecurityHeaders(req, res, next) {
  res.set({
    'Content-Security-Policy': buildContentSecurityPolicy(),
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Origin-Agent-Cluster': '?1',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-DNS-Prefetch-Control': 'off',
    'X-Download-Options': 'noopen',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=(self)',
      'payment=()',
      'usb=()',
    ].join(', '),
  });

  if (process.env.LOCAL_VITE_DEV !== 'true') {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

app.use(applySecurityHeaders);

app.use((req, res, next) => {
  const host = req.hostname?.toLowerCase();

  if (LEGACY_HOSTS.has(host)) {
    return res.redirect(301, `https://${CANONICAL_HOST}${req.originalUrl}`);
  }

  next();
});

app.use(cors({
  origin: (origin, callback) => callback(null, isAllowedCorsOrigin(origin)),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
}));
app.use(express.json({ limit: '15mb' }));

app.get('/healthz', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    status: 'ok',
    service: 'goodwill-pc-web',
    checkedAt: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  });
});

const DATA_DIR = path.join(ROOT_DIR, 'server', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readEntity(entityName) {
  const file = path.join(DATA_DIR, `${entityName}.json`);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) || [];
  } catch (e) {
    return [];
  }
}

function writeEntity(entityName, data) {
  const file = path.join(DATA_DIR, `${entityName}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizePersonName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

function isValidEmail(email) {
  return String(email || '').length <= 320
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getClientIp(req) {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwardedFor || req.ip || req.socket?.remoteAddress || 'unknown';
}

function takeRateLimitSlot(key, { windowMs, max }) {
  const now = Date.now();
  const current = publicEmailRateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    publicEmailRateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (current.count >= max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  publicEmailRateLimitStore.set(key, current);
  return { allowed: true };
}

function prunePublicEmailRateLimits() {
  const now = Date.now();
  for (const [key, value] of publicEmailRateLimitStore.entries()) {
    if (value.resetAt <= now) publicEmailRateLimitStore.delete(key);
  }
}

function checkWebVitalsRateLimit(req) {
  const now = Date.now();
  const ip = getClientIp(req);
  const current = webVitalsRateLimitStore.get(ip);

  if (!current || current.resetAt <= now) {
    webVitalsRateLimitStore.set(ip, { count: 1, resetAt: now + WEB_VITALS_RATE_LIMIT.windowMs });
    return true;
  }

  if (current.count >= WEB_VITALS_RATE_LIMIT.max) return false;

  current.count += 1;
  webVitalsRateLimitStore.set(ip, current);

  if (webVitalsRateLimitStore.size > 5000) {
    for (const [key, value] of webVitalsRateLimitStore.entries()) {
      if (value.resetAt <= now) webVitalsRateLimitStore.delete(key);
    }
  }

  return true;
}

function sanitizeWebVitalsText(value, maxLength = 160) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function sanitizeWebVitalsNumber(value, precision = 2) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(precision)) : null;
}

function normalizeWebVitalsMetric(body = {}) {
  const name = sanitizeWebVitalsText(body.name, 8);
  if (!['CLS', 'INP', 'LCP'].includes(name)) return null;

  const value = Number(body.value);
  const delta = Number(body.delta);
  if (!Number.isFinite(value) || value < 0) return null;

  const viewport = body.viewport || {};
  const connection = body.connection || {};
  const attribution = body.attribution || {};

  return {
    name,
    value: Number(value.toFixed(4)),
    delta: Number.isFinite(delta) ? Number(delta.toFixed(4)) : 0,
    rating: ['good', 'needs-improvement', 'poor'].includes(body.rating) ? body.rating : 'unknown',
    id: sanitizeWebVitalsText(body.id, 80),
    path: sanitizeWebVitalsText(body.path || '/', 140),
    navigationType: sanitizeWebVitalsText(body.navigationType, 40),
    viewport: {
      width: sanitizeWebVitalsNumber(viewport.width, 0),
      height: sanitizeWebVitalsNumber(viewport.height, 0),
      devicePixelRatio: sanitizeWebVitalsNumber(viewport.devicePixelRatio, 2),
    },
    connection: connection ? {
      effectiveType: sanitizeWebVitalsText(connection.effectiveType, 20) || null,
      saveData: Boolean(connection.saveData),
    } : null,
    attribution: {
      element: sanitizeWebVitalsText(attribution.element, 220) || null,
      eventTarget: sanitizeWebVitalsText(attribution.eventTarget, 220) || null,
      interactionType: sanitizeWebVitalsText(attribution.interactionType, 40) || null,
      loadState: sanitizeWebVitalsText(attribution.loadState, 40) || null,
      largestShiftTarget: sanitizeWebVitalsText(attribution.largestShiftTarget, 220) || null,
      timeToFirstByte: sanitizeWebVitalsNumber(attribution.timeToFirstByte),
      resourceLoadDelay: sanitizeWebVitalsNumber(attribution.resourceLoadDelay),
      resourceLoadDuration: sanitizeWebVitalsNumber(attribution.resourceLoadDuration),
      elementRenderDelay: sanitizeWebVitalsNumber(attribution.elementRenderDelay),
      inputDelay: sanitizeWebVitalsNumber(attribution.inputDelay),
      processingDuration: sanitizeWebVitalsNumber(attribution.processingDuration),
      presentationDelay: sanitizeWebVitalsNumber(attribution.presentationDelay),
    },
    reportedAt: new Date().toISOString(),
  };
}

function checkClientErrorRateLimit(req) {
  const now = Date.now();
  const ip = getClientIp(req);
  const current = clientErrorRateLimitStore.get(ip);

  if (!current || current.resetAt <= now) {
    clientErrorRateLimitStore.set(ip, { count: 1, resetAt: now + CLIENT_ERROR_RATE_LIMIT.windowMs });
    return true;
  }

  if (current.count >= CLIENT_ERROR_RATE_LIMIT.max) return false;

  current.count += 1;
  clientErrorRateLimitStore.set(ip, current);

  if (clientErrorRateLimitStore.size > 5000) {
    for (const [key, value] of clientErrorRateLimitStore.entries()) {
      if (value.resetAt <= now) clientErrorRateLimitStore.delete(key);
    }
  }

  return true;
}

function normalizeClientErrorReport(body = {}) {
  const message = sanitizeWebVitalsText(body.message, 500);
  if (!message) return null;

  return {
    type: sanitizeWebVitalsText(body.type, 80) || 'client-error',
    source: sanitizeWebVitalsText(body.source, 80) || 'browser',
    message,
    stack: sanitizeWebVitalsText(body.stack, 1600) || null,
    componentStack: sanitizeWebVitalsText(body.componentStack, 1200) || null,
    path: sanitizeWebVitalsText(body.path || '/', 180),
    userAgent: sanitizeWebVitalsText(body.userAgent, 240) || null,
    filename: sanitizeWebVitalsText(body.filename, 240) || null,
    lineNumber: sanitizeWebVitalsNumber(body.lineNumber, 0),
    columnNumber: sanitizeWebVitalsNumber(body.columnNumber, 0),
    reportedAt: new Date().toISOString(),
  };
}

function checkPublicEmailRateLimit(req, email, purpose) {
  prunePublicEmailRateLimits();
  const ip = getClientIp(req);
  const checks = [
    takeRateLimitSlot(`public-email:${purpose}:ip:${ip}`, PUBLIC_EMAIL_RATE_LIMITS.ip),
    takeRateLimitSlot(`public-email:${purpose}:email:${email}`, PUBLIC_EMAIL_RATE_LIMITS.email),
  ];
  return checks.find((result) => !result.allowed) || { allowed: true };
}

function getPublicSiteOrigin(req) {
  if (process.env.LOCAL_VITE_DEV === 'true') {
    const host = String(req.body?.host || req.headers.host || '').trim().toLowerCase();
    const protocol = String(req.body?.protocol || req.protocol || 'http').replace(':', '').toLowerCase();
    const isLocalHost = /^localhost(?::\d+)?$/.test(host)
      || /^127\.0\.0\.1(?::\d+)?$/.test(host)
      || /^\[::1\](?::\d+)?$/.test(host);

    if (isLocalHost && ['http', 'https'].includes(protocol)) {
      return `${protocol}://${host}`;
    }
  }

  return `https://${CANONICAL_HOST}`;
}

function getYoutubeLiveConfig() {
  return {
    apiKey: String(process.env.YOUTUBE_API_KEY || process.env.GOOGLE_YOUTUBE_API_KEY || '').trim(),
    channelId: String(process.env.YOUTUBE_CHANNEL_ID || '').trim(),
  };
}

function getUnconfiguredYoutubeLiveStatus() {
  return {
    configured: false,
    isLive: false,
    checkedAt: new Date().toISOString(),
  };
}

function normalizeYoutubeLiveItem(item) {
  const videoId = item?.id?.videoId || '';
  const title = item?.snippet?.title || 'Goodwill Presbyterian Church is live now';
  const startedAt = item?.snippet?.publishedAt || null;

  return {
    configured: true,
    isLive: Boolean(videoId),
    videoId,
    title,
    url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : '',
    embedUrl: videoId ? `https://www.youtube.com/embed/${videoId}` : '',
    startedAt,
    checkedAt: new Date().toISOString(),
  };
}

async function fetchYoutubeLiveStatus() {
  const { apiKey, channelId } = getYoutubeLiveConfig();
  if (!apiKey || !channelId) return getUnconfiguredYoutubeLiveStatus();

  const params = new URLSearchParams({
    part: 'snippet',
    channelId,
    eventType: 'live',
    type: 'video',
    maxResults: '1',
    key: apiKey,
  });
  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`YouTube live status request failed with ${response.status}`);
  }

  const data = await response.json();
  const liveItem = Array.isArray(data?.items) ? data.items[0] : null;

  return normalizeYoutubeLiveItem(liveItem);
}

async function getCachedYoutubeLiveStatus({ forceRefresh = false } = {}) {
  const now = Date.now();
  if (!forceRefresh && youtubeLiveStatusCache && youtubeLiveStatusCache.expiresAt > now) {
    return youtubeLiveStatusCache.status;
  }

  try {
    const status = await fetchYoutubeLiveStatus();
    youtubeLiveStatusCache = {
      status,
      expiresAt: now + YOUTUBE_LIVE_CACHE_TTL_MS,
    };
    return status;
  } catch (error) {
    console.warn('YouTube live status check failed', error?.message || error);

    if (youtubeLiveStatusCache?.status) {
      return {
        ...youtubeLiveStatusCache.status,
        stale: true,
        checkedAt: new Date().toISOString(),
      };
    }

    return {
      configured: true,
      isLive: false,
      error: 'youtube_live_status_unavailable',
      checkedAt: new Date().toISOString(),
    };
  }
}

function validatePublicEmailRecipient(body, { requireUnsubscribeToken = false } = {}) {
  const email = normalizeEmail(body?.email);
  const firstName = normalizePersonName(body?.firstName || body?.first_name);
  const lastName = normalizePersonName(body?.lastName || body?.last_name);
  const expectedEmailKey = encodeURIComponent(email);
  const emailKey = String(body?.emailKey || body?.email_key || expectedEmailKey).trim();
  const unsubscribeToken = String(body?.unsubscribeToken || body?.unsubscribe_token || '').trim();

  if (!isValidEmail(email)) {
    const error = new Error('A valid email address is required.');
    error.status = 400;
    throw error;
  }

  if (!firstName || firstName.length > 80 || !lastName || lastName.length > 80) {
    const error = new Error('First and last name are required and must be 80 characters or fewer.');
    error.status = 400;
    throw error;
  }

  if (emailKey !== expectedEmailKey) {
    const error = new Error('Email key does not match the email address.');
    error.status = 400;
    throw error;
  }

  if (requireUnsubscribeToken) {
    const validToken = unsubscribeToken.length >= 24
      && unsubscribeToken.length <= 128
      && /^[A-Za-z0-9._~-]+$/.test(unsubscribeToken);

    if (!validToken) {
      const error = new Error('A valid unsubscribe token is required.');
      error.status = 400;
      throw error;
    }
  }

  return {
    email,
    firstName,
    lastName,
    emailKey,
    unsubscribeToken,
  };
}

function normalizeAdminRole(role, email = '') {
  const normalizedRole = String(role || '').trim().toLowerCase();
  if (normalizedRole === ADMIN_ROLES.SITE_DEVELOPER) return ADMIN_ROLES.SITE_DEVELOPER;
  if (normalizeEmail(email) === SITE_DEVELOPER_EMAIL) return ADMIN_ROLES.SITE_DEVELOPER;
  return ADMIN_ROLES.SITE_ADMIN;
}

function getAdminRoleLabel(role) {
  return role === ADMIN_ROLES.SITE_DEVELOPER ? 'Site Developer' : 'Site Admin';
}

function isRootSiteDeveloper(admin = {}) {
  return normalizeEmail(admin.email) === SITE_DEVELOPER_EMAIL;
}

function assertRootSiteDeveloper(admin = {}) {
  if (!isRootSiteDeveloper(admin)) {
    const error = new Error('Only the permanent root Site Developer can add, remove, promote, or demote administrators.');
    error.status = 403;
    throw error;
  }
}

function createInvitationToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function hashInvitationToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function passwordMeetsAdminRules(password) {
  return String(password || '').length >= 6
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password);
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getFirebaseServerConfig() {
  const config = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  };

  return Object.values(config).every(Boolean) ? config : null;
}

function getServerFirestore() {
  const config = getFirebaseServerConfig();
  if (!config) return null;

  const app = getClientApps().find((firebaseApp) => firebaseApp.name === 'server') || initializeClientApp(config, 'server');
  return getClientFirestore(app);
}

function toTimestamp(value) {
  const timestamp = Date.parse(String(value || ''));
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function selectActiveLandingImage(items = []) {
  return [...items]
    .filter((item) => item?.is_active !== false && item?.image_url)
    .sort((a, b) => (
      toTimestamp(b.updated_date || b.created_date) - toTimestamp(a.updated_date || a.created_date)
    ))[0] || null;
}

function getLocalLandingImagePreloadRecord() {
  const localLandingImage = selectActiveLandingImage(readEntity('LandingImage'));
  return {
    ...DEFAULT_LANDING_IMAGE_RECORD,
    ...(localLandingImage || {}),
    id: localLandingImage?.id || DEFAULT_LANDING_IMAGE_RECORD.id,
  };
}

async function readFirestoreLandingImagePreloadRecord() {
  const db = getServerFirestore();
  if (!db) return null;

  const snapshot = await getDocs(collection(db, 'LandingImage'));
  return selectActiveLandingImage(
    snapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id })),
  );
}

function refreshLandingImagePreloadCache() {
  if (landingImagePreloadCache.pending) return landingImagePreloadCache.pending;

  landingImagePreloadCache.pending = (async () => {
    try {
      const firestoreLandingImage = await readFirestoreLandingImagePreloadRecord();
      const value = {
        ...DEFAULT_LANDING_IMAGE_RECORD,
        ...(firestoreLandingImage || getLocalLandingImagePreloadRecord()),
        id: firestoreLandingImage?.id || DEFAULT_LANDING_IMAGE_RECORD.id,
      };

      landingImagePreloadCache = {
        value,
        expiresAt: Date.now() + LANDING_IMAGE_PRELOAD_CACHE_TTL_MS,
        pending: null,
      };

      return value;
    } catch (error) {
      console.warn('Unable to refresh landing image preload metadata', error?.message || error);
      const value = landingImagePreloadCache.value || getLocalLandingImagePreloadRecord();
      landingImagePreloadCache = {
        value,
        expiresAt: Date.now() + Math.min(LANDING_IMAGE_PRELOAD_CACHE_TTL_MS, 60 * 1000),
        pending: null,
      };
      return value;
    }
  })();

  return landingImagePreloadCache.pending;
}

function getCachedLandingImagePreloadRecord() {
  if (Date.now() >= landingImagePreloadCache.expiresAt && !landingImagePreloadCache.pending) {
    refreshLandingImagePreloadCache().catch(() => {});
  }

  return landingImagePreloadCache.value || getLocalLandingImagePreloadRecord();
}

function resolveWithTimeout(promise, timeoutMs) {
  if (!timeoutMs) return promise.catch(() => null);

  let timeoutId;
  return Promise.race([
    promise.catch(() => null),
    new Promise((resolve) => {
      timeoutId = setTimeout(() => resolve(null), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timeoutId));
}

async function getLandingImagePreloadRecordForRender() {
  const hasFreshCache = landingImagePreloadCache.value
    && Date.now() < landingImagePreloadCache.expiresAt;

  if (hasFreshCache) return landingImagePreloadCache.value;

  const refreshPromise = landingImagePreloadCache.pending || refreshLandingImagePreloadCache();

  if (!landingImagePreloadCache.value) {
    const refreshedRecord = await resolveWithTimeout(
      refreshPromise,
      LANDING_IMAGE_PRELOAD_RENDER_WAIT_MS,
    );

    if (refreshedRecord) return refreshedRecord;
  }

  return getCachedLandingImagePreloadRecord();
}

function getResponsiveImageManifest() {
  if (responsiveImageManifestCache) return responsiveImageManifestCache;

  try {
    responsiveImageManifestCache = JSON.parse(
      fs.readFileSync(path.join(ROOT_DIR, 'src', 'lib', 'responsive-image-manifest.json'), 'utf8'),
    );
  } catch {
    responsiveImageManifestCache = {};
  }

  return responsiveImageManifestCache;
}

function normalizeLocalImageUrl(imageUrl = '') {
  if (!imageUrl.startsWith('/images/')) return '';
  return imageUrl.split('?')[0].split('#')[0];
}

function getPreferredResponsiveVariant(variants = []) {
  return variants.find((variant) => Number(variant.width) >= 1440) || variants[variants.length - 1] || null;
}

function toSrcSet(variants = []) {
  return variants
    .map((variant) => `${variant.url} ${variant.width}w`)
    .join(', ');
}

function getPreloadableImageUrl(imageUrl = '') {
  const trimmedUrl = String(imageUrl || '').trim();
  if (trimmedUrl.startsWith('/images/')) return normalizeLocalImageUrl(trimmedUrl);

  try {
    const url = new URL(trimmedUrl);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function buildLandingImagePreloadLink(imageUrl) {
  const preloadableUrl = getPreloadableImageUrl(imageUrl) || DEFAULT_LANDING_IMAGE_RECORD.image_url;
  const localUrl = normalizeLocalImageUrl(preloadableUrl);

  if (localUrl) {
    const image = getResponsiveImageManifest()[localUrl];
    const avifVariants = image?.variants?.avif || [];
    const webpVariants = image?.variants?.webp || [];
    const preferredAvif = getPreferredResponsiveVariant(avifVariants);
    const preferredWebp = getPreferredResponsiveVariant(webpVariants);
    const preferred = preferredAvif || preferredWebp;

    if (preferred) {
      const srcSet = avifVariants.length > 0 ? toSrcSet(avifVariants) : toSrcSet(webpVariants);
      const type = preferredAvif ? 'image/avif' : 'image/webp';
      return [
        '<link',
        '  rel="preload"',
        '  as="image"',
        `  href="${escapeHtml(preferred.url)}"`,
        `  type="${type}"`,
        `  imagesrcset="${escapeHtml(srcSet)}"`,
        '  imagesizes="100vw"',
        '  fetchpriority="high"',
        '/>',
      ].join('\n');
    }
  }

  return `<link rel="preload" as="image" href="${escapeHtml(preloadableUrl)}" fetchpriority="high" />`;
}

function buildLandingImagePreloadHead(record = DEFAULT_LANDING_IMAGE_RECORD) {
  const imageUrl = getPreloadableImageUrl(record.image_url) || DEFAULT_LANDING_IMAGE_RECORD.image_url;
  const preloadTags = [];

  try {
    const url = new URL(imageUrl);
    preloadTags.push(`<link rel="preconnect" href="${escapeHtml(url.origin)}" />`);
  } catch {
    // Local images do not need an external origin preconnect.
  }

  preloadTags.push(buildLandingImagePreloadLink(imageUrl));
  preloadTags.push(`<meta name="goodwill:landing-image-url" content="${escapeHtml(imageUrl)}" />`);
  preloadTags.push(`<meta name="goodwill:landing-image-alt" content="${escapeHtml(record.alt_text || DEFAULT_LANDING_IMAGE_RECORD.alt_text)}" />`);
  preloadTags.push(`<meta name="goodwill:landing-image-link-url" content="${escapeHtml(record.link_url || DEFAULT_LANDING_IMAGE_RECORD.link_url)}" />`);
  preloadTags.push(`<meta name="goodwill:landing-image-link-label" content="${escapeHtml(record.link_label || DEFAULT_LANDING_IMAGE_RECORD.link_label)}" />`);

  return [
    '<!-- GOODWILL_LANDING_IMAGE_PRELOAD_START -->',
    ...preloadTags,
    '<!-- GOODWILL_LANDING_IMAGE_PRELOAD_END -->',
  ].join('\n    ');
}

function getDistIndexHtml() {
  if (!distIndexHtmlCache) {
    distIndexHtmlCache = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8');
  }

  return distIndexHtmlCache;
}

async function renderIndexHtmlWithLandingImagePreload() {
  const html = getDistIndexHtml();
  const landingImageRecord = await getLandingImagePreloadRecordForRender();
  const landingImageHead = buildLandingImagePreloadHead(landingImageRecord);
  return html.replace(LANDING_IMAGE_PRELOAD_BLOCK_PATTERN, landingImageHead);
}

function getFirebaseAdminConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) return null;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    return {
      projectId,
      credential: cert({
        ...serviceAccount,
        private_key: String(serviceAccount.private_key || '').replace(/\\n/g, '\n'),
      }),
    };
  }

  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return {
      projectId,
      credential: cert({
        projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    };
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return {
      projectId,
      credential: applicationDefault(),
    };
  }

  return null;
}

function getFirebaseAdminApp() {
  const existing = getAdminApps().find((firebaseApp) => firebaseApp.name === 'server-admin');
  if (existing) return existing;

  const adminConfig = getFirebaseAdminConfig();
  if (!adminConfig) {
    const error = new Error('Firebase Admin credentials are not configured on the server.');
    error.status = 500;
    throw error;
  }

  return initializeAdminApp(adminConfig, 'server-admin');
}

function decodeBase64UrlJson(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=');
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
}

async function assertAdminRequest(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    const error = new Error('Admin authorization is required.');
    error.status = 401;
    throw error;
  }

  const config = getFirebaseServerConfig();
  if (!config?.projectId) {
    const error = new Error('Firebase project configuration is missing on the server.');
    error.status = 500;
    throw error;
  }

  let payload;
  try {
    payload = decodeBase64UrlJson(token.split('.')[1]);
  } catch {
    const error = new Error('Invalid admin authorization token.');
    error.status = 401;
    throw error;
  }

  const uid = payload?.sub || payload?.user_id;
  if (!uid || payload?.aud !== config.projectId) {
    const error = new Error('Invalid admin authorization token.');
    error.status = 401;
    throw error;
  }

  const adminUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/admins/${encodeURIComponent(uid)}`;
  const response = await fetch(adminUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = new Error('This account is not authorized to send newsletter broadcasts.');
    error.status = response.status === 404 ? 403 : response.status;
    throw error;
  }

  return { uid, email: payload.email || '' };
}

async function assertDeveloperAdminRequest(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    const error = new Error('Developer administrator authorization is required.');
    error.status = 401;
    throw error;
  }

  const app = getFirebaseAdminApp();
  const decoded = await getAdminAuth(app).verifyIdToken(token);
  const uid = decoded?.uid;
  if (!uid) {
    const error = new Error('Invalid developer administrator token.');
    error.status = 401;
    throw error;
  }

  const adminSnapshot = await getAdminFirestore(app).collection('admins').doc(uid).get();
  if (!adminSnapshot.exists) {
    const error = new Error('This account is not a site administrator.');
    error.status = 403;
    throw error;
  }

  const adminData = adminSnapshot.data() || {};
  const email = normalizeEmail(adminData.email || decoded.email);
  const role = normalizeAdminRole(adminData.role, email);
  if (role !== ADMIN_ROLES.SITE_DEVELOPER) {
    const error = new Error('This action is limited to developer administrators.');
    error.status = 403;
    throw error;
  }

  return {
    uid,
    email,
    role,
    firstName: normalizePersonName(adminData.first_name),
    lastName: normalizePersonName(adminData.last_name),
  };
}

async function readEmailTemplate(templateId) {
  const defaultTemplate = getDefaultEmailTemplate(templateId);

  try {
    const db = getServerFirestore();
    if (db) {
      const snapshot = await getDoc(doc(db, 'EmailTemplates', templateId));
      if (snapshot.exists()) {
        return mergeEmailTemplate({ ...snapshot.data(), id: snapshot.id }, templateId);
      }
    }
  } catch (error) {
    console.warn('Unable to read email template from Firestore', error?.message || error);
  }

  const localTemplate = readEntity('EmailTemplates').find((template) => template.id === templateId);
  return mergeEmailTemplate(localTemplate || defaultTemplate, templateId);
}

function linkifyEscapedText(escapedText, variables) {
  let text = escapedText;
  const escapedUnsubscribeUrl = escapeHtml(variables.unsubscribeUrl);
  const escapedSupportEmail = escapeHtml(variables.supportEmail);
  const escapedSupportPhone = escapeHtml(variables.supportPhone);

  if (escapedUnsubscribeUrl) {
    text = text.replaceAll(
      escapedUnsubscribeUrl,
      `<a href="${escapedUnsubscribeUrl}" style="color:#8a5a16;font-weight:bold;text-decoration:underline;">Unsubscribe</a>`
    );
  }

  if (escapedSupportEmail) {
    text = text.replaceAll(
      escapedSupportEmail,
      `<a href="mailto:${escapedSupportEmail}" style="color:#8a5a16;font-weight:bold;text-decoration:underline;">${escapedSupportEmail}</a>`
    );
  }

  if (escapedSupportPhone) {
    text = text.replaceAll(
      escapedSupportPhone,
      `<a href="tel:${escapedSupportPhone}" style="color:#8a5a16;font-weight:bold;text-decoration:underline;">${escapedSupportPhone}</a>`
    );
  }

  return text.replaceAll('\n', '<br />');
}

function renderEmailTextBlock(text, variables, options = {}) {
  const rendered = renderNewsletterTemplateText(text, variables);
  return rendered
    .split(/\n{2,}/)
    .filter((paragraph) => paragraph.trim())
    .map((paragraph) => {
      const content = linkifyEscapedText(escapeHtml(paragraph), variables);
      const style = options.highlight
        ? 'font-size:16px;line-height:1.6;margin:0 0 22px;background:#fff7ed;border-left:4px solid #d97706;padding:14px 16px;'
        : 'font-size:16px;line-height:1.6;margin:0 0 18px;';
      return `<p style="${style}">${content}</p>`;
    })
    .join('');
}

async function buildNewsletterEmail({ templateId, email, firstName = '', lastName = '', unsubscribeUrl = '' }) {
  const template = await readEmailTemplate(templateId);
  const variables = {
    email,
    firstName,
    lastName,
    unsubscribeUrl,
    supportPhone: template.support_phone || '',
    supportEmail: template.support_email || '',
  };
  const subject = renderNewsletterTemplateText(template.subject, variables);
  const heading = renderNewsletterTemplateText(template.heading, variables);
  const bodyHtml = renderEmailTextBlock(template.body, variables);
  const footerHtml = renderEmailTextBlock(template.footer, variables);
  const text = [
    renderNewsletterTemplateText(template.body, variables),
    renderNewsletterTemplateText(template.footer, variables),
  ].filter(Boolean).join('\n\n');

  return {
    subject,
    heading,
    html: `
      <div style="margin:0;padding:0;background:#f8f3ea;font-family:Arial,Helvetica,sans-serif;color:#2f241c;">
        <div style="max-width:640px;margin:0 auto;padding:32px 18px;">
          <div style="background:#ffffff;border:1px solid #eadcc7;border-radius:12px;overflow:hidden;">
            <div style="background:#4b342a;color:#ffffff;padding:24px 28px;">
              <h1 style="margin:0;font-size:24px;line-height:1.25;">${escapeHtml(heading)}</h1>
            </div>
            <div style="padding:28px;">
              ${bodyHtml}
            </div>
            <div style="border-top:1px solid #eadcc7;background:#fbf7f0;padding:18px 28px;color:#6f6258;font-size:12px;line-height:1.5;">
              ${footerHtml}
            </div>
          </div>
        </div>
      </div>
    `,
    text,
  };
}

function renderBroadcastHtml({ subject, message, recipient, unsubscribeUrl }) {
  const variables = {
    email: recipient.email,
    firstName: recipient.firstName,
    lastName: recipient.lastName,
    unsubscribeUrl,
    supportPhone: '',
    supportEmail: '',
  };
  const heading = renderNewsletterTemplateText(subject, variables);
  const bodyHtml = renderEmailTextBlock(message, variables);
  const footerHtml = renderEmailTextBlock(
    `This message was sent to [subscriber email] because you subscribed to updates from Goodwill Presbyterian Church.\n\nIf you no longer wish to receive updates, unsubscribe here:\n[unsubscribe link]`,
    variables
  );
  const text = [
    renderNewsletterTemplateText(message, variables),
    renderNewsletterTemplateText(`If you no longer wish to receive updates, unsubscribe here:\n[unsubscribe link]`, variables),
  ].filter(Boolean).join('\n\n');

  return {
    subject: heading,
    html: `
      <div style="margin:0;padding:0;background:#f8f3ea;font-family:Arial,Helvetica,sans-serif;color:#2f241c;">
        <div style="max-width:680px;margin:0 auto;padding:32px 18px;">
          <div style="background:#ffffff;border:1px solid #eadcc7;border-radius:12px;overflow:hidden;">
            <div style="background:#4b342a;color:#ffffff;padding:24px 28px;">
              <p style="margin:0 0 8px;color:#f4d78d;font-size:12px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;">Goodwill Presbyterian Church</p>
              <h1 style="margin:0;font-size:24px;line-height:1.25;">${escapeHtml(heading)}</h1>
            </div>
            <div style="padding:28px;">
              ${bodyHtml}
            </div>
            <div style="border-top:1px solid #eadcc7;background:#fbf7f0;padding:18px 28px;color:#6f6258;font-size:12px;line-height:1.5;">
              ${footerHtml}
            </div>
          </div>
        </div>
      </div>
    `,
    text,
  };
}

function buildAdminBroadcastNotificationEmail({ admin, subject, sent, failed, recipientCount }) {
  const adminName = normalizePersonName([admin.firstName, admin.lastName].filter(Boolean).join(' ')) || 'Site administrator';
  const escapedSubject = escapeHtml(subject);
  const escapedAdminName = escapeHtml(adminName);
  const sentLine = `${sent} subscriber${sent === 1 ? '' : 's'}`;
  const failedLine = `${failed} failed`;

  return {
    subject: `Scheduled newsletter broadcast sent: ${subject}`,
    text: [
      `Hello ${adminName},`,
      '',
      `A scheduled Goodwill Presbyterian Church newsletter broadcast has been processed.`,
      '',
      `Subject: ${subject}`,
      `Recipients selected: ${recipientCount}`,
      `Sent: ${sent}`,
      `Failed: ${failed}`,
      '',
      'Please sign in to the admin panel if you need to review the broadcast history.',
      '',
      'goodwill-pc-web',
    ].join('\n'),
    html: `
      <div style="margin:0;padding:0;background:#f8f3ea;font-family:Arial,Helvetica,sans-serif;color:#2f241c;">
        <div style="max-width:620px;margin:0 auto;padding:28px 18px;">
          <div style="background:#ffffff;border:1px solid #eadcc7;border-radius:12px;overflow:hidden;">
            <div style="background:#4b342a;color:#ffffff;padding:22px 26px;">
              <p style="margin:0 0 8px;color:#f4d78d;font-size:12px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;">Admin Notification</p>
              <h1 style="margin:0;font-size:22px;line-height:1.3;">Scheduled newsletter broadcast sent</h1>
            </div>
            <div style="padding:26px;font-size:16px;line-height:1.6;">
              <p style="margin:0 0 16px;">Hello ${escapedAdminName},</p>
              <p style="margin:0 0 16px;">A scheduled Goodwill Presbyterian Church newsletter broadcast has been processed.</p>
              <div style="background:#fbf7f0;border:1px solid #eadcc7;border-radius:10px;padding:16px;margin:18px 0;">
                <p style="margin:0 0 8px;"><strong>Subject:</strong> ${escapedSubject}</p>
                <p style="margin:0 0 8px;"><strong>Recipients selected:</strong> ${recipientCount}</p>
                <p style="margin:0 0 8px;"><strong>Sent:</strong> ${sentLine}</p>
                <p style="margin:0;"><strong>Failed:</strong> ${failedLine}</p>
              </div>
              <p style="margin:0;">Please sign in to the admin panel if you need to review the broadcast history.</p>
            </div>
          </div>
        </div>
      </div>
    `,
  };
}

function buildAdminInvitationEmail({ email, setupLink, expiresAt, role = ADMIN_ROLES.SITE_ADMIN }) {
  const escapedEmail = escapeHtml(email);
  const escapedSetupLink = escapeHtml(setupLink);
  const roleLabel = getAdminRoleLabel(role);
  const escapedRoleLabel = escapeHtml(roleLabel);
  const expiresText = expiresAt ? new Date(expiresAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }) : '';

  return {
    subject: 'Your Goodwill Presbyterian Church admin access',
    text: [
      'Hello Brethren,',
      '',
      `You have been invited to act as ${roleLabel} for the Goodwill Presbyterian Church website.`,
      'Please use the secure one-time setup link below to create your password.',
      '',
      `Email: ${email}`,
      `Role: ${roleLabel}`,
      expiresText ? `Invitation expires: ${expiresText}` : '',
      '',
      'Create New Password:',
      setupLink,
      '',
      'Use the button above or copy and paste the following link in your browser:',
      setupLink,
      '',
      'If you did not expect this message, please ignore it.',
    ].join('\n'),
    html: `
      <div style="margin:0;padding:0;background:#f8f3ea;font-family:Arial,Helvetica,sans-serif;color:#2f241c;">
        <div style="max-width:640px;margin:0 auto;padding:30px 18px;">
          <div style="background:#ffffff;border:1px solid #eadcc7;border-radius:12px;overflow:hidden;">
            <div style="background:#4b342a;color:#ffffff;padding:24px 28px;">
              <p style="margin:0 0 8px;color:#f4d78d;font-size:12px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;">${escapedRoleLabel} Access</p>
              <h1 style="margin:0;font-size:24px;line-height:1.3;">Welcome to the Goodwill Presbyterian Church admin team</h1>
            </div>
            <div style="padding:28px;font-size:16px;line-height:1.6;">
              <p style="margin:0 0 16px;">Hello Brethren,</p>
              <p style="margin:0 0 16px;">You have been invited to act as ${escapedRoleLabel} for the Goodwill Presbyterian Church website.</p>
              <p style="margin:0 0 16px;">Please use the secure one-time setup link below to create your password.</p>
              <div style="background:#fbf7f0;border:1px solid #eadcc7;border-radius:10px;padding:16px;margin:18px 0;">
                <p style="margin:0 0 8px;"><strong>Email:</strong> ${escapedEmail}</p>
                <p style="margin:0 0 8px;"><strong>Role:</strong> ${escapedRoleLabel}</p>
                ${expiresText ? `<p style="margin:0;"><strong>Invitation expires:</strong> ${escapeHtml(expiresText)}</p>` : ''}
              </div>
              <p style="margin:0 0 22px;text-align:center;">
                <a href="${escapedSetupLink}" style="display:inline-block;background:#d97706;color:#ffffff;font-weight:bold;text-decoration:none;border-radius:8px;padding:12px 18px;">Create New Password</a>
              </p>
              <div style="background:#fbf7f0;border:1px solid #eadcc7;border-radius:10px;padding:14px;margin:0 0 4px;">
                <p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:#5f4735;">Use the button above or copy and paste the following link in your browser:</p>
                <a href="${escapedSetupLink}" style="color:#8a4b05;font-size:13px;line-height:1.5;word-break:break-all;">${escapedSetupLink}</a>
              </div>
            </div>
            <div style="border-top:1px solid #eadcc7;background:#fbf7f0;padding:18px 28px;color:#6f6258;font-size:12px;line-height:1.5;">
              If you did not expect this message, please ignore it.
            </div>
          </div>
        </div>
      </div>
    `,
  };
}

async function sendResendEmail({ from, to, subject, html, text, attachments = [] }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return {
      ok: false,
      status: 500,
      body: 'RESEND_API_KEY is not configured on the server.',
    };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text,
      ...(attachments.length > 0 ? { attachments } : {}),
    }),
  });
  const body = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}

// Simple filter: exact match on keys in filter object
function applyFilter(items, filter = {}) {
  const keys = Object.keys(filter || {});
  if (keys.length === 0) return items;
  return items.filter(item => keys.every(k => String(item[k]) === String(filter[k])));
}

function applySortAndLimit(items, sort, limit) {
  let result = [...items];
  if (sort) {
    const descending = sort.startsWith('-');
    const key = descending ? sort.slice(1) : sort;
    result.sort((a, b) => {
      const av = a[key] ?? '';
      const bv = b[key] ?? '';
      if (av === bv) return 0;
      return (av > bv ? 1 : -1) * (descending ? -1 : 1);
    });
  }
  return limit ? result.slice(0, Number(limit)) : result;
}

function requireLocalEntityWriteAccess(req, res, next) {
  if (process.env.LOCAL_VITE_DEV === 'true' || process.env.ALLOW_LOCAL_ENTITY_WRITES === 'true') {
    return next();
  }

  return res.status(403).json({
    error: 'Local entity writes are disabled on this server.',
  });
}

app.post('/api/entities/:entity/filter', (req, res) => {
  const { entity } = req.params;
  const { filter, sort, limit } = req.body;
  const items = readEntity(entity);
  const result = applySortAndLimit(applyFilter(items, filter), sort, limit);
  res.json(result);
});

app.get('/api/entities/:entity', (req, res) => {
  const { entity } = req.params;
  const { sort, limit } = req.query;
  const items = readEntity(entity);
  res.json(applySortAndLimit(items, sort, limit));
});

app.post('/api/entities/:entity', requireLocalEntityWriteAccess, (req, res) => {
  const { entity } = req.params;
  const data = req.body;
  const items = readEntity(entity);

  if (entity === 'NewsletterSubscriptions') {
    const email = normalizeEmail(data.email);
    const emailKey = data.email_key || encodeURIComponent(email);
    const firstName = String(data.first_name || '').trim().replace(/\s+/g, ' ');
    const lastName = String(data.last_name || '').trim().replace(/\s+/g, ' ');
    const existingIndex = items.findIndex(item => item.email_key === emailKey || normalizeEmail(item.email) === email);

    if (existingIndex !== -1 && items[existingIndex].status !== 'unsubscribed') {
      return res.status(409).json({ error: 'already-subscribed' });
    }

    const item = {
      id: emailKey,
      ...data,
      first_name: firstName,
      last_name: lastName,
      email,
      email_key: emailKey,
      status: 'active',
      created_date: data.created_date || new Date().toISOString(),
    };

    if (existingIndex === -1) {
      items.push(item);
    } else {
      items[existingIndex] = { ...items[existingIndex], ...item };
    }

    writeEntity(entity, items);
    return res.status(201).json(item);
  }

  if (entity === 'EmailTemplates') {
    const id = data.id;
    if (!id) return res.status(400).json({ error: 'Email template id is required' });
    const existingIndex = items.findIndex(item => String(item.id) === String(id));
    const item = {
      ...data,
      id,
      created_date: data.created_date || new Date().toISOString(),
    };

    if (existingIndex === -1) {
      items.push(item);
    } else {
      items[existingIndex] = { ...items[existingIndex], ...item };
    }

    writeEntity(entity, items);
    return res.status(201).json(item);
  }

  const id = Date.now().toString();
  const item = { id, ...data };
  items.push(item);
  writeEntity(entity, items);
  res.status(201).json(item);
});

app.delete('/api/entities/:entity/:id', requireLocalEntityWriteAccess, (req, res) => {
  const { entity, id } = req.params;
  let items = readEntity(entity);
  const exists = items.some(i => String(i.id) === String(id));
  if (!exists) return res.status(404).json({ error: 'Not found' });
  items = items.filter(i => String(i.id) !== String(id));
  writeEntity(entity, items);
  res.json({ success: true });
});

app.put('/api/entities/:entity/:id', requireLocalEntityWriteAccess, (req, res) => {
  const { entity, id } = req.params;
  const items = readEntity(entity);
  const index = items.findIndex(i => String(i.id) === String(id));
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  items[index] = { ...items[index], ...req.body, id: items[index].id };
  writeEntity(entity, items);
  res.json(items[index]);
});

app.get('/api/youtube/live-status', async (req, res) => {
  const status = await getCachedYoutubeLiveStatus({
    forceRefresh: req.query?.refresh === 'true' && process.env.LOCAL_VITE_DEV === 'true',
  });
  res.set('Cache-Control', 'no-store');
  res.json(status);
});

app.post('/api/web-vitals', (req, res) => {
  res.set('Cache-Control', 'no-store');

  if (!checkWebVitalsRateLimit(req)) {
    return res.status(204).end();
  }

  const metric = normalizeWebVitalsMetric(req.body);
  if (metric) {
    console.info('web-vital', JSON.stringify(metric));
  }

  return res.status(204).end();
});

app.post('/api/client-errors', (req, res) => {
  res.set('Cache-Control', 'no-store');

  if (!checkClientErrorRateLimit(req)) {
    return res.status(204).end();
  }

  const report = normalizeClientErrorReport(req.body);
  if (report) {
    console.error('client-error', JSON.stringify(report));
  }

  return res.status(204).end();
});

async function handleUnsubscribeRequest(req, res) {
  const { email, emailKey, token } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  // remove from NewsletterSubscriptions
  const subs = readEntity('NewsletterSubscriptions');
  const normalizedEmail = normalizeEmail(email);
  const remaining = subs.filter((subscription) => {
    const keyMatches = emailKey && subscription.email_key === emailKey;
    const emailMatches = normalizeEmail(subscription.email) === normalizedEmail;
    const tokenMatches = subscription.unsubscribe_token
      ? Boolean(token) && subscription.unsubscribe_token === token
      : true;

    return !(tokenMatches && (keyMatches || emailMatches));
  });
  writeEntity('NewsletterSubscriptions', remaining);

  // Optionally call Resend suppression
  const key = process.env.RESEND_API_KEY;
  if (key) {
    try {
      await fetch('https://api.resend.com/emails/suppressed', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch (e) {
      console.warn('Resend suppression failed', e?.message || e);
    }
  }

  res.json({ success: true });
}

// Resend suppression + send welcome email endpoints
app.post('/api/unsubscribe', handleUnsubscribeRequest);

app.post('/api/functions/unsubscribeNewsletter', handleUnsubscribeRequest);

app.post('/api/send-welcome-email', async (req, res) => {
  let recipient;
  try {
    recipient = validatePublicEmailRecipient(req.body, { requireUnsubscribeToken: true });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }

  const rateLimit = checkPublicEmailRateLimit(req, recipient.email, 'welcome');
  if (!rateLimit.allowed) {
    res.set('Retry-After', String(rateLimit.retryAfterSeconds));
    return res.status(429).json({ error: 'Too many email requests. Please try again later.' });
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Goodwill Presbyterian Church <onboarding@resend.dev>';
  const unsubscribeParams = new URLSearchParams({
    email: recipient.email,
    key: recipient.emailKey,
    token: recipient.unsubscribeToken,
  });
  const unsubscribeUrl = `${getPublicSiteOrigin(req)}/Unsubscribe?${unsubscribeParams.toString()}`;

  try {
    const emailContent = await buildNewsletterEmail({
      templateId: NEWSLETTER_TEMPLATE_IDS.welcome,
      email: recipient.email,
      firstName: recipient.firstName,
      lastName: recipient.lastName,
      unsubscribeUrl,
    });
    const response = await sendResendEmail({
      from: fromEmail,
      to: recipient.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
    if (!response.ok) {
      console.error('Resend welcome email error', response.body);
      return res.status(502).json({
        error: 'Welcome email was not sent.',
        detail: response.body.slice(0, 500),
      });
    }
    const data = JSON.parse(response.body || '{}');
    res.json({ success: true, id: data.id });
  } catch (e) {
    console.error('Send welcome error', e?.message || e);
    res.status(500).json({ error: e?.message || 'Error' });
  }
});

app.post('/api/send-duplicate-subscription-email', async (req, res) => {
  let recipient;
  try {
    recipient = validatePublicEmailRecipient(req.body);
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }

  const rateLimit = checkPublicEmailRateLimit(req, recipient.email, 'duplicate');
  if (!rateLimit.allowed) {
    res.set('Retry-After', String(rateLimit.retryAfterSeconds));
    return res.status(429).json({ error: 'Too many email requests. Please try again later.' });
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Goodwill Presbyterian Church <onboarding@resend.dev>';

  try {
    const emailContent = await buildNewsletterEmail({
      templateId: NEWSLETTER_TEMPLATE_IDS.duplicate,
      email: recipient.email,
      firstName: recipient.firstName,
      lastName: recipient.lastName,
    });
    const response = await sendResendEmail({
      from: fromEmail,
      to: recipient.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
    if (!response.ok) {
      console.error('Resend duplicate subscription error', response.body);
      return res.status(502).json({
        error: 'Duplicate subscription email was not sent.',
        detail: response.body.slice(0, 500),
      });
    }
    const data = JSON.parse(response.body || '{}');
    res.json({ success: true, id: data.id });
  } catch (e) {
    console.error('Send duplicate subscription error', e?.message || e);
    res.status(500).json({ error: e?.message || 'Error' });
  }
});

app.post('/api/admin/create-site-admin', async (req, res) => {
  let developerAdmin;
  try {
    developerAdmin = await assertDeveloperAdminRequest(req);
    assertRootSiteDeveloper(developerAdmin);
  } catch (error) {
    console.error('Create site admin authorization error', error?.message || error);
    return res.status(error.status || 401).json({ error: error.message });
  }

  const email = normalizeEmail(req.body?.email);
  const role = ADMIN_ROLES.SITE_ADMIN;
  const siteProtocol = req.body?.protocol || 'https';
  const siteHost = req.body?.host || CANONICAL_HOST;
  const siteUrl = `${siteProtocol}://${siteHost}`;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'A valid email address is required.' });

  try {
    const db = getAdminFirestore(getFirebaseAdminApp());
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const token = createInvitationToken();
    const tokenHash = hashInvitationToken(token);

    const existingInvitations = await db.collection('AdminInvitations')
      .where('email', '==', email)
      .get();
    const existingPending = existingInvitations.docs.filter((entry) => entry.data()?.status === 'pending');
    await Promise.all(existingPending.map((entry) => entry.ref.update({
      status: 'expired',
      expired_date: now,
      updated_date: now,
    })));

    const invitationRef = await db.collection('AdminInvitations').add({
      email,
      role,
      token_hash: tokenHash,
      status: 'pending',
      invited_by_uid: developerAdmin.uid,
      invited_by_email: developerAdmin.email,
      expires_at: expiresAt,
      created_date: now,
      updated_date: now,
    });

    const setupLink = `${siteUrl}/AdminSetup?token=${encodeURIComponent(token)}`;
    const invitation = buildAdminInvitationEmail({
      email,
      setupLink,
      expiresAt,
      role,
    });
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Goodwill Presbyterian Church <onboarding@resend.dev>';
    const emailResponse = await sendResendEmail({
      from: fromEmail,
      to: email,
      subject: invitation.subject,
      html: invitation.html,
      text: invitation.text,
    });

    if (!emailResponse.ok) {
      console.error('Admin invitation email error', emailResponse.body);
      return res.status(502).json({
        error: 'The administrator invitation was created, but the invitation email was not sent.',
        detail: emailResponse.body.slice(0, 500),
        invitationId: invitationRef.id,
      });
    }

    res.json({
      success: true,
      invitationId: invitationRef.id,
      email,
      role,
      expiresAt,
    });
  } catch (error) {
    console.error('Create site admin error', error?.message || error);
    res.status(error.status || 500).json({ error: error?.message || 'Unable to create the administrator invitation.' });
  }
});

async function getPendingInvitationByToken(token) {
  const tokenHash = hashInvitationToken(token);
  const db = getAdminFirestore(getFirebaseAdminApp());
  const snapshot = await db.collection('AdminInvitations')
    .where('token_hash', '==', tokenHash)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const entry = snapshot.docs[0];
  const invitation = { id: entry.id, ref: entry.ref, ...entry.data() };
  if (invitation.status !== 'pending') return null;
  const expiresAt = new Date(invitation.expires_at || '');
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
    await entry.ref.update({
      status: 'expired',
      expired_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
    });
    return null;
  }

  return invitation;
}

app.get('/api/admin/setup-invitation', async (req, res) => {
  try {
    const token = String(req.query.token || '').trim();
    if (!token) return res.status(400).json({ error: 'Invitation token is required.' });
    const invitation = await getPendingInvitationByToken(token);
    if (!invitation) return res.status(404).json({ error: 'This invitation is invalid or has expired.' });
    res.json({
      email: invitation.email,
      role: normalizeAdminRole(invitation.role, invitation.email),
      roleLabel: getAdminRoleLabel(normalizeAdminRole(invitation.role, invitation.email)),
      expiresAt: invitation.expires_at,
    });
  } catch (error) {
    console.error('Read admin setup invitation error', error?.message || error);
    res.status(error.status || 500).json({ error: error?.message || 'Unable to read the administrator invitation.' });
  }
});

app.post('/api/admin/complete-invitation', async (req, res) => {
  const token = String(req.body?.token || '').trim();
  const firstName = normalizePersonName(req.body?.firstName || req.body?.first_name);
  const lastName = normalizePersonName(req.body?.lastName || req.body?.last_name);
  const password = String(req.body?.password || '');

  if (!token) return res.status(400).json({ error: 'Invitation token is required.' });
  if (!firstName) return res.status(400).json({ error: 'First name is required.' });
  if (!lastName) return res.status(400).json({ error: 'Last name is required.' });
  if (!passwordMeetsAdminRules(password)) {
    return res.status(400).json({ error: 'Password must be at least 6 characters with uppercase, lowercase, a number, and a special character.' });
  }

  try {
    const invitation = await getPendingInvitationByToken(token);
    if (!invitation) return res.status(404).json({ error: 'This invitation is invalid or has expired.' });

    const app = getFirebaseAdminApp();
    const auth = getAdminAuth(app);
    const db = getAdminFirestore(app);
    const email = normalizeEmail(invitation.email);
    const role = normalizeAdminRole(invitation.role, email);
    const displayName = `${firstName} ${lastName}`.trim();
    let userRecord;
    let existingUser = false;

    try {
      userRecord = await auth.getUserByEmail(email);
      existingUser = true;
      userRecord = await auth.updateUser(userRecord.uid, {
        displayName,
        password,
        disabled: false,
      });
    } catch (error) {
      if (error?.code !== 'auth/user-not-found') throw error;
      userRecord = await auth.createUser({
        email,
        password,
        displayName,
        emailVerified: false,
        disabled: false,
      });
    }

    const now = new Date().toISOString();
    await db.collection('admins').doc(userRecord.uid).set({
      first_name: firstName,
      last_name: lastName,
      email,
      role,
      role_label: getAdminRoleLabel(role),
      photo_url: '',
      has_saved_name: true,
      invited_by_uid: invitation.invited_by_uid || '',
      invited_by_email: invitation.invited_by_email || '',
      invitation_id: invitation.id,
      created_date: now,
      updated_date: now,
    }, { merge: true });

    await invitation.ref.update({
      status: 'used',
      used_date: now,
      completed_uid: userRecord.uid,
      updated_date: now,
    });

    res.json({
      success: true,
      email,
      role,
      roleLabel: getAdminRoleLabel(role),
      uid: userRecord.uid,
      existingUser,
    });
  } catch (error) {
    console.error('Complete admin invitation error', error?.message || error);
    res.status(error.status || 500).json({ error: error?.message || 'Unable to complete the administrator invitation.' });
  }
});

app.get('/api/admin/site-admins', async (req, res) => {
  try {
    const developerAdmin = await assertDeveloperAdminRequest(req);
    const db = getAdminFirestore(getFirebaseAdminApp());
    const adminSnapshot = await db.collection('admins').get();
    const rows = adminSnapshot.docs
      .map((entry) => {
        const data = entry.data() || {};
        const email = normalizeEmail(data.email);
        const role = normalizeAdminRole(data.role, email);
        return {
        uid: entry.id,
        email,
        role,
        first_name: normalizePersonName(data.first_name),
        last_name: normalizePersonName(data.last_name),
        has_saved_name: Boolean(data.first_name && data.last_name),
        created_date: data.created_date || '',
        updated_date: data.updated_date || '',
        role_label: getAdminRoleLabel(role),
        };
      })
      .filter((admin) => admin.uid || admin.email);

    const developerInRows = rows.some((admin) => (
      String(admin.uid || '') === String(developerAdmin.uid || '')
      || normalizeEmail(admin.email) === developerAdmin.email
    ));
    if (!developerInRows) {
      rows.push({
        uid: developerAdmin.uid,
        email: developerAdmin.email,
        role: developerAdmin.role,
        first_name: developerAdmin.firstName,
        last_name: developerAdmin.lastName,
        has_saved_name: Boolean(developerAdmin.firstName && developerAdmin.lastName),
        created_date: '',
        updated_date: '',
        role_label: 'Site Developer',
      });
    }

    rows.sort((a, b) => a.email.localeCompare(b.email));

    res.json({ admins: rows });
  } catch (error) {
    console.error('List site admins error', error?.message || error);
    res.status(error.status || 500).json({ error: error?.message || 'Unable to load site administrators.' });
  }
});

app.delete('/api/admin/site-admins/:uid', async (req, res) => {
  let developerAdmin;
  try {
    developerAdmin = await assertDeveloperAdminRequest(req);
    assertRootSiteDeveloper(developerAdmin);
  } catch (error) {
    return res.status(error.status || 401).json({ error: error.message });
  }

  const uid = String(req.params.uid || '').trim();
  if (!uid) return res.status(400).json({ error: 'Administrator UID is required.' });
  if (uid === developerAdmin.uid) {
    return res.status(400).json({ error: 'The permanent root Site Developer account cannot delete itself.' });
  }

  try {
    const db = getAdminFirestore(getFirebaseAdminApp());
    const adminRef = db.collection('admins').doc(uid);
    const snapshot = await adminRef.get();
    if (!snapshot.exists) {
      return res.status(404).json({ error: 'No Firestore admin record was found for this user.' });
    }

    const adminData = snapshot.data() || {};
    if (normalizeEmail(adminData.email) === SITE_DEVELOPER_EMAIL) {
      return res.status(400).json({ error: 'The permanent root Site Developer cannot be removed.' });
    }
    await adminRef.delete();
    res.json({
      success: true,
      uid,
      email: normalizeEmail(adminData.email),
    });
  } catch (error) {
    console.error('Delete site admin error', error?.message || error);
    res.status(error.status || 500).json({ error: error?.message || 'Unable to delete the site administrator.' });
  }
});

app.patch('/api/admin/site-admins/:uid/role', async (req, res) => {
  let developerAdmin;
  try {
    developerAdmin = await assertDeveloperAdminRequest(req);
    assertRootSiteDeveloper(developerAdmin);
  } catch (error) {
    return res.status(error.status || 401).json({ error: error.message });
  }

  const uid = String(req.params.uid || '').trim();
  const requestedRole = String(req.body?.role || '').trim().toLowerCase();
  const role = normalizeAdminRole(requestedRole);
  if (!uid) return res.status(400).json({ error: 'Administrator UID is required.' });
  if (![ADMIN_ROLES.SITE_ADMIN, ADMIN_ROLES.SITE_DEVELOPER].includes(requestedRole)) {
    return res.status(400).json({ error: 'A valid administrator role is required.' });
  }

  try {
    const db = getAdminFirestore(getFirebaseAdminApp());
    const adminRef = db.collection('admins').doc(uid);
    const snapshot = await adminRef.get();
    if (!snapshot.exists) {
      return res.status(404).json({ error: 'No Firestore admin record was found for this user.' });
    }

    const adminData = snapshot.data() || {};
    const email = normalizeEmail(adminData.email);
    if (email === SITE_DEVELOPER_EMAIL && role !== ADMIN_ROLES.SITE_DEVELOPER) {
      return res.status(400).json({ error: 'The permanent root Site Developer cannot be demoted.' });
    }

    await adminRef.update({
      role,
      role_label: getAdminRoleLabel(role),
      updated_date: new Date().toISOString(),
    });

    res.json({
      success: true,
      uid,
      email,
      role,
      roleLabel: getAdminRoleLabel(role),
    });
  } catch (error) {
    console.error('Update site admin role error', error?.message || error);
    res.status(error.status || 500).json({ error: error?.message || 'Unable to update the administrator role.' });
  }
});

app.post('/api/send-newsletter-broadcast', async (req, res) => {
  try {
    await assertAdminRequest(req);
  } catch (error) {
    return res.status(error.status || 401).json({ error: error.message });
  }

  const { subject, message, recipients = [], attachments = [], notifyAdmins = false, adminRecipients = [], host, protocol } = req.body || {};
  const normalizedSubject = String(subject || '').trim();
  const normalizedMessage = String(message || '').trim();
  const activeRecipients = recipients
    .map((recipient) => ({
      email: normalizeEmail(recipient.email),
      firstName: normalizePersonName(recipient.firstName || recipient.first_name),
      lastName: normalizePersonName(recipient.lastName || recipient.last_name),
      emailKey: recipient.emailKey || recipient.email_key,
      unsubscribeToken: recipient.unsubscribeToken || recipient.unsubscribe_token,
    }))
    .filter((recipient) => recipient.email);
  const preparedAttachments = (await Promise.all(attachments.map(async (attachment) => {
    const filename = String(attachment.filename || '').trim();
    const contentType = String(attachment.contentType || attachment.content_type || '').trim() || undefined;
    const inlineContent = String(attachment.content || '').trim();
    const fileUrl = String(attachment.file_url || attachment.fileUrl || '').trim();

    if (filename && inlineContent) {
      return { filename, content_type: contentType, content: inlineContent };
    }

    if (filename && fileUrl) {
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) return null;
      const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());
      return {
        filename,
        content_type: contentType || fileResponse.headers.get('content-type') || undefined,
        content: fileBuffer.toString('base64'),
      };
    }

    return null;
  }))).filter(Boolean);

  if (!normalizedSubject) return res.status(400).json({ error: 'Subject is required.' });
  if (!normalizedMessage) return res.status(400).json({ error: 'Message is required.' });
  if (activeRecipients.length === 0) return res.status(400).json({ error: 'At least one active subscriber is required.' });
  if (activeRecipients.length > 500) return res.status(400).json({ error: 'Please send to 500 or fewer recipients at a time.' });
  if (preparedAttachments.length > 5) return res.status(400).json({ error: 'Please attach no more than 5 files.' });

  const totalAttachmentBytes = preparedAttachments.reduce((sum, attachment) => {
    return sum + Math.ceil((attachment.content.length * 3) / 4);
  }, 0);

  if (totalAttachmentBytes > 8 * 1024 * 1024) {
    return res.status(400).json({ error: 'Attachments must be 8 MB or less combined.' });
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Goodwill Presbyterian Church <onboarding@resend.dev>';
  const siteHost = host || CANONICAL_HOST;
  const siteProtocol = protocol || 'https';
  const results = [];

  for (const recipient of activeRecipients) {
    const unsubscribeParams = new URLSearchParams({
      email: recipient.email,
      key: recipient.emailKey || encodeURIComponent(recipient.email),
    });

    if (recipient.unsubscribeToken) {
      unsubscribeParams.set('token', recipient.unsubscribeToken);
    }

    const unsubscribeUrl = `${siteProtocol}://${siteHost}/Unsubscribe?${unsubscribeParams.toString()}`;
    const emailContent = renderBroadcastHtml({
      subject: normalizedSubject,
      message: normalizedMessage,
      recipient,
      unsubscribeUrl,
    });

    const response = await sendResendEmail({
      from: fromEmail,
      to: recipient.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      attachments: preparedAttachments,
    });

    if (!response.ok) {
      results.push({
        email: recipient.email,
        success: false,
        detail: response.body.slice(0, 300),
      });
    } else {
      let id = '';
      try {
        id = JSON.parse(response.body || '{}').id || '';
      } catch {
        id = '';
      }
      results.push({ email: recipient.email, success: true, id });
    }
  }

  const sent = results.filter((result) => result.success).length;
  const failed = results.length - sent;
  const adminNotificationResults = [];

  if (notifyAdmins) {
    const uniqueAdmins = Array.from(new Map(adminRecipients
      .map((admin) => ({
        email: normalizeEmail(admin.email),
        firstName: normalizePersonName(admin.firstName || admin.first_name),
        lastName: normalizePersonName(admin.lastName || admin.last_name),
      }))
      .filter((admin) => admin.email)
      .map((admin) => [admin.email, admin])).values());

    for (const admin of uniqueAdmins) {
      const notification = buildAdminBroadcastNotificationEmail({
        admin,
        subject: normalizedSubject,
        sent,
        failed,
        recipientCount: activeRecipients.length,
      });
      const response = await sendResendEmail({
        from: fromEmail,
        to: admin.email,
        subject: notification.subject,
        html: notification.html,
        text: notification.text,
      });
      adminNotificationResults.push({
        email: admin.email,
        success: response.ok,
        detail: response.ok ? '' : response.body.slice(0, 300),
      });
    }
  }

  res.json({ success: failed === 0, sent, failed, results, adminNotifications: adminNotificationResults });
});

const port = Number(process.env.PORT || 3100);
const host = process.env.HOST || '0.0.0.0';
const useLocalViteServer = process.env.LOCAL_VITE_DEV === 'true';

refreshLandingImagePreloadCache().catch(() => {});

if (useLocalViteServer) {
  if (!globalThis.crypto?.getRandomValues && crypto.webcrypto) {
    globalThis.crypto = crypto.webcrypto;
  }

  if (!crypto.getRandomValues && crypto.webcrypto?.getRandomValues) {
    crypto.getRandomValues = crypto.webcrypto.getRandomValues.bind(crypto.webcrypto);
  }

  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    appType: 'custom',
    server: {
      host: 'localhost',
      hmr: false,
      ws: false,
      middlewareMode: true,
    },
  });

  app.use(vite.middlewares);
  app.use(async (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }

    try {
      const template = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
      const html = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (error) {
      vite.ssrFixStacktrace(error);
      next(error);
    }
  });
} else if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, { index: false }));

  app.use(async (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API route not found' });
    }

    try {
      res.status(200).type('html').send(await renderIndexHtmlWithLandingImagePreload());
    } catch (error) {
      next(error);
    }
  });
}

app.listen(port, host, () => console.log(`Node site listening at http://${host}:${port}`));
