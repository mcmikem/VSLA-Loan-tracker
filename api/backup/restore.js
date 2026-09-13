import { resolveGroupId } from '../_seed.js';
import { cors, rateLimit } from '../_lib.js';
import { actorName, requireRole } from '../_auth.js';
import { saveGroup } from '../_db.js';

export default async function handler(req, res) {
  if (!cors(req, res, 'POST,OPTIONS')) return;
  if (!rateLimit(req, res, { limit: 20, windowMs: 60000 })) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = requireRole(req, res, 'secretary');
  if (session === undefined) return;

  const groupId = resolveGroupId(req);
  const payload = req.body || {};
  const restoredData = payload.data || payload.state || payload;
  if (!restoredData.members || !Array.isArray(restoredData.members)) {
    return res.status(400).json({ error: 'Invalid backup structure: missing members array' });
  }
  restoredData.groupId = groupId;
  const saved = await saveGroup(groupId, restoredData);
  res.setHeader('x-vsla-actor', actorName(req, session));
  return res.status(200).json({
    success: true, groupId,
    restoredAt: new Date().toISOString(),
    stats: {
      members: saved.members.length,
      boxCash: saved.boxCashBalance,
      approvals: saved.approvals?.length || 0,
    },
    state: saved,
  });
}
