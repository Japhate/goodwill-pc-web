import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const CANONICAL_HOST = 'www.goodwillpres.org';
const LEGACY_HOSTS = new Set([
  'goodwillpresch1867.com',
  'www.goodwillpresch1867.com',
  'goodwillpresch1867.org',
  'www.goodwillpresch1867.org',
]);

app.use((req, res, next) => {
  const host = req.hostname?.toLowerCase();

  if (LEGACY_HOSTS.has(host)) {
    return res.redirect(301, `https://${CANONICAL_HOST}${req.originalUrl}`);
  }

  next();
});

app.use(cors());
app.use(express.json());

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

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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
    const existingIndex = items.findIndex(item => item.email_key === emailKey || normalizeEmail(item.email) === email);

    if (existingIndex !== -1 && items[existingIndex].status !== 'unsubscribed') {
      return res.status(409).json({ error: 'already-subscribed' });
    }

    const item = {
      id: emailKey,
      ...data,
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
    const tokenMatches = !subscription.unsubscribe_token || !token || subscription.unsubscribe_token === token;

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
  const { email, emailKey, unsubscribeToken, host, protocol } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Goodwill Presbyterian Church <onboarding@resend.dev>';

  const normalizedEmail = normalizeEmail(email);
  const siteHost = host || 'www.goodwillpres.org';
  const siteProtocol = protocol || 'https';
  const unsubscribeParams = new URLSearchParams({
    email: normalizedEmail,
    key: emailKey || encodeURIComponent(normalizedEmail),
  });

  if (unsubscribeToken) {
    unsubscribeParams.set('token', unsubscribeToken);
  }

  const unsubscribeUrl = `${siteProtocol}://${siteHost}/Unsubscribe?${unsubscribeParams.toString()}`;
  const escapedEmail = escapeHtml(normalizedEmail);
  const escapedUnsubscribeUrl = escapeHtml(unsubscribeUrl);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        to: normalizedEmail,
        subject: 'Welcome to Goodwill Presbyterian Church',
        html: `
          <div style="margin:0;padding:0;background:#f8f3ea;font-family:Arial,Helvetica,sans-serif;color:#2f241c;">
            <div style="max-width:640px;margin:0 auto;padding:32px 18px;">
              <div style="background:#ffffff;border:1px solid #eadcc7;border-radius:12px;overflow:hidden;">
                <div style="background:#4b342a;color:#ffffff;padding:24px 28px;">
                  <h1 style="margin:0;font-size:24px;line-height:1.25;">Welcome to Goodwill Presbyterian Church</h1>
                </div>
                <div style="padding:28px;">
                  <p style="font-size:16px;line-height:1.6;margin:0 0 18px;">Grace and peace to you.</p>
                  <p style="font-size:16px;line-height:1.6;margin:0 0 18px;">
                    Thank you for subscribing to updates from Goodwill Presbyterian Church. We are grateful to stay connected with you as we share worship opportunities, church news, ministry updates, and moments of encouragement for the journey of faith.
                  </p>
                  <p style="font-size:16px;line-height:1.6;margin:0 0 18px;">
                    Our prayer is that every message you receive will help you feel welcomed, informed, and reminded that you are part of a community seeking to love God, serve others, and walk together in hope.
                  </p>
                  <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">
                    May the Lord bless you and keep you, and may God's peace be with you today.
                  </p>
                  <p style="font-size:16px;line-height:1.6;margin:0;">
                    With gratitude,<br />
                    <strong>Goodwill Presbyterian Church</strong>
                  </p>
                </div>
                <div style="border-top:1px solid #eadcc7;background:#fbf7f0;padding:18px 28px;color:#6f6258;font-size:12px;line-height:1.5;">
                  <p style="margin:0 0 8px;">This message was sent to ${escapedEmail} because you subscribed to updates from Goodwill Presbyterian Church.</p>
                  <p style="margin:0;">
                    If you no longer wish to receive updates, you may
                    <a href="${escapedUnsubscribeUrl}" style="color:#8a5a16;text-decoration:underline;">unsubscribe here</a>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        `,
        text: `Grace and peace to you.\n\nThank you for subscribing to updates from Goodwill Presbyterian Church. We are grateful to stay connected with you as we share worship opportunities, church news, ministry updates, and moments of encouragement for the journey of faith.\n\nOur prayer is that every message you receive will help you feel welcomed, informed, and reminded that you are part of a community seeking to love God, serve others, and walk together in hope.\n\nMay the Lord bless you and keep you, and may God's peace be with you today.\n\nWith gratitude,\nGoodwill Presbyterian Church\n\nThis message was sent to ${normalizedEmail}. If you no longer wish to receive updates, unsubscribe here: ${unsubscribeUrl}`,
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      console.error('Resend error', err);
      return res.status(500).json({ error: 'Failed to send email' });
    }
    const data = await response.json();
    res.json({ success: true, id: data.id });
  } catch (e) {
    console.error('Send welcome error', e?.message || e);
    res.status(500).json({ error: e?.message || 'Error' });
  }
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
