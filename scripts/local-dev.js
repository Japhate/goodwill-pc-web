import crypto from 'node:crypto';

process.env.LOCAL_VITE_DEV = 'true';
process.env.PORT = process.env.PORT || '3100';
process.env.HOST = process.env.HOST || 'localhost';

if (!globalThis.crypto?.getRandomValues && crypto.webcrypto) {
  globalThis.crypto = crypto.webcrypto;
}

if (!crypto.getRandomValues && crypto.webcrypto?.getRandomValues) {
  crypto.getRandomValues = crypto.webcrypto.getRandomValues.bind(crypto.webcrypto);
}

await import('../server/index.js');
