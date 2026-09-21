import { resolveGroupId } from '../lib/_seed.js';
import { cors, memberCap, planOf, rateLimit, stateSchema, validate } from '../lib/_lib.js';
import { actorName, requireRole } from '../lib/_auth.js';
import { loadGroup, saveGroup, storageInfo } from '../lib/_db.js';

function isAdmin(req) {
  const key = req.headers?.['x-admin-key'] || '';
  return !!process.env.ADMIN_KEY && key === process.env.ADMIN_KEY;
}

export default async function handler(req, res) {
  if (!cors(req, res, 'GET,POST,OPTIONS')) return;
  if (!rateLimit(req, res, { limit: 120, windowMs: 60000 })) return;

  const groupId = resolveGroupId(req);

  if (req.method === 'GET') {
    // Reads carry the full ledger (phones, balances, audit). In enforced
    // mode only signed-in group members may read; pilots stay open.
    const session = requireRole(req, res, 'member');
    if (session === undefined) return;
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

    // Plan can only be upgraded with the admin key (prevents self-upgrade
    // by POSTing a doctored state). Downgrades also go through admin.
    const prev = await loadGroup(groupId).catch(() => null);
    const prevPlan = prev ? planOf(prev) : 'free';
    const nextPlan = planOf(nextState);
    if (nextPlan !== prevPlan && !isAdmin(req)) {
      nextState.groupProfile = nextState.groupProfile || {};
      nextState.groupProfile.plan = prevPlan;
    }
    // Free-plan growth cap enforced on writes too (join endpoint caps
    // signups; this stops bulk imports from jumping the queue).
    const cap = memberCap({ ...nextState, groupProfile: { ...(nextState.groupProfile || {}), plan: nextState.groupProfile?.plan || prevPlan } });
    const prevCount = Array.isArray(prev?.members) ? prev.members.length : 0;
    const nextCount = Array.isArray(nextState.members) ? nextState.members.length : 0;
    if (nextCount > cap && nextCount > prevCount && !isAdmin(req)) {
      return res.status(403).json({
        error: `Free plan allows ${cap} members. Upgrade to Pro to add more.`,
        plan: nextState.groupProfile?.plan || prevPlan,
        maxMembers: cap,
      });
    }

    const saved = await saveGroup(groupId, nextState);
    res.setHeader('x-vsla-actor', actorName(req, session));
    return res.status(200).json({ success: true, groupId, state: saved });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
