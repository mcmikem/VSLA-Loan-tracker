/**
 * Upgrade #22/#23 — session auth (phone + PIN) + server-side RBAC.
 *
 *   POST /api/auth/login  { groupId, accountId, pin } -> { token, account }
 *   Other endpoints accept:  Authorization: Bearer <token>
 *
 * PINs are verified with scrypt (new `hash:` stored values) with a
 * constant-time fallback for legacy seed PINs. Sessions are HMAC-signed
 * (node:crypto, no dependency) and expire after 24h.
 *
 * Open-dev mode: until SESSION_SECRET is set in Vercel env vars, protected
 * endpoints keep working unauthenticated so pilots are never locked out.
 * Set SESSION_SECRET (any long random string) to enforce login.
 */
import crypto from 'node:crypto';
import { timingSafeEqual } from 'node:crypto';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function secret() {
  return process.env.SESSION_SECRET || 'dev-only-insecure-secret';
}

export function authEnforced() {
  return !!process.env.SESSION_SECRET;
}

// ---------- PIN hashing ----------
export function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pin), salt, 32).toString('hex');
  return `hash:${salt}:${hash}`;
}

export function verifyPin(pin, stored) {
  try {
    if (stored && stored.startsWith('hash:')) {
      const [, salt, expected] = stored.split(':');
      const actual = crypto.scryptSync(String(pin), salt, 32).toString('hex');
      const a = Buffer.from(actual, 'hex');
      const b = Buffer.from(expected, 'hex');
      return a.length === b.length && timingSafeEqual(a, b);
    }
    // Legacy seed PINs (plaintext '1234'): constant-time compare, migrate on login.
    const a = Buffer.from(String(pin));
    const b = Buffer.from(String(stored || ''));
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ---------- sessions ----------
function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

export function issueSession({ accountId, groupId, role, name }) {
  const header = b64url({ alg: 'HS256', typ: 'VSLA' });
  const body = b64url({
    sub: accountId,
    groupId,
    role,
    name,
    iat: Date.now(),
    exp: Date.now() + SESSION_TTL_MS,
  });
  const sig = crypto.createHmac('sha256', secret()).update(`${header}.${body}`).digest('hex');
  return `${header}.${body}.${sig}`;
}

export function readSession(req) {
  const auth = req.headers?.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = crypto.createHmac('sha256', secret()).update(`${header}.${body}`).digest('hex');
  try {
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------- RBAC ----------
const ROLE_RANK = { member: 1, keyholder: 2, chairperson: 3, treasurer: 3, secretary: 4 };

/**
 * Gate an endpoint. `minRole` examples: 'member' (any signed-in user),
 * 'treasurer' (treasurer+secretary+chairperson), 'secretary' (top only).
 * Returns the session (or null in open-dev mode). Sends 401/403 on failure.
 */
export function requireRole(req, res, minRole = 'member') {
  const session = readSession(req);
  if (!session) {
    if (!authEnforced()) return null; // open-dev mode: allow, audited as 'offline-device'
    res.status(401).json({ error: 'Sign-in required. POST /api/auth/login with groupId, accountId and PIN.' });
    return undefined;
  }
  const have = ROLE_RANK[session.role] || 0;
  const need = ROLE_RANK[minRole] || 1;
  if (have < need) {
    res.status(403).json({ error: `Requires ${minRole} role or above.` });
    return undefined;
  }
  return session;
}

export function actorName(req, session) {
  if (session?.name) return `${session.name} (${session.role})`;
  return 'offline-device';
}

/**
 * Group binding: a session issued for group A can never read or write group
 * B's ledger — even with an officer role. Open-dev mode (no secret) skips
 * the check so pilots stay frictionless. Returns true when allowed.
 */
export function requireGroup(req, res, groupId) {
  if (!authEnforced()) return true;
  const session = readSession(req);
  if (!session) {
    res.status(401).json({ error: 'Sign-in required.' });
    return false;
  }
  if (session.groupId !== groupId) {
    res.status(403).json({ error: 'This sign-in belongs to a different savings group.' });
    return false;
  }
  return true;
}
