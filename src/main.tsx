import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { LandingPage } from './landing/LandingPage.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// `/app` → working group tool · everything else → marketing landing page.
const isAppRoute =
  typeof window !== 'undefined' && window.location.pathname.startsWith('/app');

// Offline-first: register service worker for /app (never caches /api/*).
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && isAppRoute) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline still works via localStorage */
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>{isAppRoute ? <App /> : <LandingPage />}</ErrorBoundary>
  </StrictMode>
);
