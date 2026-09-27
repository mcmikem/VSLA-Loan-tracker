import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Two HTML entries: `/` is the static marketing landing page (no React), and
// `/app` loads this file. So a visitor who never joins a group never downloads
// the group tool, and the landing page stays a single cached HTML file.
const App = lazy(() => import('./App.tsx'));

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
        <App />
      </Suspense>
    </ErrorBoundary>
  </StrictMode>
);
