import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Runs public/sw.js inside a fake ServiceWorkerGlobalScope so the offline
 * strategy is actually executed, not just grepped. Group members open this app
 * with no data bundle, so a broken cache path is a broken app.
 */
const swSource = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');

type Handler = (event: any) => void;

function loadServiceWorker(opts: { cached?: string[]; networkFails?: boolean } = {}) {
  const handlers: Record<string, Handler> = {};
  const cacheStore = new Map<string, any>();
  const putLog: string[] = [];

  const makeResponse = (body: string) => ({
    body,
    clone() {
      return makeResponse(body);
    },
  });

  const self = {
    location: { origin: 'https://vsla-ug.vercel.app' },
    addEventListener: (type: string, fn: Handler) => {
      handlers[type] = fn;
    },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };

  const caches = {
    open: async () => ({
      add: async (url: string) => {
        if (opts.networkFails) throw new Error('offline');
        cacheStore.set(url, makeResponse(`precached:${url}`));
      },
      put: async (req: any, res: any) => {
        const key = typeof req === 'string' ? req : req.url;
        putLog.push(key);
        cacheStore.set(key, res);
      },
    }),
    match: async (req: any) => {
      const key = typeof req === 'string' ? req : req.url;
      if (opts.cached?.includes(key)) return makeResponse(`cached:${key}`);
      return cacheStore.get(key);
    },
    keys: async () => ['vsla-ug-v1', 'vsla-ug-v2'],
    delete: async () => true,
  };

  const fetchImpl = async (target: any) => {
    if (opts.networkFails) throw new Error('offline');
    const url = typeof target === 'string' ? target : target.url;
    return makeResponse(`network:${url}`);
  };

  // eslint-disable-next-line no-new-func
  new Function('self', 'caches', 'fetch', 'Response', 'URL', swSource)(
    self,
    caches,
    fetchImpl,
    class {
      constructor(public body: string, public init?: any) {}
      clone() {
        return this;
      }
    },
    URL
  );

  const fire = (type: string, request: any) => {
    let response: any;
    let responded = false;
    handlers[type]({
      request,
      waitUntil: (p: Promise<any>) => p,
      respondWith: (p: Promise<any>) => {
        responded = true;
        response = p;
      },
    });
    return { responded, response };
  };

  return { handlers, cacheStore, putLog, fire, makeResponse };
}

const req = (url: string, extra: Record<string, unknown> = {}) => ({
  url,
  method: 'GET',
  mode: 'no-cors',
  ...extra,
});

describe('service worker offline strategy', () => {
  beforeEach(() => {
    // fresh module state per test
  });

  it('registers install, activate and fetch handlers', () => {
    const sw = loadServiceWorker();
    expect(Object.keys(sw.handlers).sort()).toEqual(['activate', 'fetch', 'install']);
  });

  it('installs the shell and survives one bad entry', async () => {
    const sw = loadServiceWorker({ networkFails: true }); // every add() rejects
    let installed: Promise<unknown> = Promise.resolve();
    sw.handlers.install({ waitUntil: (p: Promise<unknown>) => { installed = p; } });
    await expect(installed).resolves.toBeUndefined();
  });

  it('precaches the app shell on install', async () => {
    const sw = loadServiceWorker();
    let installed: Promise<unknown> = Promise.resolve();
    sw.handlers.install({ waitUntil: (p: Promise<unknown>) => { installed = p; } });
    await installed;
    expect([...sw.cacheStore.keys()]).toEqual(
      expect.arrayContaining(['/app', '/manifest.webmanifest', '/fonts/material-symbols.woff2'])
    );
  });

  it('never caches API responses', () => {
    const sw = loadServiceWorker();
    const { responded } = sw.fire('fetch', req('https://vsla-ug.vercel.app/api/state'));
    expect(responded).toBe(false);
  });

  it('never intercepts non-GET requests', () => {
    const sw = loadServiceWorker();
    const { responded } = sw.fire('fetch', req('https://vsla-ug.vercel.app/api/state', { method: 'POST' }));
    expect(responded).toBe(false);
  });

  it('leaves cross-origin requests alone', () => {
    const sw = loadServiceWorker();
    const { responded } = sw.fire('fetch', req('https://cdn.example.com/font.woff2'));
    expect(responded).toBe(false);
  });

  it('serves a page load from the network when there is signal', async () => {
    const sw = loadServiceWorker();
    const { responded, response } = sw.fire('fetch', req('https://vsla-ug.vercel.app/app', { mode: 'navigate' }));
    expect(responded).toBe(true);
    expect((await response).body).toBe('network:https://vsla-ug.vercel.app/app');
    expect(sw.putLog).toContain('https://vsla-ug.vercel.app/app');
  });

  it('falls back to the cached shell when the network is gone', async () => {
    const sw = loadServiceWorker({ networkFails: true });
    const { response } = sw.fire('fetch', req('https://vsla-ug.vercel.app/app', { mode: 'navigate' }));
    const body = (await response).body;
    expect(String(body)).toMatch(/cached:.*\/app|You are offline/);
  });

  it('serves hashed assets from cache first, so deep links work offline', async () => {
    const sw = loadServiceWorker();
    const { response } = sw.fire('fetch', req('https://vsla-ug.vercel.app/assets/MemberPassbookView-BJ1.js'));
    expect(String((await response).body)).toMatch(/network:.*MemberPassbookView/);
  });

  it('never returns undefined — a miss still gets a page, not a browser error', async () => {
    const sw = loadServiceWorker({ networkFails: true });
    const { response } = sw.fire('fetch', req('https://vsla-ug.vercel.app/app', { mode: 'navigate' }));
    const res = await response;
    expect(res).toBeTruthy();
    expect(String(res.body)).toContain('You are offline');
  });
});
