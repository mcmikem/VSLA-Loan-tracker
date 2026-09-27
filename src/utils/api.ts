/**
 * Authenticated API helper.
 * - Session token lives in localStorage (24h server-side expiry).
 * - apiFetch() attaches `Authorization: Bearer <token>` + `x-group-id`
 *   so the server can enforce RBAC once SESSION_SECRET is set.
 * - Without a token it behaves like plain fetch (open-dev / offline mode).
 */

import type { VSLAState } from '../types';

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

/** Read the group a session token belongs to (routing only — never trust). */
export function sessionGroupId(token: string | null): string | null {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload?.groupId === 'string' ? payload.groupId : null;
  } catch {
    return null;
  }
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

export interface RemoteApprovalCodeResult {
  code: string;
  phone: string;
  officerName: string;
  expiresAt: string;
  state: VSLAState;
}

export interface RemoteApprovalActionResult {
  state: VSLAState;
}

async function actionError(response: Response): Promise<string> {
  const data = await response.json().catch(() => ({}));
  return data.error || `Server said no (${response.status}).`;
}

export async function requestApprovalCodeRemote(args: {
  groupId: string;
  approvalId: string;
  officerId: string;
}): Promise<{ ok: true; result: RemoteApprovalCodeResult } | { ok: false; error: string }> {
  try {
    const response = await apiFetch(`/api/state?action=request-code&groupId=${encodeURIComponent(args.groupId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-group-id': args.groupId },
      body: JSON.stringify(args),
    });
    if (!response.ok) return { ok: false, error: await actionError(response) };
    const data = await response.json();
    if (!data.success || !data.code || !data.state) return { ok: false, error: 'The server did not return an approval code.' };
    return {
      ok: true,
      result: {
        code: data.code,
        phone: data.phone,
        officerName: data.officerName,
        expiresAt: data.expiresAt,
        state: data.state,
      },
    };
  } catch (error: any) {
    return { ok: false, error: error?.message || 'No connection.' };
  }
}

export async function approveWithCodeRemote(args: {
  groupId: string;
  approvalId: string;
  code: string;
  payoutMethod?: string;
}): Promise<{ ok: true; result: RemoteApprovalActionResult } | { ok: false; error: string }> {
  try {
    const response = await apiFetch(`/api/state?action=approve-code&groupId=${encodeURIComponent(args.groupId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-group-id': args.groupId },
      body: JSON.stringify(args),
    });
    if (!response.ok) return { ok: false, error: await actionError(response) };
    const data = await response.json();
    if (!data.success || !data.state) return { ok: false, error: 'The server did not confirm this code.' };
    return { ok: true, result: { state: data.state } };
  } catch (error: any) {
    return { ok: false, error: error?.message || 'No connection.' };
  }
}

export async function createLoanRequestRemote(args: {
  groupId: string;
  approvalId: string;
  reqNumber: string;
  memberName: string;
  memberNo: string;
  amount: number;
  term: string;
  serviceFee: number;
  purpose: string;
  guarantorNos: string[];
  phone: string;
  provider: 'MTN' | 'Airtel';
}): Promise<{ ok: true; result: RemoteApprovalActionResult } | { ok: false; error: string }> {
  try {
    const response = await apiFetch(`/api/state?action=create-loan&groupId=${encodeURIComponent(args.groupId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-group-id': args.groupId },
      body: JSON.stringify(args),
    });
    if (!response.ok) return { ok: false, error: await actionError(response) };
    const data = await response.json();
    if (!data.success || !data.state) return { ok: false, error: 'The server did not accept this loan request.' };
    return { ok: true, result: { state: data.state } };
  } catch (error: any) {
    return { ok: false, error: error?.message || 'No connection.' };
  }
}

/** Plain shape on purpose: this repo compiles without strictNullChecks, so
 *  discriminated unions do not narrow here. */
export interface SmsBatchResult {
  ok: boolean;
  sent?: number;
  notConfigured?: boolean;
  error?: string;
}

/**
 * One-tap receipts for every member (the Chomoka channel). Only works when an
 * SMS gateway is configured server-side; otherwise the caller falls back to the
 * per-member `sms:` links, which need no data.
 */
export async function sendSmsBatchRemote(args: {
  groupId: string;
  messages: { to: string; message: string }[];
}): Promise<SmsBatchResult> {
  try {
    const response = await apiFetch(`/api/sms?action=send&groupId=${encodeURIComponent(args.groupId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-group-id': args.groupId },
      body: JSON.stringify({ messages: args.messages }),
    });
    if (response.status === 503) return { ok: false, notConfigured: true, error: 'sms_not_configured' };
    if (!response.ok) return { ok: false, error: await actionError(response) };
    const data = await response.json();
    if (!data.success) return { ok: false, error: data.error || 'The server did not send the receipts.' };
    return { ok: true, sent: Number(data.sent) || 0 };
  } catch (error: any) {
    return { ok: false, error: error?.message || 'No connection.' };
  }
}

/** Self-service PIN change. Server refuses the 1234 default. */
export async function changePinRequest(args: {
  groupId: string;
  accountId: string;
  oldPin?: string;
  newPin: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await apiFetch('/api/auth/change-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) return { ok: true };
    return { ok: false, error: data.error || `Server said no (${res.status}). Try again.` };
  } catch (e: any) {
    // Offline: caller falls back to local-only change (syncs on next login).
    return { ok: false, error: e?.message || 'No connection.' };
  }
}
