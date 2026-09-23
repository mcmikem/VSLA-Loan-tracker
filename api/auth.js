/**
 * Merged auth endpoint (was 3 functions: auth/login.js, auth/status.js, accounts/switch.js).
 * Routing via ?action= so Vercel Hobby stays under the 12-function limit.
 * vercel.json rewrites keep old URLs working:
 *   GET  /api/auth/status      -> ?action=status
 *   POST /api/auth/login       -> ?action=login
 *   POST /api/auth/change-pin  -> ?action=change-pin
 *   GET  /api/accounts         -> ?action=accounts
 *   POST /api/accounts/switch  -> ?action=switch
 */
import { z } from 'zod';
import { cors, rateLimit, validate } from '../lib/_lib.js';
import { authEnforced, hashPin, issueSession, readSession, verifyPin } from '../lib/_auth.js';
import { loadGroup, saveGroup, storageInfo } from '../lib/_db.js';
import { getSeedForGroup, resolveGroupId, SEED_ACCOUNTS } from '../lib/_seed.js';

const loginSchema = z.object({
  groupId: z.string().min(1).max(64).optional(),
  accountId: z.string().min(1).max(64),
  pin: z.string().regex(/^\d{4,8}$/),
});

const changePinSchema = z.object({
  groupId: z.string().min(1).max(64).optional(),
  accountId: z.string().min(1).max(64),
  oldPin: z.string().regex(/^\d{4,8}$/).optional(),
  newPin: z.string().regex(/^\d{4}$/),
});

/** Strip secrets before accounts ever leave the server. */
function publicAccount(a) {
  if (!a || typeof a !== 'object') return a;
  const { pin: _omit, ...safe } = a;
  return safe;
}

/**
 * POST /api/auth/login { groupId?, accountId, pin }
 * Verifies the account PIN and returns an HMAC session token.
 * Legacy plaintext seed PINs are transparently upgraded to scrypt hashes.
 */
async function handleLogin(req, res) {
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

/**
 * Public status probe for the app shell.
 * Lets the frontend decide whether to show the PIN-login gate and
 * whether to warn that data lives on this phone only (no shared DB).
 */
async function handleStatus(req, res) {
  if (!cors(req, res, 'GET,OPTIONS')) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  return res.status(200).json({
    success: true,
    authEnforced: authEnforced(),
    storage: storageInfo(),
  });
}

async function handleAccounts(req, res) {
  if (!cors(req, res, 'GET,POST,OPTIONS')) return;
  const groupId = resolveGroupId(req);

  if (req.method === 'GET') {
    const data = getSeedForGroup(groupId);
    return res.status(200).json({
      success: true, groupId,
      currentUser: publicAccount(data.currentUser || data.availableAccounts?.[0] || SEED_ACCOUNTS[0]),
      accounts: (data.availableAccounts || SEED_ACCOUNTS).map(publicAccount),
    });
  }

  if (req.method === 'POST') {
    const { accountId } = req.body || {};
    const data = getSeedForGroup(groupId);
    const pool = data.availableAccounts || SEED_ACCOUNTS;
    const target = pool.find((a) => a.id === accountId) || pool[0];
    if (!target) return res.status(404).json({ error: 'Account not found in group' });
    return res.status(200).json({
      success: true, groupId, currentUser: publicAccount(target),
      message: `Active session switched to ${target.name} (${target.roleTitle})`,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * POST /api/auth/change-pin { groupId?, accountId, oldPin?, newPin }
 * Self-service: signed-in user changes their OWN pin (must prove old PIN).
 * Officer reset: secretary+ session may reset another account (no old PIN).
 * New PIN must be 4 digits and never the 1234 default.
 */
async function handleChangePin(req, res) {
  if (!cors(req, res, 'POST,OPTIONS')) return;
  if (!rateLimit(req, res, { limit: 10, windowMs: 60000 })) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const input = validate(changePinSchema, req.body || {}, res);
  if (!input) return;
  if (input.newPin === '1234') {
    return res.status(400).json({ error: 'Pick a PIN that is not 1234.' });
  }

  const groupId = input.groupId || resolveGroupId(req);
  const group = await loadGroup(groupId);
  const pool = group.availableAccounts || [];
  const account = pool.find((a) => a.id === input.accountId);
  if (!account) return res.status(404).json({ error: 'Account not found in group' });

  const session = readSession(req);
  const isSelf = !!session && session.sub === account.id && session.groupId === groupId;
  const isOfficerReset =
    !!session && session.groupId === groupId && ['secretary', 'treasurer', 'chairperson'].includes(session.role);

  if (!session && authEnforced()) {
    return res.status(401).json({ error: 'Sign-in required.' });
  }
  if (!isSelf && !isOfficerReset && authEnforced()) {
    return res.status(403).json({ error: 'You can only change your own PIN.' });
  }
  // Officer resets skip the old PIN; everyone else must prove it — even in
  // open-dev mode, so a lost phone alone is not enough to hijack an account.
  if (!isOfficerReset) {
    if (!input.oldPin) {
      return res.status(400).json({ error: 'Enter your current PIN first.' });
    }
    if (!verifyPin(input.oldPin, account.pin)) {
      return res.status(401).json({ error: 'Current PIN is wrong.' });
    }
  }

  account.pin = hashPin(input.newPin);
  await saveGroup(groupId, group);
  return res.status(200).json({ success: true, groupId, accountId: account.id });
}

export default async function handler(req, res) {
  const action = String(req.query?.action || '').toLowerCase();
  if (!action || action === 'status') return handleStatus(req, res);
  if (action === 'login') return handleLogin(req, res);
  if (action === 'change-pin') return handleChangePin(req, res);
  if (action === 'accounts' || action === 'switch') return handleAccounts(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(405).json({ error: 'Unknown auth action. Use ?action=status|login|change-pin|accounts|switch' });
}
