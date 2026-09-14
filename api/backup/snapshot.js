import { resolveGroupId } from '../_seed.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-group-id, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const groupId = resolveGroupId(req);
  const { label } = req.body || {};
  const state = req.body?.state || null;
  const snapshot = {
    id: `snap-${Date.now()}`,
    timestamp: new Date().toISOString(),
    label: label || `Manual Checkpoint: ${new Date().toLocaleTimeString()}`,
    membersCount: state?.members?.length || 0,
    boxCashBalance: state?.boxCashBalance || 0,
    loanFundBalance: state?.loanFundBalance || 0,
    welfareFundBalance: state?.welfareFundBalance || 0,
    data: state ? JSON.stringify(state) : '',
  };
  return res.status(200).json({ success: true, groupId, snapshot, state });
}
