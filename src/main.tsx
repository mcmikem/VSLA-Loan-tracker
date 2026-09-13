import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { LandingPage } from './landing/LandingPage.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// `/app` → working group tool · everything else → marketing landing page.
const isAppRoute =
  typeof window !== 'undefined' && window.location.pathname.startsWith('/app');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>{isAppRoute ? <App /> : <LandingPage />}</ErrorBoundary>
  </StrictMode>
);
