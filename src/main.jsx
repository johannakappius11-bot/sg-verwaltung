import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AppProvider } from './store.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProvider><App /></AppProvider>
  </React.StrictMode>,
);

// Service Worker (Offline-Start, Installierbarkeit) – nur in der fertigen Version
if ('serviceWorker' in navigator && import.meta.env.PROD && import.meta.env.VITE_ROUTER !== 'memory') {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
