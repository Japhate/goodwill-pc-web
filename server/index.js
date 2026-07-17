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
import {
  buildSeoJsonLd,
  getCanonicalRedirectPath,
  getSeoMetadata,
  normalizeInternalLinkUrl,
  shouldRedirectToCanonicalPath,
} from '../src/lib/seo.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const CANONICAL_HOST = 'www.goodwillpresch1867.com';
const SITE_DEVELOPER_EMAIL = 'nebajaphate@gmail.com';
const ROOT_SITE_DEVELOPER_UID = String(process.env.ROOT_SITE_DEVELOPER_UID || '').trim();
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
const ADMIN_INVITATION_TTL_HOURS = Math.min(72, Math.max(
  1,
  Number.parseInt(process.env.ADMIN_INVITATION_TTL_HOURS || '24', 10) || 24,
));
const ADMIN_INVITATION_PROCESSING_TIMEOUT_MS = 10 * 60 * 1000;
const ADMIN_INVITATION_RATE_LIMITS = {
  inspect: { windowMs: 15 * 60 * 1000, max: 60 },
  complete: { windowMs: 15 * 60 * 1000, max: 10 },
  decline: { windowMs: 15 * 60 * 1000, max: 10 },
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
const SEO_BLOCK_PATTERN = /<!-- GOODWILL_SEO_START -->[\s\S]*?<!-- GOODWILL_SEO_END -->/;
const DEFAULT_LANDING_IMAGE_RECORD = {
  id: 'landing-image',
  image_url: '/images/hero/goodwill-presbyterian-church-hero.png',
  alt_text: 'Welcome to Goodwill Presbyterian Church',
  link_url: '/about',
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
  if (req.path.toLowerCase() === '/adminsetup' || req.path.startsWith('/api/admin/')) {
    res.set({
      'Cache-Control': 'no-store, max-age=0',
      'Pragma': 'no-cache',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    });
  }
  next();
});

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

function checkAdminInvitationRateLimit(req, purpose) {
  prunePublicEmailRateLimits();
  return takeRateLimitSlot(
    `admin-invitation:${purpose}:ip:${getClientIp(req)}`,
    ADMIN_INVITATION_RATE_LIMITS[purpose],
  );
}

function enforceAdminInvitationRateLimit(req, res, purpose) {
  const result = checkAdminInvitationRateLimit(req, purpose);
  if (result.allowed) return true;
  res.set('Retry-After', String(result.retryAfterSeconds));
  res.status(429).json({
    code: 'invitation_rate_limited',
    error: 'Too many invitation requests were made. Please wait and try again.',
  });
  return false;
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

function normalizeAdminRole(role) {
  const normalizedRole = String(role || '').trim().toLowerCase();
  if (normalizedRole === ADMIN_ROLES.SITE_DEVELOPER) return ADMIN_ROLES.SITE_DEVELOPER;
  return ADMIN_ROLES.SITE_ADMIN;
}

function getAdminRoleLabel(role) {
  return role === ADMIN_ROLES.SITE_DEVELOPER ? 'Site Developer' : 'Site Admin';
}

function isRootSiteDeveloper(admin = {}) {
  return Boolean(ROOT_SITE_DEVELOPER_UID) && String(admin.uid || '') === ROOT_SITE_DEVELOPER_UID;
}

function assertRootSiteDeveloper(admin = {}) {
  if (!ROOT_SITE_DEVELOPER_UID) {
    const error = new Error('ROOT_SITE_DEVELOPER_UID is not configured on the server. Root administrator management is locked.');
    error.status = 503;
    throw error;
  }
  if (!isRootSiteDeveloper(admin)) {
    const error = new Error('Only the permanent root Site Developer can add, remove, promote, or demote administrators.');
    error.status = 403;
    throw error;
  }
}

async function setServerManagedAdminClaims(auth, userRecord, role) {
  const existingClaims = userRecord?.customClaims || {};
  await auth.setCustomUserClaims(userRecord.uid, {
    ...existingClaims,
    admin: true,
    admin_role: normalizeAdminRole(role),
    root_site_developer: userRecord.uid === ROOT_SITE_DEVELOPER_UID,
  });
}

async function clearServerManagedAdminClaims(auth, userRecord) {
  const existingClaims = { ...(userRecord?.customClaims || {}) };
  delete existingClaims.admin;
  delete existingClaims.admin_role;
  delete existingClaims.root_site_developer;
  await auth.setCustomUserClaims(userRecord.uid, existingClaims);
}

async function removeOrRestorePendingAuthAccount(app, invitation = {}) {
  const uid = String(invitation.completed_uid || '').trim();
  if (!uid) return;
  const auth = getAdminAuth(app);
  if (invitation.existing_user === false) {
    await auth.deleteUser(uid).catch((error) => {
      if (error?.code !== 'auth/user-not-found') throw error;
    });
    return;
  }
  await auth.updateUser(uid, {
    disabled: Boolean(invitation.existing_user_was_disabled),
  }).catch((error) => {
    if (error?.code !== 'auth/user-not-found') throw error;
  });
}

function createInvitationToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function hashInvitationToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function isValidInvitationToken(token) {
  return /^[A-Za-z0-9_-]{43}$/.test(String(token || ''));
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
  const linkUrl = normalizeInternalLinkUrl(record.link_url || DEFAULT_LANDING_IMAGE_RECORD.link_url);
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
  preloadTags.push(`<meta name="goodwill:landing-image-link-url" content="${escapeHtml(linkUrl)}" />`);
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

function serializeJsonForHtml(value) {
  return JSON.stringify(value, null, 2).replaceAll('<', '\\u003c');
}

function buildSeoHead(route) {
  const metaTags = [
    `<title>${escapeHtml(route.title)}</title>`,
    `<meta name="description" content="${escapeHtml(route.description)}" />`,
    '<meta name="author" content="Goodwill Presbyterian Church, USA" />',
    `<meta name="robots" content="${escapeHtml(route.robots)}" />`,
    '<meta name="geo.region" content="US-SC" />',
    '<meta name="geo.placename" content="Mayesville" />',
    `<link rel="canonical" href="${escapeHtml(route.canonicalUrl)}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:locale" content="en_US" />',
    `<meta property="og:url" content="${escapeHtml(route.canonicalUrl)}" />`,
    '<meta property="og:site_name" content="Goodwill Presbyterian Church" />',
    `<meta property="og:title" content="${escapeHtml(route.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(route.description)}" />`,
    `<meta property="og:image" content="${escapeHtml(route.image)}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(route.imageAlt)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(route.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(route.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(route.image)}" />`,
    `<meta name="twitter:image:alt" content="${escapeHtml(route.imageAlt)}" />`,
    `<script type="application/ld+json" id="goodwill-route-schema">${serializeJsonForHtml(buildSeoJsonLd(route))}</script>`,
  ];

  return [
    '<!-- GOODWILL_SEO_START -->',
    ...metaTags,
    '<!-- GOODWILL_SEO_END -->',
  ].join('\n    ');
}

async function renderIndexHtmlWithDynamicHead(html, pathname) {
  const landingImageRecord = await getLandingImagePreloadRecordForRender();
  const landingImageHead = buildLandingImagePreloadHead(landingImageRecord);
  const route = getSeoMetadata(pathname);
  const seoHead = buildSeoHead(route);

  return html
    .replace(LANDING_IMAGE_PRELOAD_BLOCK_PATTERN, landingImageHead)
    .replace(SEO_BLOCK_PATTERN, seoHead);
}

async function renderDistIndexHtml(pathname) {
  return renderIndexHtmlWithDynamicHead(getDistIndexHtml(), pathname);
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
  const rootSiteDeveloper = uid === ROOT_SITE_DEVELOPER_UID && Boolean(ROOT_SITE_DEVELOPER_UID);
  const role = rootSiteDeveloper ? ADMIN_ROLES.SITE_DEVELOPER : normalizeAdminRole(adminData.role);
  if (role !== ADMIN_ROLES.SITE_DEVELOPER) {
    const error = new Error('This action is limited to developer administrators.');
    error.status = 403;
    throw error;
  }

  if (rootSiteDeveloper && adminData.role !== ADMIN_ROLES.SITE_DEVELOPER) {
    await adminSnapshot.ref.update({
      role: ADMIN_ROLES.SITE_DEVELOPER,
      role_label: getAdminRoleLabel(ADMIN_ROLES.SITE_DEVELOPER),
      root_site_developer: true,
      updated_date: new Date().toISOString(),
    });
  } else if (rootSiteDeveloper && adminData.root_site_developer !== true) {
    await adminSnapshot.ref.update({ root_site_developer: true, updated_date: new Date().toISOString() });
  }

  const userRecord = await getAdminAuth(app).getUser(uid);
  if (userRecord.customClaims?.admin !== true
    || userRecord.customClaims?.admin_role !== role
    || Boolean(userRecord.customClaims?.root_site_developer) !== rootSiteDeveloper) {
    await setServerManagedAdminClaims(getAdminAuth(app), userRecord, role);
  }

  return {
    uid,
    email,
    role,
    rootSiteDeveloper,
    firstName: normalizePersonName(adminData.first_name),
    lastName: normalizePersonName(adminData.last_name),
  };
}

app.get('/api/admin/access-profile', async (req, res) => {
  try {
    const admin = await assertDeveloperAdminRequest(req);
    res.json({
      uid: admin.uid,
      email: admin.email,
      role: admin.role,
      roleLabel: getAdminRoleLabel(admin.role),
      rootSiteDeveloper: admin.rootSiteDeveloper,
    });
  } catch (error) {
    res.status(error.status || 401).json({ error: error.message });
  }
});

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

function buildAdminInvitationEmail({ email, setupLink, declineLink, expiresAt, role = ADMIN_ROLES.SITE_ADMIN }) {
  const escapedEmail = escapeHtml(email);
  const escapedSetupLink = escapeHtml(setupLink);
  const escapedDeclineLink = escapeHtml(declineLink);
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
      'Use the secure one-time setup link below to create your password. Completing setup does not grant access immediately; the Site Developer must approve the account first.',
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
      'SECURITY INFORMATION',
      `- This invitation is intended only for ${email}.`,
      '- The setup link works once and expires automatically.',
      `- The link expires after ${ADMIN_INVITATION_TTL_HOURS} hours if setup is not completed.`,
      '- Do not forward, share, or post the setup link.',
      '- Goodwill Presbyterian Church will never ask you to send your password by email.',
      '- After you finish setup, the Site Developer must review and approve the account before it can access the Admin panel.',
      '',
      'Wrong recipient or unexpected invitation? Decline and report it here:',
      declineLink,
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
              <p style="margin:0 0 16px;">Use the secure one-time setup link below to create your password. Completing setup does not grant access immediately; the Site Developer must approve the account first.</p>
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
              <div style="background:#fff7ed;border:1px solid #fdba74;border-radius:10px;padding:16px;margin:18px 0 0;">
                <p style="margin:0 0 8px;font-weight:bold;color:#9a3412;">Security information</p>
                <ul style="margin:0;padding-left:20px;color:#7c2d12;font-size:14px;line-height:1.6;">
                  <li>This invitation is intended only for <strong>${escapedEmail}</strong>.</li>
                  <li>The setup link works once and expires after ${ADMIN_INVITATION_TTL_HOURS} hours.</li>
                  <li>Do not forward, share, or post the setup link.</li>
                  <li>We will never ask you to send your password by email.</li>
                  <li>The Site Developer must approve the account after setup before Admin access is granted.</li>
                </ul>
              </div>
            </div>
            <div style="border-top:1px solid #eadcc7;background:#fbf7f0;padding:18px 28px;color:#6f6258;font-size:12px;line-height:1.5;">
              <strong>Was this sent to the wrong person?</strong> Do not use or forward the setup link.
              <a href="${escapedDeclineLink}" style="color:#9a3412;font-weight:bold;">Decline and report this invitation</a> so the Site Developer can correct the address.
            </div>
          </div>
        </div>
      </div>
    `,
  };
}

function buildAdminSecurityNotificationEmail({ subject, heading, message, details = [] }) {
  const detailLines = details.filter(Boolean);
  return {
    subject,
    text: [heading, '', message, '', ...detailLines].join('\n'),
    html: `
      <div style="margin:0;padding:24px;background:#f8f3ea;font-family:Arial,Helvetica,sans-serif;color:#2f241c;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #eadcc7;border-radius:12px;overflow:hidden;">
          <div style="background:#4b342a;color:#ffffff;padding:22px 26px;">
            <h1 style="margin:0;font-size:22px;line-height:1.3;">${escapeHtml(heading)}</h1>
          </div>
          <div style="padding:24px;font-size:15px;line-height:1.6;">
            <p style="margin:0 0 16px;">${escapeHtml(message)}</p>
            ${detailLines.length > 0 ? `<ul style="margin:0;padding-left:20px;">${detailLines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>` : ''}
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
  const confirmedEmail = normalizeEmail(req.body?.confirmedEmail || req.body?.confirmed_email);
  const role = ADMIN_ROLES.SITE_ADMIN;
  const siteUrl = getPublicSiteOrigin(req);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'A valid email address is required.' });
  if (confirmedEmail !== email) return res.status(400).json({ error: 'The confirmation email must exactly match the invitation email.' });

  try {
    const db = getAdminFirestore(getFirebaseAdminApp());
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + ADMIN_INVITATION_TTL_HOURS * 60 * 60 * 1000).toISOString();
    const token = createInvitationToken();
    const tokenHash = hashInvitationToken(token);

    const existingAdmins = await db.collection('admins').where('email', '==', email).limit(1).get();
    if (!existingAdmins.empty) {
      return res.status(409).json({ error: 'That email address already has administrator access.' });
    }

    const existingInvitations = await db.collection('AdminInvitations')
      .where('email', '==', email)
      .get();
    const setupInProgress = existingInvitations.docs.find((entry) => ['processing', 'awaiting_approval'].includes(entry.data()?.status));
    if (setupInProgress) {
      return res.status(409).json({ error: 'That email already has an administrator setup in progress. Review or revoke it in Invitation Security Review.' });
    }
    const existingPending = existingInvitations.docs.filter((entry) => entry.data()?.status === 'pending');

    const invitationRef = await db.collection('AdminInvitations').add({
      email,
      role,
      token_hash: tokenHash,
      status: 'issuing',
      invited_by_uid: developerAdmin.uid,
      invited_by_email: developerAdmin.email,
      expires_at: expiresAt,
      created_date: now,
      updated_date: now,
      expires_after_hours: ADMIN_INVITATION_TTL_HOURS,
      max_uses: 1,
      use_count: 0,
      email_confirmed_by_developer: true,
    });

    const setupLink = `${siteUrl}/AdminSetup?token=${encodeURIComponent(token)}`;
    const declineLink = `${siteUrl}/AdminSetup?token=${encodeURIComponent(token)}&action=decline`;
    const invitation = buildAdminInvitationEmail({
      email,
      setupLink,
      declineLink,
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
      await invitationRef.update({
        status: 'delivery_failed',
        delivery_failed_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      });
      console.error('Admin invitation email error', emailResponse.body);
      return res.status(502).json({
        error: 'The administrator invitation was created, but the invitation email was not sent.',
        detail: emailResponse.body.slice(0, 500),
        invitationId: invitationRef.id,
      });
    }

    const activatedAt = new Date().toISOString();
    const activationBatch = db.batch();
    activationBatch.update(invitationRef, {
      status: 'pending',
      delivered_date: activatedAt,
      updated_date: activatedAt,
    });
    existingPending.forEach((entry) => activationBatch.update(entry.ref, {
      status: 'replaced',
      replaced_date: activatedAt,
      updated_date: activatedAt,
    }));
    await activationBatch.commit();

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

async function getInvitationByToken(token) {
  const tokenHash = hashInvitationToken(token);
  const db = getAdminFirestore(getFirebaseAdminApp());
  const snapshot = await db.collection('AdminInvitations')
    .where('token_hash', '==', tokenHash)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const entry = snapshot.docs[0];
  let invitation = { id: entry.id, ref: entry.ref, ...entry.data() };
  if (invitation.status === 'processing') {
    const processingStartedAt = new Date(invitation.processing_started_at || '').getTime();
    if (Number.isFinite(processingStartedAt) && Date.now() - processingStartedAt > ADMIN_INVITATION_PROCESSING_TIMEOUT_MS) {
      const now = new Date().toISOString();
      await entry.ref.update({
        status: 'pending',
        processing_claim_id: null,
        processing_started_at: null,
        processing_recovered_date: now,
        updated_date: now,
      });
      invitation = { ...invitation, status: 'pending', processing_claim_id: null, processing_started_at: null };
    }
  }
  if (invitation.status !== 'pending') return invitation;
  const expiresAt = new Date(invitation.expires_at || '');
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
    const now = new Date().toISOString();
    await entry.ref.update({
      status: 'expired',
      expired_date: now,
      updated_date: now,
    });
    return {
      ...invitation,
      status: 'expired',
      expired_date: now,
      updated_date: now,
    };
  }

  return invitation;
}

async function claimInvitationForCompletion(invitation) {
  const db = getAdminFirestore(getFirebaseAdminApp());
  const claimId = crypto.randomBytes(16).toString('hex');
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(invitation.ref);
    if (!snapshot.exists) return null;
    const current = { id: snapshot.id, ref: snapshot.ref, ...snapshot.data() };
    if (current.status !== 'pending') return current;

    const expiresAt = new Date(current.expires_at || '');
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      const now = new Date().toISOString();
      transaction.update(snapshot.ref, {
        status: 'expired',
        expired_date: now,
        updated_date: now,
      });
      return { ...current, status: 'expired', expired_date: now };
    }

    const now = new Date().toISOString();
    transaction.update(snapshot.ref, {
      status: 'processing',
      processing_claim_id: claimId,
      processing_started_at: now,
      updated_date: now,
    });
    return { ...current, status: 'processing', processing_claim_id: claimId, processing_started_at: now };
  });
}

async function releaseInvitationClaim(invitation, claimId) {
  const db = getAdminFirestore(getFirebaseAdminApp());
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(invitation.ref);
    if (!snapshot.exists) return;
    const current = snapshot.data() || {};
    if (current.status !== 'processing' || current.processing_claim_id !== claimId) return;
    const expiresAt = new Date(current.expires_at || '');
    const expired = Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date();
    const now = new Date().toISOString();
    transaction.update(snapshot.ref, {
      status: expired ? 'expired' : 'pending',
      ...(expired ? { expired_date: now } : {}),
      processing_claim_id: null,
      processing_started_at: null,
      updated_date: now,
    });
  });
}

async function sendAdminSecurityEmailBestEffort({ to, subject, heading, message, details }) {
  if (!to) return;
  const content = buildAdminSecurityNotificationEmail({ subject, heading, message, details });
  const from = process.env.RESEND_FROM_EMAIL || 'Goodwill Presbyterian Church <onboarding@resend.dev>';
  try {
    const response = await sendResendEmail({ from, to, ...content });
    if (!response.ok) console.error('Admin security notification email error', response.body);
  } catch (error) {
    console.error('Admin security notification email error', error?.message || error);
  }
}

function sendUnavailableInvitationResponse(res, invitation) {
  if (invitation?.status === 'used' || invitation?.status === 'approved') {
    return res.status(410).json({
      code: invitation.status === 'approved' ? 'invitation_approved' : 'invitation_used',
      error: 'This one-time invitation has already been completed. You can sign in with the password you created.',
      email: invitation.email || '',
      contactEmail: invitation.invited_by_email || SITE_DEVELOPER_EMAIL,
    });
  }

  if (invitation?.status === 'awaiting_approval') {
    return res.status(409).json({
      code: 'invitation_awaiting_approval',
      error: 'Your password setup is complete and this one-time link has been consumed. The Site Developer must approve your account before you can sign in.',
      email: invitation.email || '',
      contactEmail: invitation.invited_by_email || SITE_DEVELOPER_EMAIL,
    });
  }

  if (invitation?.status === 'processing') {
    return res.status(409).json({
      code: 'invitation_processing',
      error: 'This invitation setup is currently being processed. Wait a moment, then check the link again.',
      email: invitation.email || '',
      contactEmail: invitation.invited_by_email || SITE_DEVELOPER_EMAIL,
    });
  }

  if (invitation?.status === 'expired') {
    return res.status(410).json({
      code: 'invitation_expired',
      error: 'This invitation link has expired. Please ask the Site Developer to send a new invitation.',
      email: invitation.email || '',
      contactEmail: invitation.invited_by_email || SITE_DEVELOPER_EMAIL,
    });
  }

  if (invitation?.status === 'replaced') {
    return res.status(410).json({
      code: 'invitation_replaced',
      error: 'A newer administrator invitation was sent to you. Please use the setup link in the most recent invitation email.',
      email: invitation.email || '',
      contactEmail: invitation.invited_by_email || SITE_DEVELOPER_EMAIL,
    });
  }

  if (invitation?.status === 'declined' || invitation?.status === 'revoked') {
    return res.status(410).json({
      code: invitation.status === 'declined' ? 'invitation_declined' : 'invitation_revoked',
      error: invitation.status === 'declined'
        ? 'This invitation was declined and can no longer be used.'
        : 'The Site Developer revoked this invitation. Request a new invitation if you still need access.',
      email: invitation.email || '',
      contactEmail: invitation.invited_by_email || SITE_DEVELOPER_EMAIL,
    });
  }

  return res.status(404).json({
    code: 'invitation_invalid',
    error: 'This invitation link is invalid. Please ask the Site Developer to send a new invitation.',
  });
}

app.get('/api/admin/setup-invitation', async (req, res) => {
  if (!enforceAdminInvitationRateLimit(req, res, 'inspect')) return;
  try {
    const token = String(req.query.token || '').trim();
    if (!isValidInvitationToken(token)) return res.status(400).json({ code: 'invitation_invalid', error: 'This invitation link is invalid.' });
    const invitation = await getInvitationByToken(token);
    if (!invitation || invitation.status !== 'pending') {
      return sendUnavailableInvitationResponse(res, invitation);
    }
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
  if (!enforceAdminInvitationRateLimit(req, res, 'complete')) return;
  const token = String(req.body?.token || '').trim();
  const firstName = normalizePersonName(req.body?.firstName || req.body?.first_name);
  const lastName = normalizePersonName(req.body?.lastName || req.body?.last_name);
  const password = String(req.body?.password || '');

  if (!isValidInvitationToken(token)) return res.status(400).json({ code: 'invitation_invalid', error: 'This invitation link is invalid.' });
  if (!firstName) return res.status(400).json({ error: 'First name is required.' });
  if (!lastName) return res.status(400).json({ error: 'Last name is required.' });
  if (!passwordMeetsAdminRules(password)) {
    return res.status(400).json({ error: 'Password must be at least 6 characters with uppercase, lowercase, a number, and a special character.' });
  }

  let claimedInvitation;
  let invitationAuthState = null;
  try {
    const invitation = await getInvitationByToken(token);
    if (!invitation || invitation.status !== 'pending') {
      return sendUnavailableInvitationResponse(res, invitation);
    }
    claimedInvitation = await claimInvitationForCompletion(invitation);
    if (!claimedInvitation || claimedInvitation.status !== 'processing' || !claimedInvitation.processing_claim_id) {
      return sendUnavailableInvitationResponse(res, claimedInvitation);
    }

    const app = getFirebaseAdminApp();
    const auth = getAdminAuth(app);
    const db = getAdminFirestore(app);
    const email = normalizeEmail(invitation.email);
    const role = normalizeAdminRole(invitation.role, email);
    const displayName = `${firstName} ${lastName}`.trim();
    let userRecord;
    let existingUser = false;
    let existingUserWasDisabled = false;

    try {
      userRecord = await auth.getUserByEmail(email);
      existingUser = true;
      existingUserWasDisabled = Boolean(userRecord.disabled);
      userRecord = await auth.updateUser(userRecord.uid, {
        displayName,
        password,
        emailVerified: true,
        disabled: true,
      });
    } catch (error) {
      if (error?.code !== 'auth/user-not-found') throw error;
      userRecord = await auth.createUser({
        email,
        password,
        displayName,
        emailVerified: true,
        disabled: true,
      });
    }
    invitationAuthState = {
      uid: userRecord.uid,
      existingUser,
      existingUserWasDisabled,
    };

    const now = new Date().toISOString();
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(claimedInvitation.ref);
      const current = snapshot.data() || {};
      if (current.status !== 'processing' || current.processing_claim_id !== claimedInvitation.processing_claim_id) {
        const error = new Error('The invitation is no longer available for completion.');
        error.status = 409;
        throw error;
      }
      transaction.update(claimedInvitation.ref, {
        status: 'awaiting_approval',
        setup_completed_date: now,
        completed_uid: userRecord.uid,
        proposed_first_name: firstName,
        proposed_last_name: lastName,
        existing_user: existingUser,
        existing_user_was_disabled: existingUserWasDisabled,
        processing_claim_id: null,
        processing_started_at: null,
        use_count: 1,
        updated_date: now,
      });
    });

    await sendAdminSecurityEmailBestEffort({
      to: invitation.invited_by_email || SITE_DEVELOPER_EMAIL,
      subject: `Admin approval required: ${email}`,
      heading: 'Administrator setup requires your approval',
      message: 'The invitation recipient completed password setup, but they do not have Admin access yet. Review the email address in the Developer Panel and approve or reject the request.',
      details: [`Email: ${email}`, `Name: ${displayName}`, `Invitation ID: ${invitation.id}`],
    });

    res.json({
      success: true,
      requiresApproval: true,
      email,
      role,
      roleLabel: getAdminRoleLabel(role),
      uid: userRecord.uid,
      existingUser,
    });
  } catch (error) {
    if (invitationAuthState?.uid) {
      const auth = getAdminAuth(getFirebaseAdminApp());
      if (invitationAuthState.existingUser) {
        await auth.updateUser(invitationAuthState.uid, {
          disabled: invitationAuthState.existingUserWasDisabled,
        }).catch((rollbackError) => {
          console.error('Restore existing invitation account state error', rollbackError?.message || rollbackError);
        });
      } else {
        await auth.deleteUser(invitationAuthState.uid).catch((rollbackError) => {
          if (rollbackError?.code !== 'auth/user-not-found') {
            console.error('Delete incomplete invitation account error', rollbackError?.message || rollbackError);
          }
        });
      }
    }
    if (claimedInvitation?.processing_claim_id) {
      await releaseInvitationClaim(claimedInvitation, claimedInvitation.processing_claim_id).catch((releaseError) => {
        console.error('Release admin invitation claim error', releaseError?.message || releaseError);
      });
    }
    console.error('Complete admin invitation error', error?.message || error);
    res.status(error.status || 500).json({ error: error?.message || 'Unable to complete the administrator invitation.' });
  }
});

app.post('/api/admin/decline-invitation', async (req, res) => {
  if (!enforceAdminInvitationRateLimit(req, res, 'decline')) return;
  const token = String(req.body?.token || '').trim();
  if (!isValidInvitationToken(token)) return res.status(400).json({ code: 'invitation_invalid', error: 'This invitation link is invalid.' });

  try {
    const invitation = await getInvitationByToken(token);
    if (!invitation || !['pending', 'awaiting_approval'].includes(invitation.status)) {
      return sendUnavailableInvitationResponse(res, invitation);
    }

    const db = getAdminFirestore(getFirebaseAdminApp());
    const now = new Date().toISOString();
    const declinedInvitation = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(invitation.ref);
      const current = snapshot.data() || {};
      if (!['pending', 'awaiting_approval'].includes(current.status)) return null;
      transaction.update(invitation.ref, {
        status: 'declined',
        declined_date: now,
        updated_date: now,
      });
      return current;
    });
    if (!declinedInvitation) return sendUnavailableInvitationResponse(res, await getInvitationByToken(token));

    if (declinedInvitation.status === 'awaiting_approval') {
      await removeOrRestorePendingAuthAccount(getFirebaseAdminApp(), declinedInvitation);
    }

    await sendAdminSecurityEmailBestEffort({
      to: invitation.invited_by_email || SITE_DEVELOPER_EMAIL,
      subject: `Security alert: admin invitation declined by ${invitation.email}`,
      heading: 'Administrator invitation declined',
      message: 'The recipient reported that the invitation was unexpected or sent to the wrong address. The link has been disabled and cannot be used.',
      details: [`Email: ${invitation.email}`, `Invitation ID: ${invitation.id}`],
    });

    res.json({ success: true, code: 'invitation_declined' });
  } catch (error) {
    console.error('Decline admin invitation error', error?.message || error);
    res.status(error.status || 500).json({ error: error?.message || 'Unable to decline this invitation.' });
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
        root_site_developer: entry.id === ROOT_SITE_DEVELOPER_UID,
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
        root_site_developer: developerAdmin.uid === ROOT_SITE_DEVELOPER_UID,
      });
    }

    rows.sort((a, b) => a.email.localeCompare(b.email));

    const invitationSnapshot = await db.collection('AdminInvitations').get();
    const invitationEntries = await Promise.all(invitationSnapshot.docs.map(async (entry) => {
      const invitation = { id: entry.id, ...entry.data() };
      const expiresAt = new Date(invitation.expires_at || '');
      if (invitation.status === 'pending' && (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date())) {
        const now = new Date().toISOString();
        await entry.ref.update({ status: 'expired', expired_date: now, updated_date: now });
        return { ...invitation, status: 'expired', expired_date: now };
      }
      return invitation;
    }));
    const invitations = invitationEntries
      .filter((invitation) => ['pending', 'processing', 'awaiting_approval'].includes(invitation.status))
      .map((invitation) => ({
        id: invitation.id,
        email: normalizeEmail(invitation.email),
        role: normalizeAdminRole(invitation.role, invitation.email),
        role_label: getAdminRoleLabel(normalizeAdminRole(invitation.role, invitation.email)),
        status: invitation.status,
        created_date: invitation.created_date || '',
        expires_at: invitation.expires_at || '',
        setup_completed_date: invitation.setup_completed_date || '',
        first_name: normalizePersonName(invitation.proposed_first_name),
        last_name: normalizePersonName(invitation.proposed_last_name),
        invited_by_email: normalizeEmail(invitation.invited_by_email),
      }))
      .sort((a, b) => String(b.created_date).localeCompare(String(a.created_date)));

    res.json({ admins: rows, invitations });
  } catch (error) {
    console.error('List site admins error', error?.message || error);
    res.status(error.status || 500).json({ error: error?.message || 'Unable to load site administrators.' });
  }
});

app.post('/api/admin/invitations/:invitationId/approve', async (req, res) => {
  let developerAdmin;
  try {
    developerAdmin = await assertDeveloperAdminRequest(req);
    assertRootSiteDeveloper(developerAdmin);
  } catch (error) {
    return res.status(error.status || 401).json({ error: error.message });
  }

  const invitationId = String(req.params.invitationId || '').trim();
  if (!invitationId) return res.status(400).json({ error: 'Invitation ID is required.' });

  try {
    const app = getFirebaseAdminApp();
    const db = getAdminFirestore(app);
    const invitationRef = db.collection('AdminInvitations').doc(invitationId);
    const snapshot = await invitationRef.get();
    if (!snapshot.exists) return res.status(404).json({ error: 'Invitation not found.' });
    const invitation = snapshot.data() || {};
    if (invitation.status !== 'awaiting_approval') {
      return res.status(409).json({ error: 'Only a completed invitation awaiting approval can be approved.' });
    }

    const uid = String(invitation.completed_uid || '').trim();
    const email = normalizeEmail(invitation.email);
    if (!uid || !email) return res.status(409).json({ error: 'The completed invitation is missing its account details.' });

    const auth = getAdminAuth(app);
    const userRecord = await auth.getUser(uid);
    if (normalizeEmail(userRecord.email) !== email) {
      return res.status(409).json({ error: 'The Firebase account email does not match the invited email.' });
    }

    const now = new Date().toISOString();
    const role = normalizeAdminRole(invitation.role, email);
    const adminRef = db.collection('admins').doc(uid);
    await db.runTransaction(async (transaction) => {
      const currentSnapshot = await transaction.get(invitationRef);
      const currentAdminSnapshot = await transaction.get(adminRef);
      const current = currentSnapshot.data() || {};
      if (current.status !== 'awaiting_approval' || String(current.completed_uid || '') !== uid) {
        const conflict = new Error('This invitation is no longer awaiting approval. Refresh the security review before trying again.');
        conflict.status = 409;
        throw conflict;
      }
      if (currentAdminSnapshot.exists) {
        const conflict = new Error('This Firebase account already has an administrator record and cannot be activated through another invitation.');
        conflict.status = 409;
        throw conflict;
      }
      transaction.set(adminRef, {
        first_name: normalizePersonName(current.proposed_first_name),
        last_name: normalizePersonName(current.proposed_last_name),
        email,
        role,
        role_label: getAdminRoleLabel(role),
        photo_url: '',
        has_saved_name: true,
        invited_by_uid: current.invited_by_uid || '',
        invited_by_email: current.invited_by_email || '',
        invitation_id: invitationId,
        access_status: 'active',
        root_site_developer: false,
        approved_by_uid: developerAdmin.uid,
        approved_by_email: developerAdmin.email,
        approved_date: now,
        created_date: now,
        updated_date: now,
      }, { merge: true });
      transaction.update(invitationRef, {
        status: 'approved',
        approved_date: now,
        approved_by_uid: developerAdmin.uid,
        approved_by_email: developerAdmin.email,
        updated_date: now,
      });
    });

    try {
      const currentUserRecord = await auth.getUser(uid);
      await setServerManagedAdminClaims(auth, currentUserRecord, role);
      await auth.updateUser(uid, { disabled: false });
      await auth.revokeRefreshTokens(uid);
    } catch (activationError) {
      const failedAt = new Date().toISOString();
      await auth.updateUser(uid, { disabled: true }).catch(() => {});
      const currentUserRecord = await auth.getUser(uid).catch(() => null);
      if (currentUserRecord) await clearServerManagedAdminClaims(auth, currentUserRecord).catch(() => {});
      await db.runTransaction(async (transaction) => {
        const currentInvitationSnapshot = await transaction.get(invitationRef);
        const current = currentInvitationSnapshot.data() || {};
        if (current.status !== 'approved' || current.approved_by_uid !== developerAdmin.uid) return;
        transaction.delete(adminRef);
        transaction.update(invitationRef, {
          status: 'awaiting_approval',
          activation_failed_date: failedAt,
          activation_error: String(activationError?.message || 'Unable to activate Firebase account').slice(0, 300),
          updated_date: failedAt,
        });
      });
      throw activationError;
    }

    await sendAdminSecurityEmailBestEffort({
      to: email,
      subject: 'Your Goodwill website administrator access is approved',
      heading: 'Administrator access approved',
      message: 'The Site Developer reviewed and approved your account. You can now sign in to the Goodwill Presbyterian Church Admin panel with the password you created.',
      details: [`Email: ${email}`, `Role: ${getAdminRoleLabel(role)}`, `Sign in: https://${CANONICAL_HOST}/Admin`],
    });

    res.json({ success: true, invitationId, uid, email, role, roleLabel: getAdminRoleLabel(role) });
  } catch (error) {
    console.error('Approve admin invitation error', error?.message || error);
    res.status(error.status || 500).json({ error: error?.message || 'Unable to approve this administrator request.' });
  }
});

app.delete('/api/admin/invitations/:invitationId', async (req, res) => {
  let developerAdmin;
  try {
    developerAdmin = await assertDeveloperAdminRequest(req);
    assertRootSiteDeveloper(developerAdmin);
  } catch (error) {
    return res.status(error.status || 401).json({ error: error.message });
  }

  const invitationId = String(req.params.invitationId || '').trim();
  if (!invitationId) return res.status(400).json({ error: 'Invitation ID is required.' });

  try {
    const app = getFirebaseAdminApp();
    const db = getAdminFirestore(app);
    const invitationRef = db.collection('AdminInvitations').doc(invitationId);
    const snapshot = await invitationRef.get();
    if (!snapshot.exists) return res.status(404).json({ error: 'Invitation not found.' });
    const invitation = snapshot.data() || {};
    if (!['pending', 'processing', 'awaiting_approval'].includes(invitation.status)) {
      return res.status(409).json({ error: 'This invitation is no longer active and cannot be revoked.' });
    }

    const now = new Date().toISOString();
    const revokedInvitation = await db.runTransaction(async (transaction) => {
      const currentSnapshot = await transaction.get(invitationRef);
      const current = currentSnapshot.data() || {};
      if (!['pending', 'processing', 'awaiting_approval'].includes(current.status)) {
        const conflict = new Error('This invitation is no longer active. Refresh the security review before trying again.');
        conflict.status = 409;
        throw conflict;
      }
      transaction.update(invitationRef, {
        status: 'revoked',
        revoked_date: now,
        revoked_by_uid: developerAdmin.uid,
        revoked_by_email: developerAdmin.email,
        updated_date: now,
      });
      return current;
    });

    if (revokedInvitation.status === 'awaiting_approval') {
      await removeOrRestorePendingAuthAccount(app, revokedInvitation);
    }

    await sendAdminSecurityEmailBestEffort({
      to: normalizeEmail(revokedInvitation.email),
      subject: 'Your Goodwill website administrator invitation was revoked',
      heading: 'Administrator invitation revoked',
      message: 'The Site Developer revoked this invitation. Its setup link no longer works and no administrator access was granted.',
      details: ['If you still need access, contact the Site Developer and request a new invitation.'],
    });

    res.json({ success: true, invitationId, email: normalizeEmail(revokedInvitation.email) });
  } catch (error) {
    console.error('Revoke admin invitation error', error?.message || error);
    res.status(error.status || 500).json({ error: error?.message || 'Unable to revoke this invitation.' });
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
  if (uid === ROOT_SITE_DEVELOPER_UID) {
    return res.status(400).json({ error: 'The permanent root Site Developer account cannot be removed.' });
  }

  try {
    const db = getAdminFirestore(getFirebaseAdminApp());
    const adminRef = db.collection('admins').doc(uid);
    const snapshot = await adminRef.get();
    if (!snapshot.exists) {
      return res.status(404).json({ error: 'No Firestore admin record was found for this user.' });
    }

    const adminData = snapshot.data() || {};
    await adminRef.delete();
    const auth = getAdminAuth(getFirebaseAdminApp());
    const userRecord = await auth.getUser(uid).catch((error) => {
      if (error?.code === 'auth/user-not-found') return null;
      throw error;
    });
    if (userRecord) {
      await clearServerManagedAdminClaims(auth, userRecord);
      await auth.revokeRefreshTokens(uid);
    }
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
    if (uid === ROOT_SITE_DEVELOPER_UID && role !== ADMIN_ROLES.SITE_DEVELOPER) {
      return res.status(400).json({ error: 'The permanent root Site Developer cannot be demoted.' });
    }

    await adminRef.update({
      role,
      role_label: getAdminRoleLabel(role),
      root_site_developer: uid === ROOT_SITE_DEVELOPER_UID,
      updated_date: new Date().toISOString(),
    });

    const auth = getAdminAuth(getFirebaseAdminApp());
    const userRecord = await auth.getUser(uid);
    await setServerManagedAdminClaims(auth, userRecord, role);
    await auth.revokeRefreshTokens(uid);

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

function getRequestSearch(req) {
  const queryIndex = req.originalUrl.indexOf('?');
  return queryIndex === -1 ? '' : req.originalUrl.slice(queryIndex);
}

function setRobotsHeaderForRoute(res, route) {
  if (route.robots !== 'index, follow') {
    res.set('X-Robots-Tag', route.robots);
  }
}

function shouldReturnPlainNotFound(req, route) {
  return route.statusCode === 404 && Boolean(path.extname(req.path));
}

function prepareSeoPageResponse(req, res) {
  if (shouldRedirectToCanonicalPath(req.path)) {
    res.redirect(301, getCanonicalRedirectPath(req.path, getRequestSearch(req)));
    return null;
  }

  const route = getSeoMetadata(req.path);
  setRobotsHeaderForRoute(res, route);
  return route;
}

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

    const route = prepareSeoPageResponse(req, res);
    if (!route) return;
    if (shouldReturnPlainNotFound(req, route)) {
      return res.status(404).type('text/plain').send('Not found');
    }

    try {
      const template = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
      const transformedHtml = await vite.transformIndexHtml(req.originalUrl, template);
      const html = await renderIndexHtmlWithDynamicHead(transformedHtml, req.path);
      res.status(route.statusCode || 200).set({ 'Content-Type': 'text/html' }).end(html);
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

    const route = prepareSeoPageResponse(req, res);
    if (!route) return;
    if (shouldReturnPlainNotFound(req, route)) {
      return res.status(404).type('text/plain').send('Not found');
    }

    try {
      res.status(route.statusCode || 200).type('html').send(await renderDistIndexHtml(req.path));
    } catch (error) {
      next(error);
    }
  });
}

app.listen(port, host, () => console.log(`Node site listening at http://${host}:${port}`));
