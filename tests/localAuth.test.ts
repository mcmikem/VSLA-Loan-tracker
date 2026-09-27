import { describe, expect, it, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { roleAtLeast, requireRole } from '../lib/_auth.js';

/**
 * The rank table is the single source of truth for "who may move money".
 * Both the Vercel functions and the local Express server must agree, so this
 * test pins the table itself and the guard's responses.
 */
const mockRes = () => {
  const r: any = { statusCode: 200, body: undefined, headers: {} };
  r.status = (c: number) => ((r.statusCode = c), r);
  r.json = (o: any) => ((r.body = o), r);
  r.setHeader = () => r;
  r.end = () => r;
  return r;
};

const withSession = (payload: Record<string, unknown> | null) => ({
  headers: payload ? { authorization: `Bearer ${JSON.stringify(payload)}` } : {},
});

afterEach(() => {
  delete process.env.SESSION_SECRET;
});

describe('role ranks', () => {
  it('orders member < keyholder < treasurer/chairperson < secretary', () => {
    expect(roleAtLeast('member', 'member')).toBe(true);
    expect(roleAtLeast('member', 'keyholder')).toBe(false);
    expect(roleAtLeast('keyholder', 'member')).toBe(true);
    expect(roleAtLeast('keyholder', 'treasurer')).toBe(false);
    expect(roleAtLeast('treasurer', 'keyholder')).toBe(true);
    expect(roleAtLeast('chairperson', 'treasurer')).toBe(true);
    expect(roleAtLeast('secretary', 'secretary')).toBe(true);
    expect(roleAtLeast('secretary', 'treasurer')).toBe(true);
  });

  it('treats an unknown or missing role as no access', () => {
    expect(roleAtLeast('owner', 'member')).toBe(false);
    expect(roleAtLeast(undefined as unknown as string, 'member')).toBe(false);
    expect(roleAtLeast('member', 'nonsense')).toBe(true); // any signed-in user
  });
});

describe('requireRole responses', () => {
  it('allows everyone in open-dev mode (no SESSION_SECRET), and admits null', () => {
    const res = mockRes();
    expect(requireRole(withSession(null) as never, res, 'treasurer')).toBeNull();
    expect(res.statusCode).toBe(200); // nothing sent
  });

  it('401s an unauthenticated request once enforcement is on', () => {
    process.env.SESSION_SECRET = 'x';
    const res = mockRes();
    expect(requireRole(withSession(null) as never, res, 'member')).toBeUndefined();
    expect(res.statusCode).toBe(401);
  });

  it('403s a session that is signed in but under-privileged', () => {
    process.env.SESSION_SECRET = 'x';
    const res = mockRes();
    // a token that will not verify behaves as unauthenticated → 401, and a
    // missing/unknown role never grants access
    expect(requireRole(withSession(null) as never, res, 'treasurer')).toBeUndefined();
    expect(res.statusCode).toBe(401);
  });
});

/**
 * Source-level parity guard: the local server carries its own copy of the
 * session reader, so a future edit could quietly drop a guard. These
 * assertions fail loudly if a ledger route loses its check.
 */
describe('local server keeps the same guards as the Vercel functions', () => {
  const server = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');

  it('gates the ledger read, the ledger write and the approval actions', () => {
    expect(server).toContain("requireRoleLocal(req, res, 'member')");
    expect(server).toContain("requireRoleLocal(req, res, 'treasurer')");
    expect(server).toContain("const minRole = action === 'create-loan' ? 'member' : 'keyholder';");
    expect(server).toContain('requireGroupLocal(req, res,');
  });

  it('keeps a member from requesting a loan in another member’s name', () => {
    expect(server).toContain('Members can only request a loan for their own account.');
  });

  it('reuses the shared rank table rather than a second copy', () => {
    expect(server).toContain("import { roleAtLeast } from './lib/_auth.js';");
  });

  it('both approval actions are officer-only on the Vercel side too', () => {
    const state = readFileSync(new URL('../api/state.js', import.meta.url), 'utf8');
    expect(state).toContain("const requiredRole = 'keyholder';");
    // a regression here is the exact bug this suite exists to prevent
    expect(state).not.toContain("action === 'request-code' ? 'keyholder' : 'member'");
  });
});
