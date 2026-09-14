/**
 * Authenticated API helper.
 * - Session token lives in localStorage (24h server-side expiry).
 * - apiFetch() attaches `Authorization: Bearer <token>` + `x-group-id`
 *   so the server can enforce RBAC once SESSION_SECRET is set.
 * - Without a token it behaves like plain fetch (open-dev / offline mode).
 */

const TOKEN_KEY = 'bakwata_session_token';

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable — session lasts for this tab only */
  }
}

export interface AuthStatus {
  authEnforced: boolean;
  storage: { driver: string; durable: boolean; shared?: boolean };
}

export async function fetchAuthStatus(): Promise<AuthStatus | null> {
  try {
    const res = await fetch('/api/auth/status');
    if (!res.ok) return null;
    const data = await res.json();
    return { authEnforced: !!data.authEnforced, storage: data.storage || { driver: 'unknown', durable: false } };
  } catch {
    return null;
  }
}

/** Drop-in replacement for fetch() on /api/* calls. */
export function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getSessionToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token && !headers['Authorization'] && !headers['authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(path, { ...options, headers });
}
