import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

/**
 * Two entry points:
 *  /      → index.html, the static marketing landing page (no JS framework,
 *           no app bundle, CSP-safe: Tailwind is compiled, icons self-hosted)
 *  /app   → app.html, the group tool SPA (the only page that loads the app)
 * So a visitor who never joins a group never downloads the ledger app.
 */
function appRoute(): Plugin {
  const rewrite = (req: { url?: string }, _res: unknown, next: () => void) => {
    const url = (req.url || '').split('?')[0];
    if (url === '/app' || url === '/app/') {
      req.url = '/app.html';
    }
    next();
  };
  return {
    name: 'vsla-app-route',
    // Dev server (`vite`) and `vite preview` both mirror the production
    // rewrite, so /app is testable locally exactly as it behaves on Vercel.
    configureServer(server) {
      server.middlewares.use(rewrite);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), appRoute()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'index.html'),
          app: path.resolve(__dirname, 'app.html'),
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
