/**
 * Production-attack scenarios: the enforced backend (auth + shared store)
 * under adversarial use. Runs the REAL api/*.js handlers in-process with a
 * memory store — the same code Vercel executes.
 *
 * Covered: open-dev baseline, 401s without token, cross-group 403s, PIN
 * hygiene, plan tamper-proofing, join/member caps, CORS allowlist, backup
 * secrecy, MoMo sandbox shape, admin activation.
 */
import { describe, expect, it, beforeAll } from 'vitest';
import authHandler from '../api/auth.js';
import stateHandler from '../api/state.js';
import groupsHandler from '../api/groups.js';
import backupHandler from '../api/backup.js';
import momoHandler from '../api/momo.js';
import { cors } from '../lib/_lib.js';

let ipCounter = 10;
const freshIp = () => `9.9.9.${ipCounter++}`;

function mockReq(opts: {
  method?: string;
  action?: string;
  query?: Record<string, string>;
  body?: any;
  headers?: Record<string, string>;
  url?: string;
} = {}) {
  // Express lowercases incoming header names — the mock must too, or
  // Authorization lookups silently miss and every authed test 401s.
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(opts.headers || {})) headers[k.toLowerCase()] = v;
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
  r.status = (c: number) => {
    r.statusCode = c;
    return r;
  };
  r.json = (o: any) => {
    r.body = o;
    return r;
  };
  r.setHeader = (k: string, v: string) => {
    r.headers[String(k).toLowerCase()] = v;
    return r;
  };
  r.end = (x?: any) => {
    r.body = x;
    return r;
  };
  return r;
}

const BERES = 'Bearer ';
async function login(groupId: string, accountId: string, pin: string) {
  const req = mockReq({ method: 'POST', action: 'login', body: { groupId, accountId, pin } });
  const res = mockRes();
  await authHandler(req, res);
  return res;
}
const authHeaders = (token: string, groupId: string) => ({
  Authorization: `${BERES}${token}`,
  'x-group-id': groupId,
  'Content-Type': 'application/json',
});

let G1 = '';
let G2 = '';
let adminA: any = null;
let tokenA = '';
let memberAcct: any = null;
let memberToken = '';

beforeAll(async () => {
  process.env.SESSION_SECRET = 'scenario-test-secret-xyz';
  process.env.ADMIN_KEY = 'scenario-admin-key';
  delete process.env.DATABASE_URL;

  // G1: fresh group (public create, like a real registration).
  const cr = mockRes();
  await groupsHandler(
    mockReq({
      method: 'POST',
      action: 'create',
      body: {
        name: 'Scenario Alpha Group',
        adminName: 'Test Admin One',
        adminPhone: '+256700000001',
        adminPin: '5678',
      },
    }),
    cr
  );
  expect(cr.statusCode).toBe(200);
  G1 = cr.body.groupId;
  expect(G1.startsWith('grp-')).toBe(true);
  adminA = cr.body.account;
  const lr = await login(G1, adminA.id, '5678');
  expect(lr.statusCode).toBe(200);
  tokenA = lr.body.token;
});

describe('open-dev baseline (no secret)', () => {
  it('lets anyone read state when unenforced', async () => {
    const saved = process.env.SESSION_SECRET;
    delete process.env.SESSION_SECRET;
    const req = mockReq({ method: 'GET', query: { groupId: 'bakwata-01' } });
    const res = mockRes();
    await stateHandler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.state.members.length).toBeGreaterThan(0);
    process.env.SESSION_SECRET = saved;
  });
});

describe('authentication gates', () => {
  it('401s state reads without a token when enforced', async () => {
    const res = mockRes();
    await stateHandler(mockReq({ method: 'GET', query: { groupId: G1 } }), res);
    expect(res.statusCode).toBe(401);
  });

  it('401s backup export without a token when enforced', async () => {
    const res = mockRes();
    await backupHandler(mockReq({ method: 'GET', query: { groupId: G1 } }), res);
    expect(res.statusCode).toBe(401);
  });

  it('401s the groups directory without a token when enforced', async () => {
    const res = mockRes();
    await groupsHandler(mockReq({ method: 'GET', action: 'list' }), res);
    expect(res.statusCode).toBe(401);
  });

  it('keeps invite lookup public (join flow needs it)', async () => {
    const created = mockRes();
    await groupsHandler(
      mockReq({ method: 'POST', action: 'create', body: { name: 'Invite Probe', adminName: 'Probe Admin', adminPhone: '+256700000002' } }),
      created
    );
    const code = created.body.group.inviteCode;
    const res = mockRes();
    await groupsHandler(mockReq({ method: 'GET', action: 'invite', query: { id: code } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.groupId).toBeTruthy();
  });

  it('rejects wrong PINs without migrating anything', async () => {
    const res = await login(G1, adminA.id, '0000');
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/Wrong account or PIN/);
  });

  it('migrates legacy plaintext PINs to scrypt on login', async () => {
    // G2 admin keeps default 1234 plaintext at creation.
    const cr = mockRes();
    await groupsHandler(
      mockReq({ method: 'POST', action: 'create', body: { name: 'Scenario Beta Group', adminName: 'Beta Admin', adminPhone: '+256700000003' } }),
      cr
    );
    const gid: string = cr.body.groupId;
    G2 = gid;
    const acct = cr.body.account;
    expect(String(acct.pin)).toBe('1234');
    const lr = await login(gid, acct.id, '1234');
    expect(lr.statusCode).toBe(200);
    expect(lr.body.token).toBeTruthy();
    // Stored PIN is now a hash, and the old PIN still verifies against it.
    const lr2 = await login(gid, acct.id, '1234');
    expect(lr2.statusCode).toBe(200);
  });
});

describe('cross-group isolation', () => {
  it('403s when group-A session reads group-B ledger', async () => {
    const res = mockRes();
    await stateHandler(
      mockReq({ method: 'GET', query: { groupId: 'kibuli-01' }, headers: authHeaders(tokenA, 'kibuli-01') }),
      res
    );
    expect(res.statusCode).toBe(403);
  });

  it('403s when group-A treasurer writes group-B ledger', async () => {
    const get = mockRes();
    await stateHandler(
      mockReq({ method: 'GET', query: { groupId: G1 }, headers: authHeaders(tokenA, G1) }),
      get
    );
    expect(get.statusCode).toBe(200);
    const evil = { ...get.body.state, boxCashBalance: 999999999 };
    const res = mockRes();
    await stateHandler(
      mockReq({ method: 'POST', query: { groupId: 'kibuli-01' }, headers: authHeaders(tokenA, 'kibuli-01'), body: { state: evil } }),
      res
    );
    expect(res.statusCode).toBe(403);
  });

  it('403s member-rank state writes, allows member reads of own group', async () => {
    // Join G1 as a plain member.
    const jr = mockRes();
    await groupsHandler(
      mockReq({
        method: 'POST',
        action: 'join',
        body: { inviteCode: (await currentInvite(G1)), memberName: 'Scenario Member', phone: '+256700000010', pin: '4321' },
      }),
      jr
    );
    expect(jr.statusCode).toBe(200);
    memberAcct = jr.body.account;
    const lr = await login(G1, memberAcct.id, '4321');
    memberToken = lr.body.token;
    expect(lr.statusCode).toBe(200);

    const get = mockRes();
    await stateHandler(mockReq({ method: 'GET', query: { groupId: G1 }, headers: authHeaders(memberToken, G1) }), get);
    expect(get.statusCode).toBe(200);

    const post = mockRes();
    await stateHandler(
      mockReq({ method: 'POST', query: { groupId: G1 }, headers: authHeaders(memberToken, G1), body: { state: get.body.state } }),
      post
    );
    expect(post.statusCode).toBe(403);
  });

  it('never serves PINs — not in accounts, not in exports', async () => {
    const acc = mockRes();
    await authHandler(mockReq({ method: 'GET', action: 'accounts', query: { groupId: G1 } }), acc);
    expect(JSON.stringify(acc.body)).not.toContain('"pin"');
    const exp = mockRes();
    await backupHandler(mockReq({ method: 'GET', query: { groupId: G1 }, headers: authHeaders(tokenA, G1) }), exp);
    expect(exp.statusCode).toBe(200);
    expect(JSON.stringify(exp.body)).not.toContain('"pin"');
  });
});

async function currentInvite(groupId: string): Promise<string> {
  const get = mockRes();
  await stateHandler(mockReq({ method: 'GET', query: { groupId }, headers: authHeaders(tokenA, groupId) }), get);
  return get.body.state.inviteCode;
}

describe('change-pin endpoint', () => {
  it('rejects wrong current PIN for self-service (member session)', async () => {
    const res = mockRes();
    const { default: h } = await import('../api/auth.js');
    await h(
      mockReq({ method: 'POST', action: 'change-pin', body: { groupId: G1, accountId: memberAcct.id, oldPin: '0000', newPin: '8765' }, headers: authHeaders(memberToken, G1) }),
      res
    );
    expect(res.statusCode).toBe(401);
  });

  it('refuses the 1234 default as a new PIN', async () => {
    const res = mockRes();
    const { default: h } = await import('../api/auth.js');
    await h(
      mockReq({ method: 'POST', action: 'change-pin', body: { groupId: G1, accountId: adminA.id, oldPin: '5678', newPin: '1234' }, headers: authHeaders(tokenA, G1) }),
      res
    );
    expect(res.statusCode).toBe(400);
  });

  it('changes + hashes, old PIN dies, new PIN works', async () => {
    const { default: h } = await import('../api/auth.js');
    const res = mockRes();
    await h(
      mockReq({ method: 'POST', action: 'change-pin', body: { groupId: G1, accountId: adminA.id, oldPin: '5678', newPin: '8765' }, headers: authHeaders(tokenA, G1) }),
      res
    );
    expect(res.statusCode).toBe(200);
    expect((await login(G1, adminA.id, '5678')).statusCode).toBe(401);
    const fresh = await login(G1, adminA.id, '8765');
    expect(fresh.statusCode).toBe(200);
    tokenA = fresh.body.token; // keep attacking with a valid session
  });
});

describe('plan enforcement', () => {
  it('reverts self-upgrades posted without the admin key', async () => {
    const get = mockRes();
    await stateHandler(mockReq({ method: 'GET', query: { groupId: G1 }, headers: authHeaders(tokenA, G1) }), get);
    const doctored = { ...get.body.state, groupProfile: { ...get.body.state.groupProfile, plan: 'pro' } };
    const post = mockRes();
    await stateHandler(
      mockReq({ method: 'POST', query: { groupId: G1 }, headers: authHeaders(tokenA, G1), body: { state: doctored } }),
      post
    );
    expect(post.statusCode).toBe(200);
    expect(post.body.state.groupProfile.plan).toBe('free');
  });

  it('caps free-group growth on state writes', async () => {
    const get = mockRes();
    await stateHandler(mockReq({ method: 'GET', query: { groupId: G1 }, headers: authHeaders(tokenA, G1) }), get);
    const grown = {
      ...get.body.state,
      members: Array.from({ length: 31 }, (_, i) => ({ id: `m-cap-${i}`, no: `${i}`, name: `Cap Member ${i}` })),
    };
    const post = mockRes();
    await stateHandler(
      mockReq({ method: 'POST', query: { groupId: G1 }, headers: authHeaders(tokenA, G1), body: { state: grown } }),
      post
    );
    expect(post.statusCode).toBe(403);
    expect(post.body.maxMembers).toBe(30);
  });

  it('caps join signups at 30 on free, lifts after admin activation', async () => {
    const code = await currentInvite(G1);
    // G1 already holds admin + 1 joined member; fill to exactly 30.
    for (let i = 0; i < 28; i++) {
      const jr = mockRes();
      await groupsHandler(
        mockReq({
          method: 'POST',
          action: 'join',
          body: { inviteCode: code, memberName: `Filler Member ${String.fromCharCode(65 + (i % 26))}${i}`, phone: `+256700${String(100000 + i)}`, pin: '1111' },
        }),
        jr
      );
      expect(jr.statusCode).toBe(200);
    }
    const over = mockRes();
    await groupsHandler(
      mockReq({ method: 'POST', action: 'join', body: { inviteCode: code, memberName: 'Overflow Member', phone: '+256700009999', pin: '1111' } }),
      over
    );
    expect(over.statusCode).toBe(403);

    // Admin activation (wrong key, bad plan, unknown group first).
    const noKey = mockRes();
    await groupsHandler(mockReq({ method: 'POST', action: 'plan', body: { groupId: G1, plan: 'pro' } }), noKey);
    expect(noKey.statusCode).toBe(403);
    const badPlan = mockRes();
    await groupsHandler(
      mockReq({ method: 'POST', action: 'plan', headers: { 'x-admin-key': 'scenario-admin-key' }, body: { groupId: G1, plan: 'diamond' } }),
      badPlan
    );
    expect(badPlan.statusCode).toBe(400);
    const unknown = mockRes();
    await groupsHandler(
      mockReq({ method: 'POST', action: 'plan', headers: { 'x-admin-key': 'scenario-admin-key' }, body: { groupId: 'grp-nope-missing', plan: 'pro' } }),
      unknown
    );
    expect(unknown.statusCode).toBe(404);
    const good = mockRes();
    await groupsHandler(
      mockReq({ method: 'POST', action: 'plan', headers: { 'x-admin-key': 'scenario-admin-key' }, body: { groupId: G1, plan: 'pro' } }),
      good
    );
    expect(good.statusCode).toBe(200);
    expect(good.body.plan).toBe('pro');

    const after = mockRes();
    await groupsHandler(
      mockReq({ method: 'POST', action: 'join', body: { inviteCode: code, memberName: 'Post Pro Member', phone: '+256700009998', pin: '1111' } }),
      after
    );
    expect(after.statusCode).toBe(200);
  }, 30000);

  it('serves a stripped directory (no money, no location)', async () => {
    const res = mockRes();
    await groupsHandler(mockReq({ method: 'GET', action: 'list', headers: authHeaders(tokenA, G1) }), res);
    expect(res.statusCode).toBe(200);
    const blob = JSON.stringify(res.body.groups);
    expect(blob).not.toContain('boxCashBalance');
    expect(blob).not.toContain('Kalerwe');
    const mine = res.body.groups.find((g: any) => g.id === G1);
    expect(mine.membersCount).toBeGreaterThanOrEqual(30);
  });
});

describe('code recovery by admin phone', () => {  it('rejects short numbers', async () => {
    const res = mockRes();
    await groupsHandler(mockReq({ method: 'POST', action: 'recover', body: { adminPhone: '123' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns empty for unknown numbers (no enumeration of which exist)', async () => {
    const res = mockRes();
    await groupsHandler(
      mockReq({ method: 'POST', action: 'recover', body: { adminPhone: '+256799999999' } }),
      res
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.groups).toEqual([]);
  });

  it('finds the group across phone formats, exposing code only', async () => {
    const cr = mockRes();
    await groupsHandler(
      mockReq({
        method: 'POST',
        action: 'create',
        body: { name: 'Recoverable Group', adminName: 'Recover Admin', adminPhone: '+256712345678' },
      }),
      cr
    );
    expect(cr.statusCode).toBe(200);
    const code = cr.body.group.inviteCode;
    for (const variant of ['+256712345678', '0712345678', '256 712 345 678']) {
      const res = mockRes();
      await groupsHandler(mockReq({ method: 'POST', action: 'recover', body: { adminPhone: variant } }), res);
      expect(res.statusCode).toBe(200);
      const found = res.body.groups.find((g: any) => g.inviteCode === code);
      expect(found).toBeTruthy();
      expect(found.name).toBe('Recoverable Group');
      expect(JSON.stringify(found)).not.toContain('boxCashBalance');
      expect(JSON.stringify(found)).not.toContain('members');
    }
  });
});

describe('CORS allowlist', () => {
  it('grants nothing to hostile origins, echoes configured ones', async () => {
    process.env.APP_URL = 'https://vsla-ug.vercel.app';
    const evil = mockRes();
    cors(
      { method: 'GET', headers: { origin: 'https://evil.example' } } as any,
      evil as any,
      'GET,OPTIONS'
    );
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
    const good = mockRes();
    cors(
      { method: 'GET', headers: { origin: 'https://vsla-ug.vercel.app' } } as any,
      good as any,
      'GET,OPTIONS'
    );
    expect(good.headers['access-control-allow-origin']).toBe('https://vsla-ug.vercel.app');
    delete process.env.APP_URL;
  });
});

describe('sandbox MoMo shape', () => {
  it('returns pending simulation without keys and rejects junk refs', async () => {
    delete process.env.MOMO_LIVE;
    const push = mockRes();
    await momoHandler(
      mockReq({
        method: 'POST',
        action: 'push',
        headers: authHeaders(tokenA, G1),
        body: { network: 'MTN', phone: '+256772123456', amount: 50000, memberName: 'Scenario Member', purpose: 'Loan Repayment' },
      }),
      push
    );
    expect(push.statusCode).toBe(200);
    expect(push.body.status).toBe('pending');
    expect(push.body.mode).toBe('sandbox');
  });
});

describe('accounts endpoint serves the real roster', () => {
  it('new group sign-in lists only its own admin, never seed strangers', async () => {
    const cr = mockRes();
    await groupsHandler(
      mockReq({
        method: 'POST',
        action: 'create',
        body: { name: 'Roster Probe Group', adminName: 'Roster Admin', adminPhone: '+256711111111' },
      }),
      cr
    );
    expect(cr.statusCode).toBe(200);
    const gid: string = cr.body.groupId;
    const res = mockRes();
    await authHandler(mockReq({ method: 'GET', action: 'accounts', query: { groupId: gid } }), res);
    expect(res.statusCode).toBe(200);
    const names = res.body.accounts.map((a: any) => a.name);
    expect(names).toEqual(['Roster Admin']);
    expect(names).not.toContain('Grace Akello');
    expect(names).not.toContain('Sarah Nabukalu');
    expect(JSON.stringify(res.body)).not.toContain('"pin"');
  });
});

describe('demo groups are closed in enforced mode', () => {
  it('refuses login, accounts and invite lookup for seed ids', async () => {
    const login = mockRes();
    await authHandler(
      mockReq({ method: 'POST', action: 'login', body: { groupId: 'bakwata-01', accountId: 'acc-sec', pin: '1234' } }),
      login
    );
    expect(login.statusCode).toBe(404);

    const acc = mockRes();
    await authHandler(mockReq({ method: 'GET', action: 'accounts', query: { groupId: 'kibuli-01' } }), acc);
    expect(acc.statusCode).toBe(404);

    const inv = mockRes();
    await groupsHandler(mockReq({ method: 'GET', action: 'invite', query: { id: 'BAK-4290' } }), inv);
    expect(inv.statusCode).toBe(404);
  });

  it('hides seed groups from the directory when enforced', async () => {
    const res = mockRes();
    await groupsHandler(mockReq({ method: 'GET', action: 'list', headers: authHeaders(tokenA, G1) }), res);
    expect(res.statusCode).toBe(200);
    const ids = res.body.groups.map((g: any) => g.id);
    expect(ids).not.toContain('bakwata-01');
    expect(ids).not.toContain('kibuli-01');
    expect(ids).toContain(G1);
  });

  it('404s accounts for unknown groups when enforced', async () => {
    const res = mockRes();
    await authHandler(mockReq({ method: 'GET', action: 'accounts', query: { groupId: 'grp-ghost-xyz' } }), res);
    expect(res.statusCode).toBe(404);
  });
});
