import { cors } from '../_lib.js';
import { authEnforced } from '../_auth.js';
import { storageInfo } from '../_db.js';

/**
 * Public status probe for the app shell.
 * Lets the frontend decide whether to show the PIN-login gate and
 * whether to warn that data lives on this phone only (no shared DB).
 */
export default async function handler(req, res) {
  if (!cors(req, res, 'GET,OPTIONS')) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  return res.status(200).json({
    success: true,
    authEnforced: authEnforced(),
    storage: storageInfo(),
  });
}
