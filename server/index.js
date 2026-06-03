import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { initializeApp as initializeClientApp, getApps as getClientApps } from 'firebase/app';
import { doc, getDoc, getFirestore as getClientFirestore } from 'firebase/firestore';
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
const LEGACY_HOSTS = new Set([]);

app.use((req, res, next) => {
  const host = req.hostname?.toLowerCase();

  if (LEGACY_HOSTS.has(host)) {
    return res.redirect(301, `https://${CANONICAL_HOST}${req.originalUrl}`);
  }

  next();
});

app.use(cors());
app.use(express.json({ limit: '15mb' }));

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
  if (email !== SITE_DEVELOPER_EMAIL) {
    const error = new Error('This action is limited to developer administrators.');
    error.status = 403;
    throw error;
  }

  return {
    uid,
    email,
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
      'Goodwill Presbyterian Church Website',
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

function buildAdminInvitationEmail({ email, setupLink, expiresAt }) {
  const escapedEmail = escapeHtml(email);
  const escapedSetupLink = escapeHtml(setupLink);
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
      'You have been invited to act as site administrator for the Goodwill Presbyterian Church website by the site developer, Mr. Neba.',
      'Please use the secure one-time setup link below to create your password.',
      '',
      `Email: ${email}`,
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
              <p style="margin:0 0 8px;color:#f4d78d;font-size:12px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;">Site Administrator Access</p>
              <h1 style="margin:0;font-size:24px;line-height:1.3;">Welcome to the Goodwill Presbyterian Church admin team</h1>
            </div>
            <div style="padding:28px;font-size:16px;line-height:1.6;">
              <p style="margin:0 0 16px;">Hello Brethren,</p>
              <p style="margin:0 0 16px;">You have been invited to act as site administrator for the Goodwill Presbyterian Church website by the site developer, Mr. Neba.</p>
              <p style="margin:0 0 16px;">Please use the secure one-time setup link below to create your password.</p>
              <div style="background:#fbf7f0;border:1px solid #eadcc7;border-radius:10px;padding:16px;margin:18px 0;">
                <p style="margin:0 0 8px;"><strong>Email:</strong> ${escapedEmail}</p>
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

app.post('/api/entities/:entity', (req, res) => {
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

app.delete('/api/entities/:entity/:id', (req, res) => {
  const { entity, id } = req.params;
  let items = readEntity(entity);
  const exists = items.some(i => String(i.id) === String(id));
  if (!exists) return res.status(404).json({ error: 'Not found' });
  items = items.filter(i => String(i.id) !== String(id));
  writeEntity(entity, items);
  res.json({ success: true });
});

app.put('/api/entities/:entity/:id', (req, res) => {
  const { entity, id } = req.params;
  const items = readEntity(entity);
  const index = items.findIndex(i => String(i.id) === String(id));
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  items[index] = { ...items[index], ...req.body, id: items[index].id };
  writeEntity(entity, items);
  res.json(items[index]);
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
  const { email, emailKey, firstName, lastName, unsubscribeToken, host, protocol } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Goodwill Presbyterian Church <onboarding@resend.dev>';

  const normalizedEmail = normalizeEmail(email);
  const siteHost = host || CANONICAL_HOST;
  const siteProtocol = protocol || 'https';
  const unsubscribeParams = new URLSearchParams({
    email: normalizedEmail,
    key: emailKey || encodeURIComponent(normalizedEmail),
  });

  if (unsubscribeToken) {
    unsubscribeParams.set('token', unsubscribeToken);
  }

  const unsubscribeUrl = `${siteProtocol}://${siteHost}/Unsubscribe?${unsubscribeParams.toString()}`;

  try {
    const emailContent = await buildNewsletterEmail({
      templateId: NEWSLETTER_TEMPLATE_IDS.welcome,
      email: normalizedEmail,
      firstName: String(firstName || '').trim().replace(/\s+/g, ' '),
      lastName: String(lastName || '').trim().replace(/\s+/g, ' '),
      unsubscribeUrl,
    });
    const response = await sendResendEmail({
      from: fromEmail,
      to: normalizedEmail,
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
  const { email, firstName, lastName } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Goodwill Presbyterian Church <onboarding@resend.dev>';
  const normalizedEmail = normalizeEmail(email);

  try {
    const emailContent = await buildNewsletterEmail({
      templateId: NEWSLETTER_TEMPLATE_IDS.duplicate,
      email: normalizedEmail,
      firstName: String(firstName || '').trim().replace(/\s+/g, ' '),
      lastName: String(lastName || '').trim().replace(/\s+/g, ' '),
    });
    const response = await sendResendEmail({
      from: fromEmail,
      to: normalizedEmail,
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
  } catch (error) {
    console.error('Create site admin authorization error', error?.message || error);
    return res.status(error.status || 401).json({ error: error.message });
  }

  if (developerAdmin.email !== SITE_DEVELOPER_EMAIL) {
    return res.status(403).json({ error: 'Only the main site developer can create site administrator accounts.' });
  }

  const email = normalizeEmail(req.body?.email);
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
    await assertDeveloperAdminRequest(req);
    const db = getAdminFirestore(getFirebaseAdminApp());
    const adminSnapshot = await db.collection('admins').get();
    const rows = adminSnapshot.docs
      .map((entry) => {
        const data = entry.data() || {};
        return {
        uid: entry.id,
        email: normalizeEmail(data.email),
        first_name: normalizePersonName(data.first_name),
        last_name: normalizePersonName(data.last_name),
        has_saved_name: Boolean(data.first_name && data.last_name),
        created_date: data.created_date || '',
        updated_date: data.updated_date || '',
        };
      })
      .sort((a, b) => a.email.localeCompare(b.email));

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
  } catch (error) {
    return res.status(error.status || 401).json({ error: error.message });
  }

  const uid = String(req.params.uid || '').trim();
  if (!uid) return res.status(400).json({ error: 'Administrator UID is required.' });
  if (uid === developerAdmin.uid) {
    return res.status(400).json({ error: 'The site developer account cannot delete itself.' });
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

const useLocalViteServer = process.env.LOCAL_VITE_DEV === 'true';

if (useLocalViteServer) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    appType: 'custom',
    server: { middlewareMode: true },
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
  app.use(express.static(DIST_DIR));

  app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API route not found' });
    }

    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Node site listening on port ${port}`));
