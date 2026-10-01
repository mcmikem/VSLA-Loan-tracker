import { describe, expect, it, beforeAll, vi } from 'vitest';
import authHandler from '../api/auth.js';
import groupsHandler from '../api/groups.js';
import { PIN_FREE_ATTEMPTS } from '../lib/_auth.js';

/**
 * The lockout exercised through the real handler, because that is where a
 * per-account counter can be wired up and then quietly not applied.
 *
 * Each attempt comes from a different IP on purpose: the old limit was
 * per-IP, so a single-IP test would pass on the old code and prove nothing.
 */
let ip = 20;
const freshIp = () => `9.9.8.${ip++}`;

function mockReq(opts: any = {}) {
  // mirrors tests/security.test.ts: the action travels in query, and the
  // socket address is what the IP rate limit reads.
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(opts.headers || {})) headers[k.toLowerCase()] = String(v);
  return {
    method: opts.method || 'GET',
    query: { ...(opts.action ? { action: opts.action } : {}), ...(opts.query || {}) },
    body: opts.body || {},
    headers,
    socket: { remoteAddress: freshIp() },
    url: opts.url || '/api/test',
  } as any;
}

function mockRes() {
  const r: any = { statusCode: 200, body: undefined, headers: {} };
  r.status = (c: number) => ((r.statusCode = c), r);
  r.json = (o: any) => ((r.body = o), r);
  r.setHeader = (k: string, v: string) => ((r.headers[String(k).toLowerCase()] = v), r);
  r.end = (x?: any) => ((r.body = x), r);
  return r;
}

let G = '';
let A = '';
const CORRECT = '8601';
const WRONG = '1111';

async function createGroup() {
  const req = mockReq({
    method: 'POST',
    action: 'create',
    body: { name: 'Lockout Group', adminName: 'Admin One', adminPhone: '+256700000009', adminPin: CORRECT },
  });
  const res = mockRes();
  await groupsHandler(req, res);
  expect(res.statusCode).toBe(200);
  G = res.body.groupId;
  A = res.body.account.id;
}

async function tryPin(pin: string) {
  const res = mockRes();
  await authHandler(mockReq({ method: 'POST', action: 'login', body: { groupId: G, accountId: A, pin } }), res);
  return res;
}

beforeAll(createGroup);

describe('guessing a PIN is stopped on the account, not the IP', () => {
  it('the first honest attempts are answered normally', async () => {
    for (let i = 0; i < PIN_FREE_ATTEMPTS; i++) {
      const res = await tryPin(WRONG);
      expect(res.statusCode, `attempt ${i + 1}`).toBe(401);
      expect(res.body.error).toMatch(/wrong account or pin/i);
    }
  });

  it('then it starts waiting, and says for how long', async () => {
    // The attempt that trips the lock is still answered normally (401), so a
    // treasurer is never told "locked" without having guessed wrong first.
    // The next one gets the wait.
    let res = await tryPin(WRONG);
    expect(res.statusCode).toBe(401);
    res = await tryPin(WRONG);
    expect(res.statusCode).toBe(429);
    expect(res.headers['retry-after']).toBeTruthy();
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    expect(res.body.error).toMatch(/too many wrong pins/i);
  });

  it('a different IP does not get a free go', async () => {
    // the point of counting on the account: rotating addresses buys nothing
    // (tryPin uses a fresh IP on every call)
    const res = await tryPin(WRONG);
    expect(res.statusCode).toBe(429);
  });

  it('the wait slows wrong guesses, it does not lock out a correct PIN', async () => {
    // Deliberate: the delay exists to make guessing expensive, and it does
    // that by slowing the wrong PIN. Refusing a correct PIN would buy no
    // security — an attacker who had it would not be guessing — while
    // stranding a treasurer who remembers their PIN during the window.
    const res = await tryPin(CORRECT);
    expect(res.statusCode).toBe(200);
  });

  it('the wait expires on its own, and the correct PIN then works', async () => {
    // the lock is a delay, not a lock: a treasurer who fumbled twice gets back in
    vi.useFakeTimers();
    try {
      vi.setSystemTime(Date.now() + 61 * 60 * 1000);
      const res = await tryPin(CORRECT);
      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('a successful sign-in clears the record for good', async () => {
    for (let i = 0; i < PIN_FREE_ATTEMPTS + 1; i++) await tryPin(WRONG);
    expect((await tryPin(WRONG)).statusCode).toBe(429);
    vi.useFakeTimers();
    try {
      vi.setSystemTime(Date.now() + 2 * 60 * 60 * 1000);
      expect((await tryPin(CORRECT)).statusCode).toBe(200);
    } finally {
      vi.useRealTimers();
    }
    // straight back to free attempts, because the counter was cleared
    expect((await tryPin(WRONG)).statusCode).toBe(401);
  });
});

describe('changing a PIN is not a second way to guess the old one', () => {
  it('counts wrong old PINs too', async () => {
    const attempt = async (oldPin: string) => {
      const res = mockRes();
      await authHandler(
        mockReq({ method: 'POST', action: 'change-pin', body: { groupId: G, accountId: A, oldPin, newPin: '9753' } }),
        res
      );
      return res;
    };
    let sawLock = false;
    for (let i = 0; i < PIN_FREE_ATTEMPTS + 3; i++) {
      const res = await attempt(WRONG);
      if (res.statusCode === 429) sawLock = true;
    }
    expect(sawLock, 'change-pin must apply the same delay as login').toBe(true);
  });
});
