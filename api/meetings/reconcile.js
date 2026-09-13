import { resolveGroupId } from '../_seed.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-group-id');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const groupId = resolveGroupId(req);
  const { meetingNo, countedTotal } = req.body || {};

  return res.status(200).json({
    success: true, groupId,
    meetingNo: meetingNo || 29,
    boxCashBalance: countedTotal ?? 0,
    reconciledAt: new Date().toISOString(),
  });
}
