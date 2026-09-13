import { getSeedForGroup, resolveGroupId, SEED_ACCOUNTS } from '../_seed.js';

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
      currentUser: data.currentUser || data.availableAccounts?.[0] || SEED_ACCOUNTS[0],
      accounts: data.availableAccounts || SEED_ACCOUNTS,
    });
  }

  if (req.method === 'POST') {
    const { accountId } = req.body || {};
    const data = getSeedForGroup(groupId);
    const pool = data.availableAccounts || SEED_ACCOUNTS;
    const target = pool.find((a) => a.id === accountId) || pool[0];
    if (!target) return res.status(404).json({ error: 'Account not found in group' });
    return res.status(200).json({
      success: true, groupId, currentUser: target,
      message: `Active session switched to ${target.name} (${target.roleTitle})`,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
