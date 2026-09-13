import { getSeedForGroup, resolveGroupId } from '../_seed.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-group-id');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const groupId = resolveGroupId(req);

  if (req.method === 'GET') {
    const data = getSeedForGroup(groupId);
    return res.status(200).json({
      success: true, groupId,
      currentUser: data.currentUser,
      accounts: data.availableAccounts,
    });
  }

  // POST /api/accounts/switch is handled by api/accounts/switch.js;
  // this file also accepts it for robustness.
  const { accountId } = req.body || {};
  const data = getSeedForGroup(groupId);
  const pool = data.availableAccounts || [];
  const target = pool.find((a) => a.id === accountId);
  if (!target) return res.status(404).json({ error: 'Account not found in group' });
  return res.status(200).json({ success: true, groupId, currentUser: target });
}
