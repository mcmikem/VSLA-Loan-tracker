import { getSeedForGroup, resolveGroupId } from './_seed.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-group-id');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const groupId = resolveGroupId(req);

  if (req.method === 'GET') {
    const state = getSeedForGroup(groupId);
    return res.status(200).json({ success: true, groupId, state, ...state });
  }

  if (req.method === 'POST') {
    const payload = req.body || {};
    const nextState = payload.state || payload;
    if (!nextState || typeof nextState !== 'object' || Array.isArray(nextState)) {
      return res.status(400).json({ error: 'Invalid state object' });
    }
    nextState.groupId = groupId;
    nextState.lastBackupDate = new Date().toISOString();
    // Stateless: echo back. Browser localStorage is the source of truth on Vercel.
    return res.status(200).json({ success: true, groupId, state: nextState });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
