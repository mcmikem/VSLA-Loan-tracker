import { getSeedForGroup, resolveGroupId } from '../_seed.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-group-id');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const groupId = resolveGroupId(req);
  const seed = getSeedForGroup(groupId);
  seed.groupId = groupId;
  return res.status(200).json({ success: true, groupId, message: 'Database reset to baseline state', state: seed });
}
