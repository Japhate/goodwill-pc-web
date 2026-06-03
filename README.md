# Goodwill Presbyterian Church Website

React and Vite frontend with Firebase-backed content management, deployed on Render at `www.goodwillpresch1867.com`. IONOS manages the domain DNS records that point to Render.

## Local Preview

Run `npm run dev`, then open `http://localhost:3001`.

The local Node server and Vite live-update preview share port `3001`, including local API requests.

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
```

The existing local image files, JSON records, and previously uploaded Firebase files are not automatically moved. Existing URLs remain usable; future admin uploads use the organized folders above.

### Security Notes

The included rules allow anyone to view published site content, while only UIDs listed in `admins` can edit it or upload images and PDFs. Prayer requests and newsletter signups accept public submissions but are not publicly readable.

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
```

`RESEND_FROM_EMAIL` should be a verified sender in Resend, for example `Goodwill Presbyterian Church <news@goodwillpresch1867.com>`.

After those values are configured, use **Manual Deploy > Deploy latest commit** in Render and test `/Admin` on `https://www.goodwillpresch1867.com/Admin`. Keep the IONOS DNS records for `goodwillpresch1867.com` and `www.goodwillpresch1867.com` pointing to Render.

No alternate `.org` domains are configured for production.

The current Node/Express server can remain on a Render Web Service while Firebase handles site content and admin uploads.
