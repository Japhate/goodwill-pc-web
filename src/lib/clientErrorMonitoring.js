const CLIENT_ERROR_ENDPOINT = '/api/client-errors';
const CLIENT_ERROR_REPORTING_ENABLED = String(import.meta.env.VITE_ENABLE_CLIENT_ERROR_REPORTING || 'true') !== 'false';

let initialized = false;

function getErrorMessage(error) {
  if (error instanceof Error) return error.message;
  return String(error || 'Unknown client error');
}

function getErrorStack(error) {
  return error instanceof Error ? error.stack : '';
}

function getSafePath() {
  return typeof window === 'undefined' ? '/' : window.location.pathname || '/';
}

function sendReport(report) {
  if (!CLIENT_ERROR_REPORTING_ENABLED) return;
  if (typeof window === 'undefined' || typeof fetch !== 'function') return;

  fetch(CLIENT_ERROR_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(report),
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
  }).catch(() => {
    // Error monitoring should never interrupt the visitor experience.
  });
}

export function reportClientError(error, context = {}) {
  sendReport({
    type: context.type || 'client-error',
    source: context.source || 'browser',
    message: getErrorMessage(error),
    stack: context.stack || getErrorStack(error),
    componentStack: context.componentStack || '',
    path: getSafePath(),
    userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent || '',
    filename: context.filename || '',
    lineNumber: context.lineNumber || null,
    columnNumber: context.columnNumber || null,
    reportedAt: new Date().toISOString(),
  });
}

export function initClientErrorMonitoring() {
  if (initialized || !CLIENT_ERROR_REPORTING_ENABLED) return;
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    reportClientError(event.error || event.message, {
      type: 'uncaught-error',
      source: 'window.error',
      filename: event.filename,
      lineNumber: event.lineno,
      columnNumber: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportClientError(event.reason, {
      type: 'unhandled-rejection',
      source: 'window.unhandledrejection',
    });
  });

  initialized = true;
}
