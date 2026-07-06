# goodwill-pc-web

React and Vite frontend with Firebase-backed content management, deployed on Render at `www.goodwillpresch1867.com`. IONOS manages the domain DNS records that point to Render.

## Local Preview

Run `npm run dev`, then open `http://localhost:3100`.

The local Node server and Vite dev middleware share port `3100`, including local API requests.
The dev server binds to `localhost` by default. In Codespaces, that means the app runs on the Codespace machine; open it through the forwarded port URL, or use `http://localhost:3100` only when your editor has forwarded port `3100` to your computer.

## Firebase Content Management

When Firebase environment values are configured, the website uses:

- Cloud Firestore for hero slides, worship bulletins, announcements, sermons, banners, and other entity records.
- Cloud Storage for hero images, bulletin PDFs/thumbnails, and announcement images.
- Firebase Authentication for the `/Admin` sign-in screen.

Without Firebase environment values, local development continues to use the local JSON/browser storage data path.

### Setup

1. Create a Firebase project and web app in the Firebase console.
2. Enable Cloud Firestore, Cloud Storage, and Authentication with the Email/Password sign-in provider.
3. Copy `.env.example` to `.env.local` and fill in the web app configuration values.
4. Install the Firebase CLI if needed, sign in, select the Firebase project, and deploy the included access rules:

```bash
firebase use --add
firebase deploy --only firestore:rules,storage
```

5. In Firebase Authentication, create the administrator email/password user.
6. Copy that user's UID and create a Firestore document at `admins/{uid}`. The document may contain a name or email field; its existence grants admin access under the included rules.
7. Open `/Admin`, sign in, and add hero slides and bulletins. New file uploads will be organized in Cloud Storage:

```text
homepage-hero-images/
bulletins-pdfs/
bulletin-thumbnails/
announcement-images/
announcement-files/
```

The existing local image files, JSON records, and previously uploaded Firebase files are not automatically moved. Existing URLs remain usable; future admin uploads use the organized folders above.

### Security Notes

The included rules allow anyone to view published site content, while only UIDs listed in `admins` can edit it or upload images and PDFs. Prayer requests and newsletter signups accept public submissions but are not publicly readable.

The Express server applies security response headers on all routes, including Content-Security-Policy, HSTS outside local development, Referrer-Policy, X-Content-Type-Options, X-Frame-Options, cross-origin isolation headers, and Permissions-Policy. This follows the [OWASP HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html) guidance for reducing risks such as XSS, clickjacking, MIME sniffing, and information leakage.

The current CSP still allows inline styles for compatibility with the React, Tailwind, and shadcn/Radix UI stack. A future hardening pass should test whether inline styles can be replaced with nonce- or hash-based style allowances without breaking generated UI styles.

### Reliability Monitoring

The server exposes `GET /healthz` for Render health checks and external uptime tools such as Better Stack or UptimeRobot. Configure monitors to check `https://www.goodwillpresch1867.com/healthz`, alert the site owner/developer, and use tighter alert windows around Sunday worship and special events.

The frontend reports sanitized browser errors to `POST /api/client-errors`, and Core Web Vitals reports go to `POST /api/web-vitals`. Both endpoints rate-limit submissions and log technical troubleshooting data without asking for prayer text, form field values, giving details, or passwords. Set `VITE_ENABLE_CLIENT_ERROR_REPORTING=false` or `VITE_ENABLE_WEB_VITALS=false` to disable either browser-side reporter in a specific environment.

Future CI hardening should add Lighthouse and accessibility checks against a preview server after the current lint, typecheck, and build workflow is stable.

### Production Deployment

Use the existing Render service connected to this GitHub repository. Configure:

```text
Branch: main
Build command: npm run build
Start command for Web Service: npm start
Publish directory for Static Site: dist
```

Add these environment variables to the Render service:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
RESEND_API_KEY
RESEND_FROM_EMAIL
YOUTUBE_API_KEY
YOUTUBE_CHANNEL_ID
VITE_GA_MEASUREMENT_ID
VITE_ENABLE_ANALYTICS
VITE_ENABLE_WEB_VITALS
VITE_ENABLE_CLIENT_ERROR_REPORTING
```

`RESEND_FROM_EMAIL` should be a verified sender in Resend, for example `Goodwill Presbyterian Church <news@goodwillpresch1867.com>`.
`YOUTUBE_API_KEY` and `YOUTUBE_CHANNEL_ID` power the homepage live banner. If they are not configured, the site keeps the normal banner behavior and skips the YouTube live check.

`VITE_GA_MEASUREMENT_ID` enables Google Analytics 4 pageview tracking. Analytics does not send form field values, prayer request text, email addresses, or giving details. Logged-in administrator sessions are skipped so routine admin work is not counted. You can also opt a browser out by running `localStorage.setItem('goodwill:analytics-opt-out', 'true')` in that browser's console, and opt back in with `localStorage.setItem('goodwill:analytics-opt-out', 'false')`.

The site reports real-user Core Web Vitals to `/api/web-vitals`. The server validates and rate-limits those reports, then writes privacy-conscious `web-vital` log entries with the metric name, value, rating, page path, viewport, connection class, and attribution hints. Set `VITE_ENABLE_WEB_VITALS=false` if you need to disable browser-side reporting for a specific environment.

The site also includes a public `/Privacy` page describing how prayer requests, newsletter subscriptions, admin authentication, analytics, reliability reports, and service providers are handled.

After those values are configured, use **Manual Deploy > Deploy latest commit** in Render and test `/Admin` on `https://www.goodwillpresch1867.com/Admin`. Keep the IONOS DNS records for `goodwillpresch1867.com` and `www.goodwillpresch1867.com` pointing to Render.

No alternate `.org` domains are configured for production.

The current Node/Express server can remain on a Render Web Service while Firebase handles site content and admin uploads.
