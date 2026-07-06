import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'node:path'

function deferRenderBlockingStylesheets() {
  return {
    name: 'defer-render-blocking-stylesheets',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(
        /<link rel="stylesheet"([^>]*?)href="([^"]+)"([^>]*)>/g,
        (tag, beforeHref, href, afterHref) => {
          const attributes = `${beforeHref}${afterHref}`.trim();
          const copiedAttributes = attributes ? ` ${attributes}` : '';

          return `<link rel="preload" as="style"${copiedAttributes} href="${href}" data-deferred-stylesheet>\n    <noscript>${tag}</noscript>`;
        },
      );
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
  plugins: [
    react(),
    deferRenderBlockingStylesheets(),
  ]
});
