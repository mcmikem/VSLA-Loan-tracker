import { resolveGroupId } from '../_seed.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-group-id');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const groupId = resolveGroupId(req);
  const payload = req.body || {};
  const restoredData = payload.data || payload.state || payload;

  if (!restoredData.members || !Array.isArray(restoredData.members)) {
    return res.status(400).json({ error: 'Invalid backup structure: missing members array' });
  }

  restoredData.groupId = groupId;
  restoredData.lastBackupDate = new Date().toISOString();

  return res.status(200).json({
    success: true, groupId,
    restoredAt: new Date().toISOString(),
    stats: {
      members: restoredData.members.length,
      boxCash: restoredData.boxCashBalance,
      approvals: restoredData.approvals?.length || 0,
    },
    state: restoredData,
  });
}
