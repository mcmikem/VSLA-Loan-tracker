import { resolveGroupId } from './_seed.js';
import { cors, rateLimit, stateSchema, validate } from './_lib.js';
import { actorName, requireRole } from './_auth.js';
import { loadGroup, saveGroup, storageInfo } from './_db.js';

export default async function handler(req, res) {
  if (!cors(req, res, 'GET,POST,OPTIONS')) return;
  if (!rateLimit(req, res, { limit: 120, windowMs: 60000 })) return;

  const groupId = resolveGroupId(req);

  if (req.method === 'GET') {
    const state = await loadGroup(groupId);
    return res.status(200).json({ success: true, groupId, state, storage: storageInfo(), ...state });
  }

  if (req.method === 'POST') {
    const session = requireRole(req, res, 'treasurer');
    if (session === undefined) return;
    const payload = req.body || {};
    const raw = payload.state || payload;
    const nextState = validate(stateSchema, raw, res);
    if (!nextState) return;
    nextState.groupId = groupId;
    const saved = await saveGroup(groupId, nextState);
    res.setHeader('x-vsla-actor', actorName(req, session));
    return res.status(200).json({ success: true, groupId, state: saved });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
