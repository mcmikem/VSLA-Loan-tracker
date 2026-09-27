import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Boots the real local server (server.ts) in a throwaway data directory with
 * SESSION_SECRET set, then checks the guards over HTTP. Source assertions are
 * not enough: these routes decide who may move a group's money.
 */
const workDir = mkdtempSync(join(tmpdir(), 'vsla-auth-'));
mkdirSync(join(workDir, 'data'), { recursive: true });
// A real group with a real member roster, so nothing falls back to the seed.
writeFileSync(
  join(workDir, 'data', 'vsla_database.json'),
  JSON.stringify({
    groupId: 'grp-local-auth',
    groupName: 'Local Auth Group',
    boxCashBalance: 500000,
    loanFundBalance: 500000,
    welfareFundBalance: 10000,
    members: [
      { id: 'm-officer', no: '01', name: 'Officer One', phone: '0772000001', provider: 'MTN', sharesCount: 10, sharesTotal: 500000, loanBalance: 0, welfareBalance: 0, maxBorrowLimit: 200000, attendance: '' },
      { id: 'm-member', no: '02', name: 'Plain Member', phone: '0772000002', provider: 'MTN', sharesCount: 2, sharesTotal: 100000, loanBalance: 0, welfareBalance: 0, maxBorrowLimit: 40000, attendance: '' },
    ],
    availableAccounts: [
      { id: 'acc-secretary', name: 'Officer One', role: 'secretary', phone: '0772000001', memberNo: '01', memberId: 'm-officer', pin: '1111', permissions: { canApproveLoans: true, canLockBox: true, canDisburseWelfare: true, canRecordShares: true, canManageBackups: true } },
      { id: 'acc-member', name: 'Plain Member', role: 'member', phone: '0772000002', memberNo: '02', memberId: 'm-member', pin: '2222', permissions: { canApproveLoans: false, canLockBox: false, canDisburseWelfare: false, canRecordShares: false, canManageBackups: false } },
    ],
    approvals: [],
    auditLog: [],
    snapshots: [],
  })
);

const PORT = 4391;
let server: ChildProcess;

const call = async (path: string, init: RequestInit = {}, token?: string) => {
  const res = await fetch(`http://localhost:${PORT}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-group-id': 'grp-local-auth',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  let body: any = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  return { status: res.status, body };
};

const login = async (accountId: string, pin: string) => {
  const res = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ accountId, pin }) });
  return res.body?.token as string;
};

beforeAll(async () => {
  server = spawn('npx', ['tsx', join(process.cwd(), 'server.ts')], {
    cwd: workDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, SESSION_SECRET: 'local-auth-test-secret', PORT: String(PORT) },
  });
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 400));
    try {
      const res = await fetch(`http://localhost:${PORT}/api/auth/status`);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
  }
  const output = `${server.stdout?.read() || ''}${server.stderr?.read() || ''}`;
  throw new Error(`local server never came up. ${output.slice(0, 400)}`);
}, 40000);

afterAll(() => {
  server?.kill('SIGTERM');
  try {
    rmSync(workDir, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
});

describe('local server authorization (real process, real HTTP)', () => {
  it('401s an unauthenticated ledger read', async () => {
    const res = await call('/api/state');
    expect(res.status).toBe(401);
  });

  it('lets a member read their own group', async () => {
    const token = await login('acc-member', '2222');
    const res = await call('/api/state', {}, token);
    expect(res.status).toBe(200);
    expect(res.body.state.members).toHaveLength(2);
  });

  it('403s a member writing the whole ledger', async () => {
    const token = await login('acc-member', '2222');
    const read = await call('/api/state', {}, token);
    const res = await call('/api/state', { method: 'POST', body: JSON.stringify({ state: read.body.state }) }, token);
    expect(res.status).toBe(403);
  });

  it('lets a member request a loan in their own name', async () => {
    const token = await login('acc-member', '2222');
    const res = await call(
      '/api/state',
      {
        method: 'POST',
        body: JSON.stringify({
          action: 'create-loan',
          approvalId: 'own-loan',
          memberNo: '02',
          amount: 20000,
          term: '1 month',
          purpose: 'School fees',
          guarantorNos: [],
        }),
      },
      token
    );
    expect(res.status).toBe(200);
    expect(res.body.state.approvals[0].memberNo).toBe('02');
  });

  it('403s a member requesting a loan in the officer’s name', async () => {
    const token = await login('acc-member', '2222');
    const res = await call(
      '/api/state',
      {
        method: 'POST',
        body: JSON.stringify({
          action: 'create-loan',
          approvalId: 'stolen-loan',
          memberNo: '01',
          amount: 50000,
          term: '1 month',
          purpose: 'Not mine',
          guarantorNos: [],
        }),
      },
      token
    );
    expect(res.status).toBe(403);
  });

  it('403s a member minting or burning an approval code', async () => {
    const memberToken = await login('acc-member', '2222');
    const officerToken = await login('acc-secretary', '1111');
    const read = await call('/api/state', {}, officerToken);
    const state = read.body.state;
    const pending = state.approvals.find((a: any) => a.id === 'own-loan');
    expect(pending).toBeTruthy();

    const memberMint = await call(
      '/api/state',
      { method: 'POST', body: JSON.stringify({ action: 'request-code', approvalId: 'own-loan', officerId: 'acc-secretary' }) },
      memberToken
    );
    expect(memberMint.status).toBe(403);

    const officerMint = await call(
      '/api/state',
      { method: 'POST', body: JSON.stringify({ action: 'request-code', approvalId: 'own-loan', officerId: 'acc-secretary' }) },
      officerToken
    );
    expect(officerMint.status).toBe(200);
    const code = officerMint.body.code;

    const memberBurn = await call(
      '/api/state',
      { method: 'POST', body: JSON.stringify({ action: 'approve-code', approvalId: 'own-loan', code }) },
      memberToken
    );
    expect(memberBurn.status).toBe(403);

    const officerBurn = await call(
      '/api/state',
      { method: 'POST', body: JSON.stringify({ action: 'approve-code', approvalId: 'own-loan', code }) },
      officerToken
    );
    expect(officerBurn.status).toBe(200);
  });

  it('404s a demo-group login and lists no seed roster when enforced', async () => {
    const demo = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ accountId: 'u1', pin: '1234' }) });
    // resolveGroupId falls back to the demo id when the header group is unknown;
    // enforced mode must refuse it rather than hand out a seed session
    expect([401, 404]).toContain(demo.status);

    const accounts = await call('/api/accounts');
    if (accounts.status === 200) {
      expect((accounts.body.accounts || []).every((a: any) => a.pin === undefined)).toBe(true);
    }
  });
});
