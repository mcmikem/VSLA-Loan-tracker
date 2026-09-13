import { getSeedForGroup, resolveGroupId } from './_seed.js';
import { cors, rateLimit, stateSchema, validate } from './_lib.js';

export default function handler(req, res) {
  if (!cors(req, res, 'GET,POST,OPTIONS')) return;
  if (!rateLimit(req, res, { limit: 120, windowMs: 60000 })) return;

  const groupId = resolveGroupId(req);

  if (req.method === 'GET') {
    const state = getSeedForGroup(groupId);
    return res.status(200).json({ success: true, groupId, state, ...state });
  }

  if (req.method === 'POST') {
    const payload = req.body || {};
    const raw = payload.state || payload;
    const nextState = validate(stateSchema, raw, res);
    if (!nextState) return;
    nextState.groupId = groupId;
    nextState.lastBackupDate = new Date().toISOString();
    // Stateless: echo back. Browser localStorage is the source of truth on Vercel.
    return res.status(200).json({ success: true, groupId, state: nextState });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
