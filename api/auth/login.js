import { z } from 'zod';
import { cors, rateLimit, validate } from '../_lib.js';
import { hashPin, issueSession, verifyPin } from '../_auth.js';
import { loadGroup, saveGroup } from '../_db.js';
import { resolveGroupId } from '../_seed.js';

const loginSchema = z.object({
  groupId: z.string().min(1).max(64).optional(),
  accountId: z.string().min(1).max(64),
  pin: z.string().regex(/^\d{4,8}$/),
});

/**
 * Upgrade #22 — POST /api/auth/login { groupId?, accountId, pin }
 * Verifies the account PIN and returns an HMAC session token.
 * Legacy plaintext seed PINs are transparently upgraded to scrypt hashes.
 */
export default async function handler(req, res) {
  if (!cors(req, res, 'POST,OPTIONS')) return;
  if (!rateLimit(req, res, { limit: 10, windowMs: 60000 })) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const input = validate(loginSchema, req.body || {}, res);
  if (!input) return;

  const groupId = input.groupId || resolveGroupId(req);
  const group = await loadGroup(groupId);
  const pool = group.availableAccounts || [];
  const account = pool.find((a) => a.id === input.accountId);

  // Uniform error to avoid account enumeration.
  if (!account || !verifyPin(input.pin, account.pin)) {
    return res.status(401).json({ error: 'Wrong account or PIN.' });
  }

  if (!String(account.pin || '').startsWith('hash:')) {
    account.pin = hashPin(input.pin);
    await saveGroup(groupId, group);
  }

  const token = issueSession({
    accountId: account.id,
    groupId,
    role: account.role,
    name: account.name,
  });

  const { pin: _omit, ...safeAccount } = account;
  return res.status(200).json({
    success: true,
    token,
    expiresInHours: 24,
    account: safeAccount,
  });
}
