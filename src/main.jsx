import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
  <App />
  // </React.StrictMode>,
)

function scheduleWebVitals() {
  const loadWebVitals = () => {
    const init = () => {
      import('@/lib/webVitals')
        .then(({ initWebVitals }) => initWebVitals())
        .catch(() => {
          // Web Vitals collection should never affect rendering.
        });
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(init, { timeout: 4000 });
      return;
    }

    window.setTimeout(init, 2500);
  };

  if (document.readyState === 'complete') {
    loadWebVitals();
    return;
  }

  window.addEventListener('load', loadWebVitals, { once: true });
}

scheduleWebVitals();

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*');
  });
  import.meta.hot.on('vite:afterUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*');
  });
}

