import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Route-level split: landing visitors never download the group tool and
// vice versa. Matters on 2G/3G cheap Androids — each route is ~half the JS.
// `/app` → working group tool · everything else → marketing landing page.
const isAppRoute =
  typeof window !== 'undefined' && window.location.pathname.startsWith('/app');

const App = lazy(() => import('./App.tsx'));
const LandingPage = lazy(() =>
  import('./landing/LandingPage.tsx').then((m) => ({ default: m.LandingPage }))
);

// Offline-first: register service worker for /app (never caches /api/*).
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && isAppRoute) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline still works via localStorage */
    });
  });
}

function RouteLoader() {
  return (
    <div className="min-h-screen bg-[#F6F7F6] flex items-center justify-center">
      <img src="/icon.svg" alt="VSLA UG" className="w-14 h-14 rounded-2xl animate-pulse" />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<RouteLoader />}>
        {isAppRoute ? <App /> : <LandingPage />}
      </Suspense>
    </ErrorBoundary>
  </StrictMode>
);
